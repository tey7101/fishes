# 停止开发服务器

Write-Host "🔍 查找运行中的 Node.js 服务器..." -ForegroundColor Cyan

# 查找 server.js 进程
$serverProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($serverProcesses) {
    Write-Host "找到 $($serverProcesses.Count) 个 Node.js 进程" -ForegroundColor Yellow
    
    foreach ($proc in $serverProcesses) {
        Write-Host "  - PID: $($proc.Id), 启动时间: $($proc.StartTime)" -ForegroundColor Gray
    }
    
    $response = Read-Host "`n是否停止所有 Node.js 进程? (y/N)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-Process -Name node -Force
        Write-Host "✅ 已停止所有 Node.js 服务器" -ForegroundColor Green
    } else {
        Write-Host "❌ 取消操作" -ForegroundColor Red
    }
} else {
    Write-Host "✅ 没有找到运行中的服务器" -ForegroundColor Green
}









