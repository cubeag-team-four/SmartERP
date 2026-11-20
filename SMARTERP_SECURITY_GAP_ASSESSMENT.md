# SmartERP Security Gap Assessment

**Phase 1: baseline audit. No application code has been changed.**
Date: 2026-11-18 · Branch: `development` @ `b3e43cb`

## 0. Method and scope

- **What was read.** Source code was read directly, not inferred from file names: the backend `ERP_Backend/` (1,038 files) and the frontend `SmartERP-AI-Frontend/`.
  - Security, auth, tenant, admin and config packages: read in full.
  - The 15 business packages: surveyed controller by controller. The critical findings were then re-verified by grep, including the line numbers cited.
- **SRS.** There is no SRS or requirements document in the repository. Business rules were inferred from the code. Rules that need an SRS are marked **[NEEDS SRS]**.
- **Runtime.** Nothing was run against the live database.
- **Tests.** The existing test suite was run as a baseline: `./mvnw test` → **20 tests, 19 pass, 1 error.**
  - The error is in `HRServiceTest.testLeaveRequestAndApprovalFlow`: "Requested days (2) exceed available remaining leave balance (0 days)".
  - It existed before any security change.
  - All 20 tests are service-level unit tests. There are **no security, authorization or tenant-isolation tests.**

Status key:
- **DONE**: implemented and verified.
- **PARTIAL**: some of the control exists.
- **NOT IMPLEMENTED**: the control is missing.
- **CANNOT VERIFY**: needs deployment or runtime evidence.

## 1. Actual architecture (discovered)

**Backend**
- Spring Boot 3.3.2, Java 17, Spring Security 6 (stateless, `@EnableMethodSecurity`).
- JJWT 0.12.5 (HS256), Spring Data JPA, PostgreSQL hosted on Supabase (ap-south-1 pooler).
- Flyway is a dependency, but **`spring.flyway.enabled=false`**.

**Frontend**
- React 19, Vite 8, react-router 7, zustand, axios.

**Multi-tenancy**
- Shared database with shared schema and a `tenant_id` column. The tenant is resolved as follows:
  - from the JWT principal;
  - from the `X-Tenant-ID` / `X-Tenant-Code` header, which `TenantFilter` checks against the principal;
  - by domain lookup.
- There is a second organisational level: `companies` → `company_branches` / `company_departments` (V5). There are also legacy `branches` / `departments` tables (V1).

**RBAC model**
- `users` ⇄ `user_roles` ⇄ `roles(tenant_id, name, system_role)` ⇄ `role_permissions` ⇄ `permissions(module, action{VIEW,CREATE,EDIT,DELETE,APPROVE}, scope{OWN,TEAM,BRANCH,ALL})`.
- Roles become `ROLE_<NAME>` authorities, and permissions become `MODULE_ACTION_SCOPE` authorities (`UserPrincipal.java:36-51`).

**CI/CD**
- Two GitHub workflows, both for auto-merging and cross-repo PRs.
- **No build, test or security scan runs in CI.**

**AI**
- All 8 AI controllers and 10 AI service implementations are empty stubs. There is no AI provider client, no API keys, and no outbound calls.
- The frontend AI pages are static.
- Project "AI insights" are local heuristics.

### 1.1 The eight roles: mapping to existing identifiers

Roles are rows in the database, not seeded by any migration. The identifiers below are the ones the code and the frontend (`src/routes/ProtectedRoute.jsx:6-15`) actually use.

| Business role | Existing identifier in code | Notes |
|---|---|---|
| Super Admin | `SUPER_ADMIN` | Stored as an ordinary **per-tenant** role row. A separate unused `PlatformRole` enum and `PlatformUser` entity also exist. |
| Admin | `TENANT_ADMIN` | Some purchase and manufacturing checks also accept `ADMIN`. |
| Finance | `FINANCE_MANAGER` | Also `FINANCE` in some checks. |
| Sales | `SALES_MANAGER` | Also `SALES`. |
| HR Manager | `HR_MANAGER` | Also `HR`. |
| Operations | `OPERATIONS_MANAGER` | Also `OPERATIONS`. |
| Inventory | `INVENTORY_MANAGER` | |
| Employee | `EMPLOYEE` | |

Extra identifiers referenced in checks: `PROJECT_MANAGER` and `EXECUTIVE_OWNER` (projects module).

**[CANNOT VERIFY]** which role names exist in the live `roles` table. This must be confirmed before any role-related migration. The plan is to **keep the existing identifiers** and map the business names onto them, not to rename them.

## 2. Executive summary: the most severe findings

