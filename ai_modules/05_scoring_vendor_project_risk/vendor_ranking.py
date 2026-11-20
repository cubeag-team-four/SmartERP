"""Vendor ranking with the static-price fallback (P2-15, FR-M4-03, TC-006).

Primary ranking (the rule engine; see :mod:`app.modules.ai.scoring` for A-1)
---------------------------------------------------------------------------
Per active vendor, over the last :data:`LOOKBACK_DAYS` days:

* **On-time delivery** -- received GRNs whose purchase order carries an expected
  date; a receipt is on time when ``receipt_date <= expected_date``.
* **Price** -- with a ``product_id``: the vendor's last unit price for it,
  scored ``100 * cheapest / own``. Without one: the variance between billed
  and ordered unit prices on posted vendor-bill GOODS lines, scored
  ``100 - 5 x |variance %|`` (floored at 0), so a vendor that bills what it
  quoted scores 100.
* **Quality** -- the SRS asks for a rejection rate, but inspections in this
  system are recorded against work orders, not receipts, so no vendor quality
  figure exists yet. It is reported as ``null`` and carries no weight.

``score = 0.6 x on-time + 0.4 x price`` (0..100), re-weighted over the
components a vendor actually has evidence for. Vendors with no evidence at all
rank after scored ones, in static order.

Fallback ([§4.4 EH-2], TC-006)
------------------------------
When the scoring engine is unavailable, or no vendor has any delivery or price
evidence, the answer is the **static ranking by last transacted price**
(cheapest last price first; without a product, the most recent order first,
since prices of different goods do not compare). ``fallback`` is true, the
request never fails, and ``confidence`` is ``none``.
"""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.money import money, percent
from app.modules.ai.errors import AIError
from app.modules.ai.scoring import (
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    CONFIDENCE_NONE,
    ENGINE_RULES,
    FALLBACK_ENGINE_UNAVAILABLE,
    FALLBACK_INSUFFICIENT_DATA,
    primary_engine,
)

LOOKBACK_DAYS = 365
WEIGHT_ON_TIME = Decimal("0.6")
WEIGHT_PRICE = Decimal("0.4")
#: Price score points lost per 1% of billed-vs-ordered unit price variance.
VARIANCE_PENALTY_PER_PERCENT = Decimal("5")
DEFAULT_LIMIT = 3
MAX_LIMIT = 100
METHOD_WEIGHTED = "weighted_on_time_and_price"
METHOD_STATIC = "static_last_transacted_price"

HUNDRED = Decimal("100")
ZERO = Decimal("0")

#: Purchase orders that represent a real transaction with the vendor.
TRANSACTED_PO_STATUSES = (
    "APPROVED", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED",
)


@dataclass
class VendorMetrics:
    vendor_id: uuid.UUID
    vendor_code: str
    name: str
    deliveries: int = 0
    on_time_deliveries: int = 0
    #: Billed-vs-ordered unit price variance in percent (None: no billed lines).
    price_variance_percent: Decimal | None = None
    #: Last unit price for the requested product (product-specific ranking only).
    last_unit_price: Decimal | None = None
    last_order_date: date | None = None
    quality_rejection_rate: Decimal | None = None


@dataclass
class RankedVendor:
    rank: int
    vendor_id: uuid.UUID
    vendor_code: str
    name: str
    score: Decimal | None
    on_time_rate: Decimal | None
    deliveries: int
    price_score: Decimal | None
    price_variance_percent: Decimal | None
    last_unit_price: Decimal | None
    last_order_date: date | None
    quality_rejection_rate: Decimal | None


@dataclass
class VendorRanking:
    fallback: bool
    fallback_reason: str | None
    confidence: str
    method: str
    engine: str
    product_id: uuid.UUID | None
    lookback_days: int
    items: list[RankedVendor] = field(default_factory=list)


def _on_time_rate(m: VendorMetrics) -> Decimal | None:
    if m.deliveries <= 0:
        return None
    return percent(Decimal(m.on_time_deliveries) * HUNDRED / Decimal(m.deliveries))


def _price_score(m: VendorMetrics, cheapest: Decimal | None) -> Decimal | None:
    if m.last_unit_price is not None and cheapest is not None and m.last_unit_price > ZERO:
        return percent(cheapest * HUNDRED / m.last_unit_price)
    if m.last_unit_price is None and m.price_variance_percent is not None:
        return percent(max(ZERO, HUNDRED - abs(m.price_variance_percent) * VARIANCE_PENALTY_PER_PERCENT))
    return None


