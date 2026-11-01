-- Atomic authentication gates for runtimes that do not implement advisory
-- locks. These rows serialize claims through conditional updates, while the
-- transaction retains each reservation through credential verification.

CREATE TABLE login_rate_limit_buckets (
  identifier    VARCHAR(67)    NOT NULL PRIMARY KEY,
  failure_times TIMESTAMPTZ[]  NOT NULL DEFAULT ARRAY[]::TIMESTAMPTZ[],
  in_flight     INTEGER        NOT NULL DEFAULT 0 CHECK (in_flight >= 0),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_rate_limit_buckets_expired
  ON login_rate_limit_buckets (updated_at)
  WHERE in_flight = 0;

INSERT INTO login_rate_limit_buckets (identifier, failure_times, updated_at)
SELECT identifier,
       COALESCE(
         array_agg(attempted_at ORDER BY attempted_at)
           FILTER (WHERE attempted_at > now() - interval '15 minutes'),
         ARRAY[]::TIMESTAMPTZ[]
       ),
       max(attempted_at)
  FROM login_attempts
 WHERE identifier ~ '^(ip|id):[0-9a-f]{64}$'
   AND attempted_at > now() - interval '24 hours'
 GROUP BY identifier;

CREATE TABLE admin_setup_guard (
  id           SMALLINT    NOT NULL PRIMARY KEY CHECK (id = 1),
  completed_at TIMESTAMPTZ
);

INSERT INTO admin_setup_guard (id) VALUES (1);
