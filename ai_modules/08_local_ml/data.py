"""Tenant- and scope-filtered sales data for the ML services.

A "sale" here is exactly what the dashboard and the deterministic forecast
count: a non-deleted sales order that is not CANCELLED, dated by
``order_date``. Using the same definition means an ML figure and the dashboard
panel beside it describe the same rows.

Every function takes a :class:`RecordScope` (never a bare tenant id), so an
OWN/TEAM-scoped sales rep only ever analyses their own book (SRS §6.3-3).
Aggregation is done in SQL wherever the result is a plain sum; per-line rows are
read only for analyses that genuinely need them (baskets, RFM).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.crm import Customer
from app.models.sales import Product, SalesOrder, SalesOrderItem, SalesOrderStatus
from app.modules.auth.scope import RecordScope, as_record_scope

if TYPE_CHECKING:
    import numpy as np

ORDER_PERMISSION = "sales.order.view"


def _order_filters(scope: RecordScope, date_from: date, date_to: date) -> list:
    return [
        SalesOrder.tenant_id == scope.tenant_id,
        SalesOrder.deleted_at.is_(None),
        SalesOrder.status != SalesOrderStatus.CANCELLED.value,
        SalesOrder.order_date >= date_from,
        SalesOrder.order_date <= date_to,
        *scope.conditions(ORDER_PERMISSION),
    ]


@dataclass(frozen=True)
class OrderLine:
    order_id: uuid.UUID
    order_date: date
    customer_id: uuid.UUID
    product_id: uuid.UUID
    quantity: float
    revenue: float


def order_lines(
    db: Session, scope: RecordScope, date_from: date, date_to: date
) -> list[OrderLine]:
    """Every sold line in the window, inside the caller's scope.

    ``revenue`` is the line total (after discount, incl. tax), the same basis
    as ``sales_orders.total_amount``. Floats are fine here: these values feed
    statistical models, and money returned to a client is re-quantised.
    """
    scope = as_record_scope(scope)
    stmt = (
        select(
            SalesOrder.id,
            SalesOrder.order_date,
            SalesOrder.customer_id,
            SalesOrderItem.product_id,
            SalesOrderItem.quantity,
            SalesOrderItem.line_total,
        )
        .join(SalesOrderItem, SalesOrderItem.sales_order_id == SalesOrder.id)
        .where(SalesOrderItem.tenant_id == scope.tenant_id, *_order_filters(scope, date_from, date_to))
    )
    return [
        OrderLine(row[0], row[1], row[2], row[3], float(row[4] or 0), float(row[5] or 0))
        for row in db.execute(stmt)
    ]


@dataclass(frozen=True)
class DailySeries:
    """A continuous daily series: one value per calendar day, zeros where silent."""

    start: date
    values: np.ndarray
    #: Days on which at least one order (or the product) was actually sold.
    active_days: int

    @property
    def end(self) -> date:
        return self.start + timedelta(days=len(self.values) - 1)

    def dates(self) -> list[date]:
        return [self.start + timedelta(days=i) for i in range(len(self.values))]


def _continuous(rows: list[tuple[date, float]], date_to: date) -> DailySeries | None:
    """Fill missing calendar days with zero, starting at the first sale.

    A day with no orders genuinely sold nothing, so zero is the observation, not
    an imputation. Leading days before the first sale are dropped so a new
    tenant's empty past does not drag a model towards zero.
    """
    import numpy as np

    active = [(day, value) for day, value in rows if value > 0]
    if not active:
        return None
    start = min(day for day, _ in active)
    values = np.zeros((date_to - start).days + 1, dtype=float)
    for day, value in rows:
        if day >= start:
            values[(day - start).days] += value
    return DailySeries(start=start, values=values, active_days=len({d for d, _ in active}))


def daily_revenue(
    db: Session, scope: RecordScope, date_from: date, date_to: date
) -> DailySeries | None:
    """Daily net revenue (sum of ``total_amount``), grouped in SQL."""
    scope = as_record_scope(scope)
    stmt = (
        select(SalesOrder.order_date, func.sum(SalesOrder.total_amount))
        .where(*_order_filters(scope, date_from, date_to))
        .group_by(SalesOrder.order_date)
    )
    return _continuous([(row[0], float(row[1] or 0)) for row in db.execute(stmt)], date_to)


def daily_orders(
    db: Session, scope: RecordScope, date_from: date, date_to: date
) -> dict[date, int]:
    """Order count per day (only days with orders)."""
    scope = as_record_scope(scope)
    stmt = (
        select(SalesOrder.order_date, func.count(SalesOrder.id))
        .where(*_order_filters(scope, date_from, date_to))
        .group_by(SalesOrder.order_date)
    )
    return {row[0]: int(row[1]) for row in db.execute(stmt)}


def daily_product_quantity(
    db: Session, scope: RecordScope, product_id: uuid.UUID, date_from: date, date_to: date
) -> DailySeries | None:
    """Daily units sold of one product, grouped in SQL."""
    scope = as_record_scope(scope)
    stmt = (
        select(SalesOrder.order_date, func.sum(SalesOrderItem.quantity))
        .join(SalesOrderItem, SalesOrderItem.sales_order_id == SalesOrder.id)
        .where(
            SalesOrderItem.tenant_id == scope.tenant_id,
            SalesOrderItem.product_id == product_id,
            *_order_filters(scope, date_from, date_to),
        )
        .group_by(SalesOrder.order_date)
    )
    return _continuous([(row[0], float(row[1] or 0)) for row in db.execute(stmt)], date_to)


def top_products_by_quantity(
    db: Session, scope: RecordScope, date_from: date, date_to: date, limit: int
) -> list[uuid.UUID]:
    scope = as_record_scope(scope)
    stmt = (
        select(SalesOrderItem.product_id)
        .join(SalesOrder, SalesOrderItem.sales_order_id == SalesOrder.id)
        .where(SalesOrderItem.tenant_id == scope.tenant_id, *_order_filters(scope, date_from, date_to))
        .group_by(SalesOrderItem.product_id)
        .order_by(func.sum(SalesOrderItem.quantity).desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def product_names(db: Session, tenant_id: uuid.UUID, ids) -> dict[uuid.UUID, tuple[str, str]]:
    """``{id: (product_code, name)}`` for ids of this tenant only."""
    ids = list(ids)
    if not ids:
        return {}
    rows = db.execute(
        select(Product.id, Product.product_code, Product.name).where(
            Product.tenant_id == tenant_id, Product.id.in_(ids)
        )
    )
    return {row[0]: (row[1], row[2]) for row in rows}


def active_catalogue(db: Session, tenant_id: uuid.UUID) -> dict[uuid.UUID, tuple[str, str]]:
    """Live, active products -- the candidates for "slow-moving"."""
    rows = db.execute(
        select(Product.id, Product.product_code, Product.name).where(
            Product.tenant_id == tenant_id,
            Product.deleted_at.is_(None),
            Product.is_active.is_(True),
        )
    )
    return {row[0]: (row[1], row[2]) for row in rows}


def customer_names(db: Session, tenant_id: uuid.UUID, ids) -> dict[uuid.UUID, str]:
    ids = list(ids)
    if not ids:
        return {}
    rows = db.execute(
        select(
            Customer.id, Customer.company_name, Customer.first_name, Customer.last_name
        ).where(Customer.tenant_id == tenant_id, Customer.id.in_(ids))
    )
    return {
        row[0]: row[1] or " ".join(part for part in (row[2], row[3]) if part)
        for row in rows
    }


def existing_ids(db: Session, model, tenant_id: uuid.UUID, ids) -> set[uuid.UUID]:
    """The subset of ``ids`` that are live rows of ``model`` in this tenant."""
    ids = {i for i in ids if i is not None}
    if not ids:
        return set()
    return set(
        db.scalars(
            select(model.id).where(
                model.tenant_id == tenant_id, model.id.in_(ids), model.deleted_at.is_(None)
            )
        )
    )
