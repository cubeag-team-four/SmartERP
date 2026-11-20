import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card } from '../../../../components/common'
import { LineChartWidget } from '../../../../components/charts'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const Insights = () => {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(null)
  const [period, setPeriod] = useState('current_month')

  useEffect(() => {
    fetchInsights()
  }, [period])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      const response = await aiAssistantService.getInsights({ period })
      setInsights(response)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fetch insights')
      console.error('Insights fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />

  if (!insights || insights.insufficient_data) {
    return <EmptyState message="Insufficient data to generate insights" />
  }

  return (
    <div className="insights-container">
      <div className="insights-header">
        <div className="period-selector">
          <label>Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="current_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">This Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="current_year">This Year</option>
          </select>
        </div>
        <button onClick={fetchInsights} className="btn btn-primary">
          Refresh Insights
        </button>
      </div>

      <div className="insights-grid">
        {insights.insights && insights.insights.length > 0 ? (
          insights.insights.map((insight, idx) => (
            <Card key={idx} className="insight-card">
              <div className="insight-content">
                <h4>{insight.section}</h4>
                <p>{insight.observation}</p>
                {insight.metric_value && (
                  <div className="insight-metric">
                    <span className="label">{insight.metric_name}</span>
                    <span className="value">{insight.metric_value}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState message="No insights available for this period" />
        )}
      </div>

      {insights.sections && (
        <div className="insights-summary">
          <h3>Covered Sections</h3>
          <div className="sections-badges">
            {insights.sections.map((section) => (
              <span key={section} className="badge badge-info">
                {section}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Insights
