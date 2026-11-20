# 🤖 AI Business Assistant Module

A comprehensive AI-powered module integrating all intelligent ERP features into your React frontend.

## 📋 Features

### 1. **📊 Insights** (`Insights.jsx`)
- Real-time AI-generated business insights
- Dashboard metrics analysis
- Customizable period selection
- Multiple section coverage (Sales, Inventory, Finance, etc.)

### 2. **🤖 Chatbot** (`Chatbot.jsx`)
- Support chatbot for customer inquiries
- Order status checking
- Product availability queries
- Human escalation support
- Conversation history

### 3. **📋 Reports** (`Reports.jsx`)
- Business report generation
- Executive summaries
- Multi-section report analysis
- Report download functionality
- Period-based filtering

### 4. **🚨 Fraud Detection** (`FraudDetection.jsx`)
- Fraud risk scanning
- Risk flag management (OPEN, REVIEWING, RESOLVED, DISMISSED)
- Held transactions review
- Detection rules catalog
- Risk level filtering (LOW, MEDIUM, HIGH, CRITICAL)

### 5. **📈 Forecasting** (`Forecasting.jsx`)
- Sales forecasting with configurable horizons
- Inventory reorder recommendations
- Demand analysis
- Reorder point calculations
- Interactive charts

### 6. **⚠️ Project Risk** (`ProjectRisk.jsx`)
- Milestone delay risk assessment
- Task completion tracking
- Timeline analysis
- Risk scoring
- Project-wise filtering

## 🏗️ Project Structure

```
aiAssistant/
├── BusinessAssistant.jsx          # Main component with tabs
├── BusinessAssistant.css          # Global styles
├── README.md                       # This file
├── components/
│   ├── Insights.jsx
│   ├── Chatbot.jsx
│   ├── Reports.jsx
│   ├── FraudDetection.jsx
│   ├── Forecasting.jsx
│   └── ProjectRisk.jsx
└── services/
    └── aiAssistant.service.js     # API service layer
```

## 🚀 Usage

### Import and Use
```jsx
import BusinessAssistant from '@/pages/modules/aiAssistant/BusinessAssistant'

export default function App() {
  return <BusinessAssistant />
}
```

### API Endpoints Used
All endpoints require authentication via access token.

#### Insights
- `GET /ai/insights?period=current_month`

#### Chatbot
- `POST /ai/chatbot` - Send message
- `GET /ai/chatbot/capabilities` - Get available topics

#### Reports
- `POST /ai/reports` - Generate report
- `GET /ai/reports/types` - Get available report types

#### Fraud Detection
- `POST /ai/fraud/scan` - Run fraud scan
- `GET /ai/fraud/flags` - List fraud flags
- `GET /ai/fraud/rules` - Get detection rules
- `PATCH /ai/fraud/flags/{id}` - Review flag
- `GET /ai/fraud/holds` - Get held transactions
- `POST /ai/fraud/flags/{id}/clear` - Clear hold
- `POST /ai/fraud/flags/{id}/confirm` - Confirm hold

#### Forecasting
- `GET /ai/forecast/sales?horizon=30` - Get sales forecast
- `GET /ai/inventory-reorder?product_id=X` - Get reorder insight

#### Project Risk
- `GET /ai/project-risk` - Get project risk assessment

## 🎨 Styling

The module uses a comprehensive CSS system with:
- **Responsive Grid Layouts** - Auto-adapting to screen sizes
- **Consistent Color Scheme** - Blue, green, yellow, red badges
- **Card-based Design** - Clean, organized content blocks
- **Dark/Light Mode Support** - Via CSS variables (ready to implement)

### CSS Classes
- `.badge-*` - Status badges (success, warning, danger, info)
- `.btn-*` - Button variants (primary, outline, sm, lg)
- `.card` - Content container
- `.grid` - Responsive grid layout

## 🔌 Service Integration

The `aiAssistant.service.js` provides a clean API interface:

