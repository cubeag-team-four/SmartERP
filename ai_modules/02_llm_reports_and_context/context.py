"""Builds the minimal, permission-scoped ERP context handed to the model.

Two rules govern this module:

* **Reuse.** Every figure comes from the existing dashboard service functions.
  The AI layer never writes SQL, never re-implements an aggregate and never
  invents a metric — so an AI figure and the identical dashboard figure are the
  same value by construction.
* **Minimum necessary.** The context contains only the sections the caller is
  permitted to read, and within those sections only the fields a business answer
  needs. No credentials, no tokens, no unrelated personal data, no cross-tenant
  rows.

The context is a plain ``dict`` of JSON-safe scalars so it can be serialised
straight into the prompt.

**Record scope (P2-06, SRS §6.3-3).** This dict is what reaches the external
LLM provider. Sales and CRM figures are therefore computed from a
:class:`~app.modules.auth.scope.RecordScope` resolved for the caller, so the
OWN/TEAM/ALL narrowing happens in SQL before aggregation -- a figure built from
records outside the caller's scope never exists in Python, let alone in a prompt.
"""

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.common.money import DISPLAY_CURRENCY
from app.models.user import User
from app.modules.ai.intents import INTENT_SECTIONS, SECTION_LABELS, Intent
from app.modules.auth.scope import RecordScope
from app.modules.dashboard.service import (
    ResolvedPeriod,
    allowed_sections,
    crm_analytics,
    filter_approvals_for_user,
    finance_analytics,
    inventory_analytics,
    pending_approvals,
    purchase_analytics,
    sales_analytics,
)
from app.schemas.ai import AIPeriod

# Caps that keep the prompt small without hiding the headline figures.
MAX_TREND_POINTS = 31
MAX_LOW_STOCK_ROWS = 10
MAX_APPROVAL_ITEMS = 20

# Period keys shown to the user alongside the raw window. Keys absent from this
# map (for example an explicit ``custom:month`` window) fall back to a neutral
# label rather than claiming a period we did not resolve.
PERIOD_LABELS = {
    "today": "Today",
    "week": "This Week",
    "month": "This Month",
    "quarter": "This Quarter",
    "year": "This Year",
    "previous_month": "Previous Month",
    "previous_quarter": "Previous Quarter",
}


def _money(value: Decimal) -> str:
    """Money as an exact string — never a float, never reformatted."""
    return f"{value:.2f}"


def _qty(value: Decimal) -> str:
    return f"{value:.3f}"


def _percent(value: Decimal | None) -> str | None:
    """``None`` means "not calculable", which stays null rather than 0%."""
    return None if value is None else f"{value:.2f}%"


# Each builder returns ``(metrics, sources)``. Sources are produced from the same
# object as the metrics, so a citation can never name a figure that was not
# actually read.


def _sales(db: Session, window: ResolvedPeriod, scope: RecordScope, *, trend: bool):
    analytics = sales_analytics(db, window, scope)
    metrics = {
        "total_sales": _money(analytics.total_sales),
        "order_count": analytics.order_count,
        "average_order_value": _money(analytics.average_order_value),
        "status_distribution": [
            {"status": row.status, "count": row.count, "amount": _money(row.amount)}
            for row in analytics.status_distribution
        ],
    }
    # The daily series is a long list; include it only when the question asked
    # for a trend, and cap it so the prompt stays small.
    if trend:
        metrics["daily"] = [
            {"date": point.date.isoformat(), "amount": _money(point.amount), "orders": point.orders}
            for point in analytics.daily[-MAX_TREND_POINTS:]
        ]
        metrics["trend_direction"] = _trend_direction(analytics.daily)
        # The dashboard's daily series sums every order in the bucket, including
        # cancelled ones, while ``total_sales`` excludes cancelled orders. Stating
        # the basis prevents the model from reading the two as contradictory.
        metrics["daily_basis"] = (
            "each daily amount is the sum of all orders dated that day, including "
            "cancelled orders; total_sales excludes cancelled orders"
        )

    sources = [
        {
            "section": "sales",
            "label": SECTION_LABELS["sales"],
            "metric": "total_sales",
            "value": _money(analytics.total_sales),
            "unit": "money",
        },
        {
            "section": "sales",
            "label": SECTION_LABELS["sales"],
            "metric": "order_count",
            "value": analytics.order_count,
            "unit": "count",
        },
    ]
    if trend:
        sources.append(
            {
                "section": "sales",
                "label": SECTION_LABELS["sales"],
                "metric": "daily_trend",
                "value": len(analytics.daily),
                "unit": "days",
            }
        )
    return metrics, sources


