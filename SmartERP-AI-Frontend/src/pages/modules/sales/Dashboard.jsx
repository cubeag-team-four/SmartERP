import React, { useState } from 'react'
import Quotations  from './Quotations'
import SalesOrders from './SalesOrders'
import Invoices    from './Invoices'
import Analytics   from './Analytics'

const TABS = ['QUOTATIONS', 'ORDERS', 'INVOICES', 'ANALYTICS']

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('QUOTATIONS')

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: '#f5f4f0' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Sales</p>
          <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            Export
          </button>
          <button
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            + New Quotation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { value: '₹1.42 Cr', label: 'REVENUE MTD',      sub: '↑ 18% vs July',        subColor: 'text-green-600' },
          { value: '₹3.14 Cr', label: 'OUTSTANDING',      sub: '12 invoices pending',   subColor: 'text-gray-400'  },
          { value: '₹8.9 Cr',  label: 'ORDERS YTD',       sub: '412 orders',            subColor: 'text-gray-400'  },
          { value: '92%',       label: 'ON-TIME DELIVERY', sub: '↑ 4pp this month',      subColor: 'text-green-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
            <p className="text-3xl font-serif text-gray-900 tracking-tight">{card.value}</p>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mt-1 mb-1">{card.label}</p>
            <p className={`text-xs font-medium ${card.subColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold tracking-widest rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'QUOTATIONS' && <Quotations />}
        {activeTab === 'ORDERS'     && <SalesOrders />}
        {activeTab === 'INVOICES'   && <Invoices />}
        {activeTab === 'ANALYTICS'  && <Analytics />}
      </div>

    </div>
  )
}

export default Dashboard
