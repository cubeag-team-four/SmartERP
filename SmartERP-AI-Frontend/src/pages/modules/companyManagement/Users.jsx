import React, { useState } from "react";

// ─── Dropdown options ─────────────────────────────────────────────────────────
const COMPANIES   = ["Acme Manufacturing Ltd", "Acme Exports Pvt Ltd"];
const BRANCHES    = ["Mumbai Head Office", "Pune Plant", "Delhi Office", "Bengaluru Branch"];
const DEPARTMENTS = ["Finance Department", "Sales Department", "HR Department", "Operations", "IT Department", "Marketing", "Procurement"];
const ROLES       = ["Super Admin", "Admin", "Finance Manager", "Sales Manager", "HR Manager", "Operations Manager", "Employee"];
const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65"];

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", countryCode: "+91", mobile: "", employeeId: "",
  company: "Acme Manufacturing Ltd", branch: "Mumbai Head Office", department: "Finance Department", role: "",
  status: "active", sendEmail: "yes", joiningDate: "", message: "",
};

// ─── Invite User Modal ────────────────────────────────────────────────────────
function InviteUserModal({ onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim())  e.lastName  = "Required";
    if (!form.email.trim())     e.email     = "Required";
    if (!form.role)             e.role      = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = () => { if (validate()) { onSubmit(form); onClose(); } };

  return (
    <div className="ivm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ivm-modal">

        {/* Header */}
        <div className="ivm-head">
          <div>
            <h2>Invite User</h2>
            <p>Invite a new user to join Acme Manufacturing Ltd</p>
          </div>
          <button className="ivm-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="ivm-body">

          {/* Row container for 2-column layout */}
          <div className="ivm-row">

            {/* ── Left: User Information ── */}
            <div className="ivm-section">
              <div className="ivm-sec-head">
                <div className="ivm-sec-icon">👤</div>
                <div>
                  <strong>User Information</strong>
                  <span>Enter the basic details of the user</span>
                </div>
              </div>

              <div className="ivm-grid-2">
                <div className="ivm-field">
                  <label>First Name <span className="ivm-req">*</span></label>
                  <div className="ivm-icon-wrap">
                    <span className="ivm-fi">👤</span>
                    <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                      placeholder="Enter first name" className={`ivm-input ivm-input--icon${errors.firstName ? " ivm-input--err" : ""}`} />
                  </div>
                  {errors.firstName && <span className="ivm-err">{errors.firstName}</span>}
                </div>

                <div className="ivm-field">
                  <label>Last Name <span className="ivm-req">*</span></label>
                  <div className="ivm-icon-wrap">
                    <span className="ivm-fi">👤</span>
                    <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                      placeholder="Enter last name" className={`ivm-input ivm-input--icon${errors.lastName ? " ivm-input--err" : ""}`} />
                  </div>
                  {errors.lastName && <span className="ivm-err">{errors.lastName}</span>}
                </div>
              </div>

              <div className="ivm-grid-2">
                <div className="ivm-field">
                  <label>Email Address <span className="ivm-req">*</span></label>
                  <div className="ivm-icon-wrap">
                    <span className="ivm-fi">✉</span>
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                      placeholder="Enter email address" className={`ivm-input ivm-input--icon${errors.email ? " ivm-input--err" : ""}`} />
                  </div>
                  {errors.email && <span className="ivm-err">{errors.email}</span>}
                </div>

                <div className="ivm-field">
                  <label>Mobile Number (Optional)</label>
                  <div className="ivm-mobile-wrap">
                    <select value={form.countryCode} onChange={e => set("countryCode", e.target.value)} className="ivm-cc">
                      {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="ivm-icon-wrap" style={{ flex: 1 }}>
                      <span className="ivm-fi">📞</span>
                      <input value={form.mobile} onChange={e => set("mobile", e.target.value)}
                        placeholder="Enter mobile number" className="ivm-input ivm-input--icon" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="ivm-field">
                <label>Employee ID (Optional)</label>
                <div className="ivm-icon-wrap">
                  <span className="ivm-fi">🆔</span>
                  <input value={form.employeeId} onChange={e => set("employeeId", e.target.value)}
                    placeholder="Enter employee ID" className="ivm-input ivm-input--icon" />
                </div>
              </div>
            </div>

            {/* ── Right: Organization Assignment ── */}
            <div className="ivm-section">
              <div className="ivm-sec-head">
                <div className="ivm-sec-icon">🏢</div>
                <div>
                  <strong>Organization Assignment</strong>
                  <span>Assign the user to company, branch and department</span>
                </div>
              </div>

              <div className="ivm-field">
                <label>Company <span className="ivm-req">*</span></label>
                <div className="ivm-sel-wrap">
                  <select value={form.company} onChange={e => set("company", e.target.value)} className="ivm-select">
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="ivm-chev">▾</span>
                </div>
              </div>

              <div className="ivm-field">
                <label>Branch <span className="ivm-req">*</span></label>
                <div className="ivm-sel-wrap">
                  <select value={form.branch} onChange={e => set("branch", e.target.value)} className="ivm-select">
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <span className="ivm-chev">▾</span>
                </div>
              </div>

              <div className="ivm-field">
                <label>Department <span className="ivm-req">*</span></label>
                <div className="ivm-sel-wrap">
                  <select value={form.department} onChange={e => set("department", e.target.value)} className="ivm-select">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <span className="ivm-chev">▾</span>
                </div>
              </div>

              <div className="ivm-field">
                <label>Role <span className="ivm-req">*</span></label>
                <div className="ivm-sel-wrap">
                  <select value={form.role} onChange={e => set("role", e.target.value)}
                    className={`ivm-select${errors.role ? " ivm-input--err" : ""}`}>
                    <option value="">Select role</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="ivm-chev">▾</span>
                </div>
                {errors.role && <span className="ivm-err">{errors.role}</span>}
              </div>
            </div>

          </div>

          {/* ── Full-width: Access & Invitation Settings ── */}
          <div className="ivm-section">
            <div className="ivm-sec-head">
              <div className="ivm-sec-icon">🔒</div>
              <div>
                <strong>Access & Invitation Settings</strong>
                <span>Set access status and invitation preferences</span>
              </div>
            </div>

            <div className="ivm-grid-3">
              {/* User Status */}
              <div className="ivm-field">
                <label>User Status <span className="ivm-req">*</span></label>
                <div className="ivm-pill-row">
                  <label className={`ivm-pill${form.status === "active" ? " ivm-pill--on" : ""}`}>
                    <input type="radio" name="ivm-status" value="active" checked={form.status === "active"} onChange={() => set("status", "active")} />
                    <span className="ivm-dot" />
                    Active
                  </label>
                  <label className={`ivm-pill${form.status === "inactive" ? " ivm-pill--off" : ""}`}>
                    <input type="radio" name="ivm-status" value="inactive" checked={form.status === "inactive"} onChange={() => set("status", "inactive")} />
                    <span className="ivm-dot ivm-dot--grey" />
                    Inactive
                  </label>
                </div>
              </div>

              {/* Send Invitation Email */}
              <div className="ivm-field">
                <label>Send Invitation Email <span className="ivm-req">*</span></label>
                <div className="ivm-pill-row">
                  <label className={`ivm-pill${form.sendEmail === "yes" ? " ivm-pill--on" : ""}`}>
                    <input type="radio" name="ivm-email" value="yes" checked={form.sendEmail === "yes"} onChange={() => set("sendEmail", "yes")} />
                    <span className="ivm-dot" />
                    Yes, send invitation email
                  </label>
                  <label className={`ivm-pill${form.sendEmail === "no" ? " ivm-pill--off" : ""}`}>
                    <input type="radio" name="ivm-email" value="no" checked={form.sendEmail === "no"} onChange={() => set("sendEmail", "no")} />
                    <span className="ivm-dot ivm-dot--grey" />
                    No, I will invite later
                  </label>
                </div>
              </div>

              {/* Joining Date */}
              <div className="ivm-field">
                <label>Joining Date (Optional)</label>
                <div className="ivm-icon-wrap">
                  <span className="ivm-fi">📅</span>
                  <input type="date" value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)}
                    placeholder="Select joining date" className="ivm-input ivm-input--icon" />
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="ivm-field">
              <label>Message (Optional)</label>
              <textarea rows={3} value={form.message} onChange={e => set("message", e.target.value)}
                placeholder="Add a personal message to the invitation email..." className="ivm-input ivm-textarea" maxLength={250} />
              <div className="ivm-char-count">{form.message.length}/250</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="ivm-footer">
          <button className="ivm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ivm-btn-submit" onClick={submit}>
            <span style={{ marginRight: 6 }}>✉</span> Send Invitation
          </button>
        </div>

      </div>

      {/* Styles */}
      <style>{`
        .ivm-overlay { position: fixed; inset: 0; background: rgba(16,19,15,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .ivm-modal { background: #f5f4ef; border: 1px solid #e1dfd8; border-radius: 18px; width: 100%; max-width: 920px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.16); overflow: hidden; }
        
        .ivm-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 22px 26px 16px; border-bottom: 1px solid #e1dfd8; background: #f5f4ef; flex-shrink: 0; }
        .ivm-head h2 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #10130f; }
        .ivm-head p { margin: 0; font-size: 12px; color: #99988f; }
        .ivm-close { background: #fff; border: 1px solid #e1dfd8; width: 32px; height: 32px; border-radius: 9px; font-size: 14px; color: #7a7970; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
        .ivm-close:hover { background: #ece9e0; color: #10130f; }
        
        .ivm-body { overflow-y: auto; padding: 0 26px 20px; display: flex; flex-direction: column; gap: 14px; background: #f5f4ef; }
        
        .ivm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
        
        .ivm-section { background: #fff; border: 1px solid #e1dfd8; border-radius: 14px; padding: 20px 18px; display: flex; flex-direction: column; gap: 14px; }
        
        .ivm-sec-head { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #ece9e0; }
        .ivm-sec-icon { width: 36px; height: 36px; background: #f5f4ef; border: 1px solid #e1dfd8; border-radius: 10px; display: grid; place-items: center; font-size: 16px; flex-shrink: 0; }
        .ivm-sec-head strong { display: block; font-size: 13px; font-weight: 600; color: #10130f; margin-bottom: 3px; }
        .ivm-sec-head span { font-size: 11px; color: #99988f; }
        
        .ivm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ivm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        
        .ivm-field { display: flex; flex-direction: column; gap: 5px; }
        .ivm-field label { font-size: 11px; font-weight: 500; color: #4a4a40; }
        .ivm-req { color: #c0392b; }
        
        .ivm-input { width: 100%; padding: 10px 12px; border: 1px solid #e0ddd5; border-radius: 10px; font-size: 13px; color: #10130f; background: #faf9f5; outline: none; box-sizing: border-box; transition: border-color 0.15s, background 0.15s; }
        .ivm-input::placeholder { color: #b8b5ad; }
        .ivm-input:focus { border-color: #10130f; background: #fff; }
        .ivm-input--err { border-color: #c0392b !important; }
        .ivm-textarea { resize: vertical; min-height: 64px; }
        
        .ivm-icon-wrap { position: relative; }
        .ivm-fi { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #b0ada5; pointer-events: none; }
        .ivm-input--icon { padding-left: 32px; }
        
        .ivm-mobile-wrap { display: flex; gap: 8px; }
        .ivm-cc { width: 80px; padding: 10px 8px; border: 1px solid #e0ddd5; border-radius: 10px; font-size: 13px; color: #10130f; background: #faf9f5; outline: none; cursor: pointer; }
        
        .ivm-sel-wrap { position: relative; }
        .ivm-select { width: 100%; padding: 10px 34px 10px 12px; border: 1px solid #e0ddd5; border-radius: 10px; font-size: 13px; color: #10130f; background: #faf9f5; appearance: none; outline: none; cursor: pointer; box-sizing: border-box; transition: border-color 0.15s; }
        .ivm-select:focus { border-color: #10130f; background: #fff; }
        .ivm-chev { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: #9a9890; font-size: 11px; pointer-events: none; }
        
        .ivm-err { font-size: 11px; color: #c0392b; }
        
        .ivm-pill-row { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 2px; }
        .ivm-pill { display: flex; align-items: center; gap: 8px; padding: 9px 16px; border: 1.5px solid #e1dfd8; border-radius: 50px; cursor: pointer; font-size: 12px; color: #3a3a30; background: #faf9f5; transition: all 0.15s; user-select: none; }
        .ivm-pill input[type="radio"] { display: none; }
        .ivm-dot { width: 9px; height: 9px; border-radius: 50%; background: #3d8a30; flex-shrink: 0; }
        .ivm-dot--grey { background: #b0b0a8; }
        .ivm-pill--on { border-color: #7dba6a; background: #f2faf0; color: #2e6e22; }
        .ivm-pill--off { border-color: #e1dfd8; background: #faf9f5; }
        
        .ivm-char-count { text-align: right; font-size: 10px; color: #9a9890; margin-top: -2px; }
        
        .ivm-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 26px; border-top: 1px solid #e1dfd8; background: #f5f4ef; flex-shrink: 0; }
        .ivm-btn-cancel { height: 38px; padding: 0 20px; border: 1px solid #e0ddd5; border-radius: 12px; background: #fff; color: #20221e; font-size: 12px; font-weight: 500; cursor: pointer; }
        .ivm-btn-cancel:hover { background: #ece9e0; }
        .ivm-btn-submit { height: 38px; padding: 0 22px; border: none; border-radius: 12px; background: #111410; color: #fff; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; transition: background 0.15s; }
        .ivm-btn-submit:hover { background: #1e2419; }
        
        @media (max-width: 860px) {
          .ivm-row { grid-template-columns: 1fr; }
          .ivm-grid-2, .ivm-grid-3 { grid-template-columns: 1fr; }
          .ivm-modal { border-radius: 14px; }
          .ivm-head, .ivm-footer { padding-left: 16px; padding-right: 16px; }
          .ivm-body { padding: 0 16px 18px; }
        }
      `}</style>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
const Users = () => {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const users = [
    { initials: "AM", name: "Arjun Mehta",    email: "arjun@acme.com",    role: "Super Admin",        branch: "HQ — Mumbai",      lastLogin: "Today, 9:14 AM",    status: "ACTIVE" },
    { initials: "PN", name: "Priya Nair",     email: "priya@acme.com",    role: "Admin",              branch: "HQ — Mumbai",      lastLogin: "Today, 8:42 AM",    status: "ACTIVE" },
    { initials: "RS", name: "Rahul Sharma",   email: "rahul@acme.com",    role: "Finance Manager",    branch: "HQ — Mumbai",      lastLogin: "Today, 10:02 AM",   status: "ACTIVE" },
    { initials: "AS", name: "Ananya Singh",   email: "ananya@acme.com",   role: "Sales Manager",      branch: "West — Pune",      lastLogin: "Yesterday, 6:30 PM", status: "ACTIVE" },
    { initials: "DR", name: "Deepika Rao",    email: "deepika@acme.com",  role: "HR Manager",         branch: "HQ — Mumbai",      lastLogin: "Today, 9:58 AM",    status: "ACTIVE" },
    { initials: "VJ", name: "Vikram Joshi",   email: "vikram@acme.com",   role: "Operations Manager", branch: "Factory — Pune",   lastLogin: "Today, 7:45 AM",    status: "ACTIVE" },
    { initials: "AK", name: "Aditya Kumar",   email: "aditya@acme.com",   role: "Employee",           branch: "HQ — Mumbai",      lastLogin: "2 days ago",        status: "ACTIVE" },
    { initials: "SG", name: "Smita Gupta",    email: "smita@acme.com",    role: "Employee",           branch: "West — Pune",      lastLogin: "Today, 8:15 AM",    status: "INACTIVE" },
  ];

  const filteredUsers = users.filter((user) => {
    const value = search.toLowerCase();
    return user.name.toLowerCase().includes(value) || user.email.toLowerCase().includes(value) || user.role.toLowerCase().includes(value) || user.branch.toLowerCase().includes(value);
  });

  return (
    <div className="users-content">

      <section className="users-card">

        <div className="users-header">
          <div className="users-title">
            <h2>Users</h2>
            <div className="user-search">
              <span className="search-icon">⌕</span>
              <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <button className="invite-btn" onClick={() => setShowModal(true)}>+ Invite User</button>
        </div>

        <div className="users-table-header">
          <div>USER</div>
          <div>ROLE</div>
          <div>BRANCH</div>
          <div>LAST LOGIN</div>
          <div>STATUS</div>
        </div>

        <div className="users-list">
          {filteredUsers.map((user) => (
            <div className="user-row" key={user.email}>
              <div className="user-info">
                <div className="user-avatar">{user.initials}</div>
                <div>
                  <div className="user-name">{user.name}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
              <div className="user-role">{user.role}</div>
              <div className="user-branch">{user.branch}</div>
              <div className="last-login">{user.lastLogin}</div>
              <div>
                <span className={`user-status ${user.status === "ACTIVE" ? "active" : "inactive"}`}>{user.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <InviteUserModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => {
            console.log("Invite user:", data);
            setShowModal(false);
          }}
        />
      )}

      <style>{`
        .users-content { width: 100%; }
        .users-card { background: #fff; border: 1px solid #e1dfd8; border-radius: 15px; overflow: hidden; }
        .users-header { min-height: 66px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e3e0d8; }
        .users-title { display: flex; align-items: center; gap: 16px; }
        .users-header h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 17px; font-weight: 400; color: #11140f; }
        .user-search { width: 320px; height: 35px; border-radius: 11px; background: #f5f4f0; border: 1px solid #e2dfd8; display: flex; align-items: center; padding: 0 11px; }
        .search-icon { font-size: 17px; color: #aaa69f; margin-right: 7px; }
        .user-search input { width: 100%; border: none; outline: none; background: transparent; font-family: monospace; font-size: 9px; color: #555; }
        .user-search input::placeholder { color: #aaa69f; }
        .invite-btn { height: 32px; padding: 0 15px; border: none; border-radius: 11px; background: #111410; color: #fff; font-family: monospace; font-size: 9px; cursor: pointer; }
        .users-table-header { height: 38px; display: grid; grid-template-columns: 2.1fr 1.9fr 1.55fr 1.6fr 0.9fr; align-items: center; padding: 0 20px; border-bottom: 1px solid #e3e0d8; color: #aaa69e; font-family: monospace; font-size: 7px; letter-spacing: 0.6px; }
        .user-row { min-height: 61px; display: grid; grid-template-columns: 2.1fr 1.9fr 1.55fr 1.6fr 0.9fr; align-items: center; padding: 0 20px; border-bottom: 1px solid #e3e0d8; }
        .user-row:last-child { border-bottom: none; }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: #f0f3ed; border: 1px solid #dce4d7; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 8px; color: #6c7768; }
        .user-name { font-family: monospace; font-size: 11px; color: #11140f; margin-bottom: 2px; }
        .user-email { font-family: monospace; font-size: 8px; color: #aaa69e; }
        .user-role, .user-branch, .last-login { font-family: monospace; font-size: 9px; color: #817e77; }
        .user-status { display: inline-block; padding: 6px 11px; border-radius: 9px; font-family: monospace; font-size: 8px; }
        .user-status.active { background: #e8f0e4; color: #63755c; }
        .user-status.inactive { background: #e9e7e1; color: #969188; }
        
        @media (max-width: 1000px) { .users-card { overflow-x: auto; } .users-table-header, .user-row { min-width: 950px; } }
        @media (max-width: 700px) { .users-title { flex-direction: column; align-items: flex-start; } .users-header { height: auto; padding: 15px; gap: 15px; } .user-search { width: 240px; } }
      `}</style>

    </div>
  );
};

export default Users;