| # | Finding | Risk |
|---|---|---|
| 1 | **The production database password is committed to git**: `application.properties:9`, in history since the first commit `1a3ea8e`. It has been pushed to two GitHub repos. | **Critical** |
| 2 | **Cross-tenant read and write of HR data.** Employees, payroll, performance and leave controllers have **no authorization** and accept `?tenantId=`, which overrides the caller's tenant (`EmployeeController.java:24`, `PayrollController.java:24`, `PerformanceController.java:25`, `LeaveController.java:30`). Any logged-in user of any company can read or delete another company's employees and salaries, and run its payroll. | **Critical** |
| 3 | **Cross-tenant IDOR in purchase and manufacturing.** Thirteen lookups use `findByIdAndTenantId(...).or(() -> repo.findById(id))`, which falls back to an unscoped lookup (for example `PurchaseOrderService.java:179`, `WorkOrderServiceImpl.java:136`). | **Critical** |
| 4 | **Privilege escalation to SUPER_ADMIN.** `RoleController` and `RoleService.createRole` take `tenantId` from the request and allow any role name. A `TENANT_ADMIN` can create a role named `SUPER_ADMIN` and assign it to themselves through the user endpoints. That grants `ROLE_SUPER_ADMIN`, which unlocks platform tenant management (`TenantController`) and bypasses `PermissionService`. Admins can also list or edit **other tenants' roles** (`RoleController.java:47,62,80`). | **Critical** |
| 5 | **Identity taken from client headers.** `TimesheetController` takes the user and approver from `X-User-Id` (`:26,:35,:44`). Anyone can act or approve as anyone else. | **High** |
| 6 | **No audit trail.** `AuditLogService.record()` and the `sa_audit_logs` table have no callers or writers. | **High** |
| 7 | **No brute-force protection, MFA, password policy (8-character minimum only), password reset or token revocation.** Tenant security settings (`mfa_required`, `max_login_attempts`, …) are stored but never enforced. | **High** |
| 8 | **Confidential document flags not enforced.** `confidential`, `accessLevel`, `sharedWith` and `allowDownload` are never checked on download. Uploads have no type validation. | **High** |
| 9 | **Self-approval and no approval limits.** Leave, timesheets, documents and purchase orders lack these controls. Journal entries post directly. Configured approval workflows are never consulted. | **High** |
| 10 | **Schema is not managed.** Flyway is disabled, V9 is missing, and the `refresh_tokens` table has no migration. The repository cannot reproduce the production schema. | **High** (operational) |

## 3. Control-by-control findings

### 3.1 Secrets and configuration (SEC)

| ID | Requirement | Status | Evidence | Gap / risk | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| SEC-01 | No secrets in source | **NOT IMPLEMENTED** | `ERP_Backend/src/main/resources/application.properties:7-9`: Supabase host, user `postgres.xppolgfuvrvhpqmcbrkp` and plaintext password. Tracked in git since `1a3ea8e`. | Anyone with repo access, including the second org `cubeage-tech`, has direct DB superuser-level access, which bypasses every application control. | **Rotate the DB password now (owner action).** Move it to `${DB_PASSWORD}`. Add `.env` to `.gitignore`. Treat the history as compromised, and purge it only after rotation. | Critical | P0 |
| SEC-02 | Strong JWT signing secret | PARTIAL | `JwtService.java:28` and `application.properties:34` fall back to a hardcoded, publicly known default secret when `JWT_SECRET` is unset. | If any deployment runs without `JWT_SECRET`, anyone can forge a token for any user or tenant. | Fail startup if the secret is missing or default outside the dev profile. | Critical | P0 |
| SEC-03 | Prod-safe logging | NOT IMPLEMENTED | `spring.jpa.show-sql=true`, `logging.level.org.hibernate.SQL=DEBUG`, `com.cubeage.erp=DEBUG` | SQL and data leak into logs. | Use profile-specific config (`application-prod.properties`). | Medium | P1 |
| SEC-04 | Swagger not public in prod | NOT IMPLEMENTED | `SecurityConfig.java:46` makes `/swagger-ui/**` and `/v3/api-docs/**` `permitAll`. | Attackers can enumerate the full API. | Disable it in the prod profile. | Medium | P2 |
| SEC-05 | CORS restricted | PARTIAL | `SecurityConfig.java:57`: localhost origins only, hardcoded. | It is safe, but production origins are not configurable. | Read allowed origins from configuration. | Low | P2 |
| SEC-06 | Security headers / CSP / HSTS | PARTIAL | Spring Security default headers are active. There is no CSP and no HSTS config. | XSS impact is amplified because tokens are in localStorage. | Add CSP and HSTS. Configure the frontend host headers. | Medium | P2 |
| SEC-07 | TLS / HTTPS | CANNOT VERIFY | The DB uses `sslmode=require`. App hosting is unknown. | — | Document the requirement and verify it on the host. | — | P2 |

