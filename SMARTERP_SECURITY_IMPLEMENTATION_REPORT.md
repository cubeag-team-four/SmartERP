# SmartERP Security Implementation Report

**Date:** 2026-11-19 · **Branch:** `development` (uncommitted working tree)

**Scope agreed with the owner:** login, signup and security only, using the SmartERP SRS (v1.0) as the requirement source. Business-module features were not changed beyond the security fixes listed here.

## 1. What was implemented

### Batch A — critical access-control fixes (no schema change)

| Gap ID | Fix | Key files |
|---|---|---|
| SEC-01 | DB credentials moved to `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`. Local values live in the git-ignored `ERP_Backend/.env`, with `.env.example` as the template. SQL debug logging turned off. **The password must still be rotated (owner action).** | `application.properties`, `.env.example` |
| SEC-02 | No fallback JWT secret. Startup fails if `JWT_SECRET` is missing, shorter than 32 bytes, or the old public default. | `security/jwt/JwtService.java` |
| TEN-01 | HR employees, payroll, performance and leave no longer accept a `?tenantId=` override; the tenant comes from the JWT. Hard-coded fallback tenants (`1L`, `3L`) removed. | `hr/controller/*`, `finance/util/FinanceTenantResolver.java`, `common/util/TenantGuard.java` |
| TEN-01 | Branch and department admin ignore the client-sent `tenantId`. Departments-by-branch now checks that the branch belongs to the caller's tenant. | `admin/controller/{Branch,Department}Controller`, `admin/service/{Branch,Department}Service` |
| TEN-02 | The 13 unscoped `findByIdAndTenantId(...).or(() -> repo.findById(id))` fallbacks were removed, closing the cross-tenant IDOR. 39 `tenantId != null ? tenantId : 1L` defaults now fail closed. | `purchase/service/*`, `manufacturing/service/impl/*` |
| TEN-03 | Timesheets take the user from the JWT instead of `X-User-Id` / `X-User-Name`. Approvers cannot approve or reject their own timesheet. | `projects/controller/TimesheetController`, `projects/service/impl/TimesheetServiceImpl` |
| TEN-05 | Leave: non-HR users are pinned to their own employee record, with no fallback to the requested id. Reading someone else's leave returns 404. | `hr/controller/LeaveController` |
| RBAC-02/03 | Escalation guard:<br>• a Tenant Admin cannot create a role named `SUPER_ADMIN`, grant it, edit its permissions, or modify a Super Admin account;<br>• nobody can change their own role or status, or delete themselves;<br>• role admin is pinned to the caller's tenant (Super Admin may override). | `admin/service/RoleAssignmentGuard.java`, `RoleService`, `RoleController`, `UserService`, `security/Roles.java` |
| RBAC-04 | Authorization added where it was missing or too broad:<br>• HR employees, payroll and performance → SA/ADM/HR;<br>• finance ledger, P&L, cash flow, accounts, journal list and alerts → finance roles;<br>• settings dashboard → admins;<br>• every remaining endpoint now has an explicit rule.<br>A structural test enforces this for all 82 controllers. | finance/hr/settings controllers, `EndpointAuthorizationCoverageTest` |
| AUTH-08 | `UnauthorizedException` → 401 and `BadRequestException` → 400; previously these surfaced as 500. | `common/exception/GlobalExceptionHandler` |

### Batch B — login, signup and session security (SRS 8.7, 11.1, 12.1, 12.4, 12.9, 12.10)

