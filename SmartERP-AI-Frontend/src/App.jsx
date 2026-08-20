
import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Package,
  Warehouse,
  ArrowUpFromLine,
  ArrowDownToLine,
ArrowRight,
  RefreshCw,
  LogOut,
  MapPin,
  Boxes,
  AlertTriangle,
  Clock,
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Factory,
  CircleDollarSign,
  UserRound,
  FolderKanban,
  FileText,
  Bot,
  BarChart3,
  Settings,
  Grid2X2,
  ChevronDown,
  Menu,
} from "lucide-react";
const tabs = [
  "Stock",
  "Warehouses",
  "Movements",
  "Replenishment",
];

/* ============================================================
   DATA
============================================================ */

const stockData = [
  {
    sku: "SKU-1042",
    name: "Steel Plate 10mm",
    category: "Raw Material",
    warehouse: "W1 – Main",
    qty: 840,
    minLevel: 200,
    unit: "kg",
    value: "₹4,20,000",
    status: "In Stock",
  },
  {
    sku: "SKU-1041",
    name: "Zinc Ingot",
    category: "Raw Material",
    warehouse: "W1 – Main",
    qty: 120,
    minLevel: 150,
    unit: "kg",
    value: "₹1,80,000",
    status: "Low Stock",
  },
  {
    sku: "SKU-1040",
    name: "M8 Hex Bolts (Box/200)",
    category: "Hardware",
    warehouse: "W2 – Stores",
    qty: 0,
    minLevel: 50,
    unit: "box",
    value: "₹0",
    status: "Out of Stock",
  },
  {
    sku: "SKU-1039",
    name: "Sigma Brackets A4",
    category: "Components",
    warehouse: "W1 – Main",
    qty: 340,
    minLevel: 100,
    unit: "pcs",
    value: "₹2,04,000",
    status: "In Stock",
  },
  {
    sku: "SKU-1038",
    name: "Hydraulic Oil 15W40",
    category: "Consumable",
    warehouse: "W2 – Stores",
    qty: 28,
    minLevel: 40,
    unit: "litre",
    value: "₹11,200",
    status: "Low Stock",
  },
  {
    sku: "SKU-1037",
    name: "Safety Gloves (pair)",
    category: "PPE",
    warehouse: "W2 – Stores",
    qty: 150,
    minLevel: 60,
    unit: "pair",
    value: "₹18,000",
    status: "In Stock",
  },
];
const warehouses = [
  {
    code: "W1",
    name: "Main Warehouse",
    location: "Pune MIDC",
    area: "12,000 sqft",
    capacity: 78,
    skus: 234,
    value: "₹82 L",
  },
  {
    code: "W2",
    name: "Stores",
    location: "Pune MIDC",
    area: "4,000 sqft",
    capacity: 45,
    skus: 86,
    value: "₹18 L",
  },
  {
    code: "W3",
    name: "Finished Goods",
    location: "Pune MIDC",
    area: "8,000 sqft",
    capacity: 62,
    skus: 48,
    value: "₹1.4 Cr",
  },
];

const movements = [
  {
    type: "IN",
    item: "Steel Plate 10mm",
    reference: "GRN-2026-0214",
    source: "Tata Steel Ltd",
    quantity: "+200",
    unit: "kg",
    date: "06 Aug",
  },
  {
    type: "OUT",
    item: "Sigma Brackets A4",
    reference: "WO-2026-0089",
    source: "Work Order",
    quantity: "-60",
    unit: "pcs",
    date: "06 Aug",
  },
  {
    type: "IN",
    item: "M8 Hex Bolts",
    reference: "GRN-2026-0213",
    source: "Brindavan Fasteners",
    quantity: "+100",
    unit: "box",
    date: "04 Aug",
  },
  {
    type: "OUT",
    item: "Steel Plate 10mm",
    reference: "WO-2026-0088",
    source: "Work Order",
    quantity: "-150",
    unit: "kg",
    date: "04 Aug",
  },
  {
    type: "ADJ",
    item: "Hydraulic Oil 15W40",
    reference: "ADJ-2026-019",
    source: "Physical Count",
    quantity: "-5",
    unit: "litre",
    date: "02 Aug",
  },
];
const replenishmentData = [
  {
    sku: "SKU-1041",
    name: "Zinc Ingot",
    current: "120 kg",
    minimum: "150 kg",
    suggested: "200 kg",
    supplier: "Tata Steel Ltd",
    priority: "Low Stock",
  },
  {
    sku: "SKU-1038",
    name: "Hydraulic Oil 15W40",
    current: "28 litre",
    minimum: "40 litre",
    suggested: "60 litre",
    supplier: "Castrol Industrial",
    priority: "Low Stock",
  },
  {
    sku: "SKU-1040",
    name: "M8 Hex Bolts (Box/200)",
    current: "0 box",
    minimum: "50 box",
    suggested: "100 box",
    supplier: "Brindavan Fasteners",
    priority: "Out of Stock",
  },
];
/* ============================================================
   APP
============================================================ */

