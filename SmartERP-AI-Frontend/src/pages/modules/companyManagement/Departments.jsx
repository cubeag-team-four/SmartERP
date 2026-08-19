import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const Departments = () => {
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

  const departments = [
    {
      department: "Finance & Accounts",
      head: "Rahul Sharma",
      employees: 18,
      costCenter: "CC-001",
    },
    {
      department: "Sales",
      head: "Ananya Singh",
      employees: 34,
      costCenter: "CC-002",
    },
    {
      department: "Operations",
      head: "Vikram Joshi",
      employees: 82,
      costCenter: "CC-003",
    },
    {
      department: "Human Resources",
      head: "Deepika Rao",
      employees: 12,
      costCenter: "CC-004",
    },
    {
      department: "IT",
      head: "Rohan Verma",
      employees: 9,
      costCenter: "CC-005",
    },
    {
      department: "Marketing",
      head: "Kavya Reddy",
      employees: 8,
      costCenter: "CC-006",
    },
    {
      department: "Procurement",
      head: "Suresh Patil",
      employees: 11,
      costCenter: "CC-007",
    },
  ];

  const handleTabClick = (tab) => {
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

    if (routes[tab]) {
      navigate(routes[tab]);
    }
  };

  return (
    <div className="departments-page">

      {/* PAGE HEADER */}

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

      {/* COMPANY SUMMARY */}

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

      {/* COMPANY TABS */}

      <nav className="company-tabs">

        {tabs.map((tab) => (
          <button
            key={tab}
            className={`company-tab ${
              tab === "DEPARTMENTS" ? "active" : ""
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </button>
        ))}

      </nav>

      {/* DEPARTMENTS CARD */}

      <section className="departments-card">

        <div className="departments-header">

          <h2>
            Departments <span>(7)</span>
          </h2>

          <button className="add-dept-btn">
            + Add Dept.
          </button>

        </div>

        {/* TABLE HEADER */}

        <div className="table-header">

          <div>DEPARTMENT</div>
          <div>HEAD</div>
          <div>EMPLOYEES</div>
          <div>COST CENTER</div>
          <div></div>

        </div>

        {/* DEPARTMENT ROWS */}

        <div className="department-list">

          {departments.map((item, index) => (
            <div
              className={`department-row ${
                index === 2 ? "highlighted" : ""
              }`}
              key={item.department}
            >

              <div className="department-name">
                {item.department}
              </div>

              <div className="department-head">
                {item.head}
              </div>

              <div className="department-employees">
                {item.employees}
              </div>

              <div className="cost-center">
                <span>{item.costCenter}</span>
              </div>

              <div className="view-action">
                View →
              </div>

            </div>
          ))}

        </div>

      </section>

      {/* HELP BUTTON */}

      <button className="help-button">
        ?
      </button>

      {/* STYLES */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .departments-page {
          min-height: 100vh;
          background: #f5f4ef;
          color: #11140f;
          padding: 10px 22px 40px;
        }

        /* PAGE HEADER */

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

        /* COMPANY SUMMARY */

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

        /* TABS */

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
          cursor: pointer;
        }

        .company-tab.active {
          background: #fff;
          color: #151713;

          border: 1px solid #e8e5de;

          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07);
        }

        /* DEPARTMENTS CARD */

        .departments-card {
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          overflow: hidden;
        }

        /* CARD HEADER */

        .departments-header {
          height: 63px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;
        }

        .departments-header h2 {
          margin: 0;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
          font-weight: 400;
        }

        .departments-header h2 span {
          color: #a19d95;
          font-size: 14px;
        }

        .add-dept-btn {
          height: 32px;

          padding: 0 15px;

          border: none;
          border-radius: 11px;

          background: #111410;
          color: #fff;

          font-family: monospace;
          font-size: 9px;
        }

        /* TABLE HEADER */

        .table-header {
          height: 37px;

          display: grid;
          grid-template-columns:
            2.2fr
            1.5fr
            1.1fr
            1.3fr
            0.45fr;

          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;

          color: #aaa69e;

          font-family: monospace;
          font-size: 7px;
          letter-spacing: 0.5px;
        }

        /* ROWS */

        .department-row {
          min-height: 53px;

          display: grid;

          grid-template-columns:
            2.2fr
            1.5fr
            1.1fr
            1.3fr
            0.45fr;

          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;
        }

        .department-row:last-child {
          border-bottom: none;
        }

        .department-row.highlighted {
          background: #f7f6f1;
        }

        .department-name {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 15px;
          color: #11140f;
        }

        .department-head {
          font-family: monospace;
          font-size: 9px;
          color: #817e77;
        }

        .department-employees {
          font-family: monospace;
          font-size: 9px;
          color: #171914;
        }

        .cost-center span {
          display: inline-block;

          padding: 5px 9px;

          border-radius: 9px;

          background: #f0eff1;

          color: #817d88;

          font-family: monospace;
          font-size: 8px;
        }

        .view-action {
          text-align: right;

          font-family: monospace;
          font-size: 8px;

          color: #aaa69e;
          white-space: nowrap;
        }

        /* HELP */

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

        /* RESPONSIVE */

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

          .departments-page {
            padding: 10px;
          }

          .departments-card {
            overflow-x: auto;
          }

          .table-header,
          .department-row {
            min-width: 900px;
          }
        }

        @media (max-width: 600px) {

          .page-heading h1 {
            font-size: 23px;
          }

          .company-stats {
            flex-wrap: wrap;
            gap: 18px;
          }
        }

      `}</style>
    </div>
  );
};

export default Departments;