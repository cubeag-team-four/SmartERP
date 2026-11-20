import authAxios from '../../utils/authAxios'
import useAuthStore from '../../store/slices/auth.store'
import storageService from './storage.service'

/**
 * Session lifecycle: applying login responses, refreshing the in-memory access
 * token from the HttpOnly refresh cookie, startup bootstrap and logout.
 *
 * This module only talks to the network through `authAxios` (no interceptors),
 * so the shared interceptor can import it without creating a refresh loop.
 */

// TENANT_ADMIN / ROLE_TENANT_ADMIN -> tenantAdmin (matches ROLE_HOME / Sidebar NAV keys)
export const toCamelRole = (role) =>
  role
    ? String(role)
        .replace(/^ROLE_/i, '')
        .toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    : null

export const toSessionUser = (data) => ({
  id: data.userId,
  tenantId: data.tenantId,
  tenantCode: data.tenantCode,
  name: data.name,
  email: data.email,
  role: toCamelRole(data.role),
  roles: (data.roles || []).map(toCamelRole),
  mfaEnabled: !!data.mfaEnabled,
})

/** Stores an AUTHENTICATED LoginResponse (from login, MFA verify/enable or refresh) in memory. */
export const applyAuthResponse = (data) => {
  if (!data?.accessToken) {
    throw new Error('Authentication response did not include an access token.')
  }
  const expiresAt = data.expiresIn ? Date.now() + Number(data.expiresIn) * 1000 : null
  useAuthStore.getState().setSession({
    token: data.accessToken,
    user: toSessionUser(data),
    expiresAt,
  })
  return data.accessToken
}

/* ── Navigation hook-in (registered by App so we can redirect without a full reload) ── */
let navigator = null
export const setNavigator = (navigateFn) => {
  navigator = navigateFn
}

const redirectToLogin = () => {
  if (window.location.pathname === '/login') return
  if (navigator) navigator('/login', { replace: true })
  else window.location.assign('/login')
}

/** Called when a refresh fails mid-session: drop local auth and send the user to /login. */
export const handleSessionExpired = () => {
  const { isAuthenticated, clearSession, setNotice } = useAuthStore.getState()
  if (isAuthenticated) setNotice('Your session has expired. Please sign in again.')
  clearSession()
  redirectToLogin()
}

/* ── Single-flight refresh ──────────────────────────────────────────────────
 * Only one POST /auth/refresh is in flight at a time. Every caller that needs
 * a fresh token while it is running awaits the same promise — this is the
 * request queue. The backend rotates the refresh cookie on each call, so two
 * parallel refreshes would invalidate each other.
 */
let refreshPromise = null

export const refreshSession = () => {
  if (!refreshPromise) {
    const tokenAtStart = useAuthStore.getState().token
    refreshPromise = authAxios
      .post('/auth/refresh')
      .then((res) => applyAuthResponse(res.data?.data))
      .catch((error) => {
        // Don't wipe a session that was established (e.g. by a login) while this refresh ran.
        if (useAuthStore.getState().token === tokenAtStart) {
          useAuthStore.getState().clearSession()
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/* ── Startup bootstrap ───────────────────────────────────────────────────── */
let bootstrapPromise = null

/**
 * Runs once per page load: removes legacy localStorage tokens and tries to
 * restore the session from the refresh cookie. Always resolves; marks the
 * store `initialized` when done so route guards can render.
 */
export const bootstrapSession = () => {
  if (!bootstrapPromise) {
    storageService.clearLegacyKeys()
    bootstrapPromise = refreshSession()
      .then(() => true)
      .catch(() => false)
      .finally(() => useAuthStore.getState().setInitialized())
  }
  return bootstrapPromise
}

/**
 * Best-effort server logout (revokes the refresh token and clears the cookie),
 * then always clears local state. Never throws.
 */
export const logout = async () => {
  const { token } = useAuthStore.getState()
  try {
    await authAxios.post('/auth/logout', null, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 8000,
    })
  } catch {
    // Ignore — the local session is cleared regardless.
  } finally {
    useAuthStore.getState().clearSession()
  }
}

const sessionService = {
  applyAuthResponse,
  refreshSession,
  bootstrapSession,
  logout,
  setNavigator,
  handleSessionExpired,
}

export default sessionService
