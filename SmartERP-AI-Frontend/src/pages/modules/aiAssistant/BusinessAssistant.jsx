import { useState } from 'react'
import { Tabs } from '../../../components/common/Tabs'
import Chatbot from './components/Chatbot'
import Reports from './components/Reports'
import FraudDetection from './components/FraudDetection'
import Forecasting from './components/Forecasting'
import ProjectRisk from './components/ProjectRisk'
import Insights from './components/Insights'
import './BusinessAssistant.css'

const BusinessAssistant = () => {
  const [activeTab, setActiveTab] = useState('insights')

  const tabs = [
    { id: 'insights', label: '📊 Insights', icon: '📊' },
    { id: 'chatbot', label: '🤖 Chatbot', icon: '🤖' },
    { id: 'reports', label: '📋 Reports', icon: '📋' },
    { id: 'fraud', label: '🚨 Fraud Detection', icon: '🚨' },
    { id: 'forecasting', label: '📈 Forecasting', icon: '📈' },
    { id: 'projectRisk', label: '⚠️ Project Risk', icon: '⚠️' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'insights':
        return <Insights />
      case 'chatbot':
        return <Chatbot />
      case 'reports':
        return <Reports />
      case 'fraud':
        return <FraudDetection />
      case 'forecasting':
        return <Forecasting />
      case 'projectRisk':
        return <ProjectRisk />
      default:
        return <Insights />
    }
  }

  return (
    <div className="business-assistant">
      <div className="assistant-header">
        <h1>🤖 AI Business Assistant</h1>
        <p>Your intelligent ERP companion for insights, analysis & automation</p>
      </div>

      <div className="assistant-tabs">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pill"
        />
      </div>

      <div className="assistant-content">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default BusinessAssistant
