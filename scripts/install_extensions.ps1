<#
.SYNOPSIS
    Antigravity Cockpit - Recommended IDE Extensions Installer
#>

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

Write-Host "Installing recommended extensions for Antigravity..." -ForegroundColor Cyan
foreach ($ext in $extensions) {
    try {
        & code --install-extension $ext --force
        Write-Host "  [+] Installed: $ext" -ForegroundColor Green
    } catch {
        Write-Warning "Could not install $ext via 'code' command."
    }
}
Write-Host "Done!" -ForegroundColor Green
