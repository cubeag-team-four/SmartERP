"""ML sales and demand forecasting with backtested model selection.

Pipeline for one daily series (revenue, or units of one product)::

    sales rows (tenant + record scope, net of cancelled)
      -> continuous daily series from the first sale (missing days = 0 sold)
      -> sufficiency checks (no numbers at all when they fail)
      -> candidates fitted on all-but-the-last ``holdout`` days:
           seasonal_naive     mean of the same weekday over the last 4 weeks
           moving_average     mean of the last 28 days
           gradient_boosting  scikit-learn HistGradientBoosting on lag /
                              rolling / calendar features, recursive
           lstm               PyTorch LSTM over 28-day windows, recursive
                              (only with >= 180 days of history, if enabled)
      -> the candidate with the lowest holdout WAPE is refitted on everything
      -> 80% band from that model's own holdout residual quantiles, widened
         with distance ahead

Honesty rules:

* A horizon is only produced when history is at least twice as long
  (7 days needs 14, 30 needs 60, 90 needs 180). A longer request is cut to the
  largest supported horizon and a warning says so.
* Fewer than :data:`MIN_ACTIVE_DAYS` selling days: ``insufficient_data`` with no
  forecast points.
* The backtest scores of every candidate are returned, so a user can see when
  a "smart" model did not beat a naive baseline (and then the baseline is used).

The existing deterministic linear forecast (``GET /ai/forecast/sales``) is
unchanged; this is an additional, model-based view.
"""

import hashlib
import math
import threading
import time
import uuid
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

import numpy as np
from sqlalchemy.orm import Session

from app.common.exceptions import NotFoundException
from app.core.config import settings
from app.modules.ai.ml import data
from app.modules.ai.ml.limits import DEFAULT_TOP_PRODUCTS, HORIZONS, MAX_TOP_PRODUCTS
from app.modules.ai.ml.registry import (
    configure_torch,
    library_available,
    require_enabled,
    require_libraries,
)
from app.modules.auth.scope import RecordScope
from app.schemas.ml import (
    ActualPoint,
    ForecastPoint,
    HorizonSummary,
    MLForecastResponse,
    ModelScore,
    SeriesForecast,
)

HISTORY_LOOKBACK_DAYS = 730
#: Historical points returned for the "actual vs predicted" chart.
DISPLAY_HISTORY_DAYS = 180
MIN_ACTIVE_DAYS = 14
HISTORY_TO_HORIZON_RATIO = 2
GBM_MIN_HISTORY_DAYS = 56
LSTM_MIN_HISTORY_DAYS = 180
INTERVAL_LEVEL = 0.8
RANDOM_STATE = 42

_LAGS = (1, 7, 14, 28)
_LSTM_WINDOW = 28

_CACHE_TTL_SECONDS = 15 * 60
_CACHE_SIZE = 128


# ------------------------------------------------------------------ models

Forecaster = Callable[[np.ndarray, date, int], np.ndarray]


