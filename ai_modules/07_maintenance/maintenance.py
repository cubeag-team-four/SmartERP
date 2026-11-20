"""Deterministic machine-failure risk indicators (Module 6, FR-M6-05).

What this module is
-------------------
A small, transparent risk engine over the downtime evidence this ERP already
records, so a maintenance planner can see which machine deserves attention first
and *why*.

What this module is **not**
--------------------------
It is **not** a trained machine-learning model, and it does not produce a
statistically calibrated failure probability. No model was trained here, no
sensor/telemetry dataset exists in this system, and none is simulated. The
``risk_score`` this module returns is a **deterministic heuristic indicator**: a
weighted mean of explicitly normalised, publicly declared components. It ranks
machines for a human planner. It is not a probability, and nothing downstream may
treat it as one.

Determinism guarantees
----------------------
* No language model is involved. The provider is never contacted.
* Identical rows always yield an identical score, level and evidence list.
* All arithmetic uses ``Decimal`` — no binary float touches a duration.
* Every threshold and weight is a field of :data:`RISK_CONFIG`, so the whole
  calculation can be reproduced from this source alone.

Honesty about data
------------------
When the history is too thin to support any inference, the result is
``INSUFFICIENT_DATA`` with ``risk_score = None``. The engine never substitutes a
default and never scores a machine on data it does not have.
"""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.machine import DowntimeReason, Machine, MachineDowntime, MachineStatus
from app.modules.machining.service import get_machine

ZERO = Decimal("0")
ONE = Decimal("1")
SCORE_STEP = Decimal("0.01")
MINUTE_STEP = Decimal("0.01")

#: Window boundaries. Bounded like every other lookback in this codebase
#: (``fraud.HISTORY_WINDOW_DAYS``, ``forecast.MAX_HORIZON_DAYS``).
DEFAULT_LOOKBACK_DAYS = 30
MIN_LOOKBACK_DAYS = 7
MAX_LOOKBACK_DAYS = 365

# --------------------------------------------------------------- vocabulary

#: Controlled risk levels. ``INSUFFICIENT_DATA`` is a level in its own right,
#: not a synonym for LOW: it means the history cannot support a judgement.
RISK_LOW = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"
RISK_INSUFFICIENT = "INSUFFICIENT_DATA"
RISK_LEVELS = (RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_INSUFFICIENT)

#: How much history the engine needs before it will express an opinion.
DATA_SUFFICIENCY_SUFFICIENT = "SUFFICIENT_FOR_HEURISTIC"
DATA_SUFFICIENCY_LIMITED = "LIMITED_FOR_HEURISTIC"
DATA_SUFFICIENCY_INSUFFICIENT = "INSUFFICIENT"

#: Controlled recommended actions.
ACTION_NONE = "NO_ACTION_REQUIRED"
ACTION_INSPECT = "SCHEDULED_INSPECTION_RECOMMENDED"
ACTION_PROACTIVE = "PROACTIVE_MAINTENANCE_RECOMMENDED"
ACTION_COLLECT_DATA = "CONTINUE_COLLECTING_DOWNTIME_HISTORY"
ACTION_INACTIVE = "MACHINE_INACTIVE_NO_ACTION"

#: Downtime reasons indicating the machine itself is degrading, rather than the
#: line around it. ``NO_MATERIAL`` / ``NO_OPERATOR`` are supply and staffing
#: events: they cost production time but say nothing about the asset's health, so
#: they are excluded from the failure components.
FAILURE_SIGNAL_REASONS = frozenset(
    {DowntimeReason.BREAKDOWN.value, DowntimeReason.QUALITY_ISSUE.value}
)

DEGRADED_STATUSES = frozenset(
    {MachineStatus.DOWN.value, MachineStatus.MAINTENANCE.value}
)


# ------------------------------------------------------------------- config


