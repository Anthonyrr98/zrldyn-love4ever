#!/bin/bash

# 数据库初始化脚本（独立使用）

set -e

echo "Pic4Pick 数据库初始化"
echo "======================"
echo ""

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

echo ""
echo "创建数据库..."
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "导入表结构..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCRIPT_DIR/sql/schema.sql"

echo ""
echo "✅ 数据库初始化完成！"
echo "数据库名: $DB_NAME"
