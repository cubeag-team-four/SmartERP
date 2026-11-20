import { create } from 'zustand'

/**
 * Auth state lives in memory only. The access token is never written to
 * localStorage/sessionStorage; after a page reload the session is restored by
 * core/services/session.service.js calling POST /auth/refresh, which uses the
 * HttpOnly refresh cookie the browser holds.
 *
 *   initialized     — false until the startup refresh attempt has settled, so
 *                     route guards can show a loader instead of bouncing.
 *   isAuthenticated — true only while an access token is held in memory.
 *   notice          — one-off message for the login page (e.g. "session expired").
 */
const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  expiresAt: null,
  isAuthenticated: false,
  initialized: false,
  notice: null,

  setSession: ({ token, user, expiresAt = null }) =>
    set({ token, user, expiresAt, isAuthenticated: !!token }),

  clearSession: () =>
    set({ token: null, user: null, expiresAt: null, isAuthenticated: false }),

  setInitialized: () => set({ initialized: true }),

  setNotice: (notice) => set({ notice }),

  consumeNotice: () => {
    const { notice } = get()
    if (notice) set({ notice: null })
    return notice
  },

  // Local-only clear, kept for backwards compatibility. Prefer
  // sessionService.logout(), which also revokes the server session.
  logout: () =>
    set({ token: null, user: null, expiresAt: null, isAuthenticated: false }),
}))

export default useAuthStore