def _seasonal_naive(y: np.ndarray, start: date, steps: int) -> np.ndarray:
    weeks = min(4, len(y) // 7)
    if weeks == 0:
        return np.full(steps, y.mean())
    recent = y[-7 * weeks:].reshape(weeks, 7).mean(axis=0)
    # recent[k] is the weekday of y[len(y) - 7 + k]; continue that cycle.
    return np.array([recent[i % 7] for i in range(steps)])


def _moving_average(y: np.ndarray, start: date, steps: int) -> np.ndarray:
    return np.full(steps, y[-28:].mean())


def _gbm_row(z: list[float], t: int, day: date) -> list[float]:
    history = np.asarray(z[max(0, t - 28):t])
    weekday = [0.0] * 7
    weekday[day.weekday()] = 1.0
    return [z[t - lag] for lag in _LAGS] + [
        float(history[-7:].mean()), float(history.mean()), *weekday, day.day, day.month,
    ]


def _gradient_boosting(y: np.ndarray, start: date, steps: int) -> np.ndarray:
    from sklearn.ensemble import HistGradientBoostingRegressor

    z = list(np.log1p(y))
    first = max(_LAGS)
    rows = [_gbm_row(z, t, start + timedelta(days=t)) for t in range(first, len(z))]
    model = HistGradientBoostingRegressor(
        max_iter=200, learning_rate=0.05, max_leaf_nodes=15,
        min_samples_leaf=max(5, len(rows) // 25), random_state=RANDOM_STATE,
    ).fit(np.array(rows), np.array(z[first:]))

    out = []
    for step in range(steps):
        t = len(z)
        pred = float(model.predict(np.array([_gbm_row(z, t, start + timedelta(days=t))]))[0])
        z.append(max(pred, 0.0))
        out.append(math.expm1(z[-1]))
    return np.array(out)


def _lstm(y: np.ndarray, start: date, steps: int) -> np.ndarray:
    torch = configure_torch()
    nn = torch.nn
    torch.manual_seed(RANDOM_STATE)

    z = np.log1p(y)
    mu, sd = float(z.mean()), float(z.std()) or 1.0
    scaled = (z - mu) / sd
    days = np.arange(len(y) + steps)
    weekday = np.array([(start + timedelta(days=int(d))).weekday() for d in days])
    cal = np.column_stack([np.sin(2 * np.pi * weekday / 7), np.cos(2 * np.pi * weekday / 7)])

    def window(series: np.ndarray, t: int) -> np.ndarray:
        return np.column_stack([series[t - _LSTM_WINDOW:t], cal[t - _LSTM_WINDOW:t]])

    X = np.stack([window(scaled, t) for t in range(_LSTM_WINDOW, len(scaled))])
    Y = scaled[_LSTM_WINDOW:]
    X_t = torch.tensor(X, dtype=torch.float32)
    Y_t = torch.tensor(Y, dtype=torch.float32).unsqueeze(-1)

    class Net(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.lstm = nn.LSTM(input_size=3, hidden_size=32, batch_first=True)
            self.head = nn.Linear(32, 1)

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.head(out[:, -1, :])

    net = Net()
    optimiser = torch.optim.Adam(net.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    split = max(1, int(len(X_t) * 0.9))
    best_loss, best_state, patience = math.inf, None, 0
    for _ in range(120):
        net.train()
        for idx in torch.randperm(split).split(64):
            optimiser.zero_grad()
            loss_fn(net(X_t[idx]), Y_t[idx]).backward()
            optimiser.step()
        net.eval()
        with torch.no_grad():
            val = X_t[split:] if split < len(X_t) else X_t[-1:]
            target = Y_t[split:] if split < len(X_t) else Y_t[-1:]
            loss = float(loss_fn(net(val), target))
        if loss < best_loss - 1e-5:
            best_loss, patience = loss, 0
            best_state = {k: v.clone() for k, v in net.state_dict().items()}
        else:
            patience += 1
            if patience >= 15:
                break
    if best_state is not None:
        net.load_state_dict(best_state)

    series = list(scaled)
    out = []
    net.eval()
    with torch.no_grad():
        for _ in range(steps):
            t = len(series)
            x = torch.tensor(window(np.asarray(series + [0.0]), t)[None], dtype=torch.float32)
            pred = float(net(x)[0, 0])
            series.append(pred)
            out.append(max(math.expm1(pred * sd + mu), 0.0))
    return np.array(out)


def _candidates(history_days: int) -> dict[str, tuple[Forecaster, str]]:
    models: dict[str, tuple[Forecaster, str]] = {
        "seasonal_naive": (_seasonal_naive, "Same weekday, last 4 weeks"),
        "moving_average": (_moving_average, "Mean of the last 28 days"),
    }
    if history_days >= GBM_MIN_HISTORY_DAYS:
        models["gradient_boosting"] = (
            _gradient_boosting, "scikit-learn gradient boosting on lag/calendar features"
        )
    if (
        settings.ML_FORECAST_ENABLE_LSTM
        and history_days >= LSTM_MIN_HISTORY_DAYS
        and library_available("torch")
    ):
        models["lstm"] = (_lstm, "PyTorch LSTM over 28-day windows")
    return models


# ---------------------------------------------------------------- core fit


@dataclass
class _Fit:
    status: str
    message: str
    horizon: int = 0
    max_supported: int = 0
    method: str | None = None
    confidence: str = "low"
    scores: list[dict] = field(default_factory=list)
    point: np.ndarray | None = None
    lower: np.ndarray | None = None
    upper: np.ndarray | None = None
    warnings: list[str] = field(default_factory=list)


def _wape(actual: np.ndarray, pred: np.ndarray) -> float | None:
    total = float(np.abs(actual).sum())
    return float(np.abs(actual - pred).sum()) / total if total > 0 else None


def fit_series(values: np.ndarray, start: date, active_days: int, requested: int) -> _Fit:
    """Choose, fit and project one series. Pure: no database, deterministic."""
    n = len(values)
    max_supported = max((h for h in HORIZONS if n >= HISTORY_TO_HORIZON_RATIO * h), default=0)
    if active_days < MIN_ACTIVE_DAYS or max_supported == 0:
        return _Fit(
            status="insufficient_data",
            max_supported=max_supported,
            message=(
                f"{n} day(s) of history with {active_days} selling day(s). A forecast "
                f"needs at least {MIN_ACTIVE_DAYS} selling days and "
                f"{HISTORY_TO_HORIZON_RATIO * HORIZONS[0]} days of history; no forecast "
                "is produced rather than a misleading one."
            ),
        )

    warnings: list[str] = []
    horizon = min(requested, max_supported)
    if horizon < requested:
        warnings.append(
            f"{n} days of history support a forecast of at most {max_supported} days; "
            f"the {requested}-day request was shortened."
        )
    if active_days / n < 0.3:
        warnings.append("Sales occur on fewer than 30% of days; daily values are very uncertain.")

    holdout = min(horizon, max(7, n // 5))
    train, actual = values[:-holdout], values[-holdout:]
    candidates = _candidates(len(train))
    scores: list[dict] = []
    residuals: dict[str, np.ndarray] = {}
    for name, (model, note) in candidates.items():
        try:
            pred = model(train, start, holdout)
        except Exception:  # noqa: BLE001 - a failed candidate is skipped, not fatal
            scores.append({"model": name, "wape": None, "mae": None, "note": "failed to fit"})
            continue
        residuals[name] = actual - pred
        wape = _wape(actual, pred)
        scores.append({
            "model": name,
            "wape": round(wape, 4) if wape is not None else None,
            "mae": round(float(np.abs(actual - pred).mean()), 4),
            "note": note,
        })

    ranked = [s for s in scores if s["mae"] is not None]
    best = min(ranked, key=lambda s: (s["wape"] if s["wape"] is not None else math.inf, s["mae"]))
    best["selected"] = True
    method = best["model"]

    point = np.clip(candidates[method][0](values, start, horizon), 0, None)
    resid = residuals[method]
    alpha = (1 - INTERVAL_LEVEL) / 2
    q_lo = min(float(np.quantile(resid, alpha)), 0.0)
    q_hi = max(float(np.quantile(resid, 1 - alpha)), 0.0)
    widen = np.sqrt(np.maximum(1.0, np.arange(1, horizon + 1) / holdout))
    lower = np.clip(point + q_lo * widen, 0, None)
    upper = point + q_hi * widen

    wape = best["wape"]
    confidence = "low" if wape is None or wape >= 0.5 else "medium" if wape >= 0.25 else "high"
    if warnings and confidence == "high":
        confidence = "medium"

    return _Fit(
        status="ok",
        message=(
            f"{method} selected by lowest error on the last {holdout} days held out; "
            f"bounds are an empirical {int(INTERVAL_LEVEL * 100)}% band from that "
            "model's held-out errors, widened with distance ahead."
        ),
        horizon=horizon, max_supported=max_supported, method=method,
        confidence=confidence, scores=scores, point=point, lower=lower, upper=upper,
        warnings=warnings,
    )


# Results depend only on the input series and settings, so a hash of the
# series is a safe key: two callers with identical data get identical output,
# and a caller can only hit an entry whose data they already hold.
_cache: "OrderedDict[str, tuple[float, _Fit]]" = OrderedDict()
_cache_lock = threading.Lock()


def _cached_fit(values: np.ndarray, start: date, active_days: int, requested: int) -> _Fit:
    key = hashlib.sha256(
        values.tobytes()
        + f"|{start}|{active_days}|{requested}|{settings.ML_FORECAST_ENABLE_LSTM}".encode()
    ).hexdigest()
    now = time.monotonic()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < _CACHE_TTL_SECONDS:
            _cache.move_to_end(key)
            return hit[1]
    fit = fit_series(values, start, active_days, requested)
    with _cache_lock:
        _cache[key] = (now, fit)
        while len(_cache) > _CACHE_SIZE:
            _cache.popitem(last=False)
    return fit


# ----------------------------------------------------------------- service


def _quantise(value: float, unit: str) -> Decimal:
    exponent = Decimal("0.01") if unit == "currency" else Decimal("0.001")
    return Decimal(str(float(value))).quantize(exponent, ROUND_HALF_UP)


def _series_response(
    series: data.DailySeries | None,
    target: str,
    unit: str,
    requested: int,
    history_end: date,
    product: tuple[uuid.UUID, str, str] | None = None,
) -> SeriesForecast:
    response = SeriesForecast(target=target, unit=unit, requested_horizon=requested)
    if product:
        response.product_id, response.product_code, response.product_name = product
    if series is None:
        response.status = "insufficient_data"
        response.message = "No sales in the history window; no forecast is produced."
        return response

    response.history_start = series.start
    response.history_end = history_end
    response.history_days = len(series.values)
    response.active_days = series.active_days
    shown = series.dates()[-DISPLAY_HISTORY_DAYS:]
    response.historical = [
        ActualPoint(date=d, actual=_quantise(v, unit))
        for d, v in zip(shown, series.values[-DISPLAY_HISTORY_DAYS:])
    ]

    fit = _cached_fit(series.values, series.start, series.active_days, requested)
    response.status = fit.status
    response.message = fit.message
    response.max_supported_horizon = fit.max_supported
    response.warnings = fit.warnings
    if fit.status != "ok":
        return response

    response.horizon_days = fit.horizon
    response.method = fit.method
    response.confidence = fit.confidence
    response.interval_level = INTERVAL_LEVEL
    response.backtest = [ModelScore(**s) for s in fit.scores]
    first = history_end + timedelta(days=1)
    response.forecast = [
        ForecastPoint(
            date=first + timedelta(days=i),
            forecast=_quantise(fit.point[i], unit),
            lower_bound=_quantise(fit.lower[i], unit),
            upper_bound=_quantise(fit.upper[i], unit),
        )
        for i in range(fit.horizon)
    ]
    response.summaries = [
        HorizonSummary(
            days=days,
            total=_quantise(fit.point[:days].sum(), unit),
            # Sum of daily bounds: a conservative envelope, wider than a true
            # 80% interval for the total.
            lower_bound=_quantise(fit.lower[:days].sum(), unit),
            upper_bound=_quantise(fit.upper[:days].sum(), unit),
        )
        for days in HORIZONS
        if days <= fit.horizon
    ]
    return response


def ml_forecast(
    db: Session,
    scope: RecordScope,
    *,
    target: str,
    horizon: int,
    product_id: uuid.UUID | None = None,
    top_products: int = DEFAULT_TOP_PRODUCTS,
) -> MLForecastResponse:
    """Revenue forecast, or unit-demand forecasts for one / the top products."""
    require_enabled()
    require_libraries("sklearn")
    history_end = date.today() - timedelta(days=1)
    history_start = history_end - timedelta(days=HISTORY_LOOKBACK_DAYS - 1)

    if target == "revenue":
        series = [_series_response(
            data.daily_revenue(db, scope, history_start, history_end),
            "revenue", "currency", horizon, history_end,
        )]
    else:
        if product_id is not None:
            ids = [product_id]
        else:
            ids = data.top_products_by_quantity(
                db, scope, history_start, history_end, max(1, min(top_products, MAX_TOP_PRODUCTS))
            )
        names = data.product_names(db, scope.tenant_id, ids)
        if product_id is not None and product_id not in names:
            raise NotFoundException("Product not found")
        series = [
            _series_response(
                data.daily_product_quantity(db, scope, pid, history_start, history_end),
                "demand", "quantity", horizon, history_end,
                product=(pid, *names.get(pid, (None, None))),
            )
            for pid in ids
        ]

    return MLForecastResponse(
        generated_at=datetime.now(timezone.utc), target=target, series=series
    )


__all__ = ["fit_series", "ml_forecast"]
