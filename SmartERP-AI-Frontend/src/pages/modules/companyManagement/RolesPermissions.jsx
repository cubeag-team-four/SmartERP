import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const RolesPermissions = () => {
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

  const permissions = [
    {
      module: "Finance & Accounts",
      superAdmin: "Full",
      admin: "Full",
      manager: "View + Edit",
      employee: "None",
    },
    {
      module: "CRM",
      superAdmin: "Full",
      admin: "Full",
      manager: "Full",
      employee: "View",
    },
    {
      module: "HR & Payroll",
      superAdmin: "Full",
      admin: "Full",
      manager: "Dept Only",
      employee: "Own",
    },
    {
      module: "Inventory",
      superAdmin: "Full",
      admin: "Full",
      manager: "Full",
      employee: "View",
    },
    {
      module: "Reports",
      superAdmin: "Full",
      admin: "Full",
      manager: "Dept Only",
      employee: "None",
    },
    {
      module: "Settings",
      superAdmin: "Full",
      admin: "Partial",
      manager: "None",
      employee: "None",
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

  const getPermissionClass = (permission) => {
    if (permission === "Full") return "permission full";
    if (permission === "None") return "permission none";
    if (permission === "Partial") return "permission partial";
    if (permission === "View") return "permission view";
    if (permission === "View + Edit") return "permission view-edit";
    if (permission === "Dept Only") return "permission dept";
    if (permission === "Own") return "permission own";

    return "permission";
  };

  return (
    <div className="roles-page">

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

          <div className="status">
            ACTIVE
          </div>

        </div>

      </section>

      {/* TABS */}

      <nav className="company-tabs">

        {tabs.map((tab) => (
          <button
            key={tab}
            className={`company-tab ${
              tab === "ROLES & PERMISSIONS" ? "active" : ""
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </button>
        ))}

      </nav>

      {/* PERMISSION MATRIX */}

      <section className="permission-card">

        <div className="permission-header">

          <div>
            <h2>Permission Matrix</h2>

            <p>
              Module-level access control by role
            </p>
          </div>

        </div>

        {/* TABLE HEADER */}

        <div className="permission-table-header">

          <div>MODULE</div>
          <div>SUPER ADMIN</div>
          <div>ADMIN</div>
          <div>MANAGER</div>
          <div>EMPLOYEE</div>

        </div>

        {/* TABLE ROWS */}

        <div className="permission-list">

          {permissions.map((item) => (
            <div
              className="permission-row"
              key={item.module}
            >

              <div className="module-name">
                {item.module}
              </div>

              <div>
                <span className={getPermissionClass(item.superAdmin)}>
                  {item.superAdmin}
                </span>
              </div>

              <div>
                <span className={getPermissionClass(item.admin)}>
                  {item.admin}
                </span>
              </div>

              <div>
                <span className={getPermissionClass(item.manager)}>
                  {item.manager}
                </span>
              </div>

              <div>
                <span className={getPermissionClass(item.employee)}>
                  {item.employee}
                </span>
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

        .roles-page {
          min-height: 100vh;
          background: #f5f4ef;
          color: #11140f;
          padding: 10px 22px 40px;
        }

        /* HEADER */

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
        }

        .page-actions {
          display: flex;
          gap: 9px;
        }

        .export-btn,
        .add-btn {
          height: 38px;
          padding: 0 17px;
          border-radius: 12px;
          font-size: 10px;
        }

        .export-btn {
          background: #fff;
          border: 1px solid #e0ddd5;
        }

        .add-btn {
          background: #111410;
          color: #fff;
          border: none;
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

          box-shadow:
            0 2px 6px rgba(0, 0, 0, 0.07);
        }

        /* PERMISSION CARD */

        .permission-card {
          background: #fff;

          border: 1px solid #e1dfd8;
          border-radius: 15px;

          overflow: hidden;
        }

        .permission-header {
          height: 76px;

          display: flex;
          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;
        }

        .permission-header h2 {
          margin: 0 0 5px;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
          font-weight: 400;
        }

        .permission-header p {
          margin: 0;

          font-family: monospace;
          font-size: 9px;

          color: #9b978f;
        }

        /* TABLE HEADER */

        .permission-table-header {
          height: 37px;

          display: grid;

          grid-template-columns:
            2.4fr
            1.25fr
            1.25fr
            1.25fr
            1.25fr;

          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;

          color: #aaa69e;

          font-family: monospace;
          font-size: 7px;
          letter-spacing: .5px;
        }

        /* ROW */

        .permission-row {
          min-height: 53px;

          display: grid;

          grid-template-columns:
            2.4fr
            1.25fr
            1.25fr
            1.25fr
            1.25fr;

          align-items: center;

          padding: 0 20px;

          border-bottom: 1px solid #e3e0d8;
        }

        .permission-row:last-child {
          border-bottom: none;
        }

        .module-name {
          font-family: monospace;
          font-size: 10px;
          color: #11140f;
        }

        /* PERMISSION BADGES */

        .permission {
          display: inline-block;

          padding: 5px 10px;

          border-radius: 9px;

          font-family: monospace;
          font-size: 8px;

          color: #817e77;
          background: #f0eff1;
        }

        .permission.full {
          color: #607357;
          background: #eaf1e6;
        }

        .permission.view-edit {
          color: #77748a;
          background: #f0eef4;
        }

        .permission.view {
          color: #74758a;
          background: #f0eff4;
        }

        .permission.dept {
          color: #6f7183;
          background: #f0eff4;
        }

        .permission.own {
          color: #77748a;
          background: #f0eff4;
        }

        .permission.partial {
          color: #77748a;
          background: #f0eff4;
        }

        .permission.none {
          color: #aaa69d;
          background: #e9e7e1;
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

          box-shadow:
            0 2px 8px rgba(0, 0, 0, .25);

          cursor: pointer;
        }

        /* RESPONSIVE */

        @media (max-width: 1000px) {

          .company-stats {
            gap: 25px;
          }

          .company-identifiers {
            flex-wrap: wrap;
          }

          .permission-card {
            overflow-x: auto;
          }

          .permission-table-header,
          .permission-row {
            min-width: 850px;
          }
        }

        @media (max-width: 700px) {

          .company-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }

          .company-stats {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }

          .roles-page {
            padding: 10px;
          }
        }

      `}</style>
    </div>
  );
};

export default RolesPermissions;