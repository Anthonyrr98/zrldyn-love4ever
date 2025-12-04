# 前端直传到阿里云 OSS 使用指南

## ✅ 已实现功能

前端直传的 OSS 签名功能已经实现！现在可以直接从前端上传到阿里云 OSS，无需后端服务器。

## ⚠️ 安全警告

**重要**：前端直传会将 AccessKey 暴露在浏览器中，任何人都可以在浏览器开发者工具中查看。**生产环境强烈不推荐使用！**

**推荐方案**：
- ✅ 使用后端代理上传（默认，更安全）
- ✅ 使用 STS 临时凭证（如果必须前端直传）

## 如何启用前端直传

### 方式 1：通过浏览器控制台

在浏览器控制台执行：

```javascript
// 启用前端直传
localStorage.setItem('aliyun_oss_use_backend', 'false');

// 刷新页面
location.reload();
```

### 方式 2：切换回后端模式

```javascript
// 使用后端代理（默认，推荐）
localStorage.setItem('aliyun_oss_use_backend', 'true');
// 或删除配置（默认就是 true）
localStorage.removeItem('aliyun_oss_use_backend');

// 刷新页面
location.reload();
```

## 必需配置

在管理面板 → 配置中设置以下信息：

1. **阿里云 OSS 地域**：例如 `oss-cn-hangzhou` 或 `cn-hangzhou`（会自动添加 `oss-` 前缀）
2. **Bucket 名称**：您的 OSS Bucket 名称
3. **AccessKey ID**：您的阿里云 AccessKey ID
4. **AccessKey Secret**：您的阿里云 AccessKey Secret

## 功能特性

### ✅ 已实现

- ✅ OSS 签名计算（HMAC-SHA1）
- ✅ 自动处理 Region 格式
- ✅ 上传进度跟踪
- ✅ 错误处理和提示
- ✅ 支持大文件上传（5分钟超时）

### ⚠️ 限制

- ❌ 不生成缩略图（需要后端处理）
- ❌ 不进行图片优化（需要后端处理）
- ❌ AccessKey 暴露在前端（安全风险）

## 工作原理

1. **生成签名**
   - 使用 Web Crypto API 计算 HMAC-SHA1 签名
   - 构建 OSS 签名字符串
   - 添加到 Authorization 头部

2. **上传文件**
   - 使用 XMLHttpRequest 上传（支持进度跟踪）
   - 设置必要的请求头（Content-Type, Date, Authorization, x-oss-object-acl）
   - 直接 PUT 到 OSS

3. **处理响应**
   - 成功：返回 OSS URL
   - 失败：解析错误信息并提示

## 测试

### 1. 启用前端直传

```javascript
localStorage.setItem('aliyun_oss_use_backend', 'false');
location.reload();
```

### 2. 配置 OSS 信息

在管理面板中配置 OSS 信息。

### 3. 上传测试

上传一张图片，检查：
- ✅ 上传进度条正常显示
- ✅ 上传成功后显示 OSS URL
- ✅ 浏览器控制台无错误

### 4. 验证上传

- 访问返回的 OSS URL，确认图片可以访问
- 在阿里云 OSS 控制台确认文件已上传

## 常见问题

### Q: 上传失败，提示签名错误？

1. **检查 AccessKey**
   - 确认 AccessKey ID 和 Secret 正确
   - 确认没有多余的空格

2. **检查 Region**
   - 确认 Region 格式正确
   - 代码会自动添加 `oss-` 前缀

3. **检查 Bucket 名称**
   - 确认 Bucket 名称正确
   - 确认 Bucket 存在

### Q: 上传失败，提示 CORS 错误？

需要在 OSS 控制台配置 CORS：

1. 进入 OSS 控制台
2. 选择您的 Bucket
3. 点击"跨域设置"
4. 添加规则：
   - **来源**：`*` 或您的 GitHub Pages 域名
   - **允许 Methods**：`PUT`, `POST`, `GET`, `HEAD`
   - **允许 Headers**：`*`
   - **暴露 Headers**：`ETag`, `x-oss-request-id`
   - **缓存时间**：`3600`

### Q: 上传失败，提示 403 Forbidden？

1. **检查 Bucket 权限**
   - 确认 Bucket 允许 PUT 操作
   - 确认 AccessKey 有权限

2. **检查对象 ACL**
   - 代码中设置为 `public-read`
   - 如果 Bucket 不允许设置 ACL，可能需要调整

### Q: 如何查看签名是否正确？

在浏览器控制台查看：
- 打开开发者工具 → Console
- 上传时会显示：`[OSS Signature] String to sign: ...`
- 检查签名字符串格式是否正确

## 代码实现

### 签名算法

使用 `src/utils/ossSignature.js` 中的 `generateOSSPutSignature` 函数：

```javascript
import { generateOSSPutSignature } from './ossSignature';

const { authorization, date } = await generateOSSPutSignature({
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  bucket: 'your-bucket',
  objectKey: 'pic4pick/filename.jpg',
  contentType: 'image/jpeg',
  acl: 'public-read'
});
```

### 上传实现

在 `src/utils/upload.js` 中的 `uploadToAliyunOSS` 函数已实现完整的上传逻辑。

## 安全建议

### 如果必须使用前端直传

1. **使用 STS 临时凭证**（推荐）
   - 后端提供 STS 接口
   - 前端获取临时凭证
   - 临时凭证有时效性，更安全

2. **限制 AccessKey 权限**
   - 创建子账号
   - 只授予必要的 OSS 权限
   - 限制只能访问特定 Bucket

3. **监控使用情况**
   - 定期检查 OSS 使用情况
   - 设置告警（异常访问）

## 对比：前端直传 vs 后端代理

| 特性 | 前端直传 | 后端代理 |
|------|---------|---------|
| **安全性** | ⚠️ AccessKey 暴露 | ✅ AccessKey 安全 |
| **功能** | ❌ 无图片优化 | ✅ 图片优化、缩略图 |
| **部署** | ✅ 无需后端 | ❌ 需要后端服务器 |
| **进度跟踪** | ✅ 支持 | ✅ 支持 |
| **错误处理** | ⚠️ 简单 | ✅ 完善 |
| **推荐场景** | 开发测试 | 生产环境 |

## 总结

前端直传功能已实现，可以正常工作。但**强烈建议生产环境使用后端代理模式**，更安全、功能更完整。

如有问题，请查看：
- [FRONTEND_DIRECT_UPLOAD.md](./FRONTEND_DIRECT_UPLOAD.md) - 详细说明
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明

