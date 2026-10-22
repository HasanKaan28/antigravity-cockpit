# ⚡ Antigravity Activity Dashboard & Cockpit

A Deep Space themed control panel for Antigravity IDE (and VS Code). When the IDE opens, it shows
local projects, GitHub repositories, recent Antigravity sessions, Codebase Memory (CBM)
index status, Graphify maps, and model quotas on a single screen.

## Features

- **Projects** — projects in the workspace, `~/github-repos`, and configurable scan roots;
  git branch, latest commit, uncommitted changes, Graphify and CBM badges. Favorites / archive.
- **GitHub** — repository list, cloning, and adding custom repositories (`owner/repo`) via the `gh` CLI.
- **Sessions** — recent sessions under `~/.gemini/antigravity-ide/brain`, with transcript and folder shortcuts.
- **Radar** — CBM-indexed projects and Graphify maps.
- **Antigravity Panel quotas** — Gemini / Claude quota gauges (from `n2ns.antigravity-panel` data).
- **System telemetry** — GPU, Ollama, brain-sync vault, CBM status (real detection).

## Installation

```powershell
npm install
npm run package        # produces antigravity-activity-dashboard-<version>.vsix
npm run install-local  # installs into Antigravity IDE (or VS Code if it is missing)
```

## Development

| Command | Description |
|---|---|
| `npm run lint` | ESLint |
| `npm run test:unit` | Mocha unit tests (no VS Code needed) |
| `npm run test:integration` | Integration test with `@vscode/test-electron` |
| `npm run preview` | Generates `preview.html` with sample (PII-free) data |

## Requirements (optional)

- `git`, `gh` (GitHub tab), Python 3 (quota reading), `nvidia-smi`, Ollama, codebase-memory-mcp.
  Any component that is not found is shown in the panel as **"Algılanmadı"** ("Not detected").

## Privacy

The only network access the extension uses is the `gh` CLI and the local `127.0.0.1:11434` (Ollama) address.
The webview runs under a strict Content-Security-Policy; all fonts are bundled locally.

## License

MIT