### 3.2 Authentication and passwords (AUTH)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Password hashing | PARTIAL | `SecurityConfig.java:75`: `BCryptPasswordEncoder` with built-in salts. Hashes are not returned in `UserResponse`. | Uses BCrypt, not Argon2id. | Switch to a `DelegatingPasswordEncoder` with Argon2id as default, keeping BCrypt for verification. Upgrade hashes on login so no existing user is locked out. | Low | P2 |
| AUTH-02 | Password policy (≥10 characters, 3 character classes, no name or email) | NOT IMPLEMENTED | `ChangePasswordRequest` and `CreateUserRequest` only require `@Size(min=8)`. `security_settings.minimum_password_length` is never read. | Weak passwords are accepted. | Add a backend `PasswordPolicyService` used on create, change and reset. | High | P1 |
| AUTH-03 | Breached or common password check | NOT IMPLEMENTED | — | — | Use a local common-password list plus the HIBP k-anonymity range API (5-character SHA-1 prefix only), fail-open with an audit event. | Medium | P2 |
| AUTH-04 | Password history (last 5) | NOT IMPLEMENTED | No table. | — | Add `password_history` with hashes only. | Medium | P2 |
| AUTH-05 | Secure password reset | NOT IMPLEMENTED | Frontend `ForgotPassword.jsx` and `ResetPassword.jsx` are 9-line stubs. There is no backend endpoint. | — | Store hashed, single-use, 15–30 minute tokens. Give the same response whether or not the email exists. Rate-limit requests. Revoke sessions on reset. **Needs an email provider (blocker).** | Medium | P2 |
| AUTH-06 | Lockout after 5 failures | NOT IMPLEMENTED | `AuthService.login:41-69` has no counter. `max_login_attempts` is never read. | Unlimited online guessing. | Add `failed_login_count` and `locked_until` columns on users, with a temporary configurable lockout. | High | P1 |
| AUTH-07 | Per-IP and per-account rate limiting | NOT IMPLEMENTED | — | Credential stuffing. | Add an in-process limiter such as Bucket4j on `/auth/*`. A distributed limiter needs Redis, which is an infrastructure decision. | High | P1 |
| AUTH-08 | Generic login errors / no user enumeration | PARTIAL | Both failure paths say "Invalid …". However, `UnauthorizedException` has **no handler** in `GlobalExceptionHandler`, so it probably surfaces as a 500. Unknown users also skip the BCrypt check, which gives a timing difference. | Enumeration by timing, and the wrong status code. | Map the exception to a 401 and run a dummy hash comparison for unknown users. | Medium | P1 |
| AUTH-09 | Login is ambiguous across tenants | PARTIAL | `loadByEmail` uses `findByEmailIgnoreCase` (`CustomUserDetailsService.java:43`) although email is only unique per tenant (`uk_user_tenant_email`). | If the same email exists in two tenants, login throws an error and cannot pick the tenant. | Add a tenant code to login, or enforce globally unique emails. **[Business decision]** | Medium | P2 |
| AUTH-10 | Inactive user blocked | **DONE (code)** | `CustomUserDetailsService.java:36,44` filters `active`. The JWT filter reloads the user on every request, so deactivation takes effect immediately. | No test covers it. | Add tests. | — | P1 |
| AUTH-11 | Suspended tenant blocked | PARTIAL | `TenantFilter.java:23-30` checks the tenant for non-super-admins. `AuthService.login` does not, so a token is still issued. | — | Also check the tenant at login. Add tests. | Low | P2 |

### 3.3 MFA (MFA)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| MFA-01 | TOTP enrollment, QR code, verification | NOT IMPLEMENTED | `BackupSecurity.jsx` has a hardcoded 2FA toggle with no API behind it. `security_settings.mfa_required` exists but is not enforced. | — | Build RFC 6238 TOTP (for example the `dev.samstevens.totp` library). Encrypt secrets at rest with AES-GCM using a key from the environment. | High | P1 |
| MFA-02 | Mandatory for SUPER_ADMIN and TENANT_ADMIN | NOT IMPLEMENTED | — | Admin accounts are protected by a password only. | Add a two-step login: password → short-lived `mfa_pending` token → TOTP → full tokens. | High | P1 |
| MFA-03 | Recovery codes (8, hashed, single-use) | NOT IMPLEMENTED | — | — | Add a `mfa_recovery_codes` table. | Medium | P1 |
| MFA-04 | MFA reset / disable flow, audited | NOT IMPLEMENTED | — | — | Admin-initiated reset that revokes sessions and writes an audit event. | Medium | P2 |

