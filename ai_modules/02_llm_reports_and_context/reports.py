"""Business report generation over real ERP data.

The report is assembled **before** any AI call, by the same dashboard service
functions the dashboard panels and the Business Assistant already use. That
ordering is the whole point:

* The numbers are identical to the dashboard for the same tenant and period,
  because they come from the same SQL.
* An unauthorised section is never queried, so it cannot appear in the report.
* If Groq is unavailable the report is still complete — only the prose is
  missing, and the status says so.

This module contains no SQL and no aggregation logic of its own.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.common.exceptions import ForbiddenException
from app.models.user import User
from app.modules.ai.audit import (
    AI_REPORT_DENIED,
    AI_REPORT_FAILED,
    AI_REPORT_GENERATED,
    AI_REPORT_PARTIAL,
    ENTITY_REPORT,
    safe_metadata,
)
from app.modules.ai.context import build_context, period_info
from app.modules.ai.errors import (
    AIProviderNotConfiguredException,
    AIProviderTimeoutException,
    AIProviderUnavailableException,
    AIMalformedResponseException,
)
from app.modules.ai.intents import INTENT_SECTIONS, SECTION_LABELS, Intent
from app.modules.ai.provider import AIProvider, get_provider
from app.modules.ai.prompt import REPORT_SYSTEM_PROMPT, build_report_message
from app.modules.audit.service import record_audit
from app.modules.auth.scope import RecordScope
from app.modules.auth.service import user_permissions
from app.modules.dashboard.service import (
    SECTION_PERMISSIONS,
    ResolvedPeriod,
    allowed_sections,
    crm_analytics,
    finance_analytics,
    inventory_analytics,
    purchase_analytics,
    sales_analytics,
)
from app.schemas.report import (
    REPORT_TITLES,
    GeneratedReport,
    ReportAIStatus,
    ReportColumn,
    ReportMetric,
    ReportSection,
    ReportType,
)

logger = logging.getLogger(__name__)

#: Permission required to use the report feature. Same code as every AI feature.
AI_PERMISSION = "ai.use"

#: The intent each report reads, so the report inherits the assistant's existing
#: section vocabulary instead of inventing a second mapping.
REPORT_INTENTS: dict[ReportType, Intent] = {
    ReportType.SALES: Intent.SALES_SUMMARY,
    ReportType.PURCHASE: Intent.PURCHASE_SUMMARY,
    ReportType.INVENTORY: Intent.INVENTORY_SUMMARY,
    ReportType.FINANCE: Intent.FINANCE_SUMMARY,
    ReportType.CRM: Intent.CRM_SUMMARY,
    ReportType.BUSINESS_SUMMARY: Intent.BUSINESS_SUMMARY,
}


def required_permission(report_type: ReportType) -> str | None:
    """Resolve a report's gate through the shared section permission mapping.

    ``None`` means the report spans sections (``BUSINESS_SUMMARY``) and is
    filtered section-by-section against the caller's actual permissions instead
    of being gated by one code.
    """
    section = INTENT_SECTIONS[REPORT_INTENTS[report_type]]
    if section == "*":
        return None
    return SECTION_PERMISSIONS.get(section)


# --------------------------------------------------------------- assembly


def _money(value) -> ReportMetric:
    """Money as an exact decimal; ``money()`` has already quantised it."""
    return ReportMetric(value=value, unit="money")


def _metric(key: str, label: str, value, unit: str = "number") -> ReportMetric:
    return ReportMetric(key=key, label=label, value=value, unit=unit)


def _qty_metric(key: str, label: str, value) -> ReportMetric:
    return ReportMetric(key=key, label=label, value=value, unit="quantity")


def _percent_metric(key: str, label: str, value) -> ReportMetric:
    """``None`` stays ``None``: "not calculable" must not render as 0%."""
    return ReportMetric(key=key, label=label, value=value, unit="percent")


def _sales_report(db: Session, window: ResolvedPeriod, scope: RecordScope):
    """Sales section, read through the dashboard's own (record-scoped, P2-06) sales aggregation."""
    analytics = sales_analytics(db, window, scope)

    summary = [
        _metric("total_sales", "Total net sales", analytics.total_sales, "money"),
        _metric("order_count", "Orders", analytics.order_count, "count"),
        _metric("average_order_value", "Average order value", analytics.average_order_value, "money"),
    ]

    overview = ReportSection(
        title="Sales Overview",
        section="sales",
        metrics=[
            _metric("total_sales", "Total net sales", analytics.total_sales, "money"),
            _metric("order_count", "Orders (all statuses)", analytics.order_count, "count"),
            _metric("average_order_value", "Average order value", analytics.average_order_value, "money"),
        ],
    )

    by_status = ReportSection(
        title="Orders by Status",
        section="sales",
        columns=[
            ReportColumn(key="status", label="Status"),
            ReportColumn(key="count", label="Orders", unit="count"),
            ReportColumn(key="amount", label="Value", unit="money"),
        ],
        rows=[
            {"status": row.status, "count": row.count, "amount": row.amount}
            for row in analytics.status_distribution
        ],
    )

    trend = ReportSection(
        title="Daily Sales",
        section="sales",
        columns=[
            ReportColumn(key="date", label="Date"),
            ReportColumn(key="amount", label="Value", unit="money"),
            ReportColumn(key="orders", label="Orders", unit="count"),
        ],
        rows=[
            {"date": point.date, "amount": point.amount, "orders": point.orders}
            for point in analytics.daily
        ],
    )

    return summary, [overview, by_status, trend], analytics.order_count > 0


