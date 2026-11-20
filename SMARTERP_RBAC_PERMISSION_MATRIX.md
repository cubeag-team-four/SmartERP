# SmartERP RBAC Permission Matrix

This matrix shows **what the backend enforces today**: the `@PreAuthorize` rules on every controller, extracted from the code on 2026-11-19 after the security changes. It is not a target design. Rows marked ⚠ differ from the SRS §6 default matrix and are open items.

## Roles

Existing identifiers are preserved; `security/Roles.java` holds the mapping.

| Column | Business role | Identifier | Scope of data |
|---|---|---|---|
| SA | Super Admin | `SUPER_ADMIN` | Platform; may target any tenant where an endpoint allows it |
| ADM | Admin | `TENANT_ADMIN` | Own company only |
| FIN | Finance | `FINANCE_MANAGER` (also accepts legacy `FINANCE`) | Own company |
| SAL | Sales | `SALES_MANAGER` (legacy `SALES`) | Own company |
| HR | HR Manager | `HR_MANAGER` (legacy `HR`) | Own company |
| OPS | Operations | `OPERATIONS_MANAGER` (legacy `OPERATIONS`) | Own company |
| INV | Inventory | `INVENTORY_MANAGER` | Own company |
| EMP | Employee | `EMPLOYEE` | Own records where the module supports it |

## Legend

- ✓ = allowed by role.
- **P** = allowed only if the role holds the matching permission row (`MODULE_ACTION_SCOPE`, granted under Admin → Roles).
- — = denied (403).
- **self** = only the user's own records.

`PermissionService` treats `SUPER_ADMIN` and `TENANT_ADMIN` as holding every permission.

> **New companies created by signup** get the seven system roles **with no permission rows**. Admins have full access through the bypass. Users with other roles get only the role-based ✓ cells below until an Admin grants permissions. The **P** cells (Sales, Company Management, extra Finance/HR/Purchase/Manufacturing access) start empty. Seeding a default permission catalogue that matches SRS §6.2 is open item RBAC-05.

## Every request, every role

All authenticated requests are subject to:
- tenant taken from the JWT;
- `X-Tenant-Id` must equal the user's tenant;
- suspended or inactive companies are blocked (SA excepted);
- tenant-scoped repository lookups.

Cross-tenant ids return 404 or 403 and never data.

## Matrix

