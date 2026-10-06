import fs from 'node:fs';
import os from 'node:os';
import { spawn, spawnSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './abc-protocol.js';
// Resolve current directory of the script in ESM mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Helper to calculate base64
function toBase64(text) {
    return Buffer.from(text).toString('base64');
}
async function main() {
    const config = loadConfig();
    const args = process.argv.slice(2);
    let input = '';
    const configDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'abc');
    const pendingCopyFile = path.join(configDir, 'pending_copy.txt');
    // 1. Handle Input
    if (args.length === 0) {
        if (fs.existsSync(pendingCopyFile)) {
            try {
                input = fs.readFileSync(pendingCopyFile, 'utf8');
                try {
                    fs.unlinkSync(pendingCopyFile);
                }
                catch { }
            }
            catch (err) {
                console.error(`Error: Failed to read pending copy file: ${err.message}`);
                process.exit(1);
            }
        }
        else {
            if (process.stdin.isTTY) {
                process.exit(0);
            }
            try {
                input = fs.readFileSync(0, 'utf-8');
            }
            catch {
                process.exit(0);
            }
        }
    }
    else {
        input = args.join(' ');
    }
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
    // Detect sandbox/container
    let isSandbox = false;
    try {
        if (fs.existsSync('/.dockerenv') || fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker')) {
            isSandbox = true;
        }
    }
    catch { }
    // 2. Try WebSocket Sync (instantly synchronizes across all connected agents in the Bridge)
    const disableSync = process.env.ABC_DISABLE_SYNC === '1';
    const role = process.env.ABC_ROLE || config.role || 'worker';
    const sendClipPath = path.join(__dirname, 'send-clip.js');
    if (!disableSync && fs.existsSync(sendClipPath)) {
        try {
            const bg = spawn('node', [sendClipPath, input, `--role=${role}`], {
                detached: true,
                stdio: 'ignore'
            });
            bg.unref();
        }
        catch { }
    }
    let copied = false;
    // 3. Platform-Native Tools (WSL/macOS/Linux)
    if (!isSandbox) {
        try {
            if (isWSL || platform === 'win32') {
                const resPs = spawnSync('powershell.exe', [
                    '-NoProfile',
                    '-NonInteractive',
                    '-Command',
                    `[Console]::InputEncoding = [System.Text.Encoding]::UTF8; $input | Set-Clipboard`
                ], { input, encoding: 'utf8' });
                copied = resPs.status === 0;
            }
            else if (platform === 'darwin') {
                const res = spawnSync('pbcopy', [], { input, encoding: 'utf8' });
                copied = res.status === 0;
            }
            else if (platform === 'linux') {
                if (process.env.WAYLAND_DISPLAY) {
                    const res = spawnSync('wl-copy', [], { input, encoding: 'utf8' });
                    if (res.status === 0)
                        copied = true;
                }
                if (!copied) {
                    const resXclip = spawnSync('xclip', ['-selection', 'clipboard'], { input, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
                    if (resXclip.status === 0)
                        copied = true;
                }
                if (!copied) {
                    const resXsel = spawnSync('xsel', ['--clipboard', '--input'], { input, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
                    if (resXsel.status === 0)
                        copied = true;
                }
            }
        }
        catch { }
    }
    if (copied) {
        process.exit(0);
    }
    // 4. OSC 52 escape sequences fallback (SSH or containers)
    const encoded = toBase64(input);
    let osc52 = `\x1b]52;c;${encoded}\x07`;
    if (process.env.TMUX) {
        osc52 = `\x1bPtmux;\x1b${osc52}\x1b\\`;
    }
    // SSH TTY Redirection
    const sshTty = process.env.SSH_TTY;
    if (sshTty) {
        try {
            fs.writeFileSync(sshTty, osc52);
            process.exit(0);
        }
        catch { }
    }
    // Bypass files/pipes
    try {
        fs.writeFileSync('.clipboard_bypass.tmp', osc52);
        fs.renameSync('.clipboard_bypass.tmp', '.clipboard_bypass');
    }
    catch { }
    try {
        const stats = fs.statSync('.clipboard_pipe');
        if (stats.isFIFO()) {
            fs.writeFileSync('.clipboard_pipe', osc52);
        }
    }
    catch { }
    // Direct TTY write
    try {
        fs.writeFileSync('/dev/tty', osc52);
        if (!isSandbox) {
            process.exit(0);
        }
    }
    catch { }
    // Last resort stdout
    process.stdout.write(osc52);
}
main();
