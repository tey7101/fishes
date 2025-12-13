# 在外部窗口启动开发服务器
# 这样不会占用 Cursor AI 需要的终端

$projectPath = $PSScriptRoot

Write-Host "🚀 在外部窗口启动开发服务器..." -ForegroundColor Green
Write-Host "📂 项目路径: $projectPath" -ForegroundColor Cyan

# 检查是否已有服务器在运行
$existingServer = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*fish_art*" -or $_.CommandLine -like "*server.js*"
}

if ($existingServer) {
    Write-Host "⚠️  检测到已有服务器在运行 (PID: $($existingServer.Id))" -ForegroundColor Yellow
    $response = Read-Host "是否关闭现有服务器并重启? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-Process -Id $existingServer.Id -Force
        Write-Host "✅ 已关闭旧服务器" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "❌ 取消启动" -ForegroundColor Red
        exit
    }
}

# 在新窗口启动服务器
$windowTitle = "Fish Art Dev Server"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectPath'; `$host.UI.RawUI.WindowTitle = '$windowTitle'; Write-Host '🐠 Fish Art 开发服务器' -ForegroundColor Cyan; npm start"
)

Write-Host "`n✅ 服务器已在新窗口启动" -ForegroundColor Green
Write-Host "💡 提示: Cursor AI 终端现在可以自由使用了" -ForegroundColor Yellow
Write-Host "🔍 你可以在任务栏找到标题为 '$windowTitle' 的窗口" -ForegroundColor Cyan