function App() {
  const [activeModule, setActiveModule] = useState("Dashboard");
  const [activeTab, setActiveTab] = useState("Stock");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredStock = useMemo(() => {
    return stockData.filter((item) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        item.name.toLowerCase().includes(searchText) ||
        item.sku.toLowerCase().includes(searchText) ||
        item.category.toLowerCase().includes(searchText) ||
        item.warehouse.toLowerCase().includes(searchText);

      const matchesFilter =
        filter === "All" || item.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    if (tab !== "Stock") {
      setSearch("");
      setFilter("All");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#171916] flex">

      {/* =====================================================
          SIDEBAR
          KEPT IN THE SAME STRUCTURE
      ====================================================== */}

     {/* =====================================================
    SIDEBAR — ORIGINAL SMARTERP DESIGN
===================================================== */}

<aside className="
  w-[210px]
  min-h-screen
  shrink-0
  bg-[#111410]
  text-white
  flex
  flex-col
  border-r
  border-[#252a25]
  font-mono
">

  {/* =====================================================
      BRAND
  ====================================================== */}
  <div className="
    h-[60px]
    px-[14px]
    flex
    items-center
    justify-between
    border-b
    border-[#292e29]
  ">

    <div className="flex items-center gap-3">

      <div className="
        w-[27px]
        h-[27px]
        rounded-[7px]
        bg-[#d9e5d3]
        text-[#263026]
        flex
        items-center
        justify-center
      ">
        <Grid2X2
          size={13}
          strokeWidth={1.8}
        />
      </div>

      <div className="leading-none">
<div className="
  font-serif
  text-[15px]
  font-medium
  leading-none
  tracking-[-0.02em]
  text-white
">
  SmartERP
</div>

<div className="
  mt-[5px]
  font-mono
  text-[8px]
  leading-none
  tracking-[0.14em]
  text-[#9da59a]
">
  AI
</div>

      </div>

    </div>

    <Menu
      size={16}
      strokeWidth={1.5}
      className="text-[#737a71]"
    />

  </div>


  {/* =====================================================
      COMPANY
  ====================================================== */}
  <div className="px-[10px] pt-[10px]">

    <div className="
      rounded-[10px]
      border
      border-[#2c322d]
      bg-[#1b201c]
      px-[11px]
      py-[10px]
    ">

      <div className="
        text-[7px]
        uppercase
        tracking-[0.15em]
        text-[#737b71]
      ">
        Company
      </div>

<div className="
  mt-[7px]
  font-serif
  text-[12px]
  font-medium
  leading-none
  tracking-[-0.01em]
  text-white
">
  Acme Manufacturing Ltd
</div>
      <div className="
        mt-[4px]
        flex
        items-center
        justify-between
      ">

      <span className="
  font-mono
  text-[8px]
  leading-none
  text-[#929a90]
">
  HQ – Mumbai
</span>

        <ChevronDown
          size={11}
          strokeWidth={1.7}
          className="text-[#747c72]"
        />

      </div>

    </div>

  </div>


  {/* =====================================================
      NAVIGATION
  ====================================================== */}
  <nav className="
    flex-1
    px-[7px]
    pt-[9px]
    overflow-y-auto
  ">

    {/* DASHBOARD */}

   <SidebarItem
  icon={<LayoutDashboard size={13} strokeWidth={1.6} />}
  label="Dashboard"
  active={activeModule === "Dashboard"}
  onClick={() => setActiveModule("Dashboard")}
/>


    {/* MODULES */}

    <SidebarSectionTitle>
      Modules
    </SidebarSectionTitle>


    <SidebarItem
      icon={<Building2 size={12} strokeWidth={1.6} />}
      label="Company Management"
    />

    <SidebarItem
      icon={<Users size={12} strokeWidth={1.6} />}
      label="CRM"
    />

    <SidebarItem
      icon={<ShoppingCart size={12} strokeWidth={1.6} />}
      label="Sales"
    />

    <SidebarItem
      icon={<ShoppingCart size={12} strokeWidth={1.6} />}
      label="Purchase"
    />

    <SidebarItem
  icon={<Package size={12} strokeWidth={1.6} />}
  label="Inventory"
  active={activeModule === "Inventory"}
  onClick={() => setActiveModule("Inventory")}
/>

    <SidebarItem
      icon={<Factory size={12} strokeWidth={1.6} />}
      label="Manufacturing"
    />

    <SidebarItem
      icon={<CircleDollarSign size={12} strokeWidth={1.6} />}
      label="Finance & Accounts"
    />

    <SidebarItem
      icon={<UserRound size={12} strokeWidth={1.6} />}
      label="HR & Payroll"
    />

    <SidebarItem
      icon={<FolderKanban size={12} strokeWidth={1.6} />}
      label="Projects"
    />

    <SidebarItem
      icon={<FileText size={12} strokeWidth={1.6} />}
      label="Documents"
    />


    {/* INTELLIGENCE */}

    <SidebarSectionTitle>
      Intelligence
    </SidebarSectionTitle>


    <SidebarItem
      icon={<Bot size={12} strokeWidth={1.6} />}
      label="AI Assistant"
    />

    <SidebarItem
      icon={<BarChart3 size={12} strokeWidth={1.6} />}
      label="Reports & Analytics"
    />

    <SidebarItem
      icon={<Settings size={12} strokeWidth={1.6} />}
      label="Settings"
    />

  </nav>


  {/* =====================================================
      USER FOOTER
  ====================================================== */}
  <div className="
    h-[58px]
    px-[11px]
    border-t
    border-[#292e29]
    flex
    items-center
    justify-between
  ">

    <div className="flex items-center gap-[9px]">

      <div className="
        w-[26px]
        h-[26px]
        rounded-full
        bg-[#293128]
        border
        border-[#3b4739]
        flex
        items-center
        justify-center
        text-[8px]
        font-medium
        text-[#c0ccb9]
      ">
        AM
      </div>

      <div className="leading-none">

       <div className="
  font-serif
  text-[12px]
  font-medium
  leading-none
  text-white
">
  Arjun Mehta
</div>

        <div className="
  mt-[5px]
  font-mono
  text-[8px]
  leading-none
  text-[#7e877b]
">
  Super Admin
</div>

      </div>

    </div>

    <LogOut
      size={12}
      strokeWidth={1.5}
      className="text-[#697169]"
    />

  </div>

</aside>


      {/* =====================================================
          MAIN
      ====================================================== */}

     <main className="flex-1 min-w-0 min-h-screen overflow-auto bg-[#f5f4ef]">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="h-[72px] bg-[#fbfaf7] border-b border-[#e2e0d8] flex items-center justify-between px-6 lg:px-8">

          <div className="relative w-[275px]">

            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a7aaa2]"
            />

            <input
              type="text"
              placeholder="Search anything..."
              className="
                w-full
                h-10
                pl-9
                pr-12
                rounded-xl
                border
                border-[#deddd5]
                bg-white
                outline-none
                text-[10px]
                placeholder:text-[#aaa]
                focus:border-[#bdbfb7]
              "
            />

            <span className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              text-[8px]
              text-[#aaa]
              border
              border-[#e4e2db]
              rounded-md
              px-1.5
              py-1
            ">
              ⌘K
            </span>

          </div>

        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

<div className="
  w-full
  px-5
  py-4
">
  {/* =================================================
      HEADER
  ================================================= */}

  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

    <div>

      <p className="
  font-mono
  text-[7px]
  uppercase
  tracking-[0.18em]
  text-[#969990]
  mb-2
">
  Inventory Management
</p>
      

      <h1 className="
  font-serif
  text-[24px]
  leading-none
  text-[#20221f]
">
  Inventory Control
</h1>
    

      <p className="mt-3 text-[11px] text-[#969990]">
        {activeTab === "Stock" &&
          "Monitor and manage current inventory stock."}

        {activeTab === "Warehouses" &&
          "Manage warehouse locations, capacity and inventory value."}

        {activeTab === "Movements" &&
          "Track inventory coming into and going out of warehouses."}

        {activeTab === "Replenishment" &&
          "Review items that require restocking."}
      </p>

    </div>

    <div className="flex gap-2">

      <button
        type="button"
        className="
          h-10
          px-5
          rounded-xl
          border
          border-[#deddd5]
          bg-[#fbfaf7]
          text-[10px]
          text-[#555a54]
          hover:bg-white
          transition
        "
      >
        Stock Take
      </button>

      <button
        type="button"
        className="
          h-10
          px-5
          rounded-xl
          bg-[#20231f]
          text-white
          text-[10px]
          flex
          items-center
          gap-2
          hover:bg-[#343731]
          transition
        "
      >
        <Plus size={14} />
        Add Item
      </button>

    </div>

  </div>


  {/* =================================================
      SUMMARY
  ================================================= */}

  <div className="
  grid
  grid-cols-4
  gap-3
  mt-6
">

    <SummaryCard
      icon={<Package size={17} />}
      value="368"
      label="TOTAL SKUs"
      description="Across 3 warehouses"
    />

    <SummaryCard
      icon={<Warehouse size={17} />}
      value="₹2.44 Cr"
      label="STOCK VALUE"
      description="At cost price"
    />

    <SummaryCard
      icon={<AlertTriangle size={17} />}
      value="12"
      label="LOW STOCK ITEMS"
      description="Need reorder"
    />

    <SummaryCard
      icon={<ArrowUpFromLine size={17} />}
      value="3"
      label="OUT OF STOCK"
      description="Urgent action needed"
    />

  </div>


  {/* =================================================
      TABS
  ================================================= */}

 <div className="mt-5 border-b border-[#deddd5]">

    <div className="flex gap-6 overflow-x-auto">

      {tabs.map((tab) => (

        <button
          key={tab}
          type="button"
          onClick={() => handleTabChange(tab)}
          className={`
            relative
            shrink-0
            pb-3.5
            text-[9px]
            uppercase
            tracking-[0.16em]
            transition

            ${
              activeTab === tab
                ? "text-[#20221f] font-medium"
                : "text-[#999d96] hover:text-[#555a54]"
            }
          `}
        >

          {tab}

          {activeTab === tab && (
            <span
              className="
                absolute
                left-0
                right-0
                bottom-0
                h-[2px]
                rounded-full
                bg-[#20231f]
              "
            />
          )}

        </button>

      ))}

    </div>

  </div>


  {/* =================================================
      TAB CONTENT
  ================================================= */}
  <div className="pt-7">

    {activeTab === "Stock" && (
      <StockSection
        filteredStock={filteredStock}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />
    )}

    {activeTab === "Warehouses" && (
      <WarehousesSection />
    )}

    {activeTab === "Movements" && (
      <MovementsSection />
    )}

    {activeTab === "Replenishment" && (
      <ReplenishmentSection />
    )}

  </div>

</div>

</main>

</div>
  );
}
function SidebarSectionTitle({ children }) {
  return (
    <div className="
      px-[10px]
      pt-[14px]
      pb-[6px]
      font-mono
      text-[7px]
      leading-none
      uppercase
      tracking-[0.16em]
      text-[#555d53]
    ">
      {children}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full
        h-[30px]
        px-[10px]
        flex
        items-center
        gap-[8px]
        rounded-[7px]
        text-left
        transition
        ${
          active
            ? "bg-[#293228] text-[#d8e4d2] border border-[#3c4939]"
            : "text-[#7f877d] hover:bg-[#1b211c] hover:text-[#d7ddd4]"
        }
      `}
    >
      <span className="
        w-[13px]
        flex
        items-center
        justify-center
        shrink-0
      ">
        {icon}
      </span>

      <span className="
        font-mono
        text-[9px]
        leading-none
        font-normal
        whitespace-nowrap
      ">
        {label}
      </span>
    </button>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */
function SummaryCard({
  icon,
  value,
  label,
  description,
}) {
  return (
    <div className="
      rounded-xl
      border
      border-[#e2e0d8]
      bg-[#fbfaf7]
      p-4
    ">
      <div className="flex items-center gap-2 text-[#858a82]">
        {icon}

        <span className="
          font-mono
          text-[7px]
          uppercase
          tracking-[0.12em]
        ">
          {label}
        </span>
      </div>

      <div className="
        font-serif
        text-[22px]
        mt-3
        leading-none
      ">
        {value}
      </div>

      <div className="
        font-mono
        text-[7px]
        text-[#999c95]
        mt-2
      ">
        {description}
      </div>
    </div>
  );
}


/* ============================================================
   STOCK SECTION
============================================================ */

function StockSection({
  filteredStock,
  search,
  setSearch,
  filter,
  setFilter,
}) {
  return (
    <section className="
      rounded-2xl
      border
      border-[#e2e0d8]
      bg-[#fbfaf7]
      overflow-hidden
    ">

      <div className="px-5 py-5 border-b border-[#e5e3dc]">

        <div className="
          flex
          flex-col
          xl:flex-row
          xl:items-center
          xl:justify-between
          gap-5
        ">

          <div>

            <h2 className="font-serif text-[21px]">
              Stock
            </h2>

            <p className="mt-1 text-[10px] text-[#969990]">
              Current inventory across all warehouses
            </p>

          </div>


          <div className="flex flex-col sm:flex-row gap-2">

            <div className="relative w-full sm:w-[280px]">

              <Search
                size={14}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-[#a7aaa2]
                "
              />

              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="
                  w-full
                  h-9
                  pl-9
                  pr-3
                  rounded-xl
                  border
                  border-[#deddd5]
                  bg-white
                  outline-none
                  text-[10px]
                  placeholder:text-[#aaa]
                  focus:border-[#bdbfb7]
                "
              />

            </div>


            <div className="flex gap-1.5">

              {[
                "All",
                "In Stock",
                "Low Stock",
                "Out of Stock",
              ].map((item) => (

                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`
                    h-9
                    px-3
                    rounded-xl
                    border
                    text-[8px]
                    whitespace-nowrap
                    transition

                    ${
                      filter === item
                        ? "bg-[#ecebe5] border-[#d7d5cc] text-[#20221f]"
                        : "bg-white border-[#deddd5] text-[#777c74] hover:bg-[#f1f0eb]"
                    }
                  `}
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

        </div>

      </div>


      <div className="overflow-x-auto">

        <table className="w-full min-w-[1000px] border-collapse">

          <thead>

            <tr className="bg-[#f5f4ef] border-b border-[#e1dfd7]">

              <TableHeader>SKU</TableHeader>
              <TableHeader>ITEM NAME</TableHeader>
              <TableHeader>CATEGORY</TableHeader>
              <TableHeader>WAREHOUSE</TableHeader>
              <TableHeader>QTY</TableHeader>
              <TableHeader>MIN LEVEL</TableHeader>
              <TableHeader>UNIT</TableHeader>
              <TableHeader>VALUE</TableHeader>
              <TableHeader>STATUS</TableHeader>

            </tr>

          </thead>

          <tbody>

            {filteredStock.map((item) => (
              <StockRow
                key={item.sku}
                item={item}
              />
            ))}

          </tbody>

        </table>


        {filteredStock.length === 0 && (
          <div className="py-14 text-center text-[11px] text-[#999c95]">
            No stock items found.
          </div>
        )}

      </div>

    </section>
  );
}


/* ============================================================
   STOCK ROW
============================================================ */

function StockRow({ item }) {

  const statusStyle = {
    "In Stock": "bg-[#e1ebdf] text-[#3d5940]",
    "Low Stock": "bg-[#ece8dc] text-[#746a4d]",
    "Out of Stock": "bg-[#eadfdd] text-[#76534f]",
  };

  return (
    <tr className="
      border-b
      border-[#e5e3dc]
      last:border-0
      hover:bg-[#f8f7f2]
      transition
    ">

      <td className="px-5 py-5">

        <span className="font-mono text-[9px] text-[#8f928b]">
          {item.sku}
        </span>

      </td>


      <td className="px-5 py-5 min-w-[190px]">

        <div className="font-serif text-[14px]">
          {item.name}
        </div>

      </td>


      <td className="px-5 py-5">

        <span className="
          inline-flex
          px-2.5
          py-1
          rounded-md
          bg-[#f0efea]
          border
          border-[#e1dfd7]
          text-[8px]
          text-[#777a73]
          whitespace-nowrap
        ">
          {item.category}
        </span>

      </td>


      <td className="px-5 py-5">

        <span className="text-[9px] text-[#777b73] whitespace-nowrap">
          {item.warehouse}
        </span>

      </td>


      <td className="px-5 py-5">

        <span className="font-mono text-[10px] font-medium">
          {item.qty}
        </span>

      </td>


      <td className="px-5 py-5">

        <span className="font-mono text-[9px] text-[#8d9088]">
          {item.minLevel}
        </span>

      </td>


      <td className="px-5 py-5">

        <span className="text-[9px] text-[#777a73]">
          {item.unit}
        </span>

      </td>


      <td className="px-5 py-5">

        <span className="
          font-mono
          text-[10px]
          font-medium
          whitespace-nowrap
        ">
          {item.value}
        </span>

      </td>


      <td className="px-5 py-5">

        <span
          className={`
            inline-flex
            px-3
            py-1.5
            rounded-full
            text-[7px]
            uppercase
            font-medium
            whitespace-nowrap
            ${statusStyle[item.status]}
          `}
        >
          {item.status}
        </span>

      </td>

    </tr>
  );
}


/* ============================================================
   WAREHOUSES
============================================================ */
function WarehousesSection() {
  return (
    <div className="w-full">

      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between">

        <div>
          <h2 className="font-serif text-[20px] text-[#20221f]">
            Warehouses
          </h2>

          <p className="mt-1 font-mono text-[10px] text-[#969990]">
            Manage warehouse capacity and inventory distribution
          </p>
        </div>

        <div className="
          flex
          items-center
          gap-2
          font-mono
          text-[9px]
          uppercase
          tracking-[0.12em]
          text-[#8d9189]
        ">
          <Warehouse size={14} strokeWidth={1.7} />
          <span>{warehouses.length} Locations</span>
        </div>

      </div>


      {/* WAREHOUSE CARDS */}
      <div className="
        grid
        grid-cols-1
        gap-4
        md:grid-cols-2
        xl:grid-cols-3
      ">

        {warehouses.map((warehouse) => (
          <WarehouseCard
            key={warehouse.code}
            warehouse={warehouse}
          />
        ))}

      </div>

    </div>
  );
}


function WarehouseCard({ warehouse }) {
  return (
    <article
      className="
        rounded-2xl
        border
        border-[#e2e0d8]
        bg-[#fbfaf7]
        p-5
        transition-all
        duration-200
        hover:border-[#cfcfc5]
        hover:shadow-[0_8px_25px_rgba(30,35,28,0.05)]
      "
    >

      {/* TOP */}
      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="
            font-mono
            text-[8px]
            font-medium
            uppercase
            tracking-[0.16em]
            text-[#9a9d95]
          ">
            {warehouse.code}
          </p>

          <h3 className="
            mt-0.5
            font-serif
            text-[19px]
            leading-tight
            text-[#222420]
          ">
            {warehouse.name}
          </h3>

        </div>


        {/* STATUS */}
        <span className="
          rounded-md
          bg-[#e3ebdf]
          px-2.5
          py-1.5
          font-mono
          text-[8px]
          font-medium
          uppercase
          tracking-[0.08em]
          text-[#60735b]
        ">
          Active
        </span>

      </div>


      {/* LOCATION */}
      <div className="
        mt-2
        flex
        items-center
        gap-2
        font-mono
        text-[9px]
        text-[#858980]
      ">

        <MapPin
          size={11}
          strokeWidth={1.7}
        />

        <span>
          {warehouse.location}
        </span>

        <span className="text-[#c3c4be]">
          ·
        </span>

        <span>
          {warehouse.area}
        </span>

      </div>


      {/* CAPACITY */}
      <div className="mt-6">

        <div className="flex items-center justify-between">

          <span className="
            font-mono
            text-[9px]
            uppercase
            tracking-[0.1em]
            text-[#92958d]
          ">
            Capacity used
          </span>

          <span className="
            font-mono
            text-[10px]
            font-medium
            text-[#4f544c]
          ">
            {warehouse.capacity}%
          </span>

        </div>


        {/* PROGRESS BAR */}
        <div className="
          mt-2
          h-[6px]
          w-full
          overflow-hidden
          rounded-full
          bg-[#e9e8e1]
        ">

          <div
            className="
              h-full
              rounded-full
              bg-[#91a985]
              transition-all
              duration-500
            "
            style={{
              width: `${warehouse.capacity}%`,
            }}
          />

        </div>

      </div>


      {/* STATS */}
      <div className="mt-5 grid grid-cols-2 gap-2">

        {/* SKUS */}
        <div className="
          rounded-xl
          border
          border-[#e4e2da]
          bg-[#f4f3ee]
          px-3.5
          py-3
        ">

          <span className="
            font-mono
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-[#999c94]
          ">
            SKUs
          </span>

          <p className="
            mt-1.5
            font-serif
            text-[22px]
            leading-none
            text-[#252723]
          ">
            {warehouse.skus}
          </p>

        </div>


        {/* VALUE */}
        <div className="
          rounded-xl
          border
          border-[#e4e2da]
          bg-[#f4f3ee]
          px-3.5
          py-3
        ">

          <span className="
            font-mono
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-[#999c94]
          ">
            Value
          </span>

          <p className="
            mt-1.5
            font-serif
            text-[22px]
            leading-none
            text-[#252723]
          ">
            {warehouse.value}
          </p>

        </div>

      </div>

    </article>
  );
}




/* ============================================================
   MOVEMENTS */

function MovementsSection() {
  return (
    <section className="rounded-2xl border border-[#e2e0d8] bg-[#fbfaf7] overflow-hidden">

      {/* TITLE */}
      <div className="px-5 py-4 border-b border-[#e5e3dc]">
        <h2 className="font-serif text-[18px] text-[#20221f]">
          Stock Movements
        </h2>
      </div>

      {/* MOVEMENTS */}
      <div>
        {movements.map((movement) => (
          <MovementRow
            key={movement.reference}
            movement={movement}
          />
        ))}
      </div>

    </section>
  );
}


function MovementRow({ movement }) {
  const typeStyle = {
    IN: "bg-[#e1ebdf] text-[#58705a]",
    OUT: "bg-[#eadfdd] text-[#85615c]",
    ADJ: "bg-[#e7e7ed] text-[#666879]",
  };

  return (
    <div className="
      min-h-[59px]
      px-4
      sm:px-5
      py-3
      border-b
      border-[#e5e3dc]
      last:border-b-0
      flex
      items-center
      gap-3
      hover:bg-[#f8f7f2]
      transition
    ">

      {/* TYPE */}
      <div className={`
        w-[28px]
        h-[27px]
        shrink-0
        rounded-[7px]
        flex
        items-center
        justify-center
        font-mono
        text-[7px]
        font-medium
        ${typeStyle[movement.type]}
      `}>
        {movement.type}
      </div>


      {/* ITEM */}
      <div className="min-w-0 flex-1">

        <div className="flex items-center gap-2 min-w-0">

          <span className="
            font-serif
            text-[14px]
            text-[#20221f]
            truncate
          ">
            {movement.item}
          </span>

          <span className="
            hidden
            sm:block
            font-mono
            text-[8px]
            text-[#a0a29b]
            whitespace-nowrap
          ">
            {movement.reference}
          </span>

        </div>

        <div className="
          mt-1
          font-mono
          text-[8px]
          text-[#999c95]
        ">
          {movement.source}
        </div>

      </div>


      {/* QUANTITY */}
      <div className="
        shrink-0
        text-right
        whitespace-nowrap
      ">

        <span className={`
          font-mono
          text-[11px]
          ${movement.type === "OUT"
            ? "text-[#8a5550]"
            : movement.type === "IN"
              ? "text-[#4e6750]"
              : "text-[#666879]"
          }
        `}>
          {movement.quantity}
        </span>

        <span className="
          ml-1
          font-mono
          text-[9px]
          text-[#777b73]
        ">
          {movement.unit}
        </span>

      </div>


      {/* DATE */}
      <div className="
        w-[42px]
        shrink-0
        text-right
        font-mono
        text-[8px]
        text-[#aaa99f]
      ">
        {movement.date}
      </div>

    </div>
  );
}
/* ============================================================
   REPLENISHMENT
============================================================ */

function ReplenishmentSection() {
  return (
    <div className="space-y-6">

      <div className="
        rounded-2xl
        bg-[#20231f]
        text-white
        px-6
        py-6
      ">

        <div className="flex items-start gap-4">

          <div className="
            w-11
            h-11
            shrink-0
            rounded-xl
            bg-[#dce5d8]
            text-[#303b2e]
            flex
            items-center
            justify-center
          ">
            <RefreshCw size={18} />
          </div>

          <div>

            <h2 className="font-serif text-[21px]">
              AI Reorder Recommendations
            </h2>

            <p className="mt-1 font-mono text-[9px] text-[#aeb5aa]">
              Based on current stock levels, consumption and reorder thresholds.
            </p>

          </div>

        </div>

      </div>


      <section className="
        rounded-2xl
        border
        border-[#e2e0d8]
        bg-[#fbfaf7]
        overflow-hidden
      ">

        <div className="
          px-6
          py-5
          border-b
          border-[#e5e3dc]
        ">

          <h2 className="font-serif text-[20px]">
            Items Requiring Replenishment
          </h2>

          <p className="text-[10px] text-[#969990] mt-1">
            Review low-stock and out-of-stock items before creating purchase orders.
          </p>

        </div>


        <div className="divide-y divide-[#e5e3dc]">

          {replenishmentData.map((item) => (
            <ReplenishmentRow
              key={item.sku}
              item={item}
            />
          ))}

        </div>

      </section>

    </div>
  );
}


/* ============================================================
   REPLENISHMENT ROW
============================================================ */

function ReplenishmentRow({ item }) {

  const isOutOfStock =
    item.priority === "Out of Stock";

  return (
    <div className="
      px-6
      py-6
      hover:bg-[#f8f7f2]
      transition
    ">

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-[1.7fr_1fr_1fr_1.2fr_auto]
        gap-6
        items-center
      ">

        <div className="flex items-center gap-4">

          <div
            className={`
              w-10
              h-10
              rounded-xl
              flex
              items-center
              justify-center

              ${
                isOutOfStock
                  ? "bg-[#eadfdd] text-[#76534f]"
                  : "bg-[#ece8dc] text-[#746a4d]"
              }
            `}
          >
            <AlertTriangle size={16} />
          </div>

          <div>

            <div className="font-serif text-[15px]">
              {item.name}
            </div>

            <div className="font-mono text-[8px] text-[#999c95] mt-1">
              {item.sku}
            </div>

          </div>

        </div>


        <div>

          <div className="
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-[#a0a29b]
          ">
            Current
          </div>

          <div className="font-mono text-[11px] mt-1">
            {item.current}
          </div>

        </div>


        <div>

          <div className="
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-[#a0a29b]
          ">
            Minimum
          </div>

          <div className="font-mono text-[11px] mt-1">
            {item.minimum}
          </div>

        </div>


        <div>

          <div className="
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-[#a0a29b]
          ">
            Suggested Order
          </div>

          <div className="font-mono text-[11px] font-medium mt-1">
            {item.suggested}
          </div>

          <div className="text-[8px] text-[#999c95] mt-1">
            {item.supplier}
          </div>

        </div>


        <button
          type="button"
          onClick={() =>
            alert(`Purchase Order created for ${item.name}`)
          }
          className="
            h-9
            px-4
            rounded-xl
            bg-[#20231f]
            text-white
            text-[9px]
            hover:bg-[#343731]
            transition
            whitespace-nowrap
          "
        >
          Create PO →
        </button>

      </div>

    </div>
  );
}


/* ============================================================
   MINI CARD
============================================================ */

function MiniCard({
  icon,
  label,
  value,
  detail,
}) {
  return (
    <div className="
      rounded-2xl
      border
      border-[#e2e0d8]
      bg-[#fbfaf7]
      p-5
    ">

      <div className="flex items-center gap-2 text-[#858a82]">

        {icon}

     <span className="
  font-mono
  text-[9px]
  font-normal
  tracking-[0.01em]
  whitespace-nowrap
">
  {label}
</span>

      </div>

      <div className="font-serif text-[27px] mt-4">
        {value}
      </div>

      <div className="text-[9px] text-[#999c95] mt-1">
        {detail}
      </div>

    </div>
  );
}


/* ============================================================
   TABLE HEADER
============================================================ */

function TableHeader({ children }) {
  return (
    <th className="text-left px-5 py-3.5 text-[7px] font-medium tracking-[0.15em] text-[#9b9d96] uppercase whitespace-nowrap">
      {children}
    </th>
  );
}

export default App;