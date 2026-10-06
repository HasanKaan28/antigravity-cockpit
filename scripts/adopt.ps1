<#
.SYNOPSIS
    Antigravity Cockpit - Universal Environment Adoption Script (Windows)
    Automatically installs all curated rules, 50+ skills, plugins, and the startup Activity Dashboard.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir
$geminiDir = Join-Path $env:USERPROFILE ".gemini"
$extDir = Join-Path $env:USERPROFILE ".antigravity-ideextensionsantigravity-local.antigravity-activity-dashboard-2.0.0"

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
New-Item -ItemType Directory -Path $extDir -Force | Out-Null

# 2. Global Rules (GEMINI.md)
Write-Host "[1/4] Installing Global Rules (GEMINI.md)..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "GEMINI.md") (Join-Path $geminiDir "GEMINI.md") -Force

# 3. Skills
Write-Host "[2/4] Installing 50+ Curated Skills..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "config\skills\*") $skillsTarget -Recurse -Force

# 4. Plugins
Write-Host "[3/4] Installing Plugins (antigravity-clipboard-bridge)..." -ForegroundColor Green
Copy-Item (Join-Path $repoDir "config\plugins\*") $pluginsTarget -Recurse -Force

# 5. Activity Dashboard Extension (Auto-launch on startup)
Write-Host "[4/4] Installing Antigravity Activity Dashboard Extension..." -ForegroundColor Green
$dashboardSource = Join-Path $repoDir "extensions\antigravity-activity-dashboard"
if (Test-Path $dashboardSource) {
    Copy-Item "$dashboardSource\*" $extDir -Recurse -Force
    Write-Host "  [+] Cockpit Activity Dashboard kurulu ve IDE acilisinda otomatik baslamaya hazir!" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] Antigravity Cockpit basariyla kuruldu!         " -ForegroundColor Green
Write-Host " Tum kurallar, 50+ yetenek, eklentiler ve Cockpit Dashboard" -ForegroundColor White
Write-Host " bir sonraki IDE acilisinda otomatik devreye girecektir.  " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
