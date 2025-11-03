@echo off
chcp 65001 >nul
echo.
echo ====================================
echo    Fish Art 本地开发服务器
echo ====================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo 📦 首次运行，正在安装依赖...
    call npm install
    echo.
)

echo 🚀 正在启动服务器...
echo.
node server.js

