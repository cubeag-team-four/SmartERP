import apiService from '../api.service'

const BASE_URL = '/purchase'

const PurchaseService = {
  getAll: (params) => apiService.get(BASE_URL, params),
  getById: (id) => apiService.get(`${BASE_URL}/${id}`),
  create: (payload) => apiService.post(`${BASE_URL}/orders`, payload),
  update: (id, payload) => apiService.put(`${BASE_URL}/orders/${id}`, payload),
  remove: (id) => apiService.delete(`${BASE_URL}/${id}`),
  getDashboard: () => apiService.get(`${BASE_URL}/dashboard`),
  getAllOrders: (params) => apiService.get(`${BASE_URL}/orders`, params),
  getAllVendors: (params) => apiService.get(`${BASE_URL}/vendors`, params),
  getAllGRNs: (params) => apiService.get(`${BASE_URL}/grn`, params),
  getAllPayables: (params) => apiService.get(`${BASE_URL}/payables`, params),
  getPayablesSummary: () => apiService.get(`${BASE_URL}/payables/summary`),
  createVendor: (payload) => apiService.post(`${BASE_URL}/vendors`, payload),
  getVendorById: (id) => apiService.get(`${BASE_URL}/vendors/${id}`),
}

export default PurchaseService
