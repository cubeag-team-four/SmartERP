# 🔗 Integration Guide - Connecting AI Modules to Frontend

This guide explains how to integrate the actual Python AI modules from `ai_modules/` with the frontend.

---

## 📋 Current Architecture

```
┌─────────────────────┐
│  React Frontend     │
│  (Port 5173)        │
└──────────┬──────────┘
           │
           │ HTTP Calls
           │
┌──────────▼──────────┐
│  FastAPI Backend    │
│  (Port 8000)        │
│  /api/v1/*          │
└──────────┬──────────┘
           │
           │ Python Imports
           │
┌──────────▼──────────┐
│  AI Modules         │
│  (Python Classes)   │
└─────────────────────┘
```

---

## 🎯 Integration Steps

### Step 1: Understand the AI Modules Structure

The `ai_modules/` folder contains:

```
ai_modules/
├── 01_chatbot/
│   ├── chatbot.py          ← Core chatbot logic
│   ├── chatbot_service.py  ← Service layer
│   └── intents.py          ← Intent definitions
├── 02_llm_reports_and_context/
│   ├── reports.py          ← Report generation
│   ├── insights.py         ← Insight generation
│   └── service.py          ← Service layer
├── 03_fraud_detection/
│   ├── fraud.py            ← Fraud logic
│   ├── fraud_service.py    ← Service layer
│   └── fraud_hold.py       ← Hold management
├── 04_forecasting_cashflow_reorder/
│   ├── forecast.py         ← Sales forecasting
│   ├── inventory_reorder.py ← Reorder logic
│   └── cashflow.py         ← Cashflow analysis
├── 05_scoring_vendor_project_risk/
│   ├── project_risk.py     ← Project risk
│   ├── vendor_ranking.py   ← Vendor scoring
│   └── scoring.py          ← Scoring logic
├── 06_workflows/
│   └── workflows.py        ← Workflow automation
├── 07_maintenance/
│   └── maintenance.py      ← Maintenance tasks
└── 08_local_ml/
    ├── forecasting.py      ← Local ML forecasting
    ├── sentiment.py        ← Sentiment analysis
    └── patterns.py         ← Pattern detection
```

### Step 2: Import AI Modules into Routers

For each router file in `routers/`, import the actual service:

**Example: Chatbot Router Integration**

```python
# routers/chatbot_router.py

# BEFORE (Mock):
@router.post("", response_model=ChatResponse)
async def send_message(payload: ChatRequest):
    return ChatResponse(
        response="Mock response",
        ...
    )

# AFTER (Real Integration):
from ai_modules.chatbot_service import answer_support_question

@router.post("", response_model=ChatResponse)
async def send_message(payload: ChatRequest, db: DBSession):
    response = answer_support_question(
        db, 
        actor, 
        payload.message, 
        payload.conversation_id
    )
    return response
```

### Step 3: Set Up Database Connection

The AI modules expect database access. Update `main.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Create database engine
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smarterp_ai.db")
engine = create_engine(DATABASE_URL)

# Dependency for database session
def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()
```

### Step 4: Integrate Each Module

#### Chatbot Module
```python
# routers/chatbot_router.py

from ai_modules.chatbot_service import (
    answer_support_question,
    record_escalation
)
from ai_modules.chatbot import detect_chatbot_intent

@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    db: Session = Depends(get_db)
):
    response = answer_support_question(
        db, 
        actor_obj,
        payload.message,
        payload.conversation_id
    )
    return response
```

#### Reports Module
```python
# routers/reports_router.py

from ai_modules.reports import generate_report
from ai_modules.insights import build_insights

@router.post("/reports", response_model=GeneratedReport)
async def generate_business_report(
    payload: ReportRequest,
    db: Session = Depends(get_db)
):
    return generate_report(
        db,
        window,
        actor,
        payload.report_type,
        explain=payload.explain
    )
```

#### Fraud Detection Module
```python
# routers/fraud_router.py

from ai_modules.fraud import run_fraud_scan
from ai_modules.fraud_service import (
    list_flags,
    apply_review,
    scan_out
)

@router.post("/scan", response_model=ScanResultOut)
async def scan_fraud(
    payload: ScanRequest,
    db: Session = Depends(get_db)
):
    result = run_fraud_scan(
        db,
        tenant_id,
        days=payload.days,
        include_payments=payload.include_payments,
        ...
    )
    return scan_out(result, message)
```

#### Forecasting Module
```python
# routers/forecast_router.py

from ai_modules.forecast import sales_forecast
from ai_modules.inventory_reorder import reorder_insight
from ai_modules.project_risk import project_risk_report

@router.get("/forecast/sales", response_model=SalesForecast)
async def get_sales_forecast(
    horizon: int = 30,
    db: Session = Depends(get_db)
):
    return sales_forecast(db, scope, horizon=horizon)
```

### Step 5: Add Authentication & User Context

The AI modules need to know who is making requests:

```python
from fastapi import Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    credentials = Depends(security)
):
    # Extract user from token
    user = get_current_user(credentials.credentials)
    
    # Pass to AI module
    response = answer_support_question(
        db,
        user,  # User object
        payload.message,
        payload.conversation_id
    )
    return response
```

### Step 6: Handle Permissions

The AI modules check permissions. Configure them:

```python
# Check if user has permission
if not has_permission(user, "ai.use"):
    raise PermissionError("User lacks AI access")

# Generate reports only for permitted sections
response = generate_report(db, window, user, report_type)
```

---

## 🔄 Integration Checklist

### Chatbot Module
- [ ] Import `chatbot_service`
- [ ] Import `detect_chatbot_intent`
- [ ] Add database dependency
- [ ] Add user/actor parameter
- [ ] Handle escalation permission
- [ ] Test with backend

### Reports & Insights
- [ ] Import `generate_report`
- [ ] Import `build_insights`
- [ ] Add period resolver
- [ ] Add permission checks
- [ ] Test report generation
- [ ] Test insight generation

### Fraud Detection
- [ ] Import `run_fraud_scan`
- [ ] Import `fraud_service` functions
- [ ] Add database dependency
- [ ] Add audit logging
- [ ] Test scan functionality
- [ ] Test flag management

### Forecasting
- [ ] Import `sales_forecast`
- [ ] Import `reorder_insight`
- [ ] Import `project_risk_report`
- [ ] Add historical data handling
- [ ] Test forecast generation
- [ ] Test reorder recommendations

---

## 🧪 Testing After Integration

### 1. Test Each Endpoint

```bash
# Test chatbot
curl -X POST http://localhost:8000/api/v1/ai/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my order status?"}'

# Test reports
curl -X GET http://localhost:8000/api/v1/ai/reports/types

# Test fraud scan
curl -X POST http://localhost:8000/api/v1/ai/fraud/scan \
  -H "Content-Type: application/json" \
  -d '{"days": 30, "include_payments": true}'
```

### 2. Monitor Logs

The backend will show:
- API calls received
- AI module function calls
- Database queries
- Errors and warnings

### 3. Use Swagger UI

Visit http://localhost:8000/docs to:
- See all endpoints
- Test each endpoint
- View request/response schemas
- Check error codes

### 4. Frontend Testing

- Each AI Assistant tab should work
- Real data should appear
- No "insufficient data" messages (if data exists)

---

## ⚙️ Configuration Files Needed

### Database Configuration
```python
# In main.py or config.py
DATABASE_URL = "postgresql://user:pass@localhost/smarterp_ai"
engine = create_engine(DATABASE_URL)
```

### AI Provider Configuration
```python
# .env
GROQ_API_KEY=your_key_here
GROQ_MODEL=mixtral-8x7b-32768
```

### Authentication Setup
```python
# In main.py
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
```

---

## 🔐 Handling Permissions

The AI modules use the existing permission system:

```python
# Permission names used by AI modules:
"ai.use"                      # General AI features
"chatbot.use"                 # Chatbot access
"chatbot.escalation"          # Can escalate
"fraud.view"                  # View fraud flags
"fraud.scan"                  # Run fraud scan
"fraud.review"                # Review fraud flags
"fraud.hold.release"          # Release holds
"project.view"                # Project risk
"sales.view"                  # Sales forecast
"inventory.stock.view"        # Inventory reorder
```

Configure these in your authentication system.

---

## 🚀 Deployment Considerations

### Environment Variables
```
DATABASE_URL=postgresql://...
GROQ_API_KEY=...
SECRET_KEY=...
LOG_LEVEL=INFO
ENVIRONMENT=production
```

### Database Migrations
If using new tables:
```bash
alembic revision --autogenerate -m "Add AI tables"
alembic upgrade head
```

### Performance Optimization
- Use connection pooling for database
- Cache AI provider responses when possible
- Implement rate limiting
- Use Celery for async tasks

---

## 📚 Next Steps

1. ✅ Backend running with mock data
2. ✅ Frontend connected and working
3. 🔄 **YOU ARE HERE** - Integration phase
4. Import real AI modules into routers
5. Set up database schema
6. Configure authentication
7. Test each feature
8. Deploy to production

---

## 🐛 Common Integration Issues

### Issue: AI Module Not Found
```python
ModuleNotFoundError: No module named 'ai_modules.chatbot'

# Solution:
# 1. Check ai_modules/ folder structure
# 2. Ensure __init__.py files exist
# 3. Add to Python path: sys.path.insert(0, os.path.dirname(__file__))
```

### Issue: Database Errors
```python
sqlalchemy.exc.OperationalError: Can't connect to database

# Solution:
# 1. Verify DATABASE_URL in .env
# 2. Check database is running
# 3. Verify credentials
# 4. Check database exists
```

### Issue: Permission Denied
```python
PermissionError: User lacks AI access

# Solution:
# 1. Assign "ai.use" permission to user
# 2. Check permission system in auth module
# 3. Verify user authentication
```

---

## 📝 Integration Timeline

- **Phase 1:** ✅ Frontend & Backend Setup (Complete)
- **Phase 2:** 🔄 Module Integration (Current)
  - Week 1: Chatbot & Reports
  - Week 2: Fraud Detection
  - Week 3: Forecasting
  - Week 4: Testing & Optimization
- **Phase 3:** Database & Auth Setup
- **Phase 4:** Production Deployment

---

## 📞 Support Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **SQLAlchemy Docs:** https://docs.sqlalchemy.org/
- **Pydantic Docs:** https://docs.pydantic.dev/
- **Backend Setup:** See `BACKEND_SETUP.md`

---

**Last Updated:** 2026-11-20  
**Status:** Integration Guide v1.0
