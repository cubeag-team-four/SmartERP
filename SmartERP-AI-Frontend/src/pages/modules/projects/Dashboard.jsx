import React, { useState } from "react";
import ProjectPlanning from "./ProjectPlanning";
import Tasks from "./Tasks";
import TimeTracking from "./TimeTracking";
import BudgetMonitoring from "./BudgetMonitoring";
import NewProjectModal from "./NewProjectModal";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("projects");
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const tabs = [
    { id: "projects", label: "PROJECTS", enabled: true },
    { id: "tasks", label: "TASKS", enabled: true },
    { id: "timeline", label: "TIMELINE", enabled: true },
    { id: "budget", label: "BUDGET", enabled: true },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "projects":
        return <ProjectPlanning />;

      case "tasks":
        return <Tasks />;

      case "timeline":
        return <TimeTracking />;

      case "budget":
        return <BudgetMonitoring />;

      default:
        return <ProjectPlanning />;
    }
  };

  return (
    <div className="projects-dashboard">

      {/* =====================================================
          COMMON PAGE HEADER
      ====================================================== */}
      <header className="projects-dashboard-header">

        <div>
          <div className="projects-eyebrow">
            WORK
          </div>

          <h1>
            Projects &amp; Tasks
          </h1>
        </div>

        <div className="projects-header-actions">

          <button
            type="button"
            className="projects-ai-btn"
          >
            ✦ Ask AI
          </button>

          <button
            type="button"
            className="projects-export-btn"
          >
            ↓ Export
          </button>

          <button
            type="button"
            className="projects-new-btn"
            onClick={() => setNewProjectOpen(true)}
          >
            + New Project
          </button>

        </div>

      </header>


      {/* =====================================================
          COMMON KPI CARDS
      ====================================================== */}
      <section className="projects-kpi-grid">

        <div className="projects-kpi-card">
          <strong>4</strong>
          <span>ACTIVE PROJECTS</span>
          <small>4 due this month</small>
        </div>

        <div className="projects-kpi-card">
          <strong>₹2.4 Cr</strong>
          <span>TOTAL BUDGET</span>
          <small>₹80L spent</small>
        </div>

        <div className="projects-kpi-card">
          <strong>6</strong>
          <span>OPEN TASKS</span>
          <small>2 overdue</small>
        </div>

        <div className="projects-kpi-card">
          <strong>82%</strong>
          <span>ON-TIME RATE</span>
          <small>↓ 3pp vs last Q</small>
        </div>

      </section>


      {/* =====================================================
          PARENT MODULE NAVIGATION
      ====================================================== */}
      <nav
        className="projects-dashboard-tabs"
        aria-label="Projects module navigation"
      >

        {tabs.map((tab) => (

          <button
            key={tab.id}
            type="button"
            disabled={!tab.enabled}
            className={`projects-dashboard-tab ${
              activeTab === tab.id ? "active" : ""
            } ${!tab.enabled ? "disabled" : ""}`}
            onClick={() => {
              if (tab.enabled) {
                setActiveTab(tab.id);
              }
            }}
            aria-current={
              activeTab === tab.id ? "page" : undefined
            }
          >
            {tab.label}
          </button>

        ))}

      </nav>


      {/* =====================================================
          ACTIVE CHILD PAGE
      ====================================================== */}
      <main className="projects-dashboard-content">
        {renderTabContent()}
      </main>

      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
      />


      {/* =====================================================
          CSS
      ====================================================== */}
      <style>{`

        .projects-dashboard {
          width: 100%;
          min-height: 100%;
          box-sizing: border-box;

          padding:
            35px  35px 50px;

          background:
            #f5f4ef;

          color:
            #11140f;

          font-family:
            var(--sans),
            "DM Sans",
            system-ui,
            sans-serif;
        }


        /* ================= HEADER ================= */

        .projects-dashboard-header {
          display:
            flex;

          align-items:
            flex-end;

          justify-content:
            space-between;

          gap:
            24px;

          margin-bottom:
            24px;
        }


        .projects-eyebrow {
          margin-bottom:
            7px;

          font-size:
            9px;

          letter-spacing:
            1.6px;

          color:
            #99978f;
        }


        .projects-dashboard-header h1 {
          margin:
            0;

          font-family:
            var(--serif),
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            29px;

          line-height:
            1.1;

          font-weight:
            400;
        }


        .projects-header-actions {
          display:
            flex;

          align-items:
            center;

          gap:
            8px;
        }


        .projects-header-actions button {
          height:
            38px;

          padding:
            0 16px;

          border-radius:
            12px;

          font-family:
            var(--sans),
            "DM Sans",
            system-ui,
            sans-serif;

          font-size:
            9px;

          cursor:
            pointer;

          white-space:
            nowrap;
        }


        .projects-ai-btn {
          background:
            #edf1e8;

          border:
            1px solid #dfe6d9;

          color:
            #52614d;
        }


        .projects-export-btn {
          background:
            #fff;

          border:
            1px solid #e0ddd5;

          color:
            #44423e;
        }


        .projects-new-btn {
          background:
            #111410;

          border:
            1px solid #111410;

          color:
            #fff;
        }


        /* ================= KPI ================= */

        .projects-kpi-grid {
          display:
            grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap:
            12px;

          margin-bottom:
            18px;
        }


        .projects-kpi-card {
          min-height:
            103px;

          padding:
            18px;

          box-sizing:
            border-box;

          background:
            #fff;

          border:
            1px solid #e1dfd8;

          border-radius:
            14px;
        }


        .projects-kpi-card strong {
          display:
            block;

          margin-bottom:
            7px;

          font-family:
            var(--serif),
            "DM Serif Display",
            Georgia,
            serif;

          font-size:
            24px;

          line-height:
            1;

          font-weight:
            400;
        }


        .projects-kpi-card span {
          display:
            block;

          margin-bottom:
            7px;

          font-size:
            8px;

          letter-spacing:
            1px;

          color:
            #9f9a92;
        }


        .projects-kpi-card small {
          font-size:
            9px;

          color:
            #55524d;
        }


        /* ================= PARENT TABS ================= */

        .projects-dashboard-tabs {
          display:
            flex;

          align-items:
            center;

          gap:
            4px;

          margin-bottom:
            22px;

          padding-left:
            2px;

          overflow-x:
            auto;

          white-space:
            nowrap;

          scrollbar-width:
            none;
        }


        .projects-dashboard-tabs::-webkit-scrollbar {
          display:
            none;
        }


        .projects-dashboard-tab {
          height:
            42px;

          min-width:
            92px;

          padding:
            0 22px;

          border:
            1px solid transparent;

          border-radius:
            10px;

          background:
            transparent;

          color:
            #8d8981;

          font-family:
            monospace;

          font-size:
            10px;

          letter-spacing:
            1px;

          cursor:
            pointer;

          flex-shrink:
            0;

          transition:
            background .15s ease,
            border-color .15s ease,
            color .15s ease;
        }


        .projects-dashboard-tab:hover:not(.disabled) {
          color:
            #151713;
        }


        .projects-dashboard-tab.active {
          background:
            #fff;

          color:
            #11140f;

          border-color:
            #e3e0d9;

          box-shadow:
            0 2px 6px
            rgba(0, 0, 0, .06);
        }


        .projects-dashboard-tab.disabled {
          color:
            #bbb7b0;

          cursor:
            not-allowed;

          opacity:
            .7;
        }


        /* ================= CONTENT ================= */

        .projects-dashboard-content {
          width:
            100%;

          min-height:
            200px;
        }


        .projects-coming-soon {
          min-height:
            250px;

          display:
            grid;

          place-items:
            center;

          background:
            #fff;

          border:
            1px solid #e1dfd8;

          border-radius:
            15px;

          color:
            #99958d;

          font-family:
            monospace;

          font-size:
            10px;
        }


        button:focus-visible {
          outline:
            2px solid #a0b290;

          outline-offset:
            2px;
        }


        /* ================= RESPONSIVE ================= */

        @media (max-width: 1000px) {

          .projects-kpi-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }


        @media (max-width: 780px) {

          .projects-dashboard {
            padding:
              20px 16px 40px;
          }


          .projects-dashboard-header {
            align-items:
              flex-start;

            flex-direction:
              column;
          }


          .projects-header-actions {
            width:
              100%;
          }


          .projects-header-actions button {
            flex:
              1;
          }

        }


        @media (max-width: 560px) {

          .projects-kpi-grid {
            grid-template-columns:
              1fr;
          }


          .projects-header-actions {
            flex-wrap:
              wrap;
          }


          .projects-header-actions button {
            flex:
              1 1 calc(50% - 4px);
          }


          .projects-dashboard-header h1 {
            font-size:
              25px;
          }

        }

      `}</style>

    </div>
  );
};

export default Dashboard;