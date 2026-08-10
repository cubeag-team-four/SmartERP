import apiService from '../api.service'

const BASE_URL = '/settings'

const SettingsService = {
  getAll: (params) => apiService.get(BASE_URL, params),
  getById: (id) => apiService.get(`${BASE_URL}/${id}`),
  create: (payload) => apiService.post(BASE_URL, payload),
  update: (id, payload) => apiService.put(`${BASE_URL}/${id}`, payload),
  remove: (id) => apiService.delete(`${BASE_URL}/${id}`),
}

export default SettingsService
