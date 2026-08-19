import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const ApprovalWorkflows = () => {
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

  const workflows = [
    {
      title: "Purchase Order Approval",
      trigger: "Amount > ₹25,000",
      steps: ["Requestor", "Manager", "Finance", "MD"],
      status: "ACTIVE",
    },
    {
      title: "Leave Request",
      trigger: "All requests",
      steps: ["Employee", "Manager", "HR"],
      status: "ACTIVE",
    },
    {
      title: "Expense Claim",
      trigger: "Amount > ₹5,000",
      steps: ["Employee", "Manager", "Finance"],
      status: "ACTIVE",
    },
    {
      title: "Sales Discount Override",
      trigger: "Discount > 10%",
      steps: ["Sales", "Sales Manager", "MD"],
      status: "ACTIVE",
    },
    {
      title: "New Vendor Onboarding",
      trigger: "New vendor",
      steps: ["Purchase", "Finance", "Admin"],
      status: "ACTIVE",
    },
    {
      title: "Asset Disposal",
      trigger: "Asset value > ₹50,000",
      steps: ["Requestor", "Operations", "Finance", "MD"],
      status: "INACTIVE",
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
    <div className="approval-page">

      {/* HEADER */}

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
              tab === "APPROVAL WORKFLOWS" ? "active" : ""
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </button>
        ))}

      </nav>

      {/* WORKFLOWS */}

      <section className="workflow-list">

        {workflows.map((workflow) => (
          <div
            className="workflow-card"
            key={workflow.title}
          >

            <div className="workflow-content">

              <h2>{workflow.title}</h2>

              <div className="trigger">
                Trigger: &nbsp;
                {workflow.trigger}
              </div>

              <div className="workflow-steps">

                {workflow.steps.map((step, index) => (
                  <React.Fragment key={step}>

                    <div className="step">
                      {step}
                    </div>

                    {index < workflow.steps.length - 1 && (
                      <span className="arrow">
                        →
                      </span>
                    )}

                  </React.Fragment>
                ))}

              </div>

            </div>

            <span
              className={`workflow-status ${
                workflow.status === "ACTIVE"
                  ? "active"
                  : "inactive"
              }`}
            >
              {workflow.status}
            </span>

          </div>
        ))}

      </section>

      {/* HELP */}

      <button className="help-button">
        ?
      </button>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .approval-page {
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

        /* COMPANY */

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
          min-width: 58px;
          text-align: center;
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

        /* WORKFLOW LIST */

        .workflow-list {
          display: flex;
          flex-direction: column;

          gap: 11px;
        }

        /* WORKFLOW CARD */

        .workflow-card {
          min-height: 94px;

          background: #fff;

          border: 1px solid #e1dfd8;

          border-radius: 14px;

          padding: 17px 15px;

          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          position: relative;
        }

        .workflow-content {
          display: flex;
          flex-direction: column;
        }

        .workflow-card h2 {
          margin: 0 0 3px;

          font-family: Georgia, "Times New Roman", serif;
          font-size: 14px;
          font-weight: 400;
        }

        .trigger {
          font-family: monospace;
          font-size: 8px;

          color: #99968e;

          margin-bottom: 11px;
        }

        /* STEPS */

        .workflow-steps {
          display: flex;
          align-items: center;

          gap: 7px;
        }

        .step {
          min-width: 57px;
          height: 22px;

          padding: 0 9px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #f5f4ef;

          border: 1px solid #e0ddd5;

          border-radius: 6px;

          font-family: monospace;
          font-size: 7px;

          color: #77746d;
        }

        .arrow {
          font-family: monospace;
          font-size: 10px;

          color: #aaa69e;
        }

        /* STATUS */

        .workflow-status {
          position: absolute;

          top: 22px;
          right: 16px;

          padding: 5px 9px;

          border-radius: 8px;

          font-family: monospace;
          font-size: 8px;
        }

        .workflow-status.active {
          color: #63755c;
          background: #eaf1e6;
        }

        .workflow-status.inactive {
          color: #a09d94;
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
        }

        @media (max-width: 700px) {

          .approval-page {
            padding: 10px;
          }

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

          .workflow-card {
            min-height: 115px;
          }

          .workflow-steps {
            flex-wrap: wrap;
          }
        }

      `}</style>
    </div>
  );
};

export default ApprovalWorkflows;