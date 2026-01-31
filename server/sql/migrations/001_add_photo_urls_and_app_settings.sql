-- 已有数据库升级：为 photos 增加 thumbnail_url、preview_url，并创建 app_settings 表
-- 新安装请直接使用 schema.sql。本迁移仅需执行一次，若列已存在会报错可忽略。

ALTER TABLE photos ADD COLUMN thumbnail_url VARCHAR(1024) NULL AFTER oss_url;
ALTER TABLE photos ADD COLUMN preview_url VARCHAR(1024) NULL AFTER thumbnail_url;

CREATE TABLE IF NOT EXISTS app_settings (
  config_key VARCHAR(64) NOT NULL,
  config_value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
