-- 将「精选」「随览」设为系统分类，不可删除
UPDATE categories SET is_system = 1 WHERE name IN ('精选', '随览');
