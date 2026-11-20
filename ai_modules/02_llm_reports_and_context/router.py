"""AI endpoints: /api/v1/ai/*.

Both endpoints sit behind the existing ``ai.use`` permission, resolve the tenant
from the verified access token, and reuse the dashboard's period resolver and
analytics functions. No AI-specific authentication, tenancy or aggregation is
introduced here.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.dependencies import DBSession
from app.models.user import User
from app.modules.ai.audit import (
    AI_INSIGHTS_GENERATED,
    AI_INSIGHTS_INSUFFICIENT,
    ENTITY_INSIGHTS,
    safe_metadata,
)
from app.modules.ai.forecast import (
    DEFAULT_HORIZON_DAYS,
    MAX_HORIZON_DAYS,
    sales_forecast,
)
from app.modules.ai.insights import build_insights
from app.modules.ai.intents import SECTION_LABELS
from app.modules.ai.inventory_reorder import (
    DEFAULT_LEAD_TIME_DAYS,
    DEFAULT_LOOKBACK_DAYS,
    MAX_LOOKBACK_DAYS,
    MIN_LOOKBACK_DAYS,
    reorder_insight,
)
from app.modules.ai.project_risk import project_risk_report
from app.modules.ai.reports import (
    REPORT_INTENTS,
    generate_report,
    required_permission,
)
from app.modules.ai.service import AI_PERMISSION, answer_question
from app.modules.ai.context import period_info
from app.modules.audit.service import record_audit
from app.modules.auth.dependencies import require_permission
from app.modules.auth.scope import RecordScope
from app.modules.auth.service import user_permissions
from app.modules.dashboard.service import (
    PERIODS,
    SECTION_PERMISSIONS,
    ResolvedPeriod,
    resolve_period,
)
from app.schemas.ai import AIInsights, AIResponse, AssistantRequest, ReorderInsightResponse
from app.schemas.forecast import SalesForecast
from app.schemas.project import ProjectRiskReportResponse
from app.schemas.report import REPORT_TITLES, GeneratedReport, ReportRequest

router = APIRouter(prefix="/ai", tags=["AI"])

AIActor = Annotated[User, Depends(require_permission(AI_PERMISSION))]


def _period(
    period: Annotated[
        str | None,
        Query(description=" | ".join(PERIODS)),
    ] = None,
    date_from: Annotated[date | None, Query(description="Explicit inclusive start date")] = None,
    date_to: Annotated[date | None, Query(description="Explicit inclusive end date")] = None,
) -> ResolvedPeriod:
    """Reuse the dashboard's resolver so both surfaces agree on the window."""
    return resolve_period(period, date_from, date_to)


Period = Annotated[ResolvedPeriod, Depends(_period)]


def _report_window(payload: ReportRequest) -> ResolvedPeriod:
    """Resolve the report window from the request body.

    Reuses the dashboard's own resolver, so a report and the dashboard panel for
    the same period key cover exactly the same days. Invalid keys and impossible
    ranges (start after end, or beyond the dashboard's 366-day limit) are rejected
    here as clean 400s by the shared ``BadRequestException``.
    """
    return resolve_period(payload.period, payload.date_from, payload.date_to)


@router.post("/assistant", response_model=AIResponse)
def assistant(
    payload: AssistantRequest,
    db: DBSession,
    actor: AIActor,
    window: Period,
) -> AIResponse:
    """Answer a natural-language business question from authorised ERP data."""
    try:
        return answer_question(db, window, actor, payload)
    finally:
        # The assistant reads ERP data and writes only its audit rows — including
        # on the rejected and provider-failure paths, which raise. Committing in
        # `finally` is what keeps those audit rows, which is the whole point of
        # recording them. A genuinely failed request has nothing else pending, so
        # there is no partial business write to publish here.
        db.commit()


@router.get("/insights", response_model=AIInsights)
def insights(db: DBSession, actor: AIActor, window: Period) -> AIInsights:
    """Derived observations from permitted dashboard metrics.

    Reads the same aggregates as the dashboard panels, so an insight and the
    panel beside it can never disagree.
    """
    observations, sections, insufficient = build_insights(db, window, actor)

    record_audit(
        db,
        action=AI_INSIGHTS_INSUFFICIENT if insufficient else AI_INSIGHTS_GENERATED,
        entity_type=ENTITY_INSIGHTS,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        description="Dashboard insights generated",
        metadata=safe_metadata(
            outcome="insufficient_data" if insufficient else "generated",
            period=window.period,
            sections=sections,
            section_labels=[SECTION_LABELS[s] for s in sections if s in SECTION_LABELS],
            insight_count=len(observations),
        ),
    )
    # The insight panels read only, so the audit row is the entire transaction
    # and is committed here instead of being left pending on a closing session.
    db.commit()

    return AIInsights(
        period=period_info(window),
        insights=observations,
        sections=sections,
        insufficient_data=insufficient,
        # Observations are derived in the backend from real metrics, so no model
        # call is made and none is claimed.
        generated_by="system",
    )


@router.get("/forecast/sales", response_model=SalesForecast)
def forecast_sales(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission(SECTION_PERMISSIONS["sales"]))],
    horizon: Annotated[
        int,
        Query(ge=1, le=MAX_HORIZON_DAYS, description="Days to project (max 90)"),
    ] = DEFAULT_HORIZON_DAYS,
) -> SalesForecast:
    """Project net sales forward from this tenant's own order history.

    Access mirrors the dashboard's sales panel: ``sales.view`` is required, and
    the tenant comes from the verified access token rather than a parameter.
    The numbers are produced by deterministic arithmetic in
    :mod:`app.modules.ai.forecast`; no language model is involved, so this
    endpoint costs no AI provider calls.
    """
    return sales_forecast(db, RecordScope.for_user(db, actor), horizon=horizon)


