<#
.SYNOPSIS
    Antigravity Cockpit - Recommended IDE Extensions Installer
    Installs essential extensions from marketplace and local Activity Dashboard VSIX.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir

$extensions = @(
    "kaushiksaravanan.auto-accept-antigravity",
    "n2ns.antigravity-panel",
    "mikesoft.vscode-antigravity-cli-launcher",
    "cafetechne.antigravity-link-extension",
    "marcodiniz.ag-local-bridge",
    "coderabbit.coderabbit-vscode",
    "ms-edgedevtools.vscode-edge-devtools",
    "googlecloudtools.datacloud",
    "ms-vscode.powershell",
    "ms-python.python",
    "ms-toolsai.jupyter",
    "ms-azuretools.vscode-docker"
)

Write-Host "Installing recommended marketplace extensions for Antigravity..." -ForegroundColor Cyan
foreach ($ext in $extensions) {
    try {
        & code --install-extension $ext --force
        Write-Host "  [+] Installed: $ext" -ForegroundColor Green
    } catch {
        Write-Warning "Could not install $ext via 'code' command."
    }
}

# Install local Activity Dashboard VSIX if available
$vsixPath = Join-Path $repoDir "extensions\antigravity-activity-dashboard-2.0.0.vsix"
if (Test-Path $vsixPath) {
    Write-Host "Installing Antigravity Activity Dashboard VSIX..." -ForegroundColor Cyan
    try {
        & code --install-extension $vsixPath --force
        Write-Host "  [+] Installed Cockpit Dashboard VSIX successfully!" -ForegroundColor Green
    } catch {
        Write-Warning "Could not install VSIX via 'code' command. Falling back to direct extension folder copy via adopt.ps1."
    }
}

Write-Host "Done!" -ForegroundColor Green
