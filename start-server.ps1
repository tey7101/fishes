# 服务器启动脚本

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  FishTalk.app 服务器启动" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 检查 node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "`n1. 安装依赖..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "`n1. 依赖已安装" -ForegroundColor Green
}

# 启动服务器
Write-Host "2. 启动服务器..." -ForegroundColor Yellow
Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  服务器将在以下地址运行：" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host "`n  访问会员页面：" -ForegroundColor Yellow
Write-Host "  http://localhost:3000/membership.html" -ForegroundColor White
Write-Host "`n  按 Ctrl+C 可停止服务器" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

npm start

