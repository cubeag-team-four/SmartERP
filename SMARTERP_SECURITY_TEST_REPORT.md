# SmartERP Security Test Report

**Run:** 2026-11-19 · `cd ERP_Backend && ./mvnw test` (JUnit 5, Mockito, Spring Boot Test, H2 in PostgreSQL mode)

## 1. Result

| | Tests | Passed | Failed / Errors |
|---|---|---|---|
| Before this work (baseline) | 20 | 19 | 1 error |
| **After this work** | **100** | **99** | **1 error (same pre-existing one)** |

The remaining error existed before any change:

```
HRServiceTest.testLeaveRequestAndApprovalFlow
java.lang.IllegalArgumentException: Requested days (2) exceed available remaining leave balance (0 days).
```

It is a leave-balance fixture problem in the HR service test. It is unrelated to security and was left untouched for the HR module owner.

**Startup check:** the packaged application starts with the new configuration ("Started ErpApplication in ~14 s"). It refuses to start without `JWT_SECRET` / `MFA_ENCRYPTION_KEY`.

## 2. New security test suites (80 tests)

| Suite | Type | Tests | What it proves |
|---|---|---|---|
| `security/SecurityIntegrationTest` | **Full stack**: real Spring context, filter chain, controllers, JPA on H2 | 10 | End-to-end: signup → mandatory admin MFA → cookie refresh → RBAC → cross-tenant → escalation → lockout → rate limit → audit → headers |
| `auth/AuthFlowTest` (nested Login, Mfa, Sessions, Passwords) | Real services over in-memory repositories | 28 | Login, lockout, MFA, recovery codes, rotation and reuse detection, logout, change and reset password, no secrets in audit |
| `auth/SignupAndTokenFilterTest` | Service and filter | 4 | Signup creates company, 7 roles and admin; duplicate email; JWT filter rejects stale, tampered and MFA tokens |
| `auth/security/AuthPrimitivesTest` | Unit | 7 | RFC 6238 vectors, TOTP skew and replay, AES-GCM tamper detection, token hashing, rate limiter |
| `auth/security/PasswordPolicyServiceTest` | Unit | 10 | Length, character classes, common and decorated passwords, name/email, history, breach check, fail-open |
| `security/EndpointAuthorizationCoverageTest` | Structural (classpath scan of all 82 controllers) | 3 | Every endpoint has `@PreAuthorize`; no `X-User-Id` identity headers; no `tenantId` request params |
| `admin/service/RoleAssignmentGuardTest` | Unit | 9 | Escalation to `SUPER_ADMIN` blocked; reserved names; self-action blocked; tenant pinning |
| `hr/controller/LeaveControllerScopeTest` | Controller | 5 | Employee pinned to own leave records; no fallback to the requested id; tenant from JWT |
| `security/TenantFailClosedTest` | Unit | 4 | No default tenant 1; finance resolver ignores the header for non-SA; weak, missing or default JWT secret rejected |

## 3. Scenario coverage (master prompt §17)

Status key:
- ✅ covered by an automated test.
- ◐ partially covered.
- ✗ not covered, with the reason.

### Authentication

| # | Scenario | Status | Test |
|---|---|---|---|
| 1 | Valid login succeeds | ✅ | `AuthFlowTest.Login.validLoginIssuesSessionWithHashedRefreshToken`, integration step 4 |
| 2 | Invalid password fails | ✅ | `wrongPasswordFailsGenericallyAndIsAudited` |
| 3 | Inactive user cannot log in | ✅ | `inactiveUserCannotLogIn` |
| 4 | Suspended company blocked | ✅ | `suspendedCompanyCannotLogIn` |
| 5 | 5 failures lock the account | ✅ | `fiveFailuresLockTheAccount…`, integration step 7 |
| 6 | Login rate limit | ✅ | integration `loginEndpointIsRateLimitedPerIp`, `AuthPrimitivesTest` |
| 7 | Password policy enforced by backend | ✅ | `PasswordPolicyServiceTest`, integration steps 2 and 4 |
| 8 | Common or breached passwords rejected | ✅ | `rejectsCommonPasswords…`, `rejectsBreachedPasswords` (HIBP client mocked) |
| 9 | Last 5 passwords cannot be reused | ✅ | `blocksReuseOfRecentPasswords` |
| 10 | Reset tokens expire and are single-use | ✅ | `resetTokenIsHashedSingleUse…`, `expiredResetTokensAreRejected`, `newResetRequestInvalidatesEarlierLinks` |

### MFA

| # | Scenario | Status | Test |
|---|---|---|---|
| 11 | Enrolment requires a verified code | ✅ | `enrollmentRequiresAValidCode…`, integration step 1 |
| 12 | Invalid TOTP rejected | ✅ | `enrolledUserMustPassTotp…` |
| 13 | Valid TOTP accepted | ✅ | same, plus RFC vectors |
| 14 | Privileged users cannot skip MFA | ✅ | `privilegedRolesCannotGetASessionWithoutMfa`, integration step 1 |
| 15 | Recovery codes work once | ✅ | `recoveryCodesWorkExactlyOnce` |
| 16 | Reused recovery code rejected | ✅ | same, plus `regeneratingRecoveryCodesInvalidatesTheOldOnes` |
| 17 | MFA secrets not exposed | ◐ | Stored encrypted (`enrollment…`) and `@JsonIgnore`. The secret is returned once by `/mfa/setup` by design. |
| 18 | MFA reset audited and authorised | ◐ | Audit write tested in `MfaService`. Admin-reset authorisation goes through the same `RoleAssignmentGuard` (tested); no dedicated endpoint test. |

### RBAC

| # | Scenario | Status | Test |
|---|---|---|---|
| 19 | SA has platform capabilities only | ◐ | Integration: ADM gets 403 on `/tenants`. SA paths not exercised end to end. |
| 20 | ADM cannot reach another company | ✅ | integration step 3, `RoleAssignmentGuardTest.tenantAdminIsPinnedToOwnTenant` |
| 21–25 | Finance/Sales/HR/Ops/Inventory isolation | ◐ | Employee → 403 on payroll, HR, ledger, users and audit (integration step 4). Per-role checks follow from the `@PreAuthorize` rules in the permission matrix. Not every role × endpoint pair is tested. |
| 26 | Employee cannot read others' records | ✅ | `LeaveControllerScopeTest` |
| 27 | Direct API calls cannot bypass | ✅ | `EndpointAuthorizationCoverageTest`, integration tests |
| 28 | No self-escalation | ✅ | `RoleAssignmentGuardTest`, integration step 3 |
| 29 | Permission changes take effect | ✅ | Token-version revocation: `filterAcceptsCurrentAccessTokensOnly` |
| 30 | Approval limits | ✗ | Not implemented (APR-02, needs thresholds from the SRS owner) |

### Tenant and record scope

| # | Scenario | Status | Test |
|---|---|---|---|
| 31 | Cross-company access denied | ✅ | Integration step 3, `noEndpointLetsTheClientChooseTheTenant…`. The IDOR fallbacks were removed (code review; no per-repository DB test). |
| 32–33 | Cross-branch / department | ✗ | Branch scope not implemented (TEN-04) |
| 34 | Cross-user records | ✅ | Leave and timesheets |
| 35 | Changing an id in the URL | ◐ | Tenant-scoped lookups. A dedicated purchase/manufacturing IDOR integration test is still to add. |
| 36 | Export/download scope | ✗ | Out of the login/security scope agreed for this phase (DATA-02/03) |
| 37 | Background jobs | ✗ | No scheduler exists |

### Sessions

| # | Scenario | Status | Test |
|---|---|---|---|
| 38 | Expired access tokens rejected | ✅ | JJWT expiry, plus the tampered and stale cases in the filter test |
| 39 | Refresh rotation | ✅ | `refreshRotatesAndTheOldTokenCannotBeUsedAgain`, integration step 5 |
| 40 | Refresh reuse detected | ✅ | `reuseOfARotatedTokenRevokesTheWholeFamily`, integration step 5 |
| 41 | Revoked tokens unusable | ✅ | logout tests |
| 42 | Logout invalidates the session | ✅ | `logoutRevokes…`, integration step 6 |
| 43 | Password change invalidates sessions | ✅ | `passwordChangeRevokesEverySession` |
| 44 | Disabled accounts lose access | ✅ | `disabledAccountsCannotRefresh`; the filter reloads the user per request |

### Audit and AI

| # | Scenario | Status | Test |
|---|---|---|---|
| 45 | Login success and failure recorded | ✅ | `AuthFlowTest`, integration step 9 |
| 46 | Role/permission changes recorded | ✅ | Integration step 9 (`USER_CREATED`); `ROLE_ASSIGNMENT_CHANGED` written in `UserService` (no dedicated test) |
| 47 | Critical ERP changes audited | ✗ | Business-module audit not in scope (AUD-04) |
| 48 | No passwords or MFA secrets in audit | ✅ | `auditEntriesNeverContainSecrets`, integration step 9 |
| 49–50 | AI exclusion and scope | n/a | No AI functionality exists |

### Data protection

| # | Scenario | Status |
|---|---|---|
| 51–55 | Export, deletion and retention | ✗ Out of scope for this phase |

## 4. Known limitations of the test evidence

- **H2, not PostgreSQL.**
  - The integration test uses H2 in PostgreSQL mode with a schema generated by Hibernate.
  - **Migration `V13__auth_security_hardening.sql` itself has not been executed against PostgreSQL.** The local Docker daemon was not running, and the shared Supabase database was deliberately not touched.
  - Before deploying, run V13 against a copy of the database, then run it a second time to confirm idempotency.
- **HIBP not called for real.** The breached-password client is tested for fail-open behaviour and mocked for positive results; no live call to the HIBP API was made.
- **Single-instance rate limiting.** It is tested in-process only.
- **No automated browser tests.** Frontend behaviour is covered by the build check in §5 only.
- **No penetration test.** SRS §2.3 / §14.6 require a third-party penetration test before go-live.

## 5. Frontend

- **`npm run build`:** ✅ passes (verified 2026-11-19). The remaining chunk-size and dynamic-import warnings are older than this work.
- **`npm run lint`:** 339 errors and 10 warnings before → 330 and 10 after. **0 new problems** (compared by diffing ESLint JSON output); the remaining 330 errors were already there.
- **Static checks:**
  - no `localStorage` / `sessionStorage` writes of tokens anywhere in `src`;
  - no references to the removed mock users or `password123`;
  - refresh and logout send `withCredentials` plus `X-Requested-With`.
- **Not done:** the login, MFA, refresh and logout UI flows have **not** been exercised in a browser against a running backend. Before release, do a manual or Playwright pass:
  - signup → admin MFA enrolment → recovery codes;
  - employee login;
  - page reload keeps the session;
  - 15-minute expiry refreshes silently;
  - logout;
  - forgot/reset (with `PASSWORD_RESET_LOG_LINKS=true` locally).
