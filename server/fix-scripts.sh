#!/bin/bash
# 修复脚本行尾符问题

cd "$(dirname "$0")"

echo "修复脚本行尾符..."
dos2unix deploy.sh deploy-baota.sh init-db.sh 2>/dev/null || {
    # 如果没有 dos2unix，使用 sed 修复
    sed -i 's/\r$//' deploy.sh
    sed -i 's/\r$//' deploy-baota.sh
    sed -i 's/\r$//' init-db.sh
    echo "使用 sed 修复完成"
}

chmod +x deploy.sh deploy-baota.sh init-db.sh
echo "✅ 脚本已修复，可以执行了"
