import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../core/constants/routes.constant";

const Users = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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

  const users = [
    {
      initials: "AM",
      name: "Arjun Mehta",
      email: "arjun@acme.com",
      role: "Super Admin",
      branch: "HQ — Mumbai",
      lastLogin: "Today, 9:14 AM",
      status: "ACTIVE",
    },
    {
      initials: "PN",
      name: "Priya Nair",
      email: "priya@acme.com",
      role: "Admin",
      branch: "HQ — Mumbai",
      lastLogin: "Today, 8:42 AM",
      status: "ACTIVE",
    },
    {
      initials: "RS",
      name: "Rahul Sharma",
      email: "rahul@acme.com",
      role: "Finance Manager",
      branch: "HQ — Mumbai",
      lastLogin: "Today, 10:02 AM",
      status: "ACTIVE",
    },
    {
      initials: "AS",
      name: "Ananya Singh",
      email: "ananya@acme.com",
      role: "Sales Manager",
      branch: "West — Pune",
      lastLogin: "Yesterday, 6:30 PM",
      status: "ACTIVE",
    },
    {
      initials: "DR",
      name: "Deepika Rao",
      email: "deepika@acme.com",
      role: "HR Manager",
      branch: "HQ — Mumbai",
      lastLogin: "Today, 9:58 AM",
      status: "ACTIVE",
    },
    {
      initials: "VJ",
      name: "Vikram Joshi",
      email: "vikram@acme.com",
      role: "Operations Manager",
      branch: "Factory — Pune",
      lastLogin: "Today, 7:45 AM",
      status: "ACTIVE",
    },
    {
      initials: "AK",
      name: "Aditya Kumar",
      email: "aditya@acme.com",
      role: "Employee",
      branch: "HQ — Mumbai",
      lastLogin: "2 days ago",
      status: "ACTIVE",
    },
    {
      initials: "SG",
      name: "Smita Gupta",
      email: "smita@acme.com",
      role: "Employee",
      branch: "West — Pune",
      lastLogin: "Today, 8:15 AM",
      status: "INACTIVE",
    },
  ];

  const filteredUsers = users.filter((user) => {
    const value = search.toLowerCase();

    return (
      user.name.toLowerCase().includes(value) ||
      user.email.toLowerCase().includes(value) ||
      user.role.toLowerCase().includes(value) ||
      user.branch.toLowerCase().includes(value)
    );
  });

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
    <div className="users-page">

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

          <div className="status">ACTIVE</div>

        </div>
      </section>

      {/* TABS */}

      <nav className="company-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`company-tab ${
              tab === "USERS" ? "active" : ""
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* USERS CARD */}

      <section className="users-card">

        <div className="users-header">

          <div className="users-title">
            <h2>Users</h2>

            <div className="user-search">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <button className="invite-btn">
            + Invite User
          </button>

        </div>

        {/* TABLE HEADER */}

        <div className="users-table-header">
          <div>USER</div>
          <div>ROLE</div>
          <div>BRANCH</div>
          <div>LAST LOGIN</div>
          <div>STATUS</div>
        </div>

        {/* USER ROWS */}

        <div className="users-list">

          {filteredUsers.map((user) => (
            <div className="user-row" key={user.email}>

              <div className="user-info">

                <div className="user-avatar">
                  {user.initials}
                </div>

                <div>
                  <div className="user-name">
                    {user.name}
                  </div>

                  <div className="user-email">
                    {user.email}
                  </div>
                </div>

              </div>

              <div className="user-role">
                {user.role}
              </div>

              <div className="user-branch">
                {user.branch}
              </div>

              <div className="last-login">
                {user.lastLogin}
              </div>

              <div>
                <span
                  className={`user-status ${
                    user.status === "ACTIVE"
                      ? "active"
                      : "inactive"
                  }`}
                >
                  {user.status}
                </span>
              </div>

            </div>
          ))}

        </div>

      </section>

      {/* HELP */}

      <button className="help-button">?</button>

      {/* STYLES */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .users-page {
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

        /* USERS CARD */

        .users-card {
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          overflow: hidden;
        }

        .users-header {
          height: 66px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e3e0d8;
        }

        .users-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .users-header h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 17px;
          font-weight: 400;
        }

        /* SEARCH */

        .user-search {
          width: 320px;
          height: 35px;
          border-radius: 11px;
          background: #f5f4f0;
          border: 1px solid #e2dfd8;
          display: flex;
          align-items: center;
          padding: 0 11px;
        }

        .search-icon {
          font-size: 17px;
          color: #aaa69f;
          margin-right: 7px;
        }

        .user-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-family: monospace;
          font-size: 9px;
          color: #555;
        }

        .user-search input::placeholder {
          color: #aaa69f;
        }

        /* INVITE */

        .invite-btn {
          height: 32px;
          padding: 0 15px;
          border: none;
          border-radius: 11px;
          background: #111410;
          color: #fff;
          font-family: monospace;
          font-size: 9px;
          cursor: pointer;
        }

        /* TABLE */

        .users-table-header {
          height: 38px;
          display: grid;
          grid-template-columns: 2.1fr 1.9fr 1.55fr 1.6fr 0.9fr;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #e3e0d8;
          color: #aaa69e;
          font-family: monospace;
          font-size: 7px;
          letter-spacing: .6px;
        }

        .user-row {
          min-height: 61px;
          display: grid;
          grid-template-columns: 2.1fr 1.9fr 1.55fr 1.6fr 0.9fr;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #e3e0d8;
        }

        .user-row:last-child {
          border-bottom: none;
        }

        /* USER */

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f0f3ed;
          border: 1px solid #dce4d7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-size: 8px;
          color: #6c7768;
        }

        .user-name {
          font-family: monospace;
          font-size: 11px;
          color: #11140f;
          margin-bottom: 2px;
        }

        .user-email {
          font-family: monospace;
          font-size: 8px;
          color: #aaa69e;
        }

        .user-role,
        .user-branch,
        .last-login {
          font-family: monospace;
          font-size: 9px;
          color: #817e77;
        }

        /* STATUS */

        .user-status {
          display: inline-block;
          padding: 6px 11px;
          border-radius: 9px;
          font-family: monospace;
          font-size: 8px;
        }

        .user-status.active {
          background: #e8f0e4;
          color: #63755c;
        }

        .user-status.inactive {
          background: #e9e7e1;
          color: #969188;
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
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }

        @media (max-width: 1000px) {
          .company-stats {
            gap: 25px;
          }

          .company-identifiers {
            flex-wrap: wrap;
          }

          .users-card {
            overflow-x: auto;
          }

          .users-table-header,
          .user-row {
            min-width: 950px;
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

          .users-title {
            flex-direction: column;
            align-items: flex-start;
          }

          .users-header {
            height: auto;
            padding: 15px;
            gap: 15px;
          }

          .user-search {
            width: 240px;
          }
        }

      `}</style>
    </div>
  );
};

export default Users;