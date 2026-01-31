#!/bin/bash
# 修复 PM2 启动路径问题

echo "=========================================="
echo "PM2 修复脚本"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "当前目录: $(pwd)"
echo ""

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}错误: 未找到 PM2${NC}"
    echo "请先安装 PM2: npm install -g pm2"
    exit 1
fi

# 检查入口文件
if [ ! -f "$SCRIPT_DIR/src/index.js" ]; then
    echo -e "${RED}错误: 找不到入口文件 $SCRIPT_DIR/src/index.js${NC}"
    exit 1
fi

# 停止并删除所有 pic4pick-api 进程
echo "清理旧的 PM2 进程..."
$PM2_CMD delete pic4pick-api 2>/dev/null || true
pm2 delete pic4pick-api 2>/dev/null || true

# 列出所有进程，查找错误的路径
echo ""
echo "检查 PM2 进程列表..."
pm2 list

# 查找并删除错误的进程（包含回收站路径的）
echo ""
echo "查找并删除错误的进程..."
pm2 list | grep -E "Recycle_bin|回收站" && {
    echo "发现错误的进程，正在删除..."
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    sleep 2
}

# 重新启动服务
echo ""
echo -e "${GREEN}启动服务...${NC}"
APP_PATH="$SCRIPT_DIR/src/index.js"
echo "入口文件: $APP_PATH"

pm2 start "$APP_PATH" --name pic4pick-api --cwd "$SCRIPT_DIR"
pm2 save

echo ""
echo -e "${GREEN}=========================================="
echo "修复完成！"
echo "==========================================${NC}"
echo ""
echo "服务状态："
pm2 list | grep pic4pick-api || echo "（如果未显示，请检查日志）"
echo ""
echo "查看日志："
echo "  pm2 logs pic4pick-api"
echo ""
echo "重启服务："
echo "  pm2 restart pic4pick-api"
echo ""
