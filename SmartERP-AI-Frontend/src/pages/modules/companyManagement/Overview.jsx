import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const Overview = () => {
  const navigate = useNavigate();

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

  const companyDetails = [
    ["Type", "Private Limited"],
    ["Industry", "Manufacturing"],
    ["Founded", "12 Apr 2010"],
    ["Fiscal Year", "April – March"],
    ["Currency", "INR (₹)"],
    ["Timezone", "IST (UTC+5:30)"],
  ];

  return (
    <div className="company-page">

      

      {/* ================= PAGE HEADER ================= */}
      <main className="page-container">

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

        {/* ================= NAVIGATION ================= */}
       {tabs.map((tab, index) => {
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

  return (
    <button
      key={tab}
      className={`company-tab ${index === 0 ? "active" : ""}`}
      onClick={() => navigate(routes[tab])}
    >
      {tab}
    </button>
  );
})}

        {/* ================= MAIN CONTENT ================= */}
        <section className="overview-grid">

          {/* ================= ORGANISATION CHART ================= */}
          <div className="organisation-card">

            <div className="card-title">
              Organisation Chart
            </div>

            <div className="organisation-content">

              {/* Managing Director */}
              <div className="director-box">
                <span>MANAGING DIRECTOR</span>
                <strong>Arjun Mehta</strong>
              </div>

              <div className="vertical-line director-line"></div>

              {/* Horizontal connector */}
              <div className="horizontal-line"></div>

              <div className="department-row">

                <div className="department-wrapper">
                  <div className="vertical-small-line"></div>

                  <div className="department finance">
                    <span>FINANCE</span>
                    <strong>Rahul Sharma</strong>
                  </div>
                </div>

                <div className="department-wrapper">
                  <div className="vertical-small-line"></div>

                  <div className="department sales">
                    <span>SALES</span>
                    <strong>Ananya Singh</strong>
                  </div>
                </div>

                <div className="department-wrapper">
                  <div className="vertical-small-line"></div>

                  <div className="department operations">
                    <span>OPERATIONS</span>
                    <strong>Vikram Joshi</strong>
                  </div>
                </div>

                <div className="department-wrapper">
                  <div className="vertical-small-line"></div>

                  <div className="department hr">
                    <span>HR</span>
                    <strong>Deepika Rao</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="right-column">

            {/* COMPANY DETAILS */}
            <div className="details-card">

              <div className="small-heading">
                COMPANY DETAILS
              </div>

              <div className="details-list">

                {companyDetails.map(([label, value]) => (
                  <div className="detail-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}

              </div>

            </div>

            {/* SUBSCRIPTION */}
            <div className="subscription-card">

              <div className="subscription-label">
                SUBSCRIPTION
              </div>

              <h2>Business Plan</h2>

              <div className="subscription-info">
                50 users&nbsp;&nbsp;·&nbsp;&nbsp;All 10 modules
              </div>

              <div className="usage-box">

                <div className="usage-header">
                  <span>Users used</span>
                  <span>38 / 50</span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress"
                    style={{ width: "76%" }}
                  ></div>
                </div>

              </div>

              <div className="renewal">
                Renews: 31 Oct 2026
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* ================= HELP BUTTON ================= */}
      <button className="help-button">?</button>

      {/* ================= PAGE CSS ================= */}
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f5f4ef;
          color: #11140f;
        }

        button {
          font-family: inherit;
        }

        .company-page {
          min-height: 100vh;
          background: #f5f4ef;
        }

        /* ---------- GLOBAL HEADER ---------- */

        .global-header {
          height: 69px;
          background: #ffffff;
          border-bottom: 1px solid #e5e2da;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }

        .search-box {
          width: 384px;
          height: 38px;
          border: 1px solid #e5e2da;
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: #b1afa9;
          font-family: monospace;
          font-size: 12px;
          background: #f8f7f3;
        }

        .search-icon {
          font-size: 20px;
          margin-right: 8px;
        }

        .shortcut {
          margin-left: auto;
          border: 1px solid #e3e0d8;
          border-radius: 5px;
          padding: 2px 5px;
          font-size: 10px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .ask-ai,
        .notification {
          height: 38px;
          border: 1px solid #e1dfd7;
          border-radius: 13px;
          background: #fff;
          color: #77766f;
          padding: 0 14px;
        }

        .ask-ai {
          color: #68755f;
          background: #f8faf6;
        }

        .notification {
          width: 39px;
          position: relative;
          font-size: 18px;
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 5px;
          height: 5px;
          background: #9a5f51;
          border-radius: 50%;
        }

        .profile {
          height: 43px;
          min-width: 111px;
          border: 1px solid #e1dfd7;
          border-radius: 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
        }

        .profile-avatar {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #f0f0e9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #59664e;
        }

        .profile-name {
          font-size: 12px;
        }

        .profile-role {
          font-size: 8px;
          color: #99958d;
        }

        /* ---------- PAGE ---------- */

        .page-container {
          padding: 10px 19px 22px;
        }

        .page-heading {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .eyebrow {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #99988f;
          margin-bottom: 5px;
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
          gap: 9px;
          align-items: center;
        }

        .export-btn,
        .add-btn {
          height: 38px;
          padding: 0 17px;
          border-radius: 12px;
          font-size: 10px;
        }

        .export-btn {
          border: 1px solid #e0ddd5;
          background: #fff;
          color: #20221e;
        }

        .add-btn {
          border: 0;
          background: #111410;
          color: #fff;
          padding: 0 18px;
        }

        /* ---------- COMPANY SUMMARY ---------- */

        .company-summary {
          min-height: 108px;
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
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
          border-radius: 3px;
          background: #4e574b;
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
          gap: 8px;
          color: #98958d;
          font-family: monospace;
          font-size: 9px;
        }

        .company-stats {
          display: flex;
          align-items: center;
          gap: 66px;
        }

        .stat {
          text-align: center;
          min-width: 60px;
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

        /* ---------- TABS ---------- */

        .company-tabs {
          height: 79px;
          display: flex;
          align-items: center;
          gap: 3px;
          padding-left: 3px;
        }

        .company-tab {
          height: 34px;
          border: 0;
          background: transparent;
          border-radius: 9px;
          padding: 0 17px;
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 1px;
          color: #8b8982;
        }

        .company-tab.active {
          background: #fff;
          color: #151713;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07);
          border: 1px solid #e8e5de;
        }

        /* ---------- CONTENT GRID ---------- */

        .overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(350px, 0.98fr);
          gap: 16px;
        }

        /* ---------- ORGANISATION ---------- */

        .organisation-card {
          height: 480px;
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          overflow: hidden;
        }

        .card-title {
          height: 57px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #e5e2db;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
        }

        .organisation-content {
          position: relative;
          height: calc(100% - 57px);
          padding-top: 20px;
        }

        .director-box {
          width: 140px;
          height: 59px;
          margin: 0 auto;
          background: #111410;
          border-radius: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .director-box span {
          font-family: monospace;
          color: #9eaf91;
          font-size: 8px;
          margin-bottom: 6px;
        }

        .director-box strong {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 14px;
          font-weight: 400;
        }

        .director-line {
          width: 1px;
          height: 27px;
          background: #e0ddd6;
          margin: 0 auto;
        }

        .horizontal-line {
          height: 1px;
          background: #e0ddd6;
          width: 50%;
          margin: 0 auto;
        }

        .department-row {
          display: flex;
          justify-content: center;
          gap: 17px;
        }

        .department-wrapper {
          width: 115px;
          position: relative;
          padding-top: 24px;
        }

        .vertical-small-line {
          width: 1px;
          height: 24px;
          background: #e0ddd6;
          position: absolute;
          top: 0;
          left: 50%;
        }

        .department {
          height: 55px;
          border: 2px solid #e8e5de;
          border-radius: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .department span {
          font-family: monospace;
          font-size: 7px;
          margin-bottom: 5px;
        }

        .department strong {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 13px;
          font-weight: 400;
        }

        .finance {
          border-color: #dfe9da;
        }

        .finance span {
          color: #819278;
        }

        .sales {
          border-color: #e3e1eb;
        }

        .sales span {
          color: #9189a5;
        }

        .operations {
          border-color: #e9e2d2;
        }

        .operations span {
          color: #a18f6b;
        }

        .hr {
          border-color: #dfe8dc;
        }

        .hr span {
          color: #82977a;
        }

        /* ---------- RIGHT COLUMN ---------- */

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .details-card {
          min-height: 259px;
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          padding: 20px;
        }

        .small-heading {
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 1px;
          color: #a19e96;
          margin-bottom: 15px;
        }

        .details-list {
          width: 100%;
        }

        .detail-row {
          min-height: 32px;
          border-bottom: 1px solid #e6e3dc;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .detail-row:last-child {
          border-bottom: 0;
        }

        .detail-row span {
          font-family: monospace;
          font-size: 9px;
          color: #9b9991;
        }

        .detail-row strong {
          font-family: monospace;
          font-size: 9px;
          font-weight: 400;
          color: #171914;
        }

        /* ---------- SUBSCRIPTION ---------- */

        .subscription-card {
          min-height: 205px;
          background: #111410;
          border-radius: 15px;
          padding: 20px;
          color: #fff;
        }

        .subscription-label {
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 1px;
          color: #9aae8d;
          margin-bottom: 14px;
        }

        .subscription-card h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 400;
        }

        .subscription-info {
          margin-top: 7px;
          font-family: monospace;
          font-size: 9px;
          color: #898c82;
        }

        .usage-box {
          margin-top: 16px;
          background: #20231e;
          border-radius: 12px;
          padding: 11px 12px;
        }

        .usage-header {
          display: flex;
          justify-content: space-between;
          font-family: monospace;
          font-size: 8px;
          color: #a4a69e;
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 5px;
          border-radius: 10px;
          background: #363a33;
          overflow: hidden;
        }

        .progress {
          height: 100%;
          background: #9aaa8c;
          border-radius: 10px;
        }

        .renewal {
          margin-top: 13px;
          font-family: monospace;
          font-size: 8px;
          color: #656960;
        }

        /* ---------- HELP ---------- */

        .help-button {
          position: fixed;
          right: 9px;
          bottom: 10px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 0;
          background: #1b1d19;
          color: #fff;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        /* ---------- RESPONSIVE ---------- */

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

        @media (max-width: 900px) {

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .company-summary {
            flex-direction: column;
            align-items: flex-start;
          }

          .company-stats {
            width: 100%;
            justify-content: space-between;
          }

          .company-tabs {
            overflow-x: auto;
          }

        }

        @media (max-width: 600px) {

          .global-header {
            padding: 0 10px;
          }

          .search-box {
            width: 220px;
          }

          .ask-ai {
            display: none;
          }

          .page-container {
            padding: 10px;
          }

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

          .organisation-card {
            overflow-x: auto;
          }

          .department-row {
            min-width: 500px;
          }

          .organisation-content {
            min-width: 600px;
          }

        }

      `}</style>
    </div>
  );
};

export default Overview;