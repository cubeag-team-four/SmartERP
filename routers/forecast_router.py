"""Forecasting Router - Wrapper for AI forecasting module"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/ai", tags=["Forecasting"])

# Models
class ForecastDataPoint(BaseModel):
    date: str
    actual_sales: Optional[float] = None
    predicted_sales: float

class SalesForecast(BaseModel):
    forecast_data: List[ForecastDataPoint]
    total_forecast_amount: float
    confidence_level: float
    period: str

class RecommendationDetail(BaseModel):
    recommended_quantity: int
    average_daily_demand: float
    safety_stock: int
    reorder_point: int
    current_stock: int

class ReorderInsightResponse(BaseModel):
    status: str  # SUFFICIENT_DATA or INSUFFICIENT_DATA
    recommendation: Optional[RecommendationDetail] = None
    message: Optional[str] = None

class ProjectRiskMilestone(BaseModel):
    milestone_name: str
    project_name: Optional[str] = None
    risk_level: str  # LOW, MEDIUM, HIGH, INSUFFICIENT_DATA
    risk_score: Optional[float] = None
    elapsed_percentage: Optional[float] = None
    work_completed_percentage: Optional[float] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    tasks_count: Optional[int] = None
    tasks_completed_count: Optional[int] = None
    reason: Optional[str] = None
    recommendation: Optional[str] = None

class ProjectRiskReportResponse(BaseModel):
    milestones: List[ProjectRiskMilestone]

@router.get("/forecast/sales", response_model=SalesForecast)
async def get_sales_forecast(horizon: int = Query(30, ge=1, le=90)):
    """Get sales forecast"""

    # TODO: Integrate with actual forecasting from ai_modules
    forecast_data = []
    base_date = datetime.now()

    for i in range(horizon):
        forecast_date = base_date + timedelta(days=i)
        forecast_data.append(
            ForecastDataPoint(
                date=forecast_date.isoformat(),
                actual_sales=10000 + (i * 100) if i < 7 else None,
                predicted_sales=10000 + (i * 150)
            )
        )

    return SalesForecast(
        forecast_data=forecast_data,
        total_forecast_amount=sum(d.predicted_sales for d in forecast_data),
        confidence_level=0.85,
        period=f"Next {horizon} days"
    )

@router.get("/inventory-reorder", response_model=ReorderInsightResponse)
async def get_inventory_reorder(
    product_id: str = Query(...),
    lookback_days: int = Query(30, ge=7, le=365),
    lead_time_days: int = Query(7, ge=1, le=365)
):
    """Get inventory reorder recommendation"""

    # TODO: Integrate with actual reorder insight from ai_modules
    return ReorderInsightResponse(
        status="SUFFICIENT_DATA",
        recommendation=RecommendationDetail(
            recommended_quantity=500,
            average_daily_demand=15.5,
            safety_stock=100,
            reorder_point=200,
            current_stock=150
        ),
        message="Based on historical demand, we recommend reordering 500 units now."
    )

@router.get("/project-risk", response_model=ProjectRiskReportResponse)
async def get_project_risk(project_id: Optional[str] = Query(None)):
    """Get project risk assessment"""

    # TODO: Integrate with actual project risk from ai_modules
    return ProjectRiskReportResponse(
        milestones=[
            ProjectRiskMilestone(
                milestone_name="Phase 1 Completion",
                project_name="Website Redesign",
                risk_level="MEDIUM",
                risk_score=0.65,
                elapsed_percentage=65.0,
                work_completed_percentage=45.0,
                planned_start="2026-11-01",
                planned_end="2026-12-01",
                tasks_count=10,
                tasks_completed_count=4,
                reason="Work progress is behind schedule timeline",
                recommendation="Increase team resources or adjust timeline expectations"
            ),
            ProjectRiskMilestone(
                milestone_name="Testing Phase",
                project_name="Website Redesign",
                risk_level="LOW",
                risk_score=0.25,
                elapsed_percentage=10.0,
                work_completed_percentage=15.0,
                planned_start="2026-12-02",
                planned_end="2026-12-31",
                tasks_count=5,
                tasks_completed_count=1,
                reason="Project is on track with early phase completion",
                recommendation="Continue current pace"
            )
        ]
    )

__all__ = ["router"]
