-- 浏览量计数（访问统计）
ALTER TABLE photos ADD COLUMN views BIGINT UNSIGNED NOT NULL DEFAULT 0;
CREATE INDEX idx_photos_views ON photos(views);