@router.post("/reports", response_model=GeneratedReport)
def generate_business_report(
    payload: ReportRequest,
    db: DBSession,
    actor: AIActor,
) -> GeneratedReport:
    """Build a structured business report from authorised ERP data.

    The figures are aggregated by the dashboard services before the model is
    contacted, so the report is complete and correct even when Groq is not. The
    model only writes the executive summary, and at most one provider call is
    made per request.

    Access is gated twice: ``ai.use`` on the endpoint, then the report's own
    section permission inside :func:`generate_report`, which mirrors the
    dashboard. ``BUSINESS_SUMMARY`` includes only permitted sections. The tenant
    comes from the verified access token — the request schema forbids the caller
    from supplying one.
    """
    window = _report_window(payload)
    try:
        return generate_report(db, window, actor, payload.report_type, explain=payload.explain)
    finally:
        # As with the assistant: a report reads ERP data and writes only its audit
        # rows, and the rejected-permission path raises after recording one. The
        # commit in `finally` is what preserves those rows.
        db.commit()


@router.get("/reports/types")
def report_types(actor: AIActor) -> dict[str, object]:
    """Report types this caller may request, so the UI offers only real options.

    Presentation only — the backend re-checks the same permissions when a report
    is actually generated.
    """
    granted = set(user_permissions(actor))
    return {
        "reports": [
            {
                "report_type": report_type.value,
                "title": REPORT_TITLES[report_type],
                "permission": required_permission(report_type),
            }
            for report_type in REPORT_INTENTS
            if required_permission(report_type) is None
            or required_permission(report_type) in granted
        ]
    }


#: Permission guarding the project-risk assessment. The existing ``project.view``,
#: rather than the generic ``ai.use``: the answer is a reading of project
#: milestones and tasks, so it is authorised exactly as reading those projects
#: already is, and no caller gains project data they could not fetch anyway.
PROJECT_RISK_PERMISSION = "project.view"


@router.get("/project-risk", response_model=ProjectRiskReportResponse)
def project_risk(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission(PROJECT_RISK_PERMISSION))],
    project_id: Annotated[
        uuid.UUID | None, Query(description="Assess one project instead of all")
    ] = None,
) -> ProjectRiskReportResponse:
    """Assess milestone delay risk for this tenant's projects (FR-M9-05).

    Every milestone is compared on two recorded facts: how much of its planned
    window has elapsed, and how much of its work is done. A milestone materially
    behind that line is reported MEDIUM or HIGH with the figures behind the call.

    Strictly read-only — it reads rows and returns a value, changing no project,
    milestone or task status, raising no notification, and contacting no AI
    provider. Access reuses the existing ``project.view`` permission, since this
    is a read of project data, and the tenant comes from the verified access
    token; a ``project_id`` from another company is a 404.

    A milestone that cannot be judged — no planned window, or no tasks — is
    reported ``INSUFFICIENT_DATA`` with a reason and a null score, never a guess.
    """
    report = project_risk_report(db, actor.tenant_id, project_id=project_id)
    return ProjectRiskReportResponse.from_service(report)


@router.get("/inventory-reorder", response_model=ReorderInsightResponse)
def inventory_reorder(
    db: DBSession,
    actor: AIActor,
    # The insight discloses the product's available stock, so it also needs the
    # right to read stock, not only to use the AI features.
    _stock_reader: Annotated[User, Depends(require_permission("inventory.stock.view"))],
    product_id: Annotated[uuid.UUID, Query(description="Product to assess")],
    lookback_days: Annotated[
        int,
        Query(
            ge=MIN_LOOKBACK_DAYS,
            le=MAX_LOOKBACK_DAYS,
            description=f"Demand history window in days ({MIN_LOOKBACK_DAYS}-{MAX_LOOKBACK_DAYS})",
        ),
    ] = DEFAULT_LOOKBACK_DAYS,
    lead_time_days: Annotated[
        int,
        Query(
            ge=1,
            le=MAX_LOOKBACK_DAYS,
            description="Days of cover to hold when sizing the recommendation",
        ),
    ] = DEFAULT_LEAD_TIME_DAYS,
) -> ReorderInsightResponse:
    """Estimate demand and recommend a reorder quantity for one product.

    Advisory only, by construction: the endpoint reads sales-order history and
    stock balances and returns a number. It creates no purchase order, writes no
    inventory row and contacts no AI provider, so ``purchase_order_created`` is
    fixed at False and repeated calls cannot produce duplicate orders.

    Every figure is plain arithmetic over recorded history, so the same inputs
    always give the same answer. When the history is too thin to support a rate
    the response is ``status = INSUFFICIENT_DATA`` with null recommendations,
    never an invented forecast.

    Access reuses the existing ``ai.use`` permission, and the tenant comes from
    the verified access token: a ``product_id`` from another company is a 404.
    """
    insight = reorder_insight(
        db,
        actor.tenant_id,
        product_id,
        lookback_days=lookback_days,
        lead_time_days=lead_time_days,
    )
    return ReorderInsightResponse.from_service(insight)


@router.get("/capabilities")
def capabilities(actor: AIActor) -> dict[str, object]:
    """Supported topics, so the UI can offer suggestions without hardcoding them."""
    from app.modules.ai.intents import Intent

    return {
        "intents": [intent.value for intent in Intent],
        "sections": sorted(SECTION_LABELS),
        "periods": list(PERIODS),
    }


__all__ = ["router"]