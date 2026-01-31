# 数据库迁移

新安装请直接执行根目录 `schema.sql`。

## 已有数据库升级

若你已有 `pic4pick` 数据库且 `photos` 表缺少 `thumbnail_url`、`preview_url` 列，或缺少 `app_settings` 表，请执行：

```bash
mysql -u root -p pic4pick < server/sql/migrations/001_add_photo_urls_and_app_settings.sql
```

**注意**：该迁移只需执行一次。若列已存在会报错，可忽略报错或只执行尚未执行过的语句。
