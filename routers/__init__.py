"""AI Backend Routers"""

from .auth_router import router as auth_router
from .chatbot_router import router as chatbot_router
from .reports_router import router as reports_router
from .fraud_router import router as fraud_router
from .forecast_router import router as forecast_router

__all__ = [
    "auth_router",
    "chatbot_router",
    "reports_router",
    "fraud_router",
    "forecast_router",
]
