import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
function main() {
    const args = process.argv.slice(2);
    const broker = args.find(a => a.startsWith('--broker='))?.split('=')[1];
    const bridge = args.find(a => a.startsWith('--bridge='))?.split('=')[1];
    const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1];
    const role = args.find(a => a.startsWith('--role='))?.split('=')[1];
    const configDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'abc');
    const configPath = path.join(configDir, 'config.json');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    let config = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        catch { }
    }
    if (broker !== undefined)
        config.broker = broker;
    if (bridge !== undefined)
        config.bridge = bridge;
    if (agentId !== undefined)
        config.agentId = agentId;
    if (role !== undefined)
        config.role = role;
    if (args.includes('--show') || args.length === 0) {
        console.log('\nCurrent ABC Configuration:');
        console.log(JSON.stringify(config, null, 2));
        if (args.length === 0) {
            console.log('\nUsage to set settings:');
            console.log('  abc config --broker=ws://ip:port --bridge=bridge_name --agent-id=my-id --role=worker|orchestrator');
        }
        process.exit(0);
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('ABC Configuration updated successfully!');
    console.log(JSON.stringify(config, null, 2));
}
main();
