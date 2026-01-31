-- 分类表（图库分类按钮，支持后台管理）
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  filter_type ENUM('manual', 'tag', 'both') NOT NULL DEFAULT 'manual',
  filter_tags TEXT NULL COMMENT '按标签筛选时使用的标签列表（逗号分隔）',
  is_system TINYINT(1) NOT NULL DEFAULT 0 COMMENT '系统内置分类不可删除',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name),
  KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认分类（最新、精选、随览、附近、远方均为系统分类，不可删除）
INSERT INTO categories (name, sort_order, filter_type, is_system) VALUES
  ('最新', 1, 'manual', 1),
  ('精选', 2, 'manual', 1),
  ('随览', 3, 'manual', 1),
  ('附近', 4, 'manual', 1),
  ('远方', 5, 'manual', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_system = VALUES(is_system);
