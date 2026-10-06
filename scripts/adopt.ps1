<#
.SYNOPSIS
    Antigravity Cockpit - Universal Environment Adoption Script (Windows)
    Automatically installs all curated rules, 50+ skills, and plugins into ~/.gemini/
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir
$geminiDir = Join-Path $env:USERPROFILE ".gemini"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       ANTIGRAVITY COCKPIT - ENVIRONMENT ADOPTION         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Source Repository: $repoDir" -ForegroundColor White
Write-Host "Target Directory : $geminiDir" -ForegroundColor White

# 1. Target Directories
$configDir = Join-Path $geminiDir "config"
$skillsTarget = Join-Path $configDir "skills"
$pluginsTarget = Join-Path $configDir "plugins"

New-Item -ItemType Directory -Path $skillsTarget -Force | Out-Null
New-Item -ItemType Directory -Path $pluginsTarget -Force | Out-Null

# 2. Global Rules (GEMINI.md)
Write-Host "[1/3] Installing Global Rules (GEMINI.md)..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "GEMINI.md") (Join-Path $geminiDir "GEMINI.md") -Force

# 3. Skills
Write-Host "[2/3] Installing 50+ Curated Skills..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "config\skills\*") $skillsTarget -Recurse -Force

# 4. Plugins
Write-Host "[3/3] Installing Plugins (antigravity-clipboard-bridge)..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "config\plugins\*") $pluginsTarget -Recurse -Force

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] Antigravity Cockpit başarıyla kuruldu!         " -ForegroundColor Green
Write-Host " Tüm kurallar, 50+ yetenek ve eklentiler kullanıma hazır." -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
