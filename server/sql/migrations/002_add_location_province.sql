-- 为 photos 增加 location_province（省），用于发现页省-市层级
ALTER TABLE photos ADD COLUMN location_province VARCHAR(128) NULL AFTER title;
