"""Chatbot orchestration: route, authorise, fetch, then explain.

The step order *is* the security model:

1. Route the message with a deterministic keyword match.
2. Check the intent's permission **before** any business query runs.
3. Fetch tenant-scoped records and build a small context.
4. Ask Groq for prose about that context — **at most one call**.
5. Attach backend-generated sources and audit the outcome.

Because the model is never in the authorisation path and never sees anything the
backend did not deliberately put in the context, prompt injection in a customer
message can only affect wording. It cannot widen access.
"""

import logging
import time

from sqlalchemy.orm import Session

from app.common.exceptions import ForbiddenException
from app.models.user import User
from app.modules.ai.audit import (
    AI_CHATBOT_ESCALATED,
    AI_CHATBOT_REQUEST,
    AI_CHATBOT_UNAUTHORIZED,
    ENTITY_CHATBOT,
    safe_metadata,
)
from app.modules.auth.scope import RecordScope
from app.modules.ai.chatbot import (
    INTENT_PERMISSIONS,
    ChatContext,
    build_chat_context,
    detect_chatbot_intent,
    escalation_answer,
    sanitise_message,
    unsupported_answer,
)
from app.modules.ai.errors import (
    AIProviderNotConfiguredException,
    AIProviderTimeoutException,
    AIProviderUnavailableException,
    AIMalformedResponseException,
)
from app.modules.ai.provider import AIProvider, get_provider
from app.modules.ai.prompt import CHATBOT_SYSTEM_PROMPT, build_chatbot_message
from app.modules.audit.service import record_audit
from app.modules.auth.service import user_permissions
from app.schemas.chatbot import ChatAIStatus, ChatIntent, ChatResponse

logger = logging.getLogger(__name__)

#: Permission needed to escalate. Re-exported for the router.
ESCALATION_PERMISSION = "chatbot.escalate"


def _authorise(user: User, intent: str) -> None:
    """Reject an intent whose data the caller may not read.

    Runs before the fetch, so an unauthorised intent never reaches the query
    that would have read the data.
    """
    permission = INTENT_PERMISSIONS.get(intent)
    if permission is None:
        return
    required = {permission} if isinstance(permission, str) else set(permission)
    if not required <= set(user_permissions(user)):
        raise ForbiddenException(
            "You do not have permission to use this support query"
        )


def _explain(
    context: ChatContext, provider: AIProvider | None
) -> tuple[str | None, ChatAIStatus, str | None, str | None]:
    """Ask the model to phrase an answer about an already-built context.

    Every failure returns ``(None, status, message, model)`` rather than raising:
    the backend can still answer from the records it fetched, so an upstream
    outage degrades the response rather than failing it.
    """
    active = provider or get_provider()

    if not active.is_configured():
        return (
            None,
            ChatAIStatus.NOT_CONFIGURED,
            "The support assistant is not configured on this server.",
            None,
        )

    try:
        answer = active.complete(
            CHATBOT_SYSTEM_PROMPT, build_chatbot_message(context)
        )
    except (
        AIProviderUnavailableException,
        AIProviderTimeoutException,
        AIMalformedResponseException,
    ) as exc:
        logger.warning("Chatbot explanation unavailable: %s", type(exc).__name__)
        return None, ChatAIStatus.UNAVAILABLE, exc.message, None
    except AIProviderNotConfiguredException as exc:
        return None, ChatAIStatus.NOT_CONFIGURED, exc.message, None

    if not answer or not answer.strip():
        return (
            None,
            ChatAIStatus.UNAVAILABLE,
            "The support assistant returned an empty reply.",
            None,
        )

    return answer.strip(), ChatAIStatus.SUCCESS, None, active.model


