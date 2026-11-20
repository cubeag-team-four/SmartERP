"""Rule-based scoring baseline and the engine switch (P2-15, FR-M2-04).

Ambiguity A-1 and how it is isolated
------------------------------------
The SRS puts the module AI requirements (lead score, sales forecast, vendor
recommendation, reorder point, cash-flow forecast) inside the Phase 1 module
sections, while §13.3 schedules "AI forecasting" for Phase 3. Two things follow,
and only the second is a business decision:

1. Every one of those features must *work* in Phase 1 regardless, because the
   SRS also requires each to degrade to a rule-based answer when the AI is not
   available ([§3.2.5-3], [§4.2 EH-2], [§4.4 EH-2] / TC-006, [§4.5 EH-2]). The
   rule-based answer is therefore built here, deterministic and documented.
2. Whether a *trained* engine is required for Phase 1 sign-off is open. That
   answer plugs in at one place: ``settings.AI_SCORING_ENGINE``.
   ``rules`` (default) makes the rules the primary engine, so results carry
   ``fallback: false``. ``external`` selects a trained engine that is not wired
   yet (Phase 3), so :func:`primary_engine` raises and every caller degrades to
   the rules with ``fallback: true`` -- exactly the "AI unavailable" behaviour.

Every result exposes ``fallback`` and ``confidence``.

Lead score
----------
A lead's score is the sum of five documented components, clamped to 0..100. A
won lead is 100 and a lost lead 0 by definition: their outcome is known.

=================  ======================================================  =====
Component          Rule                                                    Max
=================  ======================================================  =====
Stage              NEW 10, CONTACTED 25, QUALIFIED 40                        40
Profile            5 each for email, phone, company name, job title          20
Source             REFERRAL 15, WEBSITE 10, ADVERTISEMENT / SOCIAL_MEDIA 6,  15
                   COLD_CALL 3, OTHER 2
Engagement         activities in the last 30 days: MEETING 6, CALL 4,        20
                   EMAIL 3, FOLLOW_UP 3, NOTE 1 (capped)
Recency            last activity within 7 days 10, within 30 days 5          10
=================  ======================================================  =====
"""

import uuid
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.ai.errors import AIError

# ---------------------------------------------------------------- engine

ENGINE_RULES = "rules"
ENGINE_EXTERNAL = "external"

FALLBACK_ENGINE_UNAVAILABLE = "scoring_engine_unavailable"
FALLBACK_INSUFFICIENT_DATA = "insufficient_history"

CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"
CONFIDENCE_NONE = "none"


class ScoringEngineUnavailable(AIError):
    """The configured (non rule-based) scoring engine cannot answer."""

    status_code = 503
    code = "ai_scoring_unavailable"


def configured_engine() -> str:
    return (settings.AI_SCORING_ENGINE or ENGINE_RULES).strip().lower()


def primary_engine() -> str:
    """The engine to use, or raise :class:`ScoringEngineUnavailable`.

    Only the rule engine exists in Phase 1 (see the module docstring, A-1). Any
    other configured engine is "down", which callers turn into the documented
    rule-based fallback rather than a failed request.
    """
    engine = configured_engine()
    if engine == ENGINE_RULES:
        return engine
    raise ScoringEngineUnavailable(
        f"The '{engine}' scoring engine is not available; using the rule-based fallback"
    )


# ---------------------------------------------------------------- lead score

SCORE_MIN = 0
SCORE_MAX = 100

STAGE_POINTS: dict[str, int] = {"NEW": 10, "CONTACTED": 25, "QUALIFIED": 40}
PROFILE_POINTS_EACH = 5
SOURCE_POINTS: dict[str, int] = {
    "REFERRAL": 15,
    "WEBSITE": 10,
    "ADVERTISEMENT": 6,
    "SOCIAL_MEDIA": 6,
    "COLD_CALL": 3,
    "OTHER": 2,
}
ACTIVITY_POINTS: dict[str, int] = {
    "MEETING": 6,
    "CALL": 4,
    "EMAIL": 3,
    "FOLLOW_UP": 3,
    "NOTE": 1,
}
ENGAGEMENT_WINDOW_DAYS = 30
ENGAGEMENT_CAP = 20
RECENCY_POINTS: tuple[tuple[int, int], ...] = ((7, 10), (30, 5))

