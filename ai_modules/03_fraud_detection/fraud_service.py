"""Fraud-flag query and review service.

Separated from :mod:`app.modules.ai.fraud` so the rules engine stays a pure
scorer: this module owns persistence, filtering and the review lifecycle.

Two invariants it enforces:

* **No automatic determination.** Nothing here ever sets a "confirmed fraud"
  state, because the model has no such state. Only a reviewer moves a flag, and
  only along the transitions in :data:`ALLOWED_TRANSITIONS`.
* **Tenant scoping.** Every query filters on the caller's verified ``tenant_id``,
  including the flag lookup, so a guessed UUID from another tenant is simply
  not found.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.exceptions import NotFoundException, UnprocessableEntityException
from app.models.fraud import ACTIVE_FLAG_STATUSES, FlagStatus, FraudFlag, RiskLevel
from app.schemas.fraud import FlagList, FlagOut, FlagUpdate, RuleInfo, ScanResultOut

#: The only status changes a reviewer may make. Deliberately explicit: an
#: unreviewed flag cannot jump straight to RESOLVED, so a decision is always the
#: result of an actual review, and a terminal flag can never be reopened.
ALLOWED_TRANSITIONS: dict[FlagStatus, set[FlagStatus]] = {
    FlagStatus.OPEN: {FlagStatus.REVIEWING},
    FlagStatus.REVIEWING: {FlagStatus.RESOLVED, FlagStatus.DISMISSED},
    FlagStatus.RESOLVED: set(),
    FlagStatus.DISMISSED: set(),
}


def _to_out(flag: FraudFlag) -> FlagOut:
    return FlagOut(
        id=flag.id,
        tenant_id=flag.tenant_id,
        entity_type=flag.entity_type,
        entity_id=flag.entity_id,
        rule_code=flag.rule_code,
        risk_score=flag.risk_score,
        risk_level=flag.risk_level,
        reason=flag.reason,
        status=flag.status,
        observed_amount=flag.observed_amount,
        review_note=flag.review_note,
        reviewed_at=flag.reviewed_at,
        reviewed_by_id=flag.reviewed_by_id,
        created_at=flag.created_at,
        hold_status=flag.hold_status,
        hold_released_at=flag.hold_released_at,
        hold_released_by_id=flag.hold_released_by_id,
    )


def _tenant_count(
    db: Session, tenant_id: uuid.UUID, *, status: str | None = None,
    risk_level: str | None = None, entity_type: str | None = None,
) -> int:
    """Count flags in the caller's tenant under the same filters as the list."""
    scope = [FraudFlag.tenant_id == tenant_id]
    if status:
        scope.append(FraudFlag.status == status)
    if risk_level:
        scope.append(FraudFlag.risk_level == risk_level)
    if entity_type:
        scope.append(FraudFlag.entity_type == entity_type)

    return int(
        db.execute(select(func.count()).select_from(FraudFlag).where(*scope)).scalar() or 0
    )


def _active_count(
    db: Session, tenant_id: uuid.UUID, risk_level: str | None = None
) -> int:
    """Count flags still awaiting a reviewer, optionally at one risk level."""
    scope = [
        FraudFlag.tenant_id == tenant_id,
        FraudFlag.status.in_(ACTIVE_FLAG_STATUSES),
    ]
    if risk_level:
        scope.append(FraudFlag.risk_level == risk_level)

    return int(
        db.execute(select(func.count()).select_from(FraudFlag).where(*scope)).scalar() or 0
    )


def list_flags(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    status: str | None = None,
    risk_level: str | None = None,
    entity_type: str | None = None,
    limit: int = 50,
) -> FlagList:
    """Flags for one tenant, newest first, with header counts.

    The counts share the tenant scope of the list, so the summary can never
    describe another company's risk.
    """
    scope = [FraudFlag.tenant_id == tenant_id]
    if status:
        scope.append(FraudFlag.status == status)
    if risk_level:
        scope.append(FraudFlag.risk_level == risk_level)
    if entity_type:
        scope.append(FraudFlag.entity_type == entity_type)

    rows = db.execute(
        select(FraudFlag)
        .where(*scope)
        .order_by(FraudFlag.created_at.desc(), FraudFlag.id.desc())
        .limit(limit)
    ).scalars().all()

    return FlagList(
        total=_tenant_count(
            db, tenant_id, status=status, risk_level=risk_level, entity_type=entity_type
        ),
        open_count=_active_count(db, tenant_id),
        high_count=_active_count(db, tenant_id, risk_level=RiskLevel.HIGH.value),
        critical_count=_active_count(db, tenant_id, risk_level=RiskLevel.CRITICAL.value),
        items=[_to_out(flag) for flag in rows],
    )


