# SmartERP Security Configuration Guide

This guide is for the developers and the deployment owner, and covers how to configure and deploy the authentication and security hardening.

> **Before deploying this build**, do steps 1–3 in [§1 Deployment checklist](#1-deployment-checklist). If you skip step 2 (apply migration V13), login breaks, because the new user columns are read on every request.

## 1. Deployment checklist

| # | Step | Owner | Notes |
|---|---|---|---|
| 1 | **Rotate the Supabase database password.** The old one was committed to git in `application.properties` and pushed to both GitHub organisations. | DB owner | Supabase → Project Settings → Database → Reset password. Then decide whether to purge git history. Rotate first, because purging does not un-leak the password. |
| 2 | **Apply `ERP_Backend/src/main/resources/db/migration/V13__auth_security_hardening.sql`** to every database (dev, staging, prod) **before** the new backend starts. | DB owner | Flyway is disabled (`spring.flyway.enabled=false`), so run it manually, e.g. in the Supabase SQL editor. It is additive and idempotent (`IF NOT EXISTS`), so it is safe to run twice. **Effect:** all existing refresh tokens are revoked, so every user signs in once more. |
| 3 | Set the required environment variables listed in §2. | DevOps | The app **refuses to start** if `JWT_SECRET` or `MFA_ENCRYPTION_KEY` is missing or weak. This is deliberate. |
| 4 | Configure an email provider for password reset (§6). | Backend dev | Until this is done, reset links are not delivered. |
| 5 | Serve the API over HTTPS only (TLS 1.2+) and terminate TLS at the proxy/load balancer (§8). | DevOps | Needed for the `Secure` refresh cookie and HSTS. |
| 6 | Tell admins: at their next sign-in, every Super Admin and Admin must enrol an authenticator app and save their 8 recovery codes. | Product | MFA is mandatory for these roles. |

## 2. Environment variables

Locally, Spring reads them from `ERP_Backend/.env` (git-ignored; template in `ERP_Backend/.env.example`). In deployed environments, set them as real environment variables or secrets-manager entries. **Never commit real values.**

### Required

| Variable | Purpose | How to generate |
|---|---|---|
| `DB_URL` | JDBC URL, e.g. `jdbc:postgresql://host:6543/postgres?sslmode=require&prepareThreshold=0` | — |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials | Use the **rotated** password |
| `JWT_SECRET` | HS256 signing key for access tokens. At least 32 bytes; the old public default is rejected. | `openssl rand -base64 48` |
| `MFA_ENCRYPTION_KEY` | AES-256-GCM key that encrypts TOTP secrets at rest. Must decode to **exactly 32 bytes**. | `openssl rand -base64 32` |

> **Key handling**
> - Rotating `JWT_SECRET` signs everyone out, which is harmless.
> - Rotating `MFA_ENCRYPTION_KEY` makes every existing MFA enrolment unreadable. Affected users can then only sign in with a recovery code or an admin MFA reset.
> - Store both keys in a secrets manager and back them up separately from the database.

### Optional (defaults shown)

| Variable | Default | Purpose |
|---|---|---|
| `JWT_ACCESS_TTL_MS` | `900000` (15 min) | Access-token lifetime (SRS 8.7) |
| `JWT_REFRESH_TTL_MS` | `604800000` (7 days) | Refresh-token lifetime |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated frontend origins. Set to the production frontend URL. |
| `REFRESH_COOKIE_SECURE` | `true` | Keep `true` everywhere. Browsers accept Secure cookies on `http://localhost`. |
| `REFRESH_COOKIE_SAME_SITE` | `Strict` | Use `None` only if the frontend and API are on **different sites**, and then keep Secure=true. |
| `MFA_ISSUER` | `SmartERP` | Name shown in authenticator apps |
| `MFA_ENFORCE_PRIVILEGED` | `true` | Mandatory MFA for SUPER_ADMIN/TENANT_ADMIN. Do not disable in production. |
| `PASSWORD_BREACH_CHECK_ENABLED` | `true` | Have I Been Pwned range check (§5) |
| `PASSWORD_RESET_LINK_BASE` | `http://localhost:5173/reset-password` | Frontend reset page URL placed in emails |
| `PASSWORD_RESET_LOG_LINKS` | `false` | **Development only:** writes reset links to the log |
| `SWAGGER_ENABLED` | `false` | Exposes `/swagger-ui.html` and `/v3/api-docs` without auth. Development only. |
| `APP_LOG_LEVEL` | `INFO` | Application log level. SQL logging is off. |

## 3. Token and session settings

| Setting | Value | Where |
|---|---|---|
| Access token | HS256 JWT, 15 min. Carries `uid`, `tenantId`, `tv` (token version), `typ=access`. | `JwtService` |
| MFA-pending token | 5 min, `typ=mfa`. Accepted only by the MFA endpoints. | `JwtService` |
| Refresh token | 256-bit random, 7 days, **stored as SHA-256**. Rotated on every use; reuse of a rotated token revokes the whole family. | `SessionService` |
| Refresh cookie | `smarterp_rt`; `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` | `AuthController` |
| CSRF on cookie endpoints | `/auth/refresh` and `/auth/logout` require `X-Requested-With: XMLHttpRequest` | `AuthController` |

The following events invalidate **all** of a user's sessions:
- password change or reset;
- deactivation or deletion;
- role change;
- admin MFA reset.

Logout ends the current device's refresh family and invalidates that user's outstanding access tokens.

## 4. Login protection

| Control | Value | Config |
|---|---|---|
| Lockout | 5 failures within 15 min → locked for 15 min (temporary, never permanent) | `app.security.lockout.*`; per-company `security_settings.max_login_attempts` (allowed 3–10) |
| Unknown emails | Locked the same way in memory, so a lock response does not reveal whether an account exists | — |
| MFA failures | Count toward the same lockout | — |
| Per-IP rate limits | login 10/min; mfa/verify 10/min; signup 5/10 min; forgot-password 5/15 min; reset-password 10/15 min; refresh 60/min → HTTP 429 | `AuthRateLimitFilter` |
| Error messages | Generic `Invalid email or password` for unknown email, wrong password or inactive account | — |

> **Multiple instances:** the rate limiter is in-memory, so each backend instance counts separately. The SRS (12.9) specifies a Redis-backed limiter; replace `RateLimiter` when Redis is introduced. Account lockout is stored in the database and is shared across instances.
>
> **Behind a reverse proxy:** set `server.forward-headers-strategy=native`, and only behind a trusted proxy. Otherwise every request appears to come from the proxy IP and shares one rate-limit bucket.

## 5. Password policy

The backend enforces it on signup, on admin-created users, on password change and on password reset:
- 10–128 characters. A company can raise the minimum through `security_settings.minimum_password_length`, but never lower it.
- At least 3 of 4 character classes: uppercase, lowercase, number, symbol.
- Not a common password, including decorated forms such as `Password@2026` (list: `src/main/resources/security/common-passwords.txt`).
- Must not contain the user's email name or name.
- Must not match any of the user's last 5 passwords (`password_history` stores hashes only).
- Must not be found by the **Have I Been Pwned** k-anonymity check. Only the first 5 hex characters of SHA-1(password) leave the server.
  - **Fail-open:** if HIBP is unreachable or slow (3 s timeout), the password is accepted and a warning is logged. The rule above about common passwords still applies.
  - Outbound HTTPS to `api.pwnedpasswords.com` must be allowed. Otherwise set `PASSWORD_BREACH_CHECK_ENABLED=false`.

Hashing is BCrypt (cost 10, per-hash salt), which SRS 12.4 permits. Argon2id would need BouncyCastle plus a `DelegatingPasswordEncoder` so existing hashes keep working; this is listed as a remaining item.

## 6. Password reset email (deployment blocker)

There is no email provider in the codebase, so reset links are currently **not delivered**:
- By default `LoggingPasswordResetNotifier` logs only that a reset was requested.
- With `PASSWORD_RESET_LOG_LINKS=true` (development only) it logs the link.

To finish the feature, implement `com.cubeage.erp.auth.service.PasswordResetNotifier` with SMTP, SES or SendGrid, and annotate it `@Primary`. Reset tokens are random, stored as SHA-256, valid for 30 minutes, single-use, and invalidated when a newer one is issued.

## 7. MFA operations

- **Enrolment:**
  - Admins enrol at first sign-in.
  - Other roles can enrol from Account Security, or are forced to when the company sets `security_settings.mfa_required = true`.
- **Lost device:** the user signs in with a recovery code, or a company Admin calls `POST /api/v1/admin/users/{id}/mfa/reset`. That reset is audited, revokes the user's sessions, and cannot be applied to yourself or to a Super Admin.
- **A Super Admin who loses both the device and the recovery codes:** another Super Admin must reset it. If none exists, clear these columns in SQL, record the action in `audit_logs`, and have the user re-enrol immediately:
  - `users.mfa_enabled`
  - `mfa_secret`
  - `mfa_enrolled_at`
  - `mfa_last_used_step`

## 8. HTTPS, headers and CORS

- **API response headers** (set by Spring Security):
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - HSTS (1 year, includeSubDomains), sent only over HTTPS.
- **Frontend host:** configure its own CSP (script-src 'self'), HSTS and HTTPS redirect at the static host or CDN. **CANNOT VERIFY** here: the hosting platform is unknown.
- **TLS:** TLS 1.2+ must be enforced at the load balancer or reverse proxy. **CANNOT VERIFY:** no deployment configuration is in the repository.
- **Database TLS:** the DB URL already uses `sslmode=require`.

## 9. Database

- Apply V13 (§1). Rollback guidance is in the migration header.
- `audit_logs` gets a trigger that rejects `UPDATE` and `DELETE` (append-only). Tenants are soft-deleted, so this does not interfere.
- **Flyway:** re-enable it once someone has diffed the live schema against `db/migration`. Today the repository cannot recreate production: V9 is missing, and `refresh_tokens` existed only in production until V13. Use `spring.flyway.baseline-on-migrate=true` with a baseline version matching what is already applied.

## 10. Backups and monitoring (CANNOT VERIFY)

The SRS calls for:
- daily backups with point-in-time recovery, 30-day retention and quarterly restore drills (5.10);
- RPO ≤ 15 min and RTO ≤ 4 h (5.11).

These are Supabase plan and infrastructure settings, so confirm them in the Supabase dashboard. Also recommended:
- error monitoring (e.g. Sentry);
- alerting on spikes in these audit actions:
  - `ACCOUNT_LOCKED`
  - `REFRESH_TOKEN_REUSE`
  - `LOGIN` with outcome `FAILURE`
