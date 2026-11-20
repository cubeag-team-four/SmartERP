"""Deterministic sales forecasting over real ERP history.

Pipeline (no LLM anywhere in the numeric path)::

    sales_orders (net of cancelled)
        -> continuous daily series
        -> least-squares linear trend
        -> 90-day (or shorter) projection with a residual-based band

Design rules enforced here:

* **Deterministic.** Every number is computed by ordinary arithmetic. Groq is
  never called; it may later *explain* a forecast, but it never produces one.
* **Exact money.** All monetary maths uses ``Decimal``. No binary float ever
  touches a currency value.
* **Tenant-scoped.** The tenant comes from the authenticated user only.
* **Honest.** When there is not enough history, no numbers are produced and
  ``data_quality`` says so rather than fabricating a curve.
"""

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, localcontext

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.common.money import money
from app.models.sales import SalesOrder, SalesOrderStatus
from app.modules.auth.scope import RecordScope, as_record_scope
from app.modules.dashboard.service import ResolvedPeriod
from app.schemas.forecast import ForecastPoint, HistoricalSalesPoint, SalesForecast

# ---------------------------------------------------------------- constants

#: Maximum forecast window the API will ever produce.
MAX_HORIZON_DAYS = 90
#: Default window, matching the PRD's "90-day forecast".
DEFAULT_HORIZON_DAYS = 90
#: How much recent history the method looks at, before trimming to real data.
HISTORY_WINDOW_DAYS = 90

#: Distinct days with revenue needed before a linear trend is worth fitting.
MIN_HISTORY_DAYS = 3
#: At or above this many selling days the data is considered representative.
GOOD_HISTORY_DAYS = 14

#: Multiplier approximating an 80% interval. Deliberately modest: this is a
#: practical planning band, not a statistical guarantee, and the response says
#: as much via ``confidence`` / ``data_quality``.
Z_MULTIPLIER = Decimal("1.28")
#: Minimum band width as a share of the forecast, so a perfectly flat series
#: never produces a misleadingly precise "exact" prediction.
MIN_BAND_RATIO = Decimal("0.10")

ZERO = Decimal("0.00")
ONE = Decimal("1")
METHOD = "linear_trend_daily"

QUALITY_INSUFFICIENT = "insufficient_data"
QUALITY_LIMITED = "limited"
QUALITY_GOOD = "good"

INSUFFICIENT_MESSAGE = "Not enough historical sales data to generate a forecast."


# ------------------------------------------------------------------ helpers


def _sqrt(value: Decimal) -> Decimal:
    """Decimal square root. Used for the residual spread, never for money."""
    if value <= 0:
        return ZERO
    with localcontext() as ctx:
        ctx.prec = 28
        return +value.sqrt()


@dataclass(frozen=True)
class DailySales:
    """One calendar day of net sales for a single tenant."""

    day: date
    amount: Decimal
    orders: int


def _daily_net_sales(
    db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID, extra: tuple = ()
) -> list[DailySales]:
    """Daily net sales grouped in SQL, cancelled orders contributing zero.

    Mirrors the dashboard's ``_trend`` aggregation (one grouped query, no order
    rows read into Python) but zeroes the cancelled rows, because a cancelled
    order must never inflate a forecast.
    """
    net_amount = case(
        (SalesOrder.status != SalesOrderStatus.CANCELLED.value, SalesOrder.total_amount),
        else_=0,
    )
    net_orders = case(
        (SalesOrder.status != SalesOrderStatus.CANCELLED.value, 1), else_=0
    )

    stmt = (
        select(
            SalesOrder.order_date.label("day"),
            func.coalesce(func.sum(net_amount), 0).label("amount"),
            func.coalesce(func.sum(net_orders), 0).label("orders"),
        )
        .where(
            SalesOrder.tenant_id == tenant_id,
            SalesOrder.deleted_at.is_(None),
            SalesOrder.order_date >= window.date_from,
            SalesOrder.order_date <= window.date_to,
            *extra,
        )
        .group_by(SalesOrder.order_date)
        .order_by(SalesOrder.order_date)
    )

    return [
        DailySales(day=row[0], amount=money(row[1]), orders=int(row[2] or 0))
        for row in db.execute(stmt)
    ]


