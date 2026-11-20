"""Sales pattern analysis with scikit-learn and plain statistics.

Sections (each independently ``ok`` or ``insufficient_data``):

* **Products** -- revenue/units per product, ABC (Pareto) class, first-half vs
  second-half unit trend; best sellers, and slow movers among the *active*
  catalogue (including products with no sale at all in the window).
* **Customers** -- RFM (recency, frequency, monetary) per customer, clustered
  with K-Means on standardised log features; k in 2..5 chosen by silhouette.
  Segments are named from their centroids, not hand-assigned thresholds.
* **Anomalies** -- Isolation Forest over daily revenue features, confirmed by a
  robust z-score (median/MAD) against the trailing 28-day median, so a day is
  reported only when both agree it is unusual. Direction: spike or drop.
* **Revenue trend** -- weekly (or monthly for long windows) totals, OLS slope
  with its p-value; "flat" unless the slope is significant at 5%.
* **Frequently bought together** -- product pairs over multi-item orders with
  support, confidence and lift (association rules, pairs only).

Nothing here writes to the database.
"""

import math
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from itertools import combinations

import numpy as np
from sqlalchemy.orm import Session

from app.common.money import money
from app.modules.ai.ml import data
from app.modules.ai.ml.limits import DEFAULT_LOOKBACK_DAYS, MAX_LOOKBACK_DAYS, MIN_LOOKBACK_DAYS
from app.modules.ai.ml.registry import require_enabled, require_libraries
from app.modules.auth.scope import RecordScope
from app.schemas.ml import (
    AnomalySection,
    BasketSection,
    CustomerSection,
    CustomerSegment,
    PatternAnalysis,
    PatternSummary,
    ProductPair,
    ProductPerformance,
    ProductsSection,
    RevenuePeriod,
    SalesAnomaly,
    TrendSection,
)

TOP_N = 10

MIN_CUSTOMERS_FOR_CLUSTERING = 10
MAX_CLUSTERS = 5
MIN_DAYS_FOR_ANOMALIES = 30
ANOMALY_CONTAMINATION = 0.03
ANOMALY_MIN_ROBUST_Z = 2.5
MIN_PERIODS_FOR_TREND = 4
MIN_MULTI_ITEM_ORDERS = 20
MIN_PAIR_ORDERS = 3
#: Fixed seed: the same data always yields the same clusters and anomalies.
RANDOM_STATE = 42

WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _dec(value: float) -> Decimal:
    return money(Decimal(str(round(float(value), 2))))


def analyze_patterns(
    db: Session, scope: RecordScope, lookback_days: int = DEFAULT_LOOKBACK_DAYS
) -> PatternAnalysis:
    require_enabled()
    require_libraries("sklearn", "scipy")
    lookback_days = max(MIN_LOOKBACK_DAYS, min(int(lookback_days), MAX_LOOKBACK_DAYS))
    # As in the deterministic forecast: today is still being booked.
    date_to = date.today() - timedelta(days=1)
    date_from = date_to - timedelta(days=lookback_days - 1)

    lines = data.order_lines(db, scope, date_from, date_to)
    order_revenue: dict = defaultdict(float)
    order_meta: dict = {}
    for line in lines:
        order_revenue[line.order_id] += line.revenue
        order_meta[line.order_id] = (line.order_date, line.customer_id)

    total_revenue = sum(order_revenue.values())
    summary = PatternSummary(
        date_from=date_from,
        date_to=date_to,
        total_revenue=_dec(total_revenue),
        order_count=len(order_revenue),
        customer_count=len({c for _, c in order_meta.values()}),
        products_sold=len({line.product_id for line in lines}),
        average_order_value=_dec(total_revenue / len(order_revenue)) if order_revenue else _dec(0),
    )

    return PatternAnalysis(
        generated_at=datetime.now(timezone.utc),
        summary=summary,
        products=_products(db, scope, lines, date_from, date_to),
        customers=_customers(db, scope, order_revenue, order_meta, date_to),
        anomalies=_anomalies(db, scope, date_from, date_to),
        revenue_trend=_trend(order_revenue, order_meta, date_from, date_to),
        frequently_bought_together=_baskets(db, scope, lines),
    )


