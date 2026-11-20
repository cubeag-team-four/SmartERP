"""Customer support chatbot endpoints: /api/v1/ai/chatbot/*.

Access has two layers, and the backend is authoritative for both:

* ``chatbot.use`` gates the surface.
* The **existing** module permission for the intent's subject matter gates the
  data: ``sales.order.view`` for orders, ``inventory.stock.view`` for
  availability, ``sales.product.view`` for product details and
  ``crm.customer.view`` for customer history. No new data-access permissions were
  invented for this feature.

The tenant comes from the verified access token. The request schema sets
``extra="forbid"``, so a client cannot supply a ``tenant_id``, a permission or a
query even if it wanted to.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.dependencies import DBSession
from app.common.exceptions import ForbiddenException
from app.models.user import User
from app.modules.ai.chatbot import (
    CHATBOT_PERMISSION,
    ESCALATION_PERMISSION,
    detect_chatbot_intent,
    sanitise_message,
)
from app.modules.ai.chatbot_service import answer_support_question, record_escalation
from app.modules.auth.dependencies import has_permission, require_permission
from app.schemas.chatbot import ChatCapability, ChatIntent, ChatRequest, ChatResponse

router = APIRouter(prefix="/ai/chatbot", tags=["Support Chatbot"])

#: The topics the chatbot is documented to handle, so the UI can offer them
#: without hardcoding its own list.
CAPABILITIES: list[ChatCapability] = [
    ChatCapability(intent=ChatIntent.ORDER_STATUS, label="Order status"),
    ChatCapability(intent=ChatIntent.ORDER_DETAILS, label="Order details"),
    ChatCapability(intent=ChatIntent.PRODUCT_AVAILABILITY, label="Product availability"),
    ChatCapability(intent=ChatIntent.PRODUCT_DETAILS, label="Product information"),
    ChatCapability(intent=ChatIntent.CUSTOMER_ORDER_HISTORY, label="Customer order history"),
    ChatCapability(intent=ChatIntent.HUMAN_ESCALATION, label="Ask for a human"),
]


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: DBSession,
    actor: Annotated[User, Depends(require_permission(CHATBOT_PERMISSION))],
) -> ChatResponse:
    """Answer one support question from this tenant's own ERP data.

    The backend retrieves and controls every business record before the model is
    contacted, and the model is given nothing else. At most one provider call is
    made per request, and only when there is real data to explain.
    """
    # Escalation is a distinct permission: flagging work for the support team is
    # not something a read-only account may trigger.
    # Detected on the same sanitised text the service answers from, so control
    # characters or stripped tags cannot hide "escalate" from this check while
    # the service still sees it.
    intent, _ = detect_chatbot_intent(sanitise_message(payload.message))
    if intent == "HUMAN_ESCALATION" and not has_permission(
        actor, ESCALATION_PERMISSION
    ):
        raise ForbiddenException(
            "You do not have permission to escalate to human support"
        )

    try:
        response = answer_support_question(
            db, actor, payload.message, payload.conversation_id
        )

        if response.escalated:
            record_escalation(db, actor, intent, payload.conversation_id)

        return response
    finally:
        # The chatbot reads ERP data and writes only audit rows, so committing in
        # `finally` preserves them on every path — including the rejected-query
        # path inside `answer_support_question`, which records an audit row and
        # then raises. Nothing else is pending, so no partial write is published.
        db.commit()


@router.get("/capabilities", response_model=list[ChatCapability])
def capabilities(
    actor: Annotated[User, Depends(require_permission(CHATBOT_PERMISSION))],
) -> list[ChatCapability]:
    """Supported topics, so the UI can suggest questions without duplicating them."""
    return CAPABILITIES


__all__ = ["router"]