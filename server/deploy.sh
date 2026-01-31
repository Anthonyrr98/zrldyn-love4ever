#!/bin/bash

# Pic4Pick 后端一键部署脚本
# 适用于 Linux 服务器（宝塔面板环境）

set -e  # 遇到错误立即退出

echo "=========================================="
echo "Pic4Pick 后端部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}警告: 不建议使用 root 用户运行，建议使用普通用户${NC}"
   read -p "是否继续？(y/n) " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
   fi
fi

# 获取当前脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "工作目录: $SCRIPT_DIR"
echo ""

# 1. 检查 Node.js
echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    echo "请先安装 Node.js 18+"
    echo "宝塔面板: 软件商店 -> Node.js 版本管理器"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 2. 检查 MySQL
echo ""
echo "检查 MySQL..."
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}错误: 未找到 MySQL 客户端${NC}"
    echo "请先安装 MySQL/MariaDB"
    exit 1
fi

MYSQL_VERSION=$(mysql --version)
echo -e "${GREEN}✓ MySQL: $MYSQL_VERSION${NC}"

# 3. 检查 PM2
echo ""
echo "检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi

PM2_VERSION=$(pm2 -v)
echo -e "${GREEN}✓ PM2 版本: $PM2_VERSION${NC}"

# 4. 读取数据库配置
echo ""
echo "=========================================="
echo "数据库配置"
echo "=========================================="

if [ -f ".env" ]; then
    echo "发现现有 .env 文件"
    source .env
else
    echo "创建新的 .env 文件..."
    cp .env.example .env
fi

read -p "MySQL 主机 [默认: localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "MySQL 端口 [默认: 3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "MySQL 用户名 [默认: root]: " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "MySQL 密码: " DB_PASSWORD
echo ""

read -p "数据库名 [默认: pic4pick]: " DB_NAME
DB_NAME=${DB_NAME:-pic4pick}

# 5. 测试数据库连接
echo ""
echo "测试数据库连接..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}错误: 数据库连接失败${NC}"
    echo "请检查数据库配置"
    exit 1
fi

# 6. 创建数据库（如果不存在）
echo ""
echo "创建数据库（如果不存在）..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
echo -e "${GREEN}✓ 数据库准备完成${NC}"

# 7. 导入表结构
echo ""
echo "导入数据库表结构..."
if [ -f "sql/schema.sql" ]; then
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/schema.sql
    echo -e "${GREEN}✓ 表结构导入完成${NC}"
else
    echo -e "${RED}错误: 未找到 sql/schema.sql${NC}"
    exit 1
fi

# 8. 更新 .env 文件
echo ""
echo "更新 .env 配置..."
cat > .env <<EOF
PORT=3000

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

JWT_SECRET=$(openssl rand -hex 32)

OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
EOF
echo -e "${GREEN}✓ .env 配置已更新${NC}"

# 9. 安装依赖
echo ""
echo "安装 Node.js 依赖..."
if [ ! -d "node_modules" ]; then
    npm install
else
    npm install
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 10. 初始化管理员账号
echo ""
echo "初始化管理员账号..."
read -p "管理员用户名 [默认: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -s -p "管理员密码 [默认: admin123]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}
echo ""

# 临时修改 init-admin.js 使用自定义账号
TEMP_INIT="init-admin-temp.js"
cat > "$TEMP_INIT" <<EOF
import bcrypt from 'bcryptjs'
import { getDbPool } from './src/config/db.js'
import './src/config/env.js'

async function initAdmin() {
  const pool = getDbPool()
  const username = '$ADMIN_USER'
  const password = '$ADMIN_PASS'

  try {
    const hash = bcrypt.hashSync(password, 10)
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
      [username, hash, 'admin', hash],
    )
    console.log('✅ 管理员账号已创建/更新')
    console.log(\`用户名: \${username}\`)
    console.log(\`密码: \${password}\`)
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

initAdmin()
EOF

node "$TEMP_INIT"
rm "$TEMP_INIT"
echo -e "${GREEN}✓ 管理员账号初始化完成${NC}"

# 11. 启动服务（PM2）
echo ""
echo "=========================================="
echo "启动服务"
echo "=========================================="

# 检查服务是否已运行
if pm2 list | grep -q "pic4pick-api"; then
    echo "发现已存在的服务，正在重启..."
    pm2 restart pic4pick-api
else
    echo "启动新服务..."
    pm2 start src/index.js --name pic4pick-api
fi

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup | grep -v "PM2" | bash || true

echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "服务信息："
pm2 list | grep pic4pick-api
echo ""
echo "查看日志："
echo "  pm2 logs pic4pick-api"
echo ""
echo "重启服务："
echo "  pm2 restart pic4pick-api"
echo ""
echo "停止服务："
echo "  pm2 stop pic4pick-api"
echo ""
echo "管理员账号："
echo "  用户名: $ADMIN_USER"
echo "  密码: $ADMIN_PASS"
echo ""
echo -e "${YELLOW}⚠️  请在生产环境中修改默认密码！${NC}"
echo ""
