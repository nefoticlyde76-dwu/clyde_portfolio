-- Apply once. A fresh import of schema.sql already has this column.

USE clyde_portfolio;

ALTER TABLE certificates
    ADD COLUMN display_image_path VARCHAR(255) NULL AFTER file_path;
