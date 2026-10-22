#!/usr/bin/env bash
# ⚡ Antigravity Cockpit & Agent Skills One-Click Installer for macOS / Linux
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[36m========================================================\033[0m"
echo -e "\033[1;35m  ⚡ Antigravity Cockpit & Agent Skills Auto-Installer \033[0m"
echo -e "\033[36m========================================================\033[0m"
echo ""

if command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/scripts/setup.js"
    exit 0
fi

echo -e "\033[33mNode.js not found in PATH, running shell installer fallback...\033[0m"

# Find latest VSIX
VSIX_FILE=$(ls -t "$SCRIPT_DIR"/*.vsix 2>/dev/null | head -n 1)

# Find IDE CLI
CLI=""
if command -v antigravity-ide >/dev/null 2>&1; then
    CLI="antigravity-ide"
elif command -v code >/dev/null 2>&1; then
    CLI="code"
elif [ -f "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" ]; then
    CLI="/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CLI="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
fi

if [ -n "$VSIX_FILE" ] && [ -n "$CLI" ]; then
    echo -e "\033[36mInstalling $VSIX_FILE using $CLI...\033[0m"
    "$CLI" --install-extension "$VSIX_FILE" --force
    echo -e "\033[32m✅ Extension installed successfully!\033[0m"
fi

echo ""
echo -e "\033[32m========================================================\033[0m"
echo -e "\033[1;32m  🎉 SETUP COMPLETE!\033[0m"
echo -e "\033[32m========================================================\033[0m"
echo "Cockpit Dashboard has been successfully installed."
echo "Cockpit will automatically open whenever Antigravity IDE launches."
