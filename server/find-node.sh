#!/bin/bash
# 查找 Node.js 和 npm 路径脚本

echo "=========================================="
echo "查找 Node.js 和 npm 路径"
echo "=========================================="
echo ""

# 检查标准路径
echo "1. 检查标准 PATH："
if command -v node &> /dev/null; then
    echo "   Node.js: $(which node)"
    echo "   npm: $(which npm)"
else
    echo "   未在 PATH 中找到"
fi

echo ""
echo "2. 检查宝塔常见路径："

BT_PATHS=(
    "/www/server/nodejs"
    "/usr/local/nodejs"
    "/opt/nodejs"
)

for base_path in "${BT_PATHS[@]}"; do
    if [ -d "$base_path" ]; then
        echo "   找到目录: $base_path"
        for version_dir in "$base_path"/v*; do
            if [ -d "$version_dir" ]; then
                NODE_PATH="$version_dir/bin/node"
                NPM_PATH="$version_dir/bin/npm"
                if [ -f "$NODE_PATH" ]; then
                    echo "   ✓ 版本: $(basename $version_dir)"
                    echo "     Node.js: $NODE_PATH"
                    echo "     npm: $NPM_PATH"
                    echo "     版本: $($NODE_PATH -v 2>/dev/null || echo '无法执行')"
                    echo ""
                fi
            fi
        done
    fi
done

echo "3. 搜索整个系统（可能需要一些时间）："
echo "   正在搜索..."
FOUND_NODE=$(find /www/server -name "node" -type f 2>/dev/null | grep -E "bin/node$" | head -1)
if [ -n "$FOUND_NODE" ]; then
    echo "   ✓ 找到: $FOUND_NODE"
    NPM_PATH="$(dirname $FOUND_NODE)/npm"
    if [ -f "$NPM_PATH" ]; then
        echo "   ✓ npm: $NPM_PATH"
    fi
else
    echo "   未找到"
fi

echo ""
echo "=========================================="
echo "使用方法："
echo "=========================================="
echo ""
echo "如果找到了 Node.js 路径，执行以下命令设置环境："
echo ""
echo "export PATH=\"$(dirname $FOUND_NODE):\$PATH\""
echo "node -v"
echo "npm -v"
echo ""
echo "或者直接使用完整路径："
if [ -n "$FOUND_NODE" ]; then
    echo "$FOUND_NODE -v"
    echo "$(dirname $FOUND_NODE)/npm -v"
fi
