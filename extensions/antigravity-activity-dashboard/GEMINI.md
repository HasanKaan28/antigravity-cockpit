# Antigravity Cockpit & Agent Skills — Autonomous Setup Protocol

Whenever the user asks to "install", "setup", "adopt", or "kur" this repository:
**DO NOT simply read or explain the files. You MUST immediately execute the automated installation.**

## Step 1: Run Automated Installer
Execute the platform installer:
- **Windows**:
  `powershell -ExecutionPolicy Bypass -File .\setup.ps1` (or `node scripts/setup.js`)
- **macOS / Linux**:
  `./setup.sh` (or `node scripts/setup.js`)

## What This Setup Accomplishes
1. **Installs Antigravity Cockpit Extension**: Automatically locates the `antigravity-ide` CLI and installs the `.vsix` package (`antigravity-ide --install-extension <vsix> --force`).
2. **Auto-Detects Local Projects & Agent Skills**: Cockpit dynamically detects your active workspaces, Git repositories, and local agent skills on startup.
3. **Enables Auto-Launch on Startup**: Configures Cockpit to automatically open whenever Antigravity IDE launches (`openOnStartup: true`).

## Step 2: Confirmation
Notify the user:
> "⚡ Antigravity Cockpit Dashboard has been successfully installed! Cockpit will automatically open whenever Antigravity IDE launches."
