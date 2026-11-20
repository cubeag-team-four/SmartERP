"""Fraud risk endpoints: /api/v1/ai/fraud/*.

Three permissions, mirroring how the rest of the system splits read, act and
approve:

* ``fraud.view``  — list flags (read-only)
* ``fraud.scan``  — run the deterministic rules
* ``fraud.review`` — move a flag through the review lifecycle

Each endpoint derives the tenant from the verified access token, so there is no
parameter by which a caller could read or scan another company. Detection is
pure arithmetic in :mod:`app.modules.ai.fraud`; no AI provider is involved, so
scanning costs nothing and cannot be degraded by an upstream outage.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.dependencies import DBSession
from app.models.fraud import FlagStatus, RiskLevel
from app.models.user import User
from app.modules.ai.audit import (
    AI_FRAUD_FLAG_REVIEWED,
    AI_FRAUD_SCANNED,
    ENTITY_FRAUD,
    safe_metadata,
)
from app.modules.ai.fraud import run_fraud_scan
from app.modules.ai.fraud_service import apply_review, list_flags, rule_catalogue, scan_out
from app.modules.audit.service import record_audit
from app.modules.auth.dependencies import require_permission
from app.schemas.fraud import (
    FlagList,
    FlagOut,
    FlagUpdate,
    HoldDecision,
    RuleInfo,
    ScanRequest,
    ScanResultOut,
)

router = APIRouter(prefix="/ai/fraud", tags=["Fraud Risk"])

MAX_FLAG_ITEMS = 100


@router.post("/scan", response_model=ScanResultOut)
def scan(
    payload: ScanRequest,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.scan"))],
) -> ScanResultOut:
    """Run the deterministic risk rules over this tenant's recent transactions.

    The response reports what was examined and which review flags were raised.
    ``automatic_determination_made`` is always false: the scan identifies
    transactions worth a human look, and a reviewer makes the call.
    """
    result = run_fraud_scan(
        db,
        actor.tenant_id,
        days=payload.days,
        include_payments=payload.include_payments,
        include_stock=payload.include_stock,
        include_bills=payload.include_bills,
        include_expenses=payload.include_expenses,
    )

    message = (
        f"Examined {result.examined} transaction(s) and raised "
        f"{result.flags_created} new risk flag(s) requiring review. "
        f"{result.flags_skipped_existing} already had an open flag. "
        "No automatic fraud determination is made."
    )

    record_audit(
        db,
        action=AI_FRAUD_SCANNED,
        entity_type=ENTITY_FRAUD,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        description="Deterministic fraud risk scan executed",
        # Counts and rules only — never amounts, notes or customer data.
        metadata=safe_metadata(
            outcome="flags_raised" if result.flags_created else "no_new_flags",
            days=payload.days,
            examined=result.examined,
            flags_created=result.flags_created,
            flags_skipped_existing=result.flags_skipped_existing,
        ),
    )
    # A scan raises risk flags, so the flags and the audit row describing the run
    # are published by one commit — the trail can never claim a scan that raised
    # nothing, nor omit a scan that did.
    db.commit()

    return scan_out(result, message)


@router.get("/flags", response_model=FlagList)
def flags(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.view"))],
    status: Annotated[FlagStatus | None, Query(description="OPEN|REVIEWING|RESOLVED|DISMISSED")] = None,
    risk_level: Annotated[RiskLevel | None, Query(description="LOW|MEDIUM|HIGH|CRITICAL")] = None,
    entity_type: Annotated[
        str | None, Query(description="payment|vendor_payment|stock_adjustment")
    ] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_FLAG_ITEMS)] = 20,
) -> FlagList:
    """Risk flags for the caller's tenant, newest first."""
    return list_flags(
        db,
        actor.tenant_id,
        status=status.value if status else None,
        risk_level=risk_level.value if risk_level else None,
        entity_type=entity_type,
        limit=limit,
    )


@router.get("/rules", response_model=list[RuleInfo])
def rules(actor: Annotated[User, Depends(require_permission("fraud.view"))]) -> list[RuleInfo]:
    """The fixed rule weights, so the scoring is transparent rather than opaque."""
    return rule_catalogue()


@router.patch("/flags/{flag_id}", response_model=FlagOut)
def review_flag(
    flag_id: uuid.UUID,
    payload: FlagUpdate,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.review"))],
) -> FlagOut:
    """Move a risk flag along the review lifecycle.

    Requires ``fraud.review`` — a user who can only *see* flags cannot resolve or
    dismiss them. Invalid transitions are rejected with a 400, and the score,
    level and reason are immutable, so the evidence behind a decision survives it.
    """
    from app.modules.ai.fraud_service import get_flag

    before = get_flag(db, actor.tenant_id, flag_id).status
    flag = apply_review(db, actor.tenant_id, flag_id, payload, actor.id)

    record_audit(
        db,
        action=AI_FRAUD_FLAG_REVIEWED,
        entity_type=ENTITY_FRAUD,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        entity_id=flag.id,
        description="Risk flag moved through review",
        # Classification only: no reviewer note text and no transaction amounts.
        metadata=safe_metadata(
            outcome="reviewed",
            from_status=before,
            to_status=flag.status,
            rule_code=flag.rule_code,
            entity_type=flag.entity_type,
            risk_level=flag.risk_level,
        ),
    )
    # The review decision and the audit row recording it commit together.
    db.commit()

    from app.modules.ai.fraud_service import _to_out

    return _to_out(flag)


# ------------------------------------------------------------ P2-16 holds


@router.get("/holds", response_model=list[FlagOut])
def held_flags(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.view"))],
    limit: Annotated[int, Query(ge=1, le=MAX_FLAG_ITEMS)] = 100,
) -> list[FlagOut]:
    """The review queue: flags whose transaction is held out of the statements."""
    from sqlalchemy import select

    from app.models.fraud import FraudFlag, HoldStatus
    from app.modules.ai.fraud_service import _to_out

    rows = db.scalars(
        select(FraudFlag)
        .where(
            FraudFlag.tenant_id == actor.tenant_id,
            FraudFlag.hold_status == HoldStatus.PENDING_REVIEW.value,
        )
        .order_by(FraudFlag.created_at.asc(), FraudFlag.id)
        .limit(limit)
    ).all()
    return [_to_out(flag) for flag in rows]


def _release(db, actor: User, flag_id: uuid.UUID, payload: HoldDecision, confirm: bool) -> FlagOut:
    from app.modules.ai.fraud_hold import release_hold
    from app.modules.ai.fraud_service import _to_out

    try:
        flag = release_hold(
            db, actor.tenant_id, flag_id, confirm=confirm, note=payload.note, actor_id=actor.id
        )
    except Exception:
        db.rollback()
        raise
    db.commit()
    db.refresh(flag)
    return _to_out(flag)


@router.post("/flags/{flag_id}/clear", response_model=FlagOut)
def clear_hold(
    flag_id: uuid.UUID,
    payload: HoldDecision,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.hold.release"))],
) -> FlagOut:
    """False positive: the flag is DISMISSED and the transaction returns to the statements."""
    return _release(db, actor, flag_id, payload, confirm=False)


@router.post("/flags/{flag_id}/confirm", response_model=FlagOut)
def confirm_hold(
    flag_id: uuid.UUID,
    payload: HoldDecision,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("fraud.hold.release"))],
) -> FlagOut:
    """Concern upheld: the flag is RESOLVED and the hold released.

    The statements then report what the books hold; the document is corrected
    through its own cancellation / reversal, which nets its posting to zero.
    """
    return _release(db, actor, flag_id, payload, confirm=True)


__all__ = ["router"]