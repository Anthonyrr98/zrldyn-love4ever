# 后端服务器部署指南

## 如何获取后端服务器地址

后端服务器需要部署到云端才能让 GitHub Pages 访问。以下是几种常见的部署方式：

---

## 方式 1：使用免费云平台（推荐新手）

### 选项 A：Railway（推荐，简单易用）

**优点**：免费额度充足，部署简单，自动 HTTPS

**步骤**：

1. **注册账号**
   - 访问 https://railway.app
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择您的仓库

3. **配置部署**
   - Railway 会自动检测 Node.js 项目
   - 设置根目录为 `server`（在 Settings → Source → Root Directory）
   - 设置启动命令：`npm start`

4. **配置环境变量**
   - 在项目 Settings → Variables 中添加：
     ```
     PORT=3002
     NODE_ENV=production
     CORS_ORIGIN=https://pic.rlzhao.com
     ALIYUN_OSS_REGION=oss-cn-hangzhou
     ALIYUN_OSS_BUCKET=your-bucket-name
     ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
     ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
     ```

5. **获取服务器地址**
   - 部署完成后，Railway 会提供一个 URL，例如：`https://your-app-name.up.railway.app`
   - 您的后端 API 地址就是：`https://your-app-name.up.railway.app/api/upload/oss`

---

### 选项 B：Render（免费，但需要信用卡验证）

**步骤**：

1. **注册账号**
   - 访问 https://render.com
   - 使用 GitHub 账号登录

2. **创建 Web Service**
   - 点击 "New" → "Web Service"
   - 连接您的 GitHub 仓库
   - 设置：
     - **Name**: pic4pick-backend
     - **Root Directory**: server
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: Node

3. **配置环境变量**
   - 在 Environment 标签页添加环境变量（同上）

4. **获取服务器地址**
   - Render 会提供：`https://pic4pick-backend.onrender.com`
   - 您的后端 API 地址：`https://pic4pick-backend.onrender.com/api/upload/oss`

---

### 选项 C：Fly.io（免费额度充足）

**步骤**：

1. **安装 Fly CLI**
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **登录 Fly.io**
   ```bash
   fly auth login
   ```

3. **初始化项目**（在 server 目录下）
   ```bash
   cd server
   fly launch
   ```

4. **配置环境变量**
   ```bash
   fly secrets set PORT=3002
   fly secrets set NODE_ENV=production
   fly secrets set CORS_ORIGIN=https://pic.rlzhao.com
   fly secrets set ALIYUN_OSS_REGION=oss-cn-hangzhou
   fly secrets set ALIYUN_OSS_BUCKET=your-bucket-name
   fly secrets set ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
   fly secrets set ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
   ```

5. **部署**
   ```bash
   fly deploy
   ```

6. **获取服务器地址**
   - 部署后会显示：`https://your-app-name.fly.dev`
   - 您的后端 API 地址：`https://your-app-name.fly.dev/api/upload/oss`

---

## 方式 2：使用云服务器（VPS）

如果您有自己的云服务器（如阿里云、腾讯云、AWS 等）：

### 步骤：

1. **连接服务器**
   ```bash
   ssh user@your-server-ip
   ```

2. **安装 Node.js**
   ```bash
   # 使用 nvm 安装（推荐）
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

3. **上传代码**
   ```bash
   # 使用 git clone 或 scp 上传 server 目录
   git clone your-repo-url
   cd Pic4Pick/server
   npm install
   ```

4. **配置环境变量**
   ```bash
   # 创建 .env 文件
   nano .env
   # 添加环境变量（参考上面的配置）
   ```

5. **使用 PM2 运行**
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 启动服务
   pm2 start server-enhanced.js --name pic4pick-backend
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

6. **配置 Nginx 反向代理（可选，推荐）**
   ```nginx
   # /etc/nginx/sites-available/pic4pick-backend
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **配置 SSL（使用 Let's Encrypt）**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

8. **获取服务器地址**
   - 如果使用 IP：`http://your-server-ip:3002/api/upload/oss`
   - 如果配置了域名：`https://api.yourdomain.com/api/upload/oss`

