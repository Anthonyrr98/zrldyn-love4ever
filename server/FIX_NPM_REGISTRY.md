# 修复 npm 镜像源问题

## 问题
使用清华镜像源（tuna.tsinghua.edu.cn）时，某些包（如 PM2）可能找不到，返回 404 错误。

## 快速修复

### 方法 1: 切换到淘宝镜像（推荐，国内速度快）

```bash
npm config set registry https://registry.npmmirror.com
```

### 方法 2: 切换到官方源

```bash
npm config set registry https://registry.npmjs.org
```

### 方法 3: 临时使用（单次安装）

```bash
npm install -g pm2 --registry=https://registry.npmmirror.com
```

## 验证当前源

```bash
npm config get registry
```

## 查看所有配置

```bash
npm config list
```

## 恢复默认源

```bash
npm config delete registry
# 或
npm config set registry https://registry.npmjs.org
```

## 常见镜像源

- **淘宝镜像（推荐）**: `https://registry.npmmirror.com`
- **官方源**: `https://registry.npmjs.org`
- **腾讯云**: `https://mirrors.cloud.tencent.com/npm/`
- **华为云**: `https://repo.huaweicloud.com/repository/npm/`

## 部署脚本已自动修复

新的 `deploy-baota.sh` 脚本会自动检测并切换到正确的镜像源。

如果仍有问题，请手动执行：

```bash
npm config set registry https://registry.npmmirror.com
npm install -g pm2
```