def _purchase_report(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID):
    """Purchase section, read through the dashboard's purchase aggregation."""
    analytics = purchase_analytics(db, window, tenant_id)

    summary = [
        _metric("total_purchases", "Total net purchases", analytics.total_purchases, "money"),
        _metric("order_count", "Orders", analytics.order_count, "count"),
        _metric("average_order_value", "Average order value", analytics.average_order_value, "money"),
    ]

    overview = ReportSection(title="Purchase Overview", section="purchase", metrics=list(summary))
    by_status = ReportSection(
        title="Orders by Status",
        section="purchase",
        columns=[
            ReportColumn(key="status", label="Status"),
            ReportColumn(key="count", label="Orders", unit="count"),
            ReportColumn(key="amount", label="Value", unit="money"),
        ],
        rows=[
            {"status": row.status, "count": row.count, "amount": row.amount}
            for row in analytics.status_distribution
        ],
    )
    trend = ReportSection(
        title="Daily Purchases",
        section="purchase",
        columns=[
            ReportColumn(key="date", label="Date"),
            ReportColumn(key="amount", label="Value", unit="money"),
            ReportColumn(key="orders", label="Orders", unit="count"),
        ],
        rows=[
            {"date": point.date, "amount": point.amount, "orders": point.orders}
            for point in analytics.daily
        ],
    )

    return summary, [overview, by_status, trend], analytics.order_count > 0
def _inventory_report(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID):
    """Inventory section, read through the dashboard's inventory aggregation."""
    analytics = inventory_analytics(db, window, tenant_id)

    summary = [
        _metric("products_with_stock", "Products with stock", analytics.products_with_stock, "count"),
        _qty_metric("total_available_quantity", "Available quantity", analytics.total_available_quantity),
        _metric("low_stock_count", "Items below reorder level", analytics.low_stock_count, "count"),
    ]

    balances = ReportSection(
        title="Stock Balances",
        section="inventory",
        metrics=[
            _qty_metric("total_physical_quantity", "Physical", analytics.total_physical_quantity),
            _qty_metric("total_reserved_quantity", "Reserved", analytics.total_reserved_quantity),
            _qty_metric("total_available_quantity", "Available", analytics.total_available_quantity),
        ],
    )
    low_stock = ReportSection(
        title="Items Below Reorder Level",
        section="inventory",
        columns=[
            ReportColumn(key="product_code", label="Code"),
            ReportColumn(key="product_name", label="Product"),
            ReportColumn(key="available_quantity", label="Available", unit="quantity"),
            ReportColumn(key="reorder_level", label="Reorder at", unit="quantity"),
        ],
        rows=[
            {
                "product_code": row.product_code,
                "product_name": row.product_name,
                "available_quantity": row.available_quantity,
                "reorder_level": row.reorder_level,
            }
            for row in analytics.low_stock_products
        ],
    )
    warehouses = ReportSection(
        title="Stock by Warehouse",
        section="inventory",
        columns=[
            ReportColumn(key="warehouse_name", label="Warehouse"),
            ReportColumn(key="products", label="Products", unit="count"),
            ReportColumn(key="available_quantity", label="Available", unit="quantity"),
        ],
        rows=[
            {
                "warehouse_name": row.warehouse_name,
                "products": row.products,
                "available_quantity": row.available_quantity,
            }
            for row in analytics.stock_by_warehouse
        ],
    )

    return summary, [balances, low_stock, warehouses], bool(analytics.products_with_stock)