def _static_key(m: VendorMetrics, by_product: bool):
    if by_product:
        return (m.last_unit_price is None, m.last_unit_price or ZERO, m.name.lower())
    # Most recent order first; never ordered last.
    return (m.last_order_date is None, -(m.last_order_date.toordinal()) if m.last_order_date else 0,
            m.name.lower())


def _row(rank: int, m: VendorMetrics, score, price_score) -> RankedVendor:
    return RankedVendor(
        rank=rank,
        vendor_id=m.vendor_id,
        vendor_code=m.vendor_code,
        name=m.name,
        score=score,
        on_time_rate=_on_time_rate(m),
        deliveries=m.deliveries,
        price_score=price_score,
        price_variance_percent=m.price_variance_percent,
        last_unit_price=m.last_unit_price,
        last_order_date=m.last_order_date,
        quality_rejection_rate=m.quality_rejection_rate,
    )


def static_ranking(
    metrics: Sequence[VendorMetrics], *, product_id: uuid.UUID | None, reason: str,
    limit: int = DEFAULT_LIMIT,
) -> VendorRanking:
    """[§4.4 EH-2] static ranking by last transacted price. Never raises."""
    ordered = sorted(metrics, key=lambda m: _static_key(m, product_id is not None))
    return VendorRanking(
        fallback=True,
        fallback_reason=reason,
        confidence=CONFIDENCE_NONE,
        method=METHOD_STATIC,
        engine=ENGINE_RULES,
        product_id=product_id,
        lookback_days=LOOKBACK_DAYS,
        items=[_row(i + 1, m, None, None) for i, m in enumerate(ordered[:limit])],
    )


def rank_vendor_metrics(
    metrics: Sequence[VendorMetrics], *, product_id: uuid.UUID | None = None,
    limit: int = DEFAULT_LIMIT,
) -> VendorRanking:
    """Rank vendors from their metrics; degrade to :func:`static_ranking`.

    Pure (no database), so the ranking rules are unit-testable on their own.
    """
    limit = max(1, min(int(limit), MAX_LIMIT))
    try:
        engine = primary_engine()
    except AIError:
        return static_ranking(metrics, product_id=product_id,
                              reason=FALLBACK_ENGINE_UNAVAILABLE, limit=limit)

    prices = [m.last_unit_price for m in metrics if m.last_unit_price and m.last_unit_price > ZERO]
    cheapest = min(prices) if prices else None

    scored: list[tuple[Decimal, VendorMetrics, Decimal | None]] = []
    unscored: list[VendorMetrics] = []
    for m in metrics:
        on_time = _on_time_rate(m)
        price = _price_score(m, cheapest)
        parts = [(on_time, WEIGHT_ON_TIME), (price, WEIGHT_PRICE)]
        weight = sum((w for value, w in parts if value is not None), ZERO)
        if weight == ZERO:
            unscored.append(m)
            continue
        total = sum((value * w for value, w in parts if value is not None), ZERO)
        scored.append((percent(total / weight), m, price))

    if not scored:
        return static_ranking(metrics, product_id=product_id,
                              reason=FALLBACK_INSUFFICIENT_DATA, limit=limit)

    scored.sort(key=lambda item: (-item[0], item[1].name.lower()))
    unscored.sort(key=lambda m: _static_key(m, product_id is not None))
    items = [_row(i + 1, m, score, price) for i, (score, m, price) in enumerate(scored)]
    items += [_row(len(items) + i + 1, m, None, None) for i, m in enumerate(unscored)]

    deliveries = sum(m.deliveries for _, m, _ in scored)
    if deliveries >= 10 and len(scored) >= 2:
        confidence = CONFIDENCE_HIGH
    elif deliveries >= 3:
        confidence = CONFIDENCE_MEDIUM
    else:
        confidence = CONFIDENCE_LOW
    return VendorRanking(
        fallback=False,
        fallback_reason=None,
        confidence=confidence,
        method=METHOD_WEIGHTED,
        engine=engine,
        product_id=product_id,
        lookback_days=LOOKBACK_DAYS,
        items=items[:limit],
    )


# ------------------------------------------------------------ data gathering


