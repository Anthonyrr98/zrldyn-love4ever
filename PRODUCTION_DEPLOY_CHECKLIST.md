# 生产环境部署检查清单

## 🚀 快速部署步骤

### 第一步：部署后端服务器（Cyclic - 完全免费）

#### 1. 准备
- [ ] 代码已推送到 GitHub
- [ ] 已注册 Cyclic 账号（https://cyclic.sh）

#### 2. 创建应用
- [ ] 在 Cyclic 创建新应用
- [ ] 连接 GitHub 仓库
- [ ] 设置 Root Directory: `server`
- [ ] 设置 Start Command: `npm start`

#### 3. 配置环境变量

在 Cyclic Environment Variables 中添加：

```env
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://pic.rlzhao.com

ALIYUN_OSS_REGION=cn-beijing
ALIYUN_OSS_BUCKET=pic4pick
ALIYUN_OSS_ACCESS_KEY_ID=你的AccessKey ID
ALIYUN_OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
```

- [ ] PORT 已设置
- [ ] NODE_ENV 设置为 production
- [ ] CORS_ORIGIN 设置为您的 GitHub Pages 域名
- [ ] ALIYUN_OSS_REGION 已设置
- [ ] ALIYUN_OSS_BUCKET 已设置
- [ ] ALIYUN_OSS_ACCESS_KEY_ID 已设置
- [ ] ALIYUN_OSS_ACCESS_KEY_SECRET 已设置

#### 4. 获取后端 URL
- [ ] 部署完成后，记录后端 URL（例如：`https://xxx.cyclic.app`）
- [ ] 测试健康检查：`https://xxx.cyclic.app/api/health`
- [ ] 确认返回：`{"status":"ok"}`

---

### 第二步：部署前端（GitHub Pages）

#### 1. 构建前端
- [ ] 运行 `npm run build`
- [ ] 确认 `dist` 目录已生成

#### 2. 部署到 GitHub Pages
- [ ] 将 `dist` 目录内容推送到 `gh-pages` 分支
- [ ] 或在 GitHub Settings → Pages 中配置构建

#### 3. 配置前端连接后端
- [ ] 访问 GitHub Pages 网站
- [ ] 进入管理面板
- [ ] 配置 → 阿里云 OSS 后端配置
- [ ] 输入后端 URL：`https://xxx.up.railway.app/api/upload/oss`
- [ ] 保存配置
- [ ] 刷新页面

---

### 第三步：验证部署

#### 1. 测试后端
- [ ] 访问 `/api/health` 返回正常
- [ ] 查看 Railway 日志，确认 OSS 客户端已初始化
- [ ] 日志显示：`✅ 阿里云 OSS 客户端已初始化`

#### 2. 测试上传
- [ ] 在管理面板上传一张测试图片
- [ ] 上传进度条正常显示
- [ ] 上传成功后显示 OSS URL
- [ ] 浏览器控制台无错误

#### 3. 检查 OSS
- [ ] 访问阿里云 OSS 控制台
- [ ] 确认文件已上传到 `origin/` 目录
- [ ] 确认缩略图已上传到 `ore/` 目录

#### 4. 检查数据库
- [ ] 访问 Supabase 控制台
- [ ] 查看 `photos` 表
- [ ] 确认新记录已创建
- [ ] 确认 `image_url` 字段包含正确的 OSS URL

---

## 📋 配置信息记录

### 后端服务器
- Cyclic URL: `___________________________`
- API 地址: `___________________________/api/upload/oss`

### 前端
- GitHub Pages URL: `___________________________`
- 后端配置状态: `___________________________`

### 阿里云 OSS
- Region: `___________________________`
- Bucket: `___________________________`
- AccessKey ID: `___________________________` (已配置)

### Supabase
- Project URL: `___________________________`
- Anon Key: `___________________________` (已配置)

---

## ⚠️ 重要提醒

1. **CORS 配置**
   - 确保 `CORS_ORIGIN` 设置为您的 GitHub Pages 域名
   - 不要使用 `*`（生产环境不安全）

2. **环境变量安全**
   - 不要在代码中硬编码 AccessKey
   - 使用环境变量存储敏感信息
   - Railway 的环境变量是加密存储的

3. **监控**
   - 定期检查 Railway 日志
   - 监控 OSS 存储和流量使用
   - 监控 Supabase 数据库使用情况

---

## 🆘 遇到问题？

### 后端无法访问
- 检查 Cyclic 部署状态
- 查看 Cyclic 日志（Dashboard → Logs）
- 确认环境变量已正确设置

### CORS 错误
- 检查 `CORS_ORIGIN` 环境变量
- 确认包含完整的前端域名（包括 `https://`）

### 上传失败
- 检查 OSS 配置是否正确
- 查看后端日志确认错误信息
- 检查 OSS Bucket 权限

### 数据库无记录
- 检查 Supabase 配置
- 查看浏览器控制台错误
- 确认表结构正确

---

## ✅ 部署完成

完成所有检查项后，您的应用已成功部署到生产环境！

详细文档：
- [DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md) - 完整部署指南
- [CONFIGURATION_CHECKLIST.md](./CONFIGURATION_CHECKLIST.md) - 配置检查清单
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明

