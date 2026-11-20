import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card, Button } from '../../../../components/common'
import { LineChartWidget } from '../../../../components/charts'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const Forecasting = () => {
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState(null)
  const [reorderInsight, setReorderInsight] = useState(null)
  const [horizon, setHorizon] = useState(30)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [products, setProducts] = useState([])
  const [lookbackDays, setLookbackDays] = useState(30)
  const [leadTimeDays, setLeadTimeDays] = useState(7)

  useEffect(() => {
    // Fetch forecast on mount
    fetchForecast()
  }, [])

  const fetchForecast = async () => {
    try {
      setLoading(true)
      const response = await aiAssistantService.getSalesForecast({ horizon })
      setForecast(response)
    } catch (error) {
      toast.error('Failed to fetch forecast')
      console.error('Forecast error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleHorizonChange = async (newHorizon) => {
    setHorizon(newHorizon)
    try {
      setLoading(true)
      const response = await aiAssistantService.getSalesForecast({
        horizon: newHorizon,
      })
      setForecast(response)
    } catch (error) {
      toast.error('Failed to fetch forecast')
    } finally {
      setLoading(false)
    }
  }

  const handleGetReorderInsight = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }

    try {
      setLoading(true)
      const response = await aiAssistantService.getInventoryReorder({
        product_id: selectedProduct,
        lookback_days: lookbackDays,
        lead_time_days: leadTimeDays,
      })
      setReorderInsight(response)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to get reorder insight')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !forecast && !reorderInsight) return <Loader />

  const chartData = forecast?.forecast_data
    ? forecast.forecast_data.map((item) => ({
        date: new Date(item.date).toLocaleDateString(),
        actual: item.actual_sales || 0,
        forecast: item.predicted_sales || 0,
      }))
    : []

  return (
    <div className="forecasting-container">
      <div className="forecasting-grid">
        {/* Sales Forecast */}
        <div className="forecast-section">
          <Card className="forecast-card">
            <h3>📈 Sales Forecast</h3>

            <div className="forecast-controls">
              <div className="horizon-buttons">
                {[7, 14, 30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    onClick={() => handleHorizonChange(days)}
                    className={`btn-outline btn-sm ${horizon === days ? 'active' : ''}`}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>

            {forecast ? (
              <div className="forecast-content">
                {chartData.length > 0 ? (
                  <div className="forecast-chart">
                    <LineChartWidget
                      data={chartData}
                      xKey="date"
                      lines={[
                        { key: 'actual', name: 'Actual Sales', color: '#3b82f6' },
                        {
                          key: 'forecast',
                          name: 'Forecasted Sales',
                          color: '#10b981',
                        },
                      ]}
                      height={300}
                    />
                  </div>
                ) : (
                  <EmptyState message="No forecast data available" />
                )}

                <div className="forecast-stats">
                  <div className="stat">
                    <label>Total Forecast</label>
                    <span className="value">
                      {forecast.total_forecast_amount?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div className="stat">
                    <label>Confidence</label>
                    <span className="value">
                      {forecast.confidence_level
                        ? `${(forecast.confidence_level * 100).toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="stat">
                    <label>Period</label>
                    <span className="value">{forecast.period || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState message="No forecast data yet" />
            )}
          </Card>
        </div>

        {/* Inventory Reorder */}
        <div className="reorder-section">
          <Card className="reorder-card">
            <h3>📦 Inventory Reorder Analysis</h3>

            <div className="reorder-form">
              <div className="form-group">
                <label>Product *</label>
                <input
                  type="text"
                  placeholder="Enter product ID or name"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lookback Days</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={lookbackDays}
                    onChange={(e) => setLookbackDays(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={handleGetReorderInsight}
                className="btn-primary btn-block"
              >
                Get Reorder Insight
              </Button>
            </div>

            {reorderInsight && (
              <div className="reorder-result">
                <div className="insight-status">
                  <span className={`status status-${reorderInsight.status.toLowerCase()}`}>
                    {reorderInsight.status}
                  </span>
                </div>

                {reorderInsight.recommendation && (
                  <div className="recommendation">
                    <h4>Recommendation</h4>
                    <div className="rec-details">
                      <div className="detail">
                        <span className="label">Recommended Quantity</span>
                        <span className="value">
                          {reorderInsight.recommendation.recommended_quantity}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Avg Daily Demand</span>
                        <span className="value">
                          {reorderInsight.recommendation.average_daily_demand?.toFixed(2)}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Safety Stock</span>
                        <span className="value">
                          {reorderInsight.recommendation.safety_stock}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Reorder Point</span>
                        <span className="value">
                          {reorderInsight.recommendation.reorder_point}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Current Stock</span>
                        <span className="value">
                          {reorderInsight.recommendation.current_stock}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {reorderInsight.message && (
                  <p className="insight-message">{reorderInsight.message}</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Forecasting
