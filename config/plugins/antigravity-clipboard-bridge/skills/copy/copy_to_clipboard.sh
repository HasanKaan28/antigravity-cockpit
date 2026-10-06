#!/bin/bash
# Agent Bridge Clipboard copy utility script
# Enable debug mode by creating a file named '.clipboard_debug' in the agent working directory
# or by setting ABC_DEBUG=1 in the environment.
DEBUG=false
if [ -f ".clipboard_debug" ] || [ "$ABC_DEBUG" = "1" ] || [ "$CLAUDE_CLIPBOARD_DEBUG" = "1" ] || [ "$GEMINI_CLIPBOARD_DEBUG" = "1" ] || [ "$CODEX_CLIPBOARD_DEBUG" = "1" ] || [ "$ANTIGRAVITY_CLIPBOARD_DEBUG" = "1" ]; then
    DEBUG=true
    DEBUG_LOG="clipboard_debug.log"
    echo "--- $(date) ---" >> "$DEBUG_LOG"
    echo "Args: $*" >> "$DEBUG_LOG"
fi

log_debug() {
    if [ "$DEBUG" = true ]; then
        echo "$1" >> "$DEBUG_LOG"
    fi
}

# Detect if we are in a container/sandbox
IS_SANDBOX=false
if [ -f "/.dockerenv" ] || grep -q "docker" /proc/self/cgroup 2>/dev/null; then
    IS_SANDBOX=true
    log_debug "Sandbox/Container detected"
fi

# 0. Handle Input
if [ "$1" = "--accept" ]; then
    if [ -f ".bridge_clipboard_cache" ]; then
        input=$(cat .bridge_clipboard_cache)
        log_debug "Accepted bridge clipboard value from cache"
    else
        echo "No bridge clipboard value available to accept."
        exit 1
    fi
