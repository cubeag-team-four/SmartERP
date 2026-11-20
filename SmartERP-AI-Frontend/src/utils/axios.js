import axios from 'axios'
import { SERVER_URL } from '../core/constants/serverUrl.constant'
import { attachInterceptors } from '../core/services/interceptor.service'

const instance = axios.create({
  baseURL: SERVER_URL,
  // CORS allows credentials for the configured origins; needed for the refresh cookie.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

attachInterceptors(instance)

export default instance
