"""Project milestone delay-risk assessment (Module 9, FR-M9-05).

The SRS asks to "predict milestone delay risk from task-completion velocity vs
plan" and "surface milestones that are at risk". This module does exactly that
and nothing more, with plain arithmetic over rows the Project module already
stores.

What it is
----------
For each milestone it compares two things that already exist as columns:

* **expected progress** — how far through its own planned window today is, from
  ``planned_start_date`` and ``planned_end_date``;
* **actual progress** — the share of its tasks that are ``COMPLETED``.

The gap between them is the schedule signal. A milestone 60% through its planned
window with 10% of its tasks done is behind; the same milestone with 70% done is
not. No dates, weights, hours or percentages are invented.

Effort signal
-------------
The schedule gap says *that* a milestone is behind but not *why*, and approved
timesheets already record the most common why: the work is costing more hours than
was estimated for it. So each milestone also reports, from the same rows:

* **planned effort** — the sum of its tasks' own ``estimated_hours``;
* **approved effort** — approved timesheet hours logged against those tasks;
* the variance between them, in hours and as a percentage, and whether that variance
  has crossed a stated threshold.

This is a second, independent observation of the same data feeding the *same*
milestone risk assessment — not a separate feature and not a separate screen. A
milestone whose approved effort has run materially past its own estimate is reported
at a higher risk level even when its task-completion share still looks healthy,
because "80% of the tasks are done but 130% of the hours are spent" is exactly the
case the completion share alone would call fine.

What it is **not**
-----------------
* It is **not** a trained model and it emits **no probability**. Nothing in this
  codebase trains, loads or simulates machine learning, so ``risk_score`` is a
  documented deterministic heuristic indicator in ``0.0..1.0`` and
  ``is_trained_model`` is fixed at ``False``.
* It does not predict a delay *date*. It reports how far behind plan a milestone
  is today, which is what the SRS asks for.
* It writes nothing: no project, milestone, task or timesheet row is modified, no
  status is changed, and no notification or background job is created. In particular
  it never approves a timesheet, changes an hour, prices anything, or alters a plan.
  It is advisory, and the advisory nature is stated in the response itself.
* It does not invent a plan. A milestone whose tasks carry no estimates reports
  ``planned_effort_hours`` as ``None`` and every effort field that needs it as
  ``None`` too, rather than assuming zero effort was planned.

Honesty rules
-------------
* A milestone with no planned window, or with no tasks attached, cannot be
  assessed and is reported ``INSUFFICIENT_DATA`` with a reason — never a
  fabricated score.
* Cancelled tasks are excluded from the denominator: they are no longer planned
  work, so counting them would understate completion.
* Effort is only read from **APPROVED** timesheets, for the same reason the rest of
  the module reads only approved hours: submitted work has not been accepted and
  cancelled or rejected work was refused or withdrawn.
"""

import uuid
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.money import ONE_HUNDRED, percent
from app.models.project import (
    APPROVED_TIMESHEET_STATUS,
    Project,
    ProjectMilestone,
    ProjectTask,
    ProjectTaskStatus,
    ProjectTimesheet,
)

# ---------------------------------------------------------------- constants

#: Progress is reported as a share in 0.0..1.0 at four decimals — enough to
#: separate 33% from 33.33%, not so much that it implies precision the data
#: does not carry.
PROGRESS_STEP = Decimal("0.0001")

ZERO = Decimal("0")

RISK_LOW = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"
RISK_INSUFFICIENT = "INSUFFICIENT_DATA"

SUFFICIENCY_SUFFICIENT = "SUFFICIENT"
SUFFICIENCY_INSUFFICIENT = "INSUFFICIENT"

#: Gap (expected minus actual) at or above which a milestone is called at risk.
#: Stated thresholds of a documented heuristic, not a fitted distribution; the
#: response always reports the raw gap so a reader can disagree with them.
MEDIUM_RISK_GAP = Decimal("0.25")
HIGH_RISK_GAP = Decimal("0.50")

#: Statuses that still count as planned work. Anything else (today CANCELLED)
#: leaves the denominator rather than counting as unfinished.
PLANNED_TASK_STATUSES = frozenset(
    {
        ProjectTaskStatus.TODO.value,
        ProjectTaskStatus.IN_PROGRESS.value,
        ProjectTaskStatus.BLOCKED.value,
        ProjectTaskStatus.COMPLETED.value,
    }
)

