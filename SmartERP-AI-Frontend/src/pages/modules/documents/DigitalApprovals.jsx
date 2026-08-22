import { useState } from "react";
import "./documents.css";

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_APPROVALS = [
  {
    id: 1,
    documentTitle:    "Tata Steel Purchase Bill — Aug 2026",
    documentType:     "Vendor Invoice",
    submittedByName:  "Arjun Mehta",
    submittedAt:      "2026-08-10",
    dueDate:          "2026-08-12",
    status:           "pending",
  },
  {
    id: 2,
    documentTitle:    "Vendor Contract — Infosys BPO Services",
    documentType:     "Contract",
    submittedByName:  "Priya Sharma",
    submittedAt:      "2026-08-08",
    dueDate:          "2026-08-15",
    status:           "pending",
  },
  {
    id: 3,
    documentTitle:    "Employee Offer Letter — Rohan Sharma",
    documentType:     "HR Document",
    submittedByName:  "Kavita Nair",
    submittedAt:      "2026-08-06",
    dueDate:          "2026-08-18",
    status:           "pending",
  },
  {
    id: 4,
    documentTitle:    "MSME Vendor Invoice — Ram Steels",
    documentType:     "Vendor Invoice",
    submittedByName:  "Ravi Kumar",
    submittedAt:      "2026-08-04",
    dueDate:          "2026-08-20",
    status:           "pending",
  },
];

const fmt = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

// ─── Component ────────────────────────────────────────────────────────────────
export default function DigitalApprovals() {
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const approve = (id) =>
    setApprovals((prev) => prev.filter((a) => a.id !== id));

  const reject = (id) =>
    setApprovals((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="documents-page">

      {/* ── Header ── */}
      <div className="doc-title-row">
        <div>
          <div className="doc-eyebrow">DOCUMENTS</div>
          <h1>Digital Approvals</h1>
          <p>Review documents waiting for your approval.</p>
        </div>
      </div>

      {/* ── Summary banner ── */}
      <div className="approval-summary">
        <div>
          <strong>{approvals.length}</strong>
          <span>Pending Approval</span>
        </div>
      </div>

      {/* ── Approval list ── */}
      <div className="doc-list">
        {approvals.map((approval) => (
          <div className="doc-row" key={approval.id}>
            <div className="doc-row-left">
              <div className="doc-file-icon">📋</div>
              <div>
                <h3>{approval.documentTitle}</h3>
                <div className="doc-meta">
                  <span>{approval.documentType}</span>
                  <span>·</span>
                  <span>Submitted by {approval.submittedByName}</span>
                  <span>·</span>
                  <span>{fmt(approval.submittedAt)}</span>
                </div>
              </div>
            </div>

            <div className="approval-actions">
              <span className="due-date">
                Due: {fmt(approval.dueDate)}
              </span>
              <button className="doc-btn doc-btn-light">View Doc</button>
              <button
                className="doc-btn approve-button"
                onClick={() => approve(approval.id)}
              >
                Approve
              </button>
              <button
                className="doc-btn reject-button"
                onClick={() => reject(approval.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {!approvals.length && (
          <div className="doc-empty">No pending approvals. You're all caught up!</div>
        )}
      </div>
    </div>
  );
}