@dataclass(frozen=True)
class RiskConfig:
    """Every threshold and weight of the heuristic, in one readable place.

    The score is ``sum(normalised * weight) / sum(weights_used)``, so it always
    lands in ``0.0..1.0`` no matter how many components had usable data.
    """

    #: Band edges on the final score. Below ``medium_threshold`` the machine is LOW.
    high_threshold: Decimal = Decimal("0.66")
    medium_threshold: Decimal = Decimal("0.33")

    #: Minimum downtime events in the window before any level is expressed.
    min_events_for_assessment: int = 3
    #: At or above this many events the history is called sufficient.
    events_for_sufficient_history: int = 6

    #: Normalisation references, expressed per 30 days so the figures keep their
    #: meaning when the caller picks a different lookback. Reaching the reference
    #: saturates that component at 1.0.
    reference_events_per_30d: Decimal = Decimal("8")
    reference_downtime_minutes_per_30d: Decimal = Decimal("480")
    reference_failure_events_per_30d: Decimal = Decimal("4")

    #: Component weights. They sum to 1.0, so the weighted mean is the score.
    weight_event_frequency: Decimal = Decimal("0.25")
    weight_downtime_load: Decimal = Decimal("0.20")
    weight_failure_signals: Decimal = Decimal("0.30")
    weight_recurrence: Decimal = Decimal("0.15")
    weight_trend: Decimal = Decimal("0.10")

    #: A failure signal repeated this many times is a pattern, not an incident.
    recurrence_threshold: int = 2

    #: How far the recent half may rise over the earlier half before the trend
    #: component saturates (2.0 = doubled).
    trend_reference_ratio: Decimal = Decimal("2.0")


#: The single configuration instance the engine uses.
RISK_CONFIG = RiskConfig()


@dataclass(frozen=True)
class Evidence:
    """One observed fact, kept separate from anything calculated from it."""

    code: str
    label: str
    value: Decimal | int | None
    unit: str = "number"
    observation: str = ""


@dataclass(frozen=True)
class Indicator:
    """One normalised, weighted contribution to the score."""

    code: str
    label: str
    #: 0.0..1.0 after normalisation.
    normalised: Decimal
    weight: Decimal
    #: The raw inputs behind the normalisation, so it can be checked by hand.
    detail: str


@dataclass(frozen=True)
class FailureRiskAssessment:
    """The complete answer: evidence, indicators, level and action."""

    machine_id: uuid.UUID
    machine_code: str
    machine_status: str
    lookback_days: int
    period_start: datetime
    period_end: datetime
    risk_level: str
    #: Deterministic heuristic indicator, NOT a failure probability. ``None``
    #: when the history is too thin to score.
    risk_score: Decimal | None
    data_sufficiency: str
    evidence: list[Evidence]
    indicators: list[Indicator]
    recommended_action: str
    explanation: str
    #: Always False, and stated in the payload so a client never has to guess
    #: whether a score came from a trained model. It never does.
    is_trained_model: bool = False


# ------------------------------------------------------------------ helpers


def _ratio(numerator: Decimal, denominator: Decimal) -> Decimal:
    """``numerator / denominator`` as a 0..1 value, saturating at 1.0."""
    if denominator <= ZERO:
        return ZERO
    value = numerator / denominator
    return ONE if value > ONE else value


def _clamp(value: Decimal) -> Decimal:
    """Constrain a normalised component to 0.0..1.0."""
    if value < ZERO:
        return ZERO
    return ONE if value > ONE else value


def _to_30d(value: Decimal, lookback_days: int) -> Decimal:
    """Normalise a total observed over the window to a per-30-day rate."""
    if lookback_days <= 0:
        return ZERO
    return value * Decimal(30) / Decimal(lookback_days)


#: Statuses meaning the machine is already unavailable or being worked on. A
#: machine in one of these states carries its own risk signal.
DEGRADED_STATUSES = frozenset(
    {MachineStatus.DOWN.value, MachineStatus.MAINTENANCE.value}
)


# ------------------------------------------------------------------- config


