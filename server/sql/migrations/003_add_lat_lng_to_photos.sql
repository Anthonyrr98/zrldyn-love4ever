-- 为 photos 增加 lat、lng（经纬度），用于地图与发现页
ALTER TABLE photos ADD COLUMN lat DECIMAL(10, 6) NULL AFTER rating;
ALTER TABLE photos ADD COLUMN lng DECIMAL(10, 6) NULL AFTER lat;
