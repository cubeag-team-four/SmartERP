"""Chatbot Router - Wrapper for AI chatbot module"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/ai/chatbot", tags=["Chatbot"])

# Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    escalated: bool = False
    timestamp: datetime = None

class ChatCapability(BaseModel):
    intent: str
    label: str

# Mock data - Replace with actual AI module integration
CAPABILITIES = [
    {"intent": "ORDER_STATUS", "label": "Order status"},
    {"intent": "ORDER_DETAILS", "label": "Order details"},
    {"intent": "PRODUCT_AVAILABILITY", "label": "Product availability"},
    {"intent": "PRODUCT_DETAILS", "label": "Product information"},
    {"intent": "CUSTOMER_ORDER_HISTORY", "label": "Customer order history"},
    {"intent": "HUMAN_ESCALATION", "label": "Ask for a human"},
]

@router.post("", response_model=ChatResponse)
async def send_message(payload: ChatRequest):
    """Send message to support chatbot"""

    # TODO: Integrate with actual chatbot_service from ai_modules
    # For now, return mock response
    return ChatResponse(
        response=f"I received your message: '{payload.message}'. Please wait for support.",
        conversation_id=payload.conversation_id or "conv-" + str(datetime.now().timestamp()),
        escalated=False,
        timestamp=datetime.now()
    )

@router.get("/capabilities", response_model=list[ChatCapability])
async def get_capabilities():
    """Get supported chatbot topics"""
    return CAPABILITIES

__all__ = ["router"]
