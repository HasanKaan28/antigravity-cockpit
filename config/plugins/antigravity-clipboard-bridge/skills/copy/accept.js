import fs from 'node:fs';
import os from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
const cacheFile = '.bridge_clipboard_cache';
if (!fs.existsSync(cacheFile)) {
    console.error('No bridge clipboard value available to accept.');
    process.exit(1);
}
const text = fs.readFileSync(cacheFile, 'utf8');
const platform = os.platform();
let isWSL = false;
if (platform === 'linux') {
    try {
        const version = execSync('uname -r', { encoding: 'utf8' }).toLowerCase();
        if (version.includes('microsoft')) {
            isWSL = true;
        }
    }
    catch { }
}
let copied = false;
// 1. Native platform clipboard utilities
try {
    if (isWSL || platform === 'win32') {
        const resPs = spawnSync('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `[Console]::InputEncoding = [System.Text.Encoding]::UTF8; $input | Set-Clipboard`
        ], { input: text, encoding: 'utf8' });
        copied = resPs.status === 0;
    }
    else if (platform === 'darwin') {
        const res = spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
        copied = res.status === 0;
    }
    else if (platform === 'linux') {
        if (process.env.WAYLAND_DISPLAY) {
            const res = spawnSync('wl-copy', [], { input: text, encoding: 'utf8' });
            if (res.status === 0)
                copied = true;
        }
        if (!copied) {
            const resXclip = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
            if (resXclip.status === 0)
                copied = true;
        }
        if (!copied) {
            const resXsel = spawnSync('xsel', ['--clipboard', '--input'], { input: text, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
            if (resXsel.status === 0)
                copied = true;
        }
    }
}
catch (err) { }
// 2. OSC 52 fallback over SSH or terminal escape writing
if (!copied) {
    const encoded = Buffer.from(text).toString('base64');
    let osc52 = `\x1b]52;c;${encoded}\x07`;
    if (process.env.TMUX) {
        osc52 = `\x1bPtmux;\x1b${osc52}\x1b\\`;
    }
    const sshTty = process.env.SSH_TTY;
    if (sshTty) {
        try {
            fs.writeFileSync(sshTty, osc52);
            copied = true;
        }
        catch { }
    }
    if (!copied) {
        process.stdout.write(osc52);
        copied = true;
    }
}
if (copied) {
    console.log('Successfully accepted bridge clipboard value!');
    process.exit(0);
}
else {
    console.error('Failed to apply bridge clipboard value to host.');
    process.exit(1);
}
