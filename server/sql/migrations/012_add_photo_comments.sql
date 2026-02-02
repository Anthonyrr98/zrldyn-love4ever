-- 评论表：每张照片的评论
CREATE TABLE IF NOT EXISTS photo_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  photo_id BIGINT UNSIGNED NOT NULL,
  author VARCHAR(64) NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photo_id_created_at (photo_id, created_at),
  CONSTRAINT fk_photo_comments_photo_id FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

