"""90-day cash-flow projection (P2-15, FR-M7-06, [§4.7 API-6]).

Deterministic, ``Decimal`` throughout, read only. Three sources:

1. **Known receivables** -- open customer invoices (ISSUED / PARTIALLY_PAID)
   for their ``amount_due``, expected on their due date (no due date: the
   invoice date). Already overdue amounts are expected in the first week and
   also reported as ``overdue_receivables``.
2. **Known payables** -- open vendor bills (POSTED / PARTIALLY_PAID) for their
   ``amount_due``, on their due date; overdue ones in the first week.
3. **Recurring averages** -- the run rate of the last :data:`HISTORY_DAYS`
   days: invoiced per day (customer invoices) and billed per day (vendor
   bills). New business invoiced from today is only collected after the
   average credit term, so the inflow run rate starts on the day equal to the
   average ``due_date - invoice_date`` of that history, and likewise for bills.
   Applied only with at least :data:`MIN_HISTORY_DOCUMENTS` documents.

Payroll is not included: payroll is Phase 2 (Ambiguity A-4). There is no opening
bank balance either (bank accounts arrive with P2-14), so ``cumulative_net`` is
the net movement from today, not a balance.

``fallback`` is true when the scoring engine is unavailable (see
:mod:`app.modules.ai.scoring`, A-1) or there is not enough history for the run
rates: the projection is then the known schedule only.
"""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.money import money
from app.modules.ai.errors import AIError
from app.modules.ai.scoring import (
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    ENGINE_RULES,
    FALLBACK_ENGINE_UNAVAILABLE,
    FALLBACK_INSUFFICIENT_DATA,
    primary_engine,
)

HORIZON_DAYS = 90
BUCKET_DAYS = 7
HISTORY_DAYS = 90
MIN_HISTORY_DOCUMENTS = 3
DEFAULT_TERMS_DAYS = 30
METHOD = "known_schedule_plus_run_rate"
ZERO = Decimal("0.00")


@dataclass(frozen=True)
class RunRate:
    """Average amount per day over the history, and when it starts landing."""

    per_day: Decimal
    start_day: int
    documents: int


@dataclass
class CashFlowBucket:
    start: date
    end: date
    inflow_known: Decimal = ZERO
    inflow_recurring: Decimal = ZERO
    outflow_known: Decimal = ZERO
    outflow_recurring: Decimal = ZERO
    net: Decimal = ZERO
    cumulative_net: Decimal = ZERO


@dataclass
class CashFlowProjection:
    as_of: date
    horizon_days: int
    fallback: bool
    fallback_reason: str | None
    confidence: str
    method: str
    engine: str
    total_inflow: Decimal
    total_outflow: Decimal
    net: Decimal
    overdue_receivables: Decimal
    overdue_payables: Decimal
    recurring_inflow_per_day: Decimal | None
    recurring_outflow_per_day: Decimal | None
    buckets: list[CashFlowBucket] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _buckets(as_of: date, horizon: int) -> list[CashFlowBucket]:
    out = []
    offset = 0
    while offset < horizon:
        span = min(BUCKET_DAYS, horizon - offset)
        out.append(CashFlowBucket(start=as_of + timedelta(days=offset),
                                  end=as_of + timedelta(days=offset + span - 1)))
        offset += span
    return out


def _index(as_of: date, when: date, horizon: int) -> int | None:
    day = max(0, (when - as_of).days)
    if day >= horizon:
        return None
    return day // BUCKET_DAYS