def _purchase(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID):
    """Purchase totals for the period, mirroring the sales builder exactly.

    Always includes the daily series: a purchase question is almost always about
    either the size of the spend or how it moved, and the series is already
    capped by :data:`MAX_TREND_POINTS`.
    """
    analytics = purchase_analytics(db, window, tenant_id)
    metrics = {
        "total_purchases": _money(analytics.total_purchases),
        "order_count": analytics.order_count,
        "average_order_value": _money(analytics.average_order_value),
        "status_distribution": [
            {"status": row.status, "count": row.count, "amount": _money(row.amount)}
            for row in analytics.status_distribution
        ],
        "daily": [
            {"date": point.date.isoformat(), "amount": _money(point.amount), "orders": point.orders}
            for point in analytics.daily[-MAX_TREND_POINTS:]
        ],
        "trend_direction": _trend_direction(analytics.daily),
    }

    sources = [
        {
            "section": "purchase",
            "label": SECTION_LABELS["purchase"],
            "metric": "total_purchases",
            "value": _money(analytics.total_purchases),
            "unit": "money",
        },
        {
            "section": "purchase",
            "label": SECTION_LABELS["purchase"],
            "metric": "order_count",
            "value": analytics.order_count,
            "unit": "count",
        },
        {
            "section": "purchase",
            "label": SECTION_LABELS["purchase"],
            "metric": "daily_trend",
            "value": len(analytics.daily),
            "unit": "days",
        },
    ]
    return metrics, sources


def _inventory(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID, *, low_only: bool):
    analytics = inventory_analytics(db, window, tenant_id)
    metrics: dict[str, Any] = {
        "products_with_stock": analytics.products_with_stock,
        "total_physical_quantity": _qty(analytics.total_physical_quantity),
        "total_reserved_quantity": _qty(analytics.total_reserved_quantity),
        "total_available_quantity": _qty(analytics.total_available_quantity),
        "low_stock_count": analytics.low_stock_count,
        "stock_by_warehouse": [
            {
                "warehouse": row.warehouse_name,
                "products": row.products,
                "available_quantity": _qty(row.available_quantity),
            }
            for row in analytics.stock_by_warehouse
        ],
    }
    if low_only:
        # Product names are business reference data the caller is already
        # permitted to see via inventory.stock.view; capped like the dashboard.
        metrics["low_stock_products"] = [
            {
                "product_code": row.product_code,
                "product_name": row.product_name,
                "available_quantity": _qty(row.available_quantity),
                "reorder_level": _qty(row.reorder_level),
            }
            for row in analytics.low_stock_products[:MAX_LOW_STOCK_ROWS]
        ]

    sources = [
        {
            "section": "inventory",
            "label": SECTION_LABELS["inventory"],
            "metric": "total_available_quantity",
            "value": _qty(analytics.total_available_quantity),
            "unit": "quantity",
        },
        {
            "section": "inventory",
            "label": SECTION_LABELS["inventory"],
            "metric": "low_stock_count",
            "value": analytics.low_stock_count,
            "unit": "count",
        },
    ]
    return metrics, sources