def _backend_answer(context: ChatContext) -> str:
    """A safe, factual answer composed by the backend from real records.

    Used when the model is unavailable, so an outage never yields an invented
    answer. Deliberately plain: it states what was found, nothing more.
    """
    if context.not_found:
        return context.not_found
    if not context.records:
        return "No matching records were found for this company."
    return (
        "The information was retrieved successfully, but the AI response service "
        "is temporarily unavailable. The relevant records are listed below."
    )


def answer_support_question(
    db: Session,
    user: User,
    message: str,
    conversation_id: str | None = None,
    *,
    provider: AIProvider | None = None,
) -> ChatResponse:
    """Answer one support question from this tenant's ERP data.

    ``provider`` is injectable so tests replace it at this boundary and never
    make a network call.
    """
    cleaned = sanitise_message(message)
    intent, references = detect_chatbot_intent(cleaned)

    try:
        _authorise(user, intent)
    except ForbiddenException:
        record_audit(
            db,
            action=AI_CHATBOT_UNAUTHORIZED,
            entity_type=ENTITY_CHATBOT,
            tenant_id=user.tenant_id,
            user_id=user.id,
            description="Support query rejected for a missing section permission",
            metadata=safe_metadata(
                intent=intent, outcome="unauthorized", source_count=0
            ),
        )
        raise

    # Escalation needs no business data and is handled entirely in the backend.
    if intent == "HUMAN_ESCALATION":
        return ChatResponse(
            answer=escalation_answer(),
            intent=ChatIntent.HUMAN_ESCALATION,
            escalated=True,
            sources=[],
            ai_status=ChatAIStatus.NOT_CALLED,
            model=None,
            conversation_id=conversation_id,
        )

    # Nothing to look up and nobody to mislead: do not spend a model call.
    if intent == "UNSUPPORTED":
        return ChatResponse(
            answer=unsupported_answer(),
            intent=ChatIntent.UNSUPPORTED,
            escalated=False,
            sources=[],
            ai_status=ChatAIStatus.NOT_CALLED,
            model=None,
            conversation_id=conversation_id,
        )

    # Authorisation has passed; now read this tenant's data.
    context = build_chat_context(
        db, user.tenant_id, intent, references, cleaned,
        scope=RecordScope.for_user(db, user),  # P2-06
    )

    started = time.perf_counter()
    answer, ai_status, ai_error, model = _explain(context, provider)
    duration_ms = int((time.perf_counter() - started) * 1000)

    if answer is None:
        answer = _backend_answer(context)

    record_audit(
        db,
        action=AI_CHATBOT_REQUEST,
        entity_type=ENTITY_CHATBOT,
        tenant_id=user.tenant_id,
        user_id=user.id,
        description="Customer support question answered",
        # Classification only: never the customer's message, the model's prose,
        # or any customer data. All three can be commercially sensitive.
        metadata=safe_metadata(
            intent=intent,
            outcome=ai_status.value,
            source_count=len(context.sources),
            found=context.not_found is None,
            escalated=False,
            duration_ms=duration_ms,
        ),
    )

    return ChatResponse(
        answer=answer,
        intent=ChatIntent(intent),
        escalated=False,
        sources=context.sources,
        ai_status=ai_status,
        ai_error=ai_error,
        model=model,
        conversation_id=conversation_id,
    )


def record_escalation(db: Session, user: User, intent: str, conversation_id: str | None) -> None:
    """Audit an escalation request.

    For the MVP an escalation means "this conversation has been flagged for human
    follow-up". There is no notification integration here, so the audit row is the
    system of record and the answer never claims a person was contacted.
    """
    record_audit(
        db,
        action=AI_CHATBOT_ESCALATED,
        entity_type=ENTITY_CHATBOT,
        tenant_id=user.tenant_id,
        user_id=user.id,
        description="Customer requested human support",
        metadata=safe_metadata(
            intent=intent,
            outcome="escalated",
            has_conversation_id=conversation_id is not None,
        ),
    )


__all__ = [
    "ESCALATION_PERMISSION",
    "answer_support_question",
    "record_escalation",
]