#!/usr/bin/env bash
# Antigravity Cockpit - Universal Environment Adoption Script (POSIX)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
GEMINI_DIR="$HOME/.gemini"

echo -e "\033[36m==========================================================\033[0m"
echo -e "\033[33m       ANTIGRAVITY COCKPIT - ENVIRONMENT ADOPTION         \033[0m"
echo -e "\033[36m==========================================================\033[0m"
echo "Source Repository: $REPO_DIR"
echo "Target Directory : $GEMINI_DIR"

mkdir -p "$GEMINI_DIR/config/skills"
mkdir -p "$GEMINI_DIR/config/plugins"

echo -e "\033[32m[1/3] Installing Global Rules (GEMINI.md)...\033[0m"
cp -f "$REPO_DIR/GEMINI.md" "$GEMINI_DIR/GEMINI.md"

echo -e "\033[32m[2/3] Installing 50+ Curated Skills...\033[0m"
cp -rf "$REPO_DIR/config/skills/"* "$GEMINI_DIR/config/skills/"

echo -e "\033[32m[3/3] Installing Plugins...\033[0m"
cp -rf "$REPO_DIR/config/plugins/"* "$GEMINI_DIR/config/plugins/"

echo -e "\033[36m==========================================================\033[0m"
echo -e "\033[32m [SUCCESS] Antigravity Cockpit adopted successfully!     \033[0m"
echo -e "\033[36m==========================================================\033[0m"
