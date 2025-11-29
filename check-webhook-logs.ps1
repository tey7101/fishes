# 快速查看最新的 webhook 日志
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "最新的 Webhook 日志" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Get-Content "c:\Users\terry\.cursor\projects\d-BaiduSyncdisk-CODE-PRJ-fish-art-fish-art-code-workspace\terminals\20.txt" -Tail 100 | Select-String -Pattern "checkout|session|userId|planId|metadata|Missing|错误|Error" -Context 0,2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

