# Pic4Pick 项目概览与规划

本文档基于对全项目的遍历分析，汇总**现有功能**、**待改进项**、**未来规划**以及**项目结构改进计划**。

---

## 一、现有功能

### 1. 前端（React + Vite）

| 模块 | 功能描述 |
|------|----------|
| **路由** | `/`、`/gallery` 图库；`/discover` 发现；`/admin` 管理后台；`/photo/:id` 照片详情 |
| **图库页** | 分类筛选（最新、精选、随览、附近、远方）、无限滚动加载、从后端 API 拉取已审核照片 |
| **发现页** | 左侧位置导航（北京、河南等）、右侧高德地图、地图标记（硬编码示例数据） |
| **照片详情页** | 作品信息、相机参数、地理位置展示；**当前使用本地静态 `photoDatabase`，未对接 API** |
| **管理后台** | 登录保护、上传作品（拖拽/点击、EXIF 解析、OSS 上传）、作品信息表单、已上传列表、系统配置（高德 Key、OSS、主题色） |
| **通用** | Header 导航、搜索框（仅 UI）、主题色动态应用（CSS 变量）、JWT 存 localStorage |

### 2. 后端（Node.js + Express）

| 模块 | 功能描述 |
|------|----------|
| **认证** | `POST /api/auth/login`，JWT 2h 有效期，bcrypt 验密 |
| **照片** | `GET /api/photos`（status/category/keyword 筛选、分页）、`POST /api/photos`、`POST /api/photos/upload-oss`、`POST /api/photos/:id/approve`、`POST /api/photos/:id/reject`、`GET /api/photos/stats` |
| **配置** | `GET/POST /api/config`（管理员）、`GET /api/config/public`（高德、主题色等公开配置） |
| **健康检查** | `GET /api/health`（含 DB 连通性） |
| **存储** | MySQL（users、photos），阿里云 OSS（原图 + 缩略图 + 预览图），Sharp 服务端压缩 |
| **配置存储** | 使用 `app_settings` 表（**当前 schema.sql 中未定义**） |

### 3. 数据与配置

- **数据库**：`users`（管理员）、`photos`（标题、地点、分类、标签、评分、经纬度、OSS key/url、审核状态等）
- **业务代码** 中已使用 `thumbnail_url`、`preview_url`，但 **schema.sql 里 photos 表未包含这两列**
- 部署：前端 build → 静态；后端见 `server/DEPLOYMENT.md`（宝塔 + PM2 + Nginx）

---

## 二、需要改进的功能

### 2.1 数据与接口一致性

| 问题 | 说明 | 建议 |
|------|------|------|
| **照片详情不读 API** | `PhotoDetail.jsx` 使用本地 `photoDatabase`，未请求 `GET /api/photos/:id` | 新增 `GET /api/photos/:id`，详情页改为从 API 拉取并统一字段（location/date/category/tags 等） |
| **发现页数据硬编码** | `Discover.jsx` 的 `locations`、`AMapContainer.jsx` 的 `photoMarkers` 为静态数据 | 新增按地点聚合的 API（如按 location_city/country 统计），发现页与地图从 API 取数 |
| **Schema 与代码不一致** | `photos` 表无 `thumbnail_url`、`preview_url`；无 `app_settings` 表 | 在 schema 中增加这两列及 `app_settings` 表，并提供迁移脚本或补充到 `schema.sql` |

### 2.2 管理后台与上传

| 问题 | 说明 | 建议 |
|------|------|------|
| **提交时 oss_key 误用** | `handleSubmit` 中 `oss_key: formData.ossUrl`，应为上传接口返回的 `ossKey`（key 而非 URL） | 表单中保存 `ossKey`，提交时传 `oss_key: formData.ossKey` |
| **地图选点未实现** | 「在地图上选择位置」按钮无逻辑，lat/lng 始终 null | 实现选点（弹窗地图或发现页选点回填），提交时带 lat/lng |
| **审核流程未用** | 当前提交直接 `status: 'approved'`，待审核/拒绝流程未在 UI 体现 | 提交为 pending，后台增加「待审核」Tab，可审核/拒绝并查看拒绝原因 |

