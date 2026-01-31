-- 照片隐藏标记：1=隐藏（不在前台展示），0=显示
ALTER TABLE photos ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0;
