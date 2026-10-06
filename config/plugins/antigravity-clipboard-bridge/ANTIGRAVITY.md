# Workspace Memory & Learnings

Local development notes for `clipboard`.

## Architecture
- **Production Context**: `skills/help/SKILL.md` and `skills/copy/SKILL.md` define the plugin commands and system-level troubleshooting constraints.
- **Developer Context**: `ANTIGRAVITY.md` and `CONTRIBUTING.md` provide maintenance guidance.
- **Upstream Sync**: Use `make import-upstream` to pull core logic from `agent-bridge-clipboard`.

## Technical Constraints
- **OSC 52**: Write-only. Do not attempt to read the clipboard.
- **Path Resolution**: Use absolute, shell-expandable paths in `SKILL.md` instructions (e.g., `~/.gemini/antigravity-cli/plugins/clipboard/...`) to ensure scripts resolve properly regardless of the current working directory.
- **Environment Isolation**: In sandboxes (Docker), use the `.clipboard_bypass` listener on the host.
- **Windows/PowerShell Plugin Path**: On Windows hosts, `agy` may install plugins to `~/.gemini/config/plugins/clipboard/` (equivalent to `c:\Users\abron\.gemini\config\plugins\clipboard\`) instead of `.gemini/antigravity-cli/plugins/clipboard/`. Ensure path resolution handles this gracefully.
- **Sandbox Isolation on Windows**: Standard PowerShell terminal commands execute in an isolated container/sandbox where clipboard operations succeed silently but do not update the host clipboard. Bypassing the sandbox (specifying `BypassSandbox: true` or requesting `unsandboxed` execution) runs the command on the host (triggering standard Windows permission popup) and works reliably with native `Set-Clipboard`.
- **PowerShell Directory Cleanups**: Ensure folder uninstallation scripts use the correct PowerShell recursive directory deletion parameter (`-Recurse` instead of typos like `-Recurve`) to avoid crashing when existing folders are being clobbered.
