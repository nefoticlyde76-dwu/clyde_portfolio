CREATE TABLE contact_rate_limit_buckets (
  identifier_hash   CHAR(64)    NOT NULL PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count         INTEGER     NOT NULL CHECK (hit_count >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_rate_limit_updated
  ON contact_rate_limit_buckets (updated_at);
