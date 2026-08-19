import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const Branches = () => {
  const navigate = useNavigate();

  const branches = [
    {
      initials: "HM",
      name: "HQ — Mumbai",
      type: "Head Office",
      head: "Arjun Mehta",
      employees: 142,
    },
    {
      initials: "WP",
      name: "West — Pune",
      type: "Sales Office",
      head: "Ananya Singh",
      employees: 68,
    },
    {
      initials: "FP",
      name: "Factory — Pune",
      type: "Manufacturing",
      head: "Vikram Joshi",
      employees: 58,
    },
    {
      initials: "SB",
      name: "South — Bangalore",
      type: "Regional Office",
      head: "Deepika Rao",
      employees: 16,
    },
  ];

  const tabs = [
    "OVERVIEW",
    "BRANCHES",
    "DEPARTMENTS",
    "USERS",
    "ROLES & PERMISSIONS",
    "APPROVAL WORKFLOWS",
    "HOLIDAYS",
    "SETTINGS",
  ];

  return (
    <div className="branches-page">

      {/* ================= PAGE HEADER ================= */}

      <div className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h1>Company Management</h1>
        </div>

        <div className="page-actions">
          <button className="export-btn">Export</button>
          <button className="add-btn">+ Add</button>
        </div>
      </div>

      {/* ================= COMPANY SUMMARY ================= */}

      <section className="company-summary">

        <div className="company-left">

          <div className="company-logo">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="company-info">
            <h2>Acme Manufacturing Ltd</h2>

            <div className="company-identifiers">
              <span>GST: 27AADCA3129H1ZX</span>
              <span>•</span>
              <span>PAN: AADCA3129H</span>
              <span>•</span>
              <span>CIN: U28100MH2010PTC204826</span>
            </div>
          </div>

        </div>

        <div className="company-stats">

          <div className="stat">
            <strong>4</strong>
            <span>BRANCHES</span>
          </div>

          <div className="stat">
            <strong>284</strong>
            <span>EMPLOYEES</span>
          </div>

          <div className="stat">
            <strong>7</strong>
            <span>DEPARTMENTS</span>
          </div>

          <div className="stat plan-stat">
            <strong>Business</strong>
            <span>PLAN</span>
          </div>

          <div className="status">ACTIVE</div>

        </div>
      </section>

      {/* ================= COMPANY TABS ================= */}

     {tabs.map((tab) => (
  <button
    key={tab}
    className={`company-tab ${
      tab === "BRANCHES" ? "active" : ""
    }`}
    onClick={() => {
      const routes = {
        OVERVIEW: ROUTES.SUPER_ADMIN_COMPANY,
        BRANCHES: ROUTES.SUPER_ADMIN_COMPANY_BRANCHES,
        DEPARTMENTS: ROUTES.SUPER_ADMIN_COMPANY_DEPARTMENTS,
        USERS: ROUTES.SUPER_ADMIN_COMPANY_USERS,
        "ROLES & PERMISSIONS": ROUTES.SUPER_ADMIN_COMPANY_ROLES,
        "APPROVAL WORKFLOWS":
          ROUTES.SUPER_ADMIN_COMPANY_APPROVAL_WORKFLOWS,
        HOLIDAYS: ROUTES.SUPER_ADMIN_COMPANY_HOLIDAYS,
        SETTINGS: ROUTES.SUPER_ADMIN_COMPANY_SETTINGS,
      };

      navigate(routes[tab]);
    }}
  >
    {tab}
  </button>
))}

      {/* ================= BRANCHES CARD ================= */}

      <section className="branches-card">

        {/* Card Header */}

        <div className="branches-header">

          <h2>
            Branches <span>(4)</span>
          </h2>

          <button className="add-branch-btn">
            + Add Branch
          </button>

        </div>

        {/* Branch List */}

        <div className="branch-list">

          {branches.map((branch, index) => (

            <div
              className={`branch-row ${
                index === 0 ? "first-row" : ""
              }`}
              key={branch.name}
            >

              {/* Branch Icon */}

              <div className="branch-icon">
                {branch.initials}
              </div>

              {/* Branch Information */}

              <div className="branch-info">

                <div className="branch-name">
                  {branch.name}
                </div>

                <div className="branch-meta">
                  {branch.type} · Head: {branch.head}
                </div>

              </div>

              {/* Employee Count */}

              <div className="employee-count">

                <strong>
                  {branch.employees}
                </strong>

                <span>
                  EMPLOYEES
                </span>

              </div>

              {/* Status */}

              <div className="branch-status">
                ACTIVE
              </div>

              {/* Arrow */}

              <div className="branch-arrow">
                ›
              </div>

            </div>

          ))}

        </div>

      </section>

      {/* ================= HELP BUTTON ================= */}

      <button className="help-button">
        ?
      </button>

      {/* ================= STYLES ================= */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .branches-page {
          min-height: 100vh;
          background: #f5f4ef;
          color: #11140f;
          padding: 10px 22px 40px;
        }

        /* =========================================
           PAGE HEADER
        ========================================= */

        .page-heading {
          height: 77px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .eyebrow {
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 1.4px;
          color: #99968e;
          margin-bottom: 6px;
        }

        .page-heading h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 28px;
          font-weight: 400;
          color: #10130f;
        }

        .page-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .export-btn,
        .add-btn {
          height: 38px;
          border-radius: 12px;
          padding: 0 17px;
          font-size: 10px;
        }

        .export-btn {
          background: #fff;
          border: 1px solid #e0ddd5;
          color: #20221e;
        }

        .add-btn {
          background: #111410;
          border: none;
          color: #fff;
        }

        /* =========================================
           COMPANY SUMMARY
        ========================================= */

        .company-summary {
          min-height: 105px;
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 19px 20px;
        }

        .company-left {
          display: flex;
          align-items: center;
          gap: 23px;
        }

        .company-logo {
          width: 65px;
          height: 65px;
          border-radius: 15px;
          background: #121511;

          display: grid;
          grid-template-columns: repeat(2, 13px);
          grid-template-rows: repeat(2, 13px);

          gap: 4px;

          align-content: center;
          justify-content: center;
        }

        .company-logo span {
          width: 13px;
          height: 13px;
          border-radius: 3px;
          background: #4d554a;
        }

        .company-logo span:first-child {
          background: #a1b294;
        }

        .company-logo span:nth-child(3) {
          background: #343a31;
        }

        .company-info h2 {
          margin: 0 0 6px;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          font-weight: 400;
        }

        .company-identifiers {
          display: flex;
          align-items: center;
          gap: 8px;

          font-family: monospace;
          font-size: 9px;

          color: #99968e;
        }

        .company-stats {
          display: flex;
          align-items: center;
          gap: 64px;
        }

        .stat {
          text-align: center;
          min-width: 58px;
        }

        .stat strong {
          display: block;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 21px;
          font-weight: 400;
        }

        .stat span {
          display: block;
          margin-top: 4px;

          font-family: monospace;
          font-size: 8px;

          color: #a09d96;
        }

        .plan-stat strong {
          font-size: 21px;
        }

        .status {
          font-family: monospace;
          font-size: 8px;

          color: #63755c;
          background: #edf2e8;

          padding: 7px 12px;
          border-radius: 12px;
        }

        /* =========================================
           COMPANY TABS
        ========================================= */

        .company-tabs {
          height: 79px;

          display: flex;
          align-items: center;

          gap: 3px;
          padding-left: 3px;

          overflow-x: auto;
        }

        .company-tab {
          height: 34px;

          padding: 0 17px;

          border: none;
          background: transparent;

          border-radius: 9px;

          font-family: monospace;
          font-size: 8px;
          letter-spacing: 1px;

          color: #8b8982;

          white-space: nowrap;
        }

        .company-tab.active {
          background: #fff;

          color: #151713;

          border: 1px solid #e8e5de;

          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07);
        }

        /* =========================================
           BRANCHES CARD
        ========================================= */

        .branches-card {
          background: #fff;

          border: 1px solid #e1dfd8;
          border-radius: 15px;

          overflow: hidden;
        }

        /* =========================================
           BRANCH HEADER
        ========================================= */

        .branches-header {
          height: 63px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;
        }

        .branches-header h2 {
          margin: 0;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
          font-weight: 400;
        }

        .branches-header h2 span {
          color: #a19d95;
          font-size: 14px;
        }

        .add-branch-btn {
          height: 32px;

          padding: 0 15px;

          border: none;
          border-radius: 11px;

          background: #111410;
          color: #fff;

          font-family: monospace;
          font-size: 9px;
        }

        /* =========================================
           BRANCH ROW
        ========================================= */

        .branch-row {
          height: 73px;

          display: flex;
          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;

          transition: background 0.15s ease;
        }

        .branch-row:last-child {
          border-bottom: none;
        }

        .branch-row:hover {
          background: #faf9f5;
        }

        .branch-row.first-row {
          background: #f7f6f1;
        }

        /* =========================================
           BRANCH ICON
        ========================================= */

        .branch-icon {
          width: 40px;
          height: 40px;

          border-radius: 12px;

          border: 1px solid #e5e2da;

          background: #f7f6f1;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #64735f;

          font-family: monospace;
          font-size: 8px;

          flex-shrink: 0;
        }

        /* =========================================
           BRANCH INFO
        ========================================= */

        .branch-info {
          margin-left: 16px;

          flex: 1;
        }

        .branch-name {
          font-family: Georgia, "Times New Roman", serif;

          font-size: 16px;

          color: #11140f;

          margin-bottom: 5px;
        }

        .branch-meta {
          font-family: monospace;

          font-size: 8px;

          color: #99968e;
        }

        /* =========================================
           EMPLOYEE COUNT
        ========================================= */

        .employee-count {
          width: 80px;

          text-align: center;

          margin-right: 17px;
        }

        .employee-count strong {
          display: block;

          font-family: Georgia, "Times New Roman", serif;

          font-size: 18px;

          font-weight: 400;
        }

        .employee-count span {
          display: block;

          margin-top: 2px;

          font-family: monospace;

          font-size: 7px;

          color: #aaa69e;
        }

        /* =========================================
           BRANCH STATUS
        ========================================= */

        .branch-status {
          width: 62px;

          text-align: center;

          padding: 6px 9px;

          border-radius: 10px;

          background: #edf2e8;

          color: #63755c;

          font-family: monospace;

          font-size: 8px;
        }

        /* =========================================
           ARROW
        ========================================= */

        .branch-arrow {
          width: 25px;

          margin-left: 12px;

          color: #d1cec6;

          font-size: 27px;

          font-family: Arial, sans-serif;

          line-height: 1;

          text-align: right;
        }

        /* =========================================
           HELP BUTTON
        ========================================= */

        .help-button {
          position: fixed;

          right: 10px;
          bottom: 10px;

          width: 34px;
          height: 34px;

          border: none;

          border-radius: 50%;

          background: #1b1d19;

          color: #fff;

          font-size: 18px;

          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);

          cursor: pointer;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */

        @media (max-width: 1100px) {

          .company-stats {
            gap: 25px;
          }

          .company-summary {
            gap: 20px;
          }

          .company-identifiers {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 850px) {

          .company-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }

          .company-stats {
            width: 100%;
            justify-content: space-between;
          }

          .branches-page {
            padding: 10px;
          }
        }

        @media (max-width: 600px) {

          .page-heading h1 {
            font-size: 23px;
          }

          .company-left {
            align-items: flex-start;
          }

          .company-stats {
            flex-wrap: wrap;
            gap: 18px;
          }

          .branch-row {
            min-width: 650px;
          }

          .branches-card {
            overflow-x: auto;
          }

          .branches-header {
            min-width: 650px;
          }
        }

      `}</style>
    </div>
  );
};

export default Branches;