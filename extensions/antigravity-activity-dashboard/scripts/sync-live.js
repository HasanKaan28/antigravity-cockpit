#!/usr/bin/env node
'use strict';
/**
 * Instant Live-Sync Script:
 * Automatically synchronizes workspace changes directly into the installed
 * extension directory (~/.antigravity-ide/extensions/antigravity-local.antigravity-activity-dashboard-*)
 * and updates preview.html + dashboard.html in workspace root.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const userDir = process.env.USERPROFILE || 'C:\\Users\\Kaan';
const extensionsDir = path.join(userDir, '.antigravity-ide', 'extensions');

if (!fs.existsSync(extensionsDir)) {
    console.error(`Extensions directory not found: ${extensionsDir}`);
    process.exit(1);
}

// Find all matching extension directories or create current version
const existingDirs = fs.readdirSync(extensionsDir)
    .filter(d => d.startsWith('antigravity-local.antigravity-activity-dashboard-'));

const targetDirs = existingDirs.length > 0 
    ? existingDirs.map(d => path.join(extensionsDir, d))
    : [path.join(extensionsDir, `antigravity-local.antigravity-activity-dashboard-${pkg.version}`)];

targetDirs.forEach(targetExtDir => {
    fs.mkdirSync(targetExtDir, { recursive: true });

    // Copy root files
    ['package.json', 'extension.js', 'get_panel_data.py', 'README.md', 'LICENSE'].forEach(f => {
        const s = path.join(root, f);
        if (fs.existsSync(s)) fs.copyFileSync(s, path.join(targetExtDir, f));
    });

    // Copy src/
    fs.cpSync(path.join(root, 'src'), path.join(targetExtDir, 'src'), { recursive: true, force: true });

    // Copy media/
    fs.cpSync(path.join(root, 'media'), path.join(targetExtDir, 'media'), { recursive: true, force: true });

    console.log(`[LIVE-SYNC] Synced to: ${targetExtDir}`);
});

// Update preview.html and root dashboard.html
try {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(__dirname, 'dev-preview.js')], { stdio: 'pipe' });
    fs.copyFileSync(path.join(root, 'preview.html'), path.join(root, 'dashboard.html'));
    console.log(`[LIVE-SYNC] Synchronized preview.html and root dashboard.html`);
} catch (e) {
    console.warn('[LIVE-SYNC] Preview regeneration note:', e.message);
}

console.log('✅ Live extension synchronized successfully!');
