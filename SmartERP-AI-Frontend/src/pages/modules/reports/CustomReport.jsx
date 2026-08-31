import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReportsService from "../../../core/services/modules/reports.service";
import apiService from "../../../core/services/api.service";
import storageService from "../../../core/services/storage.service";
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Mock / config data (all constants in one place) ─────────────────────────

const MODULES = [
  "Finance", "Sales", "HR", "Inventory",
  "Manufacturing", "Projects", "Purchase",
];

const TABLES_BY_MODULE = {
  Finance:       ["GL Entries", "Journal Vouchers", "Expense Records", "Tax Ledger", "Balance Sheet"],
  Sales:         ["Sales Orders", "Quotations", "Invoices", "Customers", "Sales Pipeline"],
  HR:            ["Employees", "Attendance Records", "Leave Applications", "Payroll", "Performance"],
  Inventory:     ["Stock Items", "Warehouses", "Stock Transfers", "Batch Tracking"],
  Manufacturing: ["Work Orders", "Bill of Materials", "Machine Logs", "Quality Checks"],
  Projects:      ["Projects", "Tasks", "Time Logs", "Budget Entries", "Documents"],
  Purchase:      ["Purchase Orders", "Vendors", "Goods Receipts", "Supplier Payments"],
};

const FIELDS_BY_TABLE = {
  "GL Entries":         ["Account Code", "Account Name", "Debit", "Credit", "Date", "Reference"],
  "Journal Vouchers":   ["Voucher No", "Date", "Narration", "Amount", "Posted By"],
  "Expense Records":    ["Category", "Amount", "Date", "Approver", "Status"],
  "Tax Ledger":         ["GST Type", "Rate", "Taxable Amount", "Tax Amount", "Period"],
  "Balance Sheet":      ["Asset", "Liability", "Equity", "Value", "Date"],
  "Sales Orders":       ["Order No", "Customer", "Amount", "Date", "Status", "Sales Rep"],
  "Quotations":         ["Quote No", "Customer", "Amount", "Valid Until", "Status"],
  "Invoices":           ["Invoice No", "Customer", "Amount", "Due Date", "Payment Status"],
  "Customers":          ["Name", "Email", "Phone", "City", "Segment", "Credit Limit"],
  "Sales Pipeline":     ["Deal Name", "Stage", "Value", "Close Date", "Owner"],
  "Employees":          ["Name", "Dept", "Designation", "Join Date", "Salary", "Status"],
  "Attendance Records": ["Employee", "Date", "Status", "Check In", "Check Out", "Hours"],
  "Leave Applications": ["Employee", "Leave Type", "From", "To", "Days", "Status"],
  "Payroll":            ["Employee", "Month", "Basic", "Allowances", "Deductions", "Net Pay"],
  "Performance":        ["Employee", "Period", "Rating", "KPIs Met", "Reviewed By"],
  "Stock Items":        ["Item Code", "Name", "Category", "Qty", "Unit", "Value"],
  "Warehouses":         ["Warehouse", "City", "Capacity", "Utilisation %", "Manager"],
  "Stock Transfers":    ["Transfer No", "From", "To", "Qty", "Date", "Status"],
  "Batch Tracking":     ["Batch No", "Item", "Qty", "Mfg Date", "Expiry", "Location"],
  "Work Orders":        ["WO No", "Product", "Qty", "Start Date", "Due Date", "Status"],
  "Bill of Materials":  ["Item", "Component", "Qty Per Unit", "Unit", "Cost"],
  "Machine Logs":       ["Machine", "Operator", "Start", "End", "Uptime %", "Status"],
  "Quality Checks":     ["WO No", "Parameter", "Standard", "Actual", "Result"],
  "Projects":           ["Project", "Manager", "Status", "Budget", "Spent", "Due Date"],
  "Tasks":              ["Task", "Project", "Assignee", "Priority", "Status", "Due Date"],
  "Time Logs":          ["Employee", "Project", "Task", "Date", "Hours", "Billable"],
  "Budget Entries":     ["Project", "Category", "Budgeted", "Actual", "Variance"],
  "Documents":          ["Name", "Project", "Uploaded By", "Date", "Type", "Status"],
  "Purchase Orders":    ["PO No", "Vendor", "Amount", "Date", "Delivery Date", "Status"],
  "Vendors":            ["Name", "Category", "Rating", "City", "Payment Terms"],
  "Goods Receipts":     ["GR No", "PO No", "Vendor", "Date", "Qty", "Status"],
  "Supplier Payments":  ["Payment No", "Vendor", "Amount", "Date", "Mode", "Status"],
};

const FILTER_OPERATORS = [
  "equals", "not equals", "contains", "starts with", "ends with",
  "greater than", "less than", "is empty", "is not empty",
];

const DATE_RANGES = [
  "This Week", "Last Week", "This Month", "Last Month",
  "This Quarter", "Last Quarter", "This Year", "Last Year", "Custom",
];

const VIZ_TYPES = [
  { id: "Table",     icon: "⊞", label: "Table" },
  { id: "Bar",       icon: "▦", label: "Bar Chart" },
  { id: "Line",      icon: "⤤", label: "Line Chart" },
  { id: "Column",    icon: "▮", label: "Column" },
  { id: "Pie",       icon: "◔", label: "Pie Chart" },
  { id: "Donut",     icon: "◎", label: "Donut" },
  { id: "KPI Cards", icon: "◈", label: "KPI Cards" },
];

const PIE_COLORS = ["#9bb48c", "#aaa6b8", "#b0a06d", "#c6d8bc", "#c49a8a"];

// ─── Component ────────────────────────────────────────────────────────────────

const CustomReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const reportId = queryParams.get("id");

  // API State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [previewCols, setPreviewCols] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleId, setScheduleId] = useState(null);

  // Section 1 — Report Information
  const [reportName,  setReportName]  = useState("");
  const [module,      setModule]      = useState("Finance");
  const [reportType,  setReportType]  = useState("Summary");
  const [description, setDescription] = useState("");
  const [visibility,  setVisibility]  = useState("Private");

  // Section 2 — Data Source
  const [dataSource,     setDataSource]     = useState("ERP Live Data");
  const [primaryTable,   setPrimaryTable]   = useState("");
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldDropOpen,  setFieldDropOpen]  = useState(false);

  // Section 3 — Filters
  const [matchType, setMatchType] = useState("All");
  const [filters,   setFilters]   = useState([{ id: 1, field: "", operator: "equals", value: "" }]);

  // Section 4 — Date Range
  const [dateField, setDateField] = useState("");
  const [dateRange, setDateRange] = useState("This Month");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");

  // Section 5 — Group By
  const [groupRows, setGroupRows] = useState([{ id: 1, field: "" }]);

  // Section 6 — Sorting
  const [sortBy,  setSortBy]  = useState("");
  const [sortDir, setSortDir] = useState("ASC");

  // Section 7 — Calculations
  const [calculations, setCalculations] = useState([{ id: 1, field: "", calc: "SUM", alias: "" }]);

  // Section 8 — Visualization
  const [vizType, setVizType] = useState("Table");

  // Section 9 — Preview trigger
  const [previewKey, setPreviewKey] = useState(0);

  // Section 10 — KPI Configuration
  const [kpiEnabled, setKpiEnabled] = useState(false);
  const [kpis,       setKpis]       = useState([{ id: 1, name: "", metric: "", calc: "SUM", target: "", unit: "" }]);

  // Section 11 — Schedule
  const [schedEnabled,    setSchedEnabled]    = useState(false);
  const [schedFreq,       setSchedFreq]       = useState("Weekly");
  const [schedDay,        setSchedDay]        = useState("Monday");
  const [schedTime,       setSchedTime]       = useState("09:00");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [schedFormat,     setSchedFormat]     = useState("PDF");
  const [schedStartDate,  setSchedStartDate]  = useState("");
  const [schedEndDate,    setSchedEndDate]    = useState("");

  // Section 12 — Export
  const [exportFormats,  setExportFormats]  = useState({ pdf: true, excel: false, csv: false });
  const [exportIncludes, setExportIncludes] = useState({
    logo: true, dateRange: true, summary: false, charts: true, filters: false, pageNumbers: true,
  });

  // Section 13 — Save
  const [saveAs,              setSaveAs]              = useState("New Report");
  const [saveVisibility,      setSaveVisibility]      = useState("Private");
  const [saveUsers,           setSaveUsers]           = useState([]);
  const [saveStatus,          setSaveStatus]          = useState(null); // null | 'saved' | 'draft'
  const [availableUsersRoles, setAvailableUsersRoles] = useState(["All Users"]);
  const [loadingUsersRoles,   setLoadingUsersRoles]   = useState(false);

  // Helpers
  const capitalize = (s) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  // Fetch Real Users and Roles for Sharing
  useEffect(() => {
    const currentUser = storageService.getUser();
    const tenantId = currentUser?.tenantId;
    if (tenantId) {
      setLoadingUsersRoles(true);
      Promise.allSettled([
        apiService.get(`/admin/users?tenantId=${tenantId}`),
        apiService.get(`/admin/roles?tenantId=${tenantId}`)
      ]).then(([usersRes, rolesRes]) => {
        const options = ["All Users"];
        if (rolesRes.status === "fulfilled" && Array.isArray(rolesRes.value.data)) {
          rolesRes.value.data.forEach(r => {
            if (r.name) options.push(`Role: ${r.name}`);
          });
        }
        if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data)) {
          usersRes.value.data.forEach(u => {
            if (u.name && u.email) {
              options.push(`${u.name} (${u.email})`);
            } else if (u.name) {
              options.push(u.name);
            } else if (u.email) {
              options.push(u.email);
            }
          });
        }
        setAvailableUsersRoles(options);
      }).catch(() => {
        setAvailableUsersRoles(["All Users"]);
      }).finally(() => {
        setLoadingUsersRoles(false);
      });
    }
  }, []);

  // Load Existing Report
  useEffect(() => {
    if (reportId) {
      setLoading(true);
      setError("");
      ReportsService.getCustomById(reportId)
        .then(({ data }) => {
          setReportName(data.name || "");
          setModule(capitalize(data.module) || "Finance");
          setReportType(data.reportType || "Summary");
          setDescription(data.description || "");
          setVisibility(data.visibility || "Private");
          setDataSource(data.dataSource || "ERP Live Data");
          setPrimaryTable(data.primaryTable || "");
          setSelectedFields(data.selectedFields || []);
          if (data.filters && data.filters.length > 0) {
            setFilters(data.filters.map((f, i) => ({ id: i + 1, field: f.field, operator: f.operator, value: f.value })));
          } else {
            setFilters([{ id: 1, field: "", operator: "equals", value: "" }]);
          }
          setMatchType(data.matchType || "All");
          setDateField(data.dateField || "");
          setDateRange(data.dateRange || "This Month");
          setFromDate(data.fromDate || "");
          setToDate(data.toDate || "");
          if (data.groupBy && data.groupBy.length > 0) {
            setGroupRows(data.groupBy.map((g, i) => ({ id: i + 1, field: g })));
          } else {
            setGroupRows([{ id: 1, field: "" }]);
          }
          setSortBy(data.sortBy || "");
          setSortDir(data.sortDir || "ASC");
          if (data.calculations && data.calculations.length > 0) {
            setCalculations(data.calculations.map((c, i) => ({ id: i + 1, field: c.field, calc: c.calc, alias: c.alias })));
          } else {
            setCalculations([{ id: 1, field: "", calc: "SUM", alias: "" }]);
          }
          setVizType(data.vizType || "Table");
          setKpiEnabled(data.kpiEnabled || false);
          if (data.kpis && data.kpis.length > 0) {
            setKpis(data.kpis.map((k, i) => ({ id: i + 1, name: k.name, metric: k.metric, calc: k.calc, target: k.target, unit: k.unit })));
          } else {
            setKpis([{ id: 1, name: "", metric: "", calc: "SUM", target: "", unit: "" }]);
          }
          setSchedEnabled(data.schedEnabled || false);
          if (data.exportFormats) setExportFormats(data.exportFormats);
          if (data.exportIncludes) setExportIncludes(data.exportIncludes);
          if (data.sharedUsers) setSaveUsers(data.sharedUsers);

          // Trigger preview for loaded report
          loadPreview(reportId);

          // Check for existing schedule
          ReportsService.getSchedules()
            .then(({ data }) => {
              const matched = data.find(s => s.reportId === Number(reportId) && s.isCustom === true);
              if (matched) {
                setSchedEnabled(matched.active);
                setSchedFreq(capitalize(matched.frequency));
                setSchedDay(capitalize(matched.dayOfWeek) || "Monday");
                setSchedTime(matched.timeOfDay);
                setSchedRecipients(matched.recipients);
                setSchedFormat(matched.format);
                setSchedStartDate(matched.startDate);
                setSchedEndDate(matched.endDate || "");
                setScheduleId(matched.id);
              }
            })
            .catch(() => {});
        })
        .catch(err => {
          setError(err.response?.data?.detail || "Failed to load report configuration.");
        })
        .finally(() => setLoading(false));
    }
  }, [reportId]);

  // Payload Construction matching CustomReportRequest
  const getPayload = () => {
    const mappedFilters = filters
      .filter(f => f.field)
      .map(f => ({ field: f.field, operator: f.operator, value: f.value }));
    
    const mappedCalcs = calculations
      .filter(c => c.field)
      .map(c => ({ field: c.field, calc: c.calc, alias: c.alias }));
    
    const mappedKpis = kpis
      .filter(k => k.name)
      .map(k => ({ name: k.name, metric: k.metric, calc: k.calc, target: k.target, unit: k.unit }));

    const mappedGroupBy = groupRows
      .map(g => g.field)
      .filter(Boolean);

    return {
      name: reportName || "Untitled Report",
      module: module.toUpperCase(),
      reportType,
      description,
      visibility,
      dataSource,
      primaryTable,
      selectedFields,
      filters: mappedFilters,
      matchType,
      dateField,
      dateRange,
      fromDate: fromDate || null,
      toDate: toDate || null,
      groupBy: mappedGroupBy,
      sortBy,
      sortDir,
      calculations: mappedCalcs,
      vizType,
      kpiEnabled,
      kpis: mappedKpis,
      schedEnabled,
      exportFormats,
      exportIncludes,
      sharedUsers: saveUsers
    };
  };

  // Preview Loaders
  const loadPreview = (id) => {
    setPreviewLoading(true);
    ReportsService.getPreview(id)
      .then(({ data }) => {
        setPreviewCols(data.columns || []);
        setPreviewData(data.data || []);
        setError("");
      })
      .catch(err => {
        setError(err.response?.data?.detail || "Failed to load report preview.");
      })
      .finally(() => setPreviewLoading(false));
  };

  const loadPreviewDynamic = () => {
    if (!primaryTable) {
      setError("Please select a primary table before updating preview.");
      return;
    }
    const payload = getPayload();
    setPreviewLoading(true);
    setError("");
    ReportsService.getPreviewDynamic(payload)
      .then(({ data }) => {
        setPreviewCols(data.columns || []);
        setPreviewData(data.data || []);
      })
      .catch(err => {
        setError(err.response?.data?.detail || "Failed to generate preview.");
      })
      .finally(() => setPreviewLoading(false));
  };

  const handleSaveSchedule = (targetReportId) => {
    if (!schedEnabled) {
      if (scheduleId) {
        return ReportsService.deleteSchedule(scheduleId)
          .then(() => {
            setScheduleId(null);
          })
          .catch(() => {});
      }
      return Promise.resolve();
    }

    if (!schedRecipients.trim()) {
      return Promise.reject(new Error("Recipients are required when schedule is enabled."));
    }
    if (!schedTime) {
      return Promise.reject(new Error("Execution time is required when schedule is enabled."));
    }
    if (!schedStartDate) {
      return Promise.reject(new Error("Start date is required when schedule is enabled."));
    }

    const schedulePayload = {
      reportId: Number(targetReportId),
      isCustom: true,
      frequency: schedFreq.toUpperCase(),
      dayOfWeek: schedFreq === "Weekly" ? schedDay.toUpperCase() : null,
      timeOfDay: schedTime,
      recipients: schedRecipients,
      format: schedFormat,
      startDate: schedStartDate,
      endDate: schedEndDate || null,
      active: true
    };

    if (scheduleId) {
      return ReportsService.updateSchedule(scheduleId, schedulePayload)
        .catch(err => {
          throw new Error(err.response?.data?.detail || "Failed to update schedule settings.");
        });
    } else {
      return ReportsService.createSchedule(schedulePayload)
        .then(({ data }) => {
          setScheduleId(data.id);
        })
        .catch(err => {
          throw new Error(err.response?.data?.detail || "Failed to create schedule configuration.");
        });
    }
  };

  // Save Report / Draft
  const handleSaveReport = () => {
    if (!reportName.trim()) {
      setError("Report name is required before saving.");
      return;
    }
    if (!primaryTable) {
      setError("Primary table is required before saving.");
      return;
    }

    const payload = getPayload();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const savePromise = reportId
      ? ReportsService.updateCustom(reportId, payload)
      : ReportsService.createCustom(payload);

    savePromise
      .then(({ data }) => {
        const savedId = reportId || data.id;
        return handleSaveSchedule(savedId)
          .then(() => {
            setSuccessMsg(`Report successfully saved!`);
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus(null), 3000);
            if (!reportId && data.id) {
              navigate(`/app/admin/reports/custom-report?id=${data.id}`);
            }
          });
      })
      .catch(err => {
        setError(err.message || err.response?.data?.detail || "Failed to save report.");
      })
      .finally(() => setLoading(false));
  };

  const handleSaveDraft = () => {
    if (!reportName.trim()) {
      setError("Report name is required before saving draft.");
      return;
    }
    if (!primaryTable) {
      setError("Primary table is required before saving draft.");
      return;
    }

    const payload = getPayload();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const savePromise = reportId
      ? ReportsService.updateCustom(reportId, payload)
      : ReportsService.createCustom(payload);

    savePromise
      .then(({ data }) => {
        const savedId = reportId || data.id;
        return handleSaveSchedule(savedId)
          .then(() => {
            setSuccessMsg(`Draft successfully saved!`);
            setSaveStatus("draft");
            setTimeout(() => setSaveStatus(null), 3000);
            if (!reportId && data.id) {
              navigate(`/app/admin/reports/custom-report?id=${data.id}`);
            }
          });
      })
      .catch(err => {
        setError(err.message || err.response?.data?.detail || "Failed to save draft.");
      })
      .finally(() => setLoading(false));
  };

  // Delete Report
  const handleDeleteReport = () => {
    if (window.confirm("Are you sure you want to delete this custom report?")) {
      setLoading(true);
      setError("");
      ReportsService.removeCustom(reportId)
        .then(() => {
          alert("Report deleted successfully!");
          navigate(-1);
        })
        .catch(err => {
          setError(err.response?.data?.detail || "Failed to delete report.");
        })
        .finally(() => setLoading(false));
    }
  };

  // Handlers for list builders
  const toggleField = (f) =>
    setSelectedFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const addFilter    = () => setFilters(p => [...p, { id: Date.now(), field: "", operator: "equals", value: "" }]);
  const removeFilter = (id) => setFilters(p => p.filter(f => f.id !== id));
  const updateFilter = (id, k, v) => setFilters(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  const addGroup    = () => { if (groupRows.length < 3) setGroupRows(p => [...p, { id: Date.now(), field: "" }]); };
  const removeGroup = (id) => setGroupRows(p => p.filter(g => g.id !== id));
  const updateGroup = (id, v) => setGroupRows(p => p.map(g => g.id === id ? { ...g, field: v } : g));

  const addCalc = () => setCalculations(p => [...p, { id: Date.now(), field: "", calc: "SUM", alias: "" }]);
  const removeCalc = (id) => setCalculations(p => p.filter(c => c.id !== id));
  const updateCalc = (id, k, v) => setCalculations(p => p.map(c => c.id === id ? { ...c, [k]: v } : c));

  const addKpi    = () => setKpis(p => [...p, { id: Date.now(), name: "", metric: "", calc: "SUM", target: "", unit: "" }]);
  const removeKpi = (id) => setKpis(p => p.filter(k => k.id !== id));
  const updateKpi = (id, k, v) => setKpis(p => p.map(kpi => kpi.id === id ? { ...kpi, [k]: v } : kpi));

  const toggleSaveUser = (u) =>
    setSaveUsers(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u]);

  const availableFields = primaryTable ? (FIELDS_BY_TABLE[primaryTable] || []) : [];

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  // ─── Preview chart renderer ────────────────────────────────────────────────

  const renderPreviewChart = () => {
    if (vizType === "Table" || vizType === "KPI Cards") return null;

    const getChartData = () => {
      if (!previewData || previewData.length === 0) return [];
      
      const cols = previewCols;
      if (!cols || cols.length === 0) return [];
      
      // Find name key and value key
      const nameKey = cols[0];
      let valueKey = cols.find(c => {
        const cl = c.toLowerCase();
        return cl.includes("amount") || cl.includes("budget") || cl.includes("cost") || cl.includes("price") || cl.includes("value") || cl.includes("quantity") || cl.includes("qty") || cl.includes("hours");
      });
      
      if (!valueKey) {
        valueKey = cols.length > 1 ? cols[1] : cols[0];
      }
      
      return previewData.map(row => {
        const nameVal = row[nameKey];
        const valVal = row[valueKey];
        
        let numericVal = 0;
        if (typeof valVal === 'number') {
          numericVal = valVal;
        } else if (valVal) {
          const clean = valVal.toString().replace(/[^0-9.]/g, "");
          numericVal = parseFloat(clean) || 0;
        }
        
        return {
          name: nameVal == null ? "" : nameVal.toString(),
          value: numericVal
        };
      });
    };

    const activeChartData = getChartData();

    if (activeChartData.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', color: '#99978f', fontSize: '13px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '6px', border: '1px dashed #e0ded6', margin: '8px 0' }}>
          Select table &amp; fields and click "↻ Update Preview" to view chart data
        </div>
      );
    }

    const commonProps = {
      data: activeChartData,
      margin: { top: 4, right: 8, bottom: 4, left: 0 },
    };

    if (vizType === "Pie" || vizType === "Donut") {
      return (
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={activeChartData}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              outerRadius={vizType === "Donut" ? 60 : 65}
              innerRadius={vizType === "Donut" ? 32 : 0}
            >
              {activeChartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (vizType === "Line") {
      return (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart {...commonProps}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#aaa6a0" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#9bb48c" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Bar / Column
    const isBar = vizType === "Bar";
    return (
      <ResponsiveContainer width="100%" height={160}>
        <BarChart {...commonProps} layout={isBar ? "vertical" : "horizontal"}>
          {isBar
            ? (<><XAxis type="number" hide /><YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#aaa6a0" }} axisLine={false} tickLine={false} width={28} /></>)
            : (<><XAxis dataKey="name" tick={{ fontSize: 9, fill: "#aaa6a0" }} axisLine={false} tickLine={false} /><YAxis hide /></>)
          }
          <Tooltip />
          <Bar dataKey="value" fill="#9bb48c" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="cr-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '16px', color: '#aaa' }}>
        Loading report builder...
      </div>
    );
  }

  return (
    <div className="cr-page">

      {/* ── Page Header ── */}
      <div className="cr-header">
        <div>
          <div className="cr-eyebrow">REPORTS & ANALYTICS</div>
          <h1 className="cr-title">Custom Report Builder</h1>
        </div>
        <div className="cr-header-actions">
          {reportId && (
            <button 
              className="cr-btn-outline" 
              onClick={handleDeleteReport} 
              style={{ marginRight: '8px', borderColor: '#ff4d4f', color: '#ff4d4f', cursor: 'pointer' }}
            >
              Delete Report
            </button>
          )}
          <button className="cr-btn-ghost" onClick={() => navigate(-1)}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="cr-api-error-message" style={{ margin: '16px 24px', padding: '12px 16px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '8px', color: '#ff4d4f', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="cr-api-success-message" style={{ margin: '16px 24px', padding: '12px 16px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px', color: '#52c41a', fontSize: '14px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="cr-layout">

        {/* ══════════ LEFT COLUMN ══════════ */}
        <div className="cr-left">

          {/* 1. Report Information */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">1</span>
              <h2>Report Information</h2>
            </div>
            <div className="cr-form-grid">
              <div className="cr-field cr-field-full">
                <label className="cr-label">REPORT NAME</label>
                <input className="cr-input" placeholder="Enter report name…" value={reportName} onChange={e => setReportName(e.target.value)} />
              </div>
              <div className="cr-field">
                <label className="cr-label">MODULE</label>
                <select className="cr-select" value={module} onChange={e => { setModule(e.target.value); setPrimaryTable(""); setSelectedFields([]); }}>
                  {MODULES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="cr-field">
                <label className="cr-label">REPORT TYPE</label>
                <select className="cr-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                  {["Summary", "Detailed", "Comparative", "Trend"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">DESCRIPTION</label>
                <textarea className="cr-textarea" rows={2} placeholder="Brief description of this report…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">VISIBILITY</label>
                <div className="cr-radio-row">
                  {["Private", "Team", "Organisation"].map(v => (
                    <label key={v} className="cr-radio-label">
                      <input type="radio" name="info-visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} /> {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="cr-field">
                <label className="cr-label">CREATED BY</label>
                <input className="cr-input cr-input-readonly" value="Current User" readOnly />
              </div>
              <div className="cr-field">
                <label className="cr-label">CREATED ON</label>
                <input className="cr-input cr-input-readonly" value={todayLabel} readOnly />
              </div>
            </div>
          </section>

          {/* 2. Data Source */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">2</span>
              <h2>Data Source</h2>
            </div>
            <div className="cr-form-grid">
              <div className="cr-field">
                <label className="cr-label">SOURCE</label>
                <select className="cr-select" value={dataSource} onChange={e => setDataSource(e.target.value)}>
                  {["ERP Live Data", "Uploaded Data", "External API"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="cr-field">
                <label className="cr-label">PRIMARY TABLE</label>
                <select className="cr-select" value={primaryTable} onChange={e => { setPrimaryTable(e.target.value); setSelectedFields([]); }}>
                  <option value="">— Select table —</option>
                  {(TABLES_BY_MODULE[module] || []).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">FIELDS TO DISPLAY</label>
                <div className="cr-tag-area">
                  {selectedFields.map(f => (
                    <span key={f} className="cr-tag">
                      {f} <button className="cr-tag-remove" onClick={() => toggleField(f)}>×</button>
                    </span>
                  ))}
                  {primaryTable ? (
                    <div className="cr-drop-wrap">
                      <button className="cr-add-link-inline" onClick={() => setFieldDropOpen(o => !o)}>+ Add Field</button>
                      {fieldDropOpen && (
                        <div className="cr-drop-menu">
                          {availableFields.filter(f => !selectedFields.includes(f)).length === 0
                            ? <span className="cr-drop-empty">All fields added</span>
                            : availableFields.filter(f => !selectedFields.includes(f)).map(f => (
                                <button key={f} className="cr-drop-item" onClick={() => { toggleField(f); setFieldDropOpen(false); }}>{f}</button>
                              ))
                          }
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="cr-hint">Select a primary table first</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Filters */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">3</span>
              <h2>Filters</h2>
            </div>
            <div className="cr-filter-top">
              <span className="cr-label">MATCH TYPE</span>
              <div className="cr-toggle-group">
                {["All", "Any"].map(m => (
                  <button key={m} className={`cr-toggle-btn${matchType === m ? " active" : ""}`} onClick={() => setMatchType(m)}>{m}</button>
                ))}
              </div>
              <span className="cr-hint">of the following conditions</span>
            </div>
            <div className="cr-filter-list">
              {filters.map(f => (
                <div key={f.id} className="cr-filter-row">
                  <select className="cr-select cr-filter-field" value={f.field} onChange={e => updateFilter(f.id, "field", e.target.value)}>
                    <option value="">Field</option>
                    {availableFields.map(af => <option key={af}>{af}</option>)}
                  </select>
                  <select className="cr-select cr-filter-op" value={f.operator} onChange={e => updateFilter(f.id, "operator", e.target.value)}>
                    {FILTER_OPERATORS.map(op => <option key={op}>{op}</option>)}
                  </select>
                  <input className="cr-input cr-filter-val" placeholder="Value" value={f.value} onChange={e => updateFilter(f.id, "value", e.target.value)} />
                  <button className="cr-icon-btn cr-danger" onClick={() => removeFilter(f.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="cr-add-link" onClick={addFilter}>+ Add Filter</button>
          </section>

          {/* 4. Date Range */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">4</span>
              <h2>Date Range</h2>
            </div>
            <div className="cr-form-grid">
              <div className="cr-field">
                <label className="cr-label">DATE FIELD</label>
                <select className="cr-select" value={dateField} onChange={e => setDateField(e.target.value)}>
                  <option value="">— Select field —</option>
                  {availableFields.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="cr-field">
                <label className="cr-label">RANGE</label>
                <select className="cr-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                  {DATE_RANGES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {dateRange === "Custom" && (
                <>
                  <div className="cr-field">
                    <label className="cr-label">FROM</label>
                    <input type="date" className="cr-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                  </div>
                  <div className="cr-field">
                    <label className="cr-label">TO</label>
                    <input type="date" className="cr-input" value={toDate} onChange={e => setToDate(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 5. Group By */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">5</span>
              <h2>Group By</h2>
            </div>
            <div className="cr-group-list">
              {groupRows.map((g, idx) => (
                <div key={g.id} className="cr-filter-row">
                  <span className="cr-hint cr-group-label">{idx === 0 ? "Group by" : "Then by"}</span>
                  <select className="cr-select" value={g.field} onChange={e => updateGroup(g.id, e.target.value)}>
                    <option value="">— Select field —</option>
                    {availableFields.map(f => <option key={f}>{f}</option>)}
                  </select>
                  {idx > 0 && <button className="cr-icon-btn cr-danger" onClick={() => removeGroup(g.id)}>×</button>}
                </div>
              ))}
            </div>
            {groupRows.length < 3 && (
              <button className="cr-add-link" onClick={addGroup}>+ Add Group</button>
            )}
          </section>

          {/* 6. Sorting */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">6</span>
              <h2>Sorting</h2>
            </div>
            <div className="cr-form-grid">
              <div className="cr-field">
                <label className="cr-label">SORT BY</label>
                <select className="cr-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="">— Select field —</option>
                  {availableFields.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="cr-field">
                <label className="cr-label">DIRECTION</label>
                <div className="cr-toggle-group">
                  {[["ASC", "↑ Ascending"], ["DESC", "↓ Descending"]].map(([d, label]) => (
                    <button key={d} className={`cr-toggle-btn${sortDir === d ? " active" : ""}`} onClick={() => setSortDir(d)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 7. Calculations */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">7</span>
              <h2>Calculations / Aggregation</h2>
            </div>
            <div className="cr-calc-table">
              <div className="cr-calc-header">
                <span>FIELD</span><span>CALCULATION</span><span>ALIAS</span><span></span>
              </div>
              {calculations.map(c => (
                <div key={c.id} className="cr-calc-row">
                  <select className="cr-select" value={c.field} onChange={e => updateCalc(c.id, "field", e.target.value)}>
                    <option value="">— Field —</option>
                    {availableFields.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <select className="cr-select" value={c.calc} onChange={e => updateCalc(c.id, "calc", e.target.value)}>
                    {["SUM", "COUNT", "AVG", "MIN", "MAX"].map(op => <option key={op}>{op}</option>)}
                  </select>
                  <input className="cr-input" placeholder="Alias…" value={c.alias} onChange={e => updateCalc(c.id, "alias", e.target.value)} />
                  <button className="cr-icon-btn cr-danger" onClick={() => removeCalc(c.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="cr-add-link" onClick={addCalc}>+ Add Calculation</button>
          </section>

          {/* 8. Visualization */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">8</span>
              <h2>Visualization</h2>
            </div>
            <div className="cr-viz-grid">
              {VIZ_TYPES.map(v => (
                <button key={v.id} className={`cr-viz-card${vizType === v.id ? " active" : ""}`} onClick={() => setVizType(v.id)}>
                  <span className="cr-viz-icon-txt">{v.icon}</span>
                  <span className="cr-viz-label">{v.label}</span>
                  {vizType === v.id && <span className="cr-viz-check">✓</span>}
                </button>
              ))}
            </div>
          </section>

          {/* 10. KPI Configuration */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">10</span>
              <h2>KPI Configuration <span className="cr-optional">Optional</span></h2>
            </div>
            <div className="cr-toggle-row">
              <label className="cr-switch">
                <input type="checkbox" checked={kpiEnabled} onChange={e => setKpiEnabled(e.target.checked)} />
                <span className="cr-switch-track" />
              </label>
              <span className="cr-hint">{kpiEnabled ? "KPI cards enabled" : "Enable KPI cards for this report"}</span>
            </div>
            {kpiEnabled && (
              <>
                <div className="cr-calc-table" style={{ marginTop: 12 }}>
                  <div className="cr-calc-header cr-kpi-cols">
                    <span>KPI NAME</span><span>METRIC FIELD</span><span>CALC</span><span>TARGET</span><span>UNIT</span><span></span>
                  </div>
                  {kpis.map(k => (
                    <div key={k.id} className="cr-calc-row cr-kpi-cols">
                      <input className="cr-input" placeholder="Name…" value={k.name} onChange={e => updateKpi(k.id, "name", e.target.value)} />
                      <select className="cr-select" value={k.metric} onChange={e => updateKpi(k.id, "metric", e.target.value)}>
                        <option value="">— Field —</option>
                        {availableFields.map(f => <option key={f}>{f}</option>)}
                      </select>
                      <select className="cr-select" value={k.calc} onChange={e => updateKpi(k.id, "calc", e.target.value)}>
                        {["SUM", "COUNT", "AVG", "MIN", "MAX"].map(op => <option key={op}>{op}</option>)}
                      </select>
                      <input className="cr-input" placeholder="e.g. 500000" value={k.target} onChange={e => updateKpi(k.id, "target", e.target.value)} />
                      <input className="cr-input" placeholder="e.g. ₹" value={k.unit} onChange={e => updateKpi(k.id, "unit", e.target.value)} />
                      <button className="cr-icon-btn cr-danger" onClick={() => removeKpi(k.id)}>×</button>
                    </div>
                  ))}
                </div>
                <button className="cr-add-link" onClick={addKpi}>+ Add KPI</button>
              </>
            )}
          </section>

          {/* 11. Schedule Report */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">11</span>
              <h2>Schedule Report <span className="cr-optional">Optional</span></h2>
            </div>
            <div className="cr-toggle-row">
              <label className="cr-switch">
                <input type="checkbox" checked={schedEnabled} onChange={e => setSchedEnabled(e.target.checked)} />
                <span className="cr-switch-track" />
              </label>
              <span className="cr-hint">{schedEnabled ? "Schedule enabled" : "Enable automated report delivery"}</span>
            </div>
            {schedEnabled && (
              <div className="cr-form-grid" style={{ paddingTop: 12 }}>
                <div className="cr-field">
                  <label className="cr-label">FREQUENCY</label>
                  <select className="cr-select" value={schedFreq} onChange={e => setSchedFreq(e.target.value)}>
                    {["Daily", "Weekly", "Monthly"].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                {schedFreq === "Weekly" && (
                  <div className="cr-field">
                    <label className="cr-label">DAY</label>
                    <select className="cr-select" value={schedDay} onChange={e => setSchedDay(e.target.value)}>
                      {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div className="cr-field">
                  <label className="cr-label">TIME</label>
                  <input type="time" className="cr-input" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                </div>
                <div className="cr-field cr-field-full">
                  <label className="cr-label">RECIPIENTS (comma-separated emails)</label>
                  <input className="cr-input" placeholder="email@company.com, email2@company.com" value={schedRecipients} onChange={e => setSchedRecipients(e.target.value)} />
                </div>
                <div className="cr-field cr-field-full">
                  <label className="cr-label">FORMAT</label>
                  <div className="cr-radio-row">
                    {["PDF", "Excel", "CSV"].map(f => (
                      <label key={f} className="cr-radio-label">
                        <input type="radio" name="schedFormat" value={f} checked={schedFormat === f} onChange={() => setSchedFormat(f)} /> {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="cr-field">
                  <label className="cr-label">START DATE</label>
                  <input type="date" className="cr-input" value={schedStartDate} onChange={e => setSchedStartDate(e.target.value)} />
                </div>
                <div className="cr-field">
                  <label className="cr-label">END DATE</label>
                  <input type="date" className="cr-input" value={schedEndDate} onChange={e => setSchedEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </section>

          {/* 12. Export Settings */}
          <section className="cr-section">
            <div className="cr-section-head">
              <span className="cr-section-num">12</span>
              <h2>Export Settings</h2>
            </div>
            <div className="cr-export-cols">
              <div>
                <div className="cr-label" style={{ marginBottom: 10 }}>FORMAT</div>
                {[["pdf","PDF"],["excel","Excel"],["csv","CSV"]].map(([k, label]) => (
                  <label key={k} className="cr-check-label">
                    <input type="checkbox" checked={exportFormats[k]} onChange={e => setExportFormats(p => ({ ...p, [k]: e.target.checked }))} /> {label}
                  </label>
                ))}
              </div>
              <div>
                <div className="cr-label" style={{ marginBottom: 10 }}>INCLUDE IN EXPORT</div>
                {[["logo","Company Logo"],["dateRange","Date Range"],["summary","Executive Summary"],["charts","Charts"],["filters","Applied Filters"],["pageNumbers","Page Numbers"]].map(([k, label]) => (
                  <label key={k} className="cr-check-label">
                    <input type="checkbox" checked={exportIncludes[k]} onChange={e => setExportIncludes(p => ({ ...p, [k]: e.target.checked }))} /> {label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 13. Save & Permissions */}
          <section className="cr-section cr-section-last">
            <div className="cr-section-head">
              <span className="cr-section-num">13</span>
              <h2>Save &amp; Permissions</h2>
            </div>
            <div className="cr-form-grid">
              <div className="cr-field cr-field-full">
                <label className="cr-label">SAVE AS</label>
                <div className="cr-radio-row">
                  {["New Report", "Update Existing"].map(s => (
                    <label key={s} className="cr-radio-label">
                      <input type="radio" name="saveAs" value={s} checked={saveAs === s} onChange={() => setSaveAs(s)} /> {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">REPORT NAME</label>
                <input className="cr-input" placeholder="Confirm report name…" value={reportName} onChange={e => setReportName(e.target.value)} />
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">VISIBILITY</label>
                <div className="cr-radio-row">
                  {["Private", "Team", "Organisation"].map(v => (
                    <label key={v} className="cr-radio-label">
                      <input type="radio" name="saveVisibility" value={v} checked={saveVisibility === v} onChange={() => setSaveVisibility(v)} /> {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="cr-field cr-field-full">
                <label className="cr-label">SHARE WITH USERS / ROLES</label>
                <div className="cr-tag-area" style={{ flexWrap: "wrap", gap: 6 }}>
                  {saveUsers.map(u => (
                    <span key={u} className="cr-tag">
                      {u} <button className="cr-tag-remove" onClick={() => toggleSaveUser(u)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="cr-user-grid">
                  {loadingUsersRoles ? (
                    <span style={{ fontSize: "12px", color: "#99978f", padding: "6px" }}>Loading sharing options...</span>
                  ) : (
                    availableUsersRoles.filter(u => !saveUsers.includes(u)).map(u => (
                      <button key={u} className="cr-user-chip" onClick={() => toggleSaveUser(u)}>{u}</button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {saveStatus === "saved" && (
              <div className="cr-status-msg cr-status-ok">✓ Report saved successfully.</div>
            )}
            {saveStatus === "draft" && (
              <div className="cr-status-msg cr-status-draft">✓ Draft saved to local storage.</div>
            )}

            <div className="cr-save-actions">
              <button className="cr-btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button className="cr-btn-outline" onClick={handleSaveDraft}>Save Draft</button>
              <button className="cr-btn-dark" onClick={handleSaveReport}>Save Report</button>
            </div>
          </section>

        </div>
        {/* ══ end left ══ */}

        {/* ══════════ RIGHT COLUMN — Preview (Section 9) ══════════ */}
        <div className="cr-right">
          <div className="cr-preview-sticky">
            <section className="cr-section cr-preview-section">
              <div className="cr-section-head">
                <span className="cr-section-num">9</span>
                <h2>Report Preview</h2>
              </div>

              <div className="cr-preview-meta">
                <div className="cr-preview-title">{reportName || "Untitled Report"}</div>
                <div className="cr-preview-sub">{module} · {reportType} · {dateRange}</div>
                <span className="cr-preview-badge">
                  {previewLoading ? "Updating..." : `${previewData.length} records`}
                </span>
              </div>

              {/* KPI grid preview */}
              {vizType === "KPI Cards" && (
                <div className="cr-preview-kpi-grid">
                  {[
                    { label: "TOTAL", value: (previewData.length > 0 && previewCols.length > 1) ? `₹${(previewData.reduce((acc, row) => acc + (parseFloat(row[previewCols.find(c => c.toLowerCase().includes("amount") || c.toLowerCase().includes("budget") || c.toLowerCase().includes("cost") || c.toLowerCase().includes("price") || c.toLowerCase().includes("value"))]) || 0), 0) / 100000).toFixed(2)}L` : (previewData.length > 0 ? `${previewData.length}` : "0") },
                    { label: "COUNT",  value: previewData.length.toString() },
                    { label: "AVG",    value: (previewData.length > 0 && previewCols.length > 1) ? `₹${((previewData.reduce((acc, row) => acc + (parseFloat(row[previewCols.find(c => c.toLowerCase().includes("amount") || c.toLowerCase().includes("budget") || c.toLowerCase().includes("cost") || c.toLowerCase().includes("price") || c.toLowerCase().includes("value"))]) || 0), 0) / previewData.length) / 100000).toFixed(2)}L` : (previewData.length > 0 ? "1" : "0") },
                    { label: "MAX",    value: (previewData.length > 0 && previewCols.length > 1) ? `₹${(Math.max(...previewData.map(row => parseFloat(row[previewCols.find(c => c.toLowerCase().includes("amount") || c.toLowerCase().includes("budget") || c.toLowerCase().includes("cost") || c.toLowerCase().includes("price") || c.toLowerCase().includes("value"))]) || 0)) / 100000).toFixed(2)}L` : (previewData.length > 0 ? `${previewData.length}` : "0") },
                  ].map(k => (
                    <div key={k.label} className="cr-preview-kpi">
                      <div className="cr-preview-kpi-label">{k.label}</div>
                      <div className="cr-preview-kpi-val">{k.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart preview */}
              {vizType !== "Table" && vizType !== "KPI Cards" && (
                <div className="cr-preview-chart" key={`c-${previewKey}-${vizType}`}>
                  {renderPreviewChart()}
                </div>
              )}

              {/* Table preview */}
              {previewData.length > 0 ? (
                <div className="cr-preview-table-wrap">
                  <table className="cr-preview-table">
                    <thead>
                      <tr>
                        {previewCols.map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody key={previewKey}>
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {previewCols.map(col => {
                            const val = row[col];
                            const valStr = val == null ? "" : val.toString();
                            if (col.toLowerCase().includes("status")) {
                              return (
                                <td key={col}>
                                  <span className={`cr-status-badge cr-status-${valStr.toLowerCase()}`}>{valStr}</span>
                                </td>
                              );
                            }
                            if (col.toLowerCase().includes("amount") || col.toLowerCase().includes("budget") || col.toLowerCase().includes("cost") || col.toLowerCase().includes("price") || col.toLowerCase().includes("value")) {
                              return (
                                <td key={col} className="cr-preview-amount">{valStr}</td>
                              );
                            }
                            return <td key={col}>{valStr}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#99978f', fontSize: '13px', backgroundColor: '#fff', borderRadius: '6px', border: '1px dashed #e0ded6', margin: '10px 0' }}>
                  No preview data. Select a primary table and click "↻ Update Preview" to generate real-time records.
                </div>
              )}

              <button 
                className="cr-update-preview-btn" 
                onClick={loadPreviewDynamic}
                disabled={previewLoading}
                style={{ cursor: previewLoading ? "not-allowed" : "pointer" }}
              >
                {previewLoading ? "Updating..." : "↻ Update Preview"}
              </button>
            </section>
          </div>
        </div>
        {/* ══ end right ══ */}

      </div>

      {/* ══ Inline CSS ══ */}
      <style>{`

        .cr-page {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 35px 80px 35px;
          background: #f5f4ef;
          color: #11140f;
          font-family: var(--sans), 'DM Sans', system-ui, sans-serif;
        }

        /* Header */
        .cr-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }
        .cr-eyebrow {
          margin-bottom: 7px;
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #99978f;
        }
        .cr-title {
          margin: 0;
          font-family: var(--serif), 'DM Serif Display', Georgia, serif;
          font-size: 27px;
          font-weight: 400;
          color: #10130f;
        }
        .cr-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Two-column layout */
        .cr-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
          gap: 18px;
          align-items: start;
        }
        .cr-left {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cr-right { position: relative; }
        .cr-preview-sticky {
          position: sticky;
          top: 20px;
        }

        /* Section card */
        .cr-section {
          background: #fff;
          border: 1px solid #e2dfd7;
          border-radius: 15px;
          overflow: visible;
          box-sizing: border-box;
        }
        .cr-preview-section {
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .cr-section-head {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          padding: 0 20px;
          border-bottom: 1px solid #e4e1da;
          box-sizing: border-box;
        }
        .cr-section-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #f1f0ec;
          border: 1px solid #e0ddd5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          color: #888580;
          flex-shrink: 0;
        }
        .cr-section-head h2 {
          margin: 0;
          font-family: var(--serif), 'DM Serif Display', Georgia, serif;
          font-size: 16px;
          font-weight: 400;
          color: #10130f;
        }
        .cr-optional {
          margin-left: 8px;
          font-family: var(--sans), 'DM Sans', sans-serif;
          font-size: 9px;
          letter-spacing: .8px;
          color: #aaa6a0;
        }

        /* Form grid */
        .cr-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 18px 20px;
          box-sizing: border-box;
        }
        .cr-field { display: flex; flex-direction: column; gap: 6px; }
        .cr-field-full { grid-column: 1 / -1; }

        /* Labels / hints */
        .cr-label {
          font-size: 8px;
          letter-spacing: 1px;
          color: #aaa6a0;
          font-family: var(--sans), 'DM Sans', sans-serif;
        }
        .cr-hint {
          font-size: 10px;
          color: #b0ac9f;
          font-family: var(--sans), 'DM Sans', sans-serif;
        }

        /* Inputs */
        .cr-input, .cr-select, .cr-textarea {
          width: 100%;
          box-sizing: border-box;
          height: 34px;
          padding: 0 11px;
          border: 1px solid #e0ddd5;
          border-radius: 9px;
          background: #fcfcf9;
          font-family: var(--sans), 'DM Sans', sans-serif;
          font-size: 11px;
          color: #11140f;
          outline: none;
          transition: border-color .15s;
          appearance: none;
          -webkit-appearance: none;
        }
        .cr-textarea {
          height: auto;
          padding: 9px 11px;
          resize: vertical;
          line-height: 1.5;
        }
        .cr-input:focus, .cr-select:focus, .cr-textarea:focus { border-color: #9bb48c; }
        .cr-input-readonly { background: #f5f4ef; color: #8a877f; cursor: default; }
        .cr-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23aaa6a0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 11px center;
          padding-right: 28px;
          cursor: pointer;
        }

        /* Radio / checkbox */
        .cr-radio-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .cr-radio-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; color: #4a4843; cursor: pointer;
        }
        .cr-check-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; color: #4a4843; cursor: pointer; margin-bottom: 9px;
        }

        /* Toggle group */
        .cr-toggle-group {
          display: inline-flex;
          background: #f1f0ec;
          border-radius: 9px;
          padding: 3px;
          gap: 2px;
        }
        .cr-toggle-btn {
          height: 27px; padding: 0 12px;
          border: 0; border-radius: 6px; background: transparent;
          font-family: var(--sans), 'DM Sans', sans-serif;
          font-size: 9px; letter-spacing: .6px; color: #99968f;
          cursor: pointer; white-space: nowrap;
        }
        .cr-toggle-btn.active { background: #fff; color: #181a16; box-shadow: 0 1px 3px rgba(0,0,0,.08); }

        /* Tag chips */
        .cr-tag-area {
          min-height: 36px;
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 6px 10px;
          border: 1px solid #e0ddd5; border-radius: 9px; background: #fcfcf9;
          box-sizing: border-box;
        }
        .cr-tag {
          display: inline-flex; align-items: center; gap: 5px;
          height: 22px; padding: 0 9px;
          background: #eeeef5; border-radius: 8px;
          font-size: 9px; color: #5a5870; white-space: nowrap;
        }
        .cr-tag-remove { background: none; border: none; padding: 0; cursor: pointer; font-size: 13px; color: #9c6861; line-height: 1; }

        /* Dropdown */
        .cr-drop-wrap { position: relative; }
        .cr-drop-menu {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
          min-width: 180px; background: #fff;
          border: 1px solid #e0ddd5; border-radius: 10px;
          box-shadow: 0 6px 20px rgba(0,0,0,.09);
          max-height: 220px; overflow-y: auto;
        }
        .cr-drop-item {
          display: block; width: 100%; text-align: left;
          padding: 8px 13px; border: none; background: none;
          font-size: 11px; color: #4a4843; cursor: pointer;
          font-family: var(--sans), 'DM Sans', sans-serif;
        }
        .cr-drop-item:hover { background: #f5f4ef; }
        .cr-drop-empty { display: block; padding: 8px 13px; font-size: 10px; color: #aaa6a0; }

        /* Inline add link (inside tag area) */
        .cr-add-link-inline {
          background: none; border: none; padding: 2px 4px;
          font-size: 10px; font-family: var(--sans), 'DM Sans', sans-serif;
          color: #6b8a62; cursor: pointer; white-space: nowrap;
        }
        .cr-add-link-inline:hover { color: #4e6c47; }

        /* Add link (standalone) */
        .cr-add-link {
          background: none; border: none; padding: 0 20px;
          font-size: 10px; font-family: var(--sans), 'DM Sans', sans-serif;
          color: #6b8a62; cursor: pointer; display: block;
          text-align: left; margin-top: 10px; margin-bottom: 16px;
        }
        .cr-add-link:hover, .cr-add-link-inline:hover { color: #4e6c47; }

        /* Filters */
        .cr-filter-top {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px 4px; flex-wrap: wrap;
        }
        .cr-filter-list {
          display: flex; flex-direction: column; gap: 8px;
          padding: 10px 20px 0;
        }
        .cr-filter-row { display: flex; align-items: center; gap: 8px; }
        .cr-filter-field { flex: 1.2; min-width: 0; }
        .cr-filter-op    { flex: 1;   min-width: 0; }
        .cr-filter-val   { flex: 1.2; min-width: 0; }

        /* Group by */
        .cr-group-list { display: flex; flex-direction: column; gap: 8px; padding: 14px 20px 0; }
        .cr-group-label { min-width: 68px; flex-shrink: 0; }

        /* Icon button */
        .cr-icon-btn {
          width: 32px; height: 32px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #e0ddd5; border-radius: 8px;
          background: #fff; font-size: 14px; cursor: pointer; color: #aaa6a0;
        }
        .cr-danger { color: #9c6861; border-color: #f0dbd8; }
        .cr-danger:hover { background: #fdf3f2; }

        /* Calc table */
        .cr-calc-table { padding: 14px 20px 0; }
        .cr-calc-header, .cr-calc-row {
          display: grid;
          grid-template-columns: 1.2fr 90px 1fr 32px;
          gap: 8px; align-items: center;
        }
        .cr-calc-header { margin-bottom: 6px; font-size: 8px; letter-spacing: 1px; color: #aaa6a0; }
        .cr-calc-row { margin-bottom: 8px; }

        /* KPI grid cols override */
        .cr-kpi-cols { grid-template-columns: 1fr 1fr 80px 80px 60px 32px; }

        /* Visualization */
        .cr-viz-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px; padding: 16px 20px 20px;
        }
        .cr-viz-card {
          position: relative; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          min-height: 74px;
          border: 1.5px solid #e2dfd7; border-radius: 12px; background: #fcfcf9;
          cursor: pointer; transition: border-color .15s, background .15s;
        }
        .cr-viz-card.active { border-color: #9bb48c; background: #f4f8f2; }
        .cr-viz-card:hover:not(.active) { border-color: #c8c4bb; }
        .cr-viz-icon-txt { font-size: 9px; letter-spacing: .5px; color: #88857f; font-weight: 600; }
        .cr-viz-card.active .cr-viz-icon-txt { color: #5c7455; }
        .cr-viz-label { font-size: 9px; letter-spacing: .3px; color: #88857f; }
        .cr-viz-card.active .cr-viz-label { color: #3e5c38; }
        .cr-viz-check { position: absolute; top: 5px; right: 8px; font-size: 10px; color: #6b8a62; }

        /* Toggle switch */
        .cr-toggle-row { display: flex; align-items: center; gap: 10px; padding: 14px 20px 4px; }
        .cr-switch { position: relative; display: inline-block; width: 34px; height: 20px; flex-shrink: 0; }
        .cr-switch input { opacity: 0; width: 0; height: 0; }
        .cr-switch-track {
          position: absolute; inset: 0; border-radius: 20px;
          background: #dedad3; cursor: pointer; transition: background .2s;
        }
        .cr-switch-track::after {
          content: ''; position: absolute; top: 3px; left: 3px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #fff; transition: transform .2s;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
        }
        .cr-switch input:checked + .cr-switch-track { background: #9bb48c; }
        .cr-switch input:checked + .cr-switch-track::after { transform: translateX(14px); }

        /* Export cols */
        .cr-export-cols { display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; padding: 16px 20px 20px; }

        /* User chips */
        .cr-user-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
        .cr-user-chip {
          height: 26px; padding: 0 10px;
          border: 1px solid #e0ddd5; border-radius: 8px;
          background: #fcfcf9; font-size: 9px; color: #6b8a62;
          cursor: pointer; font-family: var(--sans), 'DM Sans', sans-serif;
        }
        .cr-user-chip:hover { background: #f4f8f2; border-color: #9bb48c; }

        /* Status messages */
        .cr-status-msg { margin: 14px 20px 0; padding: 10px 14px; border-radius: 9px; font-size: 11px; }
        .cr-status-ok { background: #edf4ea; color: #3e6836; }
        .cr-status-draft { background: #ebe9e2; color: #5a5245; }

        /* Save actions */
        .cr-save-actions {
          display: flex; align-items: center; justify-content: flex-end; gap: 9px;
          padding: 16px 20px; border-top: 1px solid #e4e1da; margin-top: 14px;
        }
        .cr-btn-ghost, .cr-btn-outline, .cr-btn-dark {
          height: 36px; padding: 0 18px; border-radius: 10px;
          font-family: var(--sans), 'DM Sans', sans-serif;
          font-size: 10px; cursor: pointer; white-space: nowrap;
        }
        .cr-btn-ghost { background: #fff; border: 1px solid #e0ddd5; color: #4a4843; }
        .cr-btn-ghost:hover { background: #f5f4ef; }
        .cr-btn-outline { background: #fff; border: 1px solid #9bb48c; color: #5c7455; }
        .cr-btn-outline:hover { background: #f4f8f2; }
        .cr-btn-dark { background: #111410; border: 1px solid #111410; color: #fff; }
        .cr-btn-dark:hover { background: #1e2119; }

        /* Preview panel */
        .cr-preview-meta { padding: 14px 18px 10px; }
        .cr-preview-title {
          font-family: var(--serif), 'DM Serif Display', Georgia, serif;
          font-size: 15px; font-weight: 400; color: #10130f; margin-bottom: 4px;
        }
        .cr-preview-sub { font-size: 9px; color: #aaa6a0; letter-spacing: .5px; margin-bottom: 6px; }
        .cr-preview-badge {
          display: inline-flex; align-items: center;
          height: 18px; padding: 0 8px;
          background: #f1f0ec; border-radius: 6px; font-size: 8px; color: #888580;
        }
        .cr-preview-chart { padding: 8px 14px 4px; }
        .cr-preview-kpi-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px; padding: 10px 18px;
        }
        .cr-preview-kpi { background: #f5f4ef; border-radius: 10px; padding: 10px 12px; }
        .cr-preview-kpi-label { font-size: 7px; letter-spacing: 1px; color: #aaa6a0; margin-bottom: 4px; }
        .cr-preview-kpi-val {
          font-family: var(--serif), 'DM Serif Display', Georgia, serif;
          font-size: 17px; color: #10130f;
        }

        /* Preview table */
        .cr-preview-table-wrap { overflow-x: auto; padding: 0 14px; margin-top: 4px; }
        .cr-preview-table {
          width: 100%; border-collapse: collapse; font-size: 10px; min-width: 320px;
        }
        .cr-preview-table th {
          padding: 6px 8px; background: #f5f4ef; border-bottom: 1px solid #e4e1da;
          font-size: 7px; letter-spacing: .8px; color: #aaa6a0; text-align: left; white-space: nowrap;
        }
        .cr-preview-table td {
          padding: 9px 8px; border-bottom: 1px solid #eeecea; color: #4a4843; white-space: nowrap;
        }
        .cr-preview-table tr:last-child td { border-bottom: none; }
        .cr-preview-amount { font-family: var(--sans), 'DM Sans', sans-serif; color: #10130f; }

        /* Status badges */
        .cr-status-badge {
          display: inline-flex; align-items: center;
          height: 18px; padding: 0 7px; border-radius: 6px;
          font-size: 8px; font-family: var(--sans), 'DM Sans', sans-serif;
        }
        .cr-status-paid { background: #e8f0e4; color: #4e6d45; }
        .cr-status-pending { background: #eeeef5; color: #5c5c78; }
        .cr-status-overdue { background: #f5ebe9; color: #8a4a44; }

        /* Update preview button */
        .cr-update-preview-btn {
          display: block; width: calc(100% - 28px);
          margin: 12px 14px 16px; height: 32px;
          border: 1px solid #e0ddd5; border-radius: 9px; background: #fff;
          font-family: var(--sans), 'DM Sans', sans-serif;
          font-size: 9px; letter-spacing: .5px; color: #6b8a62; cursor: pointer;
        }
        .cr-update-preview-btn:hover { background: #f4f8f2; border-color: #9bb48c; }

        /* Responsive */
        @media (max-width: 1100px) {
          .cr-layout { grid-template-columns: 1fr; }
          .cr-right { order: -1; }
          .cr-preview-sticky { position: static; }
          .cr-preview-section { max-height: none; overflow-y: visible; }
          .cr-viz-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 700px) {
          .cr-page { padding: 18px 16px 60px; }
          .cr-form-grid { grid-template-columns: 1fr; }
          .cr-field-full { grid-column: 1; }
          .cr-viz-grid { grid-template-columns: repeat(3, 1fr); }
          .cr-export-cols { grid-template-columns: 1fr; }
          .cr-save-actions { flex-direction: column; align-items: stretch; }
          .cr-calc-header, .cr-calc-row { grid-template-columns: 1fr 80px 1fr 32px; }
          .cr-kpi-cols { grid-template-columns: 1fr 1fr 70px 70px 50px 32px; }
        }

      `}</style>
    </div>
  );
};

export default CustomReport;