def _crm(db: Session, window: ResolvedPeriod, scope: RecordScope, *, conversion_only: bool):
    analytics = crm_analytics(db, window, scope)
    metrics: dict[str, Any] = {
        "total_leads": analytics.total_leads,
        "qualified_leads": analytics.qualified_leads,
        "converted_leads": analytics.converted_leads,
        "total_customers": analytics.total_customers,
        "active_customers": analytics.active_customers,
    }
    if conversion_only:
        metrics["conversion_rate"] = _percent(analytics.conversion_rate)
    else:
        metrics["new_leads"] = analytics.new_leads
        metrics["new_customers"] = analytics.new_customers
        metrics["leads_by_status"] = [
            {"status": row.name, "count": row.count} for row in analytics.leads_by_status
        ]

    sources = [
        {
            "section": "crm",
            "label": SECTION_LABELS["crm"],
            "metric": "total_leads",
            "value": analytics.total_leads,
            "unit": "count",
        }
    ]
    if conversion_only:
        sources.append(
            {
                "section": "crm",
                "label": SECTION_LABELS["crm"],
                "metric": "conversion_rate",
                # The raw Decimal, not the "12.50%" display string: a citation
                # carries the exact figure and lets the UI add the unit.
                "value": analytics.conversion_rate,
                "unit": "percent",
            }
        )
    return metrics, sources


def _finance(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID, *, receivables: bool):
    analytics = finance_analytics(db, window, tenant_id)
    if receivables:
        # Receivables are a current position, not a period measure — the same
        # definition the dashboard uses, so both report the identical figure.
        metrics: dict[str, Any] = {
            "outstanding_receivables": _money(analytics.outstanding_receivables),
            "receivable_basis": (
                "all open invoices (issued or partially paid), not period-limited"
            ),
        }
        return metrics, [
            {
                "section": "finance",
                "label": SECTION_LABELS["finance"],
                "metric": "outstanding_receivables",
                "value": _money(analytics.outstanding_receivables),
                "unit": "money",
            }
        ]

    metrics = {
        "invoice_count": analytics.invoice_count,
        "invoice_total": _money(analytics.invoice_total),
        "amount_paid": _money(analytics.amount_paid),
        "amount_due": _money(analytics.amount_due),
        "payment_total": _money(analytics.payment_total),
        "vendor_payment_total": _money(analytics.vendor_payment_total),
        "invoice_status_distribution": [
            {"status": row.status, "count": row.count, "amount": _money(row.amount)}
            for row in analytics.invoice_status_distribution
        ],
    }
    return metrics, [
        {
            "section": "finance",
            "label": SECTION_LABELS["finance"],
            "metric": "invoice_total",
            "value": _money(analytics.invoice_total),
            "unit": "money",
        },
        {
            "section": "finance",
            "label": SECTION_LABELS["finance"],
            "metric": "amount_paid",
            "value": _money(analytics.amount_paid),
            "unit": "money",
        },
    ]


def _approvals(db: Session, user: User):
    # Reuses the dashboard's own pending-approval aggregation and applies the
    # same per-bucket redaction the dashboard applies, so the assistant can
    # never cite a queue the caller could not action on the dashboard.
    approvals = filter_approvals_for_user(
        pending_approvals(db, user.tenant_id, limit=MAX_APPROVAL_ITEMS), user
    )
    metrics = {
        "total_pending": approvals.total_pending,
        "counts_by_module": dict(approvals.counts_by_module),
        "items": [
            {"module": item.module, "reference": item.reference, "status": item.status}
            for item in approvals.items
        ],
    }
    return metrics, [
        {
            "section": "approvals",
            "label": SECTION_LABELS["approvals"],
            "metric": "total_pending",
            "value": approvals.total_pending,
            "unit": "count",
        }
    ]


# --------------------------------------------------------------- assembly


def _trend_direction(points) -> str:
    """A factual description of the series direction.

    Derived only from the points already retrieved — it is a comparison of two
    real buckets, not a forecast.
    """
    if len(points) < 2:
        return "insufficient_data"
    first = Decimal(points[0].amount)
    last = Decimal(points[-1].amount)
    if last > first:
        return "increasing"
    if last < first:
        return "decreasing"
    return "flat"


