import { WebSocket } from 'ws';
import os from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { createFrame, parseFrame, loadConfig } from './abc-protocol.js';
// Parse arguments
const args = process.argv.slice(2);
const config = loadConfig();
const brokerUrl = args.find(a => a.startsWith('--broker='))?.split('=')[1] || process.env.ABC_BROKER || config.broker || 'ws://localhost:4224';
const role = (args.find(a => a.startsWith('--role='))?.split('=')[1] || process.env.ABC_ROLE || config.role || 'worker');
const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || process.env.ABC_AGENT_ID || config.agentId || `agent-${os.hostname()}-${process.pid}`;
const timeoutMs = parseInt(args.find(a => a.startsWith('--timeout='))?.split('=')[1] || '300000', 10); // 5 mins default
const expectedType = args.find(a => a.startsWith('--type='))?.split('=')[1]; // Optional filter by message_type
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
let messageReceived = false;
console.log(`[Listen Once] Initializing...`);
console.log(`  Agent ID : ${agentId}`);
console.log(`  Bridge   : ${bridgeName}`);
const ws = new WebSocket(brokerUrl);
// Exit guard to prevent hanging forever
const timer = setTimeout(() => {
    console.error(`[Listen Once] Timeout reached (${timeoutMs}ms) without receiving a message.`);
    ws.terminate();
    process.exit(1);
}, timeoutMs);
ws.on('open', () => {
    const handshake = createFrame({ agent_id: agentId, host: os.hostname(), user: os.userInfo().username || 'user', role }, { event: 'handshake', content: bridgeName }, '');
    ws.send(JSON.stringify(handshake));
});
ws.on('message', (data) => {
    try {
        const frame = parseFrame(data.toString());
        const { event, message_type, content } = frame.B;
        // We only care about agent_message events
        if (event === 'agent_message') {
            // If we filtered by type, check if it matches
            if (expectedType && message_type !== expectedType) {
                return;
            }
            console.log(`\n--- MESSAGE RECEIVED ---`);
            console.log(`From: ${frame.A.agent_id}@${frame.A.host}`);
            console.log(`Type: ${message_type}`);
            console.log(`Content:\n${content}`);
            console.log(`------------------------\n`);
            messageReceived = true;
            clearTimeout(timer);
            ws.close();
            process.exit(0);
        }
        else if (event === 'system_message' && message_type === 'error') {
            console.error(`[System Error] ${content}`);
            clearTimeout(timer);
            ws.close();
            process.exit(1);
        }
    }
    catch (err) {
        console.error(`[Error] Failed to parse message: ${err.message}`);
    }
});
ws.on('close', () => {
    clearTimeout(timer);
    if (!messageReceived) {
        console.warn(`[Disconnected] Connection to the broker was closed before a message was received.`);
        process.exit(1);
    }
    else {
        process.exit(0);
    }
});
ws.on('error', (err) => {
    console.error(`[Socket Error] ${err.message}`);
    clearTimeout(timer);
    process.exit(1);
});
