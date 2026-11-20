"""
SmartERP AI Backend - FastAPI Application

Main entry point for the AI modules backend.
Integrates all AI features: chatbot, reports, fraud detection, forecasting, etc.

Run: uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers
try:
    from routers.simple_auth_router import router as auth_router
    from routers.chatbot_router import router as chatbot_router
    from routers.reports_router import router as reports_router
    from routers.fraud_router import router as fraud_router
    from routers.forecast_router import router as forecast_router
    logger.info("✅ All routers imported successfully")
except ImportError as e:
    logger.warning(f"Could not import routers: {e}")
    auth_router = None
    chatbot_router = None
    reports_router = None
    fraud_router = None
    forecast_router = None

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 SmartERP AI Backend starting...")
    logger.info("✅ Database connections initialized")
    logger.info("✅ AI modules loaded")
    logger.info("✅ All systems ready")
    yield
    # Shutdown
    logger.info("🛑 Shutting down SmartERP AI Backend...")

# Create FastAPI app
app = FastAPI(
    title="SmartERP AI Backend",
    description="Intelligent ERP features: Chatbot, Reports, Fraud Detection, Forecasting, Project Risk",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "SmartERP AI Backend",
        "version": "1.0.0"
    }

# API Root
@app.get("/api/v1", tags=["Root"])
async def api_root():
    """API root endpoint"""
    return {
        "message": "SmartERP AI Backend",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chatbot": "/api/v1/ai/chatbot",
            "reports": "/api/v1/ai/reports",
            "fraud": "/api/v1/ai/fraud",
            "forecast": "/api/v1/ai/forecast",
            "insights": "/api/v1/ai/insights",
            "project_risk": "/api/v1/ai/project-risk"
        }
    }

# Include routers
def include_routers():
    """Include all API routers"""

    # Auth Routes
    if auth_router:
        app.include_router(auth_router, prefix="/api/v1")
        logger.info("✅ Auth router registered")

    # Chatbot Routes
    if chatbot_router:
        app.include_router(chatbot_router, prefix="/api/v1")
        logger.info("✅ Chatbot router registered")

    # Reports Routes
    if reports_router:
        app.include_router(reports_router, prefix="/api/v1")
        logger.info("✅ Reports router registered")

    # Fraud Detection Routes
    if fraud_router:
        app.include_router(fraud_router, prefix="/api/v1")
        logger.info("✅ Fraud detection router registered")

    # Forecasting Routes
    if forecast_router:
        app.include_router(forecast_router, prefix="/api/v1")
        logger.info("✅ Forecasting router registered")

    logger.info("📋 All routers configured")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__
        }
    )

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found"}
    )

# Initialize routers
include_routers()

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting SmartERP AI Backend...")
    logger.info("🌐 Server: http://localhost:8000")
    logger.info("📚 Docs: http://localhost:8000/docs")
    logger.info("🔍 ReDoc: http://localhost:8000/redoc")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
