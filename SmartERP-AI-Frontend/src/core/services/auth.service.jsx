import apiService from './api.service'
import { SERVER_URL } from '../constants/serverUrl.constant'

const authService = {
  login: async (credentials) => {
    const response = await apiService.post(`${SERVER_URL}/auth/login`, credentials)
    const backendData = response.data?.data || response.data
    return {
      ...response,
      data: {
        token: backendData.accessToken,
        user: {
          id: backendData.userId,
          tenantId: backendData.tenantId,
          name: backendData.name,
          email: backendData.email,
          role: backendData.tenantId === 1 ? 'superAdmin' : 'admin',
        },
      },
    }
  },
  signup: (payload) => apiService.post(`${SERVER_URL}/auth/signup`, payload),
  logout: () => apiService.post(`${SERVER_URL}/auth/logout`),
  forgotPassword: (email) => apiService.post(`${SERVER_URL}/auth/forgot-password`, { email }),
  resetPassword: (payload) => apiService.post(`${SERVER_URL}/auth/reset-password`, payload),
  me: () => apiService.get(`${SERVER_URL}/auth/me`),
}

export default authService