---

## 方式 3：使用 Supabase Edge Functions（已配置）

如果您已经配置了 Supabase，可以使用 Edge Functions：

1. **部署 Edge Function**（参考 `supabase/functions/README.md`）
2. **获取地址**：
   - 格式：`https://your-project-ref.supabase.co/functions/v1/upload-oss`
   - 系统会自动检测并使用

---

## 验证部署

部署完成后，测试服务器是否正常运行：

```bash
# 测试健康检查端点
curl https://your-backend-server.com/api/health

# 应该返回：{"status":"ok"}
```

---

## 在前端配置后端地址

部署完成后，在管理面板的"配置"标签页中：

1. 找到"阿里云 OSS 后端配置"
2. 输入您的后端地址，例如：
   - Railway: `https://your-app-name.up.railway.app/api/upload/oss`
   - Render: `https://pic4pick-backend.onrender.com/api/upload/oss`
   - Fly.io: `https://your-app-name.fly.dev/api/upload/oss`
   - 自定义域名: `https://api.yourdomain.com/api/upload/oss`
3. 点击"保存配置"
4. 刷新页面

---

## 推荐方案对比

| 平台 | 免费额度 | 难度 | 推荐度 | 特点 |
|------|---------|------|--------|------|
| Railway | 每月 $5 免费额度 | ⭐ 简单 | ⭐⭐⭐⭐⭐ | 最简单，自动 HTTPS |
| Render | 免费（需信用卡） | ⭐⭐ 中等 | ⭐⭐⭐⭐ | 稳定，15分钟无请求会休眠 |
| Fly.io | 每月 3 个共享 CPU | ⭐⭐⭐ 较难 | ⭐⭐⭐⭐ | 全球边缘部署，速度快 |
| Vercel | 免费（Serverless） | ⭐⭐ 中等 | ⭐⭐⭐ | 适合 Serverless 函数 |
| Netlify | 免费（Serverless） | ⭐⭐ 中等 | ⭐⭐⭐ | 适合 Serverless 函数 |
| Cyclic | 免费 | ⭐⭐ 中等 | ⭐⭐⭐ | 简单，自动部署 |
| Koyeb | 免费 | ⭐⭐ 中等 | ⭐⭐⭐ | 欧洲平台，简单易用 |
| VPS | 需付费 | ⭐⭐⭐⭐ 困难 | ⭐⭐⭐ | 完全控制，需要技术 |

**新手推荐**：Railway、Render 或 Cyclic，部署最简单。

---

### 选项 D：Cyclic（免费，简单）

**优点**：完全免费，部署简单，自动 HTTPS

**步骤**：

1. **注册账号**
   - 访问 https://cyclic.sh
   - 使用 GitHub 账号登录

2. **创建应用**
   - 点击 "New App"
   - 选择 "Deploy from GitHub"
   - 选择您的仓库

3. **配置部署**
   - 设置 Root Directory: `server`
   - 设置 Start Command: `npm start`
   - Cyclic 会自动检测 Node.js

4. **配置环境变量**
   - 在 App Settings → Environment Variables 中添加：
     ```
     PORT=3002
     NODE_ENV=production
     CORS_ORIGIN=https://pic.rlzhao.com
     ALIYUN_OSS_REGION=cn-beijing
     ALIYUN_OSS_BUCKET=your-bucket-name
     ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
     ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
     ```

5. **获取服务器地址**
   - 部署完成后，Cyclic 会提供 URL，例如：`https://your-app.cyclic.app`
   - 您的后端 API 地址：`https://your-app.cyclic.app/api/upload/oss`

---

### 选项 E：Koyeb（免费，欧洲平台）

**优点**：完全免费，全球 CDN，自动 HTTPS

**步骤**：

1. **注册账号**
   - 访问 https://www.koyeb.com
   - 使用 GitHub 账号登录

2. **创建应用**
   - 点击 "Create App"
   - 选择 "GitHub" 作为源
   - 选择您的仓库

