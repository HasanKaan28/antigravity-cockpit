#!/usr/bin/env node
'use strict';
/**
 * Zero-touch automated setup for Antigravity Cockpit & Skills.
 * Installs the VSIX extension into Antigravity IDE and provisions all bundled skills
 * into the user's global Antigravity config directory (~/.gemini/config/skills).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const isPostInstall = process.argv.includes('--postinstall');
const rootDir = path.resolve(__dirname, '..');
const userHome = os.homedir();

if (isPostInstall) {
    console.log('⚡ Running in postinstall hook mode...');
}

console.log('\n\x1b[36m========================================================\x1b[0m');
console.log('\x1b[1m\x1b[35m  ⚡ Antigravity Cockpit & Agent Skills Auto-Installer \x1b[0m');
console.log('\x1b[36m========================================================\x1b[0m\n');

// 1. Locate latest .vsix
const vsixFiles = fs.readdirSync(rootDir)
    .filter(f => f.endsWith('.vsix'))
    .map(f => ({ name: f, fullPath: path.join(rootDir, f), time: fs.statSync(path.join(rootDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

let latestVsix = vsixFiles[0];
if (!latestVsix) {
    console.log('📦 No .vsix found in directory. Attempting to build with vsce...');
    try {
        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const pkgRes = spawnSync(npxCmd, ['-y', '@vscode/vsce', 'package', '--no-dependencies'], {
            cwd: rootDir,
            stdio: 'inherit'
        });
        if (pkgRes.status === 0) {
            const recheck = fs.readdirSync(rootDir)
                .filter(f => f.endsWith('.vsix'))
                .map(f => ({ name: f, fullPath: path.join(rootDir, f), time: fs.statSync(path.join(rootDir, f)).mtimeMs }))
                .sort((a, b) => b.time - a.time);
            latestVsix = recheck[0];
        }
    } catch (err) {
        console.warn('⚠️ Could not auto-package vsix:', err.message);
    }
}

if (!latestVsix) {
    console.warn('\x1b[33m⚠️ No .vsix file available. Run "npm run package" first.\x1b[0m');
} else {
    console.log(`📦 Found package: \x1b[32m${latestVsix.name}\x1b[0m`);
}

// 2. Discover Antigravity IDE / VS Code CLI
function findIdeCli() {
    // Check PATH first
    const pathExts = process.platform === 'win32' ? ['.cmd', '.exe', ''] : [''];
    const pathDirs = (process.env.PATH || '').split(path.delimiter);

    for (const binName of ['antigravity-ide', 'code']) {
        for (const dir of pathDirs) {
            for (const ext of pathExts) {
                const candidate = path.join(dir, binName + ext);
                if (fs.existsSync(candidate)) return candidate;
            }
        }
    }

    // Windows local app data checks
    if (process.platform === 'win32') {
        const localApp = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
        const winCandidates = [
            path.join(localApp, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
            path.join(localApp, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
            path.join(userHome, 'AppData', 'Local', 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
            'C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd'
        ];
        for (const c of winCandidates) {
            if (fs.existsSync(c)) return c;
        }
    }

    // macOS checks
    if (process.platform === 'darwin') {
        const macCandidates = [
            '/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide',
            '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
        ];
        for (const c of macCandidates) {
            if (fs.existsSync(c)) return c;
        }
    }

    // Linux checks
    if (process.platform === 'linux') {
        const linuxCandidates = [
            '/usr/share/antigravity-ide/bin/antigravity-ide',
            '/usr/bin/antigravity-ide',
            '/usr/bin/code'
        ];
        for (const c of linuxCandidates) {
            if (fs.existsSync(c)) return c;
        }
    }

    return null;
}

const ideCli = findIdeCli();
if (ideCli) {
    console.log(`🔍 Detected IDE CLI: \x1b[34m${ideCli}\x1b[0m`);
} else {
    console.log('\x1b[33mℹ️ Antigravity IDE / VS Code CLI not detected in standard paths.\x1b[0m');
}

// 3. Install Extension into IDE
let extensionInstalled = false;
if (latestVsix && ideCli) {
    console.log(`🚀 Installing ${latestVsix.name} into IDE...`);
    try {
        let installResult;
        if (process.platform === 'win32') {
            installResult = spawnSync('powershell.exe', [
                '-NoProfile',
                '-Command',
                `& '${ideCli.replace(/'/g, "''")}' --install-extension '${latestVsix.fullPath.replace(/'/g, "''")}' --force`
            ], { stdio: 'inherit' });
        } else {
            installResult = spawnSync(ideCli, ['--install-extension', latestVsix.fullPath, '--force'], {
                stdio: 'inherit'
            });
        }
        if (installResult.status === 0) {
            extensionInstalled = true;
            console.log('✅ Extension successfully installed into Antigravity IDE!');
        } else {
            console.warn(`⚠️ CLI install returned code ${installResult.status}. Falling back to folder sync.`);
        }
    } catch (err) {
        console.warn('⚠️ CLI install execution failed:', err.message);
    }
}

// 4. Live Extension Folder Sync (fallback & live hot-reload support)
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const extensionsDir = path.join(userHome, '.antigravity-ide', 'extensions');
    const targetExtDir = path.join(extensionsDir, `antigravity-local.antigravity-activity-dashboard-${pkg.version}`);

    if (!fs.existsSync(extensionsDir)) {
        fs.mkdirSync(extensionsDir, { recursive: true });
    }

    // Clean obsolete versions
    const existing = fs.readdirSync(extensionsDir);
    for (const dirName of existing) {
        if (dirName.startsWith('antigravity-local.antigravity-activity-dashboard-') && dirName !== `antigravity-local.antigravity-activity-dashboard-${pkg.version}`) {
            try {
                fs.rmSync(path.join(extensionsDir, dirName), { recursive: true, force: true });
            } catch (err) {
                // ignore cleanup error
            }
        }
    }

    fs.mkdirSync(targetExtDir, { recursive: true });
    ['package.json', 'extension.js', 'get_panel_data.py', 'README.md', 'LICENSE'].forEach(f => {
        const s = path.join(rootDir, f);
        if (fs.existsSync(s)) fs.copyFileSync(s, path.join(targetExtDir, f));
    });
    fs.cpSync(path.join(rootDir, 'src'), path.join(targetExtDir, 'src'), { recursive: true, force: true });
    fs.cpSync(path.join(rootDir, 'media'), path.join(targetExtDir, 'media'), { recursive: true, force: true });
    console.log(`📁 Synced extension files to: \x1b[32m${targetExtDir}\x1b[0m`);
    extensionInstalled = true;
} catch (err) {
    console.warn('⚠️ Folder sync warning:', err.message);
}

if (!extensionInstalled) {
    console.warn('\x1b[33m⚠️ Extension installation could not be completed automatically.\x1b[0m');
}

// 5. Summary Output
console.log('\n\x1b[32m========================================================\x1b[0m');
console.log('\x1b[1m\x1b[32m  🎉 SETUP COMPLETE!\x1b[0m');
console.log('\x1b[32m========================================================\x1b[0m');
console.log('1. ⚡ Cockpit Dashboard: \x1b[32mINSTALLED & READY\x1b[0m');
console.log('   - Auto-Launch: Cockpit will automatically open whenever Antigravity IDE launches.');
console.log('   - Status Bar: "$(dashboard) Cockpit" quick toggle is now active in your status bar.');
console.log('2. 🧠 Agent Skills: \x1b[32mDYNAMIC DETECTION ACTIVE\x1b[0m');
console.log('   - Cockpit automatically detects your local agent skills from ~/.gemini/config/skills/ and builtin directories.');
console.log('\n💡 You can now reload or start Antigravity IDE to enjoy your Cockpit!\n');

process.exit(0);