def _downtime_rows(
    db: Session, tenant_id: uuid.UUID, machine_id: uuid.UUID, start: datetime, end: datetime
) -> list[MachineDowntime]:
    """Downtime records that *started* inside the window, oldest first.

    Filtering on ``start_time`` (rather than overlap) keeps the evidence count
    equal to the number of distinct incidents, which is what a planner means by
    "how often". The caller's tenant is in the predicate, so another company's
    downtime can never be counted.
    """
    return list(
        db.query(MachineDowntime)
        .filter(
            MachineDowntime.tenant_id == tenant_id,
            MachineDowntime.machine_id == machine_id,
            MachineDowntime.start_time >= start,
            MachineDowntime.start_time <= end,
        )
        .order_by(MachineDowntime.start_time.asc(), MachineDowntime.id.asc())
        .all()
    )


def _record_minutes(record: MachineDowntime) -> Decimal:
    """Downtime duration as stored.

    An *open* record has no measured duration yet (``duration_minutes`` is NULL
    until the record is closed), so it contributes zero minutes here and is
    reported separately as an open event. It is never estimated forward.
    """
    if record.duration_minutes is None:
        return ZERO
    return Decimal(str(record.duration_minutes)).quantize(MINUTE_STEP, rounding=ROUND_HALF_UP)


def _period_minutes(records: Sequence[MachineDowntime]) -> Decimal:
    total = ZERO
    for record in records:
        total += _record_minutes(record)
    return total.quantize(MINUTE_STEP, rounding=ROUND_HALF_UP)


