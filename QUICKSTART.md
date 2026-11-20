# ⚡ Quick Start Guide - SmartERP AI

Get the entire AI system running in **5 minutes**!

---

## 🎯 Quick Setup (5 Steps)

### Step 1: Install Python Dependencies
```bash
cd d:\SmartERP
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2: Start the Backend
```bash
python main.py
```
✅ **Backend running at:** http://localhost:8000

**In browser, open:** http://localhost:8000/docs (see all API endpoints)

### Step 3: Configure Frontend (New Terminal)
```bash
cd d:\SmartERP\SmartERP-AI-Frontend
```

**Verify .env file has:**
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Step 4: Install Frontend Dependencies
```bash
npm install
```

### Step 5: Start Frontend
```bash
npm run dev
```
✅ **Frontend running at:** http://localhost:5173

---

## 🎮 Using the AI Assistant

1. **Open browser:** http://localhost:5173
2. **Navigate to:** AI Assistant (or /ai-assistant)
3. **Choose a feature:**
   - 📊 **Insights** - Business intelligence
   - 🤖 **Chatbot** - Support questions
   - 📋 **Reports** - Generate reports
   - 🚨 **Fraud** - Fraud detection
   - 📈 **Forecasting** - Sales & inventory
   - ⚠️ **Project Risk** - Milestone tracking

---

## 🔧 Configuration Files

### Backend (.env)
Located at: `d:\SmartERP\.env`

Key settings:
```
BACKEND_PORT=8000
ENVIRONMENT=development
GROQ_API_KEY=your_key_here
```

### Frontend (.env)
Located at: `d:\SmartERP\SmartERP-AI-Frontend\.env`

Key settings:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
```

---

## 📊 Testing Features

### 1. Test Insights
- Go to Insights tab
- Select period (This Month, Last Month, etc.)
- Click "Refresh Insights"

### 2. Test Chatbot
- Go to Chatbot tab
- Click a quick action button
- Or type a question
- Send message

### 3. Test Reports
- Go to Reports tab
- Select report type
- Click "Generate Report"
- Download if available

### 4. Test Fraud Detection
- Go to Fraud Detection tab
- Click "🔍 Run Fraud Scan"
- Review flags
- Check held transactions

### 5. Test Forecasting
- Go to Forecasting tab
- Adjust horizon (7-90 days)
- Or enter product ID and get reorder advice

### 6. Test Project Risk
- Go to Project Risk tab
- View milestone assessments
- Filter by risk level

---

## 📱 Browser DevTools

Monitor your API calls:

1. **Open DevTools:** `F12`
2. **Go to Network tab**
3. **Make a request in the app**
4. **See API calls to:** `http://localhost:8000/api/v1/*`

---

## 🛑 Stopping Services

### Stop Backend
Press `Ctrl+C` in backend terminal

### Stop Frontend
Press `Ctrl+C` in frontend terminal

---

## 🔄 Restart Services

### Complete Restart
```bash
# Terminal 1 - Backend
python main.py

# Terminal 2 - Frontend
npm run dev
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 8000 in use** | Kill process or use `--port 8001` |
| **API 401 errors** | Check if backend is running |
| **Empty data** | Mock data, real integration TBD |
| **CORS errors** | Verify `.env` CORS settings |
| **Styling wrong** | Clear cache: `Ctrl+Shift+Delete` |

---

## 📂 Project Layout

```
SmartERP/
├── main.py                          ← Backend entry point
├── requirements.txt                 ← Backend dependencies
├── .env                             ← Backend config
├── routers/                         ← API routes
│   ├── chatbot_router.py
│   ├── reports_router.py
│   ├── fraud_router.py
│   └── forecast_router.py
├── SmartERP-AI-Frontend/
│   ├── .env                         ← Frontend config
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       └── pages/modules/aiAssistant/
│           ├── BusinessAssistant.jsx
│           └── components/
│               ├── Insights.jsx
│               ├── Chatbot.jsx
│               ├── Reports.jsx
│               ├── FraudDetection.jsx
│               ├── Forecasting.jsx
│               └── ProjectRisk.jsx
└── ai_modules/                      ← AI features
```

---

## 🚀 What's Included

✅ **6 AI Features**
- Chatbot support
- Business reports
- Fraud detection
- Sales forecasting
- Inventory management
- Project risk assessment

✅ **Full Frontend**
- React components
- Responsive design
- Error handling
- Loading states

✅ **Backend Ready**
- FastAPI server
- API routes
- Mock data
- Environment configuration

---

## 📖 Full Documentation

For detailed setup, see:
- **Backend Setup:** `BACKEND_SETUP.md`
- **Frontend Guide:** `SmartERP-AI-Frontend/src/pages/modules/aiAssistant/README.md`
- **Implementation:** `SmartERP-AI-Frontend/src/pages/modules/aiAssistant/IMPLEMENTATION_SUMMARY.md`

---

## ✨ Next Steps

1. ✅ Backend running
2. ✅ Frontend running
3. 📍 Explore AI features
4. 🔗 Integrate real AI modules from `ai_modules/`
5. 🗄️ Connect to actual database
6. 🔐 Set up authentication
7. 🚀 Deploy to production

---

## 💡 Tips

- **Hot Reload:** Both frontend and backend auto-refresh on changes
- **API Explorer:** Visit http://localhost:8000/docs while running backend
- **Mock Data:** Currently using mock responses for demo
- **Real Integration:** Next step is to integrate actual Python AI modules

---

**🎉 You're all set! Enjoy the SmartERP AI experience!**

---

**Questions?** Check the full documentation files for detailed info.

**Last Updated:** 2026-11-20
