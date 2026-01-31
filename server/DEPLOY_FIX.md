# 脚本执行错误修复

如果遇到 `cannot execute: required file not found` 错误，按以下步骤修复：

## 方法一：使用修复脚本（推荐）

```bash
cd server
chmod +x fix-scripts.sh
./fix-scripts.sh
```

## 方法二：手动修复

### 1. 转换行尾符

如果服务器有 `dos2unix`：
```bash
dos2unix deploy-baota.sh
chmod +x deploy-baota.sh
```

如果没有 `dos2unix`，使用 `sed`：
```bash
sed -i 's/\r$//' deploy-baota.sh
chmod +x deploy-baota.sh
```

### 2. 检查 shebang 行

确保脚本第一行是：
```bash
#!/bin/bash
```

如果不是，编辑脚本：
```bash
nano deploy-baota.sh
```

确保第一行是 `#!/bin/bash`，然后保存。

### 3. 重新执行

```bash
./deploy-baota.sh
```

## 方法三：直接使用 bash 执行

如果修复后仍有问题，可以直接用 bash 执行：

```bash
bash deploy-baota.sh
```

## 方法四：重新创建脚本（如果以上都不行）

在服务器上直接创建脚本：

```bash
cd /www/wwwroot/pic4pick/server
cat > deploy-baota.sh << 'SCRIPTEOF'
#!/bin/bash
# 在这里粘贴脚本内容
SCRIPTEOF

chmod +x deploy-baota.sh
./deploy-baota.sh
```