def _reason_counts(records: Sequence[MachineDowntime]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        counts[record.reason] = counts.get(record.reason, 0) + 1
    return dict(sorted(counts.items()))


# ------------------------------------------------------------------ scoring


def risk_level_for(score: Decimal, config: RiskConfig = RISK_CONFIG) -> str:
    """Band a score into a level. A pure function of the score."""
    if score >= config.high_threshold:
        return RISK_HIGH
    if score >= config.medium_threshold:
        return RISK_MEDIUM
    return RISK_LOW


def _trend_ratio(records: Sequence[MachineDowntime], midpoint: datetime) -> tuple[int, int]:
    """Event counts in the earlier and recent halves of the window.

    Comparing halves rather than consecutive periods keeps the halves the same
    length regardless of the lookback chosen. Both halves are reported so the
    caller can tell "no trend" from "insufficient data".
    """
    earlier = sum(1 for r in records if r.start_time < midpoint)
    recent = len(records) - earlier
    return earlier, recent


def _build_indicators(
    records: Sequence[MachineDowntime],
    *,
    lookback_days: int,
    midpoint: datetime,
    config: RiskConfig,
) -> list[Indicator]:
    """Normalise each observable into a 0..1 component and record its weight.

    Every component here is derived only from rows in ``records``; a component
    with no supporting data is simply omitted, and the score re-normalises over
    the weights that were used.
    """
    indicators: list[Indicator] = []
    if not records:
        return indicators

    total_minutes = _period_minutes(records)
    breakdown_count = sum(1 for r in records if r.reason == DowntimeReason.BREAKDOWN.value)
    failure_count = sum(1 for r in records if r.reason in FAILURE_SIGNAL_REASONS)
    earlier, recent = _trend_ratio(records, midpoint)

    # -- Component 1: how often the machine stops ------------------------------
    events_per_30d = _to_30d(Decimal(len(records)), lookback_days)
    indicators.append(
        Indicator(
            code="event_frequency",
            label="Downtime event frequency",
            normalised=_clamp(
                _ratio(events_per_30d, config.reference_events_per_30d)
            ),
            weight=config.weight_event_frequency,
            detail=(
                f"{len(records)} event(s) in {lookback_days} day(s) "
                f"= {events_per_30d:.2f} per 30 days "
                f"(reference {config.reference_events_per_30d}/30d)"
            ),
        )
    )

    # -- Component 2: how much time is lost ------------------------------------
    minutes_per_30d = _to_30d(total_minutes, lookback_days)
    indicators.append(
        Indicator(
            code="downtime_load",
            label="Downtime load",
            normalised=_clamp(
                _ratio(minutes_per_30d, config.reference_downtime_minutes_per_30d)
            ),
            weight=config.weight_downtime_load,
            detail=(
                f"{total_minutes} measured minute(s) in {lookback_days} day(s) "
                f"= {minutes_per_30d:.2f} per 30 days "
                f"(reference {config.reference_downtime_minutes_per_30d}/30d)"
            ),
        )
    )

    # -- Component 3: are the stops machine faults? -----------------------------
    failure_per_30d = _to_30d(Decimal(failure_count), lookback_days)
    indicators.append(
        Indicator(
            code="failure_signals",
            label="Failure-reason downtime",
            normalised=_clamp(
                _ratio(failure_per_30d, config.reference_failure_events_per_30d)
            ),
            weight=config.weight_failure_signals,
            detail=(
                f"{failure_count} failure-signal event(s) "
                f"(BREAKDOWN/QUALITY_ISSUE), {breakdown_count} of them BREAKDOWN "
                f"= {failure_per_30d:.2f} per 30 days"
            ),
        )
    )

    # -- Component 4: is the fault repeating? ----------------------------------
    # Binary on purpose: a repeated fault is a pattern, a third single event is
    # not materially different evidence from a second one.
    repeated = failure_count >= config.recurrence_threshold
    indicators.append(
        Indicator(
            code="recurrence",
            label="Repeated failure pattern",
            normalised=ONE if repeated else ZERO,
            weight=config.weight_recurrence,
            detail=(
                f"{failure_count} failure-signal event(s); "
                f"threshold for a pattern is {config.recurrence_threshold}"
            ),
        )
    )

    # -- Component 5: is it getting worse? -------------------------------------
    # Only scored when both halves actually contain events. With an empty half
    # the ratio is meaningless, and inventing one would be exactly the kind of
    # fabricated trend this module refuses to produce.
    if earlier > 0 and recent > 0:
        growth = Decimal(recent) / Decimal(earlier)
        indicators.append(
            Indicator(
                code="recent_trend",
                label="Recent downtime trend",
                normalised=_clamp(_ratio(growth, config.trend_reference_ratio)),
                weight=config.weight_trend,
                detail=(
                    f"{recent} event(s) in the recent half vs {earlier} in the earlier "
                    f"half (ratio {growth:.2f}, reference {config.trend_reference_ratio})"
                ),
            )
        )

    return indicators


def _score(indicators: Sequence[Indicator]) -> Decimal:
    """Weighted mean of the normalised components, to two decimals.

    Dividing by the weights actually used keeps the result in 0.0..1.0 when a
    component had to be omitted for lack of data.
    """
    weight_used = sum((i.weight for i in indicators), ZERO)
    if weight_used <= ZERO:
        return ZERO
    weighted = sum((i.normalised * i.weight for i in indicators), ZERO)
    return (weighted / weight_used).quantize(SCORE_STEP, rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------- assessment

#: Standing caveat, returned with every assessment so the number can never be
#: read as a probability. Phrased for a reader of the API, not for a developer.
SCORE_DISCLAIMER = (
    "risk_score is a deterministic heuristic risk indicator computed from the "
    "recorded downtime evidence listed here. It is NOT a trained machine-learning "
    "model and NOT a calibrated probability of failure. Use it to rank machines "
    "for human maintenance review, not to predict or to automate."
)


def _action_for(level: str, machine: Machine, sufficient: bool) -> str:
    """The recommended action for a level, with two non-risk overrides.

    An inactive machine and a too-thin history both short-circuit to a
    non-action, because recommending proactive maintenance off insufficient
    evidence would be exactly the unfounded advice this feature must not give.
    """
    if not machine.is_active:
        return ACTION_INACTIVE
    if level == RISK_INSUFFICIENT or not sufficient:
        return ACTION_COLLECT_DATA
    if level == RISK_HIGH:
        return ACTION_PROACTIVE
    if level == RISK_MEDIUM:
        return ACTION_INSPECT
    return ACTION_NONE


def _explanation(
    level: str,
    score: Decimal | None,
    records: Sequence[MachineDowntime],
    indicators: Sequence[Indicator],
    machine: Machine,
) -> str:
    """A plain-language reading of the same figures, built without any model."""
    if level == RISK_INSUFFICIENT:
        return (
            f"{machine.machine_code} has {len(records)} recorded downtime event(s) in "
            "the window, which is not enough history to assess failure risk. No score "
            "is produced. Keep recording downtime; the history becomes assessable once "
            "there is more evidence."
        )

    breakdown = sum(1 for r in records if r.reason == DowntimeReason.BREAKDOWN.value)
    quality = sum(1 for r in records if r.reason == DowntimeReason.QUALITY_ISSUE.value)
    drivers = [i for i in indicators if i.normalised > 0]
    drivers.sort(key=lambda i: i.normalised * i.weight, reverse=True)
    top = ", ".join(i.label.lower() for i in drivers[:3]) or "no individual indicator"

    return (
        f"{machine.machine_code} ({machine.status}) scored {score} on the "
        f"deterministic risk indicator: {len(records)} downtime event(s) including "
        f"{breakdown} BREAKDOWN and {quality} QUALITY_ISSUE. The strongest "
        f"contributors were {top}."
    )


def assess_failure_risk(
    db: Session,
    tenant_id: uuid.UUID,
    machine_id: uuid.UUID,
    *,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    now: datetime | None = None,
    config: RiskConfig = RISK_CONFIG,
) -> FailureRiskAssessment:
    """Assess machine-failure risk from this tenant's recorded downtime.

    Read-only by construction: it loads rows and returns a value. Nothing is
    written, no work order is created and no provider is called, so repeated
    requests are side-effect free by design rather than by convention.

    Raises :class:`NotFoundException` when the machine does not exist or belongs
    to another company — a 404, so another tenant's machine stays hidden.
    """
    # Reuse the machine service's scoped lookup rather than re-implementing it,
    # so tenant isolation here is exactly tenant isolation everywhere else.
    machine = get_machine(db, tenant_id, machine_id)

    days = max(MIN_LOOKBACK_DAYS, min(int(lookback_days), MAX_LOOKBACK_DAYS))
    end = now or datetime.now(UTC)
    start = end - timedelta(days=days)
    midpoint = start + (end - start) / 2

    records = _downtime_rows(db, tenant_id, machine.id, start, end)

    total_minutes = _period_minutes(records)
    open_events = sum(1 for r in records if r.end_time is None)
    breakdown_count = sum(1 for r in records if r.reason == DowntimeReason.BREAKDOWN.value)
    quality_count = sum(1 for r in records if r.reason == DowntimeReason.QUALITY_ISSUE.value)
    maintenance_count = sum(1 for r in records if r.reason == DowntimeReason.MAINTENANCE.value)
    earlier, recent = _trend_ratio(records, midpoint)

    evidence: list[Evidence] = [
        Evidence(
            code="machine_status",
            label="Current machine status",
            value=machine.status,
            unit="status",
            observation=(
                "Machine is currently unavailable or under maintenance."
                if machine.status in DEGRADED_STATUSES
                else "Machine is not currently in a down or maintenance state."
            ),
        ),
        Evidence(
            code="downtime_events",
            label="Downtime events in window",
            value=len(records),
            observation=f"{len(records)} downtime record(s) started within the window.",
        ),
        Evidence(
            code="total_downtime_minutes",
            label="Total measured downtime minutes",
            value=total_minutes,
            unit="minutes",
            observation="Sum of the durations measured when each record was closed.",
        ),
        Evidence(
            code="average_downtime_minutes",
            label="Average measured downtime duration",
            value=(
                (total_minutes / Decimal(len(records))).quantize(
                    MINUTE_STEP, rounding=ROUND_HALF_UP
                )
                if records
                else None
            ),
            unit="minutes",
            observation="Zero when no measured duration exists; never estimated.",
        ),
        Evidence(
            code="breakdown_events",
            label="Breakdown events",
            value=breakdown_count,
            observation="Downtime recorded with reason BREAKDOWN.",
        ),
        Evidence(
            code="quality_issue_events",
            label="Quality-issue downtime events",
            value=quality_count,
            observation="Downtime recorded with reason QUALITY_ISSUE.",
        ),
        Evidence(
            code="maintenance_events",
            label="Maintenance downtime events",
            value=maintenance_count,
            observation="Downtime recorded with reason MAINTENANCE.",
        ),
        Evidence(
            code="open_events",
            label="Currently open downtime events",
            value=open_events,
            observation=(
                "An open record has no measured duration yet and contributes zero "
                "minutes; it is never extrapolated."
            ),
        ),
        Evidence(
            code="recent_vs_earlier_events",
            label="Recent vs earlier half of window",
            value=recent,
            observation=(
                f"{recent} event(s) in the recent half vs {earlier} in the earlier half."
            ),
        ),
        Evidence(
            code="reasons",
            label="Downtime reason breakdown",
            value=None,
            unit="map",
            observation="; ".join(
                f"{reason}: {count}" for reason, count in _reason_counts(records).items()
            )
            or "No downtime recorded.",
        ),
    ]

    # -- Data sufficiency, decided before any scoring --------------------------
    event_count = len(records)
    if event_count < config.min_events_for_assessment:
        sufficiency = DATA_SUFFICIENCY_INSUFFICIENT
    elif event_count < config.events_for_sufficient_history:
        sufficiency = DATA_SUFFICIENCY_LIMITED
    else:
        sufficiency = DATA_SUFFICIENCY_SUFFICIENT

    indicators: list[Indicator] = []
    score: Decimal | None = None
    level = RISK_INSUFFICIENT

    if sufficiency == DATA_SUFFICIENCY_INSUFFICIENT:
        # Too little history to say anything. No indicators, no score, no level
        # beyond INSUFFICIENT_DATA — the honest answer rather than a small number.
        explanation = (
            f"{machine.machine_code} has only {event_count} downtime event(s) in the "
            f"last {days} day(s); at least {config.min_events_for_assessment} are "
            "required before a heuristic risk indicator is meaningful. No score is "
            "produced."
        )
    else:
        indicators = _build_indicators(
            records, lookback_days=days, midpoint=midpoint, config=config
        )
        score = _score(indicators)
        level = risk_level_for(score, config)
        explanation = _explanation(level, score, records, indicators, machine)

    if not machine.is_active:
        explanation = (
            f"{machine.machine_code} is inactive. Risk is not assessed for an "
            "inactive machine."
        )

    return FailureRiskAssessment(
        machine_id=machine.id,
        machine_code=machine.machine_code,
        machine_status=machine.status,
        lookback_days=days,
        period_start=start,
        period_end=end,
        risk_level=level,
        risk_score=score,
        data_sufficiency=sufficiency,
        evidence=evidence,
        indicators=indicators,
        recommended_action=_action_for(
            level, machine, sufficiency != DATA_SUFFICIENCY_INSUFFICIENT
        ),
        explanation=explanation,
    )


__all__ = [
    "ACTION_COLLECT_DATA",
    "ACTION_INACTIVE",
    "ACTION_INSPECT",
    "ACTION_NONE",
    "ACTION_PROACTIVE",
    "DATA_SUFFICIENCY_INSUFFICIENT",
    "DATA_SUFFICIENCY_LIMITED",
    "DATA_SUFFICIENCY_SUFFICIENT",
    "DEFAULT_LOOKBACK_DAYS",
    "DEGRADED_STATUSES",
    "Evidence",
    "FAILURE_SIGNAL_REASONS",
    "FailureRiskAssessment",
    "Indicator",
    "MAX_LOOKBACK_DAYS",
    "MIN_LOOKBACK_DAYS",
    "RISK_CONFIG",
    "RISK_HIGH",
    "RISK_INSUFFICIENT",
    "RISK_LEVELS",
    "RISK_LOW",
    "RISK_MEDIUM",
    "RiskConfig",
    "SCORE_DISCLAIMER",
    "assess_failure_risk",
    "risk_level_for",
]