"""Local ML endpoints: ``/api/v1/ai/ml/*``.

Pattern analysis, model-based forecasting and customer review sentiment, all
computed in-process (scikit-learn, PyTorch, Hugging Face Transformers). No
external AI provider is called by anything here.

Access reuses existing permissions rather than inventing new ones:

* patterns / forecast -- ``sales.view`` (as the dashboard's sales panel and the
  deterministic forecast), with the history narrowed to the caller's
  ``sales.order.view`` record scope in SQL;
* sentiment analysis -- ``ai.use`` plus ``crm.customer.view`` (reviews are
  customer content and may be linked to customers);
* stored sentiment reports -- ``crm.customer.view``.

The tenant always comes from the verified access token. Handlers validate and
delegate; model code lives in :mod:`app.modules.ai.ml`.
"""

import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.common.dependencies import DBSession
from app.common.exceptions import BadRequestException
from app.models.user import User
from app.modules.ai.ml import registry
from app.modules.ai.ml.limits import (
    DEFAULT_LOOKBACK_DAYS,
    DEFAULT_TOP_PRODUCTS,
    HORIZONS,
    MAX_LOOKBACK_DAYS,
    MAX_TOP_PRODUCTS,
    MIN_LOOKBACK_DAYS,
)
from app.modules.ai.ml.sentiment_service import (
    analyze_reviews,
    get_batch,
    list_batches,
    overview,
)
from app.modules.ai.service import AI_PERMISSION
from app.modules.auth.dependencies import require_permission
from app.modules.auth.scope import RecordScope
from app.modules.dashboard.service import SECTION_PERMISSIONS
from app.schemas.ml import (
    MLForecastResponse,
    PatternAnalysis,
    SentimentAnalyzeRequest,
    SentimentBatchList,
    SentimentBatchOut,
    SentimentOverview,
)

router = APIRouter(prefix="/ai/ml", tags=["AI / Machine Learning"])

SalesReader = Annotated[User, Depends(require_permission(SECTION_PERMISSIONS["sales"]))]
CustomerReader = Annotated[User, Depends(require_permission("crm.customer.view"))]
AIUser = Annotated[User, Depends(require_permission(AI_PERMISSION))]


def _require_numeric_stack() -> None:
    """503 before importing a numpy-based service on a host without the ML stack."""
    registry.require_enabled()
    registry.require_libraries("numpy", "scipy", "sklearn")


@router.get("/status")
def ml_status(_: AIUser) -> dict:
    """Which ML libraries are installed and whether the sentiment model is loaded."""
    return registry.status()


@router.get("/patterns", response_model=PatternAnalysis)
def sales_patterns(
    db: DBSession,
    actor: SalesReader,
    lookback_days: Annotated[
        int, Query(ge=MIN_LOOKBACK_DAYS, le=MAX_LOOKBACK_DAYS, description="History window")
    ] = DEFAULT_LOOKBACK_DAYS,
) -> PatternAnalysis:
    """Best/slow products, customer segments, anomalies, revenue trend, co-purchases."""
    _require_numeric_stack()
    from app.modules.ai.ml.patterns import analyze_patterns

    return analyze_patterns(db, RecordScope.for_user(db, actor), lookback_days)


@router.get("/forecast", response_model=MLForecastResponse)
def forecast(
    db: DBSession,
    actor: SalesReader,
    # A plain int validated below: query strings are not coerced into an int
    # ``Literal``, so ``Literal[7, 30, 90]`` would reject every request.
    horizon: Annotated[int, Query(description="Days ahead: 7, 30 or 90")] = 30,
    target: Annotated[
        Literal["revenue", "demand"], Query(description="Revenue, or product unit demand")
    ] = "revenue",
    product_id: Annotated[
        uuid.UUID | None, Query(description="Demand for one product (target=demand)")
    ] = None,
    top_products: Annotated[
        int, Query(ge=1, le=MAX_TOP_PRODUCTS, description="Products to forecast when no product_id")
    ] = DEFAULT_TOP_PRODUCTS,
) -> MLForecastResponse:
    """Historical vs predicted daily series with 80% bands and per-horizon totals."""
    if horizon not in HORIZONS:
        raise BadRequestException("horizon must be one of 7, 30 or 90 days.")
    _require_numeric_stack()
    from app.modules.ai.ml.forecasting import ml_forecast

    return ml_forecast(
        db, RecordScope.for_user(db, actor),
        target=target, horizon=horizon, product_id=product_id, top_products=top_products,
    )


@router.post("/sentiment/analyze", response_model=SentimentBatchOut)
def sentiment_analyze(
    payload: SentimentAnalyzeRequest,
    db: DBSession,
    actor: AIUser,
    _customers: CustomerReader,
) -> SentimentBatchOut:
    """Classify reviews (batched), summarise topics/complaints, and store the result.

    A plain ``def`` handler, so FastAPI runs the CPU-bound inference in its
    thread pool rather than on the event loop. On any failure nothing is
    committed: the session is closed by ``get_db`` and the batch is discarded.
    """
    result = analyze_reviews(db, actor, payload)
    if payload.store:
        db.commit()
    return result


@router.get("/sentiment/batches", response_model=SentimentBatchList)
def sentiment_batches(
    db: DBSession,
    actor: CustomerReader,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SentimentBatchList:
    return list_batches(db, actor.tenant_id, limit, offset)


@router.get("/sentiment/batches/{batch_id}", response_model=SentimentBatchOut)
def sentiment_batch(batch_id: uuid.UUID, db: DBSession, actor: CustomerReader) -> SentimentBatchOut:
    return get_batch(db, actor.tenant_id, batch_id)


@router.get("/sentiment/overview", response_model=SentimentOverview)
def sentiment_overview(
    db: DBSession,
    actor: CustomerReader,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    product_id: Annotated[uuid.UUID | None, Query()] = None,
    customer_id: Annotated[uuid.UUID | None, Query()] = None,
) -> SentimentOverview:
    """Sentiment across all stored reviews in a range, for reporting."""
    return overview(db, actor.tenant_id, date_from, date_to, product_id, customer_id)


__all__ = ["router"]
