# ⚡ Antigravity Cockpit & Activity Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.2.0-cyan.svg)](package.json)
[![Antigravity IDE](https://img.shields.io/badge/Antigravity_IDE-Ready-purple.svg)](package.json)
[![Agent Skills](https://img.shields.io/badge/Agent_Skills-Dynamic_Auto--Detect-green.svg)](#-dynamic-agent-skills-detection)

> **Futuristic Deep Space Mission Control Dashboard and Agent Workspace Cockpit for Antigravity IDE.**

Antigravity Cockpit greets you **automatically on every Antigravity IDE launch**, unifying your workspace projects, GitHub repositories, recent chat sessions, Codebase Memory (CBM) indices, Graphify knowledge graphs, and live AI model quotas into a single cyberpunk control screen.

---

## 🚀 Zero-Touch Automated Setup

Installing this repository is completely automated for developers and AI agents:

### Option 1: One-Prompt AI Agent Install (Recommended)
Tell your Antigravity agent:
> *"Install and setup Antigravity Cockpit dashboard"*

The AI agent reads [`AGENTS.md`](AGENTS.md) / [`GEMINI.md`](GEMINI.md) and executes the automated setup protocol, installing the extension and configuring auto-launch in seconds.

---

### Option 2: One-Click Installer Scripts

* **Windows (Fastest):**  
  Double-click **[`setup.bat`](setup.bat)**  
  *(or via PowerShell: `powershell -ExecutionPolicy Bypass -File .\setup.ps1`)*

* **macOS / Linux:**  
  Run **`./setup.sh`**

* **Node.js / Terminal:**  
  ```bash
  npm install
  npm run setup
  ```

### What Happens Automatically:
1. ⚡ **Cockpit Extension Installed:** The `.vsix` package is installed directly into Antigravity IDE and configured to **auto-launch on IDE startup**.
2. ⚡ **Status Bar Item Active:** Permanent `$(dashboard) Cockpit` quick-launch toggle pinned to your status bar.
3. 🧠 **Dynamic Skills Auto-Detection:** Automatically scans and organizes your own local agent skills from `~/.gemini/config/skills/`, IDE builtin skills, and workspace `.agents/skills`.
4. 🖥️ **Hardware Telemetry:** Dynamically probes your system GPU (NVIDIA, AMD, Intel, Apple Silicon) and local AI engines (Ollama, LM Studio) without hardcoded device IDs.

---

## ✨ Key Features

### 🌌 Deep Space Mission Control
- **Auto-Launch on Startup:** Opens ~1.2 seconds after IDE launch (`openOnStartup: true`).
- **Webview Serializer:** Seamlessly restores your open dashboard tab and state across IDE restarts.
- **Cyberpunk Aesthetics:** Futuristic glassmorphism panels, glowing gauges, and optional Web Audio API cyber SFX.
- **Full Theme Suite:** Deep Space Dark, Cockpit Classic (Graphite & Electric Blue), Tokyo Night, Catppuccin, Solarized, and High Contrast — available in both Dark and Light variants.

### 📁 Workspace & Project Explorer
- Real-time detection across active workspaces, recent projects, standard development folders (`~/Projects`, `~/dev`, `~/code`, `~/github-repos`), and expanded project signatures.
- Git branch name, latest commit date, and uncommitted diff indicators.
- Live **Graphify** visual graph indicators and **Codebase Memory (CBM)** index badges.
- Pin favorites and archive finished repositories with instant search filtering.
- **Zero-State Support:** Direct "Klasör Aç" / "Open Folder" action when no workspaces are detected.

### 🐙 GitHub Integration
- Direct integration via official `gh` CLI with zero credentials storage.
- One-click repository cloning directly into your local repositories folder.
- Dynamic detection of the active GitHub user with a clean **"GitHub Hesabı Bağla"** (`gh auth login`) onboarding prompt when unauthenticated.
- Add external custom repositories by `owner/repo` to monitor commits and stars.

### 🧠 Dynamic Agent Skills Detection
- Automatically detects and categorizes all skills installed on your machine (`~/.gemini/config/skills/`, builtin, and workspace).
- Categorized into Architecture, Design & UI, Code Quality, Optimization, and Local AI.
- **One-Click Prompt Triggering:** Copy instant trigger prompts (e.g. `/graphify`, `@skill:clean-code`) with a single click.
- **Rule Inspection & Quick Chat:** Open `SKILL.md` rules directly in editor or launch a dedicated AI chat configured with the skill.
- **Zero Fallback Counts:** Never displays artificial fallback numbers; accurately displays 0 or actual installed skills.

### 💬 Chat Sessions & Dialogue Transcript Viewer
- Reads recent Antigravity brain sessions from `~/.gemini/antigravity-ide/brain`.
- Built-in distraction-free **Dialogue Transcript Viewer** stripping system metadata to show pure conversation flow, with copyable markdown and search.

### 📊 Live Model Quotas & Telemetry
- Real-time Gemini and Claude quota percentages (from Antigravity Panel SQLite).
- Silent background watcher alerting you when significant quota shifts occur.
- Hardware telemetry: Dynamic GPU detection (WMI, macOS system profiler, Linux lspci, nvidia-smi), local Ollama model engine detection, and power status (AC vs battery).

---

## 🛠️ Development Scripts

| Command | Description |
|---|---|
| `npm run setup` | Runs the automated VSIX installer (`scripts/setup.js`) |
| `npm run package` | Packages `antigravity-activity-dashboard-<version>.vsix` via vsce |
| `npm run install-local` | Installs the latest packaged `.vsix` into Antigravity IDE |
| `npm run sync-live` | Hot-syncs workspace files directly to the runtime extension folder |
| `npm run test:unit` | Executes Mocha test suite (37 passing unit tests) |
| `npm run preview` | Builds browser-accessible `preview.html` with non-PII mock telemetry |

---

## 🔒 Privacy & Local-First Architecture

- **Zero Telemetry Collection:** All project information, sessions, and telemetry remain strictly on your local machine.
- **No Hardcoded Accounts or PII:** Built generic from the ground up for seamless installation on any developer machine.
- **Strict Content Security Policy:** The Webview runs under a hardened CSP with local `@font-face` assets (Outfit & JetBrains Mono) — zero external CDN requests.
- **Safe Process Execution:** Child processes use strict argument arrays (`shell: false`, `windowsHide: true`) preventing command injection.

---

## 📄 License

MIT © Antigravity Open Source Contributors