### 3.4 Tokens and sessions (SESS)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| SESS-01 | Short-lived access token (~15 min) | PARTIAL | `expiration-ms=3600000`, which is 60 minutes. | — | Make it configurable, defaulting to 15 minutes. | Medium | P1 |
| SESS-02 | Refresh token rotation | PARTIAL | `AuthService.refresh:72-98` revokes the old token and issues a new one. | Tokens are stored **in plaintext** (`refresh_tokens.token`). When a token is expired, the `setRevoked` call is rolled back by the exception. | Store a SHA-256 hash of the token. | Medium | P1 |
| SESS-03 | Refresh token reuse detection | NOT IMPLEMENTED | Reuse of a revoked token only returns 401. | A stolen token stays usable until the legitimate user rotates it. | Add a token family ID: if a revoked token is presented, revoke the whole family and audit it. | Medium | P1 |
| SESS-04 | Access token revocation (logout, password change, MFA reset) | NOT IMPLEMENTED | Logout and password change revoke refresh tokens only (`AuthService:101,115`). The JWT has no `jti` and no session or version claim. The frontend never calls `/auth/logout` (`auth.store.js:13-17`). | Access tokens remain valid for up to 60 minutes after logout or password change. | Add a `token_version` claim checked against `users.token_version`, which needs no extra lookup because the filter already loads the user. Make the frontend call logout. | Medium | P1 |
| SESS-05 | Session listing and revocation UI | NOT IMPLEMENTED | — | — | Add `user_sessions` (or enrich `refresh_tokens`) with device, IP and last-seen data, plus endpoints and UI. | Low | P3 |
| SESS-06 | Token storage in the browser | NOT IMPLEMENTED (insecure) | Frontend `storage.service.jsx:1-11` keeps the access token and full user object in `localStorage`. There is no refresh logic, and any 401 clears storage. | XSS leads to token theft. | Phase A: add refresh handling and server logout. Phase B (architectural): move the refresh token to an HttpOnly, Secure, SameSite cookie, which requires CSRF protection on `/auth/refresh`. | Medium | P2 |
| SESS-07 | CSRF | N/A today | Bearer header authentication with CSRF disabled is correct for that model. | Becomes relevant if cookies are introduced. | — | — | — |

### 3.5 RBAC and privilege management (RBAC)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| RBAC-01 | Eight roles preserved | **DONE (as data)** | The roles exist as identifiers (§1.1). | Names are inconsistent across checks: `FINANCE` vs `FINANCE_MANAGER`, `HR` vs `HR_MANAGER`, `ADMIN` vs `TENANT_ADMIN`. | Introduce a single `Roles` constants class covering canonical names and aliases. Do **not** rename the database rows. | Medium | P1 |
| RBAC-02 | No self-escalation; SUPER_ADMIN is not tenant-mintable | **NOT IMPLEMENTED** | `RoleService.createRole:14-51` takes `request.getTenantId()` and accepts any name. `UserService.assignRoles:132-150` and `createUser:33-36` allow any same-tenant role. | Escalation path: Admin → `SUPER_ADMIN` → platform access. | Reserve `SUPER_ADMIN` and `TENANT_ADMIN` names and system roles. Only SUPER_ADMIN may grant reserved roles. Users cannot change their own roles. Take the tenant from the principal. | **Critical** | **P0** |
| RBAC-03 | Role admin is tenant-scoped | NOT IMPLEMENTED | `RoleController.java:47,62,80` takes `@RequestParam tenantId`. The controller returns JPA `Role` entities. | Cross-tenant role read and permission edits. | Use `SecurityUtils.currentTenantId()` (SUPER_ADMIN may override explicitly). Return DTOs. | Critical | P0 |
| RBAC-04 | Backend authorization on every endpoint | PARTIAL | 82 controllers. No annotation at all on: HR `EmployeeController`, `PayrollController`, `PerformanceController`; parts of `LeaveController`; `SettingsDashboardController`; `ModuleSettingsController` GET. About 31 endpoints are `isAuthenticated()` only, including finance GL, P&L and cash flow (`GeneralLedgerController:21`, `ProfitLossController:21`, `CashFlowController:18`), account create and update (`AccountController:38,48`), and project task edit. | Employees can read company financials and HR data. | Define a permission matrix and apply `@PreAuthorize` everywhere. Add a **test that fails if any controller method lacks an authorization rule**. | Critical | P0/P1 |
| RBAC-05 | Granular permissions | PARTIAL | A permission model exists (`module`/`action`/`scope`) and `@permissionEvaluator.has` is used in company, sales, purchase, manufacturing, finance dashboard and HR attendance. Most modules still rely on role-name lists. Purchase and manufacturing use **one identical role list for VIEW and DELETE**, so HR and Sales staff can delete purchase orders. `PermissionService` treats `ROLE_TENANT_ADMIN` as all-permissions. The permission catalogue is not seeded by any migration. | The model exists but is not authoritative. | Seed the catalogue and default role grants (non-destructively). Move checks to `@permissionEvaluator`. Extend actions to `EXPORT`, `PRINT`, `CONFIGURE`, `MANAGE_USERS`, `MANAGE_PERMISSIONS`, `REJECT` while keeping the existing `VIEW`/`EDIT` names. | High | P1 |
| RBAC-06 | Frontend permission-aware UI | PARTIAL | `ProtectedRoute` checks role names only. `usePermissions.js` is empty and `permissionCheck.js` is unused. `RolesPermissions.jsx` is a static matrix. | UX only, not a security boundary. | Return effective permissions from `/auth/me`, wire up `usePermissions`, and connect RolesPermissions to the API. | Low | P3 |
| RBAC-07 | Mock credentials removed | NOT IMPLEMENTED | `src/data/users.mock.js:5-60` (`password123`) and `auth.service.jsx:12-25` `mockLogin` are bundled, though unused. | They could be mistaken for real accounts. | Delete them. | Low | P2 |

