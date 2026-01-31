# PM2 启动问题排查指南

## 问题
PM2 启动时使用了错误的路径（如回收站路径），导致服务无法正常启动。

## 快速修复

### 方法 1: 使用修复脚本（推荐）

```bash
chmod +x fix-pm2.sh
bash fix-pm2.sh
```

### 方法 2: 手动修复

1. **清理错误的 PM2 进程**
   ```bash
   pm2 delete pic4pick-api
   pm2 delete all  # 如果有很多错误进程
   pm2 kill  # 完全停止 PM2
   ```

2. **确认项目目录**
   ```bash
   cd /www/wwwroot/Pic4Pick/server
   # 或你的实际项目路径
   pwd  # 确认当前目录
   ```

3. **检查入口文件**
   ```bash
   ls -la src/index.js
   ```

4. **使用绝对路径启动**
   ```bash
   pm2 start /www/wwwroot/Pic4Pick/server/src/index.js \
     --name pic4pick-api \
     --cwd /www/wwwroot/Pic4Pick/server
   ```

5. **保存配置**
   ```bash
   pm2 save
   ```

## 常见问题

### Q: 为什么会出现回收站路径？
A: 可能的原因：
- 脚本在错误的目录下运行
- 宝塔面板的文件操作导致路径混乱
- PM2 配置中保存了错误的路径

### Q: 如何确认正确的项目路径？
A: 
```bash
# 找到 server 目录
find /www/wwwroot -name "server" -type d | grep Pic4Pick

# 或查看部署脚本的位置
ls -la /www/wwwroot/Pic4Pick/server/deploy-baota.sh
```

### Q: PM2 进程显示 "errored" 状态？
A: 查看日志：
```bash
pm2 logs pic4pick-api
pm2 logs pic4pick-api --lines 50  # 查看最近 50 行
```

### Q: 如何完全重置 PM2？
A:
```bash
pm2 kill
pm2 unstartup  # 删除开机自启
rm -rf ~/.pm2  # 删除 PM2 配置（谨慎使用）
pm2 startup   # 重新设置开机自启
```

## 验证服务

```bash
# 查看进程状态
pm2 list

# 查看详细信息
pm2 show pic4pick-api

# 查看日志
pm2 logs pic4pick-api

# 测试 API（如果端口是 3000）
curl http://localhost:3000/api/health
```

## 正确的启动命令格式

```bash
pm2 start <入口文件绝对路径> \
  --name <进程名称> \
  --cwd <工作目录绝对路径> \
  [其他选项]
```

示例：
```bash
pm2 start /www/wwwroot/Pic4Pick/server/src/index.js \
  --name pic4pick-api \
  --cwd /www/wwwroot/Pic4Pick/server \
  --env production
```

## 更新后的部署脚本

新的 `deploy-baota.sh` 已经修复：
- ✅ 使用绝对路径启动 PM2
- ✅ 自动检测并清理旧进程
- ✅ 验证入口文件存在
- ✅ 显示当前工作目录用于调试
