-- Apply once to a database created before content editing.
-- A fresh import of schema.sql already has these columns.
-- Do not drop or recreate the database.

USE clyde_portfolio;

ALTER TABLE projects
    ADD COLUMN overview TEXT NULL AFTER summary,
    ADD COLUMN purpose TEXT NULL AFTER overview,
    ADD COLUMN role VARCHAR(180) NULL AFTER purpose,
    ADD COLUMN contribution TEXT NULL AFTER role,
    ADD COLUMN solution TEXT NULL AFTER contribution,
    ADD COLUMN lessons TEXT NULL AFTER features;

UPDATE projects
SET purpose = description
WHERE purpose IS NULL
  AND description IS NOT NULL
  AND description <> '';

ALTER TABLE experiences
    ADD COLUMN started_on DATE NULL AFTER period_label,
    ADD COLUMN ended_on DATE NULL AFTER started_on,
    ADD COLUMN is_current TINYINT(1) NOT NULL DEFAULT 0 AFTER ended_on;

UPDATE experiences
SET is_current = 1
WHERE title = 'Graphic Designer'
  AND organization = 'Independent, Papua New Guinea'
  AND period_label = 'Ongoing';
