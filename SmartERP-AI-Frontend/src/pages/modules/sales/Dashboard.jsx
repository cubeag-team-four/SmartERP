import React, { useState } from 'react'
import Quotations  from './Quotations'
import SalesOrders from './SalesOrders'
import Invoices    from './Invoices'
import Analytics   from './Analytics'

const TABS = ['QUOTATIONS', 'ORDERS', 'INVOICES', 'ANALYTICS']

const KPI_CARDS = [
  { value: '₹42.6 L',  label: 'REVENUE MTD',      sub: '↑ 12.4% vs last month', subColor: '#3a7d44' },
  { value: '₹18.2 L',  label: 'OUTSTANDING',       sub: '14 invoices pending',   subColor: '#91a0a0' },
  { value: '₹1.84 Cr', label: 'ORDERS YTD',        sub: '138 orders',            subColor: '#91a0a0' },
  { value: '94.2%',    label: 'ON-TIME DELIVERY',  sub: '↑ 2pp this month',      subColor: '#3a7d44' },
]

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('QUOTATIONS')

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: '#f5f4f0' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p style={{
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: '#91a0a0',
            marginBottom: 10,
          }}>
            SALES
          </p>
          <h1 style={{
            fontFamily: 'var(--serif, Georgia, serif)',
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1,
            color: '#11130f',
            margin: 0,
          }}>
            Sales Management
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            padding: '10px 18px',
            borderRadius: 14,
            border: '1px solid #e2dfd7',
            background: '#fff',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#303531',
            cursor: 'pointer',
          }}>
            ↓ Export
          </button>
          <button style={{
            padding: '10px 18px',
            borderRadius: 14,
            border: 'none',
            background: '#11130f',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#fff',
            cursor: 'pointer',
          }}>
            + New Quotation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 28,
      }}>
        {KPI_CARDS.map((card) => (
          <div key={card.label} style={{
            background: '#fff',
            border: '1px solid #e3e0d9',
            borderRadius: 20,
            padding: '22px 22px 18px',
          }}>
            <p style={{
              fontFamily: 'var(--serif, Georgia, serif)',
              fontSize: 28,
              fontWeight: 400,
              color: '#9b8050',
              margin: '0 0 8px',
              lineHeight: 1,
            }}>
              {card.value}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: '#9ba2a2',
              margin: '0 0 6px',
            }}>
              {card.label}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: card.subColor,
              margin: 0,
            }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: activeTab === tab ? '1px solid #e3e0d9' : '1px solid transparent',
              background: activeTab === tab ? '#fff' : 'transparent',
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: activeTab === tab ? '#11130f' : '#8d9696',
              cursor: 'pointer',
              boxShadow: activeTab === tab ? '0 2px 5px rgba(0,0,0,.06)' : 'none',
              transition: 'all .15s',
            }}
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
