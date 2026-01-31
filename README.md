# Pic4Pick - 照片分享网站

一个基于 React 的现代化照片分享平台，支持照片展示、地图发现和上传管理功能。

## 功能特性

- 📸 **照片画廊** - 网格布局展示照片，支持分类筛选（最新、精选、随览、附近、远方）
- 🗺️ **地图发现** - 基于地理位置的照片浏览，左侧位置导航，右侧地图展示
- 📤 **上传管理** - 完整的照片上传和管理界面，包含作品信息和相机参数表单
- 🎨 **现代化UI** - 简洁美观的用户界面设计

## 技术栈

**前端：**
- React 18
- React Router DOM
- Vite
- CSS3（玻璃质感 UI）

**后端：**
- Node.js + Express
- MySQL / MariaDB
- JWT 认证
- 阿里云 OSS（可选）

## 快速开始

### 完整启动（前端 + 后端）

**详细步骤请查看 [QUICK_START.md](./QUICK_START.md)**

#### 1. 安装依赖

```bash
# 前端
npm install

# 后端
cd server
npm install
cd ..
```

#### 2. 配置数据库

创建 MySQL 数据库并导入表结构：

```bash
mysql -u root -p pic4pick < server/sql/schema.sql
```

#### 3. 配置环境变量

- **后端**：编辑 `server/.env`，修改数据库连接信息
- **前端**：编辑 `.env`（可选，用于高德地图）

#### 4. 初始化管理员账号

```bash
cd server
npm run init-admin
```

默认账号：`admin` / `admin123`

#### 5. 启动服务

**终端 1 - 后端：**
```bash
cd server
npm run dev
```

**终端 2 - 前端：**
```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # 共享组件
│   ├── pages/              # 页面组件
│   └── utils/              # 工具函数
├── server/                 # 后端服务
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── routes/        # API 路由
│   │   ├── services/       # 业务逻辑
│   │   └── middleware/    # 中间件
│   ├── sql/                # 数据库脚本
│   └── .env                # 环境变量
├── public/                 # 静态资源
└── package.json            # 前端依赖
```

## 页面说明

### 照片画廊 (/)
- 显示照片网格
- 支持分类筛选
- 每个照片卡片显示标题、位置、标签和点赞数

### 地图发现 (/discover)
- 左侧位置导航栏，支持展开/折叠
- 右侧高德地图，显示照片位置标记
- 需配置 `VITE_AMAP_KEY`（见 `.env.example`）

### 上传管理 (/admin)
- **登录认证**：管理员登录保护
- **统计信息**：实时显示作品总数、待审核、已发布数量
- **照片上传**：填写作品信息和相机参数，提交审核
- **审核管理**：待审核列表可进行通过/拒绝操作
- **列表查看**：已审核、已拒绝列表展示

## 地图配置

发现页使用高德地图，需在项目根目录创建 `.env` 并配置：

```
VITE_AMAP_KEY=你的高德地图Key
VITE_AMAP_SECURITY_CODE=你的安全密钥  # 2021年12月后申请的 Key 需配置
```

Key 申请地址：https://lbs.amap.com/dev/key/app

## 后端 API

后端服务运行在 `http://localhost:3000`，提供以下 API：

- `POST /api/auth/login` - 管理员登录
- `GET /api/photos` - 获取照片列表（支持 status/category/keyword 筛选）
- `POST /api/photos` - 创建照片记录
- `POST /api/photos/:id/approve` - 审核通过
- `POST /api/photos/:id/reject` - 审核拒绝
- `GET /api/photos/stats` - 获取统计数据

详细 API 文档见 `server/README.md`

## 部署

- **前端部署**：运行 `npm run build`，将 `dist/` 目录部署到静态服务器
- **后端部署**：参考 `server/DEPLOYMENT.md`（宝塔面板 + PM2 + Nginx）

## 许可证

MIT
