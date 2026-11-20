"""Inventory demand estimate and reorder insight (FR-M5-05).

The audit recorded that Inventory had no AI-assisted demand forecasting or
reorder computation. This module fills that gap with **arithmetic over rows the
system already stores**, deliberately introducing no model of any kind.

What it is
----------
For one product, over a lookback window:

* **observed demand** -- quantity on non-cancelled sales-order lines dated in
  the window. Cancelled orders contribute nothing, because a cancelled sale
  never consumed stock and must not inflate a forecast.
* **average daily demand** -- that quantity spread over the window's calendar
  days. Every day counts, including days with no orders: dividing by *selling*
  days instead would report an average a busy period can never sustain.
* **projected demand** -- average daily demand over the lead time being planned
  for.
* **recommended reorder** -- projected demand plus a safety buffer, minus what
  is already available, and never below zero.

What it is **not**
------------------
* It is **advisory only**. It creates no purchase order, no purchase request
  and no stock movement, and it changes no inventory row. It reads and returns
  a number; a buyer acts on it in the purchasing module.
* It is **not a trained model**, and it contacts **no AI provider**. Groq may
  later explain a result, but every figure here is computed by plain Decimal
  arithmetic, so the same inputs always produce the same answer.
* It does not forecast a trend, seasonality or a price. A single average over a
  stated window is the honest summary of the history that exists.

Honesty rules
-------------
* Fewer than :data:`MIN_SELLING_DAYS` distinct days carry demand -> reported
  ``INSUFFICIENT_DATA`` with a reason and null recommendations, rather than an
  average computed from one or two orders.
* Expired batches are excluded from available stock, because expired goods are
  not cover anyone can reorder against.
"""

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.inventory import InventoryStock
from app.models.sales import Product, SalesOrder, SalesOrderItem, SalesOrderStatus

# ---------------------------------------------------------------- constants

#: Default evidence window, matching the maintenance-risk endpoint.
DEFAULT_LOOKBACK_DAYS = 30
MIN_LOOKBACK_DAYS = 7
MAX_LOOKBACK_DAYS = 365

#: Days of cover the recommendation aims to hold. Two weeks is a common
#: replenishment cycle; a stated planning assumption, not a derived figure, and
#: the response always echoes the lead time it used.
DEFAULT_LEAD_TIME_DAYS = 14

#: Extra cover beyond the lead time, as a fraction of projected demand. A plain
#: average has no notion of variability, so a modest proportional buffer stands
#: in for the forecast error it cannot measure.
SAFETY_FACTOR = Decimal("0.25")

#: Quantity scale matches inventory (14,3), rounded half-up.
QTY_STEP = Decimal("0.001")

#: Distinct days that must carry demand before a projection is meaningful. One
#: or two orders describe a single event, not a rate.
MIN_SELLING_DAYS = 3

ZERO = Decimal("0")

METHOD = "average_daily_demand"
IS_TRAINED_MODEL = False

DATA_SUFFICIENCY_SUFFICIENT = "SUFFICIENT"
DATA_SUFFICIENCY_LIMITED = "LIMITED"
DATA_SUFFICIENCY_INSUFFICIENT = "INSUFFICIENT"

STATUS_OK = "OK"
STATUS_REORDER = "REORDER_RECOMMENDED"
STATUS_INSUFFICIENT = "INSUFFICIENT_DATA"

DISCLAIMER = (
    "This is an advisory estimate, not a trained model and not a purchase order. "
    "average_demand is the observed sales quantity divided by the lookback "
    "window's calendar days; projected demand applies that rate over the lead "
    "time. No data is written and no order is created."
)


