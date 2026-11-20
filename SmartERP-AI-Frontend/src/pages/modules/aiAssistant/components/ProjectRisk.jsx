import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card, Badge } from '../../../../components/common'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const ProjectRisk = () => {
  const [loading, setLoading] = useState(true)
  const [projectRisks, setProjectRisks] = useState([])
  const [filterLevel, setFilterLevel] = useState('')

  useEffect(() => {
    fetchProjectRisks()
  }, [])

  const fetchProjectRisks = async () => {
    try {
      setLoading(true)
      const response = await aiAssistantService.getProjectRisk()
      setProjectRisks(response.milestones || [])
    } catch (error) {
      toast.error('Failed to fetch project risks')
      console.error('Project risk error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />

  const getRiskBadge = (level) => {
    const badges = {
      LOW: 'badge-success',
      MEDIUM: 'badge-warning',
      HIGH: 'badge-danger',
      INSUFFICIENT_DATA: 'badge-secondary',
    }
    return badges[level] || 'badge-info'
  }

  const getRiskIcon = (level) => {
    const icons = {
      LOW: '✓',
      MEDIUM: '⚠️',
      HIGH: '🚨',
      INSUFFICIENT_DATA: '❓',
    }
    return icons[level] || '•'
  }

  const filteredRisks = filterLevel
    ? projectRisks.filter((r) => r.risk_level === filterLevel)
    : projectRisks

  const riskCounts = {
    LOW: projectRisks.filter((r) => r.risk_level === 'LOW').length,
    MEDIUM: projectRisks.filter((r) => r.risk_level === 'MEDIUM').length,
    HIGH: projectRisks.filter((r) => r.risk_level === 'HIGH').length,
    INSUFFICIENT_DATA: projectRisks.filter((r) => r.risk_level === 'INSUFFICIENT_DATA')
      .length,
  }

  return (
    <div className="project-risk-container">
      <div className="risk-header">
        <h2>⚠️ Project Risk Assessment</h2>
        <p>Monitor milestone delay risks across your projects</p>
      </div>

      <div className="risk-summary">
        <Card className="summary-card">
          <div className="summary-item">
            <span className="count">{riskCounts.LOW}</span>
            <span className="label">Low Risk</span>
            <Badge className="badge-success">✓</Badge>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-item">
            <span className="count">{riskCounts.MEDIUM}</span>
            <span className="label">Medium Risk</span>
            <Badge className="badge-warning">⚠️</Badge>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-item">
            <span className="count">{riskCounts.HIGH}</span>
            <span className="label">High Risk</span>
            <Badge className="badge-danger">🚨</Badge>
          </div>
        </Card>
        <Card className="summary-card">
          <div className="summary-item">
            <span className="count">{riskCounts.INSUFFICIENT_DATA}</span>
            <span className="label">Insufficient Data</span>
            <Badge className="badge-secondary">❓</Badge>
          </div>
        </Card>
      </div>

      <div className="risk-filters">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="filter-select"
        >
          <option value="">All Risk Levels</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
          <option value="INSUFFICIENT_DATA">Insufficient Data</option>
        </select>
      </div>

      {filteredRisks.length > 0 ? (
        <div className="risks-grid">
          {filteredRisks.map((milestone, idx) => (
            <Card key={idx} className="risk-card">
              <div className="risk-card-header">
                <h3>{milestone.milestone_name}</h3>
                <Badge className={getRiskBadge(milestone.risk_level)}>
                  {getRiskIcon(milestone.risk_level)} {milestone.risk_level}
                </Badge>
              </div>

              <div className="risk-card-body">
                {milestone.project_name && (
                  <div className="project-info">
                    <span className="label">Project:</span>
                    <span className="value">{milestone.project_name}</span>
                  </div>
                )}

                {milestone.reason && (
                  <div className="risk-reason">
                    <span className="label">Reason:</span>
                    <p>{milestone.reason}</p>
                  </div>
                )}

                {milestone.elapsed_percentage !== null && (
                  <div className="metric">
                    <span className="label">Time Elapsed</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(milestone.elapsed_percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="value">
                      {milestone.elapsed_percentage.toFixed(1)}%
                    </span>
                  </div>
                )}

                {milestone.work_completed_percentage !== null && (
                  <div className="metric">
                    <span className="label">Work Completed</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(milestone.work_completed_percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="value">
                      {milestone.work_completed_percentage.toFixed(1)}%
                    </span>
                  </div>
                )}

                {milestone.planned_start && milestone.planned_end && (
                  <div className="timeline">
                    <span className="label">Timeline</span>
                    <span className="value">
                      {new Date(milestone.planned_start).toLocaleDateString()} →{' '}
                      {new Date(milestone.planned_end).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {milestone.tasks_count !== null && (
                  <div className="metrics-row">
                    <div className="metric">
                      <span className="label">Total Tasks</span>
                      <span className="value">{milestone.tasks_count}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Completed Tasks</span>
                      <span className="value">{milestone.tasks_completed_count}</span>
                    </div>
                  </div>
                )}

                {milestone.recommendation && (
                  <div className="recommendation">
                    <strong>Recommendation:</strong>
                    <p>{milestone.recommendation}</p>
                  </div>
                )}
              </div>

              <div className="risk-score">
                {milestone.risk_score !== null && (
                  <>
                    <span className="label">Risk Score</span>
                    <span className="score-value">
                      {(milestone.risk_score * 100).toFixed(0)}%
                    </span>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No project milestones with the selected risk level" />
      )}

      <div className="risk-info">
        <Card>
          <h4>📋 How Risk is Calculated</h4>
          <ul>
            <li>
              <strong>Time Progress:</strong> Percentage of planned timeline that has
              elapsed
            </li>
            <li>
              <strong>Work Progress:</strong> Percentage of tasks that are completed
            </li>
            <li>
              <strong>Risk Assessment:</strong> Flags milestones where work progress
              lags behind time progress
            </li>
            <li>
              <strong>Data Requirements:</strong> Requires planned dates and task
              information to calculate
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default ProjectRisk
