CREATE TABLE app_sessions (
    session_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    session_data MEDIUMBLOB NOT NULL,
    expires_at BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (session_id),
    KEY idx_app_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempted_at BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY idx_login_attempts_ip_time (ip_hash, attempted_at),
    KEY idx_login_attempts_time (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
