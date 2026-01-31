# Pic4Pick 项目概览与结构改进

本文档为**总览**，详细内容在 `docs/` 下分文档维护。

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | **现有功能**、**需要改进的功能**、**未来要添加的功能** |
| [docs/STRUCTURE_IMPROVEMENT_PLAN.md](docs/STRUCTURE_IMPROVEMENT_PLAN.md) | **项目结构审查**与**分阶段改进计划** |

---

## 简要总结

### 现有功能

- **前端**：图库（分类、无限滚动）、发现（地图 + 侧栏，数据硬编码）、管理（登录、上传、配置）、照片详情（本地静态数据）
- **后端**：JWT 登录、照片 CRUD、OSS 上传与缩略图、审核、配置读写、健康检查
- **数据**：MySQL users/photos，OSS 存储；代码中已用 thumbnail_url、preview_url 与 app_settings，但 schema 未同步

### 需要改进

- 照片详情与发现页对接真实 API（新增 GET /api/photos/:id、按地点聚合）
- Schema 与代码一致（photos 增加 thumbnail_url/preview_url，新增 app_settings 表）
- 图库公开访问、搜索对接、上传时 oss_key 使用 key 而非 URL、地图选点与审核流程
- 配置与安全（API baseURL、JWT 刷新、敏感配置不回显）

### 未来规划

- 单照接口、地点聚合、搜索与筛选、点赞/收藏、i18n、主题、测试与 CI、API 文档

### 结构改进顺序

1. **阶段 1**：补齐数据库与 GET /api/photos/:id，修正上传字段与详情页数据源  
2. **阶段 2**：前端增加 api/、constants/（可选 hooks/）  
3. **阶段 3**：后端增加 controllers/、校验层、SQL 迁移  
4. **阶段 4**：发现页与地图用真实数据、统一 API baseURL  
5. **阶段 5**：测试、CI、文档与规范  

详见 [docs/STRUCTURE_IMPROVEMENT_PLAN.md](docs/STRUCTURE_IMPROVEMENT_PLAN.md)。
