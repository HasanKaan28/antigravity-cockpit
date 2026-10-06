import { WebSocket } from 'ws';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createFrame, parseFrame, calculateHash, loadConfig } from './abc-protocol.js';
const config = loadConfig();
// Parse arguments
const args = process.argv.slice(2);
const brokerUrl = args.find(a => a.startsWith('--broker='))?.split('=')[1] || process.env.ABC_BROKER || config.broker || 'ws://localhost:4224';
const role = (args.find(a => a.startsWith('--role='))?.split('=')[1] || process.env.ABC_ROLE || config.role || 'worker');
const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || process.env.ABC_AGENT_ID || config.agentId || `agent-${os.hostname()}-${process.pid}`;
// Detect platform
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
/**
 * Derives the bridge name implicitly from Git remote URL or folder name + user.
 */
function deriveBridgeName() {
    const explicitBridge = args.find(a => a.startsWith('--bridge='))?.split('=')[1] || process.env.ABC_BRIDGE || config.bridge;
    if (explicitBridge) {
        return explicitBridge;
    }
    let repoName = '';
    try {
        const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (remote) {
            repoName = path.basename(remote, '.git');
        }
    }
    catch { }
    if (!repoName) {
        repoName = path.basename(process.cwd());
    }
    const user = process.env.USER || os.userInfo().username || 'user';
    return `${repoName}-${user}`;
}
const bridgeName = deriveBridgeName();
console.log(`[ABC Client] Initializing Client...`);
console.log(`  Agent ID : ${agentId}`);
console.log(`  Role     : ${role}`);
console.log(`  Bridge   : ${bridgeName}`);
console.log(`  Broker   : ${brokerUrl}`);
// Clipboard caching to prevent circular echo loops
let lastClipboardHash = '';
let lastClipboardText = '';
/**
 * Platform-native clipboard reader.
 */
