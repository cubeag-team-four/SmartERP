import React, { useState } from 'react'

const quotationsData = [
  { id: 'QT-2026-0184', customer: 'Bajaj Auto Ltd',     date: '08 Aug 2026', validUntil: '22 Aug 2026', items: 6,  amount: '₹8,42,500',  status: 'SENT'      },
  { id: 'QT-2026-0183', customer: 'Hero MotoCorp',      date: '07 Aug 2026', validUntil: '21 Aug 2026', items: 12, amount: '₹14,10,000', status: 'ACCEPTED'  },
  { id: 'QT-2026-0182', customer: 'L&T Infrastructure', date: '05 Aug 2026', validUntil: '19 Aug 2026', items: 4,  amount: '₹3,25,000',  status: 'DRAFT'     },
  { id: 'QT-2026-0181', customer: 'Godrej Industries',  date: '03 Aug 2026', validUntil: '17 Aug 2026', items: 18, amount: '₹22,60,000', status: 'ACCEPTED'  },
  { id: 'QT-2026-0180', customer: 'Wipro Ltd',          date: '01 Aug 2026', validUntil: '15 Aug 2026', items: 7,  amount: '₹5,80,000',  status: 'CANCELLED' },
]

const statusStyles = {
  SENT:      'bg-blue-50 text-blue-600',
  ACCEPTED:  'bg-green-50 text-green-700',
  DRAFT:     'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-500',
}

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${statusStyles[status] || 'bg-gray-100 text-gray-500'}`}>
    {status}
  </span>
)

const TH = ({ children, right }) => (
  <th className={`py-2 px-4 text-[10px] font-semibold tracking-widest text-gray-400 uppercase ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
)

const Quotations = () => {
  const [hoveredRow, setHoveredRow] = useState(null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
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
          {quotationsData.map((q) => (
            <tr
              key={q.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              onMouseEnter={() => setHoveredRow(q.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className="py-4 px-4 text-xs text-gray-400 font-mono">{q.id}</td>
              <td className="py-4 px-4 text-sm font-semibold text-gray-800">{q.customer}</td>
              <td className="py-4 px-4 text-sm text-gray-500">{q.date}</td>
              <td className="py-4 px-4 text-sm text-gray-500">{q.validUntil}</td>
              <td className="py-4 px-4 text-sm text-gray-500 text-right">{q.items}</td>
              <td className="py-4 px-4 text-sm font-semibold text-gray-800 text-right">{q.amount}</td>
              <td className="py-4 px-4"><StatusBadge status={q.status} /></td>
              <td className="py-4 px-4 text-right">
                <button
                  className={`text-xs text-gray-400 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 transition-opacity ${hoveredRow === q.id ? 'opacity-100' : 'opacity-0'}`}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Quotations
