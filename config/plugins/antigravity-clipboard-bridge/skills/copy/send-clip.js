import { WebSocket } from 'ws';
import os from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { createFrame, loadConfig } from './abc-protocol.js';
const config = loadConfig();
const args = process.argv.slice(2);
const text = args.find(a => !a.startsWith('--')) || '';
if (!text) {
    process.exit(0);
}
const brokerUrl = process.env.ABC_BROKER || config.broker || 'ws://localhost:4224';
const agentId = process.env.ABC_AGENT_ID || config.agentId || `agent-${os.hostname()}-${process.pid}`;
const role = (args.find(a => a.startsWith('--role='))?.split('=')[1] || process.env.ABC_ROLE || config.role || 'worker');
function deriveBridgeName() {
    if (process.env.ABC_BRIDGE) {
        return process.env.ABC_BRIDGE;
    }
    if (config.bridge) {
        return config.bridge;
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
const ws = new WebSocket(brokerUrl);
// Set a timeout of 1s to fail fast if the broker is offline
const timeout = setTimeout(() => {
    ws.terminate();
    process.exit(1);
}, 1000);
ws.on('open', () => {
    // Handshake
    const handshake = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role, transient: true }, { event: 'handshake', content: bridgeName }, '');
    ws.send(JSON.stringify(handshake));
    // Clipboard sync
    const syncFrame = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role }, { event: 'clipboard_sync' }, text);
    ws.send(JSON.stringify(syncFrame));
    // Wait briefly for the message to send, then clean up and exit successfully
    setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        process.exit(0);
    }, 150);
});
ws.on('error', () => {
    clearTimeout(timeout);
    process.exit(1);
});
