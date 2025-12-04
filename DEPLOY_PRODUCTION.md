# 生产环境部署完整指南

## 部署架构

```
GitHub Pages (前端)
    ↓
后端服务器 (Railway/Render/Fly.io)
    ↓
阿里云 OSS (图片存储)
    ↓
Supabase (数据库)
```

---

## 第一步：部署后端服务器

### 推荐平台选择

#### 🥇 首选：Railway（最简单，推荐）
- 免费额度：每月 $5（通常足够使用）
- 难度：⭐ 最简单
- 休眠：无休眠，持续运行

#### 🥈 备选：Cyclic（完全免费）
- 免费额度：无限制
- 难度：⭐ 简单
- 休眠：无休眠

#### 🥉 备选：Render（稳定）
- 免费额度：免费计划
- 难度：⭐⭐ 中等
- 休眠：15分钟无请求会休眠

**详细对比请查看**：[server/FREE_PLATFORMS.md](./server/FREE_PLATFORMS.md)

---

### 选项 1：Railway（推荐）

#### 1. 准备部署

1. **确保代码已推送到 GitHub**
   ```bash
   git add .
   git commit -m "准备生产部署"
   git push
   ```

2. **访问 Railway**
   - 打开 https://railway.app
   - 使用 GitHub 账号登录

#### 2. 创建项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择您的仓库（Pic4Pick）

#### 3. 配置部署

1. **设置根目录**
   - 点击项目 → Settings → Source
   - Root Directory: `server`

2. **设置启动命令**
   - 在 Settings → Deploy → Start Command
   - 输入：`npm start`

#### 4. 配置环境变量

在项目 Settings → Variables 中添加：

```env
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://pic.rlzhao.com

ALIYUN_OSS_REGION=cn-beijing
ALIYUN_OSS_BUCKET=pic4pick
ALIYUN_OSS_ACCESS_KEY_ID=你的AccessKey ID
ALIYUN_OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
```

⚠️ **重要**：
- 将 `CORS_ORIGIN` 替换为您的 GitHub Pages 域名
- 将 OSS 配置替换为您的实际值

#### 5. 获取后端 URL

部署完成后，Railway 会提供一个 URL，例如：
```
https://pic4pick-backend.up.railway.app
```

您的后端 API 地址就是：
```
https://pic4pick-backend.up.railway.app/api/upload/oss
```

#### 6. 测试后端

在浏览器访问：
```
https://pic4pick-backend.up.railway.app/api/health
```

应该返回：`{"status":"ok"}`

---

## 第二步：配置前端

### 方式 1：通过管理面板配置（推荐）

1. **部署前端到 GitHub Pages**
   ```bash
   npm run build
   # 将 dist 目录的内容推送到 gh-pages 分支
   ```

2. **访问管理面板**
   - 打开您的 GitHub Pages 网站
   - 进入管理面板（Admin Panel）

3. **配置后端 URL**
   - 切换到"配置"标签页
   - 找到"阿里云 OSS 后端配置"
   - 输入后端地址：`https://pic4pick-backend.up.railway.app/api/upload/oss`
   - 点击"保存配置"
   - 刷新页面

### 方式 2：通过浏览器控制台配置

在浏览器控制台执行：

```javascript
// 配置后端 URL
localStorage.setItem('aliyun_oss_backend_url', 'https://pic4pick-backend.up.railway.app/api/upload/oss');

// 刷新页面
location.reload();
```

---

## 第三步：验证部署

### 1. 测试上传功能

1. 打开管理面板
2. 选择一张图片上传
3. 检查：
   - ✅ 上传进度条正常显示
   - ✅ 上传成功后显示 OSS URL
   - ✅ 图片在 Supabase 数据库中有记录

### 2. 检查后端日志

在 Railway Dashboard：
- 查看 Deployments → Logs
- 确认看到：`✅ 阿里云 OSS 客户端已初始化`
- 确认上传请求正常处理

### 3. 检查 OSS

访问阿里云 OSS 控制台：
- 确认文件已上传到 `origin/` 目录
- 确认缩略图已上传到 `ore/` 目录

### 4. 检查数据库

访问 Supabase 控制台：
- 查看 `photos` 表
- 确认记录已创建，`image_url` 字段包含 OSS URL

---

### 选项 2：Cyclic（完全免费）

1. **访问 Cyclic**
   - 打开 https://cyclic.sh
   - 使用 GitHub 账号登录

2. **创建应用**
   - 点击 "New App"
   - 选择 "Deploy from GitHub"
   - 选择您的仓库

3. **配置部署**
   - Root Directory: `server`
   - Start Command: `npm start`

4. **配置环境变量**
   - App Settings → Environment Variables
   - 添加所有必需的环境变量（同上）

5. **获取 URL**
   - 部署完成后：`https://your-app.cyclic.app`
   - API 地址：`https://your-app.cyclic.app/api/upload/oss`

---

### 选项 3：Render（稳定，但会休眠）