def _continuous_series(
    rows: list[DailySales], start: date, end: date
) -> list[HistoricalSalesPoint]:
    """Expand sparse rows into an unbroken daily series, zeros where silent.

    Nothing is interpolated or invented: a day without orders is genuinely zero.
    Leading days *before the first sale* are dropped by the caller so the fitted
    window reflects observed trading rather than an empty tenant.
    """
    by_day = {row.day: row for row in rows}
    points: list[HistoricalSalesPoint] = []
    cursor = start
    while cursor <= end:
        row = by_day.get(cursor)
        points.append(
            HistoricalSalesPoint(
                date=cursor,
                amount=row.amount if row else ZERO,
                orders=row.orders if row else 0,
            )
        )
        cursor += timedelta(days=1)
    return points


def _empty_forecast(
    history_start: date,
    history_end: date,
    horizon: int,
    message: str,
) -> SalesForecast:
    """A structurally valid response that contains no invented numbers."""
    return SalesForecast(
        metric="sales",
        historical_start=history_start,
        historical_end=history_end,
        # With no points to anchor to, the forecast window is empty; its start
        # is still the first *possible* forecast day so the shape is stable.
        forecast_start=history_end + timedelta(days=1),
        forecast_end=history_end,
        horizon_days=horizon,
        history_days=0,
        days_with_sales=0,
        average_daily_sales=ZERO,
        forecast_total=ZERO,
        trend_per_day=ZERO,
        historical_points=[],
        forecast_points=[],
        method=METHOD,
        confidence="low",
        data_quality=QUALITY_INSUFFICIENT,
        message=message,
    )


@dataclass(frozen=True)
class TrendFit:
    """Least-squares fit of ``amount ~ intercept + slope * t`` over daily sales."""

    intercept: Decimal
    slope: Decimal
    residual_std: Decimal
    r_squared: Decimal

    def predict(self, t: int) -> Decimal:
        """Predicted value at offset ``t`` (0 == first observed day)."""
        return max(ZERO, self.intercept + self.slope * Decimal(t))


def _fit_linear_trend(points: list[HistoricalSalesPoint]) -> TrendFit:
    """Ordinary least squares on the daily series, in exact ``Decimal``.

    ``t`` is the day index, so the slope is literally the change in sales per
    day. A flat series (``sst == 0``) yields a slope of zero and an ``r_squared``
    of 1: the line fits the data perfectly because the data never moves.
    """
    n = len(points)
    count = Decimal(n)

    sum_t = Decimal(sum(range(n)))
    sum_y = sum((point.amount for point in points), ZERO)
    mean_t = sum_t / count
    mean_y = sum_y / count

    s_tt = ZERO
    s_ty = ZERO
    for t, point in enumerate(points):
        dt = Decimal(t) - mean_t
        s_tt += dt * dt
        s_ty += dt * (point.amount - mean_y)

    slope = s_ty / s_tt if s_tt > 0 else ZERO
    intercept = mean_y - slope * mean_t

    sse = ZERO
    sst = ZERO
    for t, point in enumerate(points):
        residual = point.amount - (intercept + slope * Decimal(t))
        sse += residual * residual
        sst += (point.amount - mean_y) ** 2

    # Unbiased sample spread; n-2 is the residual degrees of freedom.
    degrees = max(n - 2, 1)
    residual_std = _sqrt(sse / Decimal(degrees))
    r_squared = (ONE - sse / sst) if sst > 0 else ONE

    return TrendFit(
        intercept=intercept,
        slope=slope,
        residual_std=residual_std,
        r_squared=r_squared,
    )


def _quality(days_with_sales: int) -> str:
    if days_with_sales >= GOOD_HISTORY_DAYS:
        return QUALITY_GOOD
    return QUALITY_LIMITED


def _confidence(days_with_sales: int, r_squared: Decimal) -> str:
    """Plain-language confidence, derived from evidence rather than asserted."""
    if days_with_sales >= GOOD_HISTORY_DAYS and r_squared >= Decimal("0.5"):
        return "high"
    if days_with_sales >= MIN_HISTORY_DAYS and r_squared >= Decimal("0.1"):
        return "medium"
    return "low"


