"""Dashboard AI insights.

Observations are **derived, not generated**. Every candidate insight is a
deterministic function of metrics the caller is already permitted to read,
produced by the existing dashboard service functions. The language model is used
only to phrase an observation the backend has already established is true; it
never decides which observations exist, and it is never asked to compare, rank
or extrapolate.

That split matters for correctness: a rule that needs two data points ("compare
this period with last period") emits no candidate at all when those points are
missing, so no trend can be invented for a period that has no data.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user import User
from app.modules.auth.scope import RecordScope
from app.modules.dashboard.service import (
    ResolvedPeriod,
    allowed_sections,
    crm_kpis,
    filter_approvals_for_user,
    finance_kpis,
    inventory_kpis,
    pending_approvals,
    purchase_analytics,
    sales_analytics,
)
from app.schemas.ai import AIInsight

#: An upper bound on returned observations, so the panel stays scannable.
MAX_INSIGHTS = 5

#: A comparison is only offered when the series actually carries orders; below
#: this the figures are noise rather than a trend.
MIN_COMPARABLE_POINTS = 2

ZERO = Decimal("0.00")


def _money(value: Decimal) -> str:
    return f"{value:.2f}"


def _pct(value: Decimal | None) -> str:
    return "not calculable" if value is None else f"{value:.2f}%"


def _sales_insight(db: Session, window: ResolvedPeriod, scope: RecordScope) -> list[AIInsight]:
    """A sales-trend observation, but only when a trend is actually present.

    Computed over the caller's ``sales.order.view`` scope only (P2-06).
    """
    analytics = sales_analytics(db, window, scope)
    points = analytics.daily
    if len(points) < MIN_COMPARABLE_POINTS:
        return []

    # The dashboard's daily series sums every order in a bucket, while
    # ``total_sales`` excludes cancelled orders. The two therefore use different
    # bases, so the observation names each one rather than presenting the daily
    # endpoint as if it were the period revenue.
    first, last = points[0], points[-1]
    if Decimal(first.amount) == Decimal(last.amount):
        direction, severity = "was flat", "info"
    elif Decimal(last.amount) > Decimal(first.amount):
        direction, severity = "rose", "positive"
    else:
        direction, severity = "fell", "warning"

    return [
        AIInsight(
            key="sales_trend",
            section="sales",
            label="Sales trend",
            observation=(
                f"Daily order value {direction} across the period, from "
                f"{_money(first.amount)} on {first.date.isoformat()} to "
                f"{_money(last.amount)} on {last.date.isoformat()}. Net sales "
                f"(excluding cancelled orders) were {_money(analytics.total_sales)} "
                f"across {analytics.order_count} orders."
            ),
            severity=severity,
            metric="total_sales",
            value=analytics.total_sales,
        )
    ]


def _inventory_insight(db: Session, tenant_id) -> list[AIInsight]:
    """A low-stock observation. Only emitted when something is actually low."""
    kpis = inventory_kpis(db, tenant_id)
    if kpis.low_stock_items <= 0:
        return []

    return [
        AIInsight(
            key="low_stock",
            section="inventory",
            label="Low stock",
            observation=(
                f"{kpis.low_stock_items} of {kpis.products_with_stock} stocked products "
                f"are at or below their reorder level. Total available quantity is "
                f"{kpis.total_available_quantity}."
            ),
            severity="warning",
            metric="low_stock_items",
            value=kpis.low_stock_items,
        )
    ]
def _crm_insight(db: Session, window: ResolvedPeriod, scope: RecordScope) -> list[AIInsight]:
    """A conversion observation over the caller's ``crm.lead.view`` scope (P2-06)."""
    kpis = crm_kpis(db, window, scope)
    if kpis.total_leads <= 0:
        return []

    rate = Decimal(kpis.converted_leads) / Decimal(kpis.total_leads) * Decimal("100")
    severity = "warning" if rate < Decimal("10") else "info"

    return [
        AIInsight(
            key="lead_conversion",
            section="crm",
            label="Lead conversion",
            observation=(
                f"{kpis.converted_leads} of {kpis.total_leads} leads have converted "
                f"({_pct(rate)}). {kpis.qualified_leads} leads are qualified and there "
                f"are {kpis.total_customers} customers in total."
            ),
            severity=severity,
            metric="converted_leads",
            value=kpis.converted_leads,
        )
    ]


