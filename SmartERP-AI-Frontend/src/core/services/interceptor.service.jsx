import useAuthStore from '../../store/slices/auth.store'
import { refreshSession, handleSessionExpired } from './session.service'

/**
 * Shared request/response interceptors for every API axios instance
 * (utils/axios.js and pages/modules/hr/hrApiClient.js).
 *
 * Request:  attaches `Authorization: Bearer <in-memory token>` and `X-Tenant-Id`
 *           from the in-memory user. If the token is about to expire it first
 *           awaits a (single-flight) refresh, so Bearer-protected /auth/* calls
 *           also work after the 15-minute access-token lifetime.
 * Response: on 401 from a non-/auth/* endpoint, refreshes once (single-flight —
 *           concurrent 401s all wait on the same refresh) and retries the
 *           original request once. If the refresh fails, auth is cleared and
 *           the user is sent to /login. 401s from /auth/* never trigger a refresh.
 */

const EXPIRY_SKEW_MS = 30 * 1000

// Endpoints that never carry a session token and must never cause a refresh.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/auth/logout',
  '/auth/mfa/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/password-policy',
]

const requestPath = (config) => {
  const url = config?.url || ''
  try {
    return new URL(url, 'http://placeholder').pathname
  } catch {
    return url
  }
}

const isAuthEndpoint = (config) => /(^|\/)auth\//.test(requestPath(config))
const isPublicAuthEndpoint = (config) => {
  const path = requestPath(config)
  return PUBLIC_AUTH_PATHS.some((p) => path.endsWith(p))
}

export const attachInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use(async (config) => {
    let { token, expiresAt } = useAuthStore.getState()

    // Proactive refresh shortly before expiry (covers Bearer calls to /auth/* too).
    if (token && expiresAt && Date.now() > expiresAt - EXPIRY_SKEW_MS && !isPublicAuthEndpoint(config)) {
      try {
        token = await refreshSession()
      } catch (error) {
        handleSessionExpired()
        throw error
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const user = useAuthStore.getState().user
    if (user?.tenantId != null) {
      config.headers['X-Tenant-Id'] = user.tenantId
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config

      if (error?.response?.status !== 401 || !original || isAuthEndpoint(original) || original._authRetried) {
        return Promise.reject(error)
      }

      original._authRetried = true
      try {
        await refreshSession()
      } catch {
        handleSessionExpired()
        return Promise.reject(error)
      }
      // The request interceptor re-attaches the new token on retry.
      return axiosInstance(original)
    }
  )

  return axiosInstance
}
