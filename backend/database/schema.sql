-- =======================================================
-- Smart City 360 – Database Schema (MySQL Compatible)
-- Smart Civic Issue Reporting and Resolution System
-- =======================================================

CREATE DATABASE IF NOT EXISTS `smart_city_360` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `smart_city_360`;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `contact_email` VARCHAR(120),
  `contact_phone` VARCHAR(20),
  `head_name` VARCHAR(100),
  `description` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone_number` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('citizen', 'official', 'admin') DEFAULT 'citizen',
  `department_id` INT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Complaint Categories Table
CREATE TABLE IF NOT EXISTS `complaint_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(50) DEFAULT 'alert-circle',
  `base_severity` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  `default_department_id` INT NULL,
  `description` VARCHAR(255),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`default_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Geographic Areas Table
CREATE TABLE IF NOT EXISTS `geographic_areas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pincode` VARCHAR(15),
  `center_lat` DECIMAL(10, 8) NOT NULL,
  `center_lng` DECIMAL(11, 8) NOT NULL,
  `radius_meters` INT DEFAULT 1500,
  `risk_level` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
  `total_reports` INT DEFAULT 0,
  `unresolved_count` INT DEFAULT 0,
  `priority_score` DECIMAL(5, 2) DEFAULT 0.00,
  `last_calculated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_geo_coords` (`center_lat`, `center_lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Complaints Table
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tracking_id` VARCHAR(30) NOT NULL UNIQUE,
  `citizen_id` INT NULL,
  `citizen_name` VARCHAR(120) NOT NULL,
  `citizen_phone` VARCHAR(20) NOT NULL,
  `citizen_email` VARCHAR(150) NULL,
  `title` VARCHAR(200) NOT NULL,
  `category_id` INT NOT NULL,
  `description` TEXT NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `area_name` VARCHAR(150) NOT NULL,
  `address_landmark` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `urgency_level` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  `status` ENUM('Submitted', 'Acknowledged', 'Under Review', 'Assigned to Department', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Reopened') DEFAULT 'Submitted',
  `priority_score` DECIMAL(5, 2) DEFAULT 25.00,
  `priority_level` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
  `assigned_department_id` INT NULL,
  `assigned_official_id` INT NULL,
  `upvote_count` INT DEFAULT 0,
  `resolution_remarks` TEXT NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`citizen_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`category_id`) REFERENCES `complaint_categories`(`id`),
  FOREIGN KEY (`assigned_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_official_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_complaints_tracking` (`tracking_id`),
  INDEX `idx_complaints_status` (`status`),
  INDEX `idx_complaints_priority` (`priority_score`),
  INDEX `idx_complaints_coords` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Complaint Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS `complaint_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `previous_status` VARCHAR(50),
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by_user_id` INT NULL,
  `changed_by_name` VARCHAR(120) DEFAULT 'System',
  `remarks` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE,
  INDEX `idx_history_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Department Assignments Table
CREATE TABLE IF NOT EXISTS `department_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  `assigned_by_user_id` INT NULL,
  `notes` TEXT,
  `status` ENUM('Active', 'Reassigned', 'Completed') DEFAULT 'Active',
  `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Complaint Community Support (Upvotes) Table
CREATE TABLE IF NOT EXISTS `complaint_support` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `user_id` INT NULL,
  `citizen_phone` VARCHAR(20) NULL,
  `ip_address` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_complaint_supporter` (`complaint_id`, `citizen_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Complaint Attachments Table
CREATE TABLE IF NOT EXISTS `complaint_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(200) NOT NULL,
  `file_type` VARCHAR(50),
  `file_size` INT,
  `attachment_type` ENUM('complaint', 'resolution') DEFAULT 'complaint',
  `uploaded_by` VARCHAR(120) DEFAULT 'Citizen',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Priority Scores Breakdown Table
CREATE TABLE IF NOT EXISTS `priority_scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `geographic_area_id` INT NULL,
  `report_frequency_score` DECIMAL(5, 2) DEFAULT 0.00,
  `unresolved_score` DECIMAL(5, 2) DEFAULT 0.00,
  `severity_score` DECIMAL(5, 2) DEFAULT 0.00,
  `recency_score` DECIMAL(5, 2) DEFAULT 0.00,
  `unique_reporters_score` DECIMAL(5, 2) DEFAULT 0.00,
  `final_score` DECIMAL(5, 2) NOT NULL,
  `calculated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `citizen_phone` VARCHAR(20) NULL,
  `complaint_id` INT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('status_change', 'assignment', 'escalation', 'resolution', 'general') DEFAULT 'status_change',
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Government Integration Logs Table
CREATE TABLE IF NOT EXISTS `government_integration_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `department_id` INT NULL,
  `endpoint_url` VARCHAR(255) NOT NULL,
  `request_payload` TEXT,
  `response_payload` TEXT,
  `external_reference_id` VARCHAR(100),
  `status` ENUM('SUCCESS', 'FAILED', 'PENDING_RETRY') DEFAULT 'SUCCESS',
  `retry_count` INT DEFAULT 0,
  `synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Administrator Settings Table
CREATE TABLE IF NOT EXISTS `administrator_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255),
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