def qty(value: Decimal) -> Decimal:
    """Round to the stored scale using the project's half-up convention."""
    return Decimal(str(value or 0)).quantize(QTY_STEP, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class ReorderInsight:
    """One product's demand estimate and reorder recommendation."""

    product_id: uuid.UUID
    product_code: str
    product_name: str
    lookback_days: int
    lead_time_days: int
    as_of: date
    observed_demand: Decimal
    average_demand: Decimal | None
    selling_days: int
    available_quantity: Decimal
    projected_demand: Decimal | None
    safety_stock: Decimal | None
    recommended_reorder_quantity: Decimal | None
    status: str
    data_sufficiency: str
    confidence: str
    explanation: str
    #: Always false. Stated on every response so no caller mistakes this for an
    #: order, or for a system that acts on its own.
    purchase_order_created: bool = False


def _insufficient(
    product: Product, lookback_days: int, lead_time_days: int, as_of: date, reason: str
) -> ReorderInsight:
    """Build the honest "cannot judge this" response.

    Every derived figure is None rather than zero: zero would read as "demand is
    zero, order nothing", which is a different and wrong claim.
    """
    return ReorderInsight(
        product_id=product.id,
        product_code=product.product_code,
        product_name=product.name,
        lookback_days=lookback_days,
        lead_time_days=lead_time_days,
        as_of=as_of,
        observed_demand=ZERO,
        average_demand=None,
        selling_days=0,
        available_quantity=ZERO,
        projected_demand=None,
        safety_stock=None,
        recommended_reorder_quantity=None,
        status=STATUS_INSUFFICIENT,
        data_sufficiency=DATA_SUFFICIENCY_INSUFFICIENT,
        confidence="none",
        explanation=reason,
    )


def _available_stock(
    db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID, as_of: date
) -> Decimal:
    """Unreserved, unexpired stock for one product, across all warehouses."""
    total = db.scalar(
        select(func.coalesce(func.sum(InventoryStock.available_quantity), 0)).where(
            InventoryStock.tenant_id == tenant_id,
            InventoryStock.product_id == product_id,
            InventoryStock.available_quantity > ZERO,
            # Expired goods cannot satisfy demand, so they are never counted as
            # cover against the recommendation.
            or_(
                InventoryStock.expiry_date.is_(None),
                InventoryStock.expiry_date >= as_of,
            ),
        )
    )
    return qty(Decimal(str(total or 0)))


def reorder_insight(
    db: Session,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    lead_time_days: int = DEFAULT_LEAD_TIME_DAYS,
    as_of: date | None = None,
) -> ReorderInsight:
    """Estimate demand for one product and recommend a reorder quantity.

    ``tenant_id`` comes from the verified access token, never the request, and
    the product lookup is the Inventory service's tenant-scoped one, so a product
    belonging to another company raises :class:`NotFoundException` and its
    existence stays hidden.

    ``lookback_days`` and ``lead_time_days`` are re-clamped here as well as at
    the endpoint, so calling the service directly can never exceed the bound.

    Strictly read-only: no stock, order or product row is written, and no AI
    provider is contacted.
    """
    # Imported here rather than at module scope: importing the Inventory service
    # at load time would pull Inventory into every AI request, including ones that
    # never touch stock. This matches the lazy-import convention the other AI
    # services already follow.
    from app.modules.inventory.service import get_product

    today = as_of or date.today()
    days = max(MIN_LOOKBACK_DAYS, min(int(lookback_days), MAX_LOOKBACK_DAYS))
    lead = max(1, min(int(lead_time_days), MAX_LOOKBACK_DAYS))

    # Reuse the existing tenant-scoped lookup rather than duplicating the
    # isolation rule here.
    product = get_product(db, tenant_id, product_id)

    window_start = today - timedelta(days=days - 1)

    rows = db.execute(
        select(SalesOrderItem.quantity, SalesOrder.order_date)
        .join(SalesOrder, SalesOrder.id == SalesOrderItem.sales_order_id)
        .where(
            # SalesOrderItem carries no tenant_id of its own; it inherits the
            # tenant through its order, which is what is scoped here.
            SalesOrder.tenant_id == tenant_id,
            SalesOrderItem.product_id == product_id,
            SalesOrder.status != SalesOrderStatus.CANCELLED.value,
            SalesOrder.deleted_at.is_(None),
            SalesOrder.order_date >= window_start,
            SalesOrder.order_date <= today,
        )
    ).all()

    if not rows:
        return _insufficient(
            product,
            days,
            lead,
            today,
            (
                f"No sales history for this product in the last {days} day(s), "
                "so no demand rate can be estimated."
            ),
        )

    observed = qty(sum((Decimal(str(quantity or 0)) for quantity, _ in rows), ZERO))
    selling_days = len({order_date for _, order_date in rows})

    if selling_days < MIN_SELLING_DAYS:
        return ReorderInsight(
            product_id=product.id,
            product_code=product.product_code,
            product_name=product.name,
            lookback_days=days,
            lead_time_days=lead,
            as_of=today,
            observed_demand=observed,
            average_demand=None,
            selling_days=selling_days,
            available_quantity=ZERO,
            projected_demand=None,
            safety_stock=None,
            recommended_reorder_quantity=None,
            status=STATUS_INSUFFICIENT,
            data_sufficiency=DATA_SUFFICIENCY_INSUFFICIENT,
            confidence="none",
            explanation=(
                f"Only {selling_days} day(s) of demand in the last {days} day(s), "
                f"below the {MIN_SELLING_DAYS} needed to estimate a rate. One or "
                "two orders describe an event, not a demand trend."
            ),
        )

    # Average over *calendar* days, not selling days: the quiet days are part of
    # the rate, and averaging them away would report a figure the product has
    # never sustained.
    average = qty(observed / Decimal(days))
    projected = qty(average * Decimal(lead))
    safety = qty(projected * SAFETY_FACTOR)
    on_hand = _available_stock(db, tenant_id, product_id, today)

    target = projected + safety
    recommended = qty(target - on_hand) if target > on_hand else ZERO

    if selling_days >= days // 2:
        sufficiency = DATA_SUFFICIENCY_SUFFICIENT
        confidence = "medium"
    else:
        sufficiency = DATA_SUFFICIENCY_LIMITED
        confidence = "low"

    if recommended > ZERO:
        status = STATUS_REORDER
        summary = (
            f"Available stock ({on_hand}) is below the {target} needed to cover "
            f"{lead} day(s) of demand plus a safety buffer, so a reorder of "
            f"{recommended} is indicated."
        )
    else:
        status = STATUS_OK
        summary = (
            f"Available stock ({on_hand}) already covers the {target} needed for "
            f"{lead} day(s) of demand plus a safety buffer, so no reorder is "
            "indicated."
        )

    explanation = (
        f"{observed} was sold across {selling_days} of the last {days} day(s), an "
        f"average of {average} per day. At that rate {lead} day(s) of demand is "
        f"{projected}, plus a safety buffer of {safety}. {summary}"
    )

    return ReorderInsight(
        product_id=product.id,
        product_code=product.product_code,
        product_name=product.name,
        lookback_days=days,
        lead_time_days=lead,
        as_of=today,
        observed_demand=observed,
        average_demand=average,
        selling_days=selling_days,
        available_quantity=on_hand,
        projected_demand=projected,
        safety_stock=safety,
        recommended_reorder_quantity=recommended,
        status=status,
        data_sufficiency=sufficiency,
        confidence=confidence,
        explanation=explanation,
    )


# ------------------------------------------------- static-rule fallback (P1-15)

#: Why a reorder suggestion fell back to the static min/max rule (§4.5 EH-2).
FALLBACK_INSUFFICIENT_DATA = "insufficient_demand_history"
FALLBACK_AI_UNAVAILABLE = "ai_unavailable"


def recommendation_available(insight: ReorderInsight) -> bool:
    """Whether the insight carries a recommendation a buyer can act on.

    ``INSUFFICIENT_DATA`` carries none by construction (its figures are None),
    and that is exactly when ``/ai/reorder-suggestions`` must fall back to the
    static rule configured per SKU instead of presenting an empty answer.
    """
    return (
        insight.status in (STATUS_OK, STATUS_REORDER)
        and insight.recommended_reorder_quantity is not None
        and insight.projected_demand is not None
        and insight.safety_stock is not None
    )


def reorder_point(insight: ReorderInsight) -> Decimal | None:
    """Demand-based reorder point: lead-time demand plus the safety buffer.

    The same ``target`` :func:`reorder_insight` compares available stock with;
    None when the insight has no recommendation.
    """
    if not recommendation_available(insight):
        return None
    return qty(insight.projected_demand + insight.safety_stock)


__all__ = [
    "FALLBACK_AI_UNAVAILABLE",
    "FALLBACK_INSUFFICIENT_DATA",
    "recommendation_available",
    "reorder_point",
    "DEFAULT_LEAD_TIME_DAYS",
    "DEFAULT_LOOKBACK_DAYS",
    "MAX_LOOKBACK_DAYS",
    "MIN_LOOKBACK_DAYS",
    "MIN_SELLING_DAYS",
    "DATA_SUFFICIENCY_INSUFFICIENT",
    "DATA_SUFFICIENCY_LIMITED",
    "DATA_SUFFICIENCY_SUFFICIENT",
    "DISCLAIMER",
    "IS_TRAINED_MODEL",
    "METHOD",
    "STATUS_INSUFFICIENT",
    "STATUS_OK",
    "STATUS_REORDER",
    "ReorderInsight",
    "reorder_insight",
]