elif [ $# -eq 0 ]; then
    if [ -t 0 ]; then
        # Stdin is a TTY, no arguments provided - nothing to copy
        log_debug "No input provided and stdin is a TTY"
        exit 0
    fi
    input=$(cat)
else
    input="$*"
fi

encoded=$(printf "%s" "$input" | base64 | tr -d '\n')
osc52_sequence=$(printf "\e]52;c;%s\a" "$encoded")

# Wrap for Tmux passthrough if needed
if [ -n "$TMUX" ]; then
    log_debug "TMUX detected, wrapping OSC 52 sequence"
    osc52_sequence=$(printf "\ePtmux;\e%s\e\\" "$osc52_sequence")
elif [ -n "$STY" ]; then
    log_debug "GNU Screen detected, wrapping OSC 52 sequence"
    osc52_sequence=$(printf "\eP%s\e\\" "$osc52_sequence")
fi

# 0. Try WebSocket Sync (instantly synchronizes across all connected agents in the Bridge)
# Only publish if we are NOT performing an accept operation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$1" != "--accept" ] && [ -f "$SCRIPT_DIR/send-clip.js" ] && [ "$ABC_DISABLE_SYNC" != "1" ]; then
    log_debug "Attempting WebSocket sync via send-clip.js in the background"
    role=${ABC_ROLE:-worker}
    node "$SCRIPT_DIR/send-clip.js" "$input" --role="$role" 2>/dev/null &
fi

# 1. Primary: Platform-Native Tools (WSL/macOS/Linux)
# Only attempt native tools if NOT in a sandbox (usually lack host access)
if [ "$IS_SANDBOX" = false ]; then
    # WSL / Windows
    if grep -qi microsoft /proc/version 2>/dev/null; then
        log_debug "Detected WSL/Microsoft environment"
        if command -v clip.exe >/dev/null; then
            log_debug "Found clip.exe, using it"
            if printf "%s" "$input" | clip.exe 2>/dev/null; then
                echo "Copied via clip.exe (WSL)" >&2
                exit 0
            else
                log_debug "clip.exe failed, falling back"
            fi
        elif command -v powershell.exe >/dev/null; then
            log_debug "Found powershell.exe, using it with UTF-8 encoding"
            # Set UTF8 encoding to prevent corruption of non-ASCII characters
            if printf "%s" "$input" | powershell.exe -NoProfile -NonInteractive -Command "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; \$input | Set-Clipboard" 2>/dev/null; then
                echo "Copied via PowerShell (WSL → Windows)" >&2
                exit 0
            else
                log_debug "powershell.exe failed, falling back"
            fi
        fi
    fi

    # macOS
    if [[ "$OSTYPE" == "darwin"* ]] && command -v pbcopy >/dev/null; then
        log_debug "Detected macOS, using pbcopy"
        if printf "%s" "$input" | pbcopy 2>/dev/null; then
            echo "Copied via pbcopy (macOS)" >&2
            exit 0
        else
            log_debug "pbcopy failed, falling back"
        fi
    fi

    # Linux (Desktop)
    if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
        if command -v wl-copy >/dev/null; then
            log_debug "Detected Wayland, using wl-copy"
            if printf "%s" "$input" | wl-copy 2>/dev/null; then
                echo "Copied via wl-copy (Wayland)" >&2
                exit 0
            else
                log_debug "wl-copy failed, falling back"
            fi
        elif command -v xclip >/dev/null; then
            log_debug "Detected X11, using xclip"
            if printf "%s" "$input" | xclip -selection clipboard 2>/dev/null; then
                echo "Copied via xclip (X11)" >&2
                exit 0
            else
                log_debug "xclip failed, falling back"
            fi
        elif command -v xsel >/dev/null; then
            log_debug "Detected X11, using xsel"
            if printf "%s" "$input" | xsel --clipboard --input 2>/dev/null; then
                echo "Copied via xsel (X11)" >&2
                exit 0
            else
                log_debug "xsel failed, falling back"
            fi
        fi
    fi
fi

# 2. Secondary: Direct SSH TTY bypass (Reliable for remote background/subshells)
if [ -n "$SSH_TTY" ] && [ -w "$SSH_TTY" ]; then
    log_debug "Writing OSC 52 to SSH_TTY: $SSH_TTY"
    if printf "%s" "$osc52_sequence" 2>/dev/null > "$SSH_TTY"; then
        echo "Copied via SSH TTY (OSC 52)" >&2
        exit 0
    else
        log_debug "Writing to SSH_TTY failed, falling back"
    fi
fi

# 3. Bypass Channels (Mandatory for Sandbox, Fallback for Native)
log_debug "Writing to sandbox bypass channels"

BYPASS_SUCCESS=false
# Write to a regular file using atomic move
printf "%s" "$osc52_sequence" > .clipboard_bypass.tmp
if mv .clipboard_bypass.tmp .clipboard_bypass 2>/dev/null; then
    log_debug "Wrote to .clipboard_bypass"
    echo "Copied via sandbox bypass file (.clipboard_bypass)" >&2
    BYPASS_SUCCESS=true
fi

# Write to a FIFO if it exists
if [ -p ".clipboard_pipe" ]; then
    log_debug "Writing to .clipboard_pipe"
    if printf "%s" "$osc52_sequence" > .clipboard_pipe 2>/dev/null & then
        log_debug "Wrote to .clipboard_pipe"
        if [ "$BYPASS_SUCCESS" = false ]; then
            echo "Copied via sandbox bypass pipe (.clipboard_pipe)" >&2
            BYPASS_SUCCESS=true
        fi
    fi
fi

# If bypass succeeded, exit immediately to avoid falling through and polluting stdout/TTY
if [ "$BYPASS_SUCCESS" = true ]; then
    exit 0
fi

# 4. Direct TTY write (Secondary fallback)
# In some sandboxes, /dev/tty is writable but isolated. 
if [ -w "/dev/tty" ]; then
    log_debug "Writing OSC 52 to /dev/tty"
    if printf "%s" "$osc52_sequence" 2>/dev/null > /dev/tty; then
        if [ "$IS_SANDBOX" = false ]; then
            if [ "$BYPASS_SUCCESS" = false ]; then
                echo "Copied via direct TTY (OSC 52)" >&2
            fi
            exit 0
        fi
    fi
fi

# 5. Last Resort: Stdout (Only if stdout is a TTY, to prevent polluting captured command outputs)
if [ -t 1 ]; then
    log_debug "Writing OSC 52 to stdout"
    printf "%s" "$osc52_sequence"
    if [ "$IS_SANDBOX" = false ] && [ "$BYPASS_SUCCESS" = false ]; then
        echo "Copied via stdout (OSC 52)" >&2
    fi
else
    log_debug "Stdout is not a TTY, skipping stdout OSC 52 write to avoid output pollution"
fi
