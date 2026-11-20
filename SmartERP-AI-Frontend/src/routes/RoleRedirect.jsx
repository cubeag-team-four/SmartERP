import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/slices/auth.store'
import { ROLE_HOME } from './ProtectedRoute'
import SessionLoader from '../components/auth/SessionLoader'

/**
 * Used on /login success — sends the user straight to their role dashboard.
 * Also useful as a catch-all for /app so logged-in users don't see a blank page.
 */
const RoleRedirect = () => {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized && !isAuthenticated) {
    return <SessionLoader />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const home = ROLE_HOME[user.role] ?? '/login'
  return <Navigate to={home} replace />
}

export default RoleRedirect
