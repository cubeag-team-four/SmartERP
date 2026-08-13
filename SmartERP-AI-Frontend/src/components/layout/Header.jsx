import React from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/slices/auth.store'

const Header = () => {
  const { user, logout } = useAuthStore()

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-indigo-600">SmartERP</span>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-600">{user.name || user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-indigo-600 hover:underline">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

export default Header
