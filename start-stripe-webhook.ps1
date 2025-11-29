# Stripe Webhook 转发启动脚本
# 一键启动 Stripe CLI webhook 转发

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  Stripe Webhook 转发启动" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 刷新 PATH
Write-Host "`n1. 刷新环境变量..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")

# 检查 Stripe CLI
Write-Host "2. 检查 Stripe CLI..." -ForegroundColor Yellow
try {
    $version = stripe --version 2>&1
    Write-Host "   找到 Stripe CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "   错误: Stripe CLI 未找到" -ForegroundColor Red
    Write-Host "   请先运行: .\install-stripe-cli.ps1" -ForegroundColor Yellow
    pause
    exit 1
}

# 检查登录状态（尝试列出 webhooks）
Write-Host "3. 检查登录状态..." -ForegroundColor Yellow
$loginTest = stripe webhooks list --limit 1 2>&1
if ($loginTest -like "*login*" -or $loginTest -like "*authentication*") {
    Write-Host "   需要登录 Stripe" -ForegroundColor Yellow
    Write-Host "`n正在打开登录..." -ForegroundColor Cyan
    stripe login
    Write-Host "`n   登录完成" -ForegroundColor Green
} else {
    Write-Host "   已登录 Stripe" -ForegroundColor Green
}

# 启动 webhook 转发
Write-Host "`n4. 启动 Webhook 转发..." -ForegroundColor Yellow
Write-Host "   转发地址: http://localhost:3000/api/payment?action=webhook" -ForegroundColor Gray
Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  重要提示：" -ForegroundColor Yellow
Write-Host "  1. 请复制下面显示的 webhook secret (whsec_...)" -ForegroundColor White
Write-Host "  2. 更新到 .env.local 文件中" -ForegroundColor White
Write-Host "  3. 保持此窗口运行（不要关闭）" -ForegroundColor White
Write-Host "  4. 按 Ctrl+C 可停止转发" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

stripe listen --forward-to "localhost:3000/api/payment?action=webhook"

