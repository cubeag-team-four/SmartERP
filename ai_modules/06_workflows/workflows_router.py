"""Workflow automation endpoints: /api/v1/ai/workflows/*.

Three permissions, splitting read, act and clear:

* ``workflow.view``    — list events
* ``workflow.run``     — evaluate the workflows
* ``workflow.resolve`` — clear an event

Every endpoint derives its tenant from the verified access token, so there is no
parameter by which a caller could read or resolve another company's events.

The engine is deterministic and read-only over the business tables: it raises
alerts and never approves, rejects or otherwise acts on a transaction. No AI
provider is involved, so a run costs nothing and cannot be degraded upstream.
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select

from app.common.dependencies import DBSession
from app.common.exceptions import (
    BadRequestException,
    NotFoundException,
    UnprocessableEntityException,
)
from app.models.user import User
from app.models.workflow import AutomationEvent, EventStatus, Severity
from app.modules.ai.audit import (
    AI_WORKFLOW_EVENT_CREATED,
    AI_WORKFLOW_EVENT_RESOLVED,
    AI_WORKFLOW_RUN,
    ENTITY_WORKFLOW,
    safe_metadata,
)
from app.modules.ai.workflows import (
    ENTITY_INVOICE,
    ENTITY_SALES_ORDER,
    WORKFLOW_LARGE_TRANSACTION,
    WORKFLOW_LOW_STOCK,
    WORKFLOW_OVERDUE_RECEIVABLE,
    rule_catalogue,
    run_workflows,
)
from app.modules.audit.service import record_audit
from app.modules.auth.dependencies import has_permission, require_permission
from app.modules.auth.scope import SCOPE_ALL, RecordScope
from app.schemas.workflow import (
    EventList,
    EventOut,
    EventUpdate,
    WorkflowRuleInfo,
    WorkflowRunRequest,
    WorkflowRunResult,
)

router = APIRouter(prefix="/ai/workflows", tags=["Workflow Automation"])

MAX_EVENT_ITEMS = 100

#: Finance read that unlocks overdue-invoice events (a company-wide finance read
#: per ``auth/finance_access.py``; the same gate as invoice lists).
INVOICE_EVENT_READ = "finance.invoice.view"


def event_visibility_rules(
    *, holds_invoice_read: bool, order_scope: str | None
) -> dict[str, bool]:
    """Which event families a ``workflow.view`` caller may see -- pure (P2-06).

    Events are persisted tenant-wide by ``workflow.run`` but their message names
    the underlying document and amount, so a reader sees an event only when they
    could read that document: invoice events need the company finance read, and
    sales-order events are narrowed to the caller's ``sales.order.view`` scope
    (``scope_orders``; at ALL nothing is narrowed). Stock and purchase-order
    events carry no owner and stay visible.
    """
    return {
        "hide_invoices": not holds_invoice_read,
        "scope_orders": order_scope != SCOPE_ALL,
    }


def _event_visibility(db, actor: User) -> list:
    """SQL form of :func:`event_visibility_rules` for ``actor``."""
    from app.models.sales import SalesOrder

    record_scope = RecordScope.for_user(db, actor)
    rules = event_visibility_rules(
        holds_invoice_read=has_permission(actor, INVOICE_EVENT_READ),
        order_scope=record_scope.level("sales.order.view"),
    )
    conditions = []
    if rules["hide_invoices"]:
        conditions.append(AutomationEvent.entity_type != ENTITY_INVOICE)
    if rules["scope_orders"]:
        visible_orders = select(SalesOrder.id).where(
            SalesOrder.tenant_id == actor.tenant_id,
            *record_scope.conditions("sales.order.view"),
        )
        conditions.append(
            or_(
                AutomationEvent.entity_type != ENTITY_SALES_ORDER,
                AutomationEvent.entity_id.in_(visible_orders),
            )
        )
    return conditions


def _to_out(event: AutomationEvent) -> EventOut:
    return EventOut(
        id=event.id,
        tenant_id=event.tenant_id,
        workflow_code=event.workflow_code,
        entity_type=event.entity_type,
        entity_id=event.entity_id,
        severity=event.severity,
        message=event.message,
        status=event.status,
        resolved_at=event.resolved_at,
        resolved_by_id=event.resolved_by_id,
        created_at=event.created_at,
    )


@router.post("/run", response_model=WorkflowRunResult)
def run(
    payload: WorkflowRunRequest,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("workflow.run"))],
) -> WorkflowRunResult:
    """Evaluate the workflow conditions for the caller's tenant.

    Read-only with respect to ERP records: the only rows written are the
    automation events themselves. No transaction is approved, rejected or
    otherwise changed.
    """
    result = run_workflows(
        db,
        actor.tenant_id,
        low_stock=payload.low_stock,
        overdue_receivable=payload.overdue_receivable,
        large_transaction=payload.large_transaction,
    )

    record_audit(
        db,
        action=AI_WORKFLOW_RUN,
        entity_type=ENTITY_WORKFLOW,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        description="Deterministic workflow checks executed",
        # Counts and workflow codes only — never invoice numbers or amounts.
        metadata=safe_metadata(
            outcome="events_raised" if result.events_created else "no_new_events",
            low_stock_examined=result.low_stock_examined,
            receivables_examined=result.receivables_examined,
            documents_examined=result.documents_examined,
            events_created=result.events_created,
            events_skipped_existing=result.events_skipped_existing,
        ),
    )

    # One audit row per raised event, so the trail names which conditions fired.
    for event in result.created:
        record_audit(
            db,
            action=AI_WORKFLOW_EVENT_CREATED,
            entity_type=ENTITY_WORKFLOW,
            tenant_id=actor.tenant_id,
            user_id=actor.id,
            entity_id=event.id,
            description=f"Automation event raised: {event.workflow_code}",
            metadata=safe_metadata(
                workflow_code=event.workflow_code,
                entity_type=event.entity_type,
                severity=event.severity,
            ),
        )

    # The automation events raised by this run and the audit rows describing it
    # are published by one commit.
    db.commit()

    message = (
        f"Examined {result.examined} record(s) and raised "
        f"{result.events_created} automation event(s). "
        f"{result.events_skipped_existing} condition(s) already had an open event. "
        "No transactions were approved, rejected or modified."
    )

    return WorkflowRunResult(
        low_stock_examined=result.low_stock_examined,
        receivables_examined=result.receivables_examined,
        documents_examined=result.documents_examined,
        events_created=result.events_created,
        events_skipped_existing=result.events_skipped_existing,
        actions_taken=False,
        created=[_to_out(event) for event in result.created],
        message=message,
    )


@router.get("/events", response_model=EventList)
def events(
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("workflow.view"))],
    status: Annotated[EventStatus | None, Query(description="OPEN|RESOLVED")] = None,
    workflow_code: Annotated[
        str | None,
        Query(description="low_stock|overdue_receivable|large_transaction"),
    ] = None,
    severity: Annotated[Severity | None, Query(description="INFO|WARNING|CRITICAL")] = None,
    entity_type: Annotated[str | None, Query(description="Entity discriminator")] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_EVENT_ITEMS)] = 20,
) -> EventList:
    """Automation events for the caller's tenant, newest first.

    P2-06: events about documents the caller may not read (see
    :func:`event_visibility_rules`) are excluded from the items *and* every count.
    """
    visibility = _event_visibility(db, actor)
    scope = [AutomationEvent.tenant_id == actor.tenant_id, *visibility]
    if status:
        scope.append(AutomationEvent.status == status.value)
    if workflow_code:
        scope.append(AutomationEvent.workflow_code == workflow_code)
    if severity:
        scope.append(AutomationEvent.severity == severity.value)
    if entity_type:
        scope.append(AutomationEvent.entity_type == entity_type)

    rows = db.execute(
        select(AutomationEvent)
        .where(*scope)
        .order_by(AutomationEvent.created_at.desc(), AutomationEvent.id.desc())
        .limit(limit)
    ).scalars().all()

    def count(*extra) -> int:
        where = [
            AutomationEvent.tenant_id == actor.tenant_id,
            AutomationEvent.status == EventStatus.OPEN.value,
            *visibility,
            *extra,
        ]
        return int(
            db.execute(
                select(func.count()).select_from(AutomationEvent).where(*where)
            ).scalar()
            or 0
        )

    return EventList(
        total=int(
            db.execute(
                select(func.count()).select_from(AutomationEvent).where(*scope)
            ).scalar()
            or 0
        ),
        open_count=count(),
        low_stock_count=count(
            AutomationEvent.workflow_code == WORKFLOW_LOW_STOCK
        ),
        overdue_receivable_count=count(
            AutomationEvent.workflow_code == WORKFLOW_OVERDUE_RECEIVABLE
        ),
        large_transaction_count=count(
            AutomationEvent.workflow_code == WORKFLOW_LARGE_TRANSACTION
        ),
        critical_count=count(AutomationEvent.severity == Severity.CRITICAL.value),
        items=[_to_out(event) for event in rows],
    )


@router.get("/rules", response_model=list[WorkflowRuleInfo])
def rules(
    actor: Annotated[User, Depends(require_permission("workflow.view"))],
) -> list[WorkflowRuleInfo]:
    """The fixed triggers, so the automation is transparent rather than magic."""
    return rule_catalogue()


@router.patch("/events/{event_id}", response_model=EventOut)
def resolve_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission("workflow.resolve"))],
) -> EventOut:
    """Clear an automation event.

    Requires ``workflow.resolve`` — a user who can only *see* events cannot clear
    them. Only ``OPEN -> RESOLVED`` is allowed; events are never reopened in this
    MVP, and the severity, message and workflow code are immutable so the evidence
    behind a decision survives it.
    """
    event = db.execute(
        select(AutomationEvent).where(
            AutomationEvent.id == event_id,
            AutomationEvent.tenant_id == actor.tenant_id,
            *_event_visibility(db, actor),  # P2-06: an unreadable event is a 404
        )
    ).scalar_one_or_none()

    # A cross-tenant id is indistinguishable from one that does not exist.
    if event is None:
        raise NotFoundException("Automation event not found")

    if event.status != EventStatus.OPEN.value:
        raise UnprocessableEntityException(
            f"Only OPEN events can be resolved; this one is already {event.status}. "
            "Events cannot be reopened."
        )
    if payload.status is not EventStatus.RESOLVED:
        raise BadRequestException("An automation event can only be set to RESOLVED")

    event.status = EventStatus.RESOLVED.value
    event.resolved_at = datetime.now(timezone.utc)
    event.resolved_by_id = actor.id
    db.flush()

    record_audit(
        db,
        action=AI_WORKFLOW_EVENT_RESOLVED,
        entity_type=ENTITY_WORKFLOW,
        tenant_id=actor.tenant_id,
        user_id=actor.id,
        entity_id=event.id,
        description="Automation event resolved",
        metadata=safe_metadata(
            workflow_code=event.workflow_code,
            entity_type=event.entity_type,
            severity=event.severity,
            from_status=EventStatus.OPEN.value,
            to_status=event.status,
        ),
    )
    # The resolution and the audit row recording it commit together.
    db.commit()

    return _to_out(event)


__all__ = ["router"]