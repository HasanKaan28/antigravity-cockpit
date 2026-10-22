# Project Context — antigravity-activity-dashboard (Production v2.0.0 Snapshot)

## Core Stack & Architecture
- **Environment**: Antigravity IDE / VS Code Extension (`engines.vscode: ^1.80.0`), CommonJS, Version 2.0.0.
- **Entry Points**:
  - `extension.js`: Root proxy re-exporting `src/extension.js`.
  - `src/extension.js`: Extension activation, command registration, status bar item, serializer handler, and background quota monitoring.
  - `src/webviewProvider.js`: Panel creation with crypto nonce, strict CSP, stale-while-revalidate background refresh, and validated message router.
- **Security & Execution Layer**:
  - `src/util/proc.js`: Promisified `execFileAsync` (`shell: false`, `windowsHide: true`, timeouts, buffer safety), safe browser launcher, and `createPool` concurrency limiter.
  - `src/util/security.js`: Validates external URLs (http/https only), parses and validates GitHub repository names (`owner/repo`), normalizes canonical keys, and verifies safe local paths.
  - Strict CSP: `default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} data: https:; connect-src 'none'`.
- **Modular Data Collectors (`src/collectors/`)**:
  - `panel.js`: Asynchronous execution of `get_panel_data.py`. No hardcoded PII/email. Honest offline badge if SQLite is locked or unavailable.
  - `cbm.js`: Asynchronous scanner of `~/.cache/codebase-memory-mcp/`. Exact canonical path key (`C-Users-...`) and exact project name match (no false-positive substring matching).
  - `sessions.js`: Streaming readline parser for `transcript.jsonl` stopping on first `USER_INPUT`. In-memory `mtimeMs` cache prevents reading untouched sessions.
  - `github.js`: Asynchronous `gh repo list` with argument arrays. Merges custom repositories and caches to disk.
  - `projects.js`: Async discovery across workspace folders, `~/github-repos`, and configured `scanRoots`. Git inspections throttled via `createPool(4)`.
  - `system.js`: Real telemetry probing (GPU via `nvidia-smi`, Ollama local HTTP API `http://127.0.0.1:11434/api/tags`, vault git status, CBM installation).
- **Storage Layer (`src/storage.js`)**:
  - Located in `~/.antigravity_cockpit/{favorites,archived,custom_repos,github_repos_cache}.json`.
  - Canonical IDs: `github:owner/repo` for GitHub, normalized forward-slash paths (`c:/path/...`) for local projects. No basename collision bugs.
- **Webview UI (`media/`)**:
  - `media/dashboard.html`: Minimal, semantic HTML template without inline scripts or inline `onclick` handlers. Theme switcher dropdown and Settings modal integration.
  - `media/dashboard.css`: Cyberpunk Deep Space theme, glassmorphism, glowing gauges, and local `@font-face` definitions for Outfit and JetBrains Mono. Full token suites for 6 theme families: `dark` (Deep Space), `cockpit-classic`, `tokyo-night`, `catppuccin`, `solarized`, and `hc` (High Contrast) across both Dark and Light variants. Respects `prefers-reduced-motion`.
  - `media/dashboard.js`: Zero inline JavaScript. Single global event delegation listener via `data-action` attributes. Web Audio synthesizer with user toggle (saved via `vscode.setState`). Visibility-aware & theme-aware canvas particle loop with battery optimization (pauses/sleeps on zero canvas opacity and reduced motion). Frozen `BASE_ICONS` snapshot preventing cross-theme SVG icon leakage.
- **Tooling & Scripts (`scripts/`)**:
  - `scripts/graphify-cyberpunk.js`: Generates enriched Cyberpunk Deep Space Observatory graph (`graphify-out/graph.html`) with HUD, God nodes, Freeze, Reset, and Ctrl+K search.
  - `scripts/dev-preview.js`: Generates browser preview `preview.html` with non-PII mock data.
  - `scripts/install-local.js`: Packages and installs `.vsix` into Antigravity IDE and syncs live runtime extensions directory.
  - `scripts/sync-live.js`: Synchronizes active changes directly to `~/.antigravity-ide/extensions/` for instant live reload.

## Mandatory Live Sync Protocol ("Ekrandaki Dashboardı Güncelle")
- **Active Extension Directory**: `~/.antigravity-ide/extensions/antigravity-local.antigravity-activity-dashboard-*`.
- **Automatic Live Sync**: Whenever ANY changes are made in the workspace (`media/`, `src/`, etc.), ALWAYS execute `npm run sync-live` immediately.
- **Hot-Reload Support**: `src/extension.js` includes a file system watcher on `**/media/dashboard.*` that triggers instant re-rendering of the open webview panel.
- **Packaging & Installation**: `npm run package` builds the `.vsix`, and `npm run install-local` installs it directly via `antigravity-ide.cmd --install-extension <vsix> --force`.

## Testing & Verification
- Unit test suite (`npm run test:unit`): 25 passing tests covering security utils, storage canonical IDs, transcript parsing, and CBM exact matching.
- E2E test suite (`node test/e2e-verify.js`): 13/13 passing steps using real Microsoft Edge and Playwright (including Theme switching & New Theme Suite verification).
- Packaging (`npm run package`): Produces `antigravity-activity-dashboard-2.2.0.vsix`.
- Local installation (`npm run install-local`): Verified installed in Antigravity IDE (`antigravity-local.antigravity-activity-dashboard@2.2.0`).
