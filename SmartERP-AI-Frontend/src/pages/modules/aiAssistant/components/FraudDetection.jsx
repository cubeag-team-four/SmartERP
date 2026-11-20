import { useState, useEffect } from 'react'
import { Loader, EmptyState, Card, Badge, Button, Table } from '../../../../components/common'
import aiAssistantService from '../services/aiAssistant.service'
import toast from 'react-hot-toast'

const FraudDetection = () => {
  const [loading, setLoading] = useState(false)
  const [flags, setFlags] = useState([])
  const [holds, setHolds] = useState([])
  const [rules, setRules] = useState([])
  const [activeTab, setActiveTab] = useState('flags')
  const [scanning, setScanning] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRisk, setFilterRisk] = useState('')

  useEffect(() => {
    fetchFraudData()
  }, [])

  const fetchFraudData = async () => {
    try {
      setLoading(true)
      const [flagsData, holdsData, rulesData] = await Promise.all([
        aiAssistantService.getFraudFlags({ status: filterStatus, risk_level: filterRisk }),
        aiAssistantService.getHeldFlags(),
        aiAssistantService.getFraudRules(),
      ])
      setFlags(flagsData.flags || [])
      setHolds(holdsData || [])
      setRules(rulesData || [])
    } catch (error) {
      toast.error('Failed to fetch fraud data')
      console.error('Fraud data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunScan = async () => {
    try {
      setScanning(true)
      const response = await aiAssistantService.runFraudScan({
        days: 30,
        include_payments: true,
        include_stock: true,
        include_bills: true,
        include_expenses: true,
      })
      toast.success(response.message)
      await fetchFraudData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run fraud scan')
    } finally {
      setScanning(false)
    }
  }

  const handleReviewFlag = async (flagId, action, note = '') => {
    try {
      await aiAssistantService.reviewFraudFlag(flagId, { status: action, note })
      toast.success(`Flag ${action}`)
      await fetchFraudData()
    } catch (error) {
      toast.error('Failed to review flag')
    }
  }

  const handleClearHold = async (flagId) => {
    const note = prompt('Add a note (optional):')
    if (note !== null) {
      try {
        await aiAssistantService.clearFraudHold(flagId, { note })
        toast.success('Hold cleared')
        await fetchFraudData()
      } catch (error) {
        toast.error('Failed to clear hold')
      }
    }
  }

  const handleConfirmHold = async (flagId) => {
    const note = prompt('Add a note (optional):')
    if (note !== null) {
      try {
        await aiAssistantService.confirmFraudHold(flagId, { note })
        toast.success('Hold confirmed')
        await fetchFraudData()
      } catch (error) {
        toast.error('Failed to confirm hold')
      }
    }
  }

  if (loading) return <Loader />

  const getRiskColor = (level) => {
    const colors = {
      LOW: 'badge-success',
      MEDIUM: 'badge-warning',
      HIGH: 'badge-danger',
      CRITICAL: 'badge-danger badge-critical',
    }
    return colors[level] || 'badge-info'
  }

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'badge-warning',
      REVIEWING: 'badge-info',
      RESOLVED: 'badge-success',
      DISMISSED: 'badge-secondary',
    }
    return colors[status] || 'badge-secondary'
  }

  return (
    <div className="fraud-detection-container">
      <div className="fraud-header">
        <h2>🚨 Fraud Risk Management</h2>
        <Button
          onClick={handleRunScan}
          disabled={scanning}
          className="btn-primary btn-lg"
        >
          {scanning ? '⏳ Scanning...' : '🔍 Run Fraud Scan'}
        </Button>
      </div>

      <div className="fraud-tabs">
        <button
          className={`tab ${activeTab === 'flags' ? 'active' : ''}`}
          onClick={() => setActiveTab('flags')}
        >
          Fraud Flags ({flags.length})
        </button>
        <button
          className={`tab ${activeTab === 'holds' ? 'active' : ''}`}
          onClick={() => setActiveTab('holds')}
        >
          Held Transactions ({holds.length})
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Detection Rules ({rules.length})
        </button>
      </div>

      {activeTab === 'flags' && (
        <div className="fraud-flags">
          <Card className="filters">
            <div className="filter-group">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="REVIEWING">REVIEWING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                <option value="">All Risk Levels</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <Button onClick={fetchFraudData} className="btn-outline btn-sm">
                Refresh
              </Button>
            </div>
          </Card>

          {flags.length > 0 ? (
            <div className="flags-grid">
              {flags.map((flag) => (
                <Card key={flag.id} className="flag-card">
                  <div className="flag-header">
                    <div>
                      <h4>{flag.entity_type}</h4>
                      <Badge className={getStatusColor(flag.status)}>
                        {flag.status}
                      </Badge>
                      <Badge className={getRiskColor(flag.risk_level)}>
                        {flag.risk_level}
                      </Badge>
                    </div>
                  </div>
                  <div className="flag-body">
                    <p><strong>Rule:</strong> {flag.rule_code}</p>
                    <p><strong>Score:</strong> {flag.score || 'N/A'}</p>
                    <p><strong>Reason:</strong> {flag.reason}</p>
                    {flag.created_at && (
                      <p><small>Created: {new Date(flag.created_at).toLocaleString()}</small></p>
                    )}
                  </div>
                  {flag.status === 'OPEN' && (
                    <div className="flag-actions">
                      <Button
                        onClick={() => handleReviewFlag(flag.id, 'REVIEWING')}
                        className="btn-outline btn-sm"
                      >
                        Review
                      </Button>
                      <Button
                        onClick={() => handleReviewFlag(flag.id, 'DISMISSED')}
                        className="btn-outline btn-sm"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="No fraud flags found" />
          )}
        </div>
      )}

      {activeTab === 'holds' && (
        <div className="fraud-holds">
          {holds.length > 0 ? (
            <div className="holds-list">
              {holds.map((hold) => (
                <Card key={hold.id} className="hold-card">
                  <div className="hold-content">
                    <h4>{hold.entity_type}</h4>
                    <Badge className={getRiskColor(hold.risk_level)}>
                      {hold.risk_level}
                    </Badge>
                    <p>{hold.reason}</p>
                  </div>
                  <div className="hold-actions">
                    <Button
                      onClick={() => handleClearHold(hold.id)}
                      className="btn-success btn-sm"
                    >
                      ✓ Clear Hold
                    </Button>
                    <Button
                      onClick={() => handleConfirmHold(hold.id)}
                      className="btn-danger btn-sm"
                    >
                      ✗ Confirm Hold
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="No held transactions" />
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="fraud-rules">
          {rules.length > 0 ? (
            <div className="rules-list">
              {rules.map((rule) => (
                <Card key={rule.code} className="rule-card">
                  <div className="rule-content">
                    <h4>{rule.code}</h4>
                    <p>{rule.name}</p>
                    <p><strong>Weight:</strong> {rule.weight}</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="No detection rules found" />
          )}
        </div>
      )}
    </div>
  )
}

export default FraudDetection
