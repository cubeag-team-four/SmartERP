import { useState, useEffect } from 'react'

const useAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // TODO: hydrate auth state from storage.service
  }, [])

  return { user, isAuthenticated, setUser }
}

export default useAuth