### 2.3 图库与展示

| 问题 | 说明 | 建议 |
|------|------|------|
| **图库需登录** | `GET /api/photos` 使用 `authRequired`，游客无法看图库 | 公开图库：列表接口对 `status=approved` 的查询允许未登录访问，或拆成公开只读接口 |
| **搜索未对接** | Header 搜索框仅 UI | 图库列表已支持 keyword，前端搜索框输入后带 keyword 请求列表 |
| **PhotoCard 标签类型** | `photo.tags` 有时为字符串（API 返回），需统一为数组再 join | 已在 Gallery 的 `normalizePhoto` 中处理，PhotoDetail 需同样兼容字符串/数组 |

### 2.4 配置与安全

| 问题 | 说明 | 建议 |
|------|------|------|
| **AMap 请求未走代理** | `AMapContainer` 内 `fetch('/api/config/public')` 依赖开发代理；生产需同源或配置 API 基址 | 使用 `import.meta.env.VITE_API_BASE_URL` 或统一 apiClient 请求 `/api/config/public` |
| **JWT 无刷新** | 2h 过期后需重新登录 | 可选：refresh token 或延长有效期并做「即将过期」提示 |
| **配置敏感信息** | OSS 密钥等存数据库，管理端明文展示 | 至少密钥输入框 type=password，保存后仅显示「已配置」不回显 |

---

## 三、未来要添加的功能

### 3.1 功能增强

- **单张照片接口**：`GET /api/photos/:id`，供详情页与分享链接使用。
- **按地点聚合**：接口按省/市统计照片数，发现页与地图用真实数据。
- **搜索**：图库关键词搜索与可选的高级筛选（日期范围、分类、地点）。
- **点赞/收藏**：照片点赞或收藏，需表结构（如 `photo_likes`）与接口。
- **评论**（可选）：照片下评论，需评论表与接口、前端组件。
- **多图/相册**（可选）：一组照片为一个相册，相册维度展示与管理。

### 3.2 用户体验

- **响应式与无障碍**：移动端布局、键盘导航、ARIA、图片懒加载与 alt。
- **多语言**：i18n（中/英）支持。
- **主题**：除主题色外，明/暗模式切换。
- **分享**：生成单张照片链接、Open Graph 元信息、可选分享图。

### 3.3 运维与质量

- **日志与监控**：请求日志、错误上报、简单健康看板。
- **测试**：前端关键路径与组件测试；后端 API 与 service 单元/集成测试。
- **CI**：lint、test、build 流水线；可选自动部署。
- **文档**：API 文档（如 OpenAPI/Swagger）、部署与配置说明更新。

---

## 四、项目结构审查与改进计划

### 4.1 当前结构概览

```
Pic4Pick/
├── index.html
├── package.json              # 前端
├── vite.config.js
├── public/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── App.css, index.css
│   ├── components/           # Header, LoginForm, PhotoCard, AMapContainer
│   ├── pages/                # Gallery, Discover, Admin, PhotoDetail
│   └── utils/                # apiClient, imageUrl, theme
└── server/
    ├── package.json
    ├── src/
    │   ├── index.js
    │   ├── config/           # db, env
    │   ├── routes/           # auth, photos, config
    │   ├── services/         # oss, photo, settings, user
    │   └── middleware/       # auth, errorHandler
    ├── sql/
    │   └── schema.sql        # 缺 thumbnail_url, preview_url, app_settings
    ├── scripts/
    └── 部署/运维脚本与文档
```

### 4.2 存在的问题

| 类型 | 问题 |
|------|------|
| **前端** | 无 `hooks/`、`api/` 或 `services/` 分层，请求与状态逻辑多在页面内；无统一常量（如 API 路径、分类列表）；组件与页面混用 CSS 文件，无设计 token 或样式规范 |
| **后端** | 无 `controllers/`，路由内直接写业务逻辑；缺少 `validators/` 或请求体校验层；sql 仅单文件，无迁移版本管理 |
| **共享** | 前后端对「分类」等枚举各自写死，未统一 |
| **文档与规范** | 无 CONTRIBUTING、无 API 文档入口、无统一错误码约定 |

### 4.3 改进计划（分阶段）

#### 阶段 1：数据与接口一致性（优先）

1. **数据库**
   - 在 `server/sql/schema.sql` 中为 `photos` 增加 `thumbnail_url`、`preview_url`（或单独迁移文件）。
   - 新增 `app_settings` 表（如 `config_key`, `config_value`, `updated_at`），并在文档中说明初始化步骤。
2. **API**
   - 新增 `GET /api/photos/:id`（可对未登录用户只读已审核）。
   - 修复管理端提交使用 `oss_key`（来自上传返回的 key）。
3. **前端**
   - 照片详情页改为请求 `GET /api/photos/:id`，统一字段映射（含 tags 字符串/数组、location、date）。
   - 图库：若希望公开访问，后端对「仅查 approved」的列表放宽认证或单独公开路由。

#### 阶段 2：前端结构

1. **目录**
   - 增加 `src/api/`：按资源封装 `photos.js`、`auth.js`、`config.js`，内部调用 `apiClient`。
   - 增加 `src/constants/`：如 `categories.js`、`routes.js`。
   - 可选：`src/hooks/`（如 `usePhotos`、`useAuth`）把请求与状态从页面中抽离。
2. **样式**
   - 将全局变量（如主题色）集中到 `index.css` 或 `theme.css`，组件尽量使用变量；可选建立简单 design tokens 文档。

#### 阶段 3：后端结构

1. **分层**
   - 增加 `server/src/controllers/`：如 `photoController.js`，从 route 接收 req/res，调用 service，返回 JSON。
   - 路由只做「解析参数 → controller → 捕获异常」。
2. **校验**
   - 对 `POST /api/photos`、`POST /api/auth/login` 等做请求体校验（可选用 joi/express-validator），在 controller 或 middleware 中统一返回 400 信息。
3. **SQL**
   - 采用按日期或序号的迁移文件（如 `sql/migrations/001_add_photo_urls.sql`），便于多环境一致。

#### 阶段 4：发现页与配置

1. **发现页**
   - 后端提供「按地点聚合」接口（如按 city/country 统计数量）。
   - 发现页与地图组件从该接口和 `GET /api/photos?…` 取数，替换硬编码的 `locations` 和 `photoMarkers`。
2. **配置**
   - 前端所有 API 请求（含 `/api/config/public`）走统一 baseURL（如 `apiClient` 的 `API_BASE`），避免生产环境路径错误。

#### 阶段 5：长期

- 引入 ESLint/Prettier 与前端或后端测试框架；编写 README/QUICK_START 中提到的 API 文档入口；考虑错误码与多语言键的统一。

### 4.4 建议的目录目标形态（简要）

```
src/
├── api/              # photos, auth, config 等封装
├── components/
├── constants/        # categories, routes
├── hooks/            # 可选：usePhotos, useAuth
├── pages/
└── utils/

server/src/
├── config/
├── controllers/      # 新增
├── middleware/
├── routes/           # 薄层，调 controller
├── services/
└── validators/       # 可选
server/sql/
├── schema.sql        # 与代码一致
└── migrations/       # 可选
```

---

## 五、总结

- **现有功能**：图库（分类、分页）、发现（地图+侧栏，数据硬编码）、管理（登录、上传、配置）、照片详情（本地数据）。
- **需改进**：详情与发现对接真实 API、Schema 与业务代码一致、图库公开访问与搜索、上传字段与审核流程、配置与安全细节。
- **未来**：单照接口、地点聚合、搜索与筛选、点赞/收藏、i18n、主题、测试与 CI、API 文档。
- **结构**：先补齐数据库与单照 API、修正上传字段；再抽离前端 api/constants、后端 controller/校验；最后做迁移与测试、文档规范。

按「阶段 1 → 阶段 2 → 阶段 3」推进，可在不破坏现有使用的前提下逐步提升一致性和可维护性。