WON_STATUS = "CONVERTED"
LOST_STATUS = "UNQUALIFIED"


@dataclass(frozen=True)
class LeadFacts:
    """What the lead score reads. Built from a lead row, or by hand in tests."""

    status: str
    source: str
    has_email: bool = False
    has_phone: bool = False
    has_company: bool = False
    has_job_title: bool = False
    #: ``(activity_type, activity_date)`` of every live activity of the lead.
    activities: Sequence[tuple[str, datetime]] = ()


@dataclass
class LeadScore:
    score: int
    confidence: str
    fallback: bool
    fallback_reason: str | None
    rescore_pending: bool
    engine: str
    breakdown: dict[str, int] = field(default_factory=dict)
    last_activity_at: datetime | None = None


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def rule_lead_score(facts: LeadFacts, now: datetime | None = None) -> tuple[int, dict[str, int], str, datetime | None]:
    """The rule-based score: ``(score, breakdown, confidence, last_activity_at)``.

    Always within ``SCORE_MIN..SCORE_MAX``, for any input.
    """
    now = _aware(now or datetime.now(UTC))
    dated = [(kind, _aware(when)) for kind, when in facts.activities if when is not None]
    last_activity = max((when for _, when in dated), default=None)

    profile_fields = sum(
        (facts.has_email, facts.has_phone, facts.has_company, facts.has_job_title)
    )
    if profile_fields >= 3 and len(dated) >= 3:
        confidence = CONFIDENCE_HIGH
    elif profile_fields >= 3 or dated:
        confidence = CONFIDENCE_MEDIUM
    else:
        confidence = CONFIDENCE_LOW

    if facts.status == WON_STATUS:
        return SCORE_MAX, {"outcome": SCORE_MAX}, CONFIDENCE_HIGH, last_activity
    if facts.status == LOST_STATUS:
        return SCORE_MIN, {"outcome": SCORE_MIN}, CONFIDENCE_HIGH, last_activity

    window_start = now - timedelta(days=ENGAGEMENT_WINDOW_DAYS)
    engagement = sum(
        ACTIVITY_POINTS.get(kind, 0) for kind, when in dated if window_start <= when <= now
    )
    recency = 0
    if last_activity is not None:
        age_days = (now - last_activity).days
        for limit, points in RECENCY_POINTS:
            if age_days <= limit:
                recency = points
                break

    breakdown = {
        "stage": STAGE_POINTS.get(facts.status, 0),
        "profile": profile_fields * PROFILE_POINTS_EACH,
        "source": SOURCE_POINTS.get(facts.source, SOURCE_POINTS["OTHER"]),
        "engagement": min(engagement, ENGAGEMENT_CAP),
        "recency": recency,
    }
    score = max(SCORE_MIN, min(SCORE_MAX, sum(breakdown.values())))
    return score, breakdown, confidence, last_activity


def score_lead_facts(facts: LeadFacts, now: datetime | None = None) -> LeadScore:
    """Score a lead with the primary engine, degrading to the rules ([§4.2 EH-2]).

    A fallback result is flagged ``rescore_pending`` so the nightly job retries
    it once the engine is back.
    """
    score, breakdown, confidence, last_activity = rule_lead_score(facts, now)
    try:
        engine = primary_engine()
    except AIError:
        return LeadScore(
            score=score,
            confidence=CONFIDENCE_LOW if confidence != CONFIDENCE_HIGH else CONFIDENCE_MEDIUM,
            fallback=True,
            fallback_reason=FALLBACK_ENGINE_UNAVAILABLE,
            rescore_pending=True,
            engine=ENGINE_RULES,
            breakdown=breakdown,
            last_activity_at=last_activity,
        )
    return LeadScore(
        score=score,
        confidence=confidence,
        fallback=False,
        fallback_reason=None,
        rescore_pending=False,
        engine=engine,
        breakdown=breakdown,
        last_activity_at=last_activity,
    )


def _facts_for(lead, activities: Iterable[tuple[str, datetime]]) -> LeadFacts:
    return LeadFacts(
        status=lead.status,
        source=lead.source,
        has_email=bool(lead.email),
        has_phone=bool(lead.phone),
        has_company=bool(lead.company_name),
        has_job_title=bool(lead.job_title),
        activities=tuple(activities),
    )


