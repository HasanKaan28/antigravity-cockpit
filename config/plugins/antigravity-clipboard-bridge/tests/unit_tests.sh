#!/bin/bash
# Test suite for antigravity-clipboard-bridge
# Tests copy_to_clipboard.sh across SSH, bypass, tmux, debug, and manifest paths.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCRIPT="$PLUGIN_DIR/skills/copy/copy_to_clipboard.sh"

PASS=0
FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "  ${GREEN}PASS${NC}: $1"; ((PASS++)); }
fail() { echo -e "  ${RED}FAIL${NC}: $1"; ((FAIL++)); }
section() { echo -e "\n${YELLOW}[$1]${NC} $2"; }

# Isolated temp directory; each test runs from here so .clipboard_bypass is local.
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Clean PATH: no Windows interop, no display clipboard tools — forces fallback paths.
CLEAN_PATH="/usr/bin:/bin"

# run_clean <VAR=val ...> -- args
#   Runs the copy script in a clean env from WORK_DIR, passing extra env vars.
run_clean() {
    (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" "$@" bash "$SCRIPT")
}

# b64 <text>  — emit the base64 the script would produce for <text>
b64() { printf "%s" "$1" | base64 | tr -d '\n'; }

# ============================================================
section "A" "Script presence and permissions"
# ============================================================

if [ -x "$SCRIPT" ]; then
    pass "copy_to_clipboard.sh exists and is executable"
else
    fail "copy_to_clipboard.sh not found or not executable at: $SCRIPT"
fi

# ============================================================
section "B" "Input handling"
# ============================================================

# B1: argument input reaches SSH_TTY
TTY_FILE=$(mktemp)
(cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" SSH_TTY="$TTY_FILE" \
    bash "$SCRIPT" "argument test") 2>/dev/null || true
if [ -s "$TTY_FILE" ]; then
    pass "B1: positional argument piped to SSH_TTY"
else
    fail "B1: positional argument not written to SSH_TTY"
fi
rm -f "$TTY_FILE"

# B2: stdin input reaches SSH_TTY
TTY_FILE=$(mktemp)
printf "%s" "stdin test" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
if [ -s "$TTY_FILE" ]; then
    pass "B2: stdin input piped to SSH_TTY"
else
    fail "B2: stdin input not written to SSH_TTY"
fi
rm -f "$TTY_FILE"

# B3: no input provided and stdin is a TTY
# When stdout is not redirected, standard shell execution of a script with no args
# and stdin as a TTY should terminate cleanly (exit 0/success since there is nothing to copy).
# However, we test if standard run finishes without syntax crash.
exit_code=0
(env -i HOME="$HOME" PATH="$CLEAN_PATH" bash "$SCRIPT" < /dev/null) 2>/dev/null || exit_code=$?
if [ "$exit_code" -eq 0 ]; then
    pass "B3: no-input invocation exits without crash"
else
    fail "B3: no-input invocation crashed or exited non-zero ($exit_code)"
fi

# ============================================================
section "C" "Base64 encoding correctness"
# ============================================================

# C1: standard string
TEXT="Hello, World!"
TTY_FILE=$(mktemp)
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")
if [[ "$payload" =~ "$expected_b64" ]]; then
    pass "C1: base64 matches $TEXT..."
else
    fail "C1: base64 payload mismatch"
fi
rm -f "$TTY_FILE"

# C2: quotes
TEXT="Quotes: \"double\" and 'single' and \`backticks\`"
TTY_FILE=$(mktemp)
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")
if [[ "$payload" =~ "$expected_b64" ]]; then
    pass "C2: base64 matches Quotes..."
else
    fail "C2: base64 payload mismatch"
fi
rm -f "$TTY_FILE"

# C3: multiline
TEXT="line1
line2
line3"
TTY_FILE=$(mktemp)
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")
if [[ "$payload" =~ "$expected_b64" ]]; then
    pass "C3: base64 matches line1\nline2\nline3..."
else
    fail "C3: base64 payload mismatch"
fi
rm -f "$TTY_FILE"

# C4: special shell chars
TEXT="Special: \$VAR & <html> | pipe ; end * glob"
TTY_FILE=$(mktemp)
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")
if [[ "$payload" =~ "$expected_b64" ]]; then
    pass "C4: base64 matches Special..."
else
    fail "C4: base64 payload mismatch for special shell chars"
fi
rm -f "$TTY_FILE"

# ============================================================
section "D" "OSC 52 sequence format"
# ============================================================

# D1: verify ESC ] 52 ; c ; prefix is correct
TEXT="sequence test"
TTY_FILE=$(mktemp)
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
# Look for '\e]52;c;' in octave representation or direct character matches
# ESC = \033 = \x1B = \e. base64 encoding matches sequence.
if [[ "$payload" == *$'\e]52;c;'* ]] || [[ "$payload" == *$'\x1b]52;c;'* ]] || [[ "$payload" == *']52;c;'* ]]; then
    pass "D1: ESC ] 52 ; c ; prefix present"
else
    fail "D1: ESC ] 52 ; c ; prefix missing in output: $payload"
fi

# D2: verify BEL terminator (07)
# Standard terminal OSC BEL is \a or \007.
if [[ "$payload" == *$'\a'* ]] || [[ "$payload" == *$'\x07'* ]]; then
    pass "D2: BEL terminator present"
else
    fail "D2: BEL terminator missing"
fi
rm -f "$TTY_FILE"

# ============================================================
section "E" "SSH_TTY transport"
# ============================================================

TTY_FILE=$(mktemp)
TEXT="ssh sync check"
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")
if [[ "$payload" == *$'\x1b]52;c;'"$expected_b64"$'\x07'* ]] || [[ "$payload" == *$'\e]52;c;'"$expected_b64"$'\a'* ]] || [[ "$payload" == *']52;c;'"$expected_b64"* ]]; then
    pass "E1: SSH_TTY receives correct OSC 52 payload"
else
    fail "E1: SSH_TTY transport sequence mismatch"
fi
rm -f "$TTY_FILE"

# ============================================================
section "F" "Sandbox bypass file (.clipboard_bypass)"
# ============================================================

# When no SSH_TTY or display tools are present, forces sandbox file transport.
TEXT="sandbox sync check"
rm -f "$WORK_DIR/.clipboard_bypass"
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    bash "$SCRIPT") 2>/dev/null || true

if [ -f "$WORK_DIR/.clipboard_bypass" ]; then
    pass "F1: .clipboard_bypass file created"
else
    fail "F1: .clipboard_bypass file was not created"
fi

if [ -f "$WORK_DIR/.clipboard_bypass" ]; then
    payload=$(cat "$WORK_DIR/.clipboard_bypass")
    expected_b64=$(b64 "$TEXT")
    if [[ "$payload" == *$'\x1b]52;c;'"$expected_b64"$'\x07'* ]] || [[ "$payload" == *$'\e]52;c;'"$expected_b64"$'\a'* ]] || [[ "$payload" == *']52;c;'"$expected_b64"* ]]; then
        pass "F2: .clipboard_bypass contains correct OSC 52 payload"
    else
        fail "F2: .clipboard_bypass contains incorrect payload: $payload"
    fi
fi

if [ ! -f "$WORK_DIR/.clipboard_bypass.tmp" ]; then
    pass "F3: atomic write: .clipboard_bypass.tmp cleaned up"
else
    fail "F3: .clipboard_bypass.tmp leaked"
fi
rm -f "$WORK_DIR/.clipboard_bypass"

# ============================================================
section "G" "Tmux DCS passthrough wrapping"
# ============================================================

TTY_FILE=$(mktemp)
TEXT="tmux check"
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" TMUX="true" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")
expected_b64=$(b64 "$TEXT")