METHOD = "planned_window_vs_task_completion"
IS_TRAINED_MODEL = False
SCORE_DISCLAIMER = (
    "risk_score is a deterministic heuristic indicator (0.0-1.0) computed from the "
    "gap between planned-window progress and completed-task share. It is not a "
    "delay probability and not the output of a trained model."
)

# ---------------------------------------------------------------- effort signal
#
# The same assessment, widened with the one thing approved timesheets record that
# task status does not: how many hours the work actually took.

#: Names the effort signal, so a client can tell which observation produced a
#: figure instead of having to infer it from the field names.
EFFORT_METHOD = "task_estimate_vs_approved_timesheet_hours"

#: Share of a milestone's own estimate at which approved effort is called an overrun.
#: Stated thresholds of a documented heuristic, not a fitted distribution; the raw
#: variance is always reported beside them so a reader can disagree.
MEDIUM_EFFORT_OVERRUN = Decimal("0.25")
HIGH_EFFORT_OVERRUN = Decimal("0.50")

EFFORT_DISCLAIMER = (
    "The effort signal compares approved timesheet hours against the tasks' own "
    "estimated_hours. It is advisory: this endpoint reads and reports, and never "
    "approves a timesheet, changes hours, prices them, or alters a plan or a budget."
)


def _ratio(numerator: Decimal, denominator: Decimal) -> Decimal:
    """Share of ``denominator``, to four decimals, half-up."""
    if denominator <= ZERO:
        return ZERO
    return (numerator / denominator).quantize(PROGRESS_STEP, rounding=ROUND_HALF_UP)


def _effort(tasks: list["ProjectTask"], approved: Mapping[uuid.UUID, Decimal]):
    """Planned and approved effort for a milestone's tasks.

    Returns ``(planned_hours, approved_hours, variance, variance_percent, overrun)``.

    ``planned_hours`` is ``None`` when the tasks carry no estimate at all, and the
    three variance figures follow it to ``None``: a milestone nobody estimated has no
    plan to overrun, and reporting zero would say "exactly on plan" about a plan that
    does not exist.

    ``approved_hours`` is always a measured figure — it is a sum over real rows, and
    zero is a real answer (nobody has logged approved time yet), not an absence.
    """
    planned = sum((task.estimated_hours for task in tasks), ZERO)
    approved_hours = sum(
        (approved.get(task.id, ZERO) for task in tasks), ZERO
    )

    if planned <= ZERO:
        return None, approved_hours, None, None, False

    variance = approved_hours - planned
    overrun_share = _ratio(variance, planned)
    overrun = overrun_share >= MEDIUM_EFFORT_OVERRUN
    return (
        planned,
        approved_hours,
        variance,
        percent(overrun_share * ONE_HUNDRED),
        overrun,
    )
# ------------------------------------------------------------------ evidence


@dataclass(frozen=True)
class MilestoneEvidence:
    """One observed fact behind a risk level. Recorded data, not inference."""

    code: str
    label: str
    value: str
    observation: str


@dataclass(frozen=True)
class MilestoneRisk:
    """The delay-risk reading for one milestone."""

    milestone_id: uuid.UUID
    milestone_name: str
    milestone_status: str
    planned_start_date: date | None
    planned_end_date: date | None

    planned_days: int | None = None
    elapsed_days: int | None = None
    total_tasks: int | None = None
    completed_tasks: int | None = None

    expected_progress: Decimal | None = None
    actual_progress: Decimal | None = None
    #: expected_progress - actual_progress. Positive means behind plan.
    progress_gap: Decimal | None = None
    overdue: bool = False

    # --- effort signal -------------------------------------------------------
    planned_effort_hours: Decimal | None = None
    approved_effort_hours: Decimal = ZERO
    effort_variance_hours: Decimal | None = None
    effort_variance_percent: Decimal | None = None
    effort_overrun: bool = False

    risk_level: str = RISK_INSUFFICIENT
    risk_score: Decimal | None = None
    data_sufficiency: str = SUFFICIENCY_INSUFFICIENT
    reason: str | None = None
    evidence: list[MilestoneEvidence] = field(default_factory=list)


@dataclass(frozen=True)
class ProjectRisk:
    """Every milestone reading for one project."""

    project_id: uuid.UUID
    project_code: str
    project_name: str
    project_status: str
    assessed_on: date
    milestones: list[MilestoneRisk] = field(default_factory=list)

    @property
    def at_risk_milestones(self) -> list[MilestoneRisk]:
        """Milestones flagged MEDIUM or HIGH, worst gap first."""
        flagged = [m for m in self.milestones if m.risk_level in (RISK_HIGH, RISK_MEDIUM)]
        return sorted(flagged, key=lambda m: (-(m.progress_gap or ZERO), m.milestone_name))



