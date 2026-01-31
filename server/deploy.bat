@echo off
REM Pic4Pick 后端一键部署脚本（Windows 版）
REM 适用于 Windows 服务器或本地开发

echo ==========================================
echo Pic4Pick 后端部署脚本（Windows）
echo ==========================================
echo.

cd /d "%~dp0"

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js
    echo 请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [OK] Node.js: 
node -v
echo.

REM 检查 MySQL
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 MySQL 客户端
    echo 请确保 MySQL 已安装并配置到 PATH
    echo.
)

REM 数据库配置
echo ==========================================
echo 数据库配置
echo ==========================================
set /p DB_HOST="MySQL 主机 [默认: localhost]: "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="MySQL 端口 [默认: 3306]: "
if "%DB_PORT%"=="" set DB_PORT=3306

set /p DB_USER="MySQL 用户名 [默认: root]: "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASSWORD="MySQL 密码: "

set /p DB_NAME="数据库名 [默认: pic4pick]: "
if "%DB_NAME%"=="" set DB_NAME=pic4pick

echo.
echo 创建数据库...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% neq 0 (
    echo [错误] 数据库连接失败
    pause
    exit /b 1
)

echo [OK] 数据库准备完成
echo.

echo 导入表结构...
mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASSWORD% %DB_NAME% < sql\schema.sql
if %errorlevel% neq 0 (
    echo [错误] 导入表结构失败
    pause
    exit /b 1
)
echo [OK] 表结构导入完成
echo.

REM 生成 JWT_SECRET（简单方式）
set JWT_SECRET=pic4pick_secret_%RANDOM%_%RANDOM%_%RANDOM%

REM 创建 .env
echo 创建 .env 配置文件...
(
echo PORT=3000
echo.
echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo DB_NAME=%DB_NAME%
echo.
echo JWT_SECRET=%JWT_SECRET%
echo.
echo OSS_REGION=
echo OSS_ACCESS_KEY_ID=
echo OSS_ACCESS_KEY_SECRET=
echo OSS_BUCKET=
) > .env
echo [OK] .env 配置已创建
echo.

REM 安装依赖
echo 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成
echo.

REM 初始化管理员
echo ==========================================
echo 初始化管理员账号
echo ==========================================
set /p ADMIN_USER="管理员用户名 [默认: admin]: "
if "%ADMIN_USER%"=="" set ADMIN_USER=admin

set /p ADMIN_PASS="管理员密码 [默认: admin123]: "
if "%ADMIN_PASS%"=="" set ADMIN_PASS=admin123

echo.
echo 正在初始化...
set ADMIN_USER=%ADMIN_USER%
set ADMIN_PASS=%ADMIN_PASS%
call node init-admin.js
if %errorlevel% neq 0 (
    echo [错误] 管理员初始化失败
    pause
    exit /b 1
)
echo [OK] 管理员账号初始化完成
echo.

echo ==========================================
echo 部署完成！
echo ==========================================
echo.
echo 启动服务：
echo   npm run dev
echo.
echo 管理员账号：
echo   用户名: %ADMIN_USER%
echo   密码: %ADMIN_PASS%
echo.
echo Windows 下建议使用 PM2：
echo   npm install -g pm2
echo   pm2 start src/index.js --name pic4pick-api
echo.
pause
