"""Fraud Detection Router - Wrapper for AI fraud detection module"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/ai/fraud", tags=["Fraud Detection"])

# Models
class FlagStatus(str, Enum):
    OPEN = "OPEN"
    REVIEWING = "REVIEWING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ScanRequest(BaseModel):
    days: int = 30
    include_payments: bool = True
    include_stock: bool = True
    include_bills: bool = True
    include_expenses: bool = True

class ScanResultOut(BaseModel):
    examined: int
    flags_created: int
    flags_skipped_existing: int
    message: str
    automatic_determination_made: bool = False

class FraudFlag(BaseModel):
    id: str
    entity_type: str
    status: FlagStatus
    risk_level: RiskLevel
    rule_code: str
    score: float
    reason: str
    created_at: datetime

class FlagList(BaseModel):
    flags: List[FraudFlag]

class FlagUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class RuleInfo(BaseModel):
    code: str
    name: str
    weight: float

class HoldDecision(BaseModel):
    note: Optional[str] = None

@router.post("/scan", response_model=ScanResultOut)
async def scan_fraud(payload: ScanRequest):
    """Run fraud detection scan"""

    # TODO: Integrate with actual fraud scanning from ai_modules
    return ScanResultOut(
        examined=150,
        flags_created=3,
        flags_skipped_existing=1,
        message="Examined 150 transaction(s) and raised 3 new risk flag(s). No automatic fraud determination is made.",
        automatic_determination_made=False
    )

@router.get("/flags", response_model=FlagList)
async def get_fraud_flags(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    """List fraud flags"""

    # TODO: Integrate with actual flag retrieval from ai_modules
    return FlagList(
        flags=[
            FraudFlag(
                id="flag-1",
                entity_type="payment",
                status=FlagStatus.OPEN,
                risk_level=RiskLevel.HIGH,
                rule_code="HIGH_AMOUNT_UNUSUAL_TIME",
                score=0.85,
                reason="Large payment amount outside normal business hours",
                created_at=datetime.now()
            )
        ]
    )

@router.get("/rules", response_model=List[RuleInfo])
async def get_fraud_rules():
    """Get fraud detection rules"""

    # TODO: Integrate with actual rules from ai_modules
    return [
        RuleInfo(code="HIGH_AMOUNT", name="High Amount Transactions", weight=0.3),
        RuleInfo(code="UNUSUAL_TIME", name="Unusual Time Pattern", weight=0.2),
        RuleInfo(code="VELOCITY", name="High Velocity", weight=0.25),
        RuleInfo(code="GEOGRAPHIC", name="Geographic Anomaly", weight=0.25),
    ]

@router.patch("/flags/{flag_id}", response_model=FraudFlag)
async def review_flag(flag_id: str, payload: FlagUpdate):
    """Review a fraud flag"""

    # TODO: Integrate with actual flag review from ai_modules
    return FraudFlag(
        id=flag_id,
        entity_type="payment",
        status=payload.status,
        risk_level=RiskLevel.HIGH,
        rule_code="TEST_RULE",
        score=0.85,
        reason="Test fraud flag",
        created_at=datetime.now()
    )

@router.get("/holds", response_model=List[FraudFlag])
async def get_held_flags(limit: int = Query(100, ge=1, le=100)):
    """Get held transactions"""

    # TODO: Integrate with actual holds from ai_modules
    return []

@router.post("/flags/{flag_id}/clear", response_model=FraudFlag)
async def clear_hold(flag_id: str, payload: HoldDecision):
    """Clear a fraud hold (false positive)"""

    # TODO: Integrate with actual hold clearing from ai_modules
    return FraudFlag(
        id=flag_id,
        entity_type="payment",
        status=FlagStatus.DISMISSED,
        risk_level=RiskLevel.LOW,
        rule_code="CLEARED",
        score=0.0,
        reason="Cleared by user",
        created_at=datetime.now()
    )

@router.post("/flags/{flag_id}/confirm", response_model=FraudFlag)
async def confirm_hold(flag_id: str, payload: HoldDecision):
    """Confirm a fraud hold (legitimate concern)"""

    # TODO: Integrate with actual hold confirmation from ai_modules
    return FraudFlag(
        id=flag_id,
        entity_type="payment",
        status=FlagStatus.RESOLVED,
        risk_level=RiskLevel.HIGH,
        rule_code="CONFIRMED",
        score=0.95,
        reason="Confirmed by user",
        created_at=datetime.now()
    )

__all__ = ["router"]