| Module / endpoint group | SA | ADM | FIN | SAL | HR | OPS | INV | EMP | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Auth & account**: login, MFA, me, change password, own MFA settings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | MFA mandatory for SA and ADM |
| **Platform tenants**: `/tenants`, `/tenants/dashboard` | ✓ | — | — | — | — | — | — | — | |
| Tenant domains, modules, subscriptions, users: `/tenants/{id}/…` | ✓ | own | — | — | — | — | — | — | ADM limited to own id (`requireAccessible`) |
| **Users**: `/admin/users` (CRUD, status, MFA reset) | ⚠ — | ✓ | — | — | — | — | — | — | ⚠ `hasRole('TENANT_ADMIN')` excludes SA. Cannot act on self or on SA accounts; only SA can grant `SUPER_ADMIN`. |
| **Roles & permissions**: `/admin/roles` | ✓ any tenant | ✓ own | — | — | — | — | — | — | Reserved names blocked for ADM; role changes revoke the affected users' sessions |
| Branches, departments, admin dashboard: `/admin/…` | ⚠ — | ✓ | — | — | — | — | — | — | ⚠ excludes SA |
| **Company management**: `/company/**` | ✓ | ✓ | P | P | P | P | P | P | `COMPANY_MANAGEMENT_{VIEW,CREATE,EDIT,DELETE}` |
| **Sales**: `/sales/**` incl. export and print | ✓ | ✓ | P | P | P | P | P | P | `SALES_{VIEW,CREATE,EDIT}`. ⚠ export needs only VIEW. |
| **Finance read**: dashboard, ledger, P&L, cash flow, accounts list, journals list, alerts list | ✓ | ✓ | ✓ | P | P | P | P | P | `FINANCE_VIEW` |
| Finance accounts create / update | ✓ | ✓ | ✓ | P | P | P | P | P | `FINANCE_CREATE` / `FINANCE_EDIT` |
| Journal create/get, balance sheet, Tally export, alert dismiss | ✓ | ✓ | ✓ | — | — | — | — | — | ⚠ journals post without approval (APR-02) |
| **HR employees, payroll, performance** | ✓ | ✓ | — | — | ✓ | — | — | — | Fixed in this release (previously open to all users and to other tenants) |
| HR attendance, HR dashboard | ✓ | ✓ | P | P | ✓ | P | P | P | `HR_VIEW` |
| Leave: own balance, list, create, view, export | ✓ | ✓ | self | self | ✓ | self | self | self | Non-HR users are pinned to their own employee record |
| Leave: edit / cancel own request | — | — | — | — | — | — | — | ✓ self | |
| Leave: approve / reject / set status | ✓ | ✓ | — | — | ✓ | — | — | — | ⚠ self-approval not yet blocked (APR-01) |
| **Inventory read**: items, stock, movements, warehouses, dashboard, replenishment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠ any authenticated user can read |
| Inventory write: items, stock adjust/transfer, stock-takes, warehouses | ✓ | ✓ | — | — | — | — | ✓ | — | |
| **Purchase**: vendors, POs, GRNs, payables (all actions) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P | P | ⚠ one role list for VIEW and DELETE, so Sales and HR can delete POs. INV excluded unless granted. |
| **Manufacturing**: BOM, work orders, machines, maintenance, quality, schedules | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | P | P | ⚠ same over-grant as Purchase |
| **Projects read**: projects, tasks, budget, risks, milestones, AI insights | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠ no project-membership check |
| Projects write / dashboard | — ⚠ | ✓ | — | — | — | — | — | — | Also `PROJECT_MANAGER` (non-standard role). ⚠ `PUT /tasks/{id}` open to all authenticated users. |
| Timesheets: create / submit / my | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Identity from the JWT (fixed) |
| Timesheets: approve / reject / by project | — | ✓ | — | — | — | — | — | — | Also `PROJECT_MANAGER`. Own timesheet cannot be approved (fixed). |
| **Documents**: list, view, upload, download, versions, OCR read, approval create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⚠ `confidential` / `accessLevel` not enforced (DATA-02) |
| Documents: update, delete, restore, approve/reject, OCR process | ✓ | ✓ | ✓ | ✓* | ✓ | ✓ | ✓ | — | *varies per endpoint |
| **Reports**: standard, custom, export, schedules | ✓ | ✓ | — | — | — | — | — | — | |
| **Settings**: general, security, approval workflows, backups, billing, integrations, module edit, settings dashboard | ✓ | ✓ | — | — | — | — | — | — | |
| Settings: module list, own notification preferences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| **Audit log**: `/settings/security/audit-logs` | ✓ | ✓ own | — | — | — | — | — | — | Read-only; table is append-only (DB trigger) |

## Special conditions enforced in code

- **Self-administration is blocked.** Nobody can change their own role or active status, delete their own account, or reset their own MFA (`RoleAssignmentGuard`).
- **The platform role is protected.** Only SA can create, grant or re-permission `SUPER_ADMIN`, or modify an account that holds it.
- **Permission changes take effect immediately.** A role change or deactivation bumps the user's token version and revokes their refresh tokens.
- **Timesheets.** Approvers cannot review their own timesheets.
- **MFA.** It is mandatory for SA and ADM, and for every role when the company enables `security_settings.mfa_required`.

## Approval restrictions

Approval workflow configuration exists (`approval_workflow_settings`, `company_approval_workflows`), but transactions do not consult it yet:
- no amount limits;
- no multi-level routing;
- no separation-of-duties rules beyond timesheets.

This is gap APR-01/APR-02 and needs the approval thresholds from the business owners. SRS §4.1 gives the example "PO > ₹50,000 needs Manager + Finance".

## Differences from the SRS §6.2 default matrix

- The SRS uses generic Manager, Team Lead, Employee and Client columns. SmartERP uses the eight department roles above, so the SRS "Manager" corresponds to the department role within its own module.
- Team Lead, Client and branch-level data scope (`OWN`/`TEAM`/`BRANCH`/`ALL`) are not implemented (TEN-04).
- ⚠ rows above are the concrete deviations to fix in the next RBAC pass:
  - granularity in Purchase and Manufacturing;
  - SA excluded from `/admin/users`, branches and projects;
  - Inventory and Projects readable by every role;
  - Sales export.
