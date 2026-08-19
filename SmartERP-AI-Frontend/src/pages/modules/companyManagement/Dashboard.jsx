import React, { useState } from "react";

import Overview from "./Overview";
import Branches from "./Branches";
import Departments from "./Departments";
import Users from "./Users";
import RolesPermissions from "./RolesPermissions";
import ApprovalWorkflows from "./ApprovalWorkflows";
import Holidays from "./Holidays";
import CompanySettings from "./CompanySettings";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "OVERVIEW" },
    { id: "branches", label: "BRANCHES" },
    { id: "departments", label: "DEPARTMENTS" },
    { id: "users", label: "USERS" },
    { id: "roles", label: "ROLES & PERMISSIONS" },
    { id: "approval", label: "APPROVAL WORKFLOWS" },
    { id: "holidays", label: "HOLIDAYS" },
    { id: "settings", label: "SETTINGS" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview />;

      case "branches":
        return <Branches />;

      case "departments":
        return <Departments />;

      case "users":
        return <Users />;

      case "roles":
        return <RolesPermissions />;

      case "approval":
        return <ApprovalWorkflows />;

      case "holidays":
        return <Holidays />;

      case "settings":
        return <CompanySettings />;

      default:
        return <Overview />;
    }
  };

  return (
    <div className="company-dashboard">

      {/* ================= COMPANY MANAGEMENT HEADER ================= */}

      <div className="company-dashboard-header">

        <div>
          <div className="company-eyebrow">
            ADMINISTRATION
          </div>

          <h1>
            Company Management
          </h1>
        </div>

        <div className="company-actions">
          <button className="export-btn">
            Export
          </button>

          <button className="add-btn">
            + Add
          </button>
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

            <h2>
              Acme Manufacturing Ltd
            </h2>

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

          <div className="stat">
            <strong>Business</strong>
            <span>PLAN</span>
          </div>

          <div className="status">
            ACTIVE
          </div>

        </div>

      </section>

      {/* ================= 8 COMMON TABS ================= */}

      <div className="company-tabs">

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`company-tab ${
              activeTab === tab.id ? "active" : ""
            }`}
          >
            {tab.label}
          </button>
        ))}

      </div>

      {/* ================= ACTIVE TAB CONTENT ================= */}

      <div className="company-tab-content">
        {renderTabContent()}
      </div>

      {/* ================= CSS ================= */}

      <style>{`

        .company-dashboard {
          width: 100%;
          background: #f5f4ef;
        }

        /* HEADER */

        .company-dashboard-header {
          height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .company-eyebrow {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #99988f;
          margin-bottom: 5px;
        }

        .company-dashboard-header h1 {
          margin: 0;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 28px;
          font-weight: 400;
          color: #10130f;
        }

        .company-actions {
          display: flex;
          gap: 9px;
        }

        .export-btn,
        .add-btn {
          height: 38px;

          padding: 0 17px;

          border-radius: 12px;

          font-size: 10px;

          cursor: pointer;
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

          grid-template-columns:
            repeat(2, 13px);

          grid-template-rows:
            repeat(2, 13px);

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

          font-family:
            Georgia,
            "Times New Roman",
            serif;

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

          gap: 55px;
        }

        .stat {
          min-width: 60px;

          text-align: center;
        }

        .stat strong {
          display: block;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

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

          white-space: nowrap;
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

          cursor: pointer;

          flex-shrink: 0;
        }

        .company-tab.active {
          background: #fff;

          color: #151713;

          border: 1px solid #e8e5de;

          box-shadow:
            0 2px 6px
            rgba(0, 0, 0, 0.07);
        }

        /* CONTENT */

        .company-tab-content {
          width: 100%;
        }

        @media (max-width: 900px) {

          .company-summary {
            flex-direction: column;

            align-items: flex-start;

            gap: 20px;
          }

          .company-stats {
            width: 100%;

            justify-content: space-between;

            flex-wrap: wrap;

            gap: 20px;
          }

        }

      `}</style>

    </div>
  );
};

export default Dashboard;