| Gap ID | Capability | Key files |
|---|---|---|
| (signup was missing) | **Self-service signup** `POST /auth/signup` creates a TRIAL company, its 7 system roles and the registrant as Admin. Password policy applies, and the email must be globally unique. | `auth/service/SignupService.java` |
| AUTH-02 | **Password policy**, backend-enforced everywhere:<br>• 10–128 characters;<br>• 3 of 4 character classes;<br>• common and decorated passwords rejected;<br>• no name or email;<br>• tenant setting can only raise the minimum. | `auth/security/PasswordPolicyService.java`, `resources/security/common-passwords.txt` |
| AUTH-03 | HIBP k-anonymity breached-password check (only a 5-char prefix is sent; fail-open). | `auth/security/BreachedPasswordChecker.java` |
| AUTH-04 | Password history: the last 5 cannot be reused (hashes only). | `auth/entity/PasswordHistory` |
| AUTH-05 | **Forgot / reset password:**<br>• identical response for any email;<br>• 256-bit token stored as SHA-256, 30 min, single-use;<br>• sessions revoked on reset.<br>**Email delivery is pending a provider.** | `AuthService`, `PasswordResetNotifier`, `LoggingPasswordResetNotifier` |
| AUTH-06/07 | **Lockout** (5 failures / 15 min → 15 min lock, per-company configurable; unknown emails treated the same) plus **per-IP rate limits** on auth endpoints (429). | `AuthService`, `auth/security/RateLimiter`, `AuthRateLimitFilter` |
| AUTH-08/09 | Generic errors, a dummy BCrypt compare for unknown emails (timing), and company selection when the same email exists in several companies (offered only after the password is verified). | `AuthService` |
| AUTH-11 | Suspended or inactive companies are refused at login and at token refresh. | `AuthService`, `SessionService` |
| MFA-01..04 | **TOTP MFA:**<br>• QR and manual key;<br>• confirm before enabling;<br>• replay protection;<br>• secrets AES-256-GCM encrypted at rest;<br>• 8 single-use hashed recovery codes, regenerable;<br>• **mandatory for SUPER_ADMIN and TENANT_ADMIN** (no session until complete), optional or company-mandated for others;<br>• self-disable blocked where mandatory;<br>• audited admin reset `POST /admin/users/{id}/mfa/reset`. | `auth/service/MfaService`, `auth/security/{TotpService,SecretCipher}` |
| SESS-01 | 15-minute access tokens (configurable). | `application.properties` |
| SESS-02/03 | Refresh tokens stored as SHA-256, rotated on every use, grouped in families; reuse of a rotated token revokes the family and is audited. | `auth/service/SessionService`, `auth/entity/RefreshToken` |
| SESS-04 | **Immediate revocation** through `users.token_version`, embedded in every access token and checked on every request. Bumped by logout, password change or reset, deactivation, deletion, role change and MFA reset. | `JwtService`, `JwtAuthenticationFilter`, `UserService` |
| SESS-06 | Refresh token only in an `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie, never in a response body. Refresh and logout also require `X-Requested-With`. | `auth/controller/AuthController` |
| AUD-01..03, 05 | Security audit trail:<br>• auth, MFA, password, user and role events written to `audit_logs` in their own transaction;<br>• no secrets ever written;<br>• table made append-only by a DB trigger. | `auth/service/SecurityAuditService`, V13 |
| SEC-04/06 | Swagger off unless `SWAGGER_ENABLED=true`. API security headers (CSP, frame deny, no-referrer, HSTS). CORS origins configurable. The JWT filter no longer runs twice per request. | `config/SecurityConfig` |

## 2. API changes

### New endpoints

| Method and path | Auth |
|---|---|
| `POST /api/v1/auth/signup` | public |
| `POST /api/v1/auth/mfa/verify` | public; needs `mfaToken` |
| `POST /api/v1/auth/mfa/setup` | public with `mfaToken`, or Bearer |
| `POST /api/v1/auth/mfa/enable` | public with `mfaToken`, or Bearer |
| `GET /api/v1/auth/mfa/status` | Bearer |
| `POST /api/v1/auth/mfa/recovery-codes` | Bearer |
| `POST /api/v1/auth/mfa/disable` | Bearer |
| `POST /api/v1/auth/forgot-password` | public |
| `POST /api/v1/auth/reset-password` | public |
| `GET /api/v1/auth/me` | Bearer |
| `GET /api/v1/auth/password-policy` | public |
| `POST /api/v1/admin/users/{id}/mfa/reset` | TENANT_ADMIN |

### Changed endpoints (breaking for any client other than the bundled frontend)

- **`POST /auth/login`**
  - The response now has a `status` field: `AUTHENTICATED`, `MFA_REQUIRED` or `MFA_ENROLLMENT_REQUIRED`.
  - `refreshToken` was removed from the body; it is now a cookie.
  - The request accepts an optional `tenantCode`.
- **`POST /auth/refresh`**
  - No body.
  - Reads the cookie and requires `X-Requested-With: XMLHttpRequest`.
- **`POST /auth/logout`**: requires `X-Requested-With` and clears the cookie.
- **`POST /auth/change-password`**: signs out every session, including the current one.
- **Errors:** auth errors are now ProblemDetail JSON with a stable `code`, for example `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `TENANT_SELECTION_REQUIRED`, `INVALID_MFA_CODE` or `RATE_LIMITED`.
- **Ignored request fields:** the HR endpoints' `tenantId` query parameter and the `tenantId` in branch, department and role request bodies are now ignored or forbidden. The bundled frontend did not rely on them.
- **Timesheet headers:** timesheet endpoints no longer read `X-User-Id` / `X-User-Name`.
- **Existing sessions:** access tokens issued before this release lack the `tv` claim and are rejected, so users sign in once.

## 3. Database migration

**`V13__auth_security_hardening.sql`** is additive and idempotent:
- 10 new columns on `users`;
- `refresh_tokens` created if missing, with family, timestamp and client columns;
- new tables `password_history`, `mfa_recovery_codes` and `password_reset_tokens`;
- `audit_logs` gains `outcome` and `user_agent`, plus the append-only trigger;
- existing refresh tokens are revoked (plaintext values become dead).

No data is deleted, and no existing role, permission or user is modified.

**It must be applied manually before deployment** because Flyway is disabled. Rollback steps are in the migration header.

## 4. Existing controls reused

