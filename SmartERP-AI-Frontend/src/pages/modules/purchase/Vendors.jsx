import React, { useEffect, useState } from "react";
import PurchaseService from "../../../core/services/modules/purchase.service";
import AddVendorModal from "./AddVendorModal";

const headers = [
  "ID",
  "VENDOR",
  "CONTACT",
  "CITY",
  "CATEGORY",
  "CREDIT LIMIT",
  "RATING",
  "STATUS",
];

/* Same column sizing approach as Purchase Orders */
const gridColumns =
  "grid-cols-[140px_200px_140px_140px_160px_125px_150px_1fr]";

function Rating({ value }) {
  const filled = Math.round(Number(value));

  return (
    <div className="flex items-center gap-2 ">
      <div className="flex items-center gap-[2px]">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-[11px] leading-none ${
              star <= filled
                ? "text-[#b2a477]"
                : "text-[#e4e2dc]"
            }`}
          >
            ●
          </span>
        ))}
      </div>

      <span className="text-[11px] leading-none text-[#999a94]">
        <span className="text-[11px] leading-none text-[#999a94]">{Number(value || 0).toFixed(1)}</span>
      </span>
    </div>
  );
}

function VendorRow({
  vendor,
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
      {/* ID */}
      <div className="py-1 font-mono text-xs text-gray-400">
        {vendor.vendorCode}
      </div>

      {/* Vendor */}
      <div className="py-1 text-sm font-semibold text-gray-800">
        {vendor.vendorName}
      </div>

      {/* Contact */}
      <div className="py-1 text-sm text-gray-500">
        {vendor.contactName}
      </div>

      {/* City */}
      <div className="py-1 text-sm text-gray-500">
        {vendor.city}
      </div>

      {/* Category */}
      <div className="py-1">
        <span className="inline-flex rounded-[10px] border border-[#e4e2dd] bg-[#f5f4f0] px-[10px] py-[6px] text-[10px] leading-none text-[#777871]">
          {vendor.category}
        </span>
      </div>

      {/* Credit Limit */}
      <div className="py-1 text-sm text-gray-800">
        {vendor.creditLimit}
      </div>

      {/* Rating */}
      <div className="py-1">
        <Rating value={vendor.rating} />
      </div>

      {/* Status */}
      <div className="py-1">
        <span
          className={`inline-flex rounded-[10px] px-[11px] py-[7px] text-[10px] font-semibold leading-none tracking-[0.06em] ${
            vendor.status?.toUpperCase() === "ACTIVE"
              ? "bg-[#dfe9db] text-[#50614b]"
              : "bg-[#e7e5df] text-[#77766f]"
          }`}
        >
          {vendor.status}
        </span>
      </div>
    </div>
  );
}

const Vendors = () => {
  /* =====================================================
     VENDORS STATE
  ===================================================== */

const [vendors, setVendors] = useState([]);
const [loading, setLoading] = useState(true);
const [hoveredRow, setHoveredRow] = useState(null);
const [showAddVendor, setShowAddVendor] = useState(false);

useEffect(() => {
  const fetchVendors = async () => {
    try {
      const response = await PurchaseService.getAllVendors();
      setVendors(response.data);
    } catch (error) {
      console.error("Failed to load vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchVendors();
}, []);

  /* =====================================================
     ADD NEW VENDOR
  ===================================================== */

const handleAddVendor = (vendorData) => {
  setVendors((prevVendors) => [
    vendorData,
    ...prevVendors,
  ]);

  setShowAddVendor(false);
};


  return (
    <main className="bg-[#f7f6f2] px-4 py-4 text-[#171815] sm:px-6 sm:py-[18px] lg:px-[30px]">

      <section className="overflow-hidden rounded-[18px] border border-[#e4e2dd] bg-white sm:rounded-[20px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-3 border-b border-[#e4e2dd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-[19px]">

          <h1 className="font-serif text-[19px] leading-none tracking-[-0.015em] text-[#171815] sm:text-[20px]">
            Vendor Directory
          </h1>

          <button
            type="button"
            onClick={() => setShowAddVendor(true)}
            className="w-full rounded-[15px] bg-[#151714] px-[18px] py-[11px] text-[11px] font-semibold leading-none text-white transition-all duration-200 hover:bg-[#292b27] hover:shadow-sm sm:w-auto"
          >
            + Add Vendor
          </button>

        </div>


        {/* =================================================
            TABLE
        ================================================= */}

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

              {headers.map((header) => (
                <div
                  key={header}
                  className="text-[9px] font-medium tracking-[0.1em] text-[#9b9b95]"
                >
                  {header}
                </div>
              ))}

            </div>


            {/* =================================================
                VENDOR ROWS
            ================================================= */}

            <div>
  {loading ? (
    <div className="px-6 py-10 text-center text-sm text-gray-400">
      Loading vendors...
    </div>
  ) : vendors.length === 0 ? (
    <div className="px-6 py-10 text-center text-sm text-gray-400">
      No vendors found.
    </div>
  ) : (
    vendors.map((vendor, index) => (
      <VendorRow
        key={vendor.id}
        vendor={vendor}
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


      {/* =====================================================
          ADD VENDOR MODAL
      ===================================================== */}

      {showAddVendor && (
        <AddVendorModal
          onClose={() => setShowAddVendor(false)}
          onSave={handleAddVendor}
        />
      )}

    </main>
  );
};

export default Vendors;