#!/usr/bin/env node
/**
 * Installs the newest .vsix in the project root into Antigravity IDE (preferred) or VS Code.
 * Also synchronizes the runtime folder in ~/.antigravity-ide/extensions/ for live reload.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const vsix = fs.readdirSync(root)
    .filter(f => f.endsWith('.vsix'))
    .map(f => ({ f, t: fs.statSync(path.join(root, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];

if (!vsix) {
    console.error('No .vsix found. Run "npm run package" first.');
    process.exit(1);
}

const vsixPath = path.join(root, vsix.f);

// 1. Live reload folder sync
const userDir = process.env.USERPROFILE || 'C:\\Users\\Kaan';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const extensionsDir = path.join(userDir, '.antigravity-ide', 'extensions');
const activeDirName = `antigravity-local.antigravity-activity-dashboard-${pkg.version}`;
const targetExtDir = path.join(extensionsDir, activeDirName);

// Clean up old extension versions
try {
    if (fs.existsSync(extensionsDir)) {
        const existing = fs.readdirSync(extensionsDir);
        for (const dirName of existing) {
            if (dirName.startsWith('antigravity-local.antigravity-activity-dashboard-') && dirName !== activeDirName) {
                const oldPath = path.join(extensionsDir, dirName);
                fs.rmSync(oldPath, { recursive: true, force: true });
                console.log(`Cleaned up obsolete extension directory: ${dirName}`);
            }
        }
    }
} catch (e) {
    console.warn('Could not clean old directories:', e.message);
}

try {
    fs.mkdirSync(targetExtDir, { recursive: true });
    // copy package.json, extension.js, get_panel_data.py
    ['package.json', 'extension.js', 'get_panel_data.py', 'README.md', 'LICENSE'].forEach(f => {
        const s = path.join(root, f);
        if (fs.existsSync(s)) fs.copyFileSync(s, path.join(targetExtDir, f));
    });
    // copy src/
    fs.cpSync(path.join(root, 'src'), path.join(targetExtDir, 'src'), { recursive: true, force: true });
    // copy media/
    fs.cpSync(path.join(root, 'media'), path.join(targetExtDir, 'media'), { recursive: true, force: true });
    console.log(`Synchronized live extension folder: ${targetExtDir}`);
} catch (err) {
    console.warn(`Could not sync live folder ${targetExtDir}:`, err.message);
}

// 2. Install via CLI
const local = process.env.LOCALAPPDATA || '';
const candidates = [
    path.join(local, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
    path.join(local, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd')
].filter(p => fs.existsSync(p));

if (candidates.length > 0) {
    const cli = candidates[0];
    console.log(`Running CLI install via PowerShell: ${cli}`);
    const res = spawnSync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `& '${cli}' --install-extension '${vsixPath}' --force`
    ], { stdio: 'inherit' });

    if (res.status === 0) {
        console.log(`✅ Extension successfully installed from ${vsix.f}!`);
    } else {
        console.log(`CLI install returned code ${res.status}, live directory sync succeeded.`);
    }
}