def get_flag(db: Session, tenant_id: uuid.UUID, flag_id: uuid.UUID) -> FraudFlag:
    """Fetch one flag inside the caller's tenant, or raise 404.

    Scoping by tenant here is what makes an id belonging to another tenant
    indistinguishable from one that does not exist.
    """
    flag = db.execute(
        select(FraudFlag).where(
            FraudFlag.id == flag_id, FraudFlag.tenant_id == tenant_id
        )
    ).scalar_one_or_none()

    if flag is None:
        raise NotFoundException("Risk flag not found")
    return flag


def apply_review(
    db: Session,
    tenant_id: uuid.UUID,
    flag_id: uuid.UUID,
    update: FlagUpdate,
    reviewer: uuid.UUID,
) -> FraudFlag:
    """Move a flag along the review lifecycle as an authorised reviewer.

    Only ``status`` and ``note`` are writable. The rule output — score, level and
    reason — is left exactly as the scan produced it, so the evidence behind a
    decision cannot be edited after the fact.
    """
    flag = get_flag(db, tenant_id, flag_id)

    current = FlagStatus(flag.status)
    target = update.status

    # P2-16: a held flag reaches a terminal state only through the hold release
    # endpoints (clear / confirm), which a finance manager holds; the ordinary
    # review may still move it to REVIEWING.
    from app.models.fraud import HoldStatus

    if (
        flag.hold_status == HoldStatus.PENDING_REVIEW.value
        and target in (FlagStatus.RESOLVED, FlagStatus.DISMISSED)
    ):
        raise UnprocessableEntityException(
            "This flag holds a transaction for review; clear or confirm the hold instead"
        )

    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        allowed = ", ".join(sorted(s.value for s in ALLOWED_TRANSITIONS.get(current, set())))
        detail = f" Allowed from {current.value}: {allowed}." if allowed else ""
        raise UnprocessableEntityException(
            f"A flag in {current.value} cannot move to {target.value}.{detail}"
        )

    flag.status = target.value
    flag.reviewed_by_id = reviewer
    flag.reviewed_at = datetime.now(timezone.utc)
    if update.note is not None:
        flag.review_note = update.note

    db.flush()
    return flag


def scan_out(result, message: str) -> ScanResultOut:
    """Adapt a :class:`ScanResult` into the API shape.

    ``automatic_determination_made`` is hard-coded false: the scan raises review
    flags and nothing more.
    """
    return ScanResultOut(
        payments_examined=result.payments_examined,
        adjustments_examined=result.adjustments_examined,
        bills_examined=result.bills_examined,
        expenses_examined=result.expenses_examined,
        flags_held=result.flags_held,
        examined=result.examined,
        flags_created=result.flags_created,
        flags_skipped_existing=result.flags_skipped_existing,
        requires_review=result.flags_created > 0,
        automatic_determination_made=False,
        created=[_to_out(flag) for flag in result.created],
        message=message,
    )


def rule_catalogue() -> list[RuleInfo]:
    """The fixed rule weights, so the UI can explain how a score was reached."""
    from app.modules.ai.fraud import (
        LARGE_ADJUSTMENT_ABSOLUTE,
        LARGE_PAYMENT_ABSOLUTE,
        LARGE_PAYMENT_MULTIPLE,
        RULE_WEIGHTS,
    )

    descriptions = {
        "large_payment": (
            f"Payment at or above {LARGE_PAYMENT_ABSOLUTE}, or "
            f"{LARGE_PAYMENT_MULTIPLE}x this tenant's median completed payment."
        ),
        "duplicate_payment": (
            "Another payment to the same counterparty for the same amount "
            "within the duplicate window."
        ),
        "large_stock_adjustment": (
            f"Stock adjustment at or above {LARGE_ADJUSTMENT_ABSOLUTE}, or "
            "well above this product's median adjustment."
        ),
        "rapid_repeated_transaction": (
            "Three or more identical payments inside a 24-hour window."
        ),
        "vendor_amount_outlier": (
            "Vendor payment above mean + 3 sigma of that vendor's earlier payments "
            "(at least 5 of them)."
        ),
        "duplicate_vendor_bill": (
            "Another live bill of the same vendor with the same supplier invoice number, "
            "or the same total and bill date."
        ),
        "expense_claim_outlier": (
            "Expense claim above mean + 3 sigma of the employee's (or the category's) "
            "earlier claims in that category."
        ),
        "duplicate_expense_claim": (
            "Another claim by the same employee, category, amount and date."
        ),
    }
    return [
        RuleInfo(
            rule_code=code,
            weight=weight,
            description=descriptions.get(code, ""),
        )
        for code, weight in sorted(RULE_WEIGHTS.items())
    ]


__all__ = [
    "ALLOWED_TRANSITIONS",
    "apply_review",
    "get_flag",
    "list_flags",
    "rule_catalogue",
    "scan_out",
]