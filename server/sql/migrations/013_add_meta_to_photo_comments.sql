-- 为评论表增加身份与 IP 信息
ALTER TABLE photo_comments
  ADD COLUMN user_id INT UNSIGNED NULL AFTER photo_id,
  ADD COLUMN author_ip VARCHAR(45) NULL AFTER author;

ALTER TABLE photo_comments
  ADD CONSTRAINT fk_photo_comments_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

