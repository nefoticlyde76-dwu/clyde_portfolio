-- =============================================================================
-- Migration 0002 — Authentication Support (PostgreSQL)
-- =============================================================================
-- Source of truth: docs/NETLIFY_MIGRATION_BLUEPRINT.md § 4.2 and § 6
--
-- The PHP application's infrastructure tables (app_sessions, login_attempts)
-- are NOT part of the eight portfolio tables and were only created when the
-- database session driver was enabled. For Netlify they are replaced with the
-- two tables below, which support:
--
--   * Opaque, server-side sessions for the admin dashboard.
--   * Hashed session identifiers (SHA-256 hex) — the raw token exists only in
--     the httpOnly cookie and is never stored in the database.
--   * Session expiry (expires_at) and revocation (DELETE of the session row).
--   * Login throttling backed by attempt records.
--
-- No administrator accounts are created and no default passwords are inserted.
-- The project currently has zero administrators; secure first-administrator
-- provisioning is implemented in a later phase (Phase 2C).
-- =============================================================================

-- gen_random_uuid() is part of the PostgreSQL core since version 13 and is
-- provided by the managed Netlify Database, so no extension is required.

-- -----------------------------------------------------------------------------
-- admin_sessions — httpOnly session tokens for the admin dashboard
-- -----------------------------------------------------------------------------
CREATE TABLE admin_sessions (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   INTEGER     NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,          -- SHA-256 hex of the raw session token
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_sessions_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_admin_sessions_token_hash ON admin_sessions (token_hash);
CREATE INDEX idx_admin_sessions_admin      ON admin_sessions (admin_id);

-- -----------------------------------------------------------------------------
-- login_attempts — login throttle storage (blueprint § 6.3)
-- -----------------------------------------------------------------------------
CREATE TABLE login_attempts (
  id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier   VARCHAR(255) NOT NULL,       -- email address or client IP
  attempted_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_identifier ON login_attempts (identifier, attempted_at);