def build_context(
    db: Session,
    window: ResolvedPeriod,
    user: User,
    intent: Intent,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Build the model context for one intent.

    Returns ``(context, sources)``. Only sections the caller may read are ever
    queried, so an unauthorised section is absent rather than zeroed.

    ``BUSINESS_SUMMARY`` spans every permitted section; the others touch exactly
    the one section their intent names.
    """
    tenant_id = user.tenant_id
    permitted = set(allowed_sections(user))
    # P2-06: resolved once, before any figure is read for the prompt.
    record_scope = RecordScope.for_user(db, user)

    if intent is Intent.BUSINESS_SUMMARY:
        sections: list[str] = []
        metrics: dict[str, Any] = {}
        sources: list[dict[str, Any]] = []

        if "sales" in permitted:
            section_metrics, section_sources = _sales(db, window, record_scope, trend=True)
            sections.append("sales")
            metrics["sales"] = section_metrics
            sources.extend(section_sources)
        if "purchase" in permitted:
            section_metrics, section_sources = _purchase(db, window, tenant_id)
            sections.append("purchase")
            metrics["purchase"] = section_metrics
            sources.extend(section_sources)
        if "inventory" in permitted:
            section_metrics, section_sources = _inventory(
                db, window, tenant_id, low_only=True
            )
            sections.append("inventory")
            metrics["inventory"] = section_metrics
            sources.extend(section_sources)
        if "finance" in permitted:
            section_metrics, section_sources = _finance(
                db, window, tenant_id, receivables=False
            )
            sections.append("finance")
            metrics["finance"] = section_metrics
            sources.extend(section_sources)
        if "crm" in permitted:
            section_metrics, section_sources = _crm(
                db, window, record_scope, conversion_only=False
            )
            sections.append("crm")
            metrics["crm"] = section_metrics
            sources.extend(section_sources)
        if "approvals" in permitted:
            section_metrics, section_sources = _approvals(db, user)
            sections.append("approvals")
            metrics["approvals"] = section_metrics
            sources.extend(section_sources)

    else:
        section = INTENT_SECTIONS[intent]
        # Defence in depth: the router already gated on this, but the builder
        # refuses to query a section the caller cannot see even if reached
        # directly by another caller.
        if section not in permitted:
            return (
                {
                    "period": _period_payload(window),
                    "authorized_sections": sorted(permitted),
                    "unavailable_section": section,
                    "metrics": {},
                },
                [],
            )

        builder = _BUILDERS[intent]
        section_metrics, sources = builder(db, window, user, record_scope)
        sections = [section]
        metrics = {section: section_metrics}

    context = {
        "period": _period_payload(window),
        "currency": DISPLAY_CURRENCY,
        "authorized_sections": sections,
        "metrics": metrics,
    }
    return context, sources


def _period_payload(window: ResolvedPeriod) -> dict[str, str]:
    label = PERIOD_LABELS.get(window.period, "Selected Period")
    return {
        "label": label,
        "start": window.date_from.isoformat(),
        "end": window.date_to.isoformat(),
        "key": window.period,
    }


def period_info(window: ResolvedPeriod) -> "AIPeriod":
    """The resolved window as the API returns it."""
    return AIPeriod(
        period=window.period,
        label=PERIOD_LABELS.get(window.period, "Selected Period"),
        date_from=window.date_from,
        date_to=window.date_to,
    )


# Intent -> builder. Signatures are uniform: ``(db, window, user, record_scope)``.
_BUILDERS = {
    Intent.SALES_SUMMARY: lambda db, w, u, s: _sales(db, w, s, trend=False),
    Intent.SALES_TREND: lambda db, w, u, s: _sales(db, w, s, trend=True),
    Intent.PURCHASE_SUMMARY: lambda db, w, u, s: _purchase(db, w, u.tenant_id),
    Intent.INVENTORY_SUMMARY: lambda db, w, u, s: _inventory(db, w, u.tenant_id, low_only=False),
    Intent.LOW_STOCK: lambda db, w, u, s: _inventory(db, w, u.tenant_id, low_only=True),
    Intent.FINANCE_SUMMARY: lambda db, w, u, s: _finance(db, w, u.tenant_id, receivables=False),
    Intent.RECEIVABLES: lambda db, w, u, s: _finance(db, w, u.tenant_id, receivables=True),
    Intent.CRM_SUMMARY: lambda db, w, u, s: _crm(db, w, s, conversion_only=False),
    Intent.LEAD_CONVERSION: lambda db, w, u, s: _crm(db, w, s, conversion_only=True),
    Intent.PENDING_APPROVALS: lambda db, w, u, s: _approvals(db, u),
    Intent.BUSINESS_SUMMARY: lambda db, w, u, s: ({}, []),
}