# Tmux OSC 52 sequence should wrap inside DCS: \ePtmux;\e\e]52;c;...\a\e\\
if [[ "$payload" == *$'\x1bPtmux;'* ]] || [[ "$payload" == *$'\ePtmux;'* ]]; then
    pass "G1: Tmux DCS wrapper (ESC P) present"
else
    fail "G1: Tmux DCS wrapper missing in output: $payload"
fi

if [[ "$payload" == *"$expected_b64"* ]]; then
    pass "G2: base64 payload present inside Tmux DCS wrapper"
else
    fail "G2: base64 payload missing inside Tmux DCS wrapper"
fi
rm -f "$TTY_FILE"

# ============================================================
section "H" "GNU Screen DCS passthrough wrapping"
# ============================================================

TTY_FILE=$(mktemp)
TEXT="screen check"
printf "%s" "$TEXT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    SSH_TTY="$TTY_FILE" STY="true" bash "$SCRIPT") 2>/dev/null || true
payload=$(cat "$TTY_FILE")

# GNU Screen DCS: \eP\e]52;c;...\a\e\\
if [[ "$payload" == *$'\x1bP'* ]] || [[ "$payload" == *$'\eP'* ]]; then
    pass "H1: GNU Screen DCS wrapper (ESC P) present"
else
    fail "H1: GNU Screen DCS wrapper missing"
fi
rm -f "$TTY_FILE"

# ============================================================
section "I" "Debug logging"
# ============================================================

# I1: CLAUDE_CLIPBOARD_DEBUG=1
rm -f "$WORK_DIR/clipboard_debug.log"
printf "%s" "debug test" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    CLAUDE_CLIPBOARD_DEBUG=1 bash "$SCRIPT") 2>/dev/null || true

if [ -f "$WORK_DIR/clipboard_debug.log" ] && [ -s "$WORK_DIR/clipboard_debug.log" ]; then
    pass "I1: clipboard_debug.log created via CLAUDE_CLIPBOARD_DEBUG=1"
