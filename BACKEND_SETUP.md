# 🚀 SmartERP AI Backend Setup Guide

## Overview

The SmartERP AI Backend is a FastAPI application that provides intelligent ERP features:
- 🤖 Support Chatbot
- 📋 Business Reports & Insights
- 🚨 Fraud Detection
- 📈 Sales Forecasting & Inventory Management
- ⚠️ Project Risk Assessment

---

## 📋 Prerequisites

- **Python 3.9+** (Recommended: Python 3.10 or 3.11)
- **pip** (Python package manager)
- **Virtual Environment** (venv or conda)
- **PostgreSQL** (Optional, SQLite used for development)

---

## 🔧 Installation Steps

### 1. Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**Expected packages:**
- FastAPI (Web framework)
- Uvicorn (ASGI server)
- SQLAlchemy (Database ORM)
- Pydantic (Data validation)
- Python-Jose (JWT authentication)
- Groq (AI provider for LLM calls)
- And more...

### 3. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Key settings:**
```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
ENVIRONMENT=development
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Initialize Database (Optional)

For PostgreSQL production:
```bash
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/smarterp_ai

# Run migrations (if using Alembic)
alembic upgrade head
```

For SQLite development (default):
```bash
# No setup needed, SQLite is created automatically
```

---

## 🎯 Running the Backend

### Development Mode (with auto-reload)

```bash
python main.py
```

**Or manually with Uvicorn:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode (without auto-reload)

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Access Points

- **API**: http://localhost:8000
- **Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health**: http://localhost:8000/health

---

## 📊 API Endpoints

### Health Check
```
GET /health
```

### Chatbot
```
POST /api/v1/ai/chatbot
GET /api/v1/ai/chatbot/capabilities
```

### Reports & Insights
```
POST /api/v1/ai/reports
GET /api/v1/ai/reports/types
GET /api/v1/ai/insights
```

### Fraud Detection
```
POST /api/v1/ai/fraud/scan
GET /api/v1/ai/fraud/flags
GET /api/v1/ai/fraud/rules
PATCH /api/v1/ai/fraud/flags/{id}
GET /api/v1/ai/fraud/holds
POST /api/v1/ai/fraud/flags/{id}/clear
POST /api/v1/ai/fraud/flags/{id}/confirm
```

### Forecasting
```
GET /api/v1/ai/forecast/sales
GET /api/v1/ai/inventory-reorder
GET /api/v1/ai/project-risk
```

---

## 🔌 Integration with Frontend

### Frontend Configuration

Update frontend `.env` file:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

The frontend is pre-configured to call these endpoints. No additional setup needed.

### CORS Configuration

The backend is configured to accept requests from:
- Development: All origins (`*`)
- Production: Configure in `.env`

```
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

---

## 🧪 Testing the Integration

### 1. Start Backend
```bash
python main.py
```

### 2. Start Frontend
```bash
cd SmartERP-AI-Frontend
npm run dev
```

### 3. Access Frontend
- Navigate to: http://localhost:5173
- Go to AI Assistant module
- Test each feature:
  - [x] Insights
  - [x] Chatbot
  - [x] Reports
  - [x] Fraud Detection
  - [x] Forecasting
  - [x] Project Risk

### 4. Monitor Backend
- Check logs in console
- Use Swagger UI: http://localhost:8000/docs
- Test endpoints directly

---

## 📦 Project Structure

```
SmartERP/
├── main.py                    # Main FastAPI application
├── requirements.txt           # Python dependencies
├── .env                       # Environment configuration
├── .env.example              # Example env file
├── routers/                  # API route handlers
│   ├── __init__.py
│   ├── chatbot_router.py
│   ├── reports_router.py
│   ├── fraud_router.py
│   └── forecast_router.py
├── ai_modules/               # AI functionality modules
│   ├── 01_chatbot/
│   ├── 02_llm_reports_and_context/
│   ├── 03_fraud_detection/
│   ├── 04_forecasting_cashflow_reorder/
│   ├── 05_scoring_vendor_project_risk/
│   ├── 06_workflows/
│   ├── 07_maintenance/
│   └── 08_local_ml/
└── SmartERP-AI-Frontend/    # React frontend
```