def _finance_insight(db: Session, window: ResolvedPeriod, tenant_id) -> list[AIInsight]:
    """A receivables observation. Only when money is actually outstanding."""
    kpis = finance_kpis(db, window, tenant_id)
    if kpis.outstanding_receivables <= ZERO:
        return []

    outstanding = kpis.outstanding_receivables
    severity = "warning" if outstanding > kpis.invoice_total else "info"

    return [
        AIInsight(
            key="outstanding_receivables",
            section="finance",
            label="Outstanding receivables",
            observation=(
                f"{_money(outstanding)} is outstanding across all open invoices, "
                f"against {_money(kpis.invoice_total)} invoiced in this period. "
                f"Of the period invoices, {_money(kpis.amount_paid)} has been received."
            ),
            severity=severity,
            metric="outstanding_receivables",
            value=outstanding,
        )
    ]


def _purchase_insight(db: Session, window: ResolvedPeriod, tenant_id) -> list[AIInsight]:
    """A purchase-volume observation. Needs at least one order to say anything."""
    analytics = purchase_analytics(db, window, tenant_id)
    if analytics.order_count <= 0:
        return []

    return [
        AIInsight(
            key="purchase_volume",
            section="purchase",
            label="Purchasing",
            observation=(
                f"{analytics.order_count} purchase orders totalled "
                f"{_money(analytics.total_purchases)} in the period, averaging "
                f"{_money(analytics.average_order_value)} per order."
            ),
            severity="info",
            metric="total_purchases",
            value=analytics.total_purchases,
        )
    ]


def _approval_insight(db: Session, user: User) -> list[AIInsight]:
    """A pending-approvals observation, using the dashboard's own redaction."""
    approvals = filter_approvals_for_user(
        pending_approvals(db, user.tenant_id, limit=0), user
    )
    if approvals.total_pending <= 0:
        return []

    breakdown = ", ".join(
        f"{module.replace('_', ' ')}: {count}"
        for module, count in sorted(approvals.counts_by_module.items())
        if count
    )

    return [
        AIInsight(
            key="pending_approvals",
            section="approvals",
            label="Pending approvals",
            observation=(
                f"{approvals.total_pending} documents are awaiting approval"
                + (f" ({breakdown})." if breakdown else ".")
            ),
            severity="warning",
            metric="total_pending",
            value=approvals.total_pending,
        )
    ]


def build_insights(
    db: Session, window: ResolvedPeriod, user: User
) -> tuple[list[AIInsight], list[str], bool]:
    """Observations for the period, restricted to permitted sections.

    Returns ``(insights, sections, insufficient_data)``. Only sections the
    caller may read are queried, so an unauthorised section can never surface
    even as an observation.
    """
    sections = allowed_sections(user)
    permitted = set(sections)
    tenant_id = user.tenant_id
    # P2-06 / SRS §6.3-3: insights follow the same record scope as the lists.
    record_scope = RecordScope.for_user(db, user)

    candidates: list[AIInsight] = []
    if "sales" in permitted:
        candidates.extend(_sales_insight(db, window, record_scope))
    if "purchase" in permitted:
        candidates.extend(_purchase_insight(db, window, tenant_id))
    if "inventory" in permitted:
        candidates.extend(_inventory_insight(db, tenant_id))
    if "finance" in permitted:
        candidates.extend(_finance_insight(db, window, tenant_id))
    if "crm" in permitted:
        candidates.extend(_crm_insight(db, window, record_scope))
    if "approvals" in permitted:
        candidates.extend(_approval_insight(db, user))

    # A caller with at least one permitted section but no qualifying data is
    # "insufficient", surfaced explicitly rather than implying the business has
    # nothing going on.
    insufficient = not candidates and bool(permitted)

    return candidates[:MAX_INSIGHTS], sections, insufficient


__all__ = ["MAX_INSIGHTS", "build_insights"]