def vendor_metrics(
    db: Session, tenant_id: uuid.UUID, *, product_id: uuid.UUID | None = None,
    as_of: date | None = None,
) -> list[VendorMetrics]:
    """Collect the per-vendor evidence for one tenant (read only)."""
    from app.models.payables import POSTED_BILL_STATUSES, VendorBill, VendorBillLine
    from app.models.purchase import (
        GoodsReceiptNote,
        PurchaseOrder,
        PurchaseOrderItem,
        Vendor,
    )

    today = as_of or date.today()
    since = today - timedelta(days=LOOKBACK_DAYS)

    vendor_stmt = select(Vendor).where(
        Vendor.tenant_id == tenant_id, Vendor.deleted_at.is_(None), Vendor.status == "ACTIVE"
    )
    if product_id is not None:
        # Only vendors that have actually been ordered this product from.
        vendor_stmt = vendor_stmt.where(
            Vendor.id.in_(
                select(PurchaseOrder.vendor_id)
                .join(PurchaseOrderItem, PurchaseOrderItem.purchase_order_id == PurchaseOrder.id)
                .where(
                    PurchaseOrder.tenant_id == tenant_id,
                    PurchaseOrder.deleted_at.is_(None),
                    PurchaseOrderItem.product_id == product_id,
                )
            )
        )
    metrics = {
        v.id: VendorMetrics(vendor_id=v.id, vendor_code=v.vendor_code, name=v.name)
        for v in db.scalars(vendor_stmt).all()
    }
    if not metrics:
        return []
    vendor_ids = list(metrics)

    # On-time deliveries: received GRNs against orders with an expected date.
    for vendor_id, receipt_date, expected in db.execute(
        select(PurchaseOrder.vendor_id, GoodsReceiptNote.receipt_date, PurchaseOrder.expected_date)
        .join(PurchaseOrder, PurchaseOrder.id == GoodsReceiptNote.purchase_order_id)
        .where(
            GoodsReceiptNote.tenant_id == tenant_id,
            GoodsReceiptNote.deleted_at.is_(None),
            GoodsReceiptNote.status == "RECEIVED",
            GoodsReceiptNote.receipt_date >= since,
            PurchaseOrder.expected_date.is_not(None),
            PurchaseOrder.vendor_id.in_(vendor_ids),
        )
    ).all():
        m = metrics[vendor_id]
        m.deliveries += 1
        if receipt_date <= expected:
            m.on_time_deliveries += 1

    # Billed vs ordered unit price on posted GOODS bill lines.
    variance_rows = db.execute(
        select(
            VendorBill.vendor_id,
            func.sum((VendorBillLine.unit_price - PurchaseOrderItem.unit_price) * VendorBillLine.quantity),
            func.sum(PurchaseOrderItem.unit_price * VendorBillLine.quantity),
        )
        .join(VendorBill, VendorBill.id == VendorBillLine.vendor_bill_id)
        .join(PurchaseOrderItem, PurchaseOrderItem.id == VendorBillLine.purchase_order_item_id)
        .where(
            VendorBill.tenant_id == tenant_id,
            VendorBill.deleted_at.is_(None),
            VendorBill.status.in_(POSTED_BILL_STATUSES),
            VendorBill.bill_date >= since,
            VendorBill.vendor_id.in_(vendor_ids),
        )
        .group_by(VendorBill.vendor_id)
    ).all()
    for vendor_id, diff, base in variance_rows:
        if base and Decimal(str(base)) > ZERO:
            metrics[vendor_id].price_variance_percent = percent(
                Decimal(str(diff or 0)) * HUNDRED / Decimal(str(base))
            )

    # Last transaction (and last unit price for the product).
    tx_stmt = (
        select(PurchaseOrder.vendor_id, PurchaseOrder.order_date, PurchaseOrderItem.unit_price)
        .join(PurchaseOrderItem, PurchaseOrderItem.purchase_order_id == PurchaseOrder.id)
        .where(
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.deleted_at.is_(None),
            PurchaseOrder.status.in_(TRANSACTED_PO_STATUSES),
            PurchaseOrder.vendor_id.in_(vendor_ids),
        )
        .order_by(PurchaseOrder.order_date.desc(), PurchaseOrder.created_at.desc())
    )
    if product_id is not None:
        tx_stmt = tx_stmt.where(PurchaseOrderItem.product_id == product_id)
    for vendor_id, order_date, unit_price in db.execute(tx_stmt).all():
        m = metrics[vendor_id]
        if m.last_order_date is None:
            m.last_order_date = order_date
            if product_id is not None:
                m.last_unit_price = money(unit_price)
    return list(metrics.values())


def vendor_ranking(
    db: Session, tenant_id: uuid.UUID, *, product_id: uuid.UUID | None = None,
    limit: int = DEFAULT_LIMIT,
) -> VendorRanking:
    """Rank this tenant's vendors (read only); see :func:`rank_vendor_metrics`."""
    metrics = vendor_metrics(db, tenant_id, product_id=product_id)
    return rank_vendor_metrics(metrics, product_id=product_id, limit=limit)


__all__ = [
    "DEFAULT_LIMIT",
    "MAX_LIMIT",
    "RankedVendor",
    "VendorMetrics",
    "VendorRanking",
    "rank_vendor_metrics",
    "static_ranking",
    "vendor_metrics",
    "vendor_ranking",
]
