#!/bin/bash
# Integration test for clipboard
# This script verifies downstream-specific integration, branding, and paths.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Antigravity Clipboard Bridge Integration Tests ===${NC}\n"

ERRORS=0

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "[${GREEN}PASS${NC}] File exists: $file"
    else
        echo -e "[${RED}FAIL${NC}] File missing: $file"
        ERRORS=$((ERRORS + 1))
    fi
}

check_file_missing() {
    local file=$1
    if [ ! -e "$file" ]; then
        echo -e "[${GREEN}PASS${NC}] File/Directory successfully removed: $file"
    else
        echo -e "[${RED}FAIL${NC}] File/Directory still exists: $file"
        ERRORS=$((ERRORS + 1))
    fi
}

check_branding() {
    local file=$1
    local pattern="gemini-clipboard-bridge"
    if grep -q "$pattern" "$file"; then
        echo -e "[${RED}FAIL${NC}] Branding leaked in $file: Found '$pattern'"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "[${GREEN}PASS${NC}] Branding clean in $file"
    fi
}

# 1. Verify Directory Structure
echo -e "${BLUE}Checking Directory Structure...${NC}"
check_file "skills/copy/SKILL.md"
check_file "skills/copy/copy_to_clipboard.sh"
check_file_missing "scripts"
check_file_missing "skills/copy/copy.sh"
check_file_missing "skills/help"

# Verify rules directory has been deleted
if [ -d "rules" ] || [ -f "rules/clipboard.md" ]; then
    echo -e "[${RED}FAIL${NC}] rules folder or rules/clipboard.md still exists"
    ERRORS=$((ERRORS + 1))
else
    echo -e "[${GREEN}PASS${NC}] rules folder and rules/clipboard.md have been successfully removed"
fi

# Verify Redundant Instructions Deletion
if [ -f "INSTRUCTIONS.md" ]; then
    echo -e "[${RED}FAIL${NC}] Redundant INSTRUCTIONS.md still exists"
    ERRORS=$((ERRORS + 1))
else
    echo -e "[${GREEN}PASS${NC}] Redundant INSTRUCTIONS.md has been deleted"
fi

# 2. Verify Branding (No upstream names in downstream files)
echo -e "\n${BLUE}Verifying Branding...${NC}"
check_branding "skills/copy/SKILL.md"

# 3. Verify Script Executability
echo -e "\n${BLUE}Verifying Script Permissions...${NC}"
if [ -x "skills/copy/copy_to_clipboard.sh" ]; then
    echo -e "[${GREEN}PASS${NC}] skills/copy/copy_to_clipboard.sh is executable"
else
    echo -e "[${RED}FAIL${NC}] skills/copy/copy_to_clipboard.sh is NOT executable"
    ERRORS=$((ERRORS + 1))
fi

# 4. Verify Skill Name Re-branding
echo -e "\n${BLUE}Verifying Skill Name...${NC}"
if grep -q "name: copy" "skills/copy/SKILL.md" && ! grep -q "name: Clipboard Bridge" "skills/copy/SKILL.md"; then
    echo -e "[${GREEN}PASS${NC}] Skill name correctly rebranded to copy"
else
    echo -e "[${RED}FAIL${NC}] Skill name rebranding failed in SKILL.md"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n${BLUE}Summary:${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All integration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS tests failed.${NC}"
    exit 1
fi
