import { useState, useRef, useEffect } from "react";

/* ================================================================
   CONSTANTS
================================================================ */
const DOC_TYPES = [
  "Vendor Invoice", "Sales Order", "Contract", "HR Document",
  "Tax Document", "Report", "Purchase Order", "Delivery Note",
  "Credit Note", "Debit Note", "Legal Agreement", "Other",
];

const CATEGORIES = [
  "Finance", "HR", "Legal", "Operations", "Sales",
  "Purchase", "Compliance", "IT", "General",
];

const SUB_CATEGORIES = {
  Finance:    ["Invoice", "Receipt", "Budget", "Audit Report"],
  HR:         ["Offer Letter", "Contract", "Policy", "Appraisal"],
  Legal:      ["Agreement", "NDA", "License", "MOU"],
  Operations: ["SOP", "Work Order", "Delivery Note", "Inspection"],
  Sales:      ["Quotation", "Sales Order", "Invoice", "Agreement"],
  Purchase:   ["Purchase Order", "Vendor Invoice", "GRN", "Bill"],
  Compliance: ["License", "Certificate", "Filing", "Report"],
  IT:         ["Software License", "Asset Register", "Policy"],
  General:    ["Memo", "Circular", "Notice", "Other"],
};

const MODULES    = ["Finance", "HR", "Sales", "Purchase", "Projects", "CRM", "Inventory", "Manufacturing"];
const COMPANIES  = ["ABC Manufacturing Pvt Ltd", "XYZ Corp", "SmartERP Solutions"];
const BRANCHES   = ["Pune Branch", "Mumbai Branch", "Delhi Branch", "Bangalore Branch"];
const DEPARTMENTS= ["Finance", "HR", "IT", "Sales", "Operations", "Admin", "Legal"];
const VENDORS    = ["Tata Steel Ltd", "Infosys BPO", "Hero MotoCorp", "Bajaj Auto", "Reliance Industries"];
const EMPLOYEES  = ["Rohit Sharma", "Neha Verma", "Amit Patel", "Priya Singh", "Rahul Joshi"];
const APPROVERS  = ["Amit Sharma", "Neha Verma", "Rahul Patil", "Sneha Shah"];
const WORKFLOWS  = ["Standard Approval", "Finance Approval", "Legal Review", "HR Approval", "Two-Step Approval"];
const ACCESS     = ["Public", "Private", "Restricted", "Department Only", "Management Only"];
const OCR_LANGS  = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Gujarati", "Mixed"];
const OCR_TMPLS  = ["Vendor Invoice", "Purchase Order", "Sales Order", "HR Document", "Generic"];

/* ================================================================
   HELPERS
================================================================ */
const Field = ({ label, required, children, className = "" }) => (
  <div className={`doc-field ${className}`}>
    <label className="doc-field-label">
      {label}{required && <span className="doc-required">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ className = "", ...props }) => (
  <input className={`doc-input ${className}`} {...props} />
);

const Sel = ({ children, className = "", ...props }) => (
  <div className="doc-select-wrap">
    <select className={`doc-select ${className}`} {...props}>{children}</select>
    <svg className="doc-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const DatePick = ({ value, onChange, placeholder }) => (
  <div className="doc-date-wrap">
    <input type="date" value={value} onChange={onChange}
      placeholder={placeholder} className="doc-input doc-date-input" />
    <svg className="doc-date-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="doc-toggle-row">
    <div
      onClick={() => onChange(!checked)}
      className={`doc-toggle ${checked ? "doc-toggle--on" : ""}`}
    >
      <div className="doc-toggle-knob" />
    </div>
    {label && <span className="doc-toggle-label">{label}</span>}
  </label>
);

const SectionBlock = ({ number, title, children }) => (
  <div className="ndoc-section">
    <div className="ndoc-section-head">
      <span className="ndoc-section-num">{number}.</span>
      <span className="ndoc-section-title">{title}</span>
    </div>
    <div className="ndoc-section-body">{children}</div>
  </div>
);