- **RBAC model:** the `users`/`roles`/`permissions` tables, the `@permissionEvaluator` bean and the eight existing role identifiers are unchanged and mapped in `Roles.java`.
- **Tenant controls:** `TenantFilter` (header-vs-principal check and tenant status) and `SecurityUtils.currentTenantId()`.
- **Settings and audit tables:** `security_settings` now drives the lockout threshold, minimum password length and company-wide MFA requirement. `audit_logs` and its existing tenant-scoped viewer endpoint are reused.
- **Tokens:** the `refresh_tokens` table and the rotation idea are hardened rather than replaced.

## 5. Dependencies and configuration

- `pom.xml`: **H2 added with test scope only**, for integration tests. No new runtime dependencies; TOTP, AES-GCM and HIBP use the JDK.
- **Required environment variables:** `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY`. See `SMARTERP_SECURITY_CONFIGURATION_GUIDE.md`.

## 6. Frontend changes

`SmartERP-AI-Frontend`:

- **Session handling**
  - The access token and user are held **in memory only** (zustand). Nothing is persisted to `localStorage`, and the old `smarterp_token` / `smarterp_user` keys are removed at startup.
  - On load, `bootstrapSession()` restores the session through `POST /auth/refresh`, using the HttpOnly cookie.
  - Protected routes show a loader until startup finishes, so no protected content flashes.
  - Refresh is single-flight: one `/auth/refresh` call is in flight at a time, with a request queue. It retries the original request once on 401 and refreshes 30 s before expiry.
  - Refresh and logout use a separate axios instance (`utils/authAxios.js`) with `withCredentials` and `X-Requested-With`.
  - The main client and `hrApiClient.js` now share one interceptor.
- **Login** (`pages/auth/Login.jsx`) runs as a wizard: password → company picker → TOTP or recovery-code step, or MFA enrolment (QR via `qrcode.react` plus manual key) → one-time recovery-code screen (copy, download, "I have saved them") → role dashboard. The non-functional "Remember me" and "Continue with SSO" controls were removed.
- **Signup, ForgotPassword, ResetPassword** show the same live password checklist as the backend policy and read ProblemDetail `detail`. Forgot-password always shows the same message.
- **Account Security** page (`pages/account/AccountSecurity.jsx`, route `/app/account/security`, every role) offers change password (signs out everywhere), MFA status, enable, regenerate recovery codes, and disable (only when MFA is not mandatory). It is reached through a new header user menu; clicking the user pill previously logged out immediately.
- **Logout** in Header and Sidebar calls `POST /auth/logout`.
- **Mock credentials removed:** `src/data/users.mock.js` (`password123` demo accounts) and `mockLogin` were deleted.
- **New dependency:** `qrcode.react@^4.2.0`.
- **Not done:**
  - `VerifyOtp.jsx` is still a stub.
  - `/auth/me` permissions are not yet wired into `usePermissions` (RBAC-06).
  - The "Sign Up with Google" button is still non-functional.

## 7. Remaining gaps (not done; see the gap assessment for detail)

| ID | Gap | Why not done / next action |
|---|---|---|
| SEC-01 | DB password still the leaked one until rotated | Owner action in Supabase |
| OPS-03 | Flyway disabled; V13 applied by hand | Owner decision. Diff the live schema, then enable Flyway with a baseline. |
| AUTH-05 | Reset emails not delivered | Needs an email provider. Implement `PasswordResetNotifier` with `@Primary`. |
| AUTH-01 | BCrypt rather than Argon2id | SRS 12.4 allows BCrypt. Argon2 needs BouncyCastle plus `DelegatingPasswordEncoder`. |
| RBAC-05 | No default permission catalogue. New companies' non-admin roles have no `P` permissions. Purchase and Manufacturing use one role list for every action. | Needs the module × action matrix signed off against SRS §6.2 |
| TEN-04 | Branch, department and team data scope not applied | Needs SRS confirmation of which modules are branch-restricted |
| TEN-06 | No PostgreSQL row-level security (SRS 12.11 asks for it) | Needs per-transaction `SET app.current_tenant` through the Supabase pooler; validate on a copy first |
| APR-01/02 | No approval limits or leave/document self-approval checks | Needs thresholds from the business owners |
| AUD-04 | Business-event audit (payroll, journals, POs, …) | Next phase. `SecurityAuditService` is ready to reuse. |
| DATA-01..05 | Upload validation, confidential-document enforcement, export scope, CSV injection, DSAR/retention | Outside the login and security scope agreed for this phase |
| SESS-05 | Active-session list and revoke UI | Data captured (IP, user agent, created_at per refresh family); endpoint and UI not built |
| SEC-07, OPS-05 | TLS, backups, monitoring | Infrastructure; CANNOT VERIFY from the repository |
| — | Rate limiter is per instance | Move to Redis (SRS 12.9) when introduced |
| — | `HRServiceTest` pre-existing failure | HR module owner |
| — | Commit `b3e43cb` contains merge-conflict markers in `admin/dto/UpdateUserRequest.java` | The owner's uncommitted local fix resolves them and was left as-is; commit it |