---

## 🔐 Security Considerations

### Development
- CORS: `*` (all origins allowed)
- Debug mode: Enabled
- Credentials: Mock/example credentials

### Production
1. **Update CORS settings**
   ```
   CORS_ORIGINS=["https://yourdomain.com"]
   ```

2. **Change SECRET_KEY**
   ```
   SECRET_KEY=generate-a-strong-random-key
   ```

3. **Use HTTPS**
   - Set up SSL certificates
   - Use reverse proxy (Nginx/Apache)

4. **Database Security**
   - Use strong passwords
   - Enable SSL for database connections
   - Regular backups

5. **API Security**
   - Implement JWT authentication
   - Rate limiting
   - Input validation

6. **Environment Variables**
   - Never commit `.env` file
   - Use `.env.example` for defaults
   - Rotate API keys regularly

---

## 🐛 Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'routers'`
**Solution:**
```bash
# Make sure you're in the SmartERP root directory
cd d:\SmartERP
python main.py
```

### Issue: Port 8000 already in use
**Solution:**
```bash
# Use different port
uvicorn main:app --port 8001
```

### Issue: CORS errors in frontend
**Solution:**
```
Check .env CORS_ORIGINS setting
Ensure frontend URL is in the list
Restart backend after changes
```

### Issue: Database connection error
**Solution:**
```
Verify DATABASE_URL in .env
Check PostgreSQL is running (if used)
Use SQLite for development
```

### Issue: AI provider errors
**Solution:**
```
Verify GROQ_API_KEY in .env
Check Groq service status
Try alternative AI provider
```

---

## 📈 Performance Tips

1. **Use PostgreSQL in production** (not SQLite)
2. **Enable query caching**
3. **Use connection pooling**
4. **Monitor API response times**
5. **Implement pagination for large datasets**

---

## 🔄 Updating Dependencies

Check for updates:
```bash
pip list --outdated
```

Update all packages:
```bash
pip install --upgrade -r requirements.txt
```

---

## 📝 Adding New Routes

1. Create new file in `routers/` folder
2. Create FastAPI router with endpoints
3. Import in `main.py`
4. Add to router inclusion loop

Example:
```python
# routers/new_feature_router.py
from fastapi import APIRouter

router = APIRouter(prefix="/ai/new-feature", tags=["New Feature"])

@router.get("/")
async def get_feature():
    return {"message": "New feature"}
```

Then in `main.py`:
```python
from routers.new_feature_router import router as new_feature_router
app.include_router(new_feature_router, prefix="/api/v1")
```

---

## 📚 Documentation

- **FastAPI Docs**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **FastAPI Tutorial**: https://fastapi.tiangolo.com/

---

## 🚀 Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t smarterp-ai-backend .
docker run -p 8000:8000 smarterp-ai-backend
```

### Environment File
Create `.env.production`:
```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
ENVIRONMENT=production
DATABASE_URL=postgresql://...
GROQ_API_KEY=...
SECRET_KEY=...
CORS_ORIGINS=["https://yourdomain.com"]
```

---

## 📞 Support

For issues or questions:
1. Check logs in console
2. Review Swagger documentation
3. Check CORS and environment settings
4. Verify all dependencies are installed

---

## ✅ Verification Checklist

- [x] Python 3.9+ installed
- [x] Virtual environment created
- [x] Dependencies installed
- [x] `.env` file configured
- [x] Backend starts without errors
- [x] Swagger UI accessible at http://localhost:8000/docs
- [x] Frontend `.env` points to correct backend URL
- [x] Frontend can make API calls
- [x] All 6 AI features working

---

**Last Updated:** 2026-11-20  
**Status:** ✅ Ready for Use  
**Version:** 1.0.0