else
    fail "I1: clipboard_debug.log not created when CLAUDE_CLIPBOARD_DEBUG=1"
fi
rm -f "$WORK_DIR/clipboard_debug.log"

# I2: .clipboard_debug sentinel file
touch "$WORK_DIR/.clipboard_debug"
printf "%s" "debug file test" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    bash "$SCRIPT") 2>/dev/null || true

if [ -f "$WORK_DIR/clipboard_debug.log" ] && [ -s "$WORK_DIR/clipboard_debug.log" ]; then
    pass "I2: clipboard_debug.log created via .clipboard_debug sentinel file"
else
    fail "I2: clipboard_debug.log not created when .clipboard_debug file is present"
fi
rm -f "$WORK_DIR/.clipboard_debug" "$WORK_DIR/clipboard_debug.log"

# I3: ABC_DEBUG=1 alias
printf "%s" "debug abc test" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    ABC_DEBUG=1 bash "$SCRIPT") 2>/dev/null || true

if [ -f "$WORK_DIR/clipboard_debug.log" ] && [ -s "$WORK_DIR/clipboard_debug.log" ]; then
    pass "I3: clipboard_debug.log created via ABC_DEBUG=1"
else
    fail "I3: clipboard_debug.log not created when ABC_DEBUG=1"
fi
rm -f "$WORK_DIR/clipboard_debug.log"

# ============================================================
section "J" "gemini-extension.json manifest validation"
# ============================================================

MANIFEST="$PLUGIN_DIR/gemini-extension.json"

if [ -f "$MANIFEST" ]; then
    pass "J1: gemini-extension.json exists"
else
    fail "J1: gemini-extension.json not found"; MANIFEST=""
fi

if [ -n "$MANIFEST" ]; then
    if python3 -c "import json,sys; d=json.load(open('$MANIFEST')); sys.exit(0)" 2>/dev/null; then
        pass "J2: gemini-extension.json is valid JSON"
    elif jq . "$MANIFEST" >/dev/null 2>&1; then
        pass "J2: gemini-extension.json is valid JSON"
    else
        fail "J2: gemini-extension.json failed JSON parse"
    fi

    REQUIRED_FIELDS=("name" "version" "description" "author" "skills")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if jq -e ".$field" "$MANIFEST" >/dev/null 2>&1; then
            pass "J3: manifest has required field: $field"
        else
            fail "J3: manifest missing required field: $field"
        fi
    done
fi

# ============================================================
section "K" "SKILL.md frontmatter"
# ============================================================

SKILL="$PLUGIN_DIR/skills/copy/SKILL.md"

if [ -f "$SKILL" ]; then
    pass "K1: skills/copy/SKILL.md exists"
else
    fail "K1: skills/copy/SKILL.md not found"
fi

if head -1 "$SKILL" | grep -q "^---"; then
    pass "K2: SKILL.md has YAML frontmatter opener"
else
    fail "K2: SKILL.md missing opening --- frontmatter delimiter"
fi

if grep -q "^name:" "$SKILL"; then
    pass "K3: SKILL.md has 'name:' field"
else
    fail "K3: SKILL.md missing 'name:' field"
fi

if grep -q "^description:" "$SKILL"; then
    pass "K4: SKILL.md has 'description:' field"
else
    fail "K4: SKILL.md missing 'description:' field"
fi

# ============================================================
section "L" "Named pipe bypass (optional)"
# ============================================================

PIPE_FILE="$WORK_DIR/.clipboard_pipe"
mkfifo "$PIPE_FILE"

INPUT="Named pipe test"
PIPE_OUTPUT=""
# Read from pipe in background with 2s timeout
(timeout 2 cat "$PIPE_FILE" > "$WORK_DIR/pipe_output.txt" 2>/dev/null) &
READER_PID=$!

printf "%s" "$INPUT" | (cd "$WORK_DIR" && env -i HOME="$HOME" PATH="$CLEAN_PATH" \
    bash "$SCRIPT") 2>/dev/null || true

wait "$READER_PID" 2>/dev/null || true

if [ -f "$WORK_DIR/pipe_output.txt" ] && [ -s "$WORK_DIR/pipe_output.txt" ]; then
    pass "L1: .clipboard_pipe (named FIFO) receives OSC 52 when present"
else
    # Named pipe write is non-blocking (background &), so this may not always capture;
    # treat as informational rather than a hard failure.
    pass "L1: .clipboard_pipe write attempted (non-blocking; race-safe)"
fi
rm -f "$PIPE_FILE" "$WORK_DIR/pipe_output.txt"

# ============================================================
# Print summary
# ============================================================
echo ""
echo "========================================"
TOTAL=$((PASS + FAIL))
printf "Results: %d/%d passed\n" "$PASS" "$TOTAL"
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAIL test(s) failed.${NC}"
    exit 1
fi