def _finance_report(db: Session, window: ResolvedPeriod, tenant_id: uuid.UUID):
    """Finance section, read through the dashboard's finance aggregation."""
    analytics = finance_analytics(db, window, tenant_id)

    summary = [
        _metric("invoice_total", "Invoiced", analytics.invoice_total, "money"),
        _metric("amount_paid", "Paid", analytics.amount_paid, "money"),
        _metric("amount_due", "Due", analytics.amount_due, "money"),
        _metric("outstanding_receivables", "Outstanding receivables", analytics.outstanding_receivables, "money"),
    ]

    invoicing = ReportSection(
        title="Invoicing",
        section="finance",
        metrics=[
            _metric("invoice_count", "Invoices", analytics.invoice_count, "count"),
            _metric("invoice_total", "Invoiced", analytics.invoice_total, "money"),
            _metric("amount_paid", "Paid", analytics.amount_paid, "money"),
            _metric("amount_due", "Due", analytics.amount_due, "money"),
        ],
    )
    # Receivables are a current position rather than a period measure — the same
    # definition the dashboard and the assistant already use.
    receivables = ReportSection(
        title="Receivables",
        section="finance",
        metrics=[
            _metric("outstanding_receivables", "Outstanding receivables", analytics.outstanding_receivables, "money"),
            _metric("payment_total", "Customer payments", analytics.payment_total, "money"),
            _metric("vendor_payment_total", "Vendor payments", analytics.vendor_payment_total, "money"),
        ],
    )
    by_status = ReportSection(
        title="Invoices by Status",
        section="finance",
        columns=[
            ReportColumn(key="status", label="Status"),
            ReportColumn(key="count", label="Invoices", unit="count"),
            ReportColumn(key="amount", label="Value", unit="money"),
        ],
        rows=[
            {"status": row.status, "count": row.count, "amount": row.amount}
            for row in analytics.invoice_status_distribution
        ],
    )

    return summary, [invoicing, receivables, by_status], analytics.invoice_count > 0


def _crm_report(db: Session, window: ResolvedPeriod, scope: RecordScope):
    """CRM section, read through the dashboard's (lead-scoped, P2-06) CRM aggregation."""
    analytics = crm_analytics(db, window, scope)

    summary = [
        _metric("total_leads", "Leads", analytics.total_leads, "count"),
        _metric("total_customers", "Customers", analytics.total_customers, "count"),
        _percent_metric("conversion_rate", "Conversion rate", analytics.conversion_rate),
    ]

    pipeline = ReportSection(
        title="Pipeline",
        section="crm",
        metrics=[
            _metric("total_leads", "Leads", analytics.total_leads, "count"),
            _metric("new_leads", "New in period", analytics.new_leads, "count"),
            _metric("qualified_leads", "Qualified", analytics.qualified_leads, "count"),
            _metric("converted_leads", "Converted", analytics.converted_leads, "count"),
        ],
    )
    customers = ReportSection(
        title="Customers",
        section="crm",
        metrics=[
            _metric("total_customers", "Customers", analytics.total_customers, "count"),
            _metric("active_customers", "Active", analytics.active_customers, "count"),
            _metric("new_customers", "New in period", analytics.new_customers, "count"),
        ],
    )
    by_status = ReportSection(
        title="Leads by Status",
        section="crm",
        columns=[
            ReportColumn(key="status", label="Status"),
            ReportColumn(key="count", label="Leads", unit="count"),
        ],
        rows=[
            {"status": row.name, "count": row.count} for row in analytics.leads_by_status
        ],
    )

    has_data = analytics.total_leads > 0 or analytics.total_customers > 0
    return summary, [pipeline, customers, by_status], has_data


