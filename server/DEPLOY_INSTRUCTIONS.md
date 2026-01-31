# 服务器一键部署指南

## 方式一：使用一键部署脚本（推荐）

### 1. 上传文件到服务器

将整个项目上传到服务器，例如：
```bash
/www/wwwroot/pic4pick/
```

### 2. 进入后端目录

```bash
cd /www/wwwroot/pic4pick/server
```

### 3. 赋予执行权限

```bash
chmod +x deploy.sh
# 或使用宝塔优化版
chmod +x deploy-baota.sh
```

### 4. 执行部署脚本

**标准版（交互式配置）：**
```bash
./deploy.sh
```

**宝塔面板版（简化流程）：**
```bash
./deploy-baota.sh
```

脚本会自动：
- ✅ 检查 Node.js 和 MySQL
- ✅ 安装 PM2（如果未安装）
- ✅ 创建数据库（如果不存在）
- ✅ 导入表结构
- ✅ 创建 .env 配置文件
- ✅ 安装依赖
- ✅ 初始化管理员账号
- ✅ 启动服务并设置开机自启

### 5. 配置 Nginx 反向代理

在宝塔面板「网站」中：

1. **添加站点**（如果还没有）：
   - 域名：`api.pic4pick.com`（或你的 API 域名）
   - 运行目录：任意（不重要）

2. **配置反向代理**：
   - 点击站点「设置」->「反向代理」
   - 添加反向代理：
     - 代理名称：`pic4pick-api`
     - 目标 URL：`http://127.0.0.1:3000`
     - 发送域名：`$host`
     - 其他保持默认

3. **开启 HTTPS**（推荐）：
   - 在「SSL」中申请或绑定证书
   - 开启「强制 HTTPS」

### 6. 配置前端 API 地址

在前端项目的 `.env` 文件中添加：
```ini
VITE_API_BASE_URL=https://api.pic4pick.com
```

或在宝塔中配置前端站点，使用 Nginx 路由：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    root /www/wwwroot/pic4pick-frontend;
    try_files $uri /index.html;
}
```

## 方式二：手动部署

如果脚本执行失败，可以手动执行以下步骤：

### 1. 安装依赖

```bash
cd /www/wwwroot/pic4pick/server
npm install
```

### 2. 创建数据库

在宝塔「数据库」中创建数据库 `pic4pick`，或使用命令行：

```bash
mysql -u root -p
```

```sql
CREATE DATABASE pic4pick CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. 导入表结构

```bash
mysql -u root -p pic4pick < sql/schema.sql
```

### 4. 配置环境变量

编辑 `.env` 文件：
```bash
nano .env
```

填入数据库信息：
```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=pic4pick
JWT_SECRET=一个足够长的随机字符串
```

### 5. 初始化管理员

```bash
npm run init-admin
```

### 6. 启动服务

```bash
# 使用 PM2
pm2 start src/index.js --name pic4pick-api
pm2 save
pm2 startup  # 按提示执行生成的命令
```

## 验证部署

1. **检查服务状态**：
   ```bash
   pm2 list
   pm2 logs pic4pick-api
   ```

2. **测试 API**：
   ```bash
   curl http://localhost:3000/api/health
   ```
   应返回：`{"status":"ok","db":"ok"}`

3. **访问前端**：
   - 打开浏览器访问你的前端域名
   - 进入 `/admin` 页面
   - 使用初始化时设置的管理员账号登录

## 常见问题

### 端口被占用

如果 3000 端口被占用，修改 `server/.env` 中的 `PORT`，然后重启：
```bash
pm2 restart pic4pick-api
```

### 数据库连接失败

1. 检查 MySQL 是否运行：`systemctl status mysql`
2. 检查防火墙是否开放 3306 端口
3. 检查 `.env` 中的数据库配置是否正确

### PM2 服务无法启动

查看详细错误：
```bash
pm2 logs pic4pick-api --lines 50
```

### 更新代码后重启

```bash
cd /www/wwwroot/pic4pick/server
git pull  # 如果使用 Git
npm install  # 如果有新依赖
pm2 restart pic4pick-api
```

## 安全建议

1. **修改默认密码**：部署后立即修改管理员密码
2. **使用强 JWT_SECRET**：`.env` 中的 `JWT_SECRET` 应该是随机字符串
3. **配置防火墙**：只开放必要的端口（80, 443）
4. **定期备份**：备份数据库和重要文件
5. **更新依赖**：定期运行 `npm audit` 检查安全漏洞