function readClipboard() {
    try {
        if (isWSL) {
            const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Clipboard'], { encoding: 'utf8' });
            return res.stdout.trim();
        }
        else if (platform === 'darwin') {
            const res = spawnSync('pbpaste', [], { encoding: 'utf8' });
            return res.stdout;
        }
        else if (platform === 'linux') {
            if (process.env.WAYLAND_DISPLAY) {
                const res = spawnSync('wl-paste', ['--no-newline'], { encoding: 'utf8' });
                if (res.status === 0)
                    return res.stdout;
            }
            const resXclip = spawnSync('xclip', ['-selection', 'clipboard', '-o'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            if (resXclip.status === 0)
                return resXclip.stdout;
            const resXsel = spawnSync('xsel', ['--clipboard', '--output'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            if (resXsel.status === 0)
                return resXsel.stdout;
        }
    }
    catch (err) {
        // Fail silently in headless or unsupported environments
    }
    return '';
}
/**
 * Platform-native clipboard writer.
 */
function writeClipboard(text) {
    try {
        if (isWSL) {
            const res = spawnSync('clip.exe', [], { input: text, encoding: 'utf8' });
            if (res.status === 0)
                return true;
            const resPs = spawnSync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                `[Console]::InputEncoding = [System.Text.Encoding]::UTF8; $input | Set-Clipboard`
            ], { input: text, encoding: 'utf8' });
            return resPs.status === 0;
        }
        else if (platform === 'darwin') {
            const res = spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
            return res.status === 0;
        }
        else if (platform === 'linux') {
            if (process.env.WAYLAND_DISPLAY) {
                const res = spawnSync('wl-copy', [], { input: text, encoding: 'utf8' });
                if (res.status === 0)
                    return true;
            }
            const resXclip = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
            if (resXclip.status === 0)
                return true;
            const resXsel = spawnSync('xsel', ['--clipboard', '--input'], { input: text, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
            if (resXsel.status === 0)
                return true;
        }
    }
    catch (err) {
        // Fail silently
    }
    return false;
}
let ws = null;
let reconnectTimer = null;
function connect() {
    if (ws) {
        try {
            ws.close();
        }
        catch { }
    }
    ws = new WebSocket(brokerUrl);
    ws.on('open', () => {
        console.log(`[Connected] Connected to ABC Broker at ${brokerUrl}`);
        if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
        }
        // Send handshake frame
        const handshake = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role }, { event: 'handshake', content: bridgeName }, readClipboard() // Seed with current clipboard value
        );
        ws?.send(JSON.stringify(handshake));
    });
    ws.on('message', (data) => {
        try {
            const frame = parseFrame(data.toString());
            handleServerFrame(frame);
        }
        catch (err) {
            console.error(`[Error] Failed to parse server message: ${err.message}`);
        }
    });
    ws.on('close', () => {
        console.warn(`[Disconnected] Connection lost. Retrying in 5s...`);
        ws = null;
        triggerReconnect();
    });
    ws.on('error', (err) => {
        console.error(`[Socket Error] ${err.message}`);
    });
}
function triggerReconnect() {
    if (!reconnectTimer) {
        reconnectTimer = setInterval(() => {
            console.log(`[Reconnect] Attempting to connect...`);
            connect();
        }, 5000);
    }
}
/**
 * Handles incoming WebSocket frames from the Broker.
 */
function handleServerFrame(frame) {
    const { event, message_type, content, hash } = frame.B;
    if (event === 'system_message') {
        if (message_type === 'warning') {
            console.warn(`\x1b[33m[Warning] ${content}\x1b[0m`);
        }
        else if (message_type === 'error') {
            console.error(`\x1b[31m[Error] ${content}\x1b[0m`);
        }
        else {
            console.log(`[System] ${content}`);
        }
        // Apply seed clipboard state sent by broker on handshake
        if (frame.C && calculateHash(frame.C) !== lastClipboardHash) {
            applyRemoteClipboard(frame.C, hash || calculateHash(frame.C));
        }
        return;
    }
    if (event === 'clipboard_sync') {
        const incomingHash = hash || calculateHash(frame.C);
        if (incomingHash !== lastClipboardHash) {
            console.log(`[Remote Update] New clipboard received from ${frame.A.agent_id}@${frame.A.host}`);
            applyRemoteClipboard(frame.C, incomingHash, frame.A.agent_id, frame.A.host);
        }
        return;
    }
    if (event === 'agent_message') {
        console.log(`\n\x1b[36m[Message from ${frame.A.agent_id}@${frame.A.host} (${message_type})]:\x1b[0m\n${content}\n`);
        return;
    }
    if (event === 'agent_control') {
        if (message_type === 'abort') {
            console.warn(`\x1b[31m[ABORT SIGNAL RECEIVED] Stopping active tasks...\x1b[0m`);
            // In a real agent setup, we would kill subprocesses here
        }
        else {
            console.log(`[Control Signal] Received ${message_type}`);
        }
        return;
    }
}
function applyRemoteClipboard(text, hash, fromAgent, fromHost) {
    lastClipboardHash = hash;
    lastClipboardText = text;
    try {
        fs.writeFileSync('.bridge_clipboard_cache', text, 'utf8');
        if (fromAgent && fromHost) {
            console.log(`\n\x1b[35m[Bridge Update]\x1b[0m Clipboard updated by ${fromAgent}@${fromHost}.`);
        }
        else {
            console.log(`\n\x1b[35m[Bridge Update]\x1b[0m Initial bridge clipboard seeded.`);
        }
        console.log(`               Run 'abc accept' or './scripts/copy.sh --accept' to apply it to your clipboard.\n`);
        // Safe terminal bell alert
        try {
            process.stdout.write('\x07');
        }
        catch { }
        // Safe tmux status line warning
        if (process.env.TMUX && fromAgent && fromHost) {
            try {
                spawnSync('tmux', [
                    'display-message',
                    '-d', '4000',
                    `Bridge Clipboard Updated by ${fromAgent}@${fromHost}! Run 'abc accept' to apply.`
                ], { stdio: 'ignore' });
            }
            catch { }
        }
    }
    catch (err) {
        console.error(`[Error] Failed to write bridge clipboard cache: ${err.message}`);
    }
}
// Connect initially
connect();
