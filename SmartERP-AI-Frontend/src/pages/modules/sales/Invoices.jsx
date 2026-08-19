import React from 'react'

const invoicesData = [
  { id: 'INV-2026-0318', customer: 'Hero MotoCorp',     date: '07 Aug 2026', dueDate: '21 Aug 2026', total: '₹14,10,000', paid: '₹0',          status: 'SENT'          },
  { id: 'INV-2026-0317', customer: 'Bajaj Auto Ltd',    date: '28 Jul 2026', dueDate: '11 Aug 2026', total: '₹9,15,000',  paid: '₹9,15,000',   status: 'PAID'          },
  { id: 'INV-2026-0316', customer: 'Tata Steel',        date: '22 Jul 2026', dueDate: '05 Aug 2026', total: '₹31,40,000', paid: '₹15,00,000',  status: 'PARTIALLY PAID'},
  { id: 'INV-2026-0315', customer: 'Godrej Industries', date: '15 Jul 2026', dueDate: '29 Jul 2026', total: '₹22,60,000', paid: '₹22,60,000',  status: 'PAID'          },
  { id: 'INV-2026-0314', customer: 'Wipro Ltd',         date: '10 Jul 2026', dueDate: '24 Jul 2026', total: '₹5,80,000',  paid: '₹0',          status: 'OVERDUE'       },
]

const statusStyles = {
  SENT:           'bg-blue-50 text-blue-600',
  PAID:           'bg-green-50 text-green-700',
  'PARTIALLY PAID': 'bg-orange-50 text-orange-600',
  OVERDUE:        'bg-red-50 text-red-500',
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

const Invoices = () => {
  return (
    <div className="space-y-4">
      {/* Sub-KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'TOTAL INVOICED', value: '₹1.42 Cr' },
          { label: 'COLLECTED',      value: '₹36.95 L' },
          { label: 'OUTSTANDING',    value: '₹1.05 Cr' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
            <p className="text-3xl font-serif text-gray-900 tracking-tight">{c.value}</p>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <TH>Invoice #</TH>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH>Due Date</TH>
              <TH right>Total</TH>
              <TH right>Paid</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {invoicesData.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-xs text-gray-400 font-mono">{inv.id}</td>
                <td className="py-4 px-4 text-sm font-semibold text-gray-800">{inv.customer}</td>
                <td className="py-4 px-4 text-sm text-gray-500">{inv.date}</td>
                <td className="py-4 px-4 text-sm text-gray-500">{inv.dueDate}</td>
                <td className="py-4 px-4 text-sm font-semibold text-gray-800 text-right">{inv.total}</td>
                <td className="py-4 px-4 text-sm text-gray-500 text-right">{inv.paid}</td>
                <td className="py-4 px-4"><StatusBadge status={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Invoices