### 3.6 Tenant and organisational isolation (TEN)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| TEN-01 | Never trust client-supplied tenant | **NOT IMPLEMENTED (HR)**, otherwise PARTIAL | HR `?tenantId=` override (finding 2). `FinanceTenantResolver.java:31-45` and `LeaveController.java:40` fall back to hardcoded tenants `1L` and `3L`. Inventory, projects and reports read the `X-Tenant-Id` header, which is safe only because `TenantFilter` validates it. | Cross-tenant HR access. Hardcoded fallbacks could write into a real tenant. | Use a single `CurrentTenant` resolver based on the principal. Remove the `tenantId` parameters and the `1L`/`3L` fallbacks. | Critical | P0 |
| TEN-02 | IDOR-safe lookups | **NOT IMPLEMENTED (purchase, manufacturing)** | The 13 `.or(() -> repo.findById(...))` sites (finding 3). `ReportExportServiceImpl:51` and `ReportScheduleServiceImpl:65` read templates unscoped. | Cross-tenant read, update and delete. | Remove the fallbacks. Add cross-tenant tests per module. | Critical | P0 |
| TEN-03 | Identity from principal only | NOT IMPLEMENTED (timesheets) | `TimesheetController:26,35,44` uses `X-User-Id`. | Impersonation and self-approval. | Use `SecurityUtils.currentUserId()`. | High | P0 |
| TEN-04 | Branch, department and team scope | NOT IMPLEMENTED | The `OWN`/`TEAM`/`BRANCH`/`ALL` scope enum exists, but no query applies it. Users have `branch_id` and `department_id`. | Every user sees every record in the tenant. | Add a `DataScope` resolver plus repository specifications, applied first to HR, then finance, then sales. **[NEEDS SRS]** for which modules are branch-restricted. | Medium | P2 |
| TEN-05 | Employee owns own records | PARTIAL | Leave update and cancel check ownership (`LeaveService:351,399`). `resolveScopedEmployeeId` (`LeaveController:44-60`) falls back to the client's `employeeId`. `GET /leaves/{id}` has no ownership check. The employee list returns `salary` to anyone. | Employees can see colleagues' salaries and leave. | Enforce `OWN` scope for EMPLOYEE and mask salary unless the caller has `HR_PAYROLL_VIEW`. | High | P1 |
| TEN-06 | Database row-level security | NOT IMPLEMENTED | — | No defence in depth. | Defer. Postgres RLS through the Supabase pooler with `prepareThreshold=0` needs per-transaction `SET` and careful validation. Document it as a future option. | Medium | P3 |
| TEN-07 | Background jobs scoped | CANNOT VERIFY | Report schedules exist, but no scheduler executing them was found. | — | Re-check when a scheduler is added. | — | P3 |

### 3.7 Approval workflows (APR)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| APR-01 | No self-approval | NOT IMPLEMENTED | Leave (`LeaveService.updateStatus:411-424`), timesheets, document approvals (`DocumentApprovalServiceImpl:83-95`, where the actor is not even passed in). | — | Pass the actor into the service, reject actor == requester, and record the approver. | High | P1 |
| APR-02 | Approval limits and workflows enforced | NOT IMPLEMENTED | `approval_workflow_settings` and `company_approval_workflows` are configured but never consulted. Purchase order status is set from the client (`PurchaseOrderService:89-94`). Journals post immediately (`JournalEntryServiceImpl:69`). | — | Add a central `ApprovalPolicyService` that reads the existing workflow tables. **[NEEDS SRS]** for amount thresholds. | High | P2 |
| APR-03 | Billing upgrade without payment | NOT IMPLEMENTED | `BillingSettingsService.upgrade:16` activates the client-supplied plan and amount. | Free plan upgrades. | Restrict to SUPER_ADMIN until a payment provider is integrated. | Medium | P1 |