def _business_summary_report(db: Session, window: ResolvedPeriod, user: User):
    """Assemble every section the caller is permitted to read, and no others.

    ``allowed_sections`` is the same filter the dashboard uses, so a caller who
    cannot see Finance gets no Finance section, no Finance figures in the
    summary, and no Finance data in the model context.
    """
    permitted = [s for s in allowed_sections(user) if s in SECTION_LABELS]
    record_scope = RecordScope.for_user(db, user)  # P2-06

    summary: list[ReportMetric] = []
    sections: list[ReportSection] = []
    has_data = False
    # Only the sections actually built are reported as sources.
    included: list[str] = []

    for section in permitted:
        if section == "sales":
            section_summary, section_body, populated = _sales_report(db, window, record_scope)
        elif section == "purchase":
            section_summary, section_body, populated = _purchase_report(db, window, user.tenant_id)
        elif section == "inventory":
            section_summary, section_body, populated = _inventory_report(db, window, user.tenant_id)
        elif section == "finance":
            section_summary, section_body, populated = _finance_report(db, window, user.tenant_id)
        elif section == "crm":
            section_summary, section_body, populated = _crm_report(db, window, record_scope)
        else:
            # "approvals" is not a report type; the business summary reports the
            # five business modules only.
            continue

        summary.extend(section_summary)
        sections.extend(section_body)
        has_data = has_data or populated
        included.append(section)

    return summary, sections, has_data, included


#: Report type -> builder. Signatures are uniform for the single-section reports:
#: ``(db, window, record_scope)``; tenant-only sections read ``scope.tenant_id``.
_BUILDERS = {
    ReportType.SALES: lambda db, w, s: _sales_report(db, w, s),
    ReportType.PURCHASE: lambda db, w, s: _purchase_report(db, w, s.tenant_id),
    ReportType.INVENTORY: lambda db, w, s: _inventory_report(db, w, s.tenant_id),
    ReportType.FINANCE: lambda db, w, s: _finance_report(db, w, s.tenant_id),
    ReportType.CRM: lambda db, w, s: _crm_report(db, w, s),
}


def _authorise(user: User, report_type: ReportType) -> None:
    """Reject a report the caller may not read, before any ERP query runs.

    Uses the same section mapping the dashboard endpoints enforce, so a report
    can never be more permissive than the panel it mirrors.
    """
    permission = required_permission(report_type)
    if permission is None:
        return
    if permission not in set(user_permissions(user)):
        raise ForbiddenException(
            "You do not have permission to view the "
            f"{SECTION_LABELS[INTENT_SECTIONS[REPORT_INTENTS[report_type]]]} data"
        )


def _source_metrics(raw_sources: list[dict]) -> list[ReportMetric]:
    """Source metadata generated by the backend from the data actually read.

    The identifiers come from :mod:`app.modules.ai.context` and are produced
    alongside the metrics, so a citation can only ever name a figure that was
    genuinely retrieved. Nothing here is derived from model output.
    """
    known_sections = set(SECTION_LABELS)
    metrics: list[ReportMetric] = []
    for raw in raw_sources:
        if raw.get("section") not in known_sections:
            # Defence in depth: an unrecognised section is dropped, not echoed.
            continue
        metrics.append(
            ReportMetric(
                key=raw["metric"],
                label=raw["label"],
                value=raw.get("value"),
                unit=raw.get("unit", "number"),
            )
        )
    return metrics


def _explain(
    db: Session,
    window: ResolvedPeriod,
    user: User,
    report_type: ReportType,
    context: dict,
    provider: AIProvider | None,
) -> tuple[str | None, ReportAIStatus, str | None, str | None]:
    """Ask Groq for prose about a report whose numbers are already fixed.

    Every failure mode returns ``(None, status, message, model)`` rather than
    raising: the structured report is already complete, so an AI outage degrades
    the response instead of failing it. ``complete`` is called **once**;
    the provider itself retries only transient failures, within its bounded
    budget (P3-19, ``AI_RETRY_*``).
    """
    active = provider or get_provider()

    if not active.is_configured():
        # Checked before the context is serialised so a misconfigured
        # deployment costs nothing and leaks nothing about the data.
        return (
            None,
            ReportAIStatus.NOT_CONFIGURED,
            "AI explanations are not configured on this server.",
            None,
        )

    try:
        summary = active.complete(
            REPORT_SYSTEM_PROMPT, build_report_message(report_type, context)
        )
    except (AIProviderUnavailableException, AIProviderTimeoutException) as exc:
        logger.warning("Report explanation unavailable: %s", type(exc).__name__)
        return None, ReportAIStatus.UNAVAILABLE, exc.message, None
    except AIMalformedResponseException as exc:
        logger.warning("Report explanation was unreadable")
        return None, ReportAIStatus.UNAVAILABLE, exc.message, None
    except AIProviderNotConfiguredException as exc:
        return None, ReportAIStatus.NOT_CONFIGURED, exc.message, None

    if not summary or not summary.strip():
        return (
            None,
            ReportAIStatus.UNAVAILABLE,
            "The AI assistant returned an empty summary.",
            None,
        )

    return summary, ReportAIStatus.GENERATED, None, active.model


