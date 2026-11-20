import useAuthStore from '../../store/slices/auth.store'

// Keys written by earlier builds that kept the JWT in localStorage. They are
// removed once on startup and never written again.
const LEGACY_KEYS = ['smarterp_token', 'smarterp_user']

/**
 * Read-only accessors for the current session. Tokens and the user profile are
 * held in memory (zustand auth store) only — nothing here touches persistent
 * storage except the one-time legacy cleanup.
 */
const storageService = {
  getToken: () => useAuthStore.getState().token,
  getUser: () => useAuthStore.getState().user,

  clearLegacyKeys: () => {
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
    } catch {
      // Storage can be unavailable (private mode, blocked site data) — nothing to clean.
    }
  },
}

export default storageService