### 3.8 Audit logging (AUD)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| AUD-01 | Central audit writer | PARTIAL (table only) | `audit_logs` (V1:185) and `AuditLogService.record()` exist with **zero callers**. `SuperAdminAuditLog` / `sa_audit_logs` has no writer. | Nothing is audited. | Extend `audit_logs` with result, role, request ID, user agent and changed-field names. Add an `AuditService` with an async-safe `REQUIRES_NEW` write. | High | P1 |
| AUD-02 | Authentication events | NOT IMPLEMENTED | — | — | Log login success and failure, lockout, logout, refresh reuse, password change, and MFA events. | High | P1 |
| AUD-03 | User, role and permission events | NOT IMPLEMENTED | — | — | Log create, update, deactivate, role assignment, permission changes and escalation attempts. | High | P1 |
| AUD-04 | ERP business events | NOT IMPLEMENTED | — | — | Log payroll, journals, purchase orders, invoices, payments, stock adjustments, leave decisions and exports. | Medium | P2 |
| AUD-05 | Tamper resistance | NOT IMPLEMENTED | No update or delete API exists (good), but nothing prevents it at database level. | — | Add a DB trigger that rejects `UPDATE`/`DELETE` on `audit_logs`, plus an optional hash chain. | Medium | P2 |
| AUD-06 | Audit viewer is restricted | PARTIAL | `SecuritySettingsController:15` is limited to SUPER_ADMIN and TENANT_ADMIN, tenant-scoped and paged. The frontend audit table is hardcoded fake data. | — | Wire the UI to the API and add filters. | Low | P3 |

### 3.9 Files, exports and data protection (DATA)

| ID | Requirement | Status | Evidence | Gap | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|---|
| DATA-01 | Upload validation | PARTIAL | `DocumentStorageServiceImpl:30-60` handles paths safely: filename sanitised, UUID prefix, tenant directory, `startsWith` check. There is no extension, magic-byte or size validation, and the client `contentType` is trusted. | Malicious file storage. | Add an allow-list, Apache Tika sniffing and explicit `spring.servlet.multipart` limits. | Medium | P1 |
| DATA-02 | Download authorization | PARTIAL | Tenant-scoped only. `confidential`, `accessLevel`, `sharedWith` and `allowDownload` are never enforced (`DocumentServiceImpl:320-323`). | Employees can download HR and finance documents. | Enforce these fields on view and download, and audit downloads. | High | P1 |
| DATA-03 | Export permission and scope | PARTIAL | Reports are admin-only and tenant-scoped. Sales exports need only `SALES_VIEW`. `LeaveController` `/export` has no authorization and inherits the tenant override. CSV output has **no formula-injection escaping** (`CsvReportGenerator.escapeCsv`). Custom reports can select any entity attribute (`CustomReportServiceImpl:475-490`). | — | Add an `EXPORT` permission, a field allow-list, CSV `=+-@` escaping and export auditing. | Medium | P1 |
| DATA-04 | Expiring download links | NOT IMPLEMENTED | Downloads stream directly. | — | Acceptable while downloads require authentication. Add signed expiring links only if links are emailed. | Low | P3 |
| DATA-05 | DSAR export, erasure and anonymisation workflow | NOT IMPLEMENTED | — | — | Add a `data_requests` table and approval flow. Anonymise personal fields while keeping ledger rows. **[NEEDS SRS + legal]** for retention periods (for example Indian GST/Companies Act ~8 years). | Medium | P3 |
| DATA-06 | Hard deletes of business records | PARTIAL | `UserService.deleteUser:74-80` hard-deletes users. The `user_roles` cascade breaks audit attribution. | — | Change to deactivate or soft-delete. | Medium | P2 |

### 3.10 AI privacy (AI)

| ID | Requirement | Status | Evidence | Recommendation |
|---|---|---|---|---|
| AI-01 to AI-06 | Minimisation, exclusion, tenant scope, output validation | **Not applicable yet** | All of `ai/**` is empty stubs (60 lines total). No provider or keys exist. `AIUnauthorizedDataException` exists but is unused. | Do **not** invent AI features. Write the AI security architecture as a design contract, and add a guard (`AiDataAccessGuard`) and an `ai_excluded` flag only when a real AI feature is built. **Blocker:** product decision on the AI provider. |

### 3.11 Supply chain, CI and testing (OPS)

| ID | Requirement | Status | Evidence | Recommendation | Risk | Priority |
|---|---|---|---|---|---|---|
| OPS-01 | CI build and test | NOT IMPLEMENTED | The workflows only auto-merge. `auto-merge-dev.yml` pushes `dev-*` into `development` with **no tests**. | Add a `mvn verify` and `npm run build` workflow, and gate auto-merge on it. | High | P1 |
| OPS-02 | Dependency scanning | NOT IMPLEMENTED | — | Add Dependabot plus OWASP dependency-check / `npm audit` in CI. | Medium | P2 |
| OPS-03 | Schema migrations reproducible | NOT IMPLEMENTED | Flyway is disabled, V9 is missing, and `refresh_tokens` has no migration. | Baseline Flyway against production (`baselineOnMigrate`) after diffing the live schema. **The owner must confirm how the DB is changed today.** | High | P1 |
| OPS-04 | Security test suite | NOT IMPLEMENTED | 20 unit tests, none for security. | Add MockMvc and `@WithMockUser` authorization and tenant tests. Integration tests need a test DB (Testcontainers needs Docker, otherwise H2 in PostgreSQL mode). | High | P1 |
| OPS-05 | Backups, encryption at rest, monitoring | CANNOT VERIFY | Supabase-managed. The `backup_settings` UI is configuration only. | Confirm the Supabase plan's PITR and backups in the dashboard. Add error monitoring. | — | P2 |

