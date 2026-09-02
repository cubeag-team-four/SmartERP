import React, { useEffect, useState } from "react";
import PurchaseService from "../../../core/services/modules/purchase.service";

const qualityStyles = {
  accepted: "bg-[#dfe9db] text-[#50614b]",
  hold: "bg-[#ebe7dc] text-[#756c4e]",
};

const gridColumns =
  "grid-cols-[140px_160px_200px_150px_110px_125px_1fr]";

function GoodsReceiptRow({
  grn,
  index,
  hoveredRow,
  setHoveredRow,
}) {
  const isHovered = hoveredRow === index;

  return (
    <div
      onMouseEnter={() => setHoveredRow(index)}
      onMouseLeave={() => setHoveredRow(null)}
      className={`
        group relative grid
        ${gridColumns}
        items-center
        border-b border-[#e4e2dd]
        px-6
        py-[18px]
        transition-colors
        duration-200
        last:border-b-0
        ${isHovered ? "bg-[#f7f6f2]" : "bg-white"}
      `}
    >
      {/* GRN */}
      <div className="py-1 text-xs text-gray-400">
        {grn.grnNumber}
      </div>

      {/* PO */}
      <div className="py-1 text-xs text-[#53664a]">
        {grn.purchaseOrderId}
      </div>

      {/* Vendor */}
      <div className="py-1 text-sm font-semibold text-gray-800">
        {grn.vendorName}
      </div>

      {/* Received Date */}
      <div className="py-1 text-sm text-gray-500">
        {grn.receivedDate}
      </div>

      {/* Items */}
      <div className="py-1 text-sm text-gray-500">
        {grn.itemCount}
      </div>

      {/* Value */}
      <div className="py-1 text-sm font-semibold text-gray-800">
        {grn.totalValue}
      </div>

      {/* Quality + Details */}
      <div className="flex items-center gap-3">
        <span
          className={`
            inline-flex
            shrink-0
            rounded-[10px]
            px-3
            py-[7px]
            text-[10px]
            font-semibold
            leading-none
            tracking-[0.06em]
            ${qualityStyles[grn.qualityType]}
          `}
        >
          {grn.qualityStatus}
        </span>

        <button
          type="button"
          className={`
            ml-16
            shrink-0
            rounded-[10px]
            border
            border-[#e2e0da]
            bg-transparent
            px-[11px]
            py-[7px]
            text-[9px]
            leading-none
            text-[#96958f]
            transition-all
            duration-200
            ${
              isHovered
                ? "visible translate-x-0 opacity-100"
                : "invisible translate-x-1 opacity-0"
            }
            hover:border-[#c9c7c0]
            hover:bg-white
            hover:text-[#555650]
          `}
        >
          Details
        </button>
      </div>
    </div>
  );
}

const GoodsReceipts = () => {

const [hoveredRow, setHoveredRow] = useState(null);
const [goodsReceipts, setGoodsReceipts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchGoodsReceipts = async () => {
    try {
      const response = await PurchaseService.getAllGRNs();
      setGoodsReceipts(response.data);
    } catch (error) {
      console.error("Failed to load GRNs:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchGoodsReceipts();
}, []);

  return (
    <main className="bg-[#f7f6f2] px-4 py-4 text-[#171815] sm:px-6 sm:py-[18px] lg:px-[30px]">
      <section className="overflow-hidden rounded-[18px] border border-[#e4e2dd] bg-white sm:rounded-[20px]">

        {/* Header */}
        <div className="border-b border-[#e4e2dd] px-4 py-4 sm:px-6 sm:py-[19px]">
          <h1 className="font-serif text-[19px] leading-none tracking-[-0.015em] text-[#171815] sm:text-[20px]">
            Goods Receipt Notes
          </h1>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">

            {/* Table Header */}
            <div
              className={`
                grid
                ${gridColumns}
                border-b
                border-[#e4e2dd]
                bg-[#f5f4f0]
                px-6
                py-[4px]
              `}
            >
              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                GRN #
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                PO #
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                VENDOR
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                RECEIVED DATE
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                ITEMS
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                VALUE
              </div>

              <div className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]">
                QUALITY
              </div>
            </div>

            {/* Rows */}
            <div>
             {loading ? (
  <div className="px-6 py-10 text-center text-sm text-gray-400">
    Loading goods receipts...
  </div>
) : goodsReceipts.length === 0 ? (
  <div className="px-6 py-10 text-center text-sm text-gray-400">
    No goods receipts found.
  </div>
) : (
  goodsReceipts.map((grn, index) => (
    <GoodsReceiptRow
      key={grn.grnNumber}
      grn={grn}
      index={index}
      hoveredRow={hoveredRow}
      setHoveredRow={setHoveredRow}
    />
  ))
)}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
};

export default GoodsReceipts;