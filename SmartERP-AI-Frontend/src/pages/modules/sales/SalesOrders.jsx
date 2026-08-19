import React from 'react'

const ordersData = [
  { id: 'SO-2026-0412', customer: 'Hero MotoCorp',      orderDate: '07 Aug 2026', deliveryDate: '15 Aug 2026', amount: '₹14,10,000', status: 'CONFIRMED'   },
  { id: 'SO-2026-0411', customer: 'Godrej Industries',  orderDate: '03 Aug 2026', deliveryDate: '12 Aug 2026', amount: '₹22,60,000', status: 'IN PROGRESS' },
  { id: 'SO-2026-0410', customer: 'Bajaj Auto Ltd',     orderDate: '28 Jul 2026', deliveryDate: '10 Aug 2026', amount: '₹9,15,000',  status: 'COMPLETED'   },
  { id: 'SO-2026-0409', customer: 'Tata Steel',         orderDate: '22 Jul 2026', deliveryDate: '05 Aug 2026', amount: '₹31,40,000', status: 'COMPLETED'   },
  { id: 'SO-2026-0408', customer: 'Mahindra Logistics', orderDate: '18 Jul 2026', deliveryDate: '01 Aug 2026', amount: '₹7,20,000',  status: 'COMPLETED'   },
]

const statusStyles = {
  CONFIRMED:    'bg-blue-50 text-blue-600',
  'IN PROGRESS':'bg-yellow-50 text-yellow-700',
  COMPLETED:    'bg-green-50 text-green-700',
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

const SalesOrders = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <TH>Order #</TH>
            <TH>Customer</TH>
            <TH>Order Date</TH>
            <TH>Delivery Date</TH>
            <TH right>Amount</TH>
            <TH>Status</TH>
          </tr>
        </thead>
        <tbody>
          {ordersData.map((o) => (
            <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 text-xs text-gray-400 font-mono">{o.id}</td>
              <td className="py-4 px-4 text-sm font-semibold text-gray-800">{o.customer}</td>
              <td className="py-4 px-4 text-sm text-gray-500">{o.orderDate}</td>
              <td className="py-4 px-4 text-sm text-gray-500">{o.deliveryDate}</td>
              <td className="py-4 px-4 text-sm font-semibold text-gray-800 text-right">{o.amount}</td>
              <td className="py-4 px-4"><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SalesOrders
