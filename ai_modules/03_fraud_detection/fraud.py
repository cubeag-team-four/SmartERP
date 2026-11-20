"""Deterministic fraud-risk rules over real ERP transactions.

What this module is: a small, explainable rules engine that raises **review
flags** on documents that look unusual, so a human reviewer can investigate.

What this module is **not**: a machine-learning classifier, and never a verdict.
Nothing here decides that a transaction *is* fraud. The strongest statement the
engine can make is "this looks unusual enough to look at", and every flag carries
the specific figures that produced it.

Determinism guarantees:

* No language model is involved. Scores come from fixed rule weights only.
* Identical data always yields identical scores, levels and reasons.
* All money maths uses ``Decimal`` — no binary float touches an amount.

Each rule is a pure function of already-loaded rows, which keeps the rules
readable and the outputs explainable.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finance import Payment, PaymentStatus, VendorPayment
from app.models.fraud import ACTIVE_FLAG_STATUSES, FlagStatus, FraudFlag, RiskLevel
from app.models.inventory import StockAdjustment

# ---------------------------------------------------------------- constants

#: Upper bound on any risk score. Two strong rules cannot exceed CRITICAL.
MAX_RISK_SCORE = 100

#: Rule weights. Fixed and public, so a reviewer can always predict the score.
RULE_WEIGHTS: dict[str, int] = {
    "duplicate_payment": 40,
    "large_payment": 30,
    "large_stock_adjustment": 30,
    "rapid_repeated_transaction": 25,
    # P2-16 (FR-M7-05): per-vendor statistics, supplier-invoice duplicates and
    # expense-claim anomalies.
    "vendor_amount_outlier": 35,
    "duplicate_vendor_bill": 40,
    "expense_claim_outlier": 30,
    "duplicate_expense_claim": 40,
}

#: Entity discriminators. A flag points at a logical entity rather than a FK to
#: every transaction table, so new document types need no schema change here.
ENTITY_PAYMENT = "payment"
ENTITY_VENDOR_PAYMENT = "vendor_payment"
ENTITY_STOCK_ADJUSTMENT = "stock_adjustment"
ENTITY_VENDOR_BILL = "vendor_bill"
ENTITY_EXPENSE_CLAIM = "expense_claim"

# --- Rule 1: large payment ---
#: Absolute floor. A payment at or above this always needs a look.
LARGE_PAYMENT_ABSOLUTE = Decimal("10000.00")
#: Or this multiple of the tenant's own median completed payment. Using the
#: median (not the mean) keeps one historic outlier from raising the bar for
#: every later payment.
LARGE_PAYMENT_MULTIPLE = Decimal("4")

# --- Rule 2: duplicate payment ---
#: Two payments for the same tenant, same amount, this close together. A day is
#: generous on purpose: ERP back-dating and batch posting routinely create
#: same-day payments, so a minute-level window would miss real duplicates.
DUPLICATE_WINDOW = timedelta(days=1)

# --- Rule 3: large stock adjustment ---
LARGE_ADJUSTMENT_ABSOLUTE = Decimal("500.000")
LARGE_ADJUSTMENT_MULTIPLE = Decimal("5")

# --- Rule 4: rapid repeated transaction ---
#: This many identical payments inside this window is a pattern, not chance.
RAPID_REPEAT_WINDOW = timedelta(hours=24)
RAPID_REPEAT_MIN_COUNT = 3

# --- Rule 5 (P2-16): per-vendor sigma ---
#: A vendor payment above mean + 3 sigma of the *same vendor's* other completed
#: payments (on or before its date) is unusual for that supplier, however
#: ordinary it is for the tenant as a whole.
VENDOR_SIGMA_MULTIPLE = Decimal("3")
#: Below this many earlier payments there is no meaningful distribution.
VENDOR_SIGMA_MIN_HISTORY = 5
#: How far back a vendor's history is read (independent of the scan window).
VENDOR_HISTORY_DAYS = 365
#: A perfectly constant history has sigma 0, where any deviation would be
#: "infinitely" many sigmas; sigma is floored at this share of the mean.
SIGMA_FLOOR_RATIO = Decimal("0.01")
MAX_HISTORY_ROWS = 5000

# --- Rule 6 (P2-16): duplicate vendor bill ---
#: Same vendor and the same supplier invoice number once normalised (case,
#: spaces and punctuation ignored: "INV-001" == "inv 001"), or the same vendor,
#: total and bill date. Cancelled and deleted bills are ignored.

# --- Rule 7 (P2-16): expense anomalies ---
EXPENSE_SIGMA_MULTIPLE = Decimal("3")
#: The employee's own history in the category is preferred; with too little of
#: it the category's history across all employees is used instead.
EXPENSE_MIN_HISTORY_EMPLOYEE = 3
EXPENSE_MIN_HISTORY_CATEGORY = 5

#: Query guards so a scan never sweeps the whole table.
HISTORY_WINDOW_DAYS = 180
MAX_ROWS_PER_SCAN = 500

ZERO = Decimal("0")

# ------------------------------------------------------------------ scoring


def risk_level_for(score: int) -> str:
    """Band a capped score into a level. Pure function of the score."""
    if score >= 80:
        return RiskLevel.CRITICAL.value
    if score >= 60:
        return RiskLevel.HIGH.value
    if score >= 30:
        return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value


def cap_score(score: int) -> int:
    """Clamp to ``0..MAX_RISK_SCORE`` so the level bands always apply."""
    return max(0, min(int(score), MAX_RISK_SCORE))


@dataclass
class RuleFinding:
    """One rule firing against one entity, with the evidence behind it."""

    entity_type: str
    entity_id: uuid.UUID
    rule_code: str
    score: int
    reason: str
    observed_amount: Decimal | None = None
    #: Further rule codes that also fired, so a multi-rule entity accumulates
    #: into a single flag rather than several near-identical ones.
    also_fired: list[str] = field(default_factory=list)


def _median(values: list[Decimal]) -> Decimal:
    """Median of a non-empty list. Exact, and robust to outliers."""
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / Decimal(2)


def mean_and_sigma(values: list[Decimal]) -> tuple[Decimal, Decimal]:
    """Mean and *population* standard deviation of a non-empty list, in Decimal."""
    count = Decimal(len(values))
    mean = sum(values, ZERO) / count
    variance = sum(((value - mean) ** 2 for value in values), ZERO) / count
    return mean, variance.sqrt()


def sigma_outlier(
    amount: Decimal, history: list[Decimal], *, multiple: Decimal, min_count: int
) -> tuple[Decimal, Decimal, Decimal] | None:
    """``(z, mean, sigma)`` when ``amount > mean + multiple * sigma``, else None.

    None also when the history is shorter than ``min_count``. Sigma is floored
    at :data:`SIGMA_FLOOR_RATIO` of the mean (see there). Pure and exact.
    """
    if len(history) < min_count:
        return None
    mean, sigma = mean_and_sigma(history)
    effective = max(sigma, abs(mean) * SIGMA_FLOOR_RATIO)
    if effective <= 0 or amount <= mean:
        return None
    z = (amount - mean) / effective
    if z <= multiple:
        return None
    return z, mean, sigma


def _timestamp(row: Any) -> datetime:
    """Posting timestamp, normalised so naive and aware values can be compared."""
    return row.created_at


def _fmt(value: Decimal) -> str:
    """Two-decimal rendering for a money reason string."""
    return f"{value:.2f}"


def _fmt_qty(value: Decimal) -> str:
    return f"{value:.3f}"


def _context_key(row: Any, entity_type: str) -> tuple:
    """The counterparty context a duplicate must match.

    Two payments for the same amount are only a *duplicate* if they were made to
    the same party for the same document. Without this, two unrelated customers
    paying 100.00 each would look like a duplicate, which is precisely the kind of
    false positive that erodes trust in a review queue.

    ``Payment`` keys on ``(customer_id, invoice_id)`` and ``VendorPayment`` on
    ``(vendor_id, purchase_order_id)``; both carry ``None`` where the document link
    is optional, and ``None`` matches only ``None``.
    """
    if entity_type == ENTITY_PAYMENT:
        return (row.customer_id, row.invoice_id)
    return (row.vendor_id, row.purchase_order_id)


def _fmt_gap(delta: timedelta) -> str:
    """Human-readable duration used inside a reason string."""
    seconds = abs(int(delta.total_seconds()))
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


# -------------------------------------------------------------- rule engine


def _payment_rules(rows: list[tuple[Any, str]]) -> list[RuleFinding]:
    """Rules 1, 2 and 4 against a tenant's recent payments.

    ``rows`` are ``(model_instance, entity_type)`` pairs already ordered oldest
    first by posting time, so same-amount neighbours are adjacent. All three
    rules run per payment and their weights accumulate into a single finding, so
    a payment that trips two rules is flagged once with the combined score.
    """
    findings: list[RuleFinding] = []
    if not rows:
        return findings

    amounts = [Decimal(row.amount) for row, _ in rows]
    baseline = _median(amounts)
    # With a single payment there is no history to compare against, so the
    # statistical half of rule 1 cannot fire and only the absolute test can.
    has_history = len(rows) > 1

    for row, entity_type in rows:
        amount = Decimal(row.amount)
        stamp = _timestamp(row)
        context = _context_key(row, entity_type)
        fired: list[str] = []
        reasons: list[str] = []
        total = 0

        # -- Rule 1: large payment -------------------------------------------
        over_absolute = amount >= LARGE_PAYMENT_ABSOLUTE
        over_multiple = (
            has_history and baseline > 0 and amount >= baseline * LARGE_PAYMENT_MULTIPLE
        )
        if over_absolute or over_multiple:
            total += RULE_WEIGHTS["large_payment"]
            fired.append("large_payment")
            detail = []
            if over_absolute:
                detail.append(
                    f"amount {_fmt(amount)} is at or above the "
                    f"{_fmt(LARGE_PAYMENT_ABSOLUTE)} absolute threshold"
                )
            if over_multiple:
                detail.append(
                    f"amount is {(amount / baseline).quantize(Decimal('0.1'))}x the "
                    f"tenant's median completed payment of {_fmt(baseline)}"
                )
            reasons.append("Large payment: " + "; ".join(detail) + ".")

        # -- Rule 2: duplicate payment --------------------------------------
        for previous, previous_type in rows:
            if previous.id == row.id or previous_type != entity_type:
                continue
            if Decimal(previous.amount) != amount:
                continue
            # Same amount is not enough: it must be the same counterparty and the
            # same document, otherwise two unrelated payments merely coincide.
            if _context_key(previous, previous_type) != context:
                continue
            gap = stamp - _timestamp(previous)
            # Rows are chronological, so a negative gap just means we are looking
            # backwards; compare magnitudes and require the pair to be close.
            if abs(gap) > DUPLICATE_WINDOW:
                continue
            total += RULE_WEIGHTS["duplicate_payment"]
            fired.append("duplicate_payment")
            reasons.append(
                f"Possible duplicate: another {entity_type} to the same "
                f"counterparty for {_fmt(amount)} was posted "
                f"{_fmt_gap(gap)} apart."
            )
            break

        # -- Rule 4: rapid repeated transaction -----------------------------
        repeats = [
            other
            for other, other_type in rows
            if other.id != row.id
            and other_type == entity_type
            and Decimal(other.amount) == amount
            and _context_key(other, other_type) == context
            and abs(_timestamp(other) - stamp) <= RAPID_REPEAT_WINDOW
        ]
        if len(repeats) + 1 >= RAPID_REPEAT_MIN_COUNT:
            total += RULE_WEIGHTS["rapid_repeated_transaction"]
            fired.append("rapid_repeated_transaction")
            reasons.append(
                f"Rapid repeat: {len(repeats) + 1} payments of {_fmt(amount)} "
                f"within {_fmt_gap(RAPID_REPEAT_WINDOW)}."
            )

        if not fired:
            continue

        findings.append(
            RuleFinding(
                entity_type=entity_type,
                entity_id=row.id,
                rule_code=fired[0],
                score=cap_score(total),
                reason=" ".join(reasons),
                observed_amount=amount,
                also_fired=fired[1:],
            )
        )

    return findings


def _stock_adjustment_rules(rows: list[Any]) -> list[RuleFinding]:
    """Rule 3 against recent stock adjustments.

    The baseline is the *same product's* own adjustment history, so a
    warehouse that legitimately moves 10,000 units is judged against itself
    rather than against a global number.
    """
    findings: list[RuleFinding] = []
    if not rows:
        return findings

    by_product: dict[uuid.UUID, list[Decimal]] = {}
    for row in rows:
        by_product.setdefault(row.product_id, []).append(abs(Decimal(row.quantity)))

    for row in rows:
        quantity = abs(Decimal(row.quantity))
        peers = [q for q in by_product.get(row.product_id, []) if q != quantity]
        baseline = _median(peers) if peers else ZERO
        has_peers = bool(peers)

        over_absolute = quantity >= LARGE_ADJUSTMENT_ABSOLUTE
        over_multiple = (
            has_peers and baseline > 0 and quantity >= baseline * LARGE_ADJUSTMENT_MULTIPLE
        )
        if not (over_absolute or over_multiple):
            continue

        detail = []
        if over_absolute:
            detail.append(
                f"absolute quantity {_fmt_qty(quantity)} is at or above the "
                f"{_fmt_qty(LARGE_ADJUSTMENT_ABSOLUTE)} threshold"
            )
        if over_multiple:
            detail.append(
                f"quantity is {(quantity / baseline).quantize(Decimal('0.1'))}x this "
                f"product's median adjustment of {_fmt_qty(baseline)}"
            )

        findings.append(
            RuleFinding(
                entity_type=ENTITY_STOCK_ADJUSTMENT,
                entity_id=row.id,
                rule_code="large_stock_adjustment",
                score=RULE_WEIGHTS["large_stock_adjustment"],
                reason="Large stock adjustment: " + "; ".join(detail) + ".",
                observed_amount=quantity,
            )
        )

    return findings


def _vendor_sigma_rules(
    db: Session, tenant_id: uuid.UUID, rows: list[tuple[Any, str]]
) -> list[RuleFinding]:
    """Rule 5: a vendor payment far outside that vendor's own payment history.

    The history of a payment is every *other* COMPLETED payment to the same
    vendor dated on or before it, within :data:`VENDOR_HISTORY_DAYS`. Dates, not
    creation timestamps, define "prior", so back-dated entry and batch posting
    do not reorder a supplier's history.
    """
    scanned = [row for row, entity in rows if entity == ENTITY_VENDOR_PAYMENT]
    if not scanned:
        return []
    vendor_ids = {row.vendor_id for row in scanned}
    earliest = min(row.payment_date for row in scanned) - timedelta(days=VENDOR_HISTORY_DAYS)
    history_rows = db.execute(
        select(
            VendorPayment.id, VendorPayment.vendor_id, VendorPayment.payment_date, VendorPayment.amount
        )
        .where(
            VendorPayment.tenant_id == tenant_id,
            VendorPayment.status == PaymentStatus.COMPLETED.value,
            VendorPayment.vendor_id.in_(vendor_ids),
            VendorPayment.payment_date >= earliest,
        )
        .order_by(VendorPayment.payment_date.desc(), VendorPayment.id)
        .limit(MAX_HISTORY_ROWS)
    ).all()
    by_vendor: dict[uuid.UUID, list[tuple[uuid.UUID, date, Decimal]]] = {}
    for hid, vendor_id, paid_on, amount in history_rows:
        by_vendor.setdefault(vendor_id, []).append((hid, paid_on, Decimal(amount)))

    findings: list[RuleFinding] = []
    for row in scanned:
        amount = Decimal(row.amount)
        window_start = row.payment_date - timedelta(days=VENDOR_HISTORY_DAYS)
        history = [
            value
            for hid, paid_on, value in by_vendor.get(row.vendor_id, [])
            if hid != row.id and window_start <= paid_on <= row.payment_date
        ]
        outcome = sigma_outlier(
            amount, history, multiple=VENDOR_SIGMA_MULTIPLE, min_count=VENDOR_SIGMA_MIN_HISTORY
        )
        if outcome is None:
            continue
        z, mean, sigma = outcome
        findings.append(
            RuleFinding(
                entity_type=ENTITY_VENDOR_PAYMENT,
                entity_id=row.id,
                rule_code="vendor_amount_outlier",
                score=RULE_WEIGHTS["vendor_amount_outlier"],
                reason=(
                    f"Vendor outlier: amount {_fmt(amount)} is {z.quantize(Decimal('0.1'))} "
                    f"standard deviations above this vendor's mean payment of {_fmt(mean)} "
                    f"(sigma {_fmt(sigma)}, {len(history)} earlier payment(s)); the "
                    f"threshold is {VENDOR_SIGMA_MULTIPLE} sigma."
                ),
                observed_amount=amount,
            )
        )
    return findings


def normalise_bill_number(value: str | None) -> str:
    """Supplier invoice number with case, spaces and punctuation removed."""
    return "".join(ch for ch in (value or "").upper() if ch.isalnum())


def _vendor_bill_rules(rows: list[Any]) -> list[RuleFinding]:
    """Rule 6: the same supplier invoice entered twice for one vendor.

    ``rows`` are the tenant's live (not cancelled, not deleted) bills. A bill is
    flagged when another bill of the same vendor has the same normalised
    supplier invoice number, or the same total on the same bill date. Each bill
    of a duplicate pair is flagged, so whichever is the copy is reviewed.
    """
    findings: list[RuleFinding] = []
    by_number: dict[tuple, list[Any]] = {}
    by_amount_date: dict[tuple, list[Any]] = {}
    for row in rows:
        number = normalise_bill_number(row.vendor_invoice_number)
        if number:
            by_number.setdefault((row.vendor_id, number), []).append(row)
        by_amount_date.setdefault(
            (row.vendor_id, Decimal(row.total_amount), row.bill_date), []
        ).append(row)

    for row in rows:
        reasons: list[str] = []
        number = normalise_bill_number(row.vendor_invoice_number)
        same_number = (
            [other for other in by_number.get((row.vendor_id, number), []) if other.id != row.id]
            if number
            else []
        )
        if same_number:
            reasons.append(
                f"supplier invoice number {row.vendor_invoice_number!r} matches bill(s) "
                + ", ".join(sorted(other.bill_number for other in same_number))
            )
        same_amount = [
            other
            for other in by_amount_date.get(
                (row.vendor_id, Decimal(row.total_amount), row.bill_date), []
            )
            if other.id != row.id
        ]
        if same_amount:
            reasons.append(
                f"same vendor, total {_fmt(Decimal(row.total_amount))} and bill date "
                f"{row.bill_date.isoformat()} as bill(s) "
                + ", ".join(sorted(other.bill_number for other in same_amount))
            )
        if not reasons:
            continue
        findings.append(
            RuleFinding(
                entity_type=ENTITY_VENDOR_BILL,
                entity_id=row.id,
                rule_code="duplicate_vendor_bill",
                score=RULE_WEIGHTS["duplicate_vendor_bill"],
                reason="Possible duplicate vendor bill: " + "; ".join(reasons) + ".",
                observed_amount=Decimal(row.total_amount),
            )
        )
    return findings


def _expense_rules(scanned: list[Any], history: list[Any]) -> list[RuleFinding]:
    """Rule 7: expense claims far outside the employee's / category's history.

    * ``expense_claim_outlier`` -- the amount exceeds mean + 3 sigma of the same
      employee's other claims in the category dated on or before it (at least
      :data:`EXPENSE_MIN_HISTORY_EMPLOYEE`), or, lacking that, of the category's
      claims by everyone (at least :data:`EXPENSE_MIN_HISTORY_CATEGORY`).
    * ``duplicate_expense_claim`` -- another live claim by the same employee in
      the same category for the same amount on the same date.

    ``history`` holds every live (submitted, approved or posted) claim the
    baselines are drawn from; ``scanned`` the claims being judged.
    """
    findings: list[RuleFinding] = []
    for claim in scanned:
        amount = Decimal(claim.amount)
        others = [h for h in history if h.id != claim.id and h.category_id == claim.category_id]
        own = [
            Decimal(h.amount)
            for h in others
            if h.employee_user_id == claim.employee_user_id and h.expense_date <= claim.expense_date
        ]
        outcome = sigma_outlier(
            amount, own, multiple=EXPENSE_SIGMA_MULTIPLE, min_count=EXPENSE_MIN_HISTORY_EMPLOYEE
        )
        basis = "this employee's"
        count = len(own)
        if outcome is None and len(own) < EXPENSE_MIN_HISTORY_EMPLOYEE:
            category_history = [
                Decimal(h.amount) for h in others if h.expense_date <= claim.expense_date
            ]
            outcome = sigma_outlier(
                amount,
                category_history,
                multiple=EXPENSE_SIGMA_MULTIPLE,
                min_count=EXPENSE_MIN_HISTORY_CATEGORY,
            )
            basis = "the category's"
            count = len(category_history)
        if outcome is not None:
            z, mean, sigma = outcome
            findings.append(
                RuleFinding(
                    entity_type=ENTITY_EXPENSE_CLAIM,
                    entity_id=claim.id,
                    rule_code="expense_claim_outlier",
                    score=RULE_WEIGHTS["expense_claim_outlier"],
                    reason=(
                        f"Expense anomaly: claim {claim.claim_number} for {_fmt(amount)} is "
                        f"{z.quantize(Decimal('0.1'))} standard deviations above {basis} "
                        f"mean of {_fmt(mean)} in this category (sigma {_fmt(sigma)}, "
                        f"{count} claim(s))."
                    ),
                    observed_amount=amount,
                )
            )
        duplicates = [
            h
            for h in others
            if h.employee_user_id == claim.employee_user_id
            and Decimal(h.amount) == amount
            and h.expense_date == claim.expense_date
        ]
        if duplicates:
            findings.append(
                RuleFinding(
                    entity_type=ENTITY_EXPENSE_CLAIM,
                    entity_id=claim.id,
                    rule_code="duplicate_expense_claim",
                    score=RULE_WEIGHTS["duplicate_expense_claim"],
                    reason=(
                        f"Possible duplicate expense claim: {claim.claim_number} has the same "
                        f"employee, category, amount {_fmt(amount)} and date as "
                        + ", ".join(sorted(h.claim_number for h in duplicates))
                        + "."
                    ),
                    observed_amount=amount,
                )
            )
    return findings


# ------------------------------------------------------------------ service


@dataclass
class ScanResult:
    """Outcome of one scan: what was examined and what was flagged."""

    payments_examined: int = 0
    adjustments_examined: int = 0
    bills_examined: int = 0
    expenses_examined: int = 0
    #: P2-16: flags whose document was put on hold by this scan.
    flags_held: int = 0
    flags_created: int = 0
    flags_skipped_existing: int = 0
    created: list[FraudFlag] = field(default_factory=list)

    @property
    def examined(self) -> int:
        return (
            self.payments_examined
            + self.adjustments_examined
            + self.bills_examined
            + self.expenses_examined
        )


def _existing_active_keys(
    db: Session, tenant_id: uuid.UUID, keys: set[tuple[str, uuid.UUID, str]]
) -> set[tuple[str, uuid.UUID, str]]:
    """Active flags already present for the (entity, rule) pairs under scan.

    Looked up up front so the common re-scan case costs one extra query and
    writes nothing, rather than attempting inserts and letting the partial unique
    index reject them.
    """
    if not keys:
        return set()

    entity_types = sorted({key[0] for key in keys})
    entity_ids = sorted({key[1] for key in keys})

    rows = db.execute(
        select(FraudFlag.entity_type, FraudFlag.entity_id, FraudFlag.rule_code).where(
            FraudFlag.tenant_id == tenant_id,
            FraudFlag.status.in_(ACTIVE_FLAG_STATUSES),
            FraudFlag.entity_type.in_(entity_types),
            FraudFlag.entity_id.in_(entity_ids),
        )
    ).all()

    return {(row[0], row[1], row[2]) for row in rows}


def _released_hold_keys(
    db: Session, tenant_id: uuid.UUID, keys: set[tuple[str, uuid.UUID, str]]
) -> set[tuple[str, uuid.UUID, str]]:
    """(entity, rule) pairs whose hold a finance manager already released."""
    if not keys:
        return set()
    from app.models.fraud import HoldStatus

    rows = db.execute(
        select(FraudFlag.entity_type, FraudFlag.entity_id, FraudFlag.rule_code).where(
            FraudFlag.tenant_id == tenant_id,
            FraudFlag.hold_status.in_((HoldStatus.CLEARED.value, HoldStatus.CONFIRMED.value)),
            FraudFlag.entity_type.in_(sorted({key[0] for key in keys})),
            FraudFlag.entity_id.in_(sorted({key[1] for key in keys})),
        )
    ).all()
    return {(row[0], row[1], row[2]) for row in rows}


def _persist(
    db: Session, tenant_id: uuid.UUID, findings: list[RuleFinding], result: ScanResult
) -> None:
    """Insert flags for findings that do not already have an active flag."""
    if not findings:
        return

    wanted = {(f.entity_type, f.entity_id, f.rule_code) for f in findings}
    existing = _existing_active_keys(db, tenant_id, wanted)
    # P2-16: a finance manager has already cleared or confirmed a hold for this
    # (document, rule); the nightly scan must not raise and hold it again.
    existing |= _released_hold_keys(db, tenant_id, wanted)

    for finding in findings:
        key = (finding.entity_type, finding.entity_id, finding.rule_code)
        if key in existing:
            # Already flagged and not yet reviewed: leave the open flag alone so
            # reviewers are not spammed with duplicates of a known item.
            result.flags_skipped_existing += 1
            continue

        flag = FraudFlag(
            tenant_id=tenant_id,
            entity_type=finding.entity_type,
            entity_id=finding.entity_id,
            rule_code=finding.rule_code,
            risk_score=finding.score,
            risk_level=risk_level_for(finding.score),
            reason=finding.reason,
            observed_amount=finding.observed_amount,
            status=FlagStatus.OPEN.value,
        )
        db.add(flag)
        result.created.append(flag)
        existing.add(key)

    db.flush()
    result.flags_created = len(result.created)


def _recent_payments(
    db: Session, tenant_id: uuid.UUID, since: date
) -> list[tuple[Any, str]]:
    """Recent COMPLETED customer and vendor payments, oldest first.

    Cancelled payments are excluded: a cancelled transaction is not a risk.

    P1-20 (FR-M7-05): when the window holds more than ``MAX_ROWS_PER_SCAN`` rows
    of a source, the cap keeps the *newest* ones -- selected newest first, then
    re-ordered oldest first for the rules. Selecting oldest first (as before)
    meant a busy tenant's scan never reached its new transactions, which are
    exactly the ones a nightly scan exists to examine.
    """
    payments = db.execute(
        select(Payment)
        .where(
            Payment.tenant_id == tenant_id,
            Payment.status == PaymentStatus.COMPLETED.value,
            Payment.payment_date >= since,
        )
        .order_by(Payment.created_at.desc(), Payment.id.desc())
        .limit(MAX_ROWS_PER_SCAN)
    ).scalars().all()

    vendor_payments = db.execute(
        select(VendorPayment)
        .where(
            VendorPayment.tenant_id == tenant_id,
            VendorPayment.status == PaymentStatus.COMPLETED.value,
            VendorPayment.payment_date >= since,
        )
        .order_by(VendorPayment.created_at.desc(), VendorPayment.id.desc())
        .limit(MAX_ROWS_PER_SCAN)
    ).scalars().all()

    # Interleave both sources chronologically so the neighbour comparisons in the
    # rules see one ordered stream rather than two separate blocks.
    combined: list[tuple[datetime, Any, str]] = [
        (_timestamp(payment), payment, ENTITY_PAYMENT) for payment in payments
    ]
    combined += [
        (_timestamp(payment), payment, ENTITY_VENDOR_PAYMENT)
        for payment in vendor_payments
    ]
    combined.sort(key=lambda item: (item[0], str(item[1].id)))
    return [(row, entity) for _, row, entity in combined]


def _recent_adjustments(db: Session, tenant_id: uuid.UUID, since: date) -> list[Any]:
    """Recent stock adjustments, oldest first -- the newest ``MAX_ROWS_PER_SCAN``.

    Selected newest first so the cap drops the oldest rows (P1-20), then
    re-ordered oldest first for the rules.
    """
    rows = list(
        db.execute(
            select(StockAdjustment)
            .where(
                StockAdjustment.tenant_id == tenant_id,
                StockAdjustment.created_at
                >= datetime.combine(since, datetime.min.time()),
            )
            .order_by(StockAdjustment.created_at.desc(), StockAdjustment.id.desc())
            .limit(MAX_ROWS_PER_SCAN)
        ).scalars().all()
    )
    rows.reverse()
    return rows


def _recent_bills(db: Session, tenant_id: uuid.UUID, since: date) -> list[Any]:
    """Live vendor bills of the vendors billed in the window.

    Duplicates are looked for among *all* live bills of those vendors, not only
    the window's, since a copy is often entered weeks after the original.
    """
    from app.models.payables import VendorBill, VendorBillStatus

    live = (
        VendorBill.tenant_id == tenant_id,
        VendorBill.deleted_at.is_(None),
        VendorBill.status != VendorBillStatus.CANCELLED.value,
    )
    vendors = select(VendorBill.vendor_id).where(*live, VendorBill.bill_date >= since)
    return list(
        db.execute(
            select(VendorBill)
            .where(*live, VendorBill.vendor_id.in_(vendors))
            .order_by(VendorBill.bill_date.desc(), VendorBill.id)
            .limit(MAX_HISTORY_ROWS)
        ).scalars().all()
    )


def _recent_expense_claims(
    db: Session, tenant_id: uuid.UUID, since: date
) -> tuple[list[Any], list[Any]]:
    """``(scanned, history)``: claims in the window, and the baseline claims.

    Only claims that have left DRAFT and were not rejected or cancelled count:
    a draft is not a transaction yet.
    """
    from app.models.finance_ops import ExpenseClaim, ExpenseClaimStatus

    live_statuses = (
        ExpenseClaimStatus.SUBMITTED.value,
        ExpenseClaimStatus.APPROVED.value,
        ExpenseClaimStatus.POSTED.value,
        # P2-27: a paid-out claim is still a posted claim for the scan.
        ExpenseClaimStatus.REIMBURSED.value,
    )
    history = list(
        db.execute(
            select(ExpenseClaim)
            .where(
                ExpenseClaim.tenant_id == tenant_id,
                ExpenseClaim.status.in_(live_statuses),
                ExpenseClaim.expense_date >= since - timedelta(days=VENDOR_HISTORY_DAYS),
            )
            .order_by(ExpenseClaim.expense_date.desc(), ExpenseClaim.id)
            .limit(MAX_HISTORY_ROWS)
        ).scalars().all()
    )
    scanned = [claim for claim in history if claim.expense_date >= since][:MAX_ROWS_PER_SCAN]
    return scanned, history


def run_fraud_scan(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    days: int = HISTORY_WINDOW_DAYS,
    include_payments: bool = True,
    include_stock: bool = True,
    include_bills: bool = True,
    include_expenses: bool = True,
) -> ScanResult:
    """Run the deterministic rules over this tenant's recent transactions.

    Strictly scoped to ``tenant_id``. Bounded by ``days`` and ``MAX_ROWS_PER_SCAN``
    so a scan can never become an accidental full-table sweep.

    Re-running is safe: a rule that already has an active flag on an entity is
    skipped rather than duplicated.
    """
    days = max(1, min(int(days), HISTORY_WINDOW_DAYS))
    since = date.today() - timedelta(days=days)
    result = ScanResult()
    findings: list[RuleFinding] = []

    if include_payments:
        payments = _recent_payments(db, tenant_id, since)
        result.payments_examined = len(payments)
        findings.extend(_payment_rules(payments))
        findings.extend(_vendor_sigma_rules(db, tenant_id, payments))

    if include_stock:
        adjustments = _recent_adjustments(db, tenant_id, since)
        result.adjustments_examined = len(adjustments)
        findings.extend(_stock_adjustment_rules(adjustments))

    if include_bills:
        bills = _recent_bills(db, tenant_id, since)
        result.bills_examined = len(bills)
        findings.extend(_vendor_bill_rules(bills))

    if include_expenses:
        claims, claim_history = _recent_expense_claims(db, tenant_id, since)
        result.expenses_examined = len(claims)
        findings.extend(_expense_rules(claims, claim_history))

    _persist(db, tenant_id, findings, result)

    # P2-16: new flags on ledger documents are held for review, and finance
    # managers are told (FRAUD_REVIEW_REQUIRED).
    from app.modules.ai.fraud_hold import place_holds

    result.flags_held = len(place_holds(db, tenant_id, result.created))
    return result


__all__ = [
    "MAX_RISK_SCORE",
    "RULE_WEIGHTS",
    "ScanResult",
    "cap_score",
    "mean_and_sigma",
    "normalise_bill_number",
    "risk_level_for",
    "sigma_outlier",
    "run_fraud_scan",
]