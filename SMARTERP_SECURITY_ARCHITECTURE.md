# SmartERP Security Architecture

**Scope:** authentication, signup, sessions, MFA, RBAC enforcement, tenant isolation and security audit, as implemented in `ERP_Backend` (Spring Boot 3.3 / Java 17 / PostgreSQL) and `SmartERP-AI-Frontend` (React 19 / Vite).

**Not covered:** AI, data-export and DSAR architecture. The AI modules are empty stubs today; see §9.

## 1. Trust boundaries

```
Browser (React SPA)  ──HTTPS──>  Spring Boot API  ──TLS──>  PostgreSQL (Supabase)
  untrusted: every header,         trust anchor:              defence in depth:
  param, body, role flag           JWT signature +            tenant_id columns,
                                   DB-loaded user             append-only audit trigger
```

- **Nothing the browser sends is trusted for identity or scope.**
  - The user and the tenant come from the verified JWT, and the user is reloaded from the database on every request.
  - `tenantId` query parameters and `X-User-Id` headers are no longer read.
  - `X-Tenant-Id` is accepted only if it equals the authenticated user's tenant (`TenantFilter`).
- Frontend route guards and hidden buttons are UX only. The backend decides every request.

## 2. Request pipeline

Order of the Spring Security filter chain for `/api/**`:

1. **CORS.** Only configured origins are allowed, with credentials enabled for the refresh cookie.
2. **`AuthRateLimitFilter`.** Per-IP throttling of the unauthenticated `/api/v1/auth/*` POSTs; returns 429.
3. **`JwtAuthenticationFilter`.**
   - Verifies the HS256 signature, expiry and `typ=access`.
   - Loads the user by id. Inactive or deleted users fail.
   - Rejects the token if its `tenantId` or `tv` (token version) no longer matches the database.
4. **`TenantFilter`.** Rejects a mismatched `X-Tenant-Id`, and blocks users of SUSPENDED or INACTIVE companies (Super Admin excepted).
5. **URL rules.** The public auth endpoints are listed explicitly; everything else requires authentication.
6. **Method security.** Every controller method carries an explicit `@PreAuthorize`. `EndpointAuthorizationCoverageTest` fails the build otherwise.
7. **Service layer.**
   - Tenant-scoped queries such as `findByIdAndTenantId`. The unscoped `findById` fallbacks were removed.
   - A missing tenant fails closed through `TenantGuard`.
   - Ownership and self-action rules are enforced here.

## 3. Authentication

### 3.1 Login state machine (`AuthService.login`)

```
POST /auth/login {email, password, tenantCode?}
  ├─ no account ────────────────────────────────> 401 INVALID_CREDENTIALS (dummy BCrypt compare for timing;
  │                                                 in-memory counter → 423 after 5, like real accounts)
  ├─ all matching accounts locked ──────────────> 423 ACCOUNT_LOCKED
  ├─ wrong password ── count failure (5 / 15 min → lock 15 min) ──> 401 INVALID_CREDENTIALS
  ├─ password valid for >1 company ─────────────> 409 TENANT_SELECTION_REQUIRED + [{code,name}]
  ├─ inactive user ─────────────────────────────> 401 INVALID_CREDENTIALS (generic)
  ├─ company suspended/inactive ────────────────> 403 TENANT_INACTIVE
  ├─ MFA enrolled ──────────────────────────────> 200 MFA_REQUIRED          + mfaToken (5 min)
  ├─ MFA mandatory, not enrolled ───────────────> 200 MFA_ENROLLMENT_REQUIRED + mfaToken (5 min)
  └─ otherwise ─────────────────────────────────> 200 AUTHENTICATED + access token + refresh cookie
```

- No access token or refresh token is issued until every required factor has succeeded.
- The `mfaToken` carries the user's token version. Revoking sessions also kills any MFA step in progress.

### 3.2 Signup (`SignupService`)

Self-service signup, per SRS 2.6. A single transaction creates:
- a **TRIAL** company with a generated code;
- its 7 company-level system roles (Admin, Finance, Sales, HR Manager, Operations, Inventory, Employee). The platform role `SUPER_ADMIN` is never created by signup;
- the registrant as `TENANT_ADMIN`, who must enrol MFA at first sign-in.

The email must be unused across all companies, so new accounts never make login ambiguous.

### 3.3 Passwords

