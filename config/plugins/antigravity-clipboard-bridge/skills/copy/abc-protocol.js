import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
// Resolve version from package.json and git commit SHA
export let VERSION = '1.0.3';
try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    let currentDir = __dirname;
    let packageVersion = '1.0.3';
    for (let i = 0; i < 4; i++) {
        const pkgPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            packageVersion = pkg.version;
            break;
        }
        currentDir = path.dirname(currentDir);
    }
    // Retrieve git short commit SHA
    let commitSha = '';
    try {
        commitSha = execSync('git rev-parse --short HEAD', {
            cwd: __dirname,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    }
    catch { }
    if (commitSha) {
        VERSION = `${packageVersion}+${commitSha}`;
    }
    else {
        VERSION = packageVersion;
    }
}
catch { }
/**
 * Calculates a SHA256 hash of the given string content.
 */
export function calculateHash(content) {
    return crypto.createHash('sha256').update(content || '').digest('hex');
}
/**
 * Helper to construct an ABC frame.
 */
export function createFrame(agentContext, payload, clipboardText) {
    const hash = calculateHash(clipboardText);
    return {
        A: {
            ...agentContext,
            pid: process.pid,
            version: VERSION,
        },
        B: {
            ...payload,
            timestamp: new Date().toISOString(),
            uuid: crypto.randomUUID(),
            hash: payload.event === 'clipboard_sync' ? hash : (payload.hash || hash),
        },
        C: clipboardText,
    };
}
/**
 * Parses and validates a raw string into an ABCFrame.
 */
export function parseFrame(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid frame: not an object');
    }
    if (!parsed.A || typeof parsed.A !== 'object') {
        throw new Error("Invalid frame: missing or invalid context 'A'");
    }
    if (!parsed.B || typeof parsed.B !== 'object') {
        throw new Error("Invalid frame: missing or invalid payload 'B'");
    }
    if (typeof parsed.C !== 'string') {
        throw new Error("Invalid frame: missing or invalid clipboard text 'C'");
    }
    // Validate sub-properties of Context (A)
    const { agent_id, host, user, role, version } = parsed.A;
    if (typeof agent_id !== 'string' ||
        typeof host !== 'string' ||
        typeof user !== 'string' ||
        typeof role !== 'string' ||
        typeof version !== 'string') {
        throw new Error("Invalid frame context 'A': missing or invalid required fields");
    }
    // Validate sub-properties of Payload (B)
    const { event } = parsed.B;
    if (typeof event !== 'string') {
        throw new Error("Invalid frame payload 'B': missing or invalid event type");
    }
    return parsed;
}
export function loadConfig() {
    try {
        const configPath = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'abc', 'config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    }
    catch { }
    return {};
}