```javascript
import aiAssistantService from './services/aiAssistant.service'

// Insights
await aiAssistantService.getInsights({ period: 'current_month' })

// Chatbot
await aiAssistantService.sendChatMessage({ 
  message: 'What is my order status?',
  conversation_id: 'conv-123' 
})

// Reports
await aiAssistantService.generateReport({
  report_type: 'SALES_SUMMARY',
  period: 'current_month'
})

// Fraud
await aiAssistantService.runFraudScan({
  days: 30,
  include_payments: true
})

// Forecasting
await aiAssistantService.getSalesForecast({ horizon: 30 })
await aiAssistantService.getInventoryReorder({ 
  product_id: 'prod-123',
  lookback_days: 30
})

// Project Risk
await aiAssistantService.getProjectRisk()
```

## 🎯 Permissions Required

The module respects backend permissions:

- `ai.use` - General AI features access
- `chatbot.use` - Chatbot access
- `fraud.view` - View fraud flags
- `fraud.scan` - Run fraud scans
- `fraud.review` - Review fraud decisions
- `sales.view` - Sales forecasting
- `project.view` - Project risk assessment

## 🔄 Data Flow

```
User Interaction
    ↓
Component (e.g., Reports.jsx)
    ↓
aiAssistant.service.js
    ↓
apiService.js (HTTP client)
    ↓
Backend API (/ai/*)
    ↓
Python AI Modules
    ↓
Response → Component State → Render UI
```

## 📊 Component States

Each component manages:
- **Loading State** - Shows spinner during API calls
- **Error State** - Toast notifications for failures
- **Empty State** - User-friendly "no data" message
- **Data State** - Rendered content with interactions

## 🛠️ Development

### Adding a New AI Feature

1. Create component in `components/[Feature].jsx`
2. Add service method in `aiAssistant.service.js`
3. Import component in `BusinessAssistant.jsx`
4. Add tab configuration
5. Add to tab switch statement
6. Style with CSS

### Example Component Template
```jsx
import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card } from '@/components/common'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const NewFeature = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await aiAssistantService.getFeatureData()
      setData(response)
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />
  if (!data) return <EmptyState message="No data" />

  return <div className="feature-container">{/* content */}</div>
}

export default NewFeature
```

## 🧪 Testing

To test the module locally:

1. Start your dev server: `npm run dev`
2. Navigate to the AI Assistant page
3. Test each tab:
   - Click through different sections
   - Try filters and controls
   - Verify API calls in Network tab
   - Check error handling

## 📱 Responsive Design

The module is fully responsive:
- **Desktop** (1024px+) - Full grid layouts
- **Tablet** (768px - 1023px) - 2-column layouts
- **Mobile** (< 768px) - Single column, stacked views

## ⚡ Performance

- Lazy loading of components (via route splitting)
- Efficient API caching via service layer
- Debounced search inputs
- Optimized re-renders with proper dependency arrays
- CSS Grid for performant layouts

## 🐛 Common Issues

### API 401 Unauthorized
- Check if access token is valid
- Verify authentication service

### Empty states showing
- Check backend permissions
- Verify data exists in backend
- Check API endpoints in browser console

### Styling not applied
- Verify CSS import in BusinessAssistant.jsx
- Check CSS class names match component usage
- Clear browser cache

## 📚 Backend Integration Notes

- All endpoints return paginated results where applicable
- Timestamps are ISO 8601 format
- UUIDs used for entity IDs
- Period strings: `current_month`, `last_month`, `current_quarter`, etc.
- Risk levels: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

## 🔐 Security

- All requests include authentication via interceptor
- Backend validates permissions on each endpoint
- No sensitive data in localStorage
- API service handles token refresh automatically
- CORS properly configured on backend

## 📖 Additional Resources

- Backend router docs: See `ai_modules` Python files
- API schemas: Check FastAPI documentation
- Component patterns: Review existing components for consistency
- Styling guide: See BusinessAssistant.css comments

---

**Last Updated:** 2026-11-20
**Version:** 1.0.0
**Status:** ✅ Production Ready
