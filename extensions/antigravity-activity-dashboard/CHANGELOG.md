# Changelog

All notable changes to the **Antigravity Activity Dashboard & Cockpit** extension will be documented in this file.

## [2.3.0] — 2026-10-28

### Added
- **Mission Control UI**: the dashboard rebuilt from scratch with a resume strip, day-grouped sessions, keyboard navigation (`1`–`6`, arrows, `Enter`) and 10 theme families in dark and light (plus Match IDE) with WCAG-checked contrast.
- **Transcript viewer** restyled to match the Cockpit, with search, a prompt outline and copy actions.
- **Localized IDE notifications**: host-side messages follow the Cockpit language in all 7 languages.
- **Collector tests** for projects, GitHub, sessions and host strings; the i18n test checks every locale block.

### Changed
- **Faster refresh**: project repositories are inspected in parallel, the GitHub list needs a single `gh` call and renders from the cache first (about 0.6 s instead of 1.8 s).
- The last Turkish-only strings (GPU label, untitled sessions, session times) are localized or dropped.

### Security
- Git runs with repo-controlled hooks, fsmonitor, signature checks and attribute filters turned off, so a scanned repository cannot run programs on the machine.
- Browser launches are limited to http(s) URLs and local HTML files; the PowerShell fallback is gone.
- Stricter validation for Graphify and transcript paths, the language setting and repository names; the webview no longer loads remote images.

### Fixed
- Favorites and archive state stick without a refresh.
- The refresh command and automatic opening no longer create duplicate panels.

### Removed
- Codebase Memory (CBM) integration.
- Local AI engine support (Ollama / LM Studio detection, start/stop and the settings card).

## [2.2.0] — 2026-10-11

### Added
- **Interactive Skills Arsenal Tab**: Dedicated dashboard tab showcasing all 21 bundled skills with category filtering, real-time search, one-click trigger copying, rule inspection, and new chat launcher.
- **50+ Bundled Agent Skills**: Included 54 curated production agent skills (`skills/`) such as Graphify, Headroom, Taste Skill, Clean Code, Local Code Engine, etc.
- **Automated Zero-Touch Setup**: Added `setup.ps1`, `setup.sh`, `setup.bat`, and `scripts/setup.js` for instant cross-platform installation.
- **AI Agent Protocol**: Added `AGENTS.md` and `GEMINI.md` enabling AI agents to install the cockpit and skills autonomously with a single prompt.
- **Cross-Platform Portability**: Replaced all user path fallbacks with dynamic `os.homedir()` across all collectors and storage modules.
- **Pre-Packaged Release**: Included pre-compiled `.vsix` package in the repository for zero-dependency instant install.

## [2.1.0] — 2026-10-10

### Added
- **Internationalization (i18n)**: Full localization engine supporting English, Turkish, German, Spanish, French, Simplified Chinese, and Japanese.
- **New Theme Families**: Added Cockpit Classic (Graphite & Electric Blue), Tokyo Night, Catppuccin, Solarized, and High Contrast suites in both Dark and Light modes.
- **Cyber Audio Synthesizer**: Web Audio API sound effects with user toggle and persistence.
- **Dialogue Transcript Viewer**: Formatted Markdown/HTML chat session viewer stripping noise from transcripts.

## [2.0.0] — 2026-10-09

### Added
- **Architecture Overhaul**: Migrated to modular async collectors (`projects`, `github`, `sessions`, `cbm`, `system`, `panel`).
- **Strict Security & CSP**: Implemented crypto nonce generation, strict CSP, and argument-array process execution (`shell: false`).
- **Graphify Cyberpunk Renderer**: Enriched Deep Space Observatory graph visualizer with HUD counters, God Nodes, freeze physics, and Ctrl+K search.
- **Auto-Launch on Startup**: Registered `onStartupFinished` activation event with configurable `openOnStartup`.

## [1.0.0] — Initial Release

### Initial Features
- Project discovery, GitHub repository list via `gh` CLI, recent sessions overview, CBM and Graphify status, and AI model quota tracking.