/* ================================================================
   MODAL
================================================================ */
const NewDocumentModal = ({ open, onClose }) => {
  /* ---- state ---- */
  const [title,          setTitle]          = useState("");
  const [docType,        setDocType]        = useState("");
  const [docNumber,      setDocNumber]      = useState("");
  const [docDate,        setDocDate]        = useState("");
  const [effectiveDate,  setEffectiveDate]  = useState("");
  const [expiryDate,     setExpiryDate]     = useState("");
  const [description,    setDescription]    = useState("");

  const [file,           setFile]           = useState(null);
  const [dragging,       setDragging]       = useState(false);
  const [version,        setVersion]        = useState("1.0");

  const [category,       setCategory]       = useState("");
  const [subCategory,    setSubCategory]    = useState("");
  const [tags,           setTags]           = useState([]);
  const [tagInput,       setTagInput]       = useState("");
  const [company,        setCompany]        = useState("");
  const [branch,         setBranch]         = useState("");
  const [department,     setDepartment]     = useState("");

  const [relatedModule,  setRelatedModule]  = useState("");
  const [relatedRecord,  setRelatedRecord]  = useState("");
  const [vendor,         setVendor]         = useState("");
  const [docOwner,       setDocOwner]       = useState("");
  const [employee,       setEmployee]       = useState("");

  const [enableOcr,      setEnableOcr]      = useState(true);
  const [autoExtract,    setAutoExtract]    = useState(true);
  const [ocrLang,        setOcrLang]        = useState("English");
  const [ocrTemplate,    setOcrTemplate]    = useState("");

  const [approvalRequired, setApprovalRequired] = useState(false);
  const [workflow,       setWorkflow]       = useState("");
  const [approver,       setApprover]       = useState("");
  const [accessLevel,    setAccessLevel]    = useState("");
  const [sharedWith,     setSharedWith]     = useState("");

  const [confidential,   setConfidential]   = useState(false);
  const [allowDownload,  setAllowDownload]  = useState(true);
  const [allowPrint,     setAllowPrint]     = useState(false);
  const [allowShare,     setAllowShare]     = useState(false);

  const [internalNotes,  setInternalNotes]  = useState("");
  const [comments,       setComments]       = useState("");

  const fileRef = useRef();
  const bodyRef = useRef();

  /* reset on open */
  useEffect(() => {
    if (open) {
      setTitle(""); setDocType(""); setDocNumber(""); setDocDate("");
      setEffectiveDate(""); setExpiryDate(""); setDescription("");
      setFile(null); setVersion("1.0"); setCategory(""); setSubCategory("");
      setTags([]); setTagInput(""); setCompany(""); setBranch(""); setDepartment("");
      setRelatedModule(""); setRelatedRecord(""); setVendor(""); setDocOwner(""); setEmployee("");
      setEnableOcr(true); setAutoExtract(true); setOcrLang("English"); setOcrTemplate("");
      setApprovalRequired(false); setWorkflow(""); setApprover(""); setAccessLevel(""); setSharedWith("");
      setConfidential(false); setAllowDownload(true); setAllowPrint(false); setAllowShare(false);
      setInternalNotes(""); setComments("");
    }
  }, [open]);

  /* escape key */
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  /* file handling */
  const handleFiles = (files) => {
    const f = Array.from(files)[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return;
    setFile({ name: f.name, type: f.type || f.name.split(".").pop().toUpperCase(), size: (f.size / 1024).toFixed(0) + " KB", raw: f });
  };

  /* tag handling */
  const addTag = (v) => {
    const t = v.trim();
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const subCatOptions = SUB_CATEGORIES[category] || [];

  /* ----------------------------------------------------------------
     RENDER
  ---------------------------------------------------------------- */
  return (
    <div
      className="ndoc-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ndoc-modal">

        {/* ---- TOP BAR ---- */}
        <div className="ndoc-topbar">
          <div>
            <button className="ndoc-back" onClick={onClose}>← Back to Documents</button>
            <h2 className="ndoc-title">New Document</h2>
            <p className="ndoc-subtitle">Upload and manage a new document</p>
          </div>
          <div className="ndoc-topbar-actions">
            <button className="ndoc-btn ndoc-btn-outline" onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M1 13V4.5L7 1l6 3.5V13H9v-4H5v4H1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              Save Draft
            </button>
            <button className="ndoc-btn ndoc-btn-dark" onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 10V3m0 0L4 6m3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 11h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Upload Document
            </button>
            <button className="ndoc-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* ---- BODY ---- */}
        <div className="ndoc-body" ref={bodyRef}>

          {/* ========== 1. DOCUMENT INFORMATION ========== */}
          <SectionBlock number="1" title="DOCUMENT INFORMATION">
            <div className="ndoc-grid-3">
              <Field label="Document Title" required>
                <Input placeholder="Enter document title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Document Type" required>
                <Sel value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="">Select document type</option>
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Sel>
              </Field>
              <Field label="Document Number">
                <Input placeholder="Enter document number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
              </Field>
            </div>
            <div className="ndoc-grid-3 ndoc-mt">
              <Field label="Document Date">
                <DatePick value={docDate} onChange={(e) => setDocDate(e.target.value)} placeholder="Select date" />
              </Field>
              <Field label="Effective Date">
                <DatePick value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} placeholder="Select date" />
              </Field>
              <Field label="Expiry Date">
                <DatePick value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="Select date" />
              </Field>
            </div>
            <div className="ndoc-mt">
              <Field label="Description">
                <textarea
                  className="ndoc-textarea"
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter document description..."
                />
                <span className="ndoc-char-count">{description.length}/500</span>
              </Field>
            </div>
          </SectionBlock>

          {/* ========== 2. UPLOAD DOCUMENT ========== */}
          <SectionBlock number="2" title="UPLOAD DOCUMENT">
            <div className="ndoc-upload-row">
              {/* Drop zone */}
              <div
                className={`ndoc-dropzone ${dragging ? "ndoc-dropzone--active" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="ndoc-upload-icon">
                  <path d="M18 26V16m0 0l-5 5m5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M30 24A6 6 0 0 0 28 13h-2A11 11 0 1 0 7 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="ndoc-drop-main">Drag & drop file here</p>
                <p className="ndoc-drop-or">or</p>
                <button type="button" className="ndoc-browse-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                  Browse Files
                </button>
                <p className="ndoc-drop-hint">PDF, DOCX, XLSX, JPG, PNG up to 25 MB</p>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" className="ndoc-hidden"
                  onChange={(e) => handleFiles(e.target.files)} />
              </div>

              {/* File info panel */}
              <div className="ndoc-file-panel">
                <div className="ndoc-file-panel-head">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h6l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="#91a0a0" strokeWidth="1.3"/>
                    <path d="M9 2v4h4" stroke="#91a0a0" strokeWidth="1.3"/>
                  </svg>
                  {file ? (
                    <span className="ndoc-file-name">{file.name}</span>
                  ) : (
                    <span className="ndoc-no-file">No file selected</span>
                  )}
                  {file && (
                    <button onClick={() => setFile(null)} className="ndoc-file-remove">×</button>
                  )}
                </div>
                {!file && <p className="ndoc-no-file-hint">Upload a file to view details</p>}

                <div className="ndoc-file-meta">
                  {[
                    { label: "File Name", value: file?.name || "-" },
                    { label: "File Type", value: file ? (file.raw?.name.split(".").pop().toUpperCase()) : "-" },
                    { label: "File Size", value: file?.size || "-" },
                  ].map(({ label, value }) => (
                    <div className="ndoc-file-row" key={label}>
                      <span className="ndoc-file-row-label">{label}</span>
                      <span className="ndoc-file-row-value">{value}</span>
                    </div>
                  ))}
                  <div className="ndoc-file-row">
                    <span className="ndoc-file-row-label">Version</span>
                    <input
                      className="ndoc-version-input"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* ========== 3. DOCUMENT CLASSIFICATION ========== */}
          <SectionBlock number="3" title="DOCUMENT CLASSIFICATION">
            <div className="ndoc-grid-3">
              <Field label="Category" required>
                <Sel value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Sel>
              </Field>
              <Field label="Sub Category">
                <Sel value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                  <option value="">Select sub category</option>
                  {subCatOptions.map((s) => <option key={s}>{s}</option>)}
                </Sel>
              </Field>
              <Field label="Tags">
                <div className="ndoc-tag-box">
                  {tags.map((t) => (
                    <span key={t} className="ndoc-tag">
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
                    </span>
                  ))}
                  <input
                    className="ndoc-tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
                      if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
                    }}
                    placeholder={tags.length === 0 ? "Select or add tags" : ""}
                  />
                </div>
              </Field>
            </div>
            <div className="ndoc-grid-3 ndoc-mt">
              <Field label="Company" required>
                <Sel value={company} onChange={(e) => setCompany(e.target.value)}>
                  <option value="">Select company</option>
                  {COMPANIES.map((c) => <option key={c}>{c}</option>)}
                </Sel>
              </Field>
              <Field label="Branch">
                <Sel value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </Sel>
              </Field>
              <Field label="Department">
                <Sel value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </Sel>
              </Field>
            </div>
          </SectionBlock>

          {/* ========== 4. DOCUMENT ASSOCIATION ========== */}
          <SectionBlock number="4" title="DOCUMENT ASSOCIATION">
            <div className="ndoc-grid-3">
              <Field label="Related Module">
                <Sel value={relatedModule} onChange={(e) => setRelatedModule(e.target.value)}>
                  <option value="">Select module</option>
                  {MODULES.map((m) => <option key={m}>{m}</option>)}
                </Sel>
              </Field>
              <Field label="Related Record">
                <Input placeholder="Search and select record" value={relatedRecord} onChange={(e) => setRelatedRecord(e.target.value)} />
              </Field>
              <Field label="Vendor / Customer">
                <Sel value={vendor} onChange={(e) => setVendor(e.target.value)}>
                  <option value="">Select vendor or customer</option>
                  {VENDORS.map((v) => <option key={v}>{v}</option>)}
                </Sel>
              </Field>
            </div>
            <div className="ndoc-grid-3 ndoc-mt">
              <Field label="Document Owner">
                <Sel value={docOwner} onChange={(e) => setDocOwner(e.target.value)}>
                  <option value="">Select document owner</option>
                  {EMPLOYEES.map((e) => <option key={e}>{e}</option>)}
                </Sel>
              </Field>
              <Field label="Uploaded By">
                <Input value="Auto (current user)" readOnly className="ndoc-input-readonly" />
              </Field>
              <Field label="Employee (Optional)">
                <Sel value={employee} onChange={(e) => setEmployee(e.target.value)}>
                  <option value="">Select employee</option>
                  {EMPLOYEES.map((e) => <option key={e}>{e}</option>)}
                </Sel>
              </Field>
            </div>
          </SectionBlock>

          {/* ========== 5. AI OCR PROCESSING ========== */}
          <SectionBlock number="5" title="AI OCR PROCESSING">
            <div className="ndoc-ocr-row">
              <div className="ndoc-ocr-toggles">
                <Toggle checked={enableOcr}   onChange={setEnableOcr}   label="Enable OCR" />
                <Toggle checked={autoExtract} onChange={setAutoExtract} label="Auto Extract Information" />
              </div>
              <Field label="OCR Language">
                <Sel value={ocrLang} onChange={(e) => setOcrLang(e.target.value)}>
                  {OCR_LANGS.map((l) => <option key={l}>{l}</option>)}
                </Sel>
              </Field>
              <Field label="OCR Template">
                <Sel value={ocrTemplate} onChange={(e) => setOcrTemplate(e.target.value)}>
                  <option value="">Select template</option>
                  {OCR_TMPLS.map((t) => <option key={t}>{t}</option>)}
                </Sel>
              </Field>
            </div>
          </SectionBlock>

          {/* ========== 6. APPROVAL & ACCESS ========== */}
          <SectionBlock number="6" title="APPROVAL & ACCESS">
            <div className="ndoc-approval-row">
              <Field label="Approval Required">
                <div className="ndoc-mt-sm">
                  <Toggle checked={approvalRequired} onChange={setApprovalRequired} />
                </div>
              </Field>
              <Field label="Approval Workflow">
                <Sel value={workflow} onChange={(e) => setWorkflow(e.target.value)} className={!approvalRequired ? "ndoc-disabled" : ""}>
                  <option value="">Select workflow</option>
                  {WORKFLOWS.map((w) => <option key={w}>{w}</option>)}
                </Sel>
              </Field>
              <Field label="Approver">
                <Sel value={approver} onChange={(e) => setApprover(e.target.value)} className={!approvalRequired ? "ndoc-disabled" : ""}>
                  <option value="">Select approver</option>
                  {APPROVERS.map((a) => <option key={a}>{a}</option>)}
                </Sel>
              </Field>
            </div>
            <div className="ndoc-grid-2 ndoc-mt">
              <Field label="Access Level">
                <Sel value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
                  <option value="">Select access level</option>
                  {ACCESS.map((a) => <option key={a}>{a}</option>)}
                </Sel>
              </Field>
              <Field label="Shared With">
                <Input placeholder="Select users or roles" value={sharedWith} onChange={(e) => setSharedWith(e.target.value)} />
              </Field>
            </div>
          </SectionBlock>

          {/* ========== 7. SECURITY & PERMISSIONS ========== */}
          <SectionBlock number="7" title="SECURITY & PERMISSIONS">
            <div className="ndoc-security-row">
              <Toggle checked={confidential}  onChange={setConfidential}  label="Confidential Document" />
              <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow Download" />
              <Toggle checked={allowPrint}    onChange={setAllowPrint}    label="Allow Printing" />
              <Toggle checked={allowShare}    onChange={setAllowShare}    label="Allow Sharing" />
            </div>
          </SectionBlock>

          {/* ========== 8. NOTES & COMMENTS ========== */}
          <SectionBlock number="8" title="NOTES & COMMENTS">
            <div className="ndoc-grid-2">
              <Field label="Internal Notes">
                <textarea
                  className="ndoc-textarea"
                  rows={4}
                  maxLength={500}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal notes..."
                />
                <span className="ndoc-char-count">{internalNotes.length}/500</span>
              </Field>
              <Field label="Comments">
                <textarea
                  className="ndoc-textarea"
                  rows={4}
                  maxLength={500}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments..."
                />
                <span className="ndoc-char-count">{comments.length}/500</span>
              </Field>
            </div>
          </SectionBlock>

        </div>{/* end body */}

        {/* ---- FOOTER ---- */}
        <div className="ndoc-footer">
          <button className="ndoc-btn ndoc-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ndoc-btn ndoc-btn-outline" onClick={onClose}>Save Draft</button>
          <button className="ndoc-btn ndoc-btn-dark" onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 10V3m0 0L4 6m3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 11h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Upload Document
          </button>
        </div>

      </div>

      {/* ---- STYLES ---- */}
      <style>{`
        /* ── Backdrop ── */
        .ndoc-backdrop {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.42);
          padding: 16px;
        }

        /* ── Modal shell ── */
        .ndoc-modal {
          display: flex; flex-direction: column;
          width: 100%; max-width: 780px; height: 92vh;
          background: #f6f5f1;
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,.22);
          overflow: hidden;
          font-family: inherit;
        }

        /* ── Top bar ── */
        .ndoc-topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px;
          padding: 20px 28px 18px;
          background: #fff;
          border-bottom: 1px solid #e3e0d9;
          flex-shrink: 0;
        }
        .ndoc-back {
          background: none; border: none; cursor: pointer;
          font-family: monospace; font-size: 11px; color: #91a0a0;
          padding: 0; margin-bottom: 8px;
          display: block;
          transition: color .15s;
        }
        .ndoc-back:hover { color: #11130f; }
        .ndoc-title {
          margin: 0; font-size: 22px; line-height: 1;
          font-family: var(--serif, Georgia, serif); font-weight: 400;
          color: #11130f;
        }
        .ndoc-subtitle {
          margin: 4px 0 0; font-family: monospace; font-size: 11px; color: #91a0a0;
        }
        .ndoc-topbar-actions {
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .ndoc-close {
          background: none; border: none; cursor: pointer;
          width: 32px; height: 32px; border-radius: 50%;
          font-size: 22px; line-height: 1; color: #91a0a0;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s;
        }
        .ndoc-close:hover { background: #f0efeb; color: #11130f; }

        /* ── Buttons ── */
        .ndoc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 11px; cursor: pointer;
          font-family: monospace; font-size: 12px; font-weight: 500;
          transition: background .15s, box-shadow .15s;
          white-space: nowrap;
        }
        .ndoc-btn-ghost {
          background: transparent; border: 1px solid #e3e0d9; color: #303531;
        }
        .ndoc-btn-ghost:hover { background: #f0efeb; }
        .ndoc-btn-outline {
          background: #fff; border: 1px solid #e3e0d9; color: #303531;
        }
        .ndoc-btn-outline:hover { background: #f0efeb; }
        .ndoc-btn-dark {
          background: #11130f; border: 1px solid #11130f; color: #fff;
        }
        .ndoc-btn-dark:hover { background: #292c27; }

        /* ── Scrollable body ── */
        .ndoc-body {
          flex: 1; overflow-y: auto;
          padding: 20px 24px 8px;
        }

        /* ── Section block ── */
        .ndoc-section {
          background: #fff;
          border: 1px solid #e3e0d9;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .ndoc-section-head {
          display: flex; align-items: center; gap: 6px;
          padding: 13px 20px;
          border-bottom: 1px solid #f0efeb;
        }
        .ndoc-section-num  { font-family: monospace; font-size: 11px; color: #91a0a0; }
        .ndoc-section-title{
          font-family: monospace; font-size: 11px;
          font-weight: 600; letter-spacing: .08em; color: #11130f;
        }
        .ndoc-section-body { padding: 18px 20px 20px; }

        /* ── Grids ── */
        .ndoc-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .ndoc-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
        .ndoc-mt     { margin-top: 14px; }
        .ndoc-mt-sm  { margin-top: 4px; }
        @media (max-width: 640px) {
          .ndoc-grid-3 { grid-template-columns: 1fr; }
          .ndoc-grid-2 { grid-template-columns: 1fr; }
        }

        /* ── Field ── */
        .doc-field { display: flex; flex-direction: column; gap: 5px; }
        .doc-field-label { font-family: monospace; font-size: 11px; color: #8d9696; }
        .doc-required { color: #d9534f; margin-left: 2px; }

        /* ── Input ── */
        .doc-input {
          width: 100%; padding: 9px 12px;
          border: 1px solid #e3e0d9; border-radius: 10px;
          background: #fff; font-family: monospace; font-size: 12px;
          color: #11130f; outline: none; transition: border-color .15s;
          box-sizing: border-box;
        }
        .doc-input::placeholder { color: #c0c8c8; }
        .doc-input:focus { border-color: #11130f; }
        .ndoc-input-readonly { background: #f6f5f1; color: #91a0a0; }

        /* ── Select ── */
        .doc-select-wrap { position: relative; }
        .doc-select {
          width: 100%; padding: 9px 32px 9px 12px;
          border: 1px solid #e3e0d9; border-radius: 10px;
          background: #fff; font-family: monospace; font-size: 12px;
          color: #11130f; outline: none; appearance: none;
          transition: border-color .15s; cursor: pointer;
          box-sizing: border-box;
        }
        .doc-select:focus { border-color: #11130f; }
        .ndoc-disabled { opacity: .5; pointer-events: none; }
        .doc-select-arrow {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: #91a0a0;
        }

        /* ── Date ── */
        .doc-date-wrap { position: relative; }
        .doc-date-input { padding-right: 34px !important; }
        .doc-date-icon {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: #91a0a0;
        }

        /* ── Textarea ── */
        .ndoc-textarea {
          width: 100%; resize: none; padding: 9px 12px;
          border: 1px solid #e3e0d9; border-radius: 10px;
          background: #fff; font-family: monospace; font-size: 12px;
          color: #11130f; outline: none; transition: border-color .15s;
          box-sizing: border-box;
        }
        .ndoc-textarea::placeholder { color: #c0c8c8; }
        .ndoc-textarea:focus { border-color: #11130f; }
        .ndoc-char-count {
          display: block; text-align: right;
          font-family: monospace; font-size: 10px; color: #b0b8b8;
          margin-top: 3px;
        }

        /* ── Upload ── */
        .ndoc-upload-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .ndoc-upload-row { grid-template-columns: 1fr; } }

        .ndoc-dropzone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; min-height: 170px; cursor: pointer;
          border: 2px dashed #d5d2ca; border-radius: 12px;
          background: #fafaf8; transition: border-color .15s, background .15s;
          padding: 20px;
        }
        .ndoc-dropzone:hover, .ndoc-dropzone--active {
          border-color: #11130f; background: #f0efeb;
        }
        .ndoc-upload-icon { color: #91a0a0; margin-bottom: 4px; }
        .ndoc-drop-main { font-family: monospace; font-size: 12px; color: #53605e; margin: 0; }
        .ndoc-drop-or   { font-family: monospace; font-size: 11px; color: #b0b8b8; margin: 0; }
        .ndoc-drop-hint { font-family: monospace; font-size: 10px; color: #b0b8b8; margin: 0; text-align: center; }
        .ndoc-browse-btn {
          padding: 7px 18px; border-radius: 9px;
          border: 1px solid #e3e0d9; background: #fff; cursor: pointer;
          font-family: monospace; font-size: 12px; color: #11130f;
          transition: background .15s;
        }
        .ndoc-browse-btn:hover { background: #f0efeb; }
        .ndoc-hidden { display: none; }

        .ndoc-file-panel {
          border: 1px solid #e3e0d9; border-radius: 12px;
          background: #fff; padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .ndoc-file-panel-head {
          display: flex; align-items: center; gap: 8px;
        }
        .ndoc-no-file      { font-family: monospace; font-size: 12px; color: #91a0a0; }
        .ndoc-no-file-hint { font-family: monospace; font-size: 11px; color: #b0b8b8; margin: 0; }
        .ndoc-file-name    { font-family: monospace; font-size: 12px; color: #11130f; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ndoc-file-remove  { background: none; border: none; cursor: pointer; color: #d9534f; font-size: 16px; line-height: 1; }
        .ndoc-file-meta    { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #f0efeb; padding-top: 10px; }
        .ndoc-file-row     { display: flex; align-items: center; justify-content: space-between; }
        .ndoc-file-row-label { font-family: monospace; font-size: 11px; color: #91a0a0; }
        .ndoc-file-row-value { font-family: monospace; font-size: 11px; color: #11130f; }
        .ndoc-version-input {
          width: 56px; padding: 4px 8px; border: 1px solid #e3e0d9; border-radius: 7px;
          font-family: monospace; font-size: 11px; color: #11130f; text-align: right; outline: none;
        }
        .ndoc-version-input:focus { border-color: #11130f; }

        /* ── Tags ── */
        .ndoc-tag-box {
          min-height: 40px; padding: 6px 10px;
          border: 1px solid #e3e0d9; border-radius: 10px; background: #fff;
          display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
          cursor: text; transition: border-color .15s;
        }
        .ndoc-tag-box:focus-within { border-color: #11130f; }
        .ndoc-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 20px;
          background: #f0efeb; font-family: monospace; font-size: 10px; color: #11130f;
        }
        .ndoc-tag button {
          background: none; border: none; cursor: pointer;
          color: #91a0a0; font-size: 13px; line-height: 1; padding: 0;
          transition: color .15s;
        }
        .ndoc-tag button:hover { color: #d9534f; }
        .ndoc-tag-input {
          flex: 1; min-width: 80px; border: none; outline: none; background: transparent;
          font-family: monospace; font-size: 12px; color: #11130f;
        }
        .ndoc-tag-input::placeholder { color: #c0c8c8; }

        /* ── OCR row ── */
        .ndoc-ocr-row {
          display: grid; grid-template-columns: auto 1fr 1fr; gap: 20px; align-items: start;
        }
        .ndoc-ocr-toggles { display: flex; flex-direction: column; gap: 10px; padding-top: 22px; }
        @media (max-width: 600px) { .ndoc-ocr-row { grid-template-columns: 1fr; } }

        /* ── Approval row ── */
        .ndoc-approval-row {
          display: grid; grid-template-columns: auto 1fr 1fr; gap: 20px; align-items: start;
        }
        @media (max-width: 600px) { .ndoc-approval-row { grid-template-columns: 1fr; } }

        /* ── Security row ── */
        .ndoc-security-row {
          display: flex; flex-wrap: wrap; gap: 24px; align-items: center;
        }

        /* ── Toggle ── */
        .doc-toggle-row {
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
        }
        .doc-toggle {
          display: flex; align-items: center;
          width: 38px; height: 22px; border-radius: 11px;
          background: #d5d2ca; cursor: pointer; transition: background .2s;
          padding: 2px; flex-shrink: 0;
        }
        .doc-toggle--on { background: #11130f; }
        .doc-toggle-knob {
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2);
          transition: transform .2s;
        }
        .doc-toggle--on .doc-toggle-knob { transform: translateX(16px); }
        .doc-toggle-label { font-family: monospace; font-size: 12px; color: #53605e; }

        /* ── Footer ── */
        .ndoc-footer {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 10px; padding: 14px 24px;
          background: #fff; border-top: 1px solid #e3e0d9;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default NewDocumentModal;
