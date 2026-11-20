"""Manufacturing AI endpoint: /api/v1/ai/machine-failure-risk.

FR-M6-05 asks for "AI machine failure prediction and proactive maintenance work
orders". This module delivers the first half honestly and defers the second.

What it is
----------
A **deterministic risk assessment** over the downtime evidence this ERP already
records. The scoring is pure arithmetic in :mod:`app.modules.ai.maintenance`, so
the endpoint costs no AI provider call, cannot be degraded by an upstream outage
and returns the same answer for the same data every time.

What it is **not**
-----------------
It is not a trained predictive model and it emits no failure probability. No
machine-learning model is trained, loaded or simulated anywhere in this codebase,
because the system holds no sensor or telemetry history to train one on. The
response says so explicitly, on every call, via ``is_trained_model`` and
``score_disclaimer``.

Maintenance work orders — deferred, deliberately
-----------------------------------------------
A ``POST .../maintenance`` action is **not** implemented. The reason is a
property of the existing data model, not a shortcut:

* :class:`~app.models.workorder.WorkOrder` requires ``bom_version_id`` and
  ``product_id`` (``NOT NULL``), and ``validate_bom_version`` rejects a BOM
  version with no components;
* releasing a work order reserves that BOM's raw material through the Inventory
  service, and completion issues it.

A maintenance job therefore cannot be represented without attaching a
manufacturing BOM to it, which would silently consume production material and
misreport spare parts as production consumption. Making that work would require
relaxing the Work Order invariants and reworking the release/material lifecycle
— precisely the redesign this task must not perform.

So the endpoint returns an explicit ``PROACTIVE_MAINTENANCE_RECOMMENDED``
recommendation and reports ``maintenance_work_order_created = false``. Creating
a maintenance work order is a genuine follow-up piece of work, not a workaround.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.common.dependencies import DBSession
from app.models.user import User
from app.modules.ai.audit import AI_MACHINE_RISK_ASSESSED, ENTITY_MAINTENANCE, safe_metadata
from app.modules.ai.maintenance import (
    DEFAULT_LOOKBACK_DAYS,
    MAX_LOOKBACK_DAYS,
    MIN_LOOKBACK_DAYS,
    SCORE_DISCLAIMER,
    assess_failure_risk,
)
from app.modules.audit.service import record_audit
from app.modules.auth.dependencies import require_permission
from app.schemas.maintenance import MachineFailureRisk, RiskEvidence, RiskIndicator

router = APIRouter(prefix="/ai", tags=["Manufacturing AI"])

#: Permission guarding the risk assessment. Deliberately separate from the
#: generic ``ai.use``: reading a maintenance risk assessment is a manufacturing
#: judgement, not a general AI capability, so it is granted through the same
#: manufacturing permission family as the rest of Module 6.
FAILURE_RISK_PERMISSION = "manufacturing.ai.failure_risk.view"


def _out(assessment) -> MachineFailureRisk:
    """Map the engine's dataclasses onto the API schema."""
    return MachineFailureRisk(
        machine_id=assessment.machine_id,
        machine_code=assessment.machine_code,
        machine_status=assessment.machine_status,
        lookback_days=assessment.lookback_days,
        period_start=assessment.period_start,
        period_end=assessment.period_end,
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        data_sufficiency=assessment.data_sufficiency,
        is_trained_model=assessment.is_trained_model,
        score_disclaimer=SCORE_DISCLAIMER,
        explanation=assessment.explanation,
        evidence=[
            RiskEvidence(
                code=item.code,
                label=item.label,
                value=item.value,
                unit=item.unit,
                observation=item.observation,
            )
            for item in assessment.evidence
        ],
        indicators=[
            RiskIndicator(
                code=item.code,
                label=item.label,
                normalised=item.normalised,
                weight=item.weight,
                detail=item.detail,
            )
            for item in assessment.indicators
        ],
        recommended_action=assessment.recommended_action,
        # Explicit and permanent: this endpoint never writes.
        maintenance_work_order_created=False,
        maintenance_work_order_id=None,
    )


@router.get("/machine-failure-risk", response_model=MachineFailureRisk)
def machine_failure_risk(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission(FAILURE_RISK_PERMISSION))],
    machine_id: Annotated[uuid.UUID, Query(description="Machine to assess")],
    lookback_days: Annotated[
        int,
        Query(
            ge=MIN_LOOKBACK_DAYS,
            le=MAX_LOOKBACK_DAYS,
            description=f"Evidence window in days ({MIN_LOOKBACK_DAYS}-{MAX_LOOKBACK_DAYS})",
        ),
    ] = DEFAULT_LOOKBACK_DAYS,
) -> MachineFailureRisk:
    """Assess machine-failure risk from this tenant's recorded downtime history.

    Strictly side-effect free: the assessment reads rows and returns a value. It
    writes nothing, creates no work order and contacts no AI provider, so
    repeated calls are safe by construction and can never produce duplicate
    maintenance orders.

    The tenant comes from the verified access token. A machine belonging to
    another company is a 404, so its existence stays hidden.

    When the history is too thin to support a judgement the response is
    ``risk_level = INSUFFICIENT_DATA`` with ``risk_score = null`` — never a
    guess, and never a fabricated probability.
    """
    assessment = assess_failure_risk(
        db, actor.tenant_id, machine_id, lookback_days=lookback_days
    )

    record_audit(
        db,
        action=AI_MACHINE_RISK_ASSESSED,
        entity_type=ENTITY_MAINTENANCE,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        entity_id=assessment.machine_id,
        description=(
            f"Machine failure-risk assessment: {assessment.machine_code} = "
            f"{assessment.risk_level}"
        ),
        # Identifiers, the level and an evidence summary only. The score and the
        # event count are enough to reconstruct the decision later without
        # storing anything sensitive.
        metadata=safe_metadata(
            machine_id=str(assessment.machine_id),
            machine_code=assessment.machine_code,
            lookback_days=assessment.lookback_days,
            risk_level=assessment.risk_level,
            risk_score=(
                str(assessment.risk_score) if assessment.risk_score is not None else None
            ),
            data_sufficiency=assessment.data_sufficiency,
            recommended_action=assessment.recommended_action,
            is_trained_model=assessment.is_trained_model,
        ),
    )
    # The assessment reads only, so the audit row is the whole transaction.
    db.commit()

    return _out(assessment)


__all__ = ["FAILURE_RISK_PERMISSION", "router"]