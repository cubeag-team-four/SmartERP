import React from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/slices/auth.store'
import { formatRole } from '../../utils/formatRole'

const Header = () => {
  const { user, logout } = useAuthStore()

  return (
    <header className="h-[70px] bg-white border-b border-gray-200 flex items-center justify-between px-6">

      {/* Search */}
      <div className="flex items-center w-[385px] h-[40px] bg-[#f7f6f2] border border-[#e5e2da] rounded-xl px-3">

        <span className="text-gray-400 text-sm mr-2">
          ⌕
        </span>

        <input
          type="text"
          placeholder="Search anything..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
        />

        <span className="text-xs text-gray-400 border border-gray-300 rounded-md px-2 py-1">
          ⌘K
        </span>

      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* Ask AI */}
        <button
          className="h-[40px] px-4 rounded-xl border border-[#dfe4da] bg-[#f8faf7] text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          ✦ Ask AI
        </button>

        {/* Notification */}
        <button
          className="relative w-[40px] h-[40px] rounded-xl border border-[#e5e2da] bg-white flex items-center justify-center hover:bg-gray-50"
        >
          ♧
          <span className="absolute top-[8px] right-[8px] w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile */}
        {user ? (
          <div className="flex items-center gap-2 h-[40px] px-3 rounded-xl border border-[#e5e2da] bg-white">

            <div className="w-7 h-7 rounded-full bg-[#eef0e8] flex items-center justify-center text-[10px] text-gray-600">
              {user.name?.substring(0, 2).toUpperCase() || 'AM'}
            </div>

            <div className="leading-tight">
              <div className="text-sm font-medium text-gray-800">
                {user.name || 'Arjun'}
              </div>

              <div className="text-[9px] text-gray-400">
                {formatRole(user.role)}
              </div>
            </div>

          </div>
        ) : (
          <Link
            to="/login"
            className="text-sm text-indigo-600"
          >
            Login
          </Link>
        )}

      </div>

    </header>
  )
}

export default Header