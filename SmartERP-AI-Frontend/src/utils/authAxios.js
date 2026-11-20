import axios from 'axios'
import { SERVER_URL } from '../core/constants/serverUrl.constant'

/**
 * Bare axios instance for the cookie-bound session endpoints (/auth/refresh,
 * /auth/logout). It deliberately has NO interceptors, so a 401 here can never
 * trigger another refresh. It always sends the HttpOnly refresh cookie
 * (withCredentials) and the X-Requested-With header the backend requires as
 * CSRF defence on these endpoints.
 */
const authAxios = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export default authAxios