## 4. Existing controls that can be reused

- `users` / `roles` / `permissions` / `user_roles` / `role_permissions`: extend them, do not replace them.
- `@permissionEvaluator.has(...)` and `PermissionService`: make these the single authorization entry point.
- `TenantFilter`: header-versus-principal tenant check and tenant status check.
- `SecurityUtils.currentTenantId()` / `currentUserId()`: the correct source of identity.
- `JwtAuthenticationFilter`: already reloads the user per request, so `token_version` revocation is cheap to add.
- Refresh token table and rotation: harden it (hash the token, add a family ID).
- The `audit_logs` table, `AuditLogService` and the audit viewer endpoint.
- `security_settings` per tenant: become the policy source for lockout, MFA requirement and minimum length.
- `approval_workflow_settings` / `company_approval_workflows`: become the approval policy source.
- Document storage path-traversal protections.
- `CompanyManagementService.requireCompany(tenantId, id)`: the model for scoped lookups.

## 5. Blockers and decisions required from the owner

1. **Rotate the Supabase DB password** and decide whether to purge git history. Only the owner can do this, and it should happen today.
2. **Database migrations.** Flyway is disabled. How is the shared Supabase schema changed today: manually in the Supabase SQL editor? New tables (MFA, password history, audit columns) need an agreed path. Running migrations against the shared database affects every developer.
3. **Live role names.** Confirm the actual `roles.name` values in production so the mapping in §1.1 is correct.
4. **Login tenant disambiguation** (AUTH-09): either globally unique emails or a tenant code at login.
5. **Email provider** for password reset (AUTH-05). Reset cannot be completed without one.
6. **Approval thresholds and branch-restricted modules** (APR-02, TEN-04): needs the SRS.
7. **Retention periods** for anonymisation and erasure (DATA-05): needs legal or SRS input.
8. **AI provider**: AI controls stay design-only until a real AI feature exists.

## 6. Proposed implementation order

| Phase | Content | Schema change? |
|---|---|---|
| **P0 – Stop the bleeding** | Externalise secrets and fail on the default JWT secret (SEC-01/02). Fix the HR tenant override and remove hardcoded tenant fallbacks (TEN-01). Remove the 13 IDOR fallbacks (TEN-02). Take timesheet identity from the principal (TEN-03). Close the role escalation and cross-tenant role admin holes (RBAC-02/03). Add `@PreAuthorize` to unprotected HR and finance endpoints (RBAC-04). Add regression tests for each fix. | **None** |
| P1a – Auth hardening | Password policy, lockout plus rate limit, generic 401 handler, 15-minute access tokens, `token_version` revocation, hashed refresh tokens with reuse detection, frontend logout, refresh flow. | Small additive columns |
| P1b – Audit | Extend `audit_logs`, add an `AuditService`, log authentication, admin and critical business events, add an immutability trigger. | Additive |
| P1c – MFA | TOTP plus recovery codes, mandatory for SUPER_ADMIN and TENANT_ADMIN. Login step-up. Frontend screens. | New tables |
| P1d – RBAC matrix | Roles constants, seed the permission catalogue, convert controllers to `@permissionEvaluator`, add an "every endpoint has authorization" test, enforce self-approval rules and document access fields. | Seed data (additive) |
| P2 | Data scope (branch, department, own), salary masking, upload validation, CSV escaping, password history and HIBP, Argon2id, CI pipeline plus scanning, prod profile. | Additive |
| P3 | Session management UI, DSAR workflow, row-level security evaluation, AI guardrails once AI exists. | Additive |

P0 needs **no database changes**, so it can be shipped and tested immediately. Everything after P0 depends on decision 2 (the migration path).

---

## 7. Status after implementation (2026-11-19)

The scope agreed with the owner was login, signup and security only. Sections 1–6 above are the **baseline** and are kept unchanged for traceability. This table gives the current status of each control. Evidence is in `SMARTERP_SECURITY_IMPLEMENTATION_REPORT.md` and `SMARTERP_SECURITY_TEST_REPORT.md`.