3. **配置部署**
   - 设置 Build Command: `cd server && npm install`
   - 设置 Run Command: `cd server && npm start`
   - 设置 Root Directory: `server`

4. **配置环境变量**
   - 在 Environment Variables 中添加（同上）

5. **获取服务器地址**
   - 部署完成后，Koyeb 会提供 URL，例如：`https://your-app.koyeb.app`
   - 您的后端 API 地址：`https://your-app.koyeb.app/api/upload/oss`

---

### 选项 F：Vercel（免费，Serverless）

**注意**：Vercel 主要面向 Serverless 函数，需要将 Express 应用转换为 Serverless 函数。

**优点**：全球 CDN，自动 HTTPS，速度快

**限制**：需要修改代码结构，适合小型 API

**步骤**：

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **创建 `vercel.json`**（在 `server` 目录下）
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server-enhanced.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server-enhanced.js"
       }
     ]
   }
   ```

3. **部署**
   ```bash
   cd server
   vercel
   ```

4. **配置环境变量**
   - 在 Vercel Dashboard → Settings → Environment Variables 中添加

---

### 选项 G：Netlify（免费，Serverless）

**注意**：Netlify 也主要面向 Serverless 函数，需要将 Express 应用转换为 Serverless 函数。

**步骤**：

1. **创建 `netlify.toml`**（在 `server` 目录下）
   ```toml
   [build]
     command = "npm install"
     functions = "netlify/functions"
   
   [[redirects]]
     from = "/*"
     to = "/.netlify/functions/server"
     status = 200
   ```

2. **创建 Serverless 函数包装器**
   - 需要将 Express 应用包装为 Netlify 函数格式

3. **部署**
   - 连接 GitHub 仓库
   - Netlify 会自动部署

---

## 免费平台详细对比

### 完全免费的平台

| 平台 | 免费额度 | 休眠策略 | 推荐场景 |
|------|---------|---------|---------|
| **Cyclic** | 无限制 | 无休眠 | 小型项目，需要持续运行 |
| **Koyeb** | 无限制 | 无休眠 | 需要全球 CDN |
| **Fly.io** | 3 个共享 CPU | 无休眠 | 需要边缘部署 |
| **Render** | 免费 | 15分钟无请求休眠 | 个人项目 |
| **Railway** | $5/月免费额度 | 无休眠 | 推荐首选 |

### Serverless 平台（需要代码改造）

| 平台 | 免费额度 | 限制 | 推荐场景 |
|------|---------|------|---------|
| **Vercel** | 100GB 带宽/月 | 10秒执行时间限制 | 小型 API |
| **Netlify** | 100GB 带宽/月 | 10秒执行时间限制 | 小型 API |

### 推荐选择

1. **首选**：Railway（最简单，免费额度充足）
2. **备选**：Cyclic（完全免费，简单）
3. **备选**：Render（稳定，但会休眠）
4. **高级**：Fly.io（全球边缘，性能好）

---

## 常见问题

### Q: 部署后无法访问？
- 检查环境变量是否正确配置
- 检查服务器日志（Railway/Render 都有日志查看功能）
- 确认 CORS 配置允许您的 GitHub Pages 域名

### Q: 如何查看服务器日志？
- Railway: 项目页面 → Deployments → 点击部署 → 查看 Logs
- Render: Dashboard → 选择服务 → Logs
- Fly.io: `fly logs`

### Q: 如何更新代码？
- 如果使用 GitHub 连接，推送代码后会自动重新部署
- 或者手动触发重新部署

### Q: 免费额度用完了怎么办？
- Railway: 升级到付费计划或使用其他平台
- Render: 免费计划有休眠限制（15分钟无请求会休眠）
- Fly.io: 免费额度通常足够个人使用

---

## 下一步

部署完成后，记得：
1. ✅ 在前端配置后端地址
2. ✅ 测试上传功能
3. ✅ 检查 CORS 配置（确保允许 GitHub Pages 域名）
4. ✅ 设置监控（可选，使用平台自带的监控功能）

