# 前端直传到阿里云 OSS（无需后端）

## 当前状态

代码中**已经支持前端直传**，但默认使用后端代理模式（更安全）。

## 为什么默认使用后端？

1. **安全性**：前端直传需要暴露 AccessKey，存在安全风险
2. **功能完整**：后端可以处理图片优化、缩略图生成等
3. **错误处理**：后端可以更好地处理错误和日志

## 如何启用前端直传？

### 方式 1：通过浏览器控制台

在浏览器控制台执行：

```javascript
// 启用前端直传
localStorage.setItem('aliyun_oss_use_backend', 'false');

// 刷新页面
location.reload();
```

### 方式 2：在管理面板配置（需要添加配置项）

目前管理面板还没有这个配置项，可以通过控制台设置。

## 前端直传的要求

### 必需配置

前端直传需要以下配置（在管理面板 → 配置中设置）：

1. **阿里云 OSS 地域**：`oss-cn-hangzhou` 等
2. **Bucket 名称**：您的 OSS Bucket 名称
3. **AccessKey ID**：您的阿里云 AccessKey ID
4. **AccessKey Secret**：您的阿里云 AccessKey Secret

⚠️ **安全警告**：
- AccessKey 会暴露在前端代码中
- 任何人都可以在浏览器中查看
- 建议使用 STS 临时凭证（更安全）

## 当前实现的问题

当前的前端直传代码**没有实现 OSS 签名**，直接上传会失败。

OSS 需要签名才能上传，有两种方式：

### 方式 1：使用 STS 临时凭证（推荐）

1. **后端提供 STS 接口**（获取临时凭证）
2. **前端使用临时凭证上传**
3. **临时凭证有时效性，更安全**

### 方式 2：实现 OSS 签名（不推荐）

1. **前端计算 OSS 签名**
2. **需要 AccessKey Secret**
3. **存在安全风险**

## 推荐方案

### 方案 1：使用后端代理（当前默认，推荐）

- ✅ 安全
- ✅ 功能完整
- ✅ 支持图片优化

### 方案 2：使用 STS 临时凭证（如果必须前端直传）

需要：
1. 后端提供 STS 接口
2. 前端获取临时凭证
3. 使用临时凭证上传

### 方案 3：使用阿里云 OSS 的 PostObject（如果必须前端直传）

OSS 支持 PostObject 方式，前端可以生成签名后上传。

## 如果您之前可以前端直传

可能的原因：

1. **使用了 STS 临时凭证**
   - 后端提供临时凭证接口
   - 前端使用临时凭证上传

2. **实现了 OSS 签名**
   - 前端代码中有签名计算逻辑
   - 使用 AccessKey Secret 计算签名

3. **使用了其他方式**
   - 例如：预签名 URL
   - 或者：PostObject 方式

## 建议

**推荐继续使用后端代理模式**，因为：
- ✅ 更安全（不暴露 AccessKey）
- ✅ 功能更完整（图片优化、缩略图）
- ✅ 更容易维护

如果确实需要前端直传，建议：
1. 实现 STS 临时凭证接口
2. 或使用 OSS 的 PostObject 方式

## 检查当前配置

在浏览器控制台执行：

```javascript
// 检查是否使用后端
console.log('使用后端:', localStorage.getItem('aliyun_oss_use_backend'));

// 检查 OSS 配置
console.log('Region:', localStorage.getItem('aliyun_oss_region'));
console.log('Bucket:', localStorage.getItem('aliyun_oss_bucket'));
console.log('AccessKey ID:', localStorage.getItem('aliyun_oss_access_key_id') ? '已设置' : '未设置');
```

## 切换回后端模式

如果启用了前端直传，想切换回后端：

```javascript
// 启用后端代理（默认）
localStorage.setItem('aliyun_oss_use_backend', 'true');
// 或删除这个配置项（默认就是 true）
localStorage.removeItem('aliyun_oss_use_backend');

// 刷新页面
location.reload();
```

