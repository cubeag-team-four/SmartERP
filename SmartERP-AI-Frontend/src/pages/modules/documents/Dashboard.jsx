import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/slices/auth.store";
import { ROUTES } from "../../../core/constants/routes.constant";
import "./documents.css";
import NewDocumentModal from "./NewDocumentModal";

// ─── Role → upload route ──────────────────────────────────────────────────────
const UPLOAD_ROUTES = {
  superAdmin:        ROUTES.SUPER_ADMIN_DOCUMENTS_UPLOAD,
  admin:             ROUTES.ADMIN_DOCUMENTS_UPLOAD,
  financeManager:    ROUTES.ADMIN_DOCUMENTS_UPLOAD,
  salesManager:      ROUTES.ADMIN_DOCUMENTS_UPLOAD,
  hrManager:         ROUTES.ADMIN_DOCUMENTS_UPLOAD,
  operationsManager: ROUTES.ADMIN_DOCUMENTS_UPLOAD,
  employee:          ROUTES.EMPLOYEE_DOCUMENTS,
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_STATS = {
  totalDocuments:       892,
  documentsThisMonth:   42,
  ocrAccuracy:          99,
  ocrExtractedCount:    884,
  pendingApprovalCount: 1,
  storageUsedGb:        12.4,
  storageRemainingGb:   87.6,
  processingDocuments:  1,
  indexedDocuments:     892,
};

const MOCK_ALL_DOCUMENTS = [
  { id: 1,  title: "Tata Steel Purchase Bill — Aug 2026",     type: "Vendor Invoice", fileSize: 290000,  createdAt: "2026-08-10", tags: "purchase,steel",  ocrCompleted: true,  status: "approved" },
  { id: 2,  title: "Bajaj Auto Sales Order — Q3 2026",        type: "Sales Order",    fileSize: 520000,  createdAt: "2026-08-08", tags: "sales,auto",      ocrCompleted: true,  status: "approved" },
  { id: 3,  title: "Vendor Contract — Infosys BPO Services",  type: "Contract",       fileSize: 890000,  createdAt: "2026-08-05", tags: "contract,it",     ocrCompleted: true,  status: "pending"  },
  { id: 4,  title: "Employee Offer Letter — Rohan Sharma",    type: "HR Document",    fileSize: 310000,  createdAt: "2026-08-03", tags: "hr,onboarding",   ocrCompleted: false, status: "pending"  },
  { id: 5,  title: "GST Filing — July 2026",                  type: "Tax Document",   fileSize: 670000,  createdAt: "2026-07-31", tags: "tax,gst",         ocrCompleted: true,  status: "approved" },
  { id: 6,  title: "Q2 Financial Report — FY 2026-27",        type: "Report",         fileSize: 2100000, createdAt: "2026-07-28", tags: "finance,report",  ocrCompleted: true,  status: "approved" },
  { id: 7,  title: "MSME Vendor Invoice — Ram Steels",        type: "Vendor Invoice", fileSize: 430000,  createdAt: "2026-07-25", tags: "purchase,msme",   ocrCompleted: true,  status: "rejected" },
  { id: 8,  title: "Non-Disclosure Agreement — Partner Co.",  type: "Contract",       fileSize: 215000,  createdAt: "2026-07-20", tags: "legal,nda",       ocrCompleted: true,  status: "approved" },
];

const MOCK_APPROVALS = [
  { id: 1, documentTitle: "Factory Lease Renewal",                  documentType: "Contract",       submittedByName: "Vikram Joshi",  submittedAt: "2026-08-05", dueDate: "2026-08-12" },
  { id: 2, documentTitle: "Tata Steel Purchase Bill — Aug 2026",    documentType: "Vendor Invoice", submittedByName: "Arjun Mehta",   submittedAt: "2026-08-10", dueDate: "2026-08-15" },
  { id: 3, documentTitle: "Employee Offer Letter — Rohan Sharma",   documentType: "HR Document",    submittedByName: "Kavita Nair",   submittedAt: "2026-08-06", dueDate: "2026-08-18" },
];

const MOCK_MY_UPLOADS = [
  { id: 1, title: "Tata Steel Purchase Bill — Aug 2026",    type: "Vendor Invoice", fileSize: 290000,  uploadedAt: "2026-08-08", status: "approved" },
  { id: 2, title: "Hero MotoCorp Sales Order SO-412",       type: "Sales Order",    fileSize: 145000,  uploadedAt: "2026-08-07", status: "active"   },
  { id: 3, title: "Factory Lease Renewal — Pune MIDC",     type: "Contract",       fileSize: 1258000, uploadedAt: "2026-08-05", status: "pending"  },
  { id: 4, title: "GST Filing — July 2026",                 type: "Tax Document",   fileSize: 670000,  uploadedAt: "2026-07-31", status: "approved" },
  { id: 5, title: "Q2 Financial Report — FY 2026-27",       type: "Report",         fileSize: 2100000, uploadedAt: "2026-07-28", status: "approved" },
];

const MOCK_OCR_LATEST = {
  documentTitle: "Tata Steel Purchase Bill",
  vendor:        "Tata Steel Ltd",
  invoiceNo:     "TS/2026/08/4821",
  date:          "05 Aug 2026",
  amount:        "₹18,40,000",
  gstin:         "27TATST1234F1Z8",
  hsnCode:       "7208",
  confidence:    97.4,
};

const MOCK_OCR_STATS = [
  { label: "Documents Processed", helper: "This month: 42",    value: "892"  },
  { label: "Avg. Accuracy",        helper: "Target: 98%",       value: "99.1%" },
  { label: "Auto-posted to GL",    helper: "608/892 docs",      value: "68%"  },
  { label: "Manual Review",        helper: "Needs verification", value: "32"   },
];

// ─── Type filter options ──────────────────────────────────────────────────────
const DOCUMENT_TYPES = [
  { value: "",               label: "All"            },
  { value: "Vendor Invoice", label: "Vendor Invoice" },
  { value: "Sales Order",    label: "Sales Order"    },
  { value: "Contract",       label: "Contract"       },
  { value: "HR Document",    label: "HR Document"    },
  { value: "Tax Document",   label: "Tax Document"   },
  { value: "Report",         label: "Report"         },
];

const FILE_ICONS = {
  "Vendor Invoice": "📄",
  "Sales Order":    "📝",
  "Contract":       "📋",
  "HR Document":    "👤",
  "Tax Document":   "🧾",
  "Report":         "📊",
};

const TABS = [
  { label: "ALL DOCUMENTS",    key: "all"       },
  { label: "PENDING APPROVAL", key: "approvals" },
  { label: "MY UPLOADS",       key: "uploads"   },
  { label: "OCR EXTRACTIONS",  key: "ocr"       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSize = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ value, label, helper }) {
  return (
    <div className="doc-kpi-card">
      <div className="doc-kpi-value">{value}</div>
      <div className="doc-kpi-label">{label}</div>
      <div className="doc-kpi-helper">{helper}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const v = String(status || "active").toLowerCase();
  return (
    <span className={`doc-status doc-status--${v}`}>
      {v.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

// ── Tab: ALL DOCUMENTS ────────────────────────────────────────────────────────
function TabAllDocuments() {
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = MOCK_ALL_DOCUMENTS.filter((doc) => {
    const q = search.toLowerCase();
    const matchSearch = !q || doc.title.toLowerCase().includes(q) || doc.tags.toLowerCase().includes(q);
    const matchType   = !typeFilter || doc.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <div className="doc-filter-row">
        <div className="doc-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, tags..."
          />
        </div>
        <div className="doc-filter-buttons">
          {DOCUMENT_TYPES.map((item) => (
            <button
              key={item.value}
              className={typeFilter === item.value ? "active" : ""}
              onClick={() => setTypeFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="doc-list">
        {filtered.map((doc) => (
          <div className="doc-row" key={doc.id}>
            <div className="doc-row-left">
              <div className="doc-file-icon">{FILE_ICONS[doc.type] || "📄"}</div>
              <div>
                <h3>{doc.title}</h3>
                <div className="doc-meta">
                  <span>{doc.type}</span>
                  <span>·</span>
                  <span>{formatSize(doc.fileSize)}</span>
                  <span>·</span>
                  <span>{fmtDate(doc.createdAt)}</span>
                  {doc.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span className="doc-tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="doc-row-right">
              <span className={doc.ocrCompleted ? "ocr-complete" : "ocr-processing"}>
                {doc.ocrCompleted ? "✓ OCR" : "○ OCR..."}
              </span>
              <StatusBadge status={doc.status} />
              <button className="download-button" title="Download">↓</button>
            </div>
          </div>
        ))}
        {!filtered.length && <div className="doc-empty">No documents match your search.</div>}
      </div>
    </>
  );
}

// ── Tab: PENDING APPROVAL ─────────────────────────────────────────────────────
function TabPendingApproval() {
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const approve = (id) => setApprovals((prev) => prev.filter((a) => a.id !== id));
  const reject  = (id) => setApprovals((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="doc-list">
      {approvals.map((a) => (
        <div className="doc-row" key={a.id}>
          <div className="doc-row-left">
            <div className="doc-file-icon" style={{ fontSize: 22 }}>📋</div>
            <div>
              <h3>{a.documentTitle}</h3>
              <div className="doc-meta">
                <span>{a.documentType}</span>
                <span>·</span>
                <span>Submitted by {a.submittedByName} on {fmtDate(a.submittedAt)}</span>
              </div>
            </div>
          </div>

          <div className="approval-actions">
            <span className="due-date">Due: {fmtDate(a.dueDate)}</span>
            <button className="doc-btn doc-btn-light">View Doc</button>
            <button className="doc-btn approve-button" onClick={() => approve(a.id)}>Approve</button>
            <button className="doc-btn reject-button"  onClick={() => reject(a.id)}>Reject</button>
          </div>
        </div>
      ))}
      {!approvals.length && (
        <div className="doc-empty">All caught up — no pending approvals.</div>
      )}
    </div>
  );
}

// ── Tab: MY UPLOADS ───────────────────────────────────────────────────────────
function TabMyUploads() {
  return (
    <div className="doc-list">
      {MOCK_MY_UPLOADS.map((doc) => (
        <div className="doc-row" key={doc.id}>
          <div className="doc-row-left">
            <div className="doc-file-icon" style={{ fontSize: 22 }}>📄</div>
            <div>
              <h3>{doc.title}</h3>
              <div className="doc-meta">
                <span>{doc.type}</span>
                <span>·</span>
                <span>{formatSize(doc.fileSize)}</span>
                <span>·</span>
                <span>{fmtDate(doc.uploadedAt)}</span>
              </div>
            </div>
          </div>
          <div className="doc-row-right">
            <StatusBadge status={doc.status} />
            <button className="download-button" title="Download">↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: OCR EXTRACTIONS ──────────────────────────────────────────────────────
function TabOcrExtractions() {
  const fields = [
    { label: "Vendor",      value: MOCK_OCR_LATEST.vendor     },
    { label: "Invoice No.", value: MOCK_OCR_LATEST.invoiceNo  },
    { label: "Date",        value: MOCK_OCR_LATEST.date       },
    { label: "Amount",      value: MOCK_OCR_LATEST.amount     },
    { label: "GSTIN",       value: MOCK_OCR_LATEST.gstin      },
    { label: "HSN Code",    value: MOCK_OCR_LATEST.hsnCode    },
  ];

  return (
    <div className="overview-grid">

      {/* Latest extraction ── */}
      <div className="overview-panel">
        <h2>Latest Extraction</h2>
        <div className="extraction-card">
          <div className="extraction-title">
            DOCUMENT: {MOCK_OCR_LATEST.documentTitle.toUpperCase()}
          </div>
          {fields.map(({ label, value }) => (
            <div className="overview-metric" key={label}>
              <div><span>{label}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{value}</strong>
                <span style={{ color: "#7aad60", fontSize: 13 }}>✓</span>
              </div>
            </div>
          ))}
        </div>
        <div className="extraction-footer">
          <span>{MOCK_OCR_LATEST.confidence}% confidence</span>
          <button className="doc-btn doc-btn-light">Auto-post to GL →</button>
        </div>
      </div>

      {/* OCR Stats ── */}
      <div className="overview-panel">
        <h2>OCR Stats</h2>
        <div className="ocr-stats">
          {MOCK_OCR_STATS.map(({ label, helper, value }) => (
            <div className="overview-metric" key={label}>
              <div>
                <span>{label}</span>
                <small>{helper}</small>
              </div>
              <strong style={{ fontSize: 22 }}>{value}</strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const uploadRoute = UPLOAD_ROUTES[user?.role] || ROUTES.ADMIN_DOCUMENTS_UPLOAD;

  const [activeTab, setActiveTab] = useState("all");
  const [newDocOpen, setNewDocOpen] = useState(false);

  return (
    <div className="documents-page">

      {/* ── Page header ── */}
      <div className="doc-title-row">
        <div>
          <div className="doc-eyebrow">DOCUMENTS</div>
          <h1>Document Management</h1>
        </div>
        <div className="doc-header-actions">
          <button className="doc-btn doc-btn-light" onClick={() => navigate(uploadRoute)}>
            ↑ Upload
          </button>
          <button className="doc-btn doc-btn-dark" onClick={() => setNewDocOpen(true)}>
            + New Document
          </button>
        </div>
      </div>

      {/* ── AI OCR Banner ── */}
      <div className="doc-ai-banner">
        <div className="doc-ai-content">
          <div className="doc-ai-icon">🤖</div>
          <div>
            <strong>AI OCR Processing Active</strong>
            <p>
              {MOCK_STATS.processingDocuments} document processing
              {" · "}
              {MOCK_STATS.indexedDocuments} documents indexed
              {" · "}
              Smart search enabled
            </p>
          </div>
        </div>
        <div className="doc-active">
          <span />
          Active
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="doc-kpi-grid">
        <KpiCard
          value={MOCK_STATS.totalDocuments}
          label="TOTAL DOCUMENTS"
          helper={`↑ ${MOCK_STATS.documentsThisMonth} this month`}
        />
        <KpiCard
          value={`${MOCK_STATS.ocrAccuracy}%`}
          label="OCR ACCURACY"
          helper={`${MOCK_STATS.ocrExtractedCount}/${MOCK_STATS.totalDocuments} extracted`}
        />
        <KpiCard
          value={MOCK_STATS.pendingApprovalCount}
          label="PENDING APPROVAL"
          helper="Due by 12 Aug"
        />
        <KpiCard
          value={`${MOCK_STATS.storageUsedGb} GB`}
          label="STORAGE USED"
          helper={`${MOCK_STATS.storageRemainingGb} GB remaining`}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="doc-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content rendered inline ── */}
      {activeTab === "all"       && <TabAllDocuments />}
      {activeTab === "approvals" && <TabPendingApproval />}
      {activeTab === "uploads"   && <TabMyUploads />}
      {activeTab === "ocr"       && <TabOcrExtractions />}

      <NewDocumentModal open={newDocOpen} onClose={() => setNewDocOpen(false)} />

    </div>
  );
}