def project_cash_flow(
    as_of: date,
    receivables: Sequence[tuple[date, Decimal]],
    payables: Sequence[tuple[date, Decimal]],
    inflow_rate: RunRate | None,
    outflow_rate: RunRate | None,
    horizon: int = HORIZON_DAYS,
) -> CashFlowProjection:
    """Build the projection from already-gathered figures (pure, no database)."""
    horizon = max(1, min(int(horizon), HORIZON_DAYS))
    buckets = _buckets(as_of, horizon)
    overdue_in = overdue_out = ZERO

    for due, amount in receivables:
        if due < as_of:
            overdue_in += amount
        i = _index(as_of, due, horizon)
        if i is not None:
            buckets[i].inflow_known += amount
    for due, amount in payables:
        if due < as_of:
            overdue_out += amount
        i = _index(as_of, due, horizon)
        if i is not None:
            buckets[i].outflow_known += amount

    fallback_reason: str | None = None
    try:
        engine = primary_engine()
    except AIError:
        engine = ENGINE_RULES
        fallback_reason = FALLBACK_ENGINE_UNAVAILABLE
        inflow_rate = outflow_rate = None

    usable_in = inflow_rate if inflow_rate and inflow_rate.documents >= MIN_HISTORY_DOCUMENTS else None
    usable_out = outflow_rate if outflow_rate and outflow_rate.documents >= MIN_HISTORY_DOCUMENTS else None
    if fallback_reason is None and usable_in is None and usable_out is None:
        fallback_reason = FALLBACK_INSUFFICIENT_DATA

    for rate, attr in ((usable_in, "inflow_recurring"), (usable_out, "outflow_recurring")):
        if rate is None:
            continue
        for bucket in buckets:
            first = (bucket.start - as_of).days
            last = (bucket.end - as_of).days
            days = max(0, last - max(first, rate.start_day) + 1)
            if days:
                setattr(bucket, attr, getattr(bucket, attr) + rate.per_day * days)

    running = ZERO
    total_in = total_out = ZERO
    for bucket in buckets:
        for name in ("inflow_known", "inflow_recurring", "outflow_known", "outflow_recurring"):
            setattr(bucket, name, money(getattr(bucket, name)))
        inflow = bucket.inflow_known + bucket.inflow_recurring
        outflow = bucket.outflow_known + bucket.outflow_recurring
        bucket.net = money(inflow - outflow)
        running += bucket.net
        bucket.cumulative_net = money(running)
        total_in += inflow
        total_out += outflow

    if fallback_reason is not None:
        confidence = CONFIDENCE_LOW
    elif usable_in is not None and usable_out is not None:
        confidence = CONFIDENCE_HIGH if min(usable_in.documents, usable_out.documents) >= 20 else CONFIDENCE_MEDIUM
    else:
        confidence = CONFIDENCE_MEDIUM if (usable_in or usable_out) else CONFIDENCE_LOW

    notes = [
        "Known amounts are open invoices and open vendor bills on their due dates; "
        "overdue amounts are expected in the first week.",
        "No opening bank balance or payroll is included; cumulative_net is the net "
        "movement from today.",
    ]
    if fallback_reason == FALLBACK_INSUFFICIENT_DATA:
        notes.append(
            f"Fewer than {MIN_HISTORY_DOCUMENTS} invoices/bills in the last {HISTORY_DAYS} "
            "days: recurring run rates were left out (known schedule only)."
        )
    elif fallback_reason == FALLBACK_ENGINE_UNAVAILABLE:
        notes.append("Scoring engine unavailable: known schedule only.")

    return CashFlowProjection(
        as_of=as_of,
        horizon_days=horizon,
        fallback=fallback_reason is not None,
        fallback_reason=fallback_reason,
        confidence=confidence,
        method=METHOD,
        engine=engine,
        total_inflow=money(total_in),
        total_outflow=money(total_out),
        net=money(total_in - total_out),
        overdue_receivables=money(overdue_in),
        overdue_payables=money(overdue_out),
        recurring_inflow_per_day=money(usable_in.per_day) if usable_in else None,
        recurring_outflow_per_day=money(usable_out.per_day) if usable_out else None,
        buckets=buckets,
        notes=notes,
    )


def _run_rate(rows: Sequence[tuple[date, date | None, Decimal]]) -> RunRate | None:
    if not rows:
        return None
    total = sum((Decimal(str(amount or 0)) for _, _, amount in rows), Decimal("0"))
    terms = [(due - issued).days for issued, due, _ in rows if due is not None]
    start = round(sum(terms) / len(terms)) if terms else DEFAULT_TERMS_DAYS
    return RunRate(per_day=total / Decimal(HISTORY_DAYS), start_day=max(0, start), documents=len(rows))


def cash_flow_projection(
    db: Session, tenant_id: uuid.UUID, as_of: date | None = None, horizon: int = HORIZON_DAYS
) -> CashFlowProjection:
    """Gather one tenant's figures and project them (read only)."""
    from app.models.finance import Invoice
    from app.models.payables import OPEN_BILL_STATUSES, POSTED_BILL_STATUSES, VendorBill

    as_of = as_of or date.today()
    since = as_of - timedelta(days=HISTORY_DAYS)

    receivables = [
        (due or issued, Decimal(str(amount)))
        for issued, due, amount in db.execute(
            select(Invoice.invoice_date, Invoice.due_date, Invoice.amount_due).where(
                Invoice.tenant_id == tenant_id,
                Invoice.deleted_at.is_(None),
                Invoice.status.in_(("ISSUED", "PARTIALLY_PAID")),
                Invoice.amount_due > 0,
            )
        ).all()
    ]
    payables = [
        (due, Decimal(str(amount)))
        for due, amount in db.execute(
            select(VendorBill.due_date, VendorBill.amount_due).where(
                VendorBill.tenant_id == tenant_id,
                VendorBill.deleted_at.is_(None),
                VendorBill.status.in_(OPEN_BILL_STATUSES),
                VendorBill.amount_due > 0,
            )
        ).all()
    ]
    invoiced = db.execute(
        select(Invoice.invoice_date, Invoice.due_date, Invoice.total_amount).where(
            Invoice.tenant_id == tenant_id,
            Invoice.deleted_at.is_(None),
            Invoice.status.in_(("ISSUED", "PARTIALLY_PAID", "PAID")),
            Invoice.invoice_date >= since,
            Invoice.invoice_date < as_of,
        )
    ).all()
    billed = db.execute(
        select(VendorBill.bill_date, VendorBill.due_date, VendorBill.total_amount).where(
            VendorBill.tenant_id == tenant_id,
            VendorBill.deleted_at.is_(None),
            VendorBill.status.in_(POSTED_BILL_STATUSES),
            VendorBill.bill_date >= since,
            VendorBill.bill_date < as_of,
        )
    ).all()
    return project_cash_flow(
        as_of, receivables, payables, _run_rate(invoiced), _run_rate(billed), horizon
    )


__all__ = [
    "HORIZON_DAYS",
    "CashFlowBucket",
    "CashFlowProjection",
    "RunRate",
    "cash_flow_projection",
    "project_cash_flow",
]
