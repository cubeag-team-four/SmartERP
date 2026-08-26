import React, { useState } from "react";

import PurchaseOrders from "./PurchaseOrders";
import Vendors from "./Vendors";
import GoodsReceipts from "./GoodsReceipts";
import PayablesAging from "./PayablesAging";
import CreatePurchaseOrder from "./CreatePurchaseOrder";

const stats = [
  {
    value: "₹38.4 L",
    label: "PURCHASE MTD",
    description: "289 orders",
  },
  {
    value: "₹1.2 Cr",
    label: "PAYABLES",
    description: "18 invoices pending",
  },
  {
    value: "42",
    label: "ACTIVE VENDORS",
    description: "5 new this month",
  },
  {
    value: "96%",
    label: "ON-TIME RECEIPT",
    description: "↑ 2pp vs last month",
  },
];

const tabs = [
  {
    label: "PURCHASE ORDERS",
    key: "purchase-orders",
  },
  {
    label: "VENDORS",
    key: "vendors",
  },
  {
    label: "GRN",
    key: "grn",
  },
  {
    label: "PAYABLES",
    key: "payables",
  },
];

/* =========================================================
   VENDORS
   ========================================================= */

const vendors = [
  {
    id: "V-0042",
    vendor: "Tata Steel Ltd",
    contact: "Ramesh Iyer",
    phone: "+91 9876543210",
    email: "ramesh.iyer@tatasteel.com",
    city: "Pune",
    category: "Raw Materials",
    gstin: "27AABCT1234A1Z5",
    pan: "AABCT1234A",
    paymentTerms: "Net 30 Days",
    creditLimit: "₹50L",
    address: "18, Industrial Area,\nPune, Maharashtra - 411026",
  },
  {
    id: "V-0041",
    vendor: "Hindustan Zinc",
    contact: "Pradeep Mehta",
    phone: "+91 9876543211",
    email: "pradeep@hzl.com",
    city: "Udaipur",
    category: "Raw Materials",
    gstin: "08AAACH7355K1ZP",
    pan: "AAACH7355K",
    paymentTerms: "Net 30 Days",
    creditLimit: "₹30L",
    address: "Udaipur Industrial Area,\nUdaipur, Rajasthan",
  },
  {
    id: "V-0040",
    vendor: "Sigma Components",
    contact: "Anil Kumar",
    phone: "+91 9876543212",
    email: "anil@sigma.com",
    city: "Pune",
    category: "Components",
    gstin: "27AABCS1234A1Z5",
    pan: "AABCS1234A",
    paymentTerms: "Net 45 Days",
    creditLimit: "₹15L",
    address: "MIDC Industrial Area,\nPune, Maharashtra",
  },
  {
    id: "V-0039",
    vendor: "Brindavan Fasteners",
    contact: "Suresh Nair",
    phone: "+91 9876543213",
    email: "suresh@brindavan.com",
    city: "Coimbatore",
    category: "Hardware",
    gstin: "33AABCB1234A1Z5",
    pan: "AABCB1234A",
    paymentTerms: "Net 30 Days",
    creditLimit: "₹8L",
    address: "Industrial Estate,\nCoimbatore, Tamil Nadu",
  },
  {
    id: "V-0038",
    vendor: "Anand Packaging",
    contact: "Kavita Sharma",
    phone: "+91 9876543214",
    email: "kavita@anandpack.com",
    city: "Delhi",
    category: "Packaging",
    gstin: "07AABCA1234A1Z5",
    pan: "AABCA1234A",
    paymentTerms: "Net 30 Days",
    creditLimit: "₹12L",
    address: "Okhla Industrial Area,\nNew Delhi",
  },
];

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({ value, label, description }) {
  return (
    <div className="rounded-[20px] border border-[#e5e3de] bg-white px-5 py-4">
      <div className="font-serif text-[28px] leading-none tracking-[-0.03em] text-[#151714]">
        {value}
      </div>

      <div className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#9b9b95]">
        {label}
      </div>

      <div className="mt-0.5 text-[13px] text-[#53664a]">
        {description}
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("purchase-orders");

  const [showCreatePO, setShowCreatePO] = useState(false);

  const [purchaseOrders, setPurchaseOrders] = useState([
    {
      id: "PO-2026-0289",
      vendor: "Tata Steel Ltd",
      date: "08 Aug 2026",
      delivery: "15 Aug 2026",
      items: 4,
      value: "₹18,40,000",
      status: "CONFIRMED",
      statusType: "confirmed",
    },
    {
      id: "PO-2026-0288",
      vendor: "Hindustan Zinc",
      date: "06 Aug 2026",
      delivery: "14 Aug 2026",
      items: 2,
      value: "₹9,20,000",
      status: "SENT",
      statusType: "sent",
    },
    {
      id: "PO-2026-0287",
      vendor: "Sigma Components",
      date: "04 Aug 2026",
      delivery: "12 Aug 2026",
      items: 8,
      value: "₹5,60,000",
      status: "IN PROGRESS",
      statusType: "progress",
    },
    {
      id: "PO-2026-0286",
      vendor: "Brindavan Fasteners",
      date: "01 Aug 2026",
      delivery: "09 Aug 2026",
      items: 15,
      value: "₹1,80,000",
      status: "COMPLETED",
      statusType: "completed",
    },
    {
      id: "PO-2026-0285",
      vendor: "Anand Packaging",
      date: "28 Jul 2026",
      delivery: "05 Aug 2026",
      items: 3,
      value: "₹3,40,000",
      status: "CANCELLED",
      statusType: "cancelled",
    },
  ]);

  /* =======================================================
     SAVE NEW PO
     ======================================================= */

  const handleSavePO = (poData) => {
    const newPO = {
      id:
        poData.poNumber ||
        `PO-2026-${String(290 + purchaseOrders.length).padStart(
          4,
          "0"
        )}`,

      vendor: poData.vendor?.vendor || "Unknown Vendor",

      date: poData.poDate || "26 Aug 2026",

      delivery: poData.deliveryDate || "-",

      items: poData.items?.length || 0,

      value: poData.grandTotal
        ? `₹${Number(poData.grandTotal).toLocaleString("en-IN")}`
        : "₹0",

      status: "PENDING APPROVAL",

      statusType: "progress",
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    setShowCreatePO(false);
  };

  return (
    <main className="bg-[#f7f6f2] text-[#171815]">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-[30px]">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#999a94]">
              PROCUREMENT
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              Purchase Management
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <button
              type="button"
              className="rounded-[15px] border border-[#e4e2dc] bg-[#f9f8f5] px-4 py-2 text-[11px] text-[#252622] transition-all duration-200 hover:border-[#c9c7c0] hover:bg-white sm:px-5"
            >
              Export
            </button>

            <button
              type="button"
              onClick={() => setShowCreatePO(true)}
              className="rounded-[15px] bg-[#151714] px-4 py-2 text-[11px] text-white transition-all duration-200 hover:bg-[#292b27] hover:shadow-md sm:px-5"
            >
              + New PO
            </button>

          </div>
        </div>


        {/* KPI */}

        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              {...stat}
            />
          ))}
        </section>


        {/* Tabs */}

        <nav className="mt-7 flex items-center gap-1 overflow-x-auto pb-1">

          {tabs.map((tab) => {

            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  shrink-0
                  rounded-[11px]
                  px-5
                  py-2
                  text-[11px]
                  font-semibold
                  tracking-[0.08em]
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? "bg-white text-[#171815] shadow-[0_2px_5px_rgba(0,0,0,0.12)]"
                      : "text-[#999a94] hover:bg-[#efeee9] hover:text-[#171815]"
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}

        </nav>

      </section>


      {/* =================================================
          PAGE CONTENT
      ================================================= */}

      <section>

        {activeTab === "purchase-orders" && (
          <PurchaseOrders
            purchaseOrders={purchaseOrders}
          />
        )}

        {activeTab === "vendors" && <Vendors />}

        {activeTab === "grn" && <GoodsReceipts />}

        {activeTab === "payables" && <PayablesAging />}

      </section>


      {/* =================================================
          CREATE PO POPUP
      ================================================= */}

      {showCreatePO && (
        <CreatePurchaseOrder
          vendors={vendors}
          onClose={() => setShowCreatePO(false)}
          onSave={handleSavePO}
        />
      )}

    </main>
  );
};

export default Dashboard;