- `PasswordPolicyService` is the single authority, applied to signup, admin-created users, password change and reset. The rules are in the configuration guide §5.
- BCrypt hashing.
- `password_history` keeps the last hashes and blocks reuse of the last 5.
- The HIBP k-anonymity check is fail-open.
- **Reset:**
  - The `/forgot-password` response is identical whether or not the email exists.
  - The token is 256-bit random, stored as SHA-256, valid for 30 minutes and single-use.
  - Issuing a new token voids older ones.
  - A successful reset revokes all sessions and clears the lockout.

### 3.4 MFA (`MfaService`, `TotpService`, `SecretCipher`)

- **TOTP:** RFC 6238 with SHA-1, 6 digits, 30-second steps and ±1 step of skew. Compatible with Google and Microsoft Authenticator.
- **Secret:** 160-bit, stored **AES-256-GCM encrypted** (`v1:` + IV + ciphertext) under `MFA_ENCRYPTION_KEY`, which is not kept in the database. It is shown once, during setup (QR plus manual key).
- **Enrolment:** a pending secret becomes active only after a valid code is entered.
- **Replay:** the last accepted time step is stored, so the same code cannot be used twice.
- **Recovery codes:** 8 one-time codes of 50 bits each, stored as SHA-256. Each works once, and regenerating them (which requires a current TOTP) voids the old ones.
- **Policy:** mandatory for `SUPER_ADMIN` and `TENANT_ADMIN`; optional for other roles unless the company sets `security_settings.mfa_required`. Users subject to the mandate cannot disable MFA.
- **Admin reset:** clears the enrolment and revokes the user's sessions. It is audited and cannot target yourself or a Super Admin.

## 4. Sessions and tokens (`SessionService`)

| Token | Format | Lifetime | Storage (server) | Storage (browser) |
|---|---|---|---|---|
| Access | HS256 JWT `{uid, tenantId, tv, typ:access}` | 15 min | none (stateless + `tv` check) | memory only |
| Refresh | 256-bit random | 7 days | SHA-256 in `refresh_tokens`, with `family_id`, IP, user agent | `HttpOnly; Secure; SameSite=Strict` cookie, `Path=/api/v1/auth` |
| MFA-pending | HS256 JWT `{typ:mfa, purpose}` | 5 min | none | memory only |

- **Rotation:** every `/auth/refresh` revokes the presented token (reason `ROTATED`) and issues a new one in the same family.
- **Reuse detection:** if a `ROTATED` token is presented again, the whole family is revoked and `REFRESH_TOKEN_REUSE` is audited. The attacker and the victim both have to sign in again.
- **Revocation through `users.token_version`:**
  - Every access token embeds `tv`, and the JWT filter compares it with the database on each request.
  - It is bumped by logout, password change or reset, deactivation, role change and MFA reset.
  - Revocation therefore takes effect on the next request rather than at token expiry.
- **Lockout and live sessions:** a lockout deliberately does *not* end existing sessions. Otherwise an attacker could sign a user out just by failing logins on purpose.
- **CSRF:** API calls use Bearer headers, so they are not CSRF-able. The two endpoints that use the cookie (refresh and logout) rely on `SameSite=Strict` plus a required `X-Requested-With` header, which forces a CORS preflight.

## 5. Eight-role RBAC

The existing role identifiers are kept unchanged; `security/Roles.java` documents the mapping.

| Business role | Identifier | Scope |
|---|---|---|
| Super Admin | `SUPER_ADMIN` | Platform |
| Admin | `TENANT_ADMIN` | Company |
| Finance | `FINANCE_MANAGER` | Company, finance |
| Sales | `SALES_MANAGER` | Company, sales |
| HR Manager | `HR_MANAGER` | Company, HR |
| Operations | `OPERATIONS_MANAGER` | Company, operations |
| Inventory | `INVENTORY_MANAGER` | Company, inventory |
| Employee | `EMPLOYEE` | Own records |

**Model.** The existing tables are reused:

```
users ⇄ user_roles ⇄ roles(tenant_id, name, system_role) ⇄ role_permissions ⇄ permissions(module, action, scope)
```

- Authorities take the form `ROLE_<NAME>` plus `<MODULE>_<ACTION>_<SCOPE>`.
- Endpoints use `hasAnyRole(...)` and/or `@permissionEvaluator.has(authentication, module, action)`.

**Escalation controls (`RoleAssignmentGuard`):**
- Only a Super Admin can create, rename, re-permission or grant `SUPER_ADMIN`. Names are matched case- and space-insensitively.
- A tenant admin cannot create roles named like system roles, cannot target another tenant, and cannot edit, deactivate or delete a Super Admin account.
- Nobody can change their own roles or status, delete themselves, or reset their own MFA.
- Any role change revokes the user's sessions, so the new authorities apply immediately.

