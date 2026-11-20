-- =====================================================================================
-- V13: authentication & session security hardening (SRS 8.7, 11.1, 12.1, 12.4, 12.9, 12.10)
--
-- Additive and idempotent (IF NOT EXISTS everywhere): safe to run more than once and on a
-- database whose schema was changed by hand. No existing column, row, role or user is
-- dropped or modified, with ONE deliberate exception: currently active refresh tokens are
-- revoked (see section 2), which signs every user out once.
--
-- Flyway is disabled in application.properties, so this must be applied manually (e.g. in
-- the Supabase SQL editor) BEFORE deploying the matching backend build; the new entity
-- columns below are required at runtime.
--
-- Rollback guidance: the new tables can be dropped and the new columns removed with
-- ALTER TABLE ... DROP COLUMN; the audit trigger with DROP TRIGGER trg_audit_logs_append_only.
-- Rolling back the application without rolling back the schema is safe (columns are unused).
-- =====================================================================================

-- 1. Account protection state on users -------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count     INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until           TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at          TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at    TIMESTAMPTZ;
-- Bumped on logout / password change / deactivation / role change / MFA reset: every
-- access token carries the version it was issued with and is rejected once it is stale.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version          INTEGER     NOT NULL DEFAULT 0;
-- TOTP MFA. The secret is AES-GCM encrypted by the application (never stored in plain text).
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled            BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret             VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at        TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used_step     BIGINT;

-- 2. Refresh tokens: hashed at rest, grouped into rotation families -----------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    token       VARCHAR(255) NOT NULL UNIQUE,
    user_id     BIGINT       NOT NULL,
    tenant_id   BIGINT       NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE
);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id      VARCHAR(64);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(40);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address     VARCHAR(64);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent     VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);
-- The `token` column now stores SHA-256(token). Existing rows hold plaintext tokens, which
-- would never match a hash; revoke them so the plaintext values are dead (users sign in again).
UPDATE refresh_tokens SET revoked = TRUE, revoked_reason = 'V13_HASHING_MIGRATION' WHERE revoked = FALSE;

-- 3. Password history (hashes only), last N passwords cannot be reused ----------------
CREATE TABLE IF NOT EXISTS password_history (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history (user_id, created_at DESC);

-- 4. MFA recovery codes (SHA-256 of high-entropy one-time codes) -----------------------
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  VARCHAR(64) NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user ON mfa_recovery_codes (user_id);

-- 5. Password reset tokens (SHA-256 of the emailed token, single use, short expiry) --------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(64) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    requested_ip VARCHAR(64),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);

-- 6. Audit log: outcome + user agent, and append-only enforcement -----------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS outcome    VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_action ON audit_logs (tenant_id, action, created_at);

CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
-- Note: audit_logs.tenant_id is ON DELETE CASCADE; tenants are soft-deleted (status
-- INACTIVE) by TenantService, so the trigger does not interfere with normal operation.
