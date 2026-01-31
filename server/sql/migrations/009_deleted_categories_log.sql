-- 已删除分类归档表：永久删除时写入，用于保留“删除过的分类”列表
CREATE TABLE IF NOT EXISTS deleted_categories_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_id INT UNSIGNED NOT NULL COMMENT '原 categories 表主键',
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  filter_type VARCHAR(16) NOT NULL DEFAULT 'manual',
  filter_tags TEXT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL COMMENT '原创建时间',
  updated_at TIMESTAMP NULL COMMENT '原更新时间',
  soft_deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  permanent_deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '永久删除时间',
  PRIMARY KEY (id),
  KEY idx_permanent_deleted_at (permanent_deleted_at),
  KEY idx_original_id (original_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='已永久删除的分类归档';