See `SMARTERP_RBAC_PERMISSION_MATRIX.md` for the per-module matrix.

## 6. Tenant and organisational isolation

| Layer | Mechanism |
|---|---|
| Identity | Tenant taken from the JWT, checked against the DB-loaded user |
| Header | `X-Tenant-Id` must equal the user's tenant (`TenantFilter`) |
| Controllers | No `tenantId` request parameter except `RoleController`'s Super-Admin-only override. Enforced by a test. |
| Services | `findByIdAndTenantId` everywhere touched. The 13 `.or(findById)` fallbacks were removed. A null tenant throws instead of defaulting to tenant 1 (`TenantGuard`, `FinanceTenantResolver`). |
| Ownership | Leave: employees are pinned to their own employee record; reading another employee's leave returns 404. Timesheets: the user comes from the principal, and you cannot approve your own. |
| Database | `tenant_id` on every table. **PostgreSQL row-level security (SRS 12.11) is not yet implemented**; see the gap assessment TEN-06. |

**Branch, department and team scope** (the `OWN`/`TEAM`/`BRANCH`/`ALL` enum) exists in the model but is not yet applied in queries. This is a remaining gap (TEN-04).

## 7. Audit (`SecurityAuditService`)

- Writes to `audit_logs` (tenant, actor, action, module `AUTH`, outcome, entity, details, IP, user agent).
- Each write runs in its own transaction (`REQUIRES_NEW`), so a failed login is still recorded. An audit failure never breaks the request.
- **Events:**
  - `SIGNUP`
  - `LOGIN` (success and failure, with reason)
  - `LOGIN_PASSWORD_OK`
  - `ACCOUNT_LOCKED`
  - `LOGOUT`
  - `REFRESH_TOKEN_REUSE`
  - `PASSWORD_CHANGE`
  - `PASSWORD_RESET_REQUESTED`
  - `PASSWORD_RESET`
  - `MFA_ENROLL`, `MFA_ENABLED`, `MFA_DISABLED`
  - `MFA_RECOVERY_CODE_USED`
  - `MFA_RECOVERY_CODES_REGENERATED`
  - `MFA_RESET_BY_ADMIN`
  - `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `USER_DELETED`
  - `ROLE_ASSIGNMENT_CHANGED`
- **Never logged:** passwords, tokens, TOTP secrets or codes, recovery codes. A test asserts this.
- Events with no tenant (an unknown email) go to the application log only, because `tenant_id` is mandatory.
- **Protection:**
  - A database trigger makes `audit_logs` append-only.
  - There is no update or delete API.
  - Reading is limited to `SUPER_ADMIN`/`TENANT_ADMIN` and scoped to the tenant (`GET /api/v1/settings/security/audit-logs`).
- **Not yet audited:** business-module events such as payroll, journals and purchase orders (AUD-04).

## 8. Frontend responsibilities

- The access token is kept in memory only.
- The session is restored at startup by calling `/auth/refresh` with the HttpOnly cookie.
- A single-flight refresh runs on 401, with one retry of the original request.
- Logout calls the server.
- The login wizard covers password, company picker, MFA code or recovery code, and MFA enrolment with QR and recovery codes.
- Signup, forgot-password and reset screens show the same password rules as the server.
- There is an Account Security page for changing the password and managing MFA.
- See the implementation report for the exact files.

## 9. AI privacy

- The AI backend (`ai/**`) and the AI frontend pages are placeholders with no provider and no data flow, so there is nothing to secure yet. No AI feature was invented.
- **Contract for when AI is built.** These are SRS FR-AI-01/02 and §6.3:
  - AI data access goes through the same tenant-scoped, permission-checked services as the API, never raw repositories.
  - No role sees an AI insight it could not see as raw data.
  - Records can be excluded from AI; the exclusion is enforced in the backend and audited.
  - Prompts and outputs are logged without sensitive content.
  - AI-proposed actions require human approval and pass through RBAC.
  - Provider keys stay server-side.

## 10. Known architectural limitations

- HS256 shared secret. SRS 12.1 prefers RS256 once there are several services.
- The rate limiter is in-memory per instance; it should move to Redis (SRS 12.9).
- No PostgreSQL row-level security yet.
- No branch, department or team data scope yet.
- Password reset delivery needs an email provider.
- The schema is applied by hand while Flyway stays disabled.
