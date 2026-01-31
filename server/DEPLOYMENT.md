## Pic4Pick 后端部署说明（宝塔面板 + Nginx + PM2）

以下步骤假设你已经在服务器上安装了 **宝塔面板**，并且有一个可用的域名。

---

### 1. 准备运行环境

1. **安装 Node.js**
   - 在宝塔面板中找到「软件商店」→ 搜索并安装 Node.js 版本管理器（或在服务器上手动安装 Node 18+）。

2. **安装 MySQL / MariaDB**
   - 宝塔通常已安装 MySQL / MariaDB。
   - 创建数据库，如：
     - 数据库名：`pic4pick`
     - 用户名：`pic4pick_user`
     - 密码：`强密码`

3. **导入数据库结构**
   - 在宝塔的「数据库」面板中，为 `pic4pick` 数据库导入：
     - 文件：`server/sql/schema.sql`
   - 或者通过命令行执行：
     ```bash
     mysql -u pic4pick_user -p pic4pick < server/sql/schema.sql
     ```

---

### 2. 上传代码并安装依赖

1. **上传仓库代码**
   - 将整个项目目录（含 `server/`、`src/` 等）上传到服务器，例如：`/www/wwwroot/pic4pick`.

2. **安装后端依赖**
   ```bash
   cd /www/wwwroot/pic4pick/server
   npm install
   ```

3. **配置后端环境变量**
   - 复制示例文件：
     ```bash
     cp .env.example .env
     ```
   - 编辑 `.env`，填入实际配置：
     ```ini
     PORT=3000

     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_USER=pic4pick_user
     DB_PASSWORD=你的数据库密码
     DB_NAME=pic4pick

     JWT_SECRET=一串足够长且随机的字符串

     OSS_REGION=oss-cn-xxx
     OSS_ACCESS_KEY_ID=你的OSS AccessKeyId
     OSS_ACCESS_KEY_SECRET=你的OSS AccessKeySecret
     OSS_BUCKET=你的Bucket名称
     ```

---

### 3. 使用 PM2 管理后端进程

1. **全局安装 PM2（如未安装）**
   ```bash
   npm install -g pm2
   ```

2. **启动服务**
   ```bash
   cd /www/wwwroot/pic4pick/server
   pm2 start src/index.js --name pic4pick-api
   ```

3. **设置开机自启**
   ```bash
   pm2 save
   pm2 startup  # 按提示执行生成的命令
   ```

4. **常用 PM2 命令**
   - 查看状态：`pm2 status`
   - 查看日志：`pm2 logs pic4pick-api`
   - 重启服务：`pm2 restart pic4pick-api`
   - 停止服务：`pm2 stop pic4pick-api`

---

### 4. 配置 Nginx 反向代理（宝塔）

1. **创建站点（后端 API）**
   - 在宝塔「网站」→「添加站点」：
     - 域名：如 `api.pic4pick.com`
     - 运行目录：可以是 `/www/wwwroot/pic4pick`（静态目录无关紧要）

2. **配置反向代理**
   - 编辑该站点的 Nginx 配置，在 `location /` 中加入或确认类似配置：
     ```nginx
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
     ```

3. **开启 HTTPS（推荐）**
   - 在宝塔站点设置中申请或绑定 SSL 证书；
   - 开启「强制 HTTPS」。

4. **前端如何访问 API**
   - 在前端 `.env` 中配置：
     ```ini
     VITE_API_BASE_URL=https://api.pic4pick.com
     ```
   - 前端的所有请求使用相对路径 `/api/...`，由 `VITE_API_BASE_URL` 拼接成完整地址。

---

### 5. 部署前端（可选方案）

1. **本机打包**
   ```bash
   npm install
   npm run build
   ```
   生成的静态文件在 `dist/` 目录。

2. **上传到服务器**
   - 在宝塔中创建一个前端站点，如 `pic4pick.com`；
   - 将 `dist/` 内的文件上传到该站点的根目录。

3. **前后端同域部署（可选）**
   - 也可以让前端和后端共用一个域名，通过 Nginx 路由区分：
     ```nginx
     location /api/ {
       proxy_pass http://127.0.0.1:3000/api/;
       # 其余 proxy_set_header 同上
     }

     location / {
       root /www/wwwroot/pic4pick-frontend;
       try_files $uri /index.html;
     }
     ```

---

### 6. 安全小提示

- 部署前一定要修改默认管理员密码，并更新 `schema.sql` 中的占位密码哈希。
- 不要将真实 `.env` 文件提交到 Git 仓库。
- 建议在数据库中只赋予 `pic4pick_user` 必要的权限（指定某个库）。
- 定期备份数据库与 OSS 上的重要照片。

