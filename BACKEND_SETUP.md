# 后端服务器配置指南

## 使用现有的 Node.js 后端

### 1. 启动后端服务器

在项目根目录下，进入 `server` 目录并启动服务器：

```bash
cd server
npm install  # 如果还没有安装依赖
npm start    # 或 node server-enhanced.js
```

服务器默认运行在 `http://localhost:3002`

### 2. 配置前端连接后端

有两种方式配置后端 URL：

#### 方式 1：通过管理面板配置（推荐）

1. 打开应用的管理面板（Admin Panel）
2. 切换到"配置"标签页
3. 找到"阿里云 OSS 后端配置"部分
4. 输入后端服务器 URL，例如：
   - 本地开发：`http://localhost:3002/api/upload/oss`
   - 生产环境：`https://your-backend-server.com/api/upload/oss`
   
   **💡 不知道如何获取后端服务器地址？** 请查看 [server/DEPLOYMENT_GUIDE.md](./server/DEPLOYMENT_GUIDE.md)
5. 点击"保存配置"
6. 刷新页面使配置生效

#### 方式 2：通过浏览器控制台配置

在浏览器控制台执行：

```javascript
// 设置后端 URL
localStorage.setItem('aliyun_oss_backend_url', 'https://your-backend-server.com/api/upload/oss');

// 清除配置（使用默认值）
localStorage.removeItem('aliyun_oss_backend_url');
```

然后刷新页面。

### 3. 后端服务器环境变量配置

确保后端服务器的 `.env` 文件包含以下配置：

```env
# 服务器端口
PORT=3002

# CORS 配置（生产环境建议限制特定域名）
CORS_ORIGIN=*

# 阿里云 OSS 配置
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret

# JWT 密钥（用于认证，可选）
JWT_SECRET=your-secret-key

# 运行环境
NODE_ENV=production
```

### 4. 部署后端服务器

#### 选项 A：使用云服务器（如 VPS、云主机）

1. 将 `server` 目录上传到服务器
2. 安装 Node.js 和 npm
3. 安装依赖：`npm install`
4. 配置环境变量（创建 `.env` 文件）
5. 使用 PM2 或其他进程管理器运行：
   ```bash
   pm2 start server-enhanced.js --name pic4pick-backend
   ```

#### 选项 B：使用云平台（如 Railway、Render、Fly.io）

1. 将 `server` 目录部署到云平台
2. 在平台配置界面设置环境变量
3. 平台会自动启动服务器

### 5. 验证配置

配置完成后，尝试上传一张图片。如果配置正确，应该能够：
- 看到上传进度
- 上传成功后获得 OSS URL
- 在控制台看到成功日志

### 6. 常见问题

#### CORS 错误

如果遇到 CORS 错误，检查后端服务器的 CORS 配置：

```javascript
// server-enhanced.js 中已包含 CORS 配置
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',  // 生产环境建议限制特定域名
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};
```

#### 连接被拒绝

- 检查后端服务器是否正在运行
- 检查端口是否正确（默认 3002）
- 检查防火墙设置
- 检查后端服务器是否监听 `0.0.0.0`（生产环境）而不是 `localhost`

#### 上传超时

- 检查文件大小（默认限制 50MB）
- 检查网络连接
- 增加服务器超时设置

### 7. 生产环境建议

1. **限制 CORS 来源**：将 `CORS_ORIGIN` 设置为您的 GitHub Pages 域名
2. **使用 HTTPS**：确保后端服务器使用 HTTPS
3. **设置认证**：如果后端需要认证，配置 JWT 密钥
4. **监控日志**：使用日志服务监控后端运行状态
5. **备份数据**：定期备份重要数据

