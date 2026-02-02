-- 扩展 users 表：邮箱与状态
ALTER TABLE users
  ADD COLUMN email VARCHAR(128) NULL AFTER username,
  ADD COLUMN status ENUM('active', 'banned') NOT NULL DEFAULT 'active' AFTER role;

