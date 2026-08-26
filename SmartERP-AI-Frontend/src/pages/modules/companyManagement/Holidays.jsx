import { useEffect, useState } from "react";
import CompanyManagementService from "../../../core/services/modules/companyManagement.service";
import useActiveCompany from "../../../core/hooks/useActiveCompany";

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_HOLIDAYS = [
  { id: 1,  name: "Republic Day",     date: "26 Jan 2026", day: "Monday",    type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 2,  name: "Holi",             date: "04 Mar 2026", day: "Wednesday", type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 3,  name: "Gudi Padwa",       date: "19 Mar 2026", day: "Thursday",  type: "Regional Holiday", appliesTo: "Pune, Mumbai",   optional: "No",  status: "Active" },
  { id: 4,  name: "Good Friday",      date: "03 Apr 2026", day: "Friday",    type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 5,  name: "Independence Day", date: "15 Aug 2026", day: "Saturday",  type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 6,  name: "Diwali",           date: "08 Nov 2026", day: "Sunday",    type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 7,  name: "Christmas",        date: "25 Dec 2026", day: "Friday",    type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
  { id: 8,  name: "Eid ul-Fitr",      date: "31 Mar 2026", day: "Tuesday",   type: "Optional Holiday", appliesTo: "All Branches",   optional: "Yes", status: "Active" },
  { id: 9,  name: "Ganesh Chaturthi", date: "19 Aug 2026", day: "Wednesday", type: "Company Holiday",  appliesTo: "Mumbai Office",  optional: "No",  status: "Active" },
  { id: 10, name: "Dussehra",         date: "23 Oct 2026", day: "Friday",    type: "Public Holiday",   appliesTo: "All Branches",   optional: "No",  status: "Active" },
];

const TYPE_COLORS = {
  "Public Holiday":   "bg-[#e8f5e2] text-[#3d7030]",
  "Regional Holiday": "bg-[#fff3e0] text-[#8a5800]",
  "Optional Holiday": "bg-[#f0edff] text-[#5b4aad]",
  "Company Holiday":  "bg-[#e3f2fd] text-[#1565c0]",
};

const PER_PAGE = 7;

// ─── Action menu ──────────────────────────────────────────────────────────────
function ActionMenu({ onClose }) {
  return (
    <div className="absolute right-0 top-7 z-50 w-36 bg-white border border-[#e4e1d8] rounded-xl shadow-lg py-1 text-[12px]">
      <button onClick={onClose} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#f5f4ef] text-[#3a3a30]">
        <span>👁</span> View Details
      </button>
      <button onClick={onClose} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#f5f4ef] text-[#3a3a30]">
        <span>✏️</span> Edit
      </button>
      <button onClick={onClose} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#f5f4ef] text-[#3a3a30]">
        <span>📋</span> Duplicate
      </button>
      <button onClick={onClose} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#f5f4ef] text-[#3a3a30]">
        <span>⊘</span> Disable
      </button>
      <div className="border-t border-[#e4e1d8] my-1" />
      <button onClick={onClose} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#fff0f0] text-[#c0392b]">
        <span>🗑</span> Delete
      </button>
    </div>
  );
}

// ─── Add Holiday Modal ────────────────────────────────────────────────────────
const TYPES     = ["Public Holiday", "Regional Holiday", "Optional Holiday", "Company Holiday"];
const BRANCHES  = ["All Branches", "Mumbai Office", "Pune, Mumbai", "Delhi Office", "Bengaluru Branch"];

function AddHolidayModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", date: "", type: "", branch: "All Branches", optional: "No", status: "Active" });
  const [errors, setErrors] = useState({});
  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: "" })); };

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.date)        e.date = "Required";
    if (!form.type)        e.type = "Required";
    if (Object.keys(e).length) { setErrors(e); return; }
    const d = new Date(form.date);
    const dayName = d.toLocaleDateString("en-GB", { weekday: "long" });
    const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
    onAdd({ ...form, day: dayName, date: dateStr });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(16,19,15,0.45)] flex items-center justify-center z-50 p-5"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#f5f4ef] border border-[#e1dfd8] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-[#e1dfd8] bg-[#f5f4ef]">
          <div>
            <h2 className="text-[18px] font-bold text-[#10130f] mb-1">Add Holiday</h2>
            <p className="text-[12px] text-[#99988f]">Add a new holiday to the organization calendar.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white border border-[#e1dfd8] rounded-[9px] text-[#7a7970] text-[14px] grid place-items-center hover:bg-[#ece9e0]">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">

          {/* Holiday Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#4a4a40]">Holiday Name <span className="text-[#c0392b]">*</span></label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Independence Day"
              className={`w-full px-3 py-[10px] border rounded-[10px] text-[13px] bg-[#faf9f5] outline-none text-[#10130f] placeholder-[#b8b5ad] transition ${errors.name ? "border-[#c0392b]" : "border-[#e0ddd5] focus:border-[#10130f]"}`} />
            {errors.name && <span className="text-[11px] text-[#c0392b]">{errors.name}</span>}
          </div>

          {/* Date + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#4a4a40]">Date <span className="text-[#c0392b]">*</span></label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className={`w-full px-3 py-[10px] border rounded-[10px] text-[13px] bg-[#faf9f5] outline-none text-[#10130f] transition ${errors.date ? "border-[#c0392b]" : "border-[#e0ddd5] focus:border-[#10130f]"}`} />
              {errors.date && <span className="text-[11px] text-[#c0392b]">{errors.date}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#4a4a40]">Holiday Type <span className="text-[#c0392b]">*</span></label>
              <div className="relative">
                <select value={form.type} onChange={e => set("type", e.target.value)}
                  className={`w-full px-3 py-[10px] pr-8 border rounded-[10px] text-[13px] bg-[#faf9f5] outline-none appearance-none text-[#10130f] transition ${errors.type ? "border-[#c0392b]" : "border-[#e0ddd5] focus:border-[#10130f]"}`}>
                  <option value="">Select type</option>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9890] text-[11px] pointer-events-none">▾</span>
              </div>
              {errors.type && <span className="text-[11px] text-[#c0392b]">{errors.type}</span>}
            </div>
          </div>

          {/* Branch + Optional */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#4a4a40]">Applies To</label>
              <div className="relative">
                <select value={form.branch} onChange={e => set("branch", e.target.value)}
                  className="w-full px-3 py-[10px] pr-8 border border-[#e0ddd5] rounded-[10px] text-[13px] bg-[#faf9f5] outline-none appearance-none text-[#10130f] focus:border-[#10130f] transition">
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9890] text-[11px] pointer-events-none">▾</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#4a4a40]">Optional</label>
              <div className="relative">
                <select value={form.optional} onChange={e => set("optional", e.target.value)}
                  className="w-full px-3 py-[10px] pr-8 border border-[#e0ddd5] rounded-[10px] text-[13px] bg-[#faf9f5] outline-none appearance-none text-[#10130f] focus:border-[#10130f] transition">
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9890] text-[11px] pointer-events-none">▾</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#4a4a40]">Status</label>
            <div className="flex gap-2">
              {["Active", "Inactive"].map(s => (
                <label key={s} className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer text-[12px] transition select-none
                  ${form.status === s ? (s === "Active" ? "border-[#7dba6a] bg-[#f2faf0] text-[#2e6e22]" : "border-[#e1dfd8] bg-[#faf9f5] text-[#555]") : "border-[#e1dfd8] bg-[#faf9f5] text-[#555]"}`}>
                  <input type="radio" name="hol-status" className="hidden" checked={form.status === s} onChange={() => set("status", s)} />
                  <span className={`w-2 h-2 rounded-full ${s === "Active" ? "bg-[#3d8a30]" : "bg-[#b0b0a8]"}`} />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-[#e1dfd8] bg-[#f5f4ef]">
          <button onClick={onClose} className="h-9 px-5 border border-[#e0ddd5] rounded-xl bg-white text-[#20221e] text-[12px] font-medium hover:bg-[#ece9e0] transition">Cancel</button>
          <button onClick={submit} className="h-9 px-5 bg-[#111410] text-white border-none rounded-xl text-[12px] font-medium hover:bg-[#1e2419] transition">+ Add Holiday</button>
        </div>
      </div>
    </div>
  );
}

// ─── Holidays page ────────────────────────────────────────────────────────────
export default function Holidays({ companyId: providedCompanyId, dashboard: providedDashboard }) {
  const activeCompany = useActiveCompany(providedCompanyId);
  const companyId = providedCompanyId || activeCompany.companyId;
  const dashboard = providedDashboard || activeCompany.dashboard;
  const [holidays,    setHolidays]    = useState(MOCK_HOLIDAYS);
  const [search,      setSearch]      = useState("");
  const [yearFilter,  setYearFilter]  = useState("2026");
  const [typeFilter,  setTypeFilter]  = useState("All Types");
  const [branchFilter,setBranchFilter]= useState("All Branches");
  const [statusFilter,setStatusFilter]= useState("Active");
  const [view,        setView]        = useState("list");   // "list" | "calendar"
  const [page,        setPage]        = useState(1);
  const [openMenu,    setOpenMenu]    = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!companyId) {
      setHolidays([]);
      return;
    }
    CompanyManagementService.getHolidays(companyId, { year: yearFilter })
      .then(({ data }) => {
        setHolidays(data.map((holiday) => ({
          ...holiday,
          status: holiday.status.charAt(0) + holiday.status.slice(1).toLowerCase(),
        })));
        setError("");
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || "Unable to load holidays."));
  }, [companyId, yearFilter]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total     = holidays.length;
  const publicH   = holidays.filter(h => h.type === "Public Holiday").length;
  const optional  = holidays.filter(h => h.optional === "Yes").length;
  const company   = holidays.filter(h => h.type === "Company Holiday").length;
  const upcoming  = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date)).find(h => new Date(h.date) >= new Date());

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = holidays.filter(h => {
    const q = search.toLowerCase();
    const matchSearch  = !q || h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q);
    const matchType    = typeFilter === "All Types" || h.type === typeFilter;
    const matchBranch  = branchFilter === "All Branches" || h.appliesTo.includes(branchFilter);
    const matchStatus  = statusFilter === "All" || h.status === statusFilter;
    return matchSearch && matchType && matchBranch && matchStatus;
  });

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const addHoliday = async (form) => {
    try {
      const { data } = await CompanyManagementService.createHoliday(companyId, {
        name: form.name,
        date: form.date,
        type: form.type,
        appliesTo: form.branch,
        optional: form.optional,
        status: form.status.toUpperCase(),
      });
      setHolidays((current) => [...current, {
        ...data,
        status: data.status.charAt(0) + data.status.slice(1).toLowerCase(),
      }]);
      setShowModal(false);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to create the holiday.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f5f4ef] px-7 pb-12 pt-1">

      {(error || activeCompany.error) && <div className="mb-3 px-4 py-2.5 border border-[#dfd8c9] rounded-xl bg-[#fffaf0] text-[#6b5b3e] text-xs">{error || activeCompany.error}</div>}

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-[10px] text-[#a3a6a5] mb-3 tracking-wide">
        <span>ADMINISTRATION</span><span>›</span>
        <span>COMPANY MANAGEMENT</span><span>›</span>
        <span className="text-[#10130f] font-semibold">HOLIDAYS</span>
      </div>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold text-[#10130f] leading-tight">Holidays</h1>
          <p className="text-[12px] text-[#99988f] mt-1">Manage public, company and optional holidays for your organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-4 bg-white border border-[#e0ddd5] rounded-xl text-[12px] text-[#20221e] font-medium flex items-center gap-2 hover:bg-[#f0efe9] transition">
            <span>↑</span> Export
          </button>
          <button className="h-9 px-4 bg-white border border-[#e0ddd5] rounded-xl text-[12px] text-[#20221e] font-medium flex items-center gap-2 hover:bg-[#f0efe9] transition">
            <span>↓</span> Import Holidays
          </button>
          <button onClick={() => setShowModal(true)}
            className="h-9 px-4 bg-[#111410] text-white border-none rounded-xl text-[12px] font-medium flex items-center gap-2 hover:bg-[#1e2419] transition">
            + Add Holiday
          </button>
        </div>
      </div>

      {/* ── Company summary bar ── */}
      <div className="bg-white border border-[#e1dfd8] rounded-2xl flex items-center justify-between px-5 py-4 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#111410] grid grid-cols-2 gap-1 p-2.5 flex-shrink-0">
            {[0,1,2,3].map(i => <span key={i} className={`rounded-[3px] ${i===0?"bg-[#a1b294]":i===2?"bg-[#343a31]":"bg-[#4e574b]"}`} />)}
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#10130f]">{dashboard?.company?.companyName || "Company"}</h2>
            <p className="text-[10px] text-[#99988f] mt-0.5">GST: {dashboard?.company?.gstNumber || "—"} · PAN: {dashboard?.company?.pan || "—"} · CIN: {dashboard?.company?.cin || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          {[[dashboard?.branches ?? 0,"BRANCHES"],[dashboard?.employees ?? 0,"EMPLOYEES"],[dashboard?.departments ?? 0,"DEPARTMENTS"],[dashboard?.plan || "—","PLAN"]].map(([v,l]) => (
            <div key={l} className="text-center">
              <div className="text-[18px] font-semibold text-[#10130f]">{v}</div>
              <div className="text-[9px] text-[#a0a09a] tracking-widest mt-0.5">{l}</div>
            </div>
          ))}
          <span className="bg-[#edf2e8] text-[#63755c] text-[9px] font-semibold px-3 py-1.5 rounded-xl tracking-wide">ACTIVE</span>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { icon: "📅", color: "text-blue-500",   bg: "bg-blue-50",   value: total,    label: "Total Holidays" },
          { icon: "🏛",  color: "text-green-600",  bg: "bg-green-50",  value: publicH,  label: "Public Holidays" },
          { icon: "⭐",  color: "text-orange-400", bg: "bg-orange-50", value: optional, label: "Optional Holidays" },
          { icon: "💼",  color: "text-purple-500", bg: "bg-purple-50", value: company,  label: "Company Holidays" },
          {
            icon: "🕐", color: "text-cyan-600", bg: "bg-cyan-50",
            value: upcoming ? upcoming.date : "—",
            label: "Upcoming Holiday",
            sub:   upcoming ? upcoming.name : "",
            wide:  true,
          },
        ].map(({ icon, color, bg, value, label, sub, wide }) => (
          <div key={label} className={`bg-white border border-[#e1dfd8] rounded-2xl px-4 py-3 flex items-center gap-3 ${wide ? "col-span-1" : ""}`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-[17px] flex-shrink-0`}>{icon}</div>
            <div>
              <div className={`text-[20px] font-bold ${wide ? "text-[14px]" : ""} text-[#10130f] leading-tight`}>{value}</div>
              <div className="text-[9px] text-[#a0a09a] tracking-wide uppercase mt-0.5">{label}</div>
              {sub && <div className="text-[10px] text-[#60706a] mt-0.5">{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters + View toggle ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Year */}
        <div className="relative">
          <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-7 border border-[#e0ddd5] rounded-xl bg-white text-[12px] text-[#10130f] outline-none appearance-none cursor-pointer">
            {["2024","2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9890] text-[10px] pointer-events-none">▾</span>
          <span className="absolute left-3 -top-2.5 text-[9px] text-[#a0a09a] bg-white px-0.5">Year</span>
        </div>

        {/* Holiday Type */}
        <div className="relative">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-7 border border-[#e0ddd5] rounded-xl bg-white text-[12px] text-[#10130f] outline-none appearance-none cursor-pointer min-w-[120px]">
            {["All Types", ...TYPES].map(t => <option key={t}>{t}</option>)}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9890] text-[10px] pointer-events-none">▾</span>
          <span className="absolute left-3 -top-2.5 text-[9px] text-[#a0a09a] bg-white px-0.5">Holiday Type</span>
        </div>

        {/* Branch */}
        <div className="relative">
          <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-7 border border-[#e0ddd5] rounded-xl bg-white text-[12px] text-[#10130f] outline-none appearance-none cursor-pointer min-w-[120px]">
            {["All Branches", ...BRANCHES.slice(1)].map(b => <option key={b}>{b}</option>)}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9890] text-[10px] pointer-events-none">▾</span>
          <span className="absolute left-3 -top-2.5 text-[9px] text-[#a0a09a] bg-white px-0.5">Branch</span>
        </div>

        {/* Status */}
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 pl-3 pr-7 border border-[#e0ddd5] rounded-xl bg-white text-[12px] text-[#10130f] outline-none appearance-none cursor-pointer">
            {["Active", "Inactive", "All"].map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9890] text-[10px] pointer-events-none">▾</span>
          <span className="absolute left-3 -top-2.5 text-[9px] text-[#a0a09a] bg-white px-0.5">Status</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 h-9 px-3 bg-white border border-[#e0ddd5] rounded-xl flex-1 min-w-[180px]">
          <span className="text-[#b0b4b3] text-[14px]">⌕</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search holiday..." className="flex-1 text-[12px] outline-none bg-transparent text-[#10130f] placeholder-[#b8b5ad]" />
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center border border-[#e0ddd5] rounded-xl overflow-hidden bg-white">
          <button onClick={() => setView("list")}
            className={`h-9 px-4 text-[12px] font-medium flex items-center gap-1.5 transition ${view === "list" ? "bg-[#111410] text-white" : "text-[#70746f] hover:bg-[#f5f4ef]"}`}>
            ☰ List View
          </button>
          <button onClick={() => setView("calendar")}
            className={`h-9 px-4 text-[12px] font-medium flex items-center gap-1.5 transition ${view === "calendar" ? "bg-[#111410] text-white" : "text-[#70746f] hover:bg-[#f5f4ef]"}`}>
            📅 Calendar View
          </button>
        </div>
      </div>

      {/* ── List view ── */}
      {view === "list" && (
        <div className="bg-white border border-[#e1dfd8] rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1.4fr_1.4fr_0.7fr_0.8fr_0.6fr] px-5 py-3 border-b border-[#e4e1d8] bg-[#faf9f5]">
            {["HOLIDAY NAME","DATE","DAY","TYPE","APPLIES TO","OPTIONAL","STATUS","ACTION"].map(h => (
              <div key={h} className="text-[9px] font-semibold text-[#a3a6a5] tracking-widest">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {paginated.map(h => (
            <div key={h.id} className="grid grid-cols-[2fr_1.2fr_1fr_1.4fr_1.4fr_0.7fr_0.8fr_0.6fr] px-5 py-[14px] border-b border-[#f0ede6] last:border-0 hover:bg-[#faf9f5] transition items-center">
              <div className="text-[13px] font-medium text-[#10130f]">{h.name}</div>
              <div className="text-[12px] text-[#555]">{h.date}</div>
              <div className="text-[12px] text-[#555]">{h.day}</div>
              <div>
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${TYPE_COLORS[h.type] || "bg-gray-100 text-gray-600"}`}>{h.type}</span>
              </div>
              <div className="text-[12px] text-[#555]">{h.appliesTo}</div>
              <div className="text-[12px] text-[#555]">{h.optional}</div>
              <div>
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${h.status === "Active" ? "bg-[#e8f0e4] text-[#3d6630]" : "bg-[#f0ede6] text-[#7a7060]"}`}>{h.status}</span>
              </div>
              <div className="relative flex justify-end">
                <button onClick={() => setOpenMenu(openMenu === h.id ? null : h.id)}
                  className="w-7 h-7 flex flex-col items-center justify-center gap-[3px] rounded-lg hover:bg-[#f0efe9] transition">
                  {[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-[#9a9890] rounded-full" />)}
                </button>
                {openMenu === h.id && <ActionMenu onClose={() => setOpenMenu(null)} />}
              </div>
            </div>
          ))}

          {!paginated.length && (
            <div className="py-14 text-center text-[13px] text-[#a0a09a]">No holidays found.</div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#e4e1d8] bg-[#faf9f5]">
            <span className="text-[11px] text-[#9a9890]">
              Showing {filtered.length ? (page - 1) * PER_PAGE + 1 : 0} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} holidays
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select className="h-8 pl-3 pr-7 border border-[#e0ddd5] rounded-lg bg-white text-[11px] outline-none appearance-none cursor-pointer text-[#10130f]">
                  <option>10 per page</option>
                  <option>25 per page</option>
                  <option>50 per page</option>
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9890] text-[10px] pointer-events-none">▾</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 border border-[#e0ddd5] rounded-lg text-[12px] text-[#555] bg-white hover:bg-[#f0efe9] disabled:opacity-40 transition">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 border rounded-lg text-[12px] font-medium transition ${n === page ? "bg-[#111410] text-white border-[#111410]" : "bg-white border-[#e0ddd5] text-[#555] hover:bg-[#f0efe9]"}`}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 border border-[#e0ddd5] rounded-lg text-[12px] text-[#555] bg-white hover:bg-[#f0efe9] disabled:opacity-40 transition">›</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar view ── */}
      {view === "calendar" && (
        <div className="bg-white border border-[#e1dfd8] rounded-2xl p-6">
          <h2 className="text-[16px] font-semibold text-[#10130f] mb-4">2026 Holiday Calendar</h2>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 12 }, (_, mi) => {
              const monthName = new Date(2026, mi, 1).toLocaleString("default", { month: "long" });
              const monthHols = holidays.filter(h => {
                const d = new Date(h.date); return d.getFullYear() === 2026 && d.getMonth() === mi;
              });
              return (
                <div key={mi} className="border border-[#e4e1d8] rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-[#10130f] tracking-widest uppercase mb-3">{monthName}</div>
                  {monthHols.length ? monthHols.map(h => (
                    <div key={h.id} className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${TYPE_COLORS[h.type] || "bg-gray-100 text-gray-600"}`}>{h.date.slice(0, 6)}</span>
                      <span className="text-[11px] text-[#3a3a30]">{h.name}</span>
                    </div>
                  )) : (
                    <p className="text-[11px] text-[#c0bdb5]">No holidays</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add Holiday Modal ── */}
      {showModal && <AddHolidayModal onClose={() => setShowModal(false)} onAdd={addHoliday} />}

    </div>
  );
}
