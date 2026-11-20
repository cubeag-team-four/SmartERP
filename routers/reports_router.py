"""Reports Router - Wrapper for AI reports module"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/ai", tags=["Reports"])

# Models
class ReportType(str, Enum):
    SALES_SUMMARY = "SALES_SUMMARY"
    INVENTORY_SUMMARY = "INVENTORY_SUMMARY"
    FINANCIAL_SUMMARY = "FINANCIAL_SUMMARY"
    BUSINESS_SUMMARY = "BUSINESS_SUMMARY"

class ReportRequest(BaseModel):
    report_type: ReportType
    period: Optional[str] = "current_month"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    explain: bool = True

class ReportFigure(BaseModel):
    label: str
    value: str

class ReportSection(BaseModel):
    title: str
    figures: Optional[List[ReportFigure]] = None
    narrative: Optional[str] = None

class GeneratedReport(BaseModel):
    title: str
    report_type: str
    period: str
    executive_summary: Optional[str] = None
    sections: Optional[List[ReportSection]] = None
    generated_at: datetime
    generated_by: str = "system"

class ReportTypeInfo(BaseModel):
    report_type: str
    title: str
    permission: Optional[str] = None

# AI Insights Models
class AIInsight(BaseModel):
    section: str
    observation: str
    metric_name: Optional[str] = None
    metric_value: Optional[str] = None

class AIInsights(BaseModel):
    period: dict
    insights: List[AIInsight]
    sections: List[str]
    insufficient_data: bool
    generated_by: str = "system"

@router.post("/reports", response_model=GeneratedReport)
async def generate_report(payload: ReportRequest):
    """Generate a business report"""

    # TODO: Integrate with actual report generation from ai_modules
    return GeneratedReport(
        title=f"{payload.report_type.value} Report",
        report_type=payload.report_type,
        period=payload.period,
        executive_summary="Report summary would be generated here.",
        sections=[
            ReportSection(
                title="Overview",
                figures=[
                    ReportFigure(label="Total Revenue", value="$100,000"),
                    ReportFigure(label="Total Orders", value="250"),
                ]
            )
        ],
        generated_at=datetime.now(),
        generated_by="system"
    )

@router.get("/reports/types", response_model=dict)
async def get_report_types():
    """Get available report types"""

    reports = [
        {"report_type": "SALES_SUMMARY", "title": "Sales Summary", "permission": None},
        {"report_type": "INVENTORY_SUMMARY", "title": "Inventory Summary", "permission": None},
        {"report_type": "FINANCIAL_SUMMARY", "title": "Financial Summary", "permission": None},
        {"report_type": "BUSINESS_SUMMARY", "title": "Business Overview", "permission": None},
    ]

    return {"reports": reports}

@router.get("/insights", response_model=AIInsights)
async def get_insights(
    period: Optional[str] = Query("current_month"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get AI-generated business insights"""

    # TODO: Integrate with actual insights generation from ai_modules
    return AIInsights(
        period={"period": period, "date_from": date_from, "date_to": date_to},
        insights=[
            AIInsight(
                section="Sales",
                observation="Sales are trending upward this month.",
                metric_name="Total Sales",
                metric_value="$150,000"
            ),
            AIInsight(
                section="Inventory",
                observation="Stock levels are optimal across all categories.",
                metric_name="Inventory Level",
                metric_value="92%"
            )
        ],
        sections=["Sales", "Inventory", "Finance"],
        insufficient_data=False
    )

__all__ = ["router"]
