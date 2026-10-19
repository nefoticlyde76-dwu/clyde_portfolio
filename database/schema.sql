-- Clyde Nefoti portfolio schema
-- Import this file once from MySQL or phpMyAdmin.
-- Content tables are independent, so they do not use foreign keys.

CREATE DATABASE IF NOT EXISTS clyde_portfolio
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE clyde_portfolio;

CREATE TABLE admins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profile_settings (
    id TINYINT UNSIGNED NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    headline VARCHAR(180) NOT NULL,
    introduction TEXT NOT NULL,
    biography MEDIUMTEXT NULL,
    location VARCHAR(160) NULL,
    public_email VARCHAR(190) NULL,
    phone VARCHAR(40) NULL,
    linkedin_url VARCHAR(255) NULL,
    github_url VARCHAR(255) NULL,
    resume_path VARCHAR(255) NULL,
    profile_image_path VARCHAR(255) NULL,
    seo_title VARCHAR(160) NULL,
    seo_description VARCHAR(320) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    category VARCHAR(80) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    overview TEXT NULL,
    purpose TEXT NULL,
    role VARCHAR(180) NULL,
    contribution TEXT NULL,
    solution TEXT NULL,
    description TEXT NULL,
    technologies VARCHAR(500) NULL,
    features TEXT NULL,
    lessons TEXT NULL,
    live_url VARCHAR(255) NULL,
    repository_url VARCHAR(255) NULL,
    cover_image_path VARCHAR(255) NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_projects_slug (slug),
    KEY idx_projects_status_order (status, display_order),
    KEY idx_projects_featured (is_featured, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certificates (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(180) NOT NULL,
    issuing_organization VARCHAR(180) NOT NULL,
    issued_on DATE NULL,
    credential_url VARCHAR(255) NULL,
    credential_id VARCHAR(120) NULL,
    file_path VARCHAR(255) NULL,
    display_image_path VARCHAR(255) NULL,
    description TEXT NULL,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_certificates_credential_id (credential_id),
    KEY idx_certificates_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE design_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT NULL,
    image_path VARCHAR(255) NULL,
    external_url VARCHAR(255) NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_design_items_status_order (status, display_order),
    KEY idx_design_items_featured (is_featured, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skills (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_skills_category_name (category, name),
    KEY idx_skills_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experiences (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(160) NOT NULL,
    organization VARCHAR(180) NOT NULL,
    period_label VARCHAR(80) NOT NULL,
    started_on DATE NULL,
    ended_on DATE NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    description TEXT NULL,
    experience_type VARCHAR(40) NOT NULL,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_experiences_status_order (status, display_order),
    KEY idx_experiences_type (experience_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contact_messages (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_name VARCHAR(120) NOT NULL,
    sender_email VARCHAR(190) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contact_messages_read_created (is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
