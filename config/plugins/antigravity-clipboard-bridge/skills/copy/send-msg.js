import { WebSocket } from 'ws';
import os from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createFrame, loadConfig } from './abc-protocol.js';
const config = loadConfig();
let content = '';
let recipient = '*';
let msgType = 'broadcast';
const configDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'abc');
const pendingMsgPath = path.join(configDir, 'pending_message.json');
const args = process.argv.slice(2);
const hasArgs = args.length > 0;
if (!hasArgs && fs.existsSync(pendingMsgPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(pendingMsgPath, 'utf8'));
        content = data.content || '';
        recipient = data.recipient || '*';
        msgType = data.type || 'broadcast';
        try {
            fs.unlinkSync(pendingMsgPath);
        }
        catch { }
    }
    catch (err) {
        console.error(`Error: Failed to read pending message: ${err.message}`);
        process.exit(1);
    }
}
else {
    content = args.find(a => !a.startsWith('--')) || '';
    recipient = args.find(a => a.startsWith('--recipient='))?.split('=')[1] || '*';
    msgType = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'broadcast';
}
if (!content) {
    console.error('Error: Message content is required');
    process.exit(1);
}
const role = (args.find(a => a.startsWith('--role='))?.split('=')[1] || process.env.ABC_ROLE || config.role || 'worker');
const brokerUrl = process.env.ABC_BROKER || config.broker || 'ws://localhost:4224';
const agentId = process.env.ABC_AGENT_ID || config.agentId || `agent-${os.hostname()}-${process.pid}`;
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
const timeout = setTimeout(() => {
    ws.terminate();
    process.exit(1);
}, 1000);
ws.on('open', () => {
    // Handshake
    const handshake = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role, transient: true }, { event: 'handshake', content: bridgeName }, '');
    ws.send(JSON.stringify(handshake));
    // Agent message
    const msgFrame = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role }, {
        event: 'agent_message',
        recipient,
        message_type: msgType,
        content
    }, '');
    ws.send(JSON.stringify(msgFrame));
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
