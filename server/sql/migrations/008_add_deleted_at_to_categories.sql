-- 分类软删除：删除后可复原
ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;
