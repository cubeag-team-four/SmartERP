import React, { useState } from 'react'

const MOCK_ORDERS = [
  { id: 1,  orderNumber: 'SO-2026-001', customerName: 'Tata Steel Ltd',       orderDate: '02 Aug 2026', expectedDeliveryDate: '20 Aug 2026', totalAmount: '₹3,20,000',  status: 'CONFIRMED'   },
  { id: 2,  orderNumber: 'SO-2026-002', customerName: 'Infosys BPO',           orderDate: '04 Aug 2026', expectedDeliveryDate: '22 Aug 2026', totalAmount: '₹85,000',    status: 'IN_PROGRESS' },
  { id: 3,  orderNumber: 'SO-2026-003', customerName: 'Hero MotoCorp',         orderDate: '06 Aug 2026', expectedDeliveryDate: '25 Aug 2026', totalAmount: '₹7,50,000',  status: 'COMPLETED'   },
  { id: 4,  orderNumber: 'SO-2026-004', customerName: 'Bajaj Auto Ltd',        orderDate: '07 Aug 2026', expectedDeliveryDate: '28 Aug 2026', totalAmount: '₹1,40,000',  status: 'INVOICED'    },
  { id: 5,  orderNumber: 'SO-2026-005', customerName: 'Reliance Industries',   orderDate: '09 Aug 2026', expectedDeliveryDate: '30 Aug 2026', totalAmount: '₹12,00,000', status: 'IN_PROGRESS' },
  { id: 6,  orderNumber: 'SO-2026-006', customerName: 'Mahindra & Mahindra',   orderDate: '11 Aug 2026', expectedDeliveryDate: '—',           totalAmount: '₹45,000',    status: 'CANCELLED'   },
  { id: 7,  orderNumber: 'SO-2026-007', customerName: 'Wipro Technologies',    orderDate: '13 Aug 2026', expectedDeliveryDate: '01 Sep 2026', totalAmount: '₹2,60,000',  status: 'CONFIRMED'   },
  { id: 8,  orderNumber: 'SO-2026-008', customerName: 'L&T Construction',      orderDate: '15 Aug 2026', expectedDeliveryDate: '05 Sep 2026', totalAmount: '₹18,50,000', status: 'IN_PROGRESS' },
  { id: 9,  orderNumber: 'SO-2026-009', customerName: 'Adani Enterprises',     orderDate: '17 Aug 2026', expectedDeliveryDate: '08 Sep 2026', totalAmount: '₹5,80,000',  status: 'COMPLETED'   },
  { id: 10, orderNumber: 'SO-2026-010', customerName: 'Sun Pharmaceutical',    orderDate: '19 Aug 2026', expectedDeliveryDate: '—',           totalAmount: '₹95,000',    status: 'CANCELLED'   },
]

const STATUS_STYLE = {
  CONFIRMED:    { background: '#e8f0fe', color: '#2563eb' },
  IN_PROGRESS:  { background: '#fef9e6', color: '#b45309' },
  COMPLETED:    { background: '#e6f4ea', color: '#3a7d44' },
  INVOICED:     { background: '#f3e8ff', color: '#7c3aed' },
  CANCELLED:    { background: '#fde8e8', color: '#d9534f' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { background: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      ...s,
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontFamily: 'monospace',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
    }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

const TH = ({ children, right }) => (
  <th style={{
    padding: '10px 16px',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#91a0a0',
    textAlign: right ? 'right' : 'left',
    borderBottom: '1px solid #f0efeb',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
)

const SalesOrders = () => {
  const [hoveredRow, setHovered] = useState(null)

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e3e0d9',
      borderRadius: 18,
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #f0efeb',
      }}>
        <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f', margin: 0 }}>
          All Orders
          <span style={{
            marginLeft: 8,
            background: '#f0efeb',
            color: '#53605e',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: 10,
          }}>
            {MOCK_ORDERS.length}
          </span>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search orders..."
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #e3e0d9',
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#11130f',
              outline: 'none',
              width: 200,
            }}
          />
          <select style={{
            padding: '7px 12px',
            borderRadius: 10,
            border: '1px solid #e3e0d9',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#11130f',
            outline: 'none',
            background: '#fff',
          }}>
            <option value="">All Status</option>
            {Object.keys(STATUS_STYLE).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Order #</TH>
              <TH>Customer</TH>
              <TH>Order Date</TH>
              <TH>Delivery Date</TH>
              <TH right>Amount</TH>
              <TH>Status</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map((o) => (
              <tr
                key={o.id}
                onMouseEnter={() => setHovered(o.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderBottom: '1px solid #f6f5f1',
                  background: hoveredRow === o.id ? '#fafaf8' : '#fff',
                  transition: 'background .12s',
                }}
              >
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#91a0a0' }}>
                  {o.orderNumber}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f' }}>
                  {o.customerName}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                  {o.orderDate}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                  {o.expectedDeliveryDate}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f', textAlign: 'right' }}>
                  {o.totalAmount}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={o.status} />
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <button style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    border: '1px solid #e3e0d9',
                    background: '#fff',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: '#53605e',
                    cursor: 'pointer',
                    opacity: hoveredRow === o.id ? 1 : 0,
                    transition: 'opacity .12s',
                  }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesOrders
