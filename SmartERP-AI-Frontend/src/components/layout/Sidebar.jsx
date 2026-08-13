import React from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/slices/auth.store'

const NAV = {
  superAdmin: [
    { label: 'Dashboard',          to: '/app/super-admin/dashboard' },
    { label: 'Tenants',            to: '/app/super-admin/tenants' },
    { label: 'Subscriptions',      to: '/app/super-admin/subscriptions' },
    { label: 'Platform Users',     to: '/app/super-admin/platform-users' },
    { label: 'Company Management', to: '/app/super-admin/company' },
    { label: 'CRM',                to: '/app/super-admin/crm' },
    { label: 'Sales',              to: '/app/super-admin/sales' },
    { label: 'Purchase',           to: '/app/super-admin/purchase' },
    { label: 'Inventory',          to: '/app/super-admin/inventory' },
    { label: 'Manufacturing',      to: '/app/super-admin/manufacturing' },
    { label: 'Finance & Accounts', to: '/app/super-admin/finance' },
    { label: 'HR & Payroll',       to: '/app/super-admin/hr' },
    { label: 'Projects',           to: '/app/super-admin/projects' },
    { label: 'Documents',          to: '/app/super-admin/documents' },
    { label: 'Reports',            to: '/app/super-admin/reports' },
    { label: 'AI Assistant',       to: '/app/super-admin/ai' },
    { label: 'Settings',           to: '/app/super-admin/settings' },
  ],
  admin: [
    { label: 'Dashboard',          to: '/app/admin/dashboard' },
    { label: 'Company Management', to: '/app/admin/company' },
    { label: 'CRM',                to: '/app/admin/crm' },
    { label: 'Sales',              to: '/app/admin/sales' },
    { label: 'Purchase',           to: '/app/admin/purchase' },
    { label: 'Inventory',          to: '/app/admin/inventory' },
    { label: 'Manufacturing',      to: '/app/admin/manufacturing' },
    { label: 'Finance & Accounts', to: '/app/admin/finance' },
    { label: 'HR & Payroll',       to: '/app/admin/hr' },
    { label: 'Projects',           to: '/app/admin/projects' },
    { label: 'Documents',          to: '/app/admin/documents' },
    { label: 'Reports',            to: '/app/admin/reports' },
    { label: 'AI Assistant',       to: '/app/admin/ai' },
    { label: 'Settings',           to: '/app/admin/settings' },
  ],
  financeManager: [
    { label: 'Dashboard',          to: '/app/finance-manager/dashboard' },
    { label: 'Sales',              to: '/app/finance-manager/sales' },
    { label: 'Purchase',           to: '/app/finance-manager/purchase' },
    { label: 'Finance & Accounts', to: '/app/finance-manager/finance' },
    { label: 'Projects',           to: '/app/finance-manager/projects' },
    { label: 'Documents',          to: '/app/finance-manager/documents' },
    { label: 'AI Assistant',       to: '/app/finance-manager/ai' },
    { label: 'Reports & Analytics',to: '/app/finance-manager/reports' },
  ],
  salesManager: [
    { label: 'Dashboard',          to: '/app/sales-manager/dashboard' },
    { label: 'CRM',                to: '/app/sales-manager/crm' },
    { label: 'Sales',              to: '/app/sales-manager/sales' },
    { label: 'Inventory',          to: '/app/sales-manager/inventory' },
    { label: 'Projects',           to: '/app/sales-manager/projects' },
    { label: 'Documents',          to: '/app/sales-manager/documents' },
    { label: 'AI Assistant',       to: '/app/sales-manager/ai' },
    { label: 'Reports & Analytics',to: '/app/sales-manager/reports' },
  ],
  hrManager: [
    { label: 'Dashboard',          to: '/app/hr-manager/dashboard' },
    { label: 'HR & Payroll',       to: '/app/hr-manager/hr' },
    { label: 'Projects',           to: '/app/hr-manager/projects' },
    { label: 'Documents',          to: '/app/hr-manager/documents' },
    { label: 'AI Assistant',       to: '/app/hr-manager/ai' },
    { label: 'Reports & Analytics',to: '/app/hr-manager/reports' },
  ],
  operationsManager: [
    { label: 'Dashboard',          to: '/app/operations-manager/dashboard' },
    { label: 'Purchase',           to: '/app/operations-manager/purchase' },
    { label: 'Inventory',          to: '/app/operations-manager/inventory' },
    { label: 'Manufacturing',      to: '/app/operations-manager/manufacturing' },
    { label: 'Projects',           to: '/app/operations-manager/projects' },
    { label: 'Documents',          to: '/app/operations-manager/documents' },
    { label: 'AI Assistant',       to: '/app/operations-manager/ai' },
    { label: 'Reports & Analytics',to: '/app/operations-manager/reports' },
  ],
  employee: [
    { label: 'Dashboard',          to: '/app/employee/dashboard' },
    { label: 'Projects',           to: '/app/employee/projects' },
    { label: 'Documents',          to: '/app/employee/documents' },
    { label: 'AI Assistant',       to: '/app/employee/ai' },
  ],
}

const Sidebar = () => {
  const { user } = useAuthStore()
  const links = (user?.role && NAV[user.role]) || []

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-bold text-indigo-400">SmartERP</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-400">
          {user.name || user.email}
          <div className="text-gray-500 capitalize">{user.role}</div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
