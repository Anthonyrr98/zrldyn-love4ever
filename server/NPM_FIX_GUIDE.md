# npm 环境问题修复指南

## 问题
在服务器上执行部署脚本时出现 `npm: command not found` 错误。

## 解决方案

### 方法 1: 使用修复脚本（推荐）

1. **上传修复脚本到服务器**
   ```bash
   # 将 fix-npm-env.sh 上传到服务器
   ```

2. **运行修复脚本**
   ```bash
   chmod +x fix-npm-env.sh
   bash fix-npm-env.sh
   ```

3. **按照脚本提示设置环境变量**
   ```bash
   export PATH="/www/server/nodejs/v18/bin:$PATH"
   # 替换为你的实际路径
   ```

4. **验证**
   ```bash
   node -v
   npm -v
   ```

5. **运行部署脚本**
   ```bash
   bash deploy-baota.sh
   ```

### 方法 2: 手动查找并设置

1. **查找 Node.js 和 npm 路径**
   ```bash
   bash find-node.sh
   ```

2. **设置环境变量（临时）**
   ```bash
   export PATH="/找到的node目录:$PATH"
   # 例如: export PATH="/www/server/nodejs/v18/bin:$PATH"
   ```

3. **验证**
   ```bash
   node -v
   npm -v
   ```

4. **运行部署脚本**
   ```bash
   bash deploy-baota.sh
   ```

### 方法 3: 永久设置（可选）

将环境变量添加到 shell 配置文件中：

```bash
echo 'export PATH="/www/server/nodejs/v18/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 改进的部署脚本

新的 `deploy-baota.sh` 已经改进了 npm 检测逻辑：

- ✅ 自动查找 npm 在多个常见位置
- ✅ 如果找不到 npm，会提示手动输入路径
- ✅ 验证 npm 是否可用后再继续
- ✅ 使用完整路径执行 npm 命令

## 常见问题

### Q: 宝塔面板中安装了 Node.js，但命令行找不到？
A: 宝塔面板的 Node.js 可能不在系统 PATH 中。使用 `find-node.sh` 查找实际路径，然后手动设置 PATH。

### Q: npm 和 node 不在同一个目录？
A: 新的部署脚本会搜索多个位置，如果找不到会提示你手动指定路径。

### Q: 设置 PATH 后还是找不到？
A: 确保使用完整路径，或者重新打开终端窗口（环境变量需要重新加载）。

## 下一步

修复 npm 环境后，运行：
```bash
bash deploy-baota.sh
```

脚本会自动：
1. 检测 Node.js 和 npm
2. 安装依赖
3. 配置数据库
4. 启动 PM2 服务
