import React, { useState } from "react";
import Overview from "./Overview";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("projects");

  const tabs = [
    { id: "projects", label: "PROJECTS" },
    { id: "tasks", label: "TASKS" },
    { id: "timeline", label: "TIMELINE" },
    { id: "budget", label: "BUDGET" },
  ];

  return (
    <div className="projects-dashboard">
      <div className="projects-dashboard-content">
        {activeTab === "projects" ? (
          <Overview />
        ) : (
          <div className="projects-placeholder">
            {activeTab.toUpperCase()} page will be integrated here.
          </div>
        )}
      </div>

      <div className="projects-parent-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <style>{`
        .projects-dashboard {
          width: 100%;
          min-height: 100%;
          background: #f5f4ef;
        }

        .projects-dashboard-content {
          width: 100%;
        }

        /*
          The Projects page contains the visual tab bar shown in the Figma.
          This parent-level nav is hidden for now so we do not render
          duplicate PROJECTS/TASKS/TIMELINE/BUDGET controls.
          Later, Tasks/Timeline/Budget can be mounted here while keeping
          Projects.jsx as the first child page.
        */
        .projects-parent-nav {
          display: none;
        }

        .projects-placeholder {
          margin: 24px 22px;
          min-height: 250px;
          display: grid;
          place-items: center;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          background: #fff;
          color: #99958d;
          font-family: monospace;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;