def _activities_by_lead(
    db: Session, tenant_id: uuid.UUID, lead_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, list[tuple[str, datetime]]]:
    from app.models.crm import CRMActivity

    found: dict[uuid.UUID, list[tuple[str, datetime]]] = {lead_id: [] for lead_id in lead_ids}
    if not lead_ids:
        return found
    rows = db.execute(
        select(CRMActivity.lead_id, CRMActivity.activity_type, CRMActivity.activity_date).where(
            CRMActivity.tenant_id == tenant_id,
            CRMActivity.lead_id.in_(lead_ids),
            CRMActivity.deleted_at.is_(None),
        )
    ).all()
    for lead_id, kind, when in rows:
        found.setdefault(lead_id, []).append((kind, when))
    return found


def compute_lead_score(db: Session, lead, now: datetime | None = None) -> LeadScore:
    """Score one lead from its row and its live activities (read only)."""
    activities = _activities_by_lead(db, lead.tenant_id, [lead.id])[lead.id]
    return score_lead_facts(_facts_for(lead, activities), now)


def store_lead_score(lead, result: LeadScore, now: datetime) -> None:
    """Copy a score result onto the lead row (no flush)."""
    lead.score = result.score
    lead.score_confidence = result.confidence
    lead.score_fallback = result.fallback
    lead.rescore_pending = result.rescore_pending
    lead.score_updated_at = now


def refresh_lead_score(db: Session, lead, now: datetime | None = None) -> LeadScore:
    """Recompute and store a lead's score on the caller's transaction (no commit).

    Called on create, update, stage move and activity logging ("significant
    activity", FR-M2-04), and nightly. Never raises for an engine outage.
    """
    now = _aware(now or datetime.now(UTC))
    result = compute_lead_score(db, lead, now)
    store_lead_score(lead, result, now)
    db.flush()
    return result


def score_unsaved_lead(lead, now: datetime | None = None) -> LeadScore:
    """Score a lead that has no activities yet (create / CSV import), no query."""
    now = _aware(now or datetime.now(UTC))
    result = score_lead_facts(_facts_for(lead, ()), now)
    store_lead_score(lead, result, now)
    return result


def refresh_tenant_lead_scores(
    db: Session, tenant_id: uuid.UUID, now: datetime | None = None
) -> dict[str, int]:
    """Rescore every live lead of a tenant (the nightly ``ai_score_refresh``)."""
    from app.models.crm import Lead

    now = _aware(now or datetime.now(UTC))
    leads = list(
        db.scalars(
            select(Lead).where(Lead.tenant_id == tenant_id, Lead.deleted_at.is_(None))
        ).all()
    )
    activities = _activities_by_lead(db, tenant_id, [lead.id for lead in leads])
    changed = fallbacks = 0
    for lead in leads:
        result = score_lead_facts(_facts_for(lead, activities.get(lead.id, [])), now)
        if lead.score != result.score:
            changed += 1
        if result.fallback:
            fallbacks += 1
        store_lead_score(lead, result, now)
    db.flush()
    return {"leads_scored": len(leads), "scores_changed": changed, "fallbacks": fallbacks}


__all__ = [
    "ACTIVITY_POINTS",
    "CONFIDENCE_HIGH",
    "CONFIDENCE_LOW",
    "CONFIDENCE_MEDIUM",
    "CONFIDENCE_NONE",
    "ENGINE_EXTERNAL",
    "ENGINE_RULES",
    "FALLBACK_ENGINE_UNAVAILABLE",
    "FALLBACK_INSUFFICIENT_DATA",
    "LeadFacts",
    "LeadScore",
    "SCORE_MAX",
    "SCORE_MIN",
    "SOURCE_POINTS",
    "STAGE_POINTS",
    "ScoringEngineUnavailable",
    "compute_lead_score",
    "configured_engine",
    "primary_engine",
    "refresh_lead_score",
    "refresh_tenant_lead_scores",
    "rule_lead_score",
    "score_lead_facts",
    "score_unsaved_lead",
    "store_lead_score",
]
