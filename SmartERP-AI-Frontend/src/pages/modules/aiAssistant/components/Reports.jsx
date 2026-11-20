import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card, Button } from '../../../../components/common'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const Reports = () => {
  const [loading, setLoading] = useState(false)
  const [reportTypes, setReportTypes] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [period, setPeriod] = useState('current_month')
  const [explain, setExplain] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchReportTypes()
  }, [])

  const fetchReportTypes = async () => {
    try {
      setLoading(true)
      const response = await aiAssistantService.getReportTypes()
      setReportTypes(response.reports || [])
    } catch (error) {
      toast.error('Failed to fetch report types')
      console.error('Report types error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Please select a report type')
      return
    }

    try {
      setGenerating(true)
      const response = await aiAssistantService.generateReport({
        report_type: selectedReport,
        period,
        explain,
      })
      setReportData(response)
      toast.success('Report generated successfully')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report')
      console.error('Report generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadReport = () => {
    if (!reportData) return
    const element = document.createElement('a')
    const file = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    })
    element.href = URL.createObjectURL(file)
    element.download = `report-${selectedReport}-${new Date().toISOString()}.json`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) return <Loader />

  return (
    <div className="reports-container">
      <div className="reports-grid">
        <div className="reports-panel">
          <Card className="report-selector">
            <h3>Generate Business Report</h3>

            <div className="form-group">
              <label>Report Type *</label>
              <select
                value={selectedReport || ''}
                onChange={(e) => setSelectedReport(e.target.value)}
              >
                <option value="">Select a report...</option>
                {reportTypes.map((report) => (
                  <option key={report.report_type} value={report.report_type}>
                    {report.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="current_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="current_quarter">This Quarter</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="current_year">This Year</option>
                <option value="last_year">Last Year</option>
              </select>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={explain}
                  onChange={(e) => setExplain(e.target.checked)}
                />
                Include Executive Summary
              </label>
            </div>

            <Button
              onClick={handleGenerateReport}
              disabled={!selectedReport || generating}
              className="btn-primary btn-block"
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </Card>
        </div>

        {reportData && (
          <div className="reports-output">
            <Card className="report-result">
              <div className="report-header">
                <h3>{reportData.title}</h3>
                <Button onClick={handleDownloadReport} className="btn-outline btn-sm">
                  📥 Download
                </Button>
              </div>

              {reportData.executive_summary && (
                <div className="report-section">
                  <h4>Executive Summary</h4>
                  <p>{reportData.executive_summary}</p>
                </div>
              )}

              {reportData.sections && reportData.sections.length > 0 && (
                <div className="report-sections">
                  {reportData.sections.map((section, idx) => (
                    <div key={idx} className="report-section">
                      <h4>{section.title}</h4>
                      <div className="section-content">
                        {section.figures && (
                          <div className="figures">
                            {section.figures.map((fig, fidx) => (
                              <div key={fidx} className="figure">
                                <span className="label">{fig.label}</span>
                                <span className="value">{fig.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.narrative && <p>{section.narrative}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="report-meta">
                <small>Generated: {new Date(reportData.generated_at).toLocaleString()}</small>
                <small>By: {reportData.generated_by}</small>
              </div>
            </Card>
          </div>
        )}
      </div>

      {!reportData && (
        <div className="reports-empty">
          <EmptyState message="Select a report type and generate to view results" />
        </div>
      )}
    </div>
  )
}

export default Reports
