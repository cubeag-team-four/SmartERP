import React, { useEffect, useState } from "react";
import PurchaseService from "../../../core/services/modules/purchase.service";

function SummaryCard({ value, label, type }) {
  const valueColor =
    type === "warning"
      ? "text-[#8b7a4d]"
      : type === "danger"
      ? "text-[#8d5148]"
      : "text-[#171815]";

  return (
    <div
      className="
        rounded-[18px]
        border border-[#e4e2dd]
        bg-white
        px-5
        py-4
        transition-all
        duration-200
        hover:border-[#d8d5ce]
        hover:shadow-[0_3px_12px_rgba(0,0,0,0.025)]
        sm:rounded-[20px]
        sm:px-6
        sm:py-[17px]
      "
    >
      <div
        className={`
          font-serif
          text-[28px]
          leading-none
          tracking-[-0.03em]
          sm:text-[30px]
          ${valueColor}
        `}
      >
        {value}
      </div>

      <div className="mt-[8px] text-[9px] font-semibold leading-none tracking-[0.14em] text-[#a0a09a]">
        {label}
      </div>
    </div>
  );
}

function PayableCard({ item }) {
  return (
    <article
      className="
        group
        flex
        min-h-[90px]
        items-center
        justify-between
        gap-6
        rounded-[18px]
        border
        border-[#e4e2dd]
        bg-white
        px-5
        py-4
        transition-all
        duration-200
        hover:border-[#d8d5ce]
        hover:shadow-[0_3px_12px_rgba(0,0,0,0.035)]
        sm:rounded-[20px]
        sm:px-6
        sm:py-[16px]
      "
    >
      {/* Vendor */}
      <div className="min-w-0">
        <h2 className="font-serif text-[18px] leading-none tracking-[-0.015em] text-[#171815] sm:text-[19px]">
          {item.vendor}
        </h2>

        <p className="mt-[7px] text-[10px] leading-none text-[#999a94] sm:text-[11px]">
          {item.location}
          <span className="mx-[8px]">·</span>
          {item.category}
        </p>
      </div>

      {/* Amount + Due + Button */}
      <div className="flex shrink-0 items-center gap-4 sm:gap-5">
        <div className="text-right">
          <div className="text-[12px] font-semibold leading-none text-[#171815] sm:text-[13px]">
            {item.amount}
          </div>

          <div className="mt-[6px] text-[9px] leading-none text-[#aaa9a4] sm:text-[10px]">
            Due: {item.dueDate || "-"}
          </div>
        </div>

        <button
          type="button"
          className="
            rounded-[13px]
            border
            border-[#d6dfd1]
            bg-[#e9eee5]
            px-[15px]
            py-[10px]
            text-[11px]
            font-semibold
            leading-none
            text-[#52614c]
            transition-all
            duration-200
            hover:border-[#c4d0bd]
            hover:bg-[#dfe8db]
            hover:shadow-sm
          "
        >
          Pay Now
        </button>
      </div>
    </article>
  );
}

const PayablesAging = () => {

const [payables, setPayables] = useState([]);
const [summary, setSummary] = useState({
  totalPayables: 0,
  dueThisWeek: 0,
  overduePayables: 0,
  pendingCount: 0,
  currency: "INR",
});
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchPayables = async () => {
    try {
      const [payablesResponse, summaryResponse] = await Promise.all([
        PurchaseService.getAllPayables(),
        PurchaseService.getPayablesSummary(),
      ]);

      setPayables(payablesResponse.data);
      setSummary(summaryResponse.data);
    } catch (error) {
      console.error("Failed to load payables:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchPayables();
}, []);

  return (
    <main className="bg-[#f7f6f2] px-4 py-4 text-[#171815] sm:px-6 sm:py-[18px] lg:px-[30px]">
      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <SummaryCard
    value={`₹${Number(summary.totalPayables || 0).toLocaleString("en-IN")}`}
    label="TOTAL PAYABLES"
    type="normal"
  />

  <SummaryCard
    value={`₹${Number(summary.dueThisWeek || 0).toLocaleString("en-IN")}`}
    label="DUE THIS WEEK"
    type="warning"
  />

  <SummaryCard
    value={`₹${Number(summary.overduePayables || 0).toLocaleString("en-IN")}`}
    label="OVERDUE"
    type="danger"
  />
</section>

      {/* Payables */}
      <section className="mt-4 space-y-3 sm:mt-4">
        {loading ? (
  <div className="py-10 text-center text-sm text-gray-400">
    Loading payables...
  </div>
) : payables.length === 0 ? (
  <div className="py-10 text-center text-sm text-gray-400">
    No payables found.
  </div>
) : (
  payables.map((item) => (
    <PayableCard key={item.vendor} item={item} />
  ))
)}
      </section>
    </main>
  );
};

export default PayablesAging;