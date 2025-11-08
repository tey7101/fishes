# PowerShell 脚本：为所有 HTML 文件添加/更新 Google Analytics
# 使用方法：在项目根目录运行此脚本

$gaCode = @'
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-6FDEBZYFLT"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-6FDEBZYFLT');
    </script>
'@

# 获取所有 HTML 文件
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" }

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    # 检查是否已有 Google Analytics 代码
    if ($content -match 'G-6FDEBZYFLT' -or $content -match 'G-601YXTKK0L') {
        # 更新旧的 ID
        if ($content -match 'G-601YXTKK0L') {
            $content = $content -replace 'G-601YXTKK0L', 'G-6FDEBZYFLT'
            $modified = $true
            Write-Host "Updated: $($file.Name)" -ForegroundColor Yellow
        } else {
            Write-Host "Already updated: $($file.Name)" -ForegroundColor Green
        }
    } else {
        # 查找 </head> 标签，在其前插入代码
        if ($content -match '</head>') {
            $content = $content -replace '</head>', "$gaCode`n</head>"
            $modified = $true
            Write-Host "Added Google Analytics to: $($file.Name)" -ForegroundColor Cyan
        } else {
            Write-Host "Warning: No </head> tag found in $($file.Name)" -ForegroundColor Red
        }
    }
    
    # 保存修改
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
    }
}

Write-Host "`nDone! Google Analytics code has been added/updated to all HTML files." -ForegroundColor Green