@dataclass(frozen=True)
class ProjectRiskReport:
    """The tenant-wide answer: one entry per project that was assessed."""

    assessed_on: date
    method: str
    effort_method: str
    is_trained_model: bool
    score_disclaimer: str
    effort_disclaimer: str
    projects: list[ProjectRisk] = field(default_factory=list)


# ------------------------------------------------------------------ the maths


def assess_milestone(
    milestone: ProjectMilestone,
    tasks: list[ProjectTask],
    today: date,
    approved_hours_by_task: Mapping[uuid.UUID, Decimal] | None = None,
) -> MilestoneRisk:
    """Assess one milestone's delay risk against its own plan and its tasks.

    ``tasks`` is every task row pointing at this milestone; cancelled ones are
    dropped here. ``approved_hours_by_task`` maps task id to approved timesheet hours
    and is optional so the schedule assessment can be computed on its own — a
    milestone with no effort signal available is still assessed on schedule, and
    simply reports no effort figures.

    The function is pure arithmetic over its arguments — the only clock it consults
    is the injected ``today`` — so the same data always yields the same reading.
    """
    planned_tasks = [task for task in tasks if task.status in PLANNED_TASK_STATUSES]
    completed = sum(
        1 for task in planned_tasks if task.status == ProjectTaskStatus.COMPLETED.value
    )

    approved = approved_hours_by_task or {}
    (
        planned_effort,
        approved_effort,
        effort_variance,
        effort_variance_percent,
        effort_overrun,
    ) = _effort(planned_tasks, approved)

    def insufficient(reason: str) -> MilestoneRisk:
        return MilestoneRisk(
            milestone_id=milestone.id,
            milestone_name=milestone.name,
            milestone_status=milestone.status,
            planned_start_date=milestone.planned_start_date,
            planned_end_date=milestone.planned_end_date,
            risk_level=RISK_INSUFFICIENT,
            risk_score=None,
            data_sufficiency=SUFFICIENCY_INSUFFICIENT,
            reason=reason,
            evidence=[],
        )

    if milestone.planned_start_date is None or milestone.planned_end_date is None:
        return insufficient(
            "Milestone has no planned start and end date, so there is no plan to "
            "compare progress against."
        )

    if not planned_tasks:
        return insufficient(
            "No tasks are assigned to this milestone, so its completion velocity "
            "is unknown."
        )

    start = milestone.planned_start_date
    end = milestone.planned_end_date
    # Inclusive day count: a milestone planned for a single day is one day long,
    # not zero, which would make the expected-progress division impossible.
    planned_days = (end - start).days + 1
    # Clamped: before the window opens nothing is expected, after it closes
    # everything is. Elapsed time cannot exceed the plan without the plan mattering.
    elapsed_days = max(0, min((today - start).days + 1, planned_days))

    expected = _ratio(Decimal(elapsed_days), Decimal(planned_days))
    actual = _ratio(Decimal(completed), Decimal(len(planned_tasks)))
    gap = (expected - actual).quantize(PROGRESS_STEP, rounding=ROUND_HALF_UP)
    overdue = today > end

    # A milestone past its planned end date that is not finished is behind by
    # definition, whatever the gap arithmetic says, so it is escalated rather
    # than averaged away.
    if overdue and completed < len(planned_tasks):
        level = RISK_HIGH
    elif gap >= HIGH_RISK_GAP:
        level = RISK_HIGH
    elif gap >= MEDIUM_RISK_GAP:
        level = RISK_MEDIUM
    else:
        level = RISK_LOW

    # The effort signal can only ever raise the level, never lower it, and only when
    # the milestone has a plan of its own to have overrun. A task-completion share
    # that still looks healthy does not excuse work that has cost materially more
    # hours than was estimated for it — that combination is the one the completion
    # share alone would report as fine.
    if effort_overrun:
        overrun_share = _ratio(effort_variance or ZERO, planned_effort or ZERO)
        if level == RISK_LOW:
            level = RISK_MEDIUM
        if overrun_share >= HIGH_EFFORT_OVERRUN:
            level = RISK_HIGH

    evidence = [
        MilestoneEvidence(
            code="planned_window",
            label="Planned window",
            value=f"{start.isoformat()} to {end.isoformat()}",
            observation=f"{planned_days} planned day(s) in total.",
        ),
        MilestoneEvidence(
            code="elapsed_planned_days",
            label="Elapsed planned days",
            value=str(elapsed_days),
            observation=(
                f"{elapsed_days} of {planned_days} planned day(s) have elapsed as of "
                f"{today.isoformat()}."
            ),
        ),
        MilestoneEvidence(
            code="expected_progress",
            label="Expected progress",
            value=str(expected),
            observation="Share of the planned window that has elapsed.",
        ),
        MilestoneEvidence(
            code="task_progress",
            label="Completed tasks",
            value=f"{completed}/{len(planned_tasks)}",
            observation=(
                f"{completed} of {len(planned_tasks)} planned task(s) are COMPLETED; "
                "cancelled tasks are excluded."
            ),
        ),
        MilestoneEvidence(
            code="progress_gap",
            label="Progress gap",
            value=str(gap),
            observation="Expected minus actual. Positive means the milestone is behind plan.",
        ),
        MilestoneEvidence(
            code="planned_end_passed",
            label="Planned end date passed",
            value=str(overdue),
            observation=(
                "The planned end date is in the past and work is still incomplete."
                if overdue
                else "The milestone has not passed its planned end date."
            ),
        ),
        # The effort signal, quoted with the same discipline: a recorded figure or an
        # explicit statement that there is no plan to compare against.
        MilestoneEvidence(
            code="planned_effort",
            label="Planned effort",
            value="none" if planned_effort is None else str(planned_effort),
            observation=(
                "No task on this milestone carries an estimate, so there is no planned "
                "effort to compare approved hours against."
                if planned_effort is None
                else "Sum of the milestone's task estimates."
            ),
        ),
        MilestoneEvidence(
            code="approved_effort",
            label="Approved effort",
            value=str(approved_effort),
            observation=(
                "Approved timesheet hours logged against this milestone's tasks. "
                "Submitted, rejected and cancelled entries are excluded."
            ),
        ),
        MilestoneEvidence(
            code="effort_variance",
            label="Effort variance",
            value="n/a" if effort_variance is None else str(effort_variance),
            observation=(
                "Approved effort minus planned effort. Positive means the work is "
                "costing more hours than was estimated."
                if effort_variance is not None
                else "No planned effort, so no effort variance can be computed."
            ),
        ),
        MilestoneEvidence(
            code="effort_variance_percent",
            label="Effort variance %",
            value="n/a" if effort_variance_percent is None else str(effort_variance_percent),
            observation=(
                "Effort variance as a share of the milestone's planned effort."
                if effort_variance_percent is not None
                else "No planned effort, so the variance has nothing to be a share of."
            ),
        ),
        MilestoneEvidence(
            code="effort_overrun",
            label="Effort overrun",
            value=str(effort_overrun),
            observation=(
                f"Approved effort has passed {MEDIUM_EFFORT_OVERRUN} of the planned "
                "estimate, which raises the reported risk level."
                if effort_overrun
                else "Approved effort is not materially above the planned estimate."
            ),
        ),
    ]

    reason = (
        f"{level}: {expected} of the planned window has elapsed but only "
        f"{actual} of the milestone's tasks are complete."
    )
    if effort_overrun and effort_variance is not None:
        reason = (
            f"{reason} Approved effort is also {effort_variance}h "
            f"({effort_variance_percent}%) above the {planned_effort}h planned."
        )

    return MilestoneRisk(
        milestone_id=milestone.id,
        milestone_name=milestone.name,
        milestone_status=milestone.status,
        planned_start_date=start,
        planned_end_date=end,
        planned_days=planned_days,
        elapsed_days=elapsed_days,
        total_tasks=len(planned_tasks),
        completed_tasks=completed,
        expected_progress=expected,
        actual_progress=actual,
        progress_gap=gap,
        overdue=overdue,
        planned_effort_hours=planned_effort,
        approved_effort_hours=approved_effort,
        effort_variance_hours=effort_variance,
        effort_variance_percent=effort_variance_percent,
        effort_overrun=effort_overrun,
        risk_level=level,
        # Clamped at zero: running ahead of plan is not schedule risk.
        risk_score=max(ZERO, gap).quantize(PROGRESS_STEP, rounding=ROUND_HALF_UP),
        data_sufficiency=SUFFICIENCY_SUFFICIENT,
        reason=reason,
        evidence=evidence,
    )


