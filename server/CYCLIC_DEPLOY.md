# Cyclic 部署完整指南

## Cyclic 简介

Cyclic 是一个完全免费的后端部署平台，无需信用卡，无休眠，非常适合个人项目。

**优点**：
- ✅ 完全免费，无限制
- ✅ 无休眠，持续运行
- ✅ 自动 HTTPS
- ✅ 自动部署（GitHub 集成）
- ✅ 简单易用

---

## 部署步骤

### 第一步：准备代码

确保代码已推送到 GitHub：

```bash
git add .
git commit -m "准备部署到 Cyclic"
git push
```

### 第二步：注册 Cyclic

1. **访问 Cyclic**
   - 打开 https://cyclic.sh
   - 点击 "Sign Up" 或 "Get Started"

2. **使用 GitHub 登录**
   - 选择 "Sign in with GitHub"
   - 授权 Cyclic 访问您的 GitHub 仓库

### 第三步：创建应用

1. **创建新应用**
   - 登录后，点击 "New App"
   - 选择 "Deploy from GitHub"

2. **选择仓库**
   - 在仓库列表中找到 `Pic4Pick`（或您的仓库名）
   - 点击 "Connect"

3. **配置应用**
   - App Name: `pic4pick-backend`（或您喜欢的名称）
   - Branch: `main`（或您的主分支）

### 第四步：配置部署设置

1. **设置根目录**
   - 在应用设置中找到 "Root Directory"
   - 设置为：`server`

2. **设置启动命令**
   - 在应用设置中找到 "Start Command"
   - 设置为：`npm start`

3. **设置构建命令**（如果需要）
   - Build Command: `npm install`
   - 或者留空（Cyclic 会自动运行 `npm install`）

### 第五步：配置环境变量

1. **进入环境变量设置**
   - 在应用 Dashboard 中
   - 点击 "Environment Variables" 或 "Env Vars"

2. **添加以下环境变量**

点击 "Add Variable" 逐个添加：

```env
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://pic.rlzhao.com

ALIYUN_OSS_REGION=cn-beijing
ALIYUN_OSS_BUCKET=pic4pick
ALIYUN_OSS_ACCESS_KEY_ID=你的AccessKey ID
ALIYUN_OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
```

**重要提示**：
- 将 `CORS_ORIGIN` 替换为您的 GitHub Pages 域名
- 将 OSS 配置替换为您的实际值
- 每个变量添加后点击 "Save"

### 第六步：部署

1. **自动部署**
   - Cyclic 会自动检测到代码推送
   - 开始构建和部署

2. **查看部署日志**
   - 在 Dashboard 中查看 "Deployments"
   - 点击最新的部署查看日志
   - 等待部署完成（通常 2-5 分钟）

3. **确认部署成功**
   - 日志中应该看到：
     ```
     ✅ 阿里云 OSS 客户端已初始化
     🚀 服务器运行在 http://0.0.0.0:3002
     ```

### 第七步：获取后端 URL

1. **查看应用 URL**
   - 部署完成后，在 Dashboard 顶部会显示应用 URL
   - 格式：`https://your-app-name.cyclic.app`

2. **记录 API 地址**
   - 您的后端 API 地址：`https://your-app-name.cyclic.app/api/upload/oss`
   - 健康检查地址：`https://your-app-name.cyclic.app/api/health`

### 第八步：测试后端

1. **测试健康检查**
   - 在浏览器访问：`https://your-app-name.cyclic.app/api/health`
   - 应该返回：`{"status":"ok"}`

2. **查看日志**
   - 在 Cyclic Dashboard → Logs
   - 确认没有错误信息

---

## 配置前端连接后端

### 方式 1：通过管理面板配置（推荐）

1. **访问您的 GitHub Pages 网站**
   - 打开管理面板

2. **配置后端 URL**
   - 切换到"配置"标签页
   - 找到"阿里云 OSS 后端配置"
   - 输入：`https://your-app-name.cyclic.app/api/upload/oss`
   - 点击"保存配置"
   - 刷新页面

### 方式 2：通过浏览器控制台

在浏览器控制台执行：

```javascript
localStorage.setItem('aliyun_oss_backend_url', 'https://your-app-name.cyclic.app/api/upload/oss');
location.reload();
```

---

## 验证部署

### 1. 测试上传功能

1. 打开管理面板
2. 上传一张测试图片
3. 检查：
   - ✅ 上传进度条正常显示
   - ✅ 上传成功后显示 OSS URL
   - ✅ 浏览器控制台无错误

### 2. 检查后端日志

在 Cyclic Dashboard → Logs：
- 确认看到上传请求日志
- 确认 OSS 上传成功

### 3. 检查 OSS

访问阿里云 OSS 控制台：
- 确认文件已上传

### 4. 检查数据库

访问 Supabase 控制台：
- 确认新记录已创建

---

## 常见问题

### Q: 部署失败？

1. **检查日志**
   - 在 Cyclic Dashboard → Deployments → 查看错误日志

2. **检查环境变量**
   - 确认所有环境变量已正确设置
   - 确认没有拼写错误

3. **检查代码**
   - 确认 `server/package.json` 存在
   - 确认 `server/server-enhanced.js` 存在

### Q: 环境变量不生效？

1. **重新部署**
   - 修改环境变量后，Cyclic 会自动重新部署
   - 等待部署完成

2. **检查变量名**
   - 确认变量名完全正确（大小写敏感）
   - 确认没有多余的空格

### Q: CORS 错误？

1. **检查 CORS_ORIGIN**
   - 确认设置为完整的前端域名（包括 `https://`）
   - 例如：`https://pic.rlzhao.com`

2. **检查前端配置**
   - 确认前端已配置后端 URL

### Q: 上传失败？

1. **检查 OSS 配置**
   - 确认环境变量中的 OSS 配置正确
   - 查看后端日志确认 OSS 客户端已初始化

2. **检查网络**
   - 确认 Cyclic 可以访问阿里云 OSS
   - 检查 OSS Bucket 权限

---

## 更新代码

Cyclic 支持自动部署：

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "更新代码"
   git push
   ```

2. **Cyclic 自动部署**
   - Cyclic 会自动检测到代码更新
   - 自动重新构建和部署
   - 在 Dashboard 中可以看到部署进度

---

## 监控和维护

### 查看日志

- 在 Cyclic Dashboard → Logs
- 可以实时查看应用日志
- 可以搜索和过滤日志

### 查看使用情况

- Cyclic 完全免费，无使用限制
- 无需担心超出额度

### 重启应用

- 在 Dashboard 中可以手动重启应用
- 通常不需要手动重启

---

## 完成！

部署完成后，您的后端服务器应该：
- ✅ 正常运行在 Cyclic
- ✅ 可以处理上传请求
- ✅ 自动 HTTPS
- ✅ 无休眠，持续运行

**下一步**：
1. 配置前端连接后端
2. 测试上传功能
3. 开始使用！

如有问题，请查看 Cyclic 文档：https://docs.cyclic.sh

