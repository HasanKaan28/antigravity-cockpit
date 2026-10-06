# Helper script to cleanly install and clobber the antigravity-clipboard-bridge plugin on Windows PowerShell
$TargetPaths = @(
    "$HOME\.gemini\config\plugins\clipboard",
    "$HOME\.gemini\antigravity-cli\plugins\clipboard"
)

Write-Host "Cleaning up existing plugin installations..." -ForegroundColor Cyan
foreach ($Path in $TargetPaths) {
    if (Test-Path $Path) {
        Write-Host "Removing existing plugin directory at: $Path" -ForegroundColor Yellow
        Remove-Item -Path $Path -Recurse -Force
    }
}

# Define the workspace path (checks current execution context first)
$CurrentDir = Get-Location
if (Test-Path "$CurrentDir\gemini-extension.json") {
    $WorkspacePath = $CurrentDir
} else {
    Write-Host "Could not automatically resolve workspace path from the current directory." -ForegroundColor Red
    $WorkspacePath = Read-Host "Please enter the absolute path to your cloned antigravity-clipboard-bridge directory"
}

Write-Host "Installing plugin from: $WorkspacePath" -ForegroundColor Cyan
agy plugins install $WorkspacePath

# Verify installation
$InstalledSKILL = "$HOME\.gemini\config\plugins\clipboard\skills\copy\SKILL.md"
if (Test-Path $InstalledSKILL) {
    Write-Host "Plugin successfully installed and clobbered!" -ForegroundColor Green
    Write-Host "Active Path: $(Split-Path $InstalledSKILL)" -ForegroundColor Green
} else {
    Write-Host "Warning: Plugin files were not detected in standard config path. Checking legacy path..." -ForegroundColor Yellow
    $LegacySKILL = "$HOME\.gemini\antigravity-cli\plugins\clipboard\skills\copy\SKILL.md"
    if (Test-Path $LegacySKILL) {
        Write-Host "Plugin successfully installed at legacy path: $(Split-Path $LegacySKILL)" -ForegroundColor Green
    } else {
        Write-Host "Error: Installation check failed. Please verify that 'agy plugins install' executed correctly." -ForegroundColor Red
    }
}
