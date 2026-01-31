#!/bin/bash

# Pic4Pick 后端一键部署脚本（宝塔面板优化版）
# 此脚本假设你已经在宝塔面板中创建了数据库

set -e

echo "=========================================="
echo "Pic4Pick 后端部署脚本（宝塔面板版）"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 显示当前工作目录（用于调试）
echo "当前工作目录: $(pwd)"
echo "脚本目录: $SCRIPT_DIR"
echo ""

# 检查并加载 Node.js（支持宝塔面板）
NODE_CMD=""

# 方法1: 检查标准 PATH
if command -v node &> /dev/null; then
    NODE_CMD="node"
fi

# 方法2: 检查宝塔常见路径
if [ -z "$NODE_CMD" ]; then
    BT_NODE_PATHS=(
        "/www/server/nodejs/v18/bin/node"
        "/www/server/nodejs/v20/bin/node"
        "/www/server/nodejs/v16/bin/node"
        "/usr/local/bin/node"
        "/usr/bin/node"
    )
    
    for path in "${BT_NODE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            NODE_CMD="$path"
            export PATH="$(dirname $path):$PATH"
            break
        fi
    done
fi

# 方法3: 尝试加载环境变量
if [ -z "$NODE_CMD" ]; then
    if [ -f "/etc/profile" ]; then
        source /etc/profile >/dev/null 2>&1
    fi
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc" >/dev/null 2>&1
    fi
    if command -v node &> /dev/null; then
        NODE_CMD="node"
    fi
fi

# 方法4: 手动指定
if [ -z "$NODE_CMD" ]; then
    echo -e "${YELLOW}未在标准路径找到 Node.js${NC}"
    echo "请手动指定 Node.js 路径（在宝塔「Node.js 版本管理器」中查看）："
    read -p "Node.js 完整路径（例如: /www/server/nodejs/v18/bin/node）: " CUSTOM_NODE
    if [ -f "$CUSTOM_NODE" ]; then
        NODE_CMD="$CUSTOM_NODE"
        export PATH="$(dirname $CUSTOM_NODE):$PATH"
    else
        echo -e "${RED}错误: Node.js 路径无效${NC}"
        echo "请确认路径正确，或在宝塔面板中安装 Node.js"
        exit 1
    fi
fi

