import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { bootstrapSession, setNavigator } from './core/services/session.service'
import './App.css'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Lets the API layer send the user to /login without a full page reload.
    setNavigator(navigate)
  }, [navigate])

  useEffect(() => {
    // Restore the session from the HttpOnly refresh cookie (runs once per page load).
    bootstrapSession()
  }, [])

  return <AppRoutes />
}

export default App