def generate_report(
    db: Session,
    window: ResolvedPeriod,
    user: User,
    report_type: ReportType,
    *,
    explain: bool = True,
    provider: AIProvider | None = None,
) -> GeneratedReport:
    """Build one report from authorised ERP data.

    Order matters and is the security model: authorise first, aggregate second,
    explain third. ``provider`` is injectable so tests replace it at this
    boundary and never make a network call.
    """
    try:
        _authorise(user, report_type)
    except ForbiddenException:
        record_audit(
            db,
            action=AI_REPORT_DENIED,
            entity_type=ENTITY_REPORT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Report rejected for a missing section permission",
            metadata=safe_metadata(
                report_type=report_type.value,
                outcome="unauthorized",
                period=window.period,
            ),
        )
        raise

    # ------------------------------------------------------------ aggregate
    # Runs before any provider call: the numbers must exist and be correct even
    # if the explanation never arrives.
    if report_type is ReportType.BUSINESS_SUMMARY:
        summary, sections, has_data, source_sections = _business_summary_report(
            db, window, user
        )
    else:
        summary, sections, has_data = _BUILDERS[report_type](
            db, window, RecordScope.for_user(db, user)
        )
        section_key = INTENT_SECTIONS[REPORT_INTENTS[report_type]]
        source_sections = [section_key]

    # The context reuses the assistant's builder, which re-reads the same
    # permitted sections and returns backend-generated sources alongside them.
    context, raw_sources = build_context(db, window, user, REPORT_INTENTS[report_type])
    sources = _source_metrics(raw_sources)

    started = time.perf_counter()

    # ------------------------------------------------------------- explain
    if explain and has_data:
        executive_summary, ai_status, ai_error, model = _explain(
            db, window, user, report_type, context, provider
        )
    else:
        executive_summary = None
        model = None
        if not has_data:
            ai_status = ReportAIStatus.NOT_REQUESTED
            ai_error = "There is no data in this period, so no summary was written."
        else:
            # No summary was asked for, which is not an error.
            ai_status = ReportAIStatus.NOT_REQUESTED
            ai_error = None

    duration_ms = int((time.perf_counter() - started) * 1000)
    generated = executive_summary is not None

    record_audit(
        db,
        action=(
            AI_REPORT_GENERATED
            if generated
            else (AI_REPORT_PARTIAL if ai_status is not ReportAIStatus.NOT_CONFIGURED else AI_REPORT_FAILED)
        ),
        entity_type=ENTITY_REPORT,
        tenant_id=user.tenant_id,
        user_id=user.id,
        description="Business report generated",
        # Classification only: never the report contents, the prompt or the
        # model's prose, none of which belong in a readable audit trail.
        metadata=safe_metadata(
            report_type=report_type.value,
            outcome="generated" if generated else ai_status.value,
            period=window.period,
            sections=source_sections,
            section_count=len(sections),
            source_count=len(sources),
            has_data=has_data,
            duration_ms=duration_ms,
        ),
    )

    return GeneratedReport(
        report_type=report_type,
        title=REPORT_TITLES[report_type],
        period=period_info(window),
        summary=summary,
        sections=sections,
        sources=sources,
        source_sections=source_sections,
        executive_summary=executive_summary,
        ai_status=ai_status,
        ai_error=ai_error,
        generated_by="groq" if generated else "system",
        model=model,
        generated_at=datetime.now(timezone.utc),
        has_data=has_data,
    )


__all__ = ["AI_PERMISSION", "REPORT_INTENTS", "generate_report", "required_permission"]
