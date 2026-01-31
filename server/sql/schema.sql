-- Pic4Pick backend schema

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'viewer') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  location_province VARCHAR(128) NULL,
  location_city VARCHAR(128) NULL,
  location_country VARCHAR(128) NULL,
  shot_date DATE NULL,
  category ENUM('最新', '精选', '随览', '附近', '远方') NOT NULL DEFAULT '最新',
  tags TEXT NULL,
  rating TINYINT UNSIGNED NULL,
  lat DECIMAL(10, 6) NULL,
  lng DECIMAL(10, 6) NULL,
  oss_key VARCHAR(512) NOT NULL,
  oss_url VARCHAR(1024) NULL,
  thumbnail_url VARCHAR(1024) NULL,
  preview_url VARCHAR(1024) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_category (category),
  KEY idx_shot_date (shot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  config_key VARCHAR(64) NOT NULL,
  config_value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认管理员账号（请在生产环境中修改密码）
INSERT INTO users (username, password_hash, role)
VALUES (
  'admin',
  -- bcrypt hash for password 'admin123'（占位，运行前请用真正的 hash 替换）
  '$2a$10$abcdefghijklmnopqrstuv',
  'admin'
)
ON DUPLICATE KEY UPDATE username = username;

-- 示例照片数据（根据需要自行调整或删除）
INSERT INTO photos (title, location_province, location_city, location_country, shot_date, category, tags, rating, lat, lng, oss_key, oss_url, thumbnail_url, preview_url, status)
VALUES
  ('太和门', '北京', '北京', '中国', '2024-03-15', '最新', '古建,历史,建筑', 8, 39.9163, 116.3972, 'samples/beijing-taihemen.jpg', NULL, NULL, NULL, 'approved'),
  ('海与灯塔', '河北', '秦皇岛', '中国', '2024-07-20', '远方', '旅行,海,灯塔', 9, 39.8256, 119.4786, 'samples/hai-dengta.jpg', NULL, NULL, NULL, 'approved');

