# Stripe CLI Installation Script for Windows PowerShell
# Automatically downloads and installs Stripe CLI

$ErrorActionPreference = "Stop"

Write-Host "Stripe CLI Installation Wizard" -ForegroundColor Cyan
Write-Host ("=" * 60)

# Check if already installed
try {
    $existing = Get-Command stripe -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Stripe CLI is already installed" -ForegroundColor Green
        Write-Host "   Path: $($existing.Source)" -ForegroundColor Gray
        Write-Host "   Version: $(stripe --version)" -ForegroundColor Gray
        
        $continue = Read-Host "`nReinstall? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "`nUsing existing installation" -ForegroundColor Green
            exit 0
        }
    }
} catch {
    Write-Host "Stripe CLI not found, starting installation..." -ForegroundColor Blue
}

# Create temp directory
$tempDir = Join-Path $env:TEMP "stripe-cli-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Get latest version
Write-Host "`nFetching latest version info..." -ForegroundColor Yellow
try {
    $latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/stripe/stripe-cli/releases/latest"
    $version = $latestRelease.tag_name.TrimStart('v')
    $downloadUrl = "https://github.com/stripe/stripe-cli/releases/download/v$version/stripe_${version}_windows_x86_64.zip"
    
    Write-Host "   Latest version: v$version" -ForegroundColor Gray
} catch {
    Write-Host "Failed to fetch version info: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Download
Write-Host "`nDownloading Stripe CLI..." -ForegroundColor Yellow
$zipFile = Join-Path $tempDir "stripe.zip"
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "   Download complete" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "`nExtracting files..." -ForegroundColor Yellow
$extractDir = Join-Path $tempDir "extracted"
try {
    Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force
    Write-Host "   Extraction complete" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Install to user directory
Write-Host "`nInstalling to local directory..." -ForegroundColor Yellow
$installDir = Join-Path $env:LOCALAPPDATA "stripe-cli"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$exePath = Join-Path $extractDir "stripe.exe"
$targetPath = Join-Path $installDir "stripe.exe"

try {
    Copy-Item -Path $exePath -Destination $targetPath -Force
    Write-Host "   Installed to: $installDir" -ForegroundColor Green
} catch {
    Write-Host "Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add to PATH
Write-Host "`nConfiguring environment variables..." -ForegroundColor Yellow
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$installDir*") {
    $newPath = "$currentPath;$installDir"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "   Added to user PATH" -ForegroundColor Green
    
    # Refresh current session PATH
    $env:Path = "$env:Path;$installDir"
} else {
    Write-Host "   PATH already configured" -ForegroundColor Green
}

# Cleanup temp files
Write-Host "`nCleaning up temp files..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force

# Verify installation
Write-Host "`nVerifying installation..." -ForegroundColor Yellow
try {
    $versionOutput = & $targetPath --version 2>&1
    Write-Host "   Version: $versionOutput" -ForegroundColor Green
} catch {
    Write-Host "Installation verification failed" -ForegroundColor Red
    exit 1
}

# Success
Write-Host "`n" + ("=" * 60)
Write-Host "Stripe CLI installation complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Restart PowerShell or open a new terminal window" -ForegroundColor Gray
Write-Host "2. Run: stripe login" -ForegroundColor Gray
Write-Host "3. Run: stripe listen --forward-to localhost:3000/api/payment/webhook" -ForegroundColor Gray
Write-Host "`n" + ("=" * 60)
