"""Hold-for-review of flagged transactions (P2-16, FR-M7-05, [§4.7 BR-3, N-1, AC-2]).

When the fraud scan raises a flag on a document that reaches the ledger, the
flag is put on hold (``hold_status = PENDING_REVIEW``). While held:

* **Statements exclude it.** :func:`held_entry_filter` is applied by
  :mod:`app.modules.finance.reports` to the profit & loss, balance sheet and
  cash-flow queries: every journal entry whose ``(reference_type,
  reference_id)`` is a held flag's ``(entity_type, entity_id)`` is left out --
  the original posting and any reversal of it alike, because they share the
  document reference. Each excluded entry is itself balanced, so excluding whole
  entries keeps the balance sheet balanced (assets = liabilities + equity) by
  construction; nothing is ever written to or removed from the ledger.
* **The trial balance still shows it**, with the held part of every account
  reported beside the totals (``held_debit`` / ``held_credit``), so the books
  stay complete and auditable while the statements are prudent.
* **The period cannot close** while a held entry is dated inside it (422,
  :func:`held_entries_in_period`).
* **Finance managers are told** (``FRAUD_REVIEW_REQUIRED``, in-app) -- the
  holders of ``fraud.hold.release``.

A finance manager then either **clears** the hold (false positive: the flag is
DISMISSED, the hold CLEARED) or **confirms** it (the concern is upheld: the flag
is RESOLVED, the hold CONFIRMED). Both release the hold: the statements report
what the books hold, and a confirmed problem is corrected through the
document's own cancellation / reversal, which nets the posting to zero. A hold
is released only through those two endpoints, never through the ordinary
review PATCH.

Entity types and journal reference types are the same strings (``payment``,
``vendor_payment``, ``vendor_bill``, ``stock_adjustment``, ``expense_claim``),
which is what lets one correlated ``EXISTS`` recognise a held entry.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.exceptions import ConflictException, UnprocessableEntityException
from app.models.finance import LEDGER_STATUSES, JournalEntry
from app.models.fraud import ACTIVE_FLAG_STATUSES, FlagStatus, FraudFlag, HoldStatus

#: Who may clear/confirm a hold, and who is told about one.
HOLD_RELEASE_PERMISSION = "fraud.hold.release"

#: Flags on these entities put a ledger document on hold. Each is also the
#: ``journal_entries.reference_type`` of that document's posting.
HOLDABLE_ENTITY_TYPES: frozenset[str] = frozenset(
    {"payment", "vendor_payment", "vendor_bill", "stock_adjustment", "expense_claim"}
)

AUDIT_HOLD_CLEARED = "FRAUD_HOLD_CLEARED"
AUDIT_HOLD_CONFIRMED = "FRAUD_HOLD_CONFIRMED"


# ------------------------------------------------------------ report filter


def held_reference_exists(tenant_id: uuid.UUID):
    """Correlated ``EXISTS``: the outer ``JournalEntry`` belongs to a held document."""
    return (
        select(FraudFlag.id)
        .where(
            FraudFlag.tenant_id == tenant_id,
            FraudFlag.hold_status == HoldStatus.PENDING_REVIEW.value,
            FraudFlag.entity_type == JournalEntry.reference_type,
            FraudFlag.entity_id == JournalEntry.reference_id,
        )
        .correlate(JournalEntry)
        .exists()
    )


def held_entry_filter(tenant_id: uuid.UUID):
    """``WHERE`` clause keeping only journal entries that are not on hold."""
    return ~held_reference_exists(tenant_id)


def held_entry_count(
    db: Session, tenant_id: uuid.UUID, from_date: date | None = None, to_date: date | None = None
) -> int:
    """Ledger entries in the range that the statements are currently excluding."""
    stmt = select(func.count()).select_from(JournalEntry).where(
        JournalEntry.tenant_id == tenant_id,
        JournalEntry.status.in_(LEDGER_STATUSES),
        held_reference_exists(tenant_id),
    )
    if from_date is not None:
        stmt = stmt.where(JournalEntry.entry_date >= from_date)
    if to_date is not None:
        stmt = stmt.where(JournalEntry.entry_date <= to_date)
    return int(db.scalar(stmt) or 0)


def held_entries_in_period(db: Session, tenant_id: uuid.UUID, start: date, end: date) -> int:
    """Held ledger entries dated inside ``[start, end]`` (the period-close gate)."""
    return held_entry_count(db, tenant_id, start, end)


def pending_hold_count(db: Session, tenant_id: uuid.UUID) -> int:
    return int(
        db.scalar(
            select(func.count()).select_from(FraudFlag).where(
                FraudFlag.tenant_id == tenant_id,
                FraudFlag.hold_status == HoldStatus.PENDING_REVIEW.value,
            )
        )
        or 0
    )


# ------------------------------------------------------------ placing holds


def place_holds(db: Session, tenant_id: uuid.UUID, flags: list[FraudFlag]) -> list[FraudFlag]:
    """Put newly raised flags on holdable documents on hold and notify finance.

    Returns the flags that were held. One in-app ``FRAUD_REVIEW_REQUIRED``
    notification per finance manager per scan (linked to the flag when there is
    just one), so a busy scan does not flood an inbox.
    """
    from app.models.notification import NotificationEvent
    from app.modules.notifications.service import notify_users, users_with_permission

    held = [
        flag
        for flag in flags
        if flag.entity_type in HOLDABLE_ENTITY_TYPES and flag.hold_status is None
    ]
    for flag in held:
        flag.hold_status = HoldStatus.PENDING_REVIEW.value
    if not held:
        return held
    db.flush()

    recipients = users_with_permission(
        db, tenant_id=tenant_id, permission_code=HOLD_RELEASE_PERMISSION
    )
    if recipients:
        single = held[0] if len(held) == 1 else None
        message = (
            f"Fraud review required: {len(held)} flagged transaction(s) are on hold and "
            "excluded from the financial statements until cleared or confirmed."
        )
        notify_users(
            db,
            tenant_id=tenant_id,
            recipient_user_ids=recipients,
            event=NotificationEvent.FRAUD_REVIEW_REQUIRED.value,
            message=message,
            entity_type="fraud_flag" if single else None,
            entity_id=single.id if single else None,
        )
    return held


# ---------------------------------------------------------- releasing holds


def release_hold(
    db: Session,
    tenant_id: uuid.UUID,
    flag_id: uuid.UUID,
    *,
    confirm: bool,
    note: str,
    actor_id: uuid.UUID,
) -> FraudFlag:
    """Clear (DISMISSED/CLEARED) or confirm (RESOLVED/CONFIRMED) a held flag."""
    from app.modules.audit.service import record_audit

    flag = db.scalars(
        select(FraudFlag)
        .where(FraudFlag.id == flag_id, FraudFlag.tenant_id == tenant_id)
        .with_for_update()
        .limit(1)
    ).first()
    if flag is None:
        from app.common.exceptions import NotFoundException

        raise NotFoundException("Risk flag not found")
    if flag.hold_status != HoldStatus.PENDING_REVIEW.value:
        raise ConflictException("This flag has no pending hold to clear or confirm")
    if flag.status not in ACTIVE_FLAG_STATUSES:
        raise ConflictException(f"This flag is already {flag.status}")
    text = (note or "").strip()
    if not text:
        raise UnprocessableEntityException("A review note is required to release a hold")

    now = datetime.now(UTC)
    flag.status = FlagStatus.RESOLVED.value if confirm else FlagStatus.DISMISSED.value
    flag.hold_status = HoldStatus.CONFIRMED.value if confirm else HoldStatus.CLEARED.value
    flag.hold_released_at = now
    flag.hold_released_by_id = actor_id
    flag.reviewed_at = now
    flag.reviewed_by_id = actor_id
    flag.review_note = text
    db.flush()
    record_audit(
        db,
        action=AUDIT_HOLD_CONFIRMED if confirm else AUDIT_HOLD_CLEARED,
        entity_type="fraud_flag",
        tenant_id=tenant_id,
        user_id=actor_id,
        entity_id=flag.id,
        description=(
            f"Fraud hold {'confirmed' if confirm else 'cleared'} on "
            f"{flag.entity_type} ({flag.rule_code})"
        ),
        metadata={
            "entity_type": flag.entity_type,
            "entity_id": str(flag.entity_id),
            "rule_code": flag.rule_code,
            "status": flag.status,
            "hold_status": flag.hold_status,
        },
        required=True,
    )
    return flag


__all__ = [
    "HOLDABLE_ENTITY_TYPES",
    "HOLD_RELEASE_PERMISSION",
    "held_entries_in_period",
    "held_entry_count",
    "held_entry_filter",
    "held_reference_exists",
    "pending_hold_count",
    "place_holds",
    "release_hold",
]
