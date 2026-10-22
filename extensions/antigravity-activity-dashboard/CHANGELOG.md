# Changelog

All notable changes to the **Antigravity Activity Dashboard & Cockpit** extension will be documented in this file.

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
