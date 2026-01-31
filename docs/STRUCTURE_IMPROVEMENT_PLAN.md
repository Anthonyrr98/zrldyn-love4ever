# Pic4Pick 项目结构审查与改进计划

---

## 一、当前结构概览

```
Pic4Pick/
├── index.html, package.json, vite.config.js
├── public/
├── src/
│   ├── App.jsx, main.jsx, App.css, index.css
│   ├── components/     # Header, LoginForm, PhotoCard, AMapContainer
│   ├── pages/          # Gallery, Discover, Admin, PhotoDetail
│   └── utils/          # apiClient, imageUrl, theme
└── server/
    ├── package.json
    ├── src/
    │   ├── index.js
    │   ├── config/     # db, env
    │   ├── routes/     # auth, photos, config
    │   ├── services/   # oss, photo, settings, user
    │   └── middleware/ # auth, errorHandler
    ├── sql/
    │   └── schema.sql  # 缺 thumbnail_url, preview_url, app_settings
    ├── scripts/
    └── 部署/运维脚本与文档
```

---

## 二、存在的问题

### 2.1 前端

- 无 `hooks/`、`api/` 或 `services/` 分层，请求与状态逻辑集中在页面内
- 无统一常量（如 API 路径、分类列表），分类在 Gallery 与 Admin 等处重复写死
- 组件与页面各自 CSS，无统一 design tokens 或样式规范文档

### 2.2 后端

- 无 `controllers/`，路由内直接写业务逻辑，不利于复用与测试
- 缺少请求体校验层（validators），参数校验分散在 route 中
- SQL 仅单文件 schema.sql，无迁移版本管理，与代码中使用的字段（thumbnail_url、preview_url、app_settings）不一致

### 2.3 共享与规范

- 前后端对「分类」等枚举各自写死，未统一
- 无 CONTRIBUTING、无集中 API 文档入口、无统一错误码约定

---

## 三、改进计划（分阶段）

### 阶段 1：数据与接口一致性（优先）

1. **数据库**
   - 在 server/sql/schema.sql 中为 photos 增加 thumbnail_url、preview_url（或单独迁移文件）
   - 新增 app_settings 表（config_key, config_value, updated_at），并在文档中说明初始化
2. **API**
   - 新增 GET /api/photos/:id（可对未登录用户只读已审核）
   - 修复管理端提交使用 oss_key（来自上传返回的 key）
3. **前端**
   - 照片详情页改为请求 GET /api/photos/:id，统一字段映射（含 tags、location、date）
   - 图库：若需公开访问，后端对「仅查 approved」的列表放宽认证或单独公开路由

### 阶段 2：前端结构

1. **目录**
   - 增加 src/api/：按资源封装 photos.js、auth.js、config.js，内部调用 apiClient
   - 增加 src/constants/：如 categories.js、routes.js
   - 可选 src/hooks/：如 usePhotos、useAuth，把请求与状态从页面抽离
2. **样式**
   - 将全局变量（主题色等）集中到 index.css 或 theme.css，组件尽量使用变量；可选建立简单 design tokens 文档

### 阶段 3：后端结构

1. **分层**
   - 增加 server/src/controllers/：如 photoController.js，从 route 接收 req/res，调 service，返回 JSON
   - 路由只做「解析参数 → controller → 捕获异常」
2. **校验**
   - 对 POST /api/photos、POST /api/auth/login 等做请求体校验（如 joi/express-validator），在 controller 或 middleware 中统一返回 400
3. **SQL**
   - 采用按日期或序号的迁移文件（如 sql/migrations/001_add_photo_urls.sql），便于多环境一致

### 阶段 4：发现页与配置

1. **发现页**
   - 后端提供「按地点聚合」接口（如按 city/country 统计数量）
   - 发现页与地图组件从该接口和 GET /api/photos 取数，替换硬编码 locations 与 photoMarkers
2. **配置**
   - 前端所有 API 请求（含 /api/config/public）走统一 baseURL（如 apiClient 的 API_BASE），避免生产环境路径错误

### 阶段 5：长期

- 引入 ESLint/Prettier 与测试框架；编写 README/QUICK_START 中提到的 API 文档入口；考虑错误码与多语言键的统一

---

## 四、建议的目标目录形态

```
src/
├── api/           # photos, auth, config 等封装
├── components/
├── constants/     # categories, routes
├── hooks/         # 可选：usePhotos, useAuth
├── pages/
└── utils/

server/src/
├── config/
├── controllers/   # 新增
├── middleware/
├── routes/        # 薄层，调 controller
├── services/
└── validators/    # 可选
server/sql/
├── schema.sql     # 与代码一致
└── migrations/    # 可选
```

---

## 五、总结

- **现状**：前端请求与状态集中在页面；后端路由直接写业务；Schema 与代码不一致；发现与详情使用静态数据。
- **建议顺序**：先补齐数据库与单照 API、修正上传字段（阶段 1）；再抽离前端 api/constants、后端 controller/校验（阶段 2–3）；最后做迁移与测试、文档规范（阶段 4–5）。

按阶段推进可在不破坏现有使用的前提下，逐步提升一致性和可维护性。
