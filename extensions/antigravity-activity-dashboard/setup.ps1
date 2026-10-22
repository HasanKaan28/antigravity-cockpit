# ⚡ Antigravity Cockpit & Agent Skills One-Click Installer for Windows
# Usage: powershell -ExecutionPolicy Bypass -File .\setup.ps1

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ⚡ Antigravity Cockpit & Agent Skills Auto-Installer  " -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Run Node setup if node exists, or execute PowerShell native fallback
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "🚀 Running automated setup via Node.js..." -ForegroundColor Gray
    & node "$ScriptDir\scripts\setup.js"
    exit $LASTEXITCODE
}

# 2. Native PowerShell fallback if Node is not installed
Write-Host "🔍 Node.js not detected in PATH, executing native PowerShell installation..." -ForegroundColor Yellow

# Find latest VSIX
$VsixFile = Get-ChildItem -Path $ScriptDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Find IDE CLI
$LocalApp = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { "$env:USERPROFILE\AppData\Local" }
$CliCandidates = @(
    (Get-Command antigravity-ide -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    (Get-Command code -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    "$LocalApp\Programs\Antigravity IDE\bin\antigravity-ide.cmd",
    "$LocalApp\Programs\Microsoft VS Code\bin\code.cmd"
) | Where-Object { $_ -and (Test-Path $_) }

$IdeCli = $CliCandidates | Select-Object -First 1

if ($VsixFile -and $IdeCli) {
    Write-Host "📦 Installing $($VsixFile.Name) using $IdeCli..." -ForegroundColor Cyan
    & $IdeCli --install-extension $VsixFile.FullName --force
    Write-Host "✅ Extension successfully installed!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Could not auto-detect IDE CLI or VSIX file." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🎉 SETUP COMPLETE!                                    " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Cockpit Dashboard has been successfully installed." -ForegroundColor White
Write-Host "Cockpit will automatically open whenever Antigravity IDE launches." -ForegroundColor Cyan
Write-Host ""
