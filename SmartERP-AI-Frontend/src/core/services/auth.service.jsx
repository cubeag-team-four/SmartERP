import apiService from './api.service'
import { SERVER_URL } from '../constants/serverUrl.constant'

const authService = {
  login: (credentials) => apiService.post(`${SERVER_URL}/auth/login`, credentials),
  signup: (payload) => apiService.post(`${SERVER_URL}/auth/signup`, payload),
  logout: () => apiService.post(`${SERVER_URL}/auth/logout`),
  forgotPassword: (email) => apiService.post(`${SERVER_URL}/auth/forgot-password`, { email }),
  resetPassword: (payload) => apiService.post(`${SERVER_URL}/auth/reset-password`, payload),
  me: () => apiService.get(`${SERVER_URL}/auth/me`),
}

export default authService