# 验证 Node.js
NODE_VERSION=$($NODE_CMD -v 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: Node.js 无法执行${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✓ Node.js 路径: $NODE_CMD${NC}"

# 设置 PATH，确保 node 和 npm 可用
NODE_DIR="$(dirname $NODE_CMD)"
export PATH="$NODE_DIR:$PATH"

# 查找 npm
NPM_CMD=""
# 方法1: 在 node 同一目录查找
if [ -f "$NODE_DIR/npm" ]; then
    NPM_CMD="$NODE_DIR/npm"
fi

# 方法2: 在 PATH 中查找
if [ -z "$NPM_CMD" ] && command -v npm &> /dev/null; then
    NPM_CMD="npm"
fi

# 方法3: 搜索常见 npm 位置
if [ -z "$NPM_CMD" ]; then
    NPM_SEARCH_PATHS=(
        "$(dirname $NODE_DIR)/npm/bin/npm"
        "/usr/local/bin/npm"
        "/usr/bin/npm"
    )
    for npm_path in "${NPM_SEARCH_PATHS[@]}"; do
        if [ -f "$npm_path" ]; then
            NPM_CMD="$npm_path"
            export PATH="$(dirname $npm_path):$PATH"
            break
        fi
    done
fi

# 验证 npm
if [ -z "$NPM_CMD" ] || ! $NPM_CMD -v &> /dev/null; then
    echo -e "${RED}错误: 未找到 npm${NC}"
    echo "Node.js 路径: $NODE_CMD"
    echo "请确认 npm 已安装，或手动指定 npm 路径："
    read -p "npm 完整路径（例如: /www/server/nodejs/v18/bin/npm）: " CUSTOM_NPM
    if [ -f "$CUSTOM_NPM" ] && $CUSTOM_NPM -v &> /dev/null; then
        NPM_CMD="$CUSTOM_NPM"
        export PATH="$(dirname $CUSTOM_NPM):$PATH"
    else
        echo -e "${RED}错误: npm 路径无效或无法执行${NC}"
        exit 1
    fi
fi

NPM_VERSION=$($NPM_CMD -v 2>&1)
echo -e "${GREEN}✓ npm: $NPM_VERSION${NC}"
echo -e "${GREEN}✓ npm 路径: $NPM_CMD${NC}"

# 检查并安装 PM2
PM2_CMD=""
# 方法1: 在 npm 同一目录查找
if [ -f "$(dirname $NPM_CMD)/pm2" ]; then
    PM2_CMD="$(dirname $NPM_CMD)/pm2"
fi

# 方法2: 在 PATH 中查找
if [ -z "$PM2_CMD" ] && command -v pm2 &> /dev/null; then
    PM2_CMD="pm2"
fi

# 方法3: 安装 PM2
if [ -z "$PM2_CMD" ]; then
    echo "安装 PM2..."
    # 检查并修复 npm registry（清华镜像可能没有 pm2）
    CURRENT_REGISTRY=$($NPM_CMD config get registry 2>/dev/null || echo "")
    if [[ "$CURRENT_REGISTRY" == *"tuna.tsinghua.edu.cn"* ]] || [[ "$CURRENT_REGISTRY" == *"mirrors.tuna.tsinghua.edu.cn"* ]]; then
        echo "检测到清华镜像源，切换到淘宝镜像源（支持 PM2）..."
        $NPM_CMD config set registry https://registry.npmmirror.com
    fi
    # 尝试安装 PM2
    if ! $NPM_CMD install -g pm2 2>/dev/null; then
        echo "使用淘宝镜像安装失败，尝试官方源..."
        $NPM_CMD config set registry https://registry.npmjs.org
        $NPM_CMD install -g pm2
    fi
    # 安装后再次查找
    if [ -f "$(dirname $NPM_CMD)/pm2" ]; then
        PM2_CMD="$(dirname $NPM_CMD)/pm2"
    elif command -v pm2 &> /dev/null; then
        PM2_CMD="pm2"
    else
        # 使用 npx 作为后备
        PM2_CMD="$NPM_CMD exec pm2"
    fi
fi

PM2_VERSION=$($PM2_CMD -v 2>&1)
echo -e "${GREEN}✓ PM2: $PM2_VERSION${NC}"

# 数据库配置
echo ""
echo "请输入数据库信息（在宝塔面板「数据库」中查看）："
read -p "数据库主机 [默认: localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "数据库端口 [默认: 3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "数据库用户名: " DB_USER
read -s -p "数据库密码: " DB_PASSWORD
echo ""
read -p "数据库名: " DB_NAME

# 测试连接
echo ""
echo "测试数据库连接..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}错误: 数据库连接失败${NC}"
    exit 1
fi

# 导入 SQL
echo ""
echo "导入数据库表结构..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < sql/schema.sql
echo -e "${GREEN}✓ 数据库表结构导入完成${NC}"

# 生成 JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || $NODE_CMD -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 创建 .env
echo ""
echo "创建 .env 配置文件..."
cat > .env <<EOF
PORT=3000

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

JWT_SECRET=$JWT_SECRET

OSS_REGION=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
EOF
echo -e "${GREEN}✓ .env 配置已创建${NC}"

# 安装依赖
echo ""
echo "安装依赖..."
# 确保使用正确的 registry（如果之前切换了，这里也会使用）
CURRENT_REGISTRY=$($NPM_CMD config get registry 2>/dev/null || echo "")
if [[ "$CURRENT_REGISTRY" == *"tuna.tsinghua.edu.cn"* ]] || [[ "$CURRENT_REGISTRY" == *"mirrors.tuna.tsinghua.edu.cn"* ]]; then
    echo "切换到淘宝镜像源..."
    $NPM_CMD config set registry https://registry.npmmirror.com
fi
$NPM_CMD install
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 初始化管理员
echo ""
echo "初始化管理员账号..."
read -p "管理员用户名 [默认: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -s -p "管理员密码 [默认: admin123]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}
echo ""

# 创建临时初始化脚本
TEMP_INIT="init-admin-temp-$$.js"
cat > "$TEMP_INIT" <<'INITEOF'
import bcrypt from 'bcryptjs'
import { getDbPool } from './src/config/db.js'
import './src/config/env.js'

async function initAdmin() {
  const pool = getDbPool()
  const username = process.env.ADMIN_USER || 'admin'
  const password = process.env.ADMIN_PASS || 'admin123'

  try {
    const hash = bcrypt.hashSync(password, 10)
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
      [username, hash, 'admin', hash],
    )
    console.log('✅ 管理员账号已创建/更新')
    console.log(`用户名: ${username}`)
    console.log(`密码: ${password}`)
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

initAdmin()
INITEOF

ADMIN_USER="$ADMIN_USER" ADMIN_PASS="$ADMIN_PASS" $NODE_CMD "$TEMP_INIT"
rm "$TEMP_INIT"

# 启动 PM2
echo ""
echo "启动服务..."
# 确保在正确的目录下
cd "$SCRIPT_DIR"
# 检查入口文件是否存在
if [ ! -f "$SCRIPT_DIR/src/index.js" ]; then
    echo -e "${RED}错误: 找不到入口文件 $SCRIPT_DIR/src/index.js${NC}"
    echo "当前目录: $(pwd)"
    echo "请确认项目文件完整"
    exit 1
fi

# 使用绝对路径启动 PM2
APP_PATH="$SCRIPT_DIR/src/index.js"
if $PM2_CMD list | grep -q "pic4pick-api"; then
    echo "重启现有服务..."
    $PM2_CMD delete pic4pick-api 2>/dev/null || true
fi

echo "启动新服务: $APP_PATH"
$PM2_CMD start "$APP_PATH" --name pic4pick-api --cwd "$SCRIPT_DIR"
$PM2_CMD save

echo ""
echo -e "${GREEN}=========================================="
echo "部署完成！"
echo "==========================================${NC}"
echo ""
echo "服务状态："
$PM2_CMD list | grep pic4pick-api || echo "（如果未显示，请检查 PM2 状态）"
echo ""
echo "管理员账号："
echo "  用户名: $ADMIN_USER"
echo "  密码: $ADMIN_PASS"
echo ""
echo "常用命令："
echo "  $PM2_CMD logs pic4pick-api    # 查看日志"
echo "  $PM2_CMD restart pic4pick-api # 重启服务"
echo ""
echo "如果 PM2 命令不可用，请使用完整路径或："
echo "  export PATH=\"$(dirname $NODE_CMD):\$PATH\""
echo ""
