#!/bin/bash
# 修复 npm 环境变量脚本

echo "=========================================="
echo "npm 环境修复脚本"
echo "=========================================="
echo ""

# 查找 Node.js
NODE_CMD=""
NODE_PATHS=(
    "/www/server/nodejs/v18/bin/node"
    "/www/server/nodejs/v20/bin/node"
    "/www/server/nodejs/v16/bin/node"
    "/usr/local/bin/node"
    "/usr/bin/node"
)

for path in "${NODE_PATHS[@]}"; do
    if [ -f "$path" ] && $path -v &> /dev/null; then
        NODE_CMD="$path"
        break
    fi
done

if [ -z "$NODE_CMD" ]; then
    echo "❌ 未找到 Node.js"
    echo "请运行: bash find-node.sh"
    exit 1
fi

NODE_DIR="$(dirname $NODE_CMD)"
echo "✓ 找到 Node.js: $NODE_CMD"
echo "  版本: $($NODE_CMD -v)"

# 查找 npm
NPM_CMD=""
if [ -f "$NODE_DIR/npm" ]; then
    NPM_CMD="$NODE_DIR/npm"
fi

if [ -z "$NPM_CMD" ]; then
    echo "❌ 未找到 npm"
    echo "Node.js 目录: $NODE_DIR"
    echo ""
    echo "请手动指定 npm 路径："
    read -p "npm 完整路径: " CUSTOM_NPM
    if [ -f "$CUSTOM_NPM" ]; then
        NPM_CMD="$CUSTOM_NPM"
    else
        echo "❌ npm 路径无效"
        exit 1
    fi
fi

echo "✓ 找到 npm: $NPM_CMD"
echo "  版本: $($NPM_CMD -v)"

# 设置环境变量
echo ""
echo "=========================================="
echo "设置环境变量"
echo "=========================================="
echo ""
echo "请执行以下命令设置环境变量："
echo ""
echo "export PATH=\"$NODE_DIR:\$PATH\""
echo ""
echo "然后验证："
echo "node -v"
echo "npm -v"
echo ""
echo "或者直接使用完整路径："
echo "$NODE_CMD -v"
echo "$NPM_CMD -v"
echo ""
echo "=========================================="
echo "永久设置（可选）"
echo "=========================================="
echo ""
echo "如果希望永久设置，请将以下内容添加到 ~/.bashrc 或 ~/.bash_profile："
echo ""
echo "export PATH=\"$NODE_DIR:\$PATH\""
echo ""
read -p "是否现在添加到 ~/.bashrc? (y/n): " ADD_TO_BASHRC
if [ "$ADD_TO_BASHRC" = "y" ] || [ "$ADD_TO_BASHRC" = "Y" ]; then
    if ! grep -q "$NODE_DIR" ~/.bashrc 2>/dev/null; then
        echo "export PATH=\"$NODE_DIR:\$PATH\"" >> ~/.bashrc
        echo "✓ 已添加到 ~/.bashrc"
        echo "请执行: source ~/.bashrc"
    else
        echo "✓ 环境变量已存在于 ~/.bashrc"
    fi
fi
