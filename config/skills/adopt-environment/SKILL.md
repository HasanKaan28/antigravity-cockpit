---
name: adopt-environment
description: Adopts and synchronizes the full Antigravity Cockpit engineering environment, global rules, skills, plugins, and architecture guidelines whenever the user asks to adopt the repo (bu depoyu benimse, repoyu kur, ayarları yükle, etc.).
---

# Antigravity Environment Adoption Skill

## Overview
When the user asks to adopt this repository (e.g., "bu depoyu benimse", "bu repoyu benimse", "ayarları yükle", "adopt repository"):

This skill automatically adopts the entire Antigravity Cockpit configuration, restoring all professional rules, skills, plugins, and workflow guidelines into the user's environment.

## Adoption Protocol

### Step 1: Execute Automated Adoption Script
Run the automated adoption script for the user's operating system:
- **Windows (PowerShell)**:
  `powershell -ExecutionPolicy Bypass -File .\scripts\adopt.ps1`
- **Linux / macOS / WSL (Bash)**:
  `bash ./scripts/adopt.sh`

### Step 2: Verification
1. Verify that `~/.gemini/GEMINI.md` exists and contains the global engineering rules.
2. Verify that `~/.gemini/config/skills/` contains the curated skills.
3. Verify that `~/.gemini/config/plugins/` contains active plugins.

### Step 3: Inform User
Notify the user with the confirmation message:
> "🚀 **Antigravity Cockpit başarıyla benimsendi!** Tüm küresel kurallar (GEMINI.md), 50+ uzmanlık yeteneği (skills) ve pano köprüsü (clipboard bridge) ortamınıza kuruldu. Artık tam donanımlı olarak çalışmaya başlayabilirsiniz."