def project_risk_report(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    project_id: uuid.UUID | None = None,
    today: date | None = None,
) -> ProjectRiskReport:
    """Assess this tenant's milestones, or one project's, without writing.

    ``tenant_id`` comes from the verified access token in the router and is never
    read from the request, so there is no parameter by which a caller could assess
    another company's projects. Naming a ``project_id`` that belongs to another
    tenant raises the same 404 as the project endpoints, so its existence stays
    hidden.

    ``today`` is injectable so an assessment is reproducible in a test rather than
    depending on the day it happens to run.
    """
    # Imported here rather than at module scope: importing the Project service at
    # module load would pull the project module into every AI request, including
    # ones that never touch projects.
    from app.modules.project.service import get_project

    as_of = today or date.today()

    if project_id is not None:
        # Reuse the project service's tenant-scoped lookup rather than
        # re-implementing isolation here.
        get_project(db, tenant_id, project_id)
        stmt = select(Project).where(
            Project.tenant_id == tenant_id,
            Project.id == project_id,
            Project.deleted_at.is_(None),
        )
    else:
        stmt = select(Project).where(
            Project.tenant_id == tenant_id, Project.deleted_at.is_(None)
        )

    projects = list(db.scalars(stmt.order_by(Project.project_code)).all())
    if not projects:
        return ProjectRiskReport(
            assessed_on=as_of,
            method=METHOD,
            effort_method=EFFORT_METHOD,
            is_trained_model=IS_TRAINED_MODEL,
            score_disclaimer=SCORE_DISCLAIMER,
            effort_disclaimer=EFFORT_DISCLAIMER,
            projects=[],
        )

    project_ids = [project.id for project in projects]
    milestones = list(
        db.scalars(
            select(ProjectMilestone)
            .where(
                ProjectMilestone.tenant_id == tenant_id,
                ProjectMilestone.project_id.in_(project_ids),
            )
            .order_by(ProjectMilestone.project_id, ProjectMilestone.sequence_number)
        ).all()
    )
    tasks = list(
        db.scalars(
            select(ProjectTask).where(
                ProjectTask.tenant_id == tenant_id,
                ProjectTask.project_id.in_(project_ids),
            )
        ).all()
    )

    # One read of approved hours for every task in scope, then handed to the
    # assessment. APPROVED only, and tenant-scoped — the same rule and the same
    # scope every other approved-hours reader in the module applies, so this
    # endpoint cannot report a different notion of approved effort.
    approved_by_task: dict[uuid.UUID, Decimal] = {}
    task_ids = [task.id for task in tasks]
    if task_ids:
        hour_rows = db.execute(
            select(ProjectTimesheet.task_id, func.sum(ProjectTimesheet.hours)).where(
                ProjectTimesheet.tenant_id == tenant_id,
                ProjectTimesheet.status == APPROVED_TIMESHEET_STATUS,
                ProjectTimesheet.task_id.in_(task_ids),
            ).group_by(ProjectTimesheet.task_id)
        ).all()
        approved_by_task = {row[0]: Decimal(str(row[1])) for row in hour_rows}

    # Only tasks naming a milestone join the assessment: a task without one belongs
    # to the project but to no checkpoint, so it has no planned window to miss.
    tasks_by_milestone: dict[uuid.UUID, list[ProjectTask]] = {}
    for task in tasks:
        if task.milestone_id is not None:
            tasks_by_milestone.setdefault(task.milestone_id, []).append(task)

    assessments = [
        ProjectRisk(
            project_id=project.id,
            project_code=project.project_code,
            project_name=project.name,
            project_status=project.status,
            assessed_on=as_of,
            milestones=[
                assess_milestone(
                    milestone, tasks_by_milestone.get(milestone.id, []), as_of, approved_by_task
                )
                for milestone in milestones
                if milestone.project_id == project.id
            ],
        )
        for project in projects
    ]

    return ProjectRiskReport(
        assessed_on=as_of,
        method=METHOD,
        effort_method=EFFORT_METHOD,
        is_trained_model=IS_TRAINED_MODEL,
        score_disclaimer=SCORE_DISCLAIMER,
        effort_disclaimer=EFFORT_DISCLAIMER,
        projects=assessments,
    )


__all__ = [
    "EFFORT_DISCLAIMER",
    "EFFORT_METHOD",
    "HIGH_EFFORT_OVERRUN",
    "HIGH_RISK_GAP",
    "MEDIUM_EFFORT_OVERRUN",
    "MEDIUM_RISK_GAP",
    "METHOD",
    "RISK_HIGH",
    "RISK_INSUFFICIENT",
    "RISK_LOW",
    "RISK_MEDIUM",
    "SCORE_DISCLAIMER",
    "MilestoneEvidence",
    "MilestoneRisk",
    "ProjectRisk",
    "ProjectRiskReport",
    "assess_milestone",
    "project_risk_report",
]
