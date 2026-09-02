import React, { useState } from 'react'

const MOCK_QUOTATIONS = [
  { id: 1, quotationNumber: 'QUO-2026-001', customerName: 'Tata Steel Ltd',         quotationDate: '01 Aug 2026', validUntil: '31 Aug 2026', items: 4,  totalAmount: '₹3,20,000', status: 'SENT'      },
  { id: 2, quotationNumber: 'QUO-2026-002', customerName: 'Infosys BPO',             quotationDate: '05 Aug 2026', validUntil: '04 Sep 2026', items: 2,  totalAmount: '₹85,000',   status: 'ACCEPTED'  },
  { id: 3, quotationNumber: 'QUO-2026-003', customerName: 'Hero MotoCorp',           quotationDate: '08 Aug 2026', validUntil: '07 Sep 2026', items: 6,  totalAmount: '₹7,50,000', status: 'DRAFT'     },
  { id: 4, quotationNumber: 'QUO-2026-004', customerName: 'Bajaj Auto Ltd',          quotationDate: '10 Aug 2026', validUntil: '09 Sep 2026', items: 3,  totalAmount: '₹1,40,000', status: 'CONVERTED' },
  { id: 5, quotationNumber: 'QUO-2026-005', customerName: 'Reliance Industries',     quotationDate: '12 Aug 2026', validUntil: '11 Sep 2026', items: 8,  totalAmount: '₹12,00,000','status': 'ACCEPTED' },
  { id: 6, quotationNumber: 'QUO-2026-006', customerName: 'Mahindra & Mahindra',     quotationDate: '14 Aug 2026', validUntil: '13 Sep 2026', items: 1,  totalAmount: '₹45,000',   status: 'EXPIRED'   },
  { id: 7, quotationNumber: 'QUO-2026-007', customerName: 'Wipro Technologies',      quotationDate: '16 Aug 2026', validUntil: '15 Sep 2026', items: 5,  totalAmount: '₹2,60,000', status: 'REJECTED'  },
  { id: 8, quotationNumber: 'QUO-2026-008', customerName: 'L&T Construction',        quotationDate: '18 Aug 2026', validUntil: '17 Sep 2026', items: 11, totalAmount: '₹18,50,000', status: 'SENT'     },
  { id: 9, quotationNumber: 'QUO-2026-009', customerName: 'Adani Enterprises',       quotationDate: '20 Aug 2026', validUntil: '19 Sep 2026', items: 3,  totalAmount: '₹5,80,000', status: 'DRAFT'     },
  { id: 10,quotationNumber: 'QUO-2026-010', customerName: 'Sun Pharmaceutical',      quotationDate: '22 Aug 2026', validUntil: '21 Sep 2026', items: 2,  totalAmount: '₹95,000',   status: 'CANCELLED' },
]

const STATUS_STYLE = {
  SENT:      { background: '#e8f0fe', color: '#2563eb' },
  ACCEPTED:  { background: '#e6f4ea', color: '#3a7d44' },
  DRAFT:     { background: '#f3f4f6', color: '#6b7280' },
  CANCELLED: { background: '#fde8e8', color: '#d9534f' },
  REJECTED:  { background: '#fde8e8', color: '#d9534f' },
  EXPIRED:   { background: '#fff3e0', color: '#d97706' },
  CONVERTED: { background: '#f3e8ff', color: '#7c3aed' },
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
      {status}
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

const Quotations = ({ onView }) => {
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
          All Quotations
          <span style={{
            marginLeft: 8,
            background: '#f0efeb',
            color: '#53605e',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: 10,
          }}>
            {MOCK_QUOTATIONS.length}
          </span>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search quotations..."
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
              <TH>Quote #</TH>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH>Valid Until</TH>
              <TH right>Items</TH>
              <TH right>Amount</TH>
              <TH>Status</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {MOCK_QUOTATIONS.map((q) => (
              <tr
                key={q.id}
                onMouseEnter={() => setHovered(q.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderBottom: '1px solid #f6f5f1',
                  background: hoveredRow === q.id ? '#fafaf8' : '#fff',
                  transition: 'background .12s',
                }}
              >
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#91a0a0' }}>
                  {q.quotationNumber}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f' }}>
                  {q.customerName}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                  {q.quotationDate}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                  {q.validUntil}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e', textAlign: 'right' }}>
                  {q.items}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f', textAlign: 'right' }}>
                  {q.totalAmount}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={q.status} />
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => onView && onView(q)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 8,
                      border: '1px solid #e3e0d9',
                      background: '#fff',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: '#53605e',
                      cursor: 'pointer',
                      opacity: hoveredRow === q.id ? 1 : 0,
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

export default Quotations
