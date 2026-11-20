"""Business Assistant orchestration.

This module is the single place where a natural-language question turns into an
API response. The order of operations *is* the security model, so it is fixed:

1. **Authenticate.** The caller arrives from the existing JWT dependency; the
   tenant is read from that verified user record, never from the request body.
2. **Resolve the period** with the dashboard's own resolver, so the AI and the
   dashboard can never report different windows.
3. **Route the question** through the fixed intent vocabulary. Unrecognised
   questions stop here with a capability list — no query runs, and the model is
   never called.
4. **Authorise the section** *before* any ERP data is read, using the same
   permission mapping the dashboard endpoints enforce.
5. **Build the context** from the dashboard service functions.
6. **Call the provider** for prose only.
7. **Attach source metadata** that the backend generated alongside the figures.

The language model never sees a table name, never writes a query, and never
decides what the caller is allowed to read. Prompt injection in the question or
in ERP text can therefore only affect the wording of an answer that is already
bounded by steps 4 and 5.
"""

from __future__ import annotations

import logging
import time

from sqlalchemy.orm import Session

from app.common.exceptions import ForbiddenException
from app.models.user import User
from app.modules.ai.audit import (
    AI_ASSISTANT_ANSWERED,
    AI_ASSISTANT_FAILED,
    AI_ASSISTANT_UNAUTHORIZED,
    AI_ASSISTANT_UNSUPPORTED,
    ENTITY_ASSISTANT,
    safe_metadata,
)
from app.modules.ai.context import build_context, period_info
from app.modules.ai.errors import (
    MISSING_KEY_MESSAGE,
    UNSUPPORTED_INTENT_MESSAGE,
    AIProviderNotConfiguredException,
)
from app.modules.ai.intents import INTENT_SECTIONS, SECTION_LABELS, Intent, detect_intent
from app.modules.ai.provider import AIProvider, get_provider
from app.modules.ai.prompt import SYSTEM_PROMPT, build_user_message
from app.modules.audit.service import record_audit
from app.modules.dashboard.service import (
    SECTION_PERMISSIONS,
    ResolvedPeriod,
    allowed_sections,
)
from app.schemas.ai import AISource, AIResponse, AssistantRequest

logger = logging.getLogger(__name__)

#: Permission required to use any AI feature. Mirrors the seeded ``ai.use`` code.
AI_PERMISSION = "ai.use"

#: Answer returned when the question matches no supported intent. Deliberately
#: produced without calling the model: there is no data to explain, and a model
#: call would be an unnecessary upstream request.
UNSUPPORTED_RESPONSE = AIResponse(
    answer=UNSUPPORTED_INTENT_MESSAGE,
    intent=None,
    period=None,
    sources=[],
    generated_by="system",
    model=None,
)
def required_permission_for(intent: Intent) -> str | None:
    """The permission that unlocks an intent's section.

    ``None`` means the intent spans sections and has no single gate — those are
    filtered section-by-section against the caller's actual permissions.
    """
    section = INTENT_SECTIONS[intent]
    if section == "*":
        return None
    return SECTION_PERMISSIONS.get(section)


def _authorise_intent(user: User, intent: Intent) -> None:
    """Reject an intent whose section the caller may not read.

    Runs before :func:`build_context`, so a restricted caller's request never
    reaches the aggregation queries for that section at all.
    """
    section = INTENT_SECTIONS[intent]
    if section == "*":
        return
    if section not in set(allowed_sections(user)):
        raise ForbiddenException(
            f"You do not have permission to view the {SECTION_LABELS[section]} data"
        )


def _sanitise_question(question: str) -> str:
    """Bound the question and strip control characters.

    The question is wrapped in delimiters in the prompt and is treated as data,
    but it still arrives from an untrusted caller, so control characters and the
    delimiter-like closing tags are removed before it reaches the model.
    """
    cleaned = "".join(
        char
        for char in question
        if char in "\n\t" or not (ord(char) < 32 or 127 <= ord(char) <= 159)
    )
    return cleaned.replace("</erp_context>", "").replace("</user_question>", "").strip()


def _build_sources(raw_sources: list[dict]) -> list[AISource]:
    """Convert backend-generated source dicts into response models.

    The identifiers come from :mod:`app.modules.ai.context` and are produced from
    the same objects as the metrics — never from the model's text — so a citation
    can only ever name a figure that was genuinely read.
    """
    known_sections = set(SECTION_LABELS)
    sources: list[AISource] = []
    for raw in raw_sources:
        if raw.get("section") not in known_sections:
            # Defence in depth: an unrecognised section is dropped rather than
            # echoed to the client.
            continue
        sources.append(AISource(**raw))
    return sources
def answer_question(
    db: Session,
    window: ResolvedPeriod,
    user: User,
    request: AssistantRequest,
    provider: AIProvider | None = None,
) -> AIResponse:
    """Answer one business question from authorised ERP data.

    ``provider`` is injectable so tests replace it at this boundary and never
    perform a network call.
    """
    question = _sanitise_question(request.question)
    intent = detect_intent(question)

    if intent is None:
        record_audit(
            db,
            action=AI_ASSISTANT_UNSUPPORTED,
            entity_type=ENTITY_ASSISTANT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Assistant question outside the supported intent set",
            metadata=safe_metadata(outcome="unsupported", question_length=len(question)),
        )
        return UNSUPPORTED_RESPONSE.model_copy(deep=True)

    # Authorisation happens before any ERP query for this section.
    try:
        _authorise_intent(user, intent)
    except ForbiddenException:
        record_audit(
            db,
            action=AI_ASSISTANT_UNAUTHORIZED,
            entity_type=ENTITY_ASSISTANT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Assistant question rejected for a missing section permission",
            metadata=safe_metadata(
                intent=intent.value,
                section=INTENT_SECTIONS[intent],
                outcome="unauthorized",
            ),
        )
        raise

    active_provider = provider or get_provider()

    # Fail before any ERP query runs when the server has no provider key, so a
    # misconfigured deployment costs nothing and leaks nothing about the data.
    if not active_provider.is_configured():
        record_audit(
            db,
            action=AI_ASSISTANT_FAILED,
            entity_type=ENTITY_ASSISTANT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Assistant request rejected: AI provider is not configured",
            metadata=safe_metadata(
                intent=intent.value,
                section=INTENT_SECTIONS[intent],
                outcome="not_configured",
            ),
        )
        raise AIProviderNotConfiguredException(MISSING_KEY_MESSAGE)

    context, raw_sources = build_context(db, window, user, intent)
    section = INTENT_SECTIONS[intent]

    started = time.perf_counter()
    try:
        answer = active_provider.complete(
            SYSTEM_PROMPT, build_user_message(question, context)
        )
    except Exception:
        # The provider has already converted every upstream failure into a clean
        # AIError; it propagates untouched so main.py renders the right status.
        # Only the audit row is added here.
        record_audit(
            db,
            action=AI_ASSISTANT_FAILED,
            entity_type=ENTITY_ASSISTANT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Assistant request failed at the AI provider",
            metadata=safe_metadata(
                intent=intent.value,
                section=section,
                outcome="failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
            ),
        )
        raise

    record_audit(
        db,
        action=AI_ASSISTANT_ANSWERED,
        entity_type=ENTITY_ASSISTANT,
        tenant_id=user.tenant_id,
        user_id=user.id,
        description="Assistant answered a business question",
        metadata=safe_metadata(
            intent=intent.value,
            section=section,
            outcome="answered",
            period=window.period,
            source_count=len(raw_sources),
            question_length=len(question),
            duration_ms=int((time.perf_counter() - started) * 1000),
        ),
    )

    return AIResponse(
        answer=answer,
        intent=intent.value,
        period=period_info(window),
        sources=_build_sources(raw_sources),
        generated_by="groq",
        # The model identifier is safe to display; the API key never is.
        model=active_provider.model,
    )


__all__ = [
    "AI_PERMISSION",
    "UNSUPPORTED_RESPONSE",
    "answer_question",
    "required_permission_for",
]