import apiService from '../api.service'

const BASE_URL = '/company'

const CompanyManagementService = {
  getAll: (params) => apiService.get(BASE_URL, params),
  getById: (id) => apiService.get(`${BASE_URL}/${id}`),
  create: (payload) => apiService.post(BASE_URL, payload),
  update: (id, payload) => apiService.put(`${BASE_URL}/${id}`, payload),
  remove: (id) => apiService.delete(`${BASE_URL}/${id}`),
  getDashboard: (companyId) => apiService.get(`${BASE_URL}/${companyId}/dashboard`),
  getOrganizationChart: (companyId) => apiService.get(`${BASE_URL}/${companyId}/organization-chart`),

  getBranches: (companyId) => apiService.get(`${BASE_URL}/${companyId}/branches`),
  createBranch: (companyId, payload) => apiService.post(`${BASE_URL}/${companyId}/branches`, payload),
  updateBranch: (companyId, id, payload) => apiService.put(`${BASE_URL}/${companyId}/branches/${id}`, payload),
  removeBranch: (companyId, id) => apiService.delete(`${BASE_URL}/${companyId}/branches/${id}`),

  getDepartments: (companyId) => apiService.get(`${BASE_URL}/${companyId}/departments`),
  createDepartment: (companyId, payload) => apiService.post(`${BASE_URL}/${companyId}/departments`, payload),
  updateDepartment: (companyId, id, payload) => apiService.put(`${BASE_URL}/${companyId}/departments/${id}`, payload),
  removeDepartment: (companyId, id) => apiService.delete(`${BASE_URL}/${companyId}/departments/${id}`),

  getCostCenters: (companyId) => apiService.get(`${BASE_URL}/${companyId}/cost-centers`),
  createCostCenter: (companyId, payload) => apiService.post(`${BASE_URL}/${companyId}/cost-centers`, payload),

  getHolidays: (companyId, params) => apiService.get(`${BASE_URL}/${companyId}/holidays`, params),
  createHoliday: (companyId, payload) => apiService.post(`${BASE_URL}/${companyId}/holidays`, payload),
  updateHoliday: (companyId, id, payload) => apiService.put(`${BASE_URL}/${companyId}/holidays/${id}`, payload),
  removeHoliday: (companyId, id) => apiService.delete(`${BASE_URL}/${companyId}/holidays/${id}`),

  getApprovalWorkflows: (companyId) => apiService.get(`${BASE_URL}/${companyId}/approval-workflows`),
  createApprovalWorkflow: (companyId, payload) => apiService.post(`${BASE_URL}/${companyId}/approval-workflows`, payload),
  updateApprovalWorkflow: (companyId, id, payload) => apiService.put(`${BASE_URL}/${companyId}/approval-workflows/${id}`, payload),
  removeApprovalWorkflow: (companyId, id) => apiService.delete(`${BASE_URL}/${companyId}/approval-workflows/${id}`),

  getSettings: (companyId) => apiService.get(`${BASE_URL}/${companyId}/settings`),
  updateSettings: (companyId, payload) => apiService.put(`${BASE_URL}/${companyId}/settings`, payload),
}

export default CompanyManagementService
