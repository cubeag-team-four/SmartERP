import apiService from '../../../../core/services/api.service'

const BASE_URL = '/ai'
const CHATBOT_URL = '/ai/chatbot'
const FRAUD_URL = '/ai/fraud'

const aiAssistantService = {
  // Insights
  getInsights: (params) => apiService.get(`${BASE_URL}/insights`, params),

  // Chatbot
  sendChatMessage: (payload) => apiService.post(CHATBOT_URL, payload),
  getChatbotCapabilities: () => apiService.get(`${CHATBOT_URL}/capabilities`),

  // Reports
  generateReport: (payload) => apiService.post(`${BASE_URL}/reports`, payload),
  getReportTypes: () => apiService.get(`${BASE_URL}/reports/types`),

  // AI Assistant
  askAssistant: (payload, params) =>
    apiService.post(`${BASE_URL}/assistant`, payload, params),

  // Fraud Detection
  runFraudScan: (payload) => apiService.post(`${FRAUD_URL}/scan`, payload),
  getFraudFlags: (params) => apiService.get(`${FRAUD_URL}/flags`, params),
  getFraudRules: () => apiService.get(`${FRAUD_URL}/rules`),
  reviewFraudFlag: (flagId, payload) =>
    apiService.patch(`${FRAUD_URL}/flags/${flagId}`, payload),
  getHeldFlags: () => apiService.get(`${FRAUD_URL}/holds`),
  clearFraudHold: (flagId, payload) =>
    apiService.post(`${FRAUD_URL}/flags/${flagId}/clear`, payload),
  confirmFraudHold: (flagId, payload) =>
    apiService.post(`${FRAUD_URL}/flags/${flagId}/confirm`, payload),

  // Forecasting
  getSalesForecast: (params) => apiService.get(`${BASE_URL}/forecast/sales`, params),
  getInventoryReorder: (params) =>
    apiService.get(`${BASE_URL}/inventory-reorder`, params),

  // Project Risk
  getProjectRisk: (params) => apiService.get(`${BASE_URL}/project-risk`, params),

  // Capabilities
  getCapabilities: () => apiService.get(`${BASE_URL}/capabilities`),
}

export default aiAssistantService
