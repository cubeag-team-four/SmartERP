import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/slices/auth.store'

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
