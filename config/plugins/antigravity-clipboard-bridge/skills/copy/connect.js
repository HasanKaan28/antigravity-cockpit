import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Resolve current directory of the script in ESM mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function main() {
    const configDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'abc');
    const configPath = path.join(configDir, 'config.json');
    if (!fs.existsSync(configPath)) {
        console.error('Error: Configuration file not found. Please run "abc config" first.');
        process.exit(1);
    }
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    catch {
        console.error('Error: Failed to parse configuration file. Please run "abc config" to fix it.');
        process.exit(1);
    }
    if (!config.agentId) {
        console.error('Error: "agentId" is missing in the configuration. Please run "abc config".');
        process.exit(1);
    }
    console.log(`Starting background listener for agent "${config.agentId}"...`);
    const listenScript = path.join(__dirname, 'listen-once.js');
    try {
        const bg = spawn('node', [listenScript, `--agent-id=${config.agentId}`, '--timeout=86400000'], {
            detached: true,
            stdio: 'ignore'
        });
        bg.unref();
        console.log('Background listener started successfully!');
    }
    catch (err) {
        console.error(`Error: Failed to start background listener: ${err.message}`);
        process.exit(1);
    }
}
main();
