"""P2-15 endpoints: vendor recommendations and the 90-day cash-flow forecast.

``GET /ai/vendor-recommendations`` ([§4.4 API-3], FR-M4-03) and
``GET /ai/cash-flow-forecast`` ([§4.7 API-6], FR-M7-06). The lead score is
served by CRM (``GET /crm/leads/{id}/score``, [§4.2 API-2]); reorder points by
``GET /ai/reorder-suggestions`` (P1-15, now with a top-level ``confidence``).

Both are read only, tenant-scoped from the token, and never fail because the
scoring engine is down: they answer with ``fallback: true`` instead (TC-006).
Permissions reuse the readers of the underlying data rather than ``ai.use``:
anyone who may read vendors may see them ranked; the cash-flow view needs both
invoice and vendor-bill read rights because it discloses both.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.dependencies import DBSession
from app.models.user import User
from app.modules.ai.cashflow import HORIZON_DAYS, cash_flow_projection
from app.modules.ai.vendor_ranking import DEFAULT_LIMIT, MAX_LIMIT, vendor_ranking
from app.modules.auth.dependencies import require_permission
from app.schemas.ai_scoring import CashFlowProjectionResponse, VendorRankingResponse

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/vendor-recommendations", response_model=VendorRankingResponse)
def vendor_recommendations(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("purchase.vendor.view"))],
    product_id: Annotated[uuid.UUID | None, Query(description="Rank for one product")] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_LIMIT)] = DEFAULT_LIMIT,
) -> VendorRankingResponse:
    """Top vendors by on-time delivery and price, or the static price ranking.

    ``limit`` defaults to 3 (FR-M4-03 "top 3"); the vendors page asks for more.
    """
    if product_id is not None:
        from app.modules.inventory.service import get_product

        get_product(db, actor.tenant_id, product_id)  # 404 across tenants
    ranking = vendor_ranking(db, actor.tenant_id, product_id=product_id, limit=limit)
    return VendorRankingResponse.model_validate(ranking)


@router.get("/cash-flow-forecast", response_model=CashFlowProjectionResponse)
def cash_flow_forecast(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("finance.invoice.view"))],
    _bills: Annotated[User, Depends(require_permission("finance.bill.view"))],
    horizon: Annotated[int, Query(ge=7, le=HORIZON_DAYS)] = HORIZON_DAYS,
) -> CashFlowProjectionResponse:
    """Weekly projected inflows/outflows over the next ``horizon`` (<= 90) days."""
    projection = cash_flow_projection(db, actor.tenant_id, horizon=horizon)
    return CashFlowProjectionResponse.model_validate(projection)


__all__ = ["router"]