# ------------------------------------------------------------------ products


def _products(db, scope, lines, date_from: date, date_to: date) -> ProductsSection:
    catalogue = data.active_catalogue(db, scope.tenant_id)
    if not lines:
        return ProductsSection(
            status="insufficient_data",
            message="No sales in the selected window.",
            unsold_active_products=len(catalogue),
        )

    midpoint = date_from + (date_to - date_from) / 2
    revenue: dict = defaultdict(float)
    quantity: dict = defaultdict(float)
    halves: dict = defaultdict(lambda: [0.0, 0.0])
    orders: dict = defaultdict(set)
    last_sold: dict = {}
    for line in lines:
        pid = line.product_id
        revenue[pid] += line.revenue
        quantity[pid] += line.quantity
        halves[pid][0 if line.order_date <= midpoint else 1] += line.quantity
        orders[pid].add(line.order_id)
        last_sold[pid] = max(last_sold.get(pid, line.order_date), line.order_date)

    names = data.product_names(db, scope.tenant_id, revenue.keys())
    total = sum(revenue.values()) or 1.0

    ranked = sorted(revenue, key=revenue.__getitem__, reverse=True)
    abc: dict = {}
    cumulative = 0.0
    for pid in ranked:
        # Class by the cumulative share *before* this product, so the product
        # that crosses 80% is still an A.
        abc[pid] = "A" if cumulative < 0.80 else "B" if cumulative < 0.95 else "C"
        cumulative += revenue[pid] / total

    def perf(pid) -> ProductPerformance:
        first, second = halves[pid]
        code, name = names.get(pid) or catalogue.get(pid) or (None, None)
        sold = last_sold.get(pid)
        return ProductPerformance(
            product_id=pid,
            product_code=code,
            name=name,
            revenue=_dec(revenue.get(pid, 0.0)),
            quantity=round(quantity.get(pid, 0.0), 3),
            order_count=len(orders.get(pid, ())),
            revenue_share=round(revenue.get(pid, 0.0) / total, 4),
            abc_class=abc.get(pid),
            quantity_trend=round((second - first) / first, 4) if first > 0 else None,
            last_sold=sold,
            days_since_last_sale=(date_to - sold).days if sold else None,
        )

    unsold = [pid for pid in catalogue if pid not in revenue]
    # Slow movers: the bottom 20% of sold active products by units (at least
    # one), then active products never sold in the window.
    sold_active = sorted((p for p in quantity if p in catalogue), key=quantity.__getitem__)
    tail = sold_active[: max(1, len(sold_active) // 5)] if len(sold_active) >= 5 else []
    slow = [perf(pid) for pid in tail] + [perf(pid) for pid in unsold]

    return ProductsSection(
        best_sellers=[perf(pid) for pid in ranked[:TOP_N]],
        slow_movers=slow[:TOP_N * 2],
        unsold_active_products=len(unsold),
        message=(
            "Slow movers are the bottom 20% of sold active products by units, "
            "followed by active products with no sale in the window."
        ),
    )


# ----------------------------------------------------------------- customers


def _customers(db, scope, order_revenue, order_meta, date_to: date) -> CustomerSection:
    per_customer: dict = defaultdict(list)
    for order_id, (day, customer_id) in order_meta.items():
        per_customer[customer_id].append((day, order_revenue[order_id]))

    weekday = [0.0] * 7
    for order_id, (day, _) in order_meta.items():
        weekday[day.weekday()] += order_revenue[order_id]
    week_total = sum(weekday) or 1.0
    by_weekday = {WEEKDAYS[i]: round(v / week_total, 4) for i, v in enumerate(weekday)}

    gaps: list[int] = []
    for purchases in per_customer.values():
        days = sorted({d for d, _ in purchases})
        gaps.extend((b - a).days for a, b in zip(days, days[1:]))
    repeat = sum(1 for p in per_customer.values() if len({d for d, _ in p}) > 1)

    base = CustomerSection(
        median_days_between_orders=float(np.median(gaps)) if gaps else None,
        repeat_customer_rate=round(repeat / len(per_customer), 4) if per_customer else None,
        revenue_by_weekday=by_weekday if order_meta else {},
    )
    if len(per_customer) < MIN_CUSTOMERS_FOR_CLUSTERING:
        base.status = "insufficient_data"
        base.message = (
            f"{len(per_customer)} customer(s) purchased in the window; at least "
            f"{MIN_CUSTOMERS_FOR_CLUSTERING} are needed for segmentation."
        )
        return base

    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score
    from sklearn.preprocessing import StandardScaler

    ids = list(per_customer)
    rfm = np.array([
        [
            (date_to - max(d for d, _ in per_customer[c])).days,
            len({d for d, _ in per_customer[c]}),
            sum(v for _, v in per_customer[c]),
        ]
        for c in ids
    ], dtype=float)
    features = StandardScaler().fit_transform(np.log1p(np.clip(rfm, 0, None)))
    if np.allclose(features.std(axis=0), 0):
        base.status = "insufficient_data"
        base.message = "Every customer has the same purchasing profile; nothing to segment."
        return base

    best = None
    for k in range(2, min(MAX_CLUSTERS, len(ids) - 1) + 1):
        model = KMeans(n_clusters=k, n_init=10, random_state=RANDOM_STATE).fit(features)
        if len(set(model.labels_)) < 2:
            continue
        score = silhouette_score(features, model.labels_)
        if best is None or score > best[0]:
            best = (score, model)
    if best is None:
        base.status = "insufficient_data"
        base.message = "Customers could not be separated into distinct segments."
        return base

    score, model = best
    labels = model.labels_
    names = data.customer_names(db, scope.tenant_id, ids)
    total_monetary = rfm[:, 2].sum() or 1.0

    # Value score per cluster in standardised space: more orders and spend,
    # more recent (lower recency) = more valuable.
    centroids = model.cluster_centers_
    value = centroids[:, 1] + centroids[:, 2] - centroids[:, 0]
    order = list(np.argsort(-value))
    median_recency = float(np.median(rfm[:, 0]))

    segments: list[CustomerSegment] = []
    for rank, cluster in enumerate(order):
        members = np.where(labels == cluster)[0]
        avg_r, avg_f, avg_m = rfm[members].mean(axis=0)
        if rank == 0:
            label = "High-value loyal"
        elif avg_r > median_recency * 1.5 and rank == len(order) - 1:
            label = "At risk / lapsed"
        elif avg_f <= 1.2:
            label = "Occasional / new"
        else:
            label = "Regular"
        top = sorted(members, key=lambda i: -rfm[i, 2])[:5]
        segments.append(CustomerSegment(
            segment=int(cluster),
            label=label,
            customer_count=int(len(members)),
            avg_recency_days=round(float(avg_r), 1),
            avg_frequency=round(float(avg_f), 2),
            avg_monetary=_dec(avg_m),
            revenue_share=round(float(rfm[members, 2].sum() / total_monetary), 4),
            top_customers=[
                {"customer_id": str(ids[i]), "name": names.get(ids[i]),
                 "orders": int(rfm[i, 1]), "revenue": str(_dec(rfm[i, 2]))}
                for i in top
            ],
        ))

    base.cluster_count = len(segments)
    base.silhouette = round(float(score), 4)
    base.segments = segments
    base.message = (
        "K-Means on log-scaled recency, frequency and monetary value; the number "
        "of segments is the one with the best silhouette score."
    )
    return base


# ----------------------------------------------------------------- anomalies


def _anomalies(db, scope, date_from: date, date_to: date) -> AnomalySection:
    series = data.daily_revenue(db, scope, date_from, date_to)
    if series is None or len(series.values) < MIN_DAYS_FOR_ANOMALIES:
        days = 0 if series is None else len(series.values)
        return AnomalySection(
            status="insufficient_data",
            days_analysed=days,
            message=f"{days} day(s) of sales history; at least {MIN_DAYS_FOR_ANOMALIES} are needed.",
        )

    from sklearn.ensemble import IsolationForest

    values = series.values
    counts = data.daily_orders(db, scope, series.start, date_to)
    dates = series.dates()
    orders = np.array([counts.get(d, 0) for d in dates], dtype=float)

    # Trailing 28-day median/MAD (excluding the day itself) as "expected". The
    # first week has no trailing history, so it is judged against the first two.
    expected = np.empty_like(values)
    robust_z = np.zeros_like(values)
    for i in range(len(values)):
        window = values[max(0, i - 28):i] if i >= 7 else values[:14]
        med = float(np.median(window))
        mad = float(np.median(np.abs(window - med))) * 1.4826
        expected[i] = med
        spread = mad if mad > 0 else max(float(np.std(window)), 1e-9)
        robust_z[i] = (values[i] - med) / spread

    weekday = np.array([d.weekday() for d in dates])
    features = np.column_stack([
        np.log1p(values),
        np.log1p(orders),
        np.log1p(values) - np.log1p(expected),
        np.sin(2 * np.pi * weekday / 7),
        np.cos(2 * np.pi * weekday / 7),
    ])
    forest = IsolationForest(
        n_estimators=200, contamination=ANOMALY_CONTAMINATION, random_state=RANDOM_STATE
    ).fit(features)
    flagged = forest.predict(features) == -1
    scores = -forest.score_samples(features)

    anomalies = [
        SalesAnomaly(
            date=dates[i],
            revenue=_dec(values[i]),
            expected=_dec(expected[i]),
            deviation_pct=round(100 * (values[i] - expected[i]) / expected[i], 2)
            if expected[i] > 0 else 100.0,
            direction="spike" if values[i] > expected[i] else "drop",
            robust_z=round(float(robust_z[i]), 2),
            anomaly_score=round(float(scores[i]), 4),
        )
        for i in np.where(flagged & (np.abs(robust_z) >= ANOMALY_MIN_ROBUST_Z))[0]
    ]
    anomalies.sort(key=lambda a: -abs(a.robust_z))
    return AnomalySection(
        days_analysed=len(values),
        anomalies=anomalies[: TOP_N * 2],
        message=(
            "A day is reported only when the Isolation Forest flags it and its revenue "
            f"is at least {ANOMALY_MIN_ROBUST_Z} robust standard deviations from the "
            "trailing 28-day median."
        ),
    )


# --------------------------------------------------------------------- trend


def _trend(order_revenue, order_meta, date_from: date, date_to: date) -> TrendSection:
    granularity = "month" if (date_to - date_from).days >= 365 else "week"

    def bucket(day: date) -> date:
        if granularity == "month":
            return day.replace(day=1)
        return day - timedelta(days=day.weekday())

    revenue: dict = defaultdict(float)
    orders: Counter = Counter()
    cursor = bucket(date_from)
    while cursor <= date_to:  # every period present, zeros included
        revenue[cursor] += 0.0
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1) \
            if granularity == "month" else cursor + timedelta(days=7)
    for order_id, (day, _) in order_meta.items():
        revenue[bucket(day)] += order_revenue[order_id]
        orders[bucket(day)] += 1

    starts = sorted(revenue)
    # Drop partial edge periods so a half-week does not read as a drop.
    if granularity == "week":
        starts = [s for s in starts if s >= date_from and s + timedelta(days=6) <= date_to]
    else:
        starts = [s for s in starts if s >= date_from.replace(day=1)][1:-1] \
            if len(starts) > 2 else starts
    periods = [RevenuePeriod(period_start=s, revenue=_dec(revenue[s]), orders=orders[s])
               for s in starts]

    section = TrendSection(
        granularity=granularity,
        periods=periods,
        daily=_bucketed(order_revenue, order_meta, date_from, date_to, "day"),
        weekly=_bucketed(order_revenue, order_meta, date_from, date_to, "week"),
        monthly=_bucketed(order_revenue, order_meta, date_from, date_to, "month"),
    )
    y = np.array([revenue[s] for s in starts])
    if len(y) < MIN_PERIODS_FOR_TREND or int((y > 0).sum()) < MIN_PERIODS_FOR_TREND:
        section.status = "insufficient_data"
        with_sales = int((y > 0).sum())
        section.message = (
            f"{with_sales} of {len(y)} complete {granularity}(s) in the window had sales; "
            f"at least {MIN_PERIODS_FOR_TREND} complete {granularity}s with sales are needed "
            "for a trend."
        )
        return section

    from scipy.stats import linregress

    fit = linregress(np.arange(len(y)), y)
    significant = fit.pvalue < 0.05
    section.slope_per_period = _dec(fit.slope)
    section.p_value = round(float(fit.pvalue), 4) if not math.isnan(fit.pvalue) else None
    section.r_squared = round(float(fit.rvalue ** 2), 4) if not math.isnan(fit.rvalue) else None
    section.direction = ("up" if fit.slope > 0 else "down") if significant else "flat"
    half = len(y) // 2
    earlier, later = y[:half].sum(), y[len(y) - half:].sum()
    section.change_vs_previous_window_pct = (
        round(100 * (later - earlier) / earlier, 2) if earlier > 0 else None
    )
    section.message = (
        f"Least-squares trend over {len(y)} complete {granularity}s; reported as flat "
        "unless the slope is statistically significant (p < 0.05)."
    )
    return section


def _bucketed(order_revenue, order_meta, date_from: date, date_to: date, unit: str):
    """Revenue and order count per day / week (Monday) / month, zeros included."""
    def start_of(day: date) -> date:
        if unit == "month":
            return day.replace(day=1)
        if unit == "week":
            return day - timedelta(days=day.weekday())
        return day

    def next_of(day: date) -> date:
        if unit == "month":
            return (day.replace(day=28) + timedelta(days=4)).replace(day=1)
        return day + timedelta(days=7 if unit == "week" else 1)

    revenue: dict = {}
    cursor = start_of(date_from)
    while cursor <= date_to:
        revenue[cursor] = [0.0, 0]
        cursor = next_of(cursor)
    for order_id, (day, _) in order_meta.items():
        bucket = revenue[start_of(day)]
        bucket[0] += order_revenue[order_id]
        bucket[1] += 1
    return [RevenuePeriod(period_start=k, revenue=_dec(v[0]), orders=v[1])
            for k, v in sorted(revenue.items())]


# ------------------------------------------------------------------- baskets


def _baskets(db, scope, lines) -> BasketSection:
    baskets: dict = defaultdict(set)
    for line in lines:
        baskets[line.order_id].add(line.product_id)
    multi = [b for b in baskets.values() if len(b) >= 2]
    section = BasketSection(multi_item_orders=len(multi))
    if len(multi) < MIN_MULTI_ITEM_ORDERS:
        section.status = "insufficient_data"
        section.message = (
            f"{len(multi)} order(s) contain two or more products; at least "
            f"{MIN_MULTI_ITEM_ORDERS} are needed to find co-purchase patterns."
        )
        return section

    n_orders = len(baskets)
    item_count: Counter = Counter()
    pair_count: Counter = Counter()
    for basket in baskets.values():
        item_count.update(basket)
        if len(basket) >= 2:
            pair_count.update(combinations(sorted(basket, key=str), 2))

    names = data.product_names(db, scope.tenant_id, item_count.keys())

    def ref(pid) -> dict:
        code, name = names.get(pid, (None, None))
        return {"product_id": str(pid), "product_code": code, "name": name}

    pairs = []
    for (a, b), together in pair_count.items():
        if together < MIN_PAIR_ORDERS:
            continue
        support = together / n_orders
        lift = support / ((item_count[a] / n_orders) * (item_count[b] / n_orders))
        if lift <= 1.0:  # bought together no more than chance
            continue
        pairs.append(ProductPair(
            product_a=ref(a), product_b=ref(b), orders_together=together,
            support=round(support, 4),
            confidence_a_to_b=round(together / item_count[a], 4),
            confidence_b_to_a=round(together / item_count[b], 4),
            lift=round(lift, 3),
        ))
    pairs.sort(key=lambda p: (-p.lift, -p.orders_together))
    section.pairs = pairs[:TOP_N]
    section.message = (
        f"Pairs bought together in at least {MIN_PAIR_ORDERS} orders with lift > 1 "
        "(more often than chance)."
    )
    return section


__all__ = ["analyze_patterns"]
