# Pic4Pick 项目概览与规划

本文档基于对全项目的遍历分析，汇总**现有功能**、**待改进项**、**未来规划**。

---

## 一、现有功能

### 1. 前端（React + Vite）

- **路由**：`/`、`/gallery` 图库；`/discover` 发现；`/admin` 管理后台；`/photo/:id` 照片详情
- **图库页**：分类筛选（最新、精选、随览、附近、远方）、无限滚动、从后端 API 拉取已审核照片
- **发现页**：左侧位置导航（北京、河南等）、右侧高德地图、地图标记（硬编码示例数据）
- **照片详情页**：作品信息、相机参数、地理位置；**当前使用本地静态 photoDatabase，未对接 API**
- **管理后台**：登录、上传作品（拖拽/点击、EXIF 解析、OSS 上传）、作品信息表单、已上传列表、系统配置（高德 Key、OSS、主题色）
- **通用**：Header 导航、搜索框（仅 UI）、主题色动态应用、JWT 存 localStorage

### 2. 后端（Node.js + Express）

- **认证**：`POST /api/auth/login`，JWT 2h，bcrypt 验密
- **照片**：`GET /api/photos`（status/category/keyword、分页）、`POST /api/photos`、`POST /api/photos/upload-oss`、审核通过/拒绝、`GET /api/photos/stats`
- **配置**：`GET/POST /api/config`（管理员）、`GET /api/config/public`（高德、主题色）
- **健康检查**：`GET /api/health`
- **存储**：MySQL（users、photos），阿里云 OSS（原图+缩略图+预览图），Sharp 压缩
- **配置存储**：使用 `app_settings` 表（**schema.sql 中未定义**）

### 3. 数据与配置

- 数据库：`users`、`photos`（业务代码使用 thumbnail_url、preview_url，**schema 中 photos 表未包含这两列**）
- 部署：前端 build 静态；后端见 server/DEPLOYMENT.md

---

## 二、需要改进的功能

### 2.1 数据与接口一致性

- **照片详情不读 API**：PhotoDetail 使用本地 photoDatabase，应新增 `GET /api/photos/:id`，详情页从 API 拉取并统一字段
- **发现页数据硬编码**：Discover 的 locations、AMapContainer 的 photoMarkers 为静态数据，应新增按地点聚合的 API，发现页与地图从 API 取数
- **Schema 与代码不一致**：photos 表无 thumbnail_url、preview_url；无 app_settings 表，需在 schema 中补充并做迁移说明

### 2.2 管理后台与上传

- **提交时 oss_key 误用**：handleSubmit 中 oss_key 用了 formData.ossUrl（URL），应为上传返回的 ossKey（key），表单需保存 ossKey 并提交
- **地图选点未实现**：「在地图上选择位置」无逻辑，lat/lng 始终 null，需实现选点并回填
- **审核流程未用**：当前提交直接 status: 'approved'，可改为提交为 pending，后台增加「待审核」Tab 进行审核/拒绝

### 2.3 图库与展示

- **图库需登录**：GET /api/photos 使用 authRequired，游客无法看图库，建议对 status=approved 的列表允许未登录或拆公开只读接口
- **搜索未对接**：Header 搜索框仅 UI，图库已支持 keyword，前端搜索框应带 keyword 请求列表
- **PhotoDetail 标签类型**：tags 需兼容 API 返回的字符串/数组，与 Gallery 的 normalizePhoto 一致

### 2.4 配置与安全

- **AMap 请求**：AMapContainer 内 fetch('/api/config/public') 依赖开发代理，生产需同源或 VITE_API_BASE_URL
- **JWT 无刷新**：2h 过期后需重新登录，可考虑 refresh token 或即将过期提示
- **配置敏感信息**：OSS 密钥等保存后建议不回显，仅显示「已配置」

---

## 三、未来要添加的功能

### 3.1 功能增强

- 单张照片接口 `GET /api/photos/:id`，供详情与分享
- 按地点聚合接口，发现页与地图用真实数据
- 图库关键词搜索与高级筛选（日期、分类、地点）
- 点赞/收藏（需表结构与接口）
- 评论、多图/相册（可选）

### 3.2 用户体验

- 响应式与无障碍（移动端、键盘、ARIA、图片懒加载）
- 多语言 i18n（中/英）
- 明/暗主题
- 分享链接与 Open Graph

### 3.3 运维与质量

- 日志与监控、错误上报
- 前端/后端测试与 CI（lint、test、build）
- API 文档（如 OpenAPI）、部署与配置文档更新
