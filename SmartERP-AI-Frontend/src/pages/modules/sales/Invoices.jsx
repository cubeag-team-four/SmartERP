import React, { useState } from 'react'

const MOCK_INVOICES = [
  { id: 1,  invoiceNumber: 'INV-2026-001', customerName: 'Tata Steel Ltd',       issueDate: '03 Aug 2026', dueDate: '17 Aug 2026', totalAmount: '₹3,20,000',  paidAmount: '₹3,20,000', balanceDue: '₹0',        status: 'PAID'           },
  { id: 2,  invoiceNumber: 'INV-2026-002', customerName: 'Infosys BPO',           issueDate: '05 Aug 2026', dueDate: '19 Aug 2026', totalAmount: '₹85,000',    paidAmount: '₹50,000',   balanceDue: '₹35,000',   status: 'PARTIALLY_PAID' },
  { id: 3,  invoiceNumber: 'INV-2026-003', customerName: 'Hero MotoCorp',         issueDate: '06 Aug 2026', dueDate: '20 Aug 2026', totalAmount: '₹7,50,000',  paidAmount: '₹0',        balanceDue: '₹7,50,000', status: 'OVERDUE'         },
  { id: 4,  invoiceNumber: 'INV-2026-004', customerName: 'Bajaj Auto Ltd',        issueDate: '08 Aug 2026', dueDate: '22 Aug 2026', totalAmount: '₹1,40,000',  paidAmount: '₹0',        balanceDue: '₹1,40,000', status: 'SENT'            },
  { id: 5,  invoiceNumber: 'INV-2026-005', customerName: 'Reliance Industries',   issueDate: '10 Aug 2026', dueDate: '24 Aug 2026', totalAmount: '₹12,00,000', paidAmount: '₹12,00,000',balanceDue: '₹0',        status: 'PAID'            },
  { id: 6,  invoiceNumber: 'INV-2026-006', customerName: 'Mahindra & Mahindra',   issueDate: '12 Aug 2026', dueDate: '26 Aug 2026', totalAmount: '₹45,000',    paidAmount: '₹0',        balanceDue: '₹45,000',   status: 'CANCELLED'       },
  { id: 7,  invoiceNumber: 'INV-2026-007', customerName: 'Wipro Technologies',    issueDate: '13 Aug 2026', dueDate: '27 Aug 2026', totalAmount: '₹2,60,000',  paidAmount: '₹1,00,000', balanceDue: '₹1,60,000', status: 'PARTIALLY_PAID'  },
  { id: 8,  invoiceNumber: 'INV-2026-008', customerName: 'L&T Construction',      issueDate: '15 Aug 2026', dueDate: '29 Aug 2026', totalAmount: '₹18,50,000', paidAmount: '₹0',        balanceDue: '₹18,50,000','status': 'OVERDUE'       },
  { id: 9,  invoiceNumber: 'INV-2026-009', customerName: 'Adani Enterprises',     issueDate: '17 Aug 2026', dueDate: '31 Aug 2026', totalAmount: '₹5,80,000',  paidAmount: '₹5,80,000', balanceDue: '₹0',        status: 'PAID'            },
  { id: 10, invoiceNumber: 'INV-2026-010', customerName: 'Sun Pharmaceutical',    issueDate: '19 Aug 2026', dueDate: '02 Sep 2026', totalAmount: '₹95,000',    paidAmount: '₹0',        balanceDue: '₹95,000',   status: 'SENT'            },
]

const SUB_CARDS = [
  { label: 'TOTAL INVOICED', value: '₹52,25,000' },
  { label: 'COLLECTED',      value: '₹22,50,000' },
  { label: 'OUTSTANDING',    value: '₹29,75,000' },
]

const STATUS_STYLE = {
  SENT:           { background: '#e8f0fe', color: '#2563eb' },
  PAID:           { background: '#e6f4ea', color: '#3a7d44' },
  PARTIALLY_PAID: { background: '#fff3e0', color: '#d97706' },
  OVERDUE:        { background: '#fde8e8', color: '#d9534f' },
  CANCELLED:      { background: '#f3f4f6', color: '#91a0a0' },
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

const Invoices = () => {
  const [hoveredRow, setHovered] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Sub-KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {SUB_CARDS.map((c) => (
          <div key={c.label} style={{
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
              {c.value}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: '#9ba2a2',
              margin: 0,
            }}>
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* Invoice table */}
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
            All Invoices
            <span style={{
              marginLeft: 8,
              background: '#f0efeb',
              color: '#53605e',
              borderRadius: 20,
              padding: '2px 8px',
              fontSize: 10,
            }}>
              {MOCK_INVOICES.length}
            </span>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Search invoices..."
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
                <TH>Invoice #</TH>
                <TH>Customer</TH>
                <TH>Issue Date</TH>
                <TH>Due Date</TH>
                <TH right>Total</TH>
                <TH right>Paid</TH>
                <TH right>Balance Due</TH>
                <TH>Status</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv) => (
                <tr
                  key={inv.id}
                  onMouseEnter={() => setHovered(inv.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    borderBottom: '1px solid #f6f5f1',
                    background: hoveredRow === inv.id ? '#fafaf8' : '#fff',
                    transition: 'background .12s',
                  }}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#91a0a0' }}>
                    {inv.invoiceNumber}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f' }}>
                    {inv.customerName}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                    {inv.issueDate}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e' }}>
                    {inv.dueDate}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#11130f', textAlign: 'right' }}>
                    {inv.totalAmount}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#53605e', textAlign: 'right' }}>
                    {inv.paidAmount}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: inv.balanceDue === '₹0' ? '#3a7d44' : '#d9534f', textAlign: 'right', fontWeight: 600 }}>
                    {inv.balanceDue}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={inv.status} />
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
                      opacity: hoveredRow === inv.id ? 1 : 0,
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
    </div>
  )
}

export default Invoices
