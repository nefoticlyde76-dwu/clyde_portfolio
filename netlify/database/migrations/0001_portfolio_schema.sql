-- =============================================================================
-- Migration 0001 — Portfolio Schema (PostgreSQL)
-- =============================================================================
-- Source of truth: docs/NETLIFY_MIGRATION_BLUEPRINT.md § 4.2
-- Reproduces the eight existing MySQL portfolio tables with equivalent
-- PostgreSQL types, constraints and indexes. No columns have been added,
-- removed or renamed; business meaning is unchanged.
--
-- Type conversions applied (blueprint § 4.1 / § 4.3):
--   INT(10) UNSIGNED AUTO_INCREMENT -> INTEGER GENERATED ALWAYS AS IDENTITY
--   TINYINT(3) UNSIGNED             -> SMALLINT   (profile singleton id)
--   TINYINT(1)                      -> BOOLEAN
--   DATETIME                        -> TIMESTAMPTZ (UTC)
--   DATE                            -> DATE
--   ENUM('draft','published')       -> TEXT + CHECK constraint
--   TEXT / MEDIUMTEXT               -> TEXT
--   DEFAULT current_timestamp()     -> DEFAULT now()
--   ON UPDATE current_timestamp()    -> BEFORE UPDATE trigger (set_updated_at)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared trigger function emulating MySQL's ON UPDATE current_timestamp()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- admins — 0 rows (first administrator provisioned in a later phase)
-- -----------------------------------------------------------------------------
CREATE TABLE admins (
  id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_admins_email UNIQUE (email)
);

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- profile_settings — 1 row (singleton: id is always 1)
-- -----------------------------------------------------------------------------
CREATE TABLE profile_settings (
  id                 SMALLINT     NOT NULL PRIMARY KEY,
  full_name          VARCHAR(120) NOT NULL,
  headline           VARCHAR(180) NOT NULL,
  introduction       TEXT         NOT NULL,
  biography          TEXT,
  location           VARCHAR(160),
  public_email       VARCHAR(190),
  phone              VARCHAR(40),
  linkedin_url       VARCHAR(255),
  github_url         VARCHAR(255),
  resume_path        VARCHAR(255),
  profile_image_path VARCHAR(255),
  seo_title          VARCHAR(160),
  seo_description    VARCHAR(320),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON profile_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- projects — 1 row
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
  id               INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            VARCHAR(160) NOT NULL,
  slug             VARCHAR(180) NOT NULL,
  category         VARCHAR(80)  NOT NULL,
  summary          VARCHAR(500) NOT NULL,
  overview         TEXT,
  purpose          TEXT,
  role             VARCHAR(180),
  contribution     TEXT,
  solution         TEXT,
  description      TEXT,
  technologies     VARCHAR(500),
  features         TEXT,
  lessons          TEXT,
  live_url         VARCHAR(255),
  repository_url   VARCHAR(255),
  cover_image_path VARCHAR(255),
  is_featured      BOOLEAN      NOT NULL DEFAULT FALSE,
  status           TEXT         NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published')),
  display_order    INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_projects_slug UNIQUE (slug)
);

CREATE INDEX idx_projects_status_order ON projects (status, display_order);
CREATE INDEX idx_projects_featured     ON projects (is_featured, status);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- certificates — 0 rows
-- -----------------------------------------------------------------------------
CREATE TABLE certificates (
  id                   INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                VARCHAR(180) NOT NULL,
  issuing_organization VARCHAR(180) NOT NULL,
  issued_on            DATE,
  credential_url       VARCHAR(255),
  credential_id        VARCHAR(120),
  file_path            VARCHAR(255),
  display_image_path   VARCHAR(255),
  description          TEXT,
  status               TEXT         NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'published')),
  display_order        INTEGER      NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_certificates_credential_id UNIQUE (credential_id)
);

CREATE INDEX idx_certificates_status_order ON certificates (status, display_order);

CREATE TRIGGER trg_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- design_items — 2 rows
-- -----------------------------------------------------------------------------
CREATE TABLE design_items (
  id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(160) NOT NULL,
  category      VARCHAR(80)  NOT NULL,
  description   TEXT,
  image_path    VARCHAR(255),
  external_url  VARCHAR(255),
  is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
  status        TEXT         NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published')),
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_items_status_order ON design_items (status, display_order);
CREATE INDEX idx_design_items_featured     ON design_items (is_featured, status);

CREATE TRIGGER trg_design_items_updated_at
  BEFORE UPDATE ON design_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- skills — 27 rows
-- -----------------------------------------------------------------------------
CREATE TABLE skills (
  id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(80)  NOT NULL,
  display_order INTEGER      NOT NULL DEFAULT 0,
  status        TEXT         NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_skills_category_name UNIQUE (category, name)
);

CREATE INDEX idx_skills_status_order ON skills (status, display_order);

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- experiences — 3 rows
-- -----------------------------------------------------------------------------
CREATE TABLE experiences (
  id              INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           VARCHAR(160) NOT NULL,
  organization    VARCHAR(180) NOT NULL,
  period_label    VARCHAR(80)  NOT NULL,
  started_on      DATE,
  ended_on        DATE,
  is_current      BOOLEAN      NOT NULL DEFAULT FALSE,
  description     TEXT,
  experience_type VARCHAR(40)  NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  display_order   INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiences_status_order ON experiences (status, display_order);
CREATE INDEX idx_experiences_type         ON experiences (experience_type, status);

CREATE TRIGGER trg_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- contact_messages — 0 rows
-- -----------------------------------------------------------------------------
CREATE TABLE contact_messages (
  id           INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_name  VARCHAR(120) NOT NULL,
  sender_email VARCHAR(190) NOT NULL,
  subject      VARCHAR(180) NOT NULL,
  message      TEXT         NOT NULL,
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_read_created ON contact_messages (is_read, created_at);
