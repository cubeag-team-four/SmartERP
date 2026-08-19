import React from 'react'

const analyticsMonthly = [
  { month: 'MAR', value: 18, label: '₹18L' },
  { month: 'APR', value: 24, label: '₹24L' },
  { month: 'MAY', value: 21, label: '₹21L' },
  { month: 'JUN', value: 30, label: '₹30L' },
  { month: 'JUL', value: 42, label: '₹42L' },
  { month: 'AUG', value: 28, label: '₹28L' },
]

const topCustomers = [
  { rank: 1, name: 'Tata Steel',         amount: '₹31.4 L', pct: 100 },
  { rank: 2, name: 'Godrej Industries',  amount: '₹22.6 L', pct: 72  },
  { rank: 3, name: 'Hero MotoCorp',      amount: '₹14.1 L', pct: 45  },
  { rank: 4, name: 'Bajaj Auto',         amount: '₹9.2 L',  pct: 29  },
  { rank: 5, name: 'Mahindra Logistics', amount: '₹7.2 L',  pct: 23  },
]

const Analytics = () => {
  const maxVal = Math.max(...analyticsMonthly.map((m) => m.value))

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 px-6 py-6">
        <p className="text-sm font-semibold text-gray-800 mb-6">Monthly Revenue</p>
        <div className="flex items-end gap-3 h-40">
          {analyticsMonthly.map((m) => {
            const heightPct = (m.value / maxVal) * 100
            return (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] text-gray-500 font-medium">{m.label}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: '#7c9a6e',
                    opacity: m.month === 'JUL' ? 1 : 0.6,
                    minHeight: 8,
                  }}
                />
                <span className="text-[10px] text-gray-400 font-medium">{m.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top customers */}
      <div className="bg-white rounded-2xl border border-gray-100 px-6 py-6">
        <p className="text-sm font-semibold text-gray-800 mb-5">Top Customers</p>
        <div className="space-y-4">
          {topCustomers.map((c) => (
            <div key={c.rank} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-4 flex-shrink-0">{c.rank}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700 font-medium">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.amount}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, backgroundColor: '#7c9a6e' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Analytics
