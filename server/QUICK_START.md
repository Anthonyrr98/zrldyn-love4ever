# 后端服务器快速配置指南

## 必需配置：阿里云 OSS

后端服务器需要配置阿里云 OSS 才能上传图片。

### 步骤 1：创建 `.env` 文件

在 `server` 目录下创建 `.env` 文件：

```bash
cd server
```

创建 `.env` 文件，添加以下内容：

```env
# 阿里云 OSS 配置（必需）
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret

# 服务器配置（可选，有默认值）
PORT=3002
NODE_ENV=production

# CORS 配置（生产环境建议设置）
CORS_ORIGIN=https://pic.rlzhao.com
```

### 步骤 2：获取阿里云 OSS 配置信息

1. **Region（地域）**
   - 在阿里云 OSS 控制台查看您的 Bucket 所在地域
   - 例如：`oss-cn-hangzhou`、`oss-cn-beijing`
   - ⚠️ 注意：代码会自动添加 `oss-` 前缀，所以输入 `cn-hangzhou` 也可以

2. **Bucket 名称**
   - 在 OSS 控制台查看您的 Bucket 名称

3. **AccessKey**
   - 访问：https://ram.console.aliyun.com/manage/ak
   - 创建 AccessKey 或使用现有的
   - 记录 AccessKey ID 和 AccessKey Secret

### 步骤 3：检查配置

运行配置检查脚本：

```bash
cd server
node check-config.js
```

这会显示：
- ✅ 哪些配置已设置
- ⚠️ 哪些配置缺失
- 💡 配置建议

### 步骤 4：测试服务器

启动服务器：

```bash
npm start
```

如果看到以下信息，说明配置成功：

```
✅ 阿里云 OSS 客户端已初始化 (Region: oss-cn-hangzhou, Bucket: your-bucket-name)
🚀 服务器运行在 http://0.0.0.0:3002
```

### 步骤 5：测试上传接口

在浏览器中访问：

```
http://localhost:3002/api/health
```

应该返回：`{"status":"ok"}`

---

## 部署到云平台时的配置

如果部署到 Railway、Render、Fly.io 等平台：

### 不需要创建 `.env` 文件

直接在平台的环境变量设置中添加：

```
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://pic.rlzhao.com
```

平台会自动读取这些环境变量。

---

## 配置说明

### 必需配置

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `ALIYUN_OSS_REGION` | OSS 地域 | `oss-cn-hangzhou` |
| `ALIYUN_OSS_BUCKET` | Bucket 名称 | `pic4pick-images` |
| `ALIYUN_OSS_ACCESS_KEY_ID` | AccessKey ID | `LTAI5t...` |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | AccessKey Secret | `xxx...` |

### 可选配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `PORT` | `3002` | 服务器端口 |
| `NODE_ENV` | 未设置 | `production` 或 `development` |
| `CORS_ORIGIN` | `*` | 允许的 CORS 来源（生产环境建议设置） |
| `JWT_SECRET` | 默认值 | JWT 密钥（如果使用认证） |

---

## 常见问题

### Q: 配置后仍然提示"OSS 客户端未配置"？

1. 检查 `.env` 文件是否在 `server` 目录下
2. 检查环境变量名称是否正确（注意大小写）
3. 检查是否有拼写错误
4. 重启服务器（修改 `.env` 后需要重启）

### Q: 本地测试可以，部署后不行？

- 检查部署平台的环境变量是否已设置
- 检查环境变量名称是否正确
- 查看部署平台的日志，确认服务器启动信息

### Q: 如何验证配置是否正确？

运行配置检查脚本：

```bash
node check-config.js
```

或直接启动服务器，查看启动日志中是否有：

```
✅ 阿里云 OSS 客户端已初始化
```

---

## 下一步

配置完成后：

1. ✅ 启动服务器：`npm start`
2. ✅ 在前端配置后端 URL（管理面板 → 配置 → 阿里云 OSS 后端配置）
3. ✅ 测试上传功能

详细部署指南请查看：[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