def _forecast_series(
    fit: TrendFit, history_days: int, forecast_start: date, horizon: int
) -> list[ForecastPoint]:
    """Project ``horizon`` days, widening the band with the distance ahead."""
    points: list[ForecastPoint] = []

    for step in range(1, horizon + 1):
        value = fit.predict(history_days + step - 1)

        # Prediction-style inflation: the further ahead, the wider the band.
        inflation = _sqrt(ONE + (Decimal(2) * Decimal(step)) / Decimal(history_days))
        band = max(fit.residual_std * Z_MULTIPLIER * inflation, value * MIN_BAND_RATIO)

        points.append(
            ForecastPoint(
                date=forecast_start + timedelta(days=step - 1),
                forecast=money(value),
                lower_bound=money(max(ZERO, value - band)),
                upper_bound=money(value + band),
            )
        )

    return points


def sales_forecast(
    db: Session, scope: RecordScope, horizon: int = DEFAULT_HORIZON_DAYS
) -> SalesForecast:
    """Build the sales forecast for one tenant, over the caller's record scope.

    ``scope`` is resolved by the router for the verified caller (tenant from the
    access token, never the request). P2-06 / SRS §6.3-3: the history is only
    the orders inside the caller's ``sales.order.view`` scope, filtered in SQL,
    so an OWN-scoped rep gets a forecast of their own book, never the company's.
    ``horizon`` is re-clamped here as well as at the endpoint, so calling the
    service directly can never exceed the bound.
    """
    scope = as_record_scope(scope)
    horizon = max(1, min(int(horizon), MAX_HORIZON_DAYS))

    # History ends yesterday: today's orders are still being booked, so fitting
    # a trend through a partial day would bias it downwards.
    history_end = date.today() - timedelta(days=1)
    history_start = history_end - timedelta(days=HISTORY_WINDOW_DAYS - 1)

    window = ResolvedPeriod(
        period="forecast_history",
        date_from=history_start,
        date_to=history_end,
    )

    rows = _daily_net_sales(
        db, window, scope.tenant_id, tuple(scope.conditions("sales.order.view"))
    )

    # Only days that actually carry a non-cancelled order count as selling days;
    # a day present only because of a cancelled order has no revenue history.
    selling = [row.day for row in rows if row.orders > 0]
    if not selling:
        return _empty_forecast(
            history_start, history_end, horizon, INSUFFICIENT_MESSAGE
        )

    points = _continuous_series(rows, min(selling), history_end)
    days_with_sales = len(selling)

    if days_with_sales < MIN_HISTORY_DAYS:
        # A line through one or two points is arithmetic, not forecasting.
        response = _empty_forecast(
            points[0].date,
            history_end,
            horizon,
            (
                f"Only {days_with_sales} day(s) of sales history are available, "
                f"below the {MIN_HISTORY_DAYS} needed to fit a trend."
            ),
        )
        # The observed history is still returned: it is real data, and hiding it
        # would make the panel look broken rather than simply early-stage.
        response.historical_points = points
        response.history_days = len(points)
        response.days_with_sales = days_with_sales
        return response

    fit = _fit_linear_trend(points)
    history_days = len(points)
    average = sum((point.amount for point in points), ZERO) / Decimal(history_days)

    forecast_points = _forecast_series(
        fit, history_days, history_end + timedelta(days=1), horizon
    )

    return SalesForecast(
        metric="sales",
        historical_start=points[0].date,
        historical_end=history_end,
        forecast_start=forecast_points[0].date,
        forecast_end=forecast_points[-1].date,
        horizon_days=horizon,
        history_days=history_days,
        days_with_sales=days_with_sales,
        average_daily_sales=money(average),
        forecast_total=money(sum((p.forecast for p in forecast_points), ZERO)),
        trend_per_day=money(fit.slope),
        historical_points=points,
        forecast_points=forecast_points,
        method=METHOD,
        confidence=_confidence(days_with_sales, fit.r_squared),
        data_quality=_quality(days_with_sales),
        message=(
            f"Linear trend fitted to {history_days} days of net sales "
            f"({days_with_sales} selling days), projected {horizon} days ahead. "
            "Bounds are a practical planning band derived from historical "
            "variability, not a statistical guarantee."
        ),
    )


__all__ = [
    "DEFAULT_HORIZON_DAYS",
    "MAX_HORIZON_DAYS",
    "sales_forecast",
]