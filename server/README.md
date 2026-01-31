# Pic4Pick 后端服务

Node.js + Express + MySQL 后端 API 服务。

## 快速开始

### 方式一：一键部署脚本（推荐）

**Linux/Unix 服务器：**

```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

**宝塔面板优化版：**

```bash
cd server
chmod +x deploy-baota.sh
./deploy-baota.sh
```

**Windows 服务器：**

```cmd
cd server
deploy.bat
```

脚本会自动完成所有配置步骤。

### 方式二：手动安装

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置数据库

创建数据库并导入表结构：

```bash
mysql -u root -p pic4pick < sql/schema.sql
```

#### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改：

```bash
cp .env.example .env
nano .env
```

填入数据库连接信息：

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=pic4pick

JWT_SECRET=一个足够长的随机字符串
```

#### 4. 初始化管理员账号

```bash
npm run init-admin
```

或使用环境变量自定义：

```bash
ADMIN_USER=myadmin ADMIN_PASS=mypassword node init-admin.js
```

#### 5. 启动服务

开发环境：
```bash
npm run dev
```

生产环境（使用 PM2）：
```bash
pm2 start src/index.js --name pic4pick-api
pm2 save
pm2 startup  # 设置开机自启
```

## API 端点

### 认证
- `POST /api/auth/login` - 管理员登录
  - 请求体：`{ username, password }`
  - 返回：`{ token, user: { id, username, role } }`

### 照片管理（需要登录）
- `GET /api/photos` - 获取照片列表
  - 查询参数：`status`, `category`, `keyword`, `page`, `pageSize`
  - 返回：`{ items: [], total, page, pageSize }`

- `POST /api/photos` - 创建照片（需管理员）
  - 请求体：照片信息（title, location_city, oss_key 等）
  - 返回：创建的照片对象

- `POST /api/photos/:id/approve` - 审核通过（需管理员）
- `POST /api/photos/:id/reject` - 审核拒绝（需管理员）
  - 请求体：`{ reason?: string }`

- `GET /api/photos/stats` - 获取统计数据
  - 返回：`{ total, pending, approved, rejected }`

### 健康检查
- `GET /api/health` - 检查服务状态和数据库连接

## 数据库结构

主要表：

- `users` - 用户表（管理员账号）
- `photos` - 照片表（作品信息、审核状态等）

详细结构见 `sql/schema.sql`

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `PORT` | 服务端口 | 否（默认3000） |
| `DB_HOST` | 数据库主机 | 是 |
| `DB_PORT` | 数据库端口 | 否（默认3306） |
| `DB_USER` | 数据库用户名 | 是 |
| `DB_PASSWORD` | 数据库密码 | 是 |
| `DB_NAME` | 数据库名 | 是 |
| `JWT_SECRET` | JWT 密钥 | 是 |
| `OSS_*` | 阿里云 OSS 配置 | 否（可选） |

## 部署

详细部署说明见 [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md)

### 宝塔面板部署

1. 上传项目到服务器
2. 运行 `./deploy-baota.sh`
3. 在宝塔「网站」中配置 Nginx 反向代理到 `http://127.0.0.1:3000`
4. 配置 HTTPS 证书

## 常用命令

```bash
# 查看服务状态
pm2 list

# 查看日志
pm2 logs pic4pick-api

# 重启服务
pm2 restart pic4pick-api

# 停止服务
pm2 stop pic4pick-api

# 查看实时日志
pm2 logs pic4pick-api --lines 50
```

## 故障排查

### 数据库连接失败

1. 检查 MySQL 是否运行：`systemctl status mysql`
2. 检查 `.env` 配置是否正确
3. 测试连接：`mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD`

### 服务无法启动

查看详细错误：
```bash
pm2 logs pic4pick-api --err
```

或直接运行：
```bash
npm run dev
```

### 端口被占用

修改 `.env` 中的 `PORT`，然后重启服务。

## 安全建议

1. **修改默认密码**：部署后立即修改管理员密码
2. **使用强 JWT_SECRET**：至少 32 位随机字符串
3. **配置防火墙**：只开放必要端口
4. **定期备份**：备份数据库和重要文件
5. **更新依赖**：`npm audit` 检查安全漏洞