| ID | Baseline | Now | Evidence / remaining action |
|---|---|---|---|
| SEC-01 Secrets in source | NOT IMPLEMENTED | **PARTIAL** | Secrets moved to env / `.env`. **The DB password must be rotated**; it is still in git history. |
| SEC-02 JWT secret | PARTIAL | **DONE** | Startup fails without a strong secret (`TenantFailClosedTest`) |
| SEC-03 Prod-safe logging | NOT IMPLEMENTED | **DONE** | SQL logging off, log level from the environment |
| SEC-04 Swagger | NOT IMPLEMENTED | **DONE** | Off unless `SWAGGER_ENABLED` |
| SEC-05 CORS | PARTIAL | **DONE** | Configurable origins |
| SEC-06 Headers/CSP/HSTS | PARTIAL | **PARTIAL** | API headers done; the frontend host's CSP cannot be verified |
| SEC-07 TLS | CANNOT VERIFY | CANNOT VERIFY | Infrastructure |
| AUTH-01 Hashing | PARTIAL | PARTIAL | BCrypt (SRS allows it); Argon2id pending |
| AUTH-02 Password policy | NOT IMPLEMENTED | **DONE** | `PasswordPolicyServiceTest`, integration test |
| AUTH-03 Breach check | NOT IMPLEMENTED | **DONE** | HIBP k-anonymity, fail-open |
| AUTH-04 History | NOT IMPLEMENTED | **DONE** | Last 5 |
| AUTH-05 Reset | NOT IMPLEMENTED | **PARTIAL** | Backend and UI done; **email delivery needs a provider** |
| AUTH-06 Lockout | NOT IMPLEMENTED | **DONE** | 5 / 15 min, temporary |
| AUTH-07 Rate limiting | NOT IMPLEMENTED | **PARTIAL** | Per IP, in-memory; Redis needed when running several instances |
| AUTH-08 Generic errors / timing | PARTIAL | **DONE** | |
| AUTH-09 Cross-tenant login ambiguity | PARTIAL | **DONE** | Company picker shown after the password is verified |
| AUTH-10 Inactive users | DONE (code) | **DONE** | Now tested |
| AUTH-11 Suspended tenant | PARTIAL | **DONE** | Login and refresh both check |
| MFA-01..03 | NOT IMPLEMENTED | **DONE** | TOTP, mandatory for SA/ADM, recovery codes |
| MFA-04 Reset/disable | NOT IMPLEMENTED | **DONE** | Admin reset endpoint; self-disable blocked where MFA is mandatory |
| SESS-01..04 | PARTIAL / NOT IMPL. | **DONE** | 15-min access tokens, hashed rotating refresh tokens, reuse detection, `token_version` revocation |
| SESS-05 Session UI | NOT IMPLEMENTED | NOT IMPLEMENTED | Data captured, no UI |
| SESS-06 Browser storage | NOT IMPLEMENTED | **DONE** | HttpOnly refresh cookie; access token in memory (frontend) |
| RBAC-01 Eight roles | DONE (data) | **DONE** | Identifiers unchanged, mapped in `Roles.java` |
| RBAC-02/03 Escalation, tenant-scoped role admin | NOT IMPLEMENTED | **DONE** | `RoleAssignmentGuardTest`, integration test |
| RBAC-04 Authorization on every endpoint | PARTIAL | **DONE** (presence) | Enforced by test; granularity issues remain under RBAC-05 |
| RBAC-05 Granular permissions | PARTIAL | PARTIAL | Permission catalogue not seeded; Purchase/Manufacturing over-grant |
| RBAC-06 Frontend permission-aware UI | PARTIAL | PARTIAL | `/auth/me` returns permissions; UI wiring pending |
| RBAC-07 Mock credentials | NOT IMPLEMENTED | **DONE** | Removed (frontend) |
| TEN-01/02/03 | NOT IMPLEMENTED | **DONE** | Tenant from JWT, IDOR fallbacks removed, no header identity |
| TEN-04 Branch/department scope | NOT IMPLEMENTED | NOT IMPLEMENTED | Needs SRS confirmation |
| TEN-05 Own records | PARTIAL | PARTIAL | Leave and timesheets done; salary masking pending |
| TEN-06 RLS | NOT IMPLEMENTED | NOT IMPLEMENTED | |
| APR-01..03 | NOT IMPLEMENTED | PARTIAL | Timesheet self-approval blocked; the rest pending |
| AUD-01..03, 05 | NOT IMPLEMENTED | **DONE** | Security events, append-only trigger |
| AUD-04 Business events | NOT IMPLEMENTED | NOT IMPLEMENTED | Next phase |
| DATA-01..06 | various | unchanged | Out of this phase's scope |
| AI-01..06 | n/a | n/a | No AI functionality exists |
| OPS-01/02 CI and scanning | NOT IMPLEMENTED | NOT IMPLEMENTED | Recommended next step |
| OPS-03 Migrations | NOT IMPLEMENTED | PARTIAL | V13 written and idempotent; Flyway still disabled; V13 not yet run on PostgreSQL |
| OPS-04 Security tests | NOT IMPLEMENTED | **DONE** for the auth scope | 80 new tests |