1. **访问 Render**
   - 打开 https://render.com
   - 使用 GitHub 账号登录

2. **创建 Web Service**
   - 连接 GitHub 仓库
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **配置环境变量**
   - Environment 标签页添加变量

4. **获取 URL**
   - 部署完成后：`https://your-app.onrender.com`
   - ⚠️ 注意：15分钟无请求会休眠，首次请求会慢

---

### 选项 4：Fly.io（全球边缘部署）

1. **安装 Fly CLI**
   ```bash
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **登录并初始化**
   ```bash
   fly auth login
   cd server
   fly launch
   ```

3. **设置环境变量**
   ```bash
   fly secrets set ALIYUN_OSS_REGION=cn-beijing
   fly secrets set ALIYUN_OSS_BUCKET=pic4pick
   # ... 其他变量
   ```

4. **部署**
   ```bash
   fly deploy
   ```

5. **获取 URL**
   - 部署完成后：`https://your-app.fly.dev`

---

## 其他部署平台

### Render

1. 访问 https://render.com
2. 创建 Web Service
3. 连接 GitHub 仓库
4. 设置：
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. 在 Environment 标签页添加环境变量
6. 获取 URL：`https://your-app.onrender.com`

### Fly.io

1. 安装 Fly CLI
2. 在 `server` 目录下运行：
   ```bash
   fly launch
   ```
3. 设置环境变量：
   ```bash
   fly secrets set ALIYUN_OSS_REGION=cn-beijing
   fly secrets set ALIYUN_OSS_BUCKET=pic4pick
   # ... 其他变量
   ```
4. 部署：
   ```bash
   fly deploy
   ```

---

## 生产环境检查清单

### 后端服务器
- [ ] 已部署到云平台
- [ ] 环境变量已配置（OSS、CORS）
- [ ] 健康检查端点正常（`/api/health`）
- [ ] 上传接口正常（`/api/upload/oss`）
- [ ] CORS 配置正确（允许前端域名）

### 前端
- [ ] 已部署到 GitHub Pages
- [ ] 后端 URL 已配置
- [ ] Supabase 配置已设置
- [ ] 上传功能测试通过

### 阿里云 OSS
- [ ] Bucket 已创建
- [ ] AccessKey 已配置
- [ ] Bucket 权限设置为"公共读"
- [ ] 文件上传测试成功

### Supabase
- [ ] `photos` 表已创建
- [ ] Supabase URL 和 Anon Key 已配置
- [ ] 数据插入测试成功

---

## 常见问题

### Q: 部署后无法上传？

1. **检查后端是否运行**
   - 访问 `/api/health` 端点
   - 查看 Railway/Render 的日志

2. **检查 CORS 配置**
   - 确认 `CORS_ORIGIN` 包含前端域名
   - 检查浏览器控制台是否有 CORS 错误

3. **检查环境变量**
   - 确认 OSS 配置正确
   - 查看后端日志确认 OSS 客户端已初始化

### Q: 上传成功但数据库没有记录？

1. **检查 Supabase 配置**
   - 确认 Supabase URL 和 Anon Key 正确
   - 检查浏览器控制台是否有错误

2. **检查数据库表结构**
   - 确认 `photos` 表已创建
   - 确认字段名称匹配

### Q: 图片无法显示？

1. **检查 OSS URL**
   - 在浏览器中直接打开 OSS URL
   - 确认 Bucket 权限为"公共读"

2. **检查 CDN 配置**
   - 如果使用自定义域名，检查 CDN 配置

---

## 性能优化建议

### 1. 配置 OSS CDN

在阿里云 OSS 控制台：
- 开启 CDN 加速
- 配置自定义域名（可选）
- 设置缓存策略

### 2. 优化图片

后端已自动：
- 根据 EXIF 旋转图片
- 生成缩略图
- 压缩图片质量

### 3. 数据库索引

Supabase 表已包含索引，如需优化可添加：
```sql
CREATE INDEX idx_photos_status_category ON photos(status, category);
```

---

## 监控和维护

### 1. 监控后端日志

- Railway: Dashboard → Deployments → Logs
- Render: Dashboard → Logs
- Fly.io: `fly logs`

### 2. 监控 OSS 使用

- 访问阿里云 OSS 控制台
- 查看存储量和流量使用情况
- 设置告警（可选）

### 3. 监控数据库

- 访问 Supabase Dashboard
- 查看数据库使用情况
- 监控查询性能

---

## 完成！

部署完成后，您的应用应该能够：
- ✅ 上传图片到阿里云 OSS
- ✅ 保存元数据到 Supabase
- ✅ 在前台图库显示照片
- ✅ 在管理面板管理照片

如有问题，请查看：
- [CONFIGURATION_CHECKLIST.md](./CONFIGURATION_CHECKLIST.md) - 配置检查清单
- [server/DEPLOYMENT_GUIDE.md](./server/DEPLOYMENT_GUIDE.md) - 详细部署指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明

