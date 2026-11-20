"""Deterministic workflow automation over real ERP data.

Three fixed workflows, each a plain predicate over existing tables:

1. **low_stock** — a stock balance below the reorder level set for it.
2. **overdue_receivable** — an unpaid invoice past its due date.
3. **large_transaction** — a sales or purchase document above a threshold.

What this module deliberately does **not** do:

* It never writes to sales, purchase, inventory or finance. It is a reader. No
  status is changed, no order is approved, rejected or cancelled.
* It never calls a language model. Every trigger is arithmetic or a comparison,
  so the same data always produces the same events and every message can name
  the exact figures behind it.

Trigger definitions are reused from the existing code wherever one exists — the
low-stock predicate is lifted verbatim from the dashboard, and the receivable
status set is imported from :data:`RECEIVABLE_STATUSES`. A workflow alert and the
dashboard panel beside it therefore always agree.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.finance import Invoice
from app.models.inventory import InventoryStock
from app.models.purchase import PurchaseOrder, PurchaseOrderStatus
from app.models.sales import SalesOrder, SalesOrderStatus
from app.models.workflow import AutomationEvent, EventStatus, Severity
from app.modules.dashboard.service import RECEIVABLE_STATUSES
from app.schemas.workflow import WorkflowRuleInfo

# ---------------------------------------------------------------- constants

WORKFLOW_LOW_STOCK = "low_stock"
WORKFLOW_OVERDUE_RECEIVABLE = "overdue_receivable"
WORKFLOW_LARGE_TRANSACTION = "large_transaction"

ENTITY_INVENTORY_STOCK = "inventory_stock"
ENTITY_INVOICE = "invoice"
ENTITY_SALES_ORDER = "sales_order"
ENTITY_PURCHASE_ORDER = "purchase_order"

#: MVP threshold for a transaction that needs a human look. A single module
#: constant is enough here; making it configurable per tenant is a later concern.
LARGE_TRANSACTION_THRESHOLD = Decimal("50000.00")

#: How far back the "recent documents" rule looks. A workflow that scans
#: unlimited history would be both slow and prone to re-raising ancient alerts.
LARGE_TRANSACTION_WINDOW_DAYS = 30
#: Overdue receivables are a live condition, not a period measure, so the scan
#: is capped by row count rather than by date.
MAX_RECEIVABLES = 500

#: Statuses that represent real committed money movement. DRAFT and CANCELLED
#: documents are excluded: neither is a transaction worth reviewing.
REVIEWABLE_SALES_STATUSES = (
    SalesOrderStatus.CONFIRMED.value,
    SalesOrderStatus.PARTIALLY_DELIVERED.value,
    SalesOrderStatus.DELIVERED.value,
    SalesOrderStatus.COMPLETED.value,
)
REVIEWABLE_PURCHASE_STATUSES = (
    PurchaseOrderStatus.CONFIRMED.value,
    PurchaseOrderStatus.RECEIVED.value,
)

ZERO = Decimal("0")

@dataclass
class WorkflowFinding:
    """One condition detected on one entity."""

    workflow_code: str
    entity_type: str
    entity_id: uuid.UUID
    severity: str
    message: str


@dataclass
class RunResult:
    """Outcome of one run: what was examined and what was raised."""

    low_stock_examined: int = 0
    receivables_examined: int = 0
    documents_examined: int = 0
    events_created: int = 0
    events_skipped_existing: int = 0
    created: list[AutomationEvent] = field(default_factory=list)

    @property
    def examined(self) -> int:
        return (
            self.low_stock_examined
            + self.receivables_examined
            + self.documents_examined
        )


def _fmt(value: Decimal) -> str:
    return f"{value:.2f}"


def _fmt_qty(value: Decimal) -> str:
    return f"{value:.3f}"


# ---------------------------------------------------- workflow 1: low stock


def _low_stock_findings(db: Session, tenant_id: uuid.UUID) -> list[WorkflowFinding]:
    """WORKFLOW 1 — a balance sitting below its own reorder level.

    The predicate is lifted from the dashboard's low-stock aggregation so the two
    can never disagree about which products are low. Aggregated per product
    because the same product may be stocked in several warehouses and must raise
    one event, not one per row.
    """
    rows = db.execute(
        select(
            InventoryStock.product_id.label("product_id"),
            func.sum(InventoryStock.available_quantity).label("available"),
            func.min(InventoryStock.reorder_level).label("reorder_level"),
        )
        .where(
            InventoryStock.tenant_id == tenant_id,
            InventoryStock.reorder_level.isnot(None),
            InventoryStock.available_quantity < InventoryStock.reorder_level,
        )
        .group_by(InventoryStock.product_id)
        .order_by(func.sum(InventoryStock.available_quantity).asc())
        .limit(MAX_RECEIVABLES)
    ).all()

    findings: list[WorkflowFinding] = []
    for product_id, available, reorder_level in rows:
        available_qty = Decimal(available or 0)
        reorder_qty = Decimal(reorder_level or 0)
        findings.append(
            WorkflowFinding(
                workflow_code=WORKFLOW_LOW_STOCK,
                entity_type=ENTITY_INVENTORY_STOCK,
                # Keyed on the product: one condition, one event, regardless of
                # how many warehouses it is stocked across.
                entity_id=product_id,
                severity=Severity.WARNING.value,
                message=(
                    f"Low stock requires attention: available quantity "
                    f"{_fmt_qty(available_qty)} is below the reorder level "
                    f"{_fmt_qty(reorder_qty)}."
                ),
            )
        )
    return findings


# ------------------------------------------ workflow 2: overdue receivable


def _overdue_receivable_findings(
    db: Session, tenant_id: uuid.UUID, today: date
) -> list[WorkflowFinding]:
    """WORKFLOW 2 — money still owed, past the invoice's due date.

    ``RECEIVABLE_STATUSES`` is the dashboard's own definition of "money is still
    owed", and ``amount_due`` is the server-calculated balance, so this never
    disagrees with the finance panel. Invoices with no due date are skipped:
    there is nothing to be late against.
    """
    rows = db.execute(
        select(Invoice.id, Invoice.invoice_number, Invoice.due_date, Invoice.amount_due)
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.deleted_at.is_(None),
            Invoice.status.in_(RECEIVABLE_STATUSES),
            Invoice.due_date.isnot(None),
            Invoice.due_date < today,
            Invoice.amount_due > ZERO,
        )
        .order_by(Invoice.due_date.asc())
        .limit(MAX_RECEIVABLES)
    ).all()

    findings: list[WorkflowFinding] = []
    for invoice_id, number, due_date, amount_due in rows:
        overdue_by = (today - due_date).days
        due_qty = Decimal(amount_due or 0)
        findings.append(
            WorkflowFinding(
                workflow_code=WORKFLOW_OVERDUE_RECEIVABLE,
                entity_type=ENTITY_INVOICE,
                entity_id=invoice_id,
                severity=Severity.CRITICAL.value,
                message=(
                    f"Overdue receivable requires attention: invoice {number} has "
                    f"{_fmt(due_qty)} outstanding and was due on {due_date.isoformat()} "
                    f"({overdue_by} day(s) overdue)."
                ),
            )
        )
    return findings


# ------------------------------------- workflow 3: large transaction review


def _large_transaction_findings(
    db: Session, tenant_id: uuid.UUID, today: date
) -> list[WorkflowFinding]:
    """WORKFLOW 3 — a recent sales or purchase document above the threshold.

    The event asks for a review. It never approves, rejects or blocks anything.
    """
    since = today - timedelta(days=LARGE_TRANSACTION_WINDOW_DAYS)
    findings: list[WorkflowFinding] = []

    sales_rows = db.execute(
        select(
            SalesOrder.id,
            SalesOrder.order_number,
            SalesOrder.order_date,
            SalesOrder.total_amount,
        )
        .where(
            SalesOrder.tenant_id == tenant_id,
            SalesOrder.deleted_at.is_(None),
            SalesOrder.status.in_(REVIEWABLE_SALES_STATUSES),
            SalesOrder.order_date >= since,
            SalesOrder.total_amount > LARGE_TRANSACTION_THRESHOLD,
        )
        .order_by(SalesOrder.order_date.desc())
        .limit(MAX_RECEIVABLES)
    ).all()

    for order_id, number, order_date, total in sales_rows:
        amount = Decimal(total or 0)
        findings.append(
            WorkflowFinding(
                workflow_code=WORKFLOW_LARGE_TRANSACTION,
                entity_type=ENTITY_SALES_ORDER,
                entity_id=order_id,
                severity=Severity.WARNING.value,
                message=(
                    f"Large transaction requires review: sales order {number} dated "
                    f"{order_date.isoformat()} is {_fmt(amount)}, above the "
                    f"{_fmt(LARGE_TRANSACTION_THRESHOLD)} review threshold."
                ),
            )
        )

    purchase_rows = db.execute(
        select(
            PurchaseOrder.id,
            PurchaseOrder.order_number,
            PurchaseOrder.order_date,
            PurchaseOrder.total_amount,
        )
        .where(
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.deleted_at.is_(None),
            PurchaseOrder.status.in_(REVIEWABLE_PURCHASE_STATUSES),
            PurchaseOrder.order_date >= since,
            PurchaseOrder.total_amount > LARGE_TRANSACTION_THRESHOLD,
        )
        .order_by(PurchaseOrder.order_date.desc())
        .limit(MAX_RECEIVABLES)
    ).all()

    for order_id, number, order_date, total in purchase_rows:
        amount = Decimal(total or 0)
        findings.append(
            WorkflowFinding(
                workflow_code=WORKFLOW_LARGE_TRANSACTION,
                entity_type=ENTITY_PURCHASE_ORDER,
                entity_id=order_id,
                severity=Severity.WARNING.value,
                message=(
                    f"Large transaction requires review: purchase order {number} dated "
                    f"{order_date.isoformat()} is {_fmt(amount)}, above the "
                    f"{_fmt(LARGE_TRANSACTION_THRESHOLD)} review threshold."
                ),
            )
        )

    return findings


def _existing_open_keys(
    db: Session, tenant_id: uuid.UUID, keys: set[tuple[str, str, uuid.UUID]]
) -> set[tuple[str, str, uuid.UUID]]:
    """OPEN events already raised for the (workflow, entity) pairs under scan.

    Looked up up front so a repeated run costs one extra query and writes
    nothing, rather than attempting inserts and letting the partial unique index
    reject them.
    """
    if not keys:
        return set()

    workflow_codes = sorted({key[0] for key in keys})
    entity_ids = sorted({key[2] for key in keys})

    rows = db.execute(
        select(
            AutomationEvent.workflow_code,
            AutomationEvent.entity_type,
            AutomationEvent.entity_id,
        ).where(
            AutomationEvent.tenant_id == tenant_id,
            AutomationEvent.status == EventStatus.OPEN.value,
            AutomationEvent.workflow_code.in_(workflow_codes),
            AutomationEvent.entity_id.in_(entity_ids),
        )
    ).all()

    return {(row[0], row[1], row[2]) for row in rows}


def _persist(
    db: Session, tenant_id: uuid.UUID, findings: list[WorkflowFinding], result: RunResult
) -> None:
    """Raise an event per finding that does not already have an OPEN one."""
    if not findings:
        return

    wanted = {(f.workflow_code, f.entity_type, f.entity_id) for f in findings}
    existing = _existing_open_keys(db, tenant_id, wanted)

    for finding in findings:
        key = (finding.workflow_code, finding.entity_type, finding.entity_id)
        if key in existing:
            # Still open from a previous run: do not raise a duplicate. Once a
            # person resolves it the condition may legitimately alert again.
            result.events_skipped_existing += 1
            continue

        event = AutomationEvent(
            tenant_id=tenant_id,
            workflow_code=finding.workflow_code,
            entity_type=finding.entity_type,
            entity_id=finding.entity_id,
            severity=finding.severity,
            message=finding.message,
            status=EventStatus.OPEN.value,
        )
        db.add(event)
        result.created.append(event)
        existing.add(key)

    db.flush()
    result.events_created = len(result.created)


def run_workflows(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    low_stock: bool = True,
    overdue_receivable: bool = True,
    large_transaction: bool = True,
    today: date | None = None,
) -> RunResult:
    """Evaluate the three workflows against this tenant's live ERP data.

    Strictly scoped to ``tenant_id``, and strictly read-only with respect to the
    business tables: no order, invoice or stock row is created, modified or
    approved. The only write is the event record itself.

    Re-running is safe. A condition that already has an OPEN event is skipped,
    so repeated runs do not flood the queue.
    """
    today = today or date.today()
    result = RunResult()
    findings: list[WorkflowFinding] = []

    if low_stock:
        low = _low_stock_findings(db, tenant_id)
        result.low_stock_examined = len(low)
        findings.extend(low)

    if overdue_receivable:
        overdue = _overdue_receivable_findings(db, tenant_id, today)
        result.receivables_examined = len(overdue)
        findings.extend(overdue)

    if large_transaction:
        large = _large_transaction_findings(db, tenant_id, today)
        result.documents_examined = len(large)
        findings.extend(large)

    _persist(db, tenant_id, findings, result)
    return result


def rule_catalogue() -> list[WorkflowRuleInfo]:
    """The fixed triggers, so the UI can explain what each workflow looks for."""

    return [
        WorkflowRuleInfo(
            workflow_code=WORKFLOW_LOW_STOCK,
            entity_type=ENTITY_INVENTORY_STOCK,
            severity=Severity.WARNING.value,
            description=(
                "Available quantity is below the product's reorder level."
            ),
        ),
        WorkflowRuleInfo(
            workflow_code=WORKFLOW_OVERDUE_RECEIVABLE,
            entity_type=ENTITY_INVOICE,
            severity=Severity.CRITICAL.value,
            description=(
                "An invoice still has money outstanding and is past its due date."
            ),
        ),
        WorkflowRuleInfo(
            workflow_code=WORKFLOW_LARGE_TRANSACTION,
            entity_type="sales_order|purchase_order",
            severity=Severity.WARNING.value,
            description=(
                f"A recent sales or purchase document exceeds "
                f"{_fmt(LARGE_TRANSACTION_THRESHOLD)} and needs review."
            ),
        ),
    ]


__all__ = [
    "LARGE_TRANSACTION_THRESHOLD",
    "RunResult",
    "WorkflowFinding",
    "rule_catalogue",
    "run_workflows",
]