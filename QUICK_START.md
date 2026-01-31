# Pic4Pick 快速启动指南

## 前置要求

- Node.js 18+ 
- MySQL 5.7+ 或 MariaDB 10.3+
- npm 或 yarn

## 一键启动（开发环境）

### 1. 安装所有依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

### 2. 配置数据库

#### 快速方式（使用默认配置）

1. 确保 MySQL 正在运行
2. 创建数据库：
   ```sql
   CREATE DATABASE pic4pick CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. 导入表结构：
   ```bash
   mysql -u root -p pic4pick < server/sql/schema.sql
   ```

#### 使用宝塔面板

1. 在宝塔「数据库」中创建数据库 `pic4pick`
2. 在「phpMyAdmin」中导入 `server/sql/schema.sql`

### 3. 配置后端环境变量

编辑 `server/.env`，修改数据库连接信息：

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root          # 你的 MySQL 用户名
DB_PASSWORD=          # 你的 MySQL 密码（如果没有密码留空）
DB_NAME=pic4pick

JWT_SECRET=pic4pick_dev_secret_change_in_production_2026
```

### 4. 初始化管理员账号

```bash
cd server
npm run init-admin
```

默认账号：
- 用户名：`admin`
- 密码：`admin123`

⚠️ **生产环境请务必修改密码！**

### 5. 启动服务

**终端 1 - 启动后端：**
```bash
cd server
npm run dev
```

后端运行在：http://localhost:3000

**终端 2 - 启动前端：**
```bash
npm run dev
```

前端运行在：http://localhost:5173

### 6. 访问应用

- **前端首页**：http://localhost:5173/
- **管理后台**：http://localhost:5173/admin
  - 用户名：`admin`
  - 密码：`admin123`

## 功能测试

1. **健康检查**：访问 http://localhost:3000/api/health
   - 应返回：`{"status":"ok","db":"ok"}`

2. **登录测试**：
   - 访问 http://localhost:5173/admin
   - 输入用户名 `admin` 和密码 `admin123`
   - 登录成功后可以看到管理界面

3. **上传照片**：
   - 在「上传作品」标签页填写表单
   - 图片地址可以临时填写一个图片 URL（如：`https://images.unsplash.com/photo-xxx`）
   - 提交后照片会出现在「待审核」列表

4. **审核照片**：
   - 在「待审核」列表中点击「通过」或「拒绝」
   - 通过的照片会出现在「已审核」列表

## 常见问题

### 后端启动失败

1. 检查 MySQL 是否运行：`mysql -u root -p`
2. 检查 `.env` 中的数据库配置是否正确
3. 检查数据库 `pic4pick` 是否已创建
4. 检查表结构是否已导入（运行 `sql/schema.sql`）

### 前端无法连接后端

1. 确保后端服务已启动（http://localhost:3000）
2. 检查浏览器控制台是否有 CORS 错误
3. 确认 `vite.config.js` 中的代理配置正确

### 登录失败

1. 确认已运行 `npm run init-admin` 初始化管理员账号
2. 检查数据库 `users` 表中是否有 `admin` 用户
3. 检查后端日志查看错误信息

## 下一步

- 配置阿里云 OSS（在 `server/.env` 中填写 OSS 配置）
- 配置高德地图 Key（在根目录 `.env` 中填写 `VITE_AMAP_KEY`）
- 部署到生产环境（参考 `server/DEPLOYMENT.md`）
