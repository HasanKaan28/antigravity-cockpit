---
name: config
description: Configure the ABC plugin connection settings (broker, bridge, agent-id, role).
---

# Instructions
If the user asks to configure the bridge connection, change the broker URL, change their agent ID, or join a specific bridge, you must handle this conversationally and write the configuration file directly:

1. **Ask for parameters**: Use the `ask_question` tool (interactive multiple-choice wizard) to prompt the user to select or write in the values for the following connection settings:
   - **Broker URL** (e.g., `ws://ubuntu-dev:4224`)
   - **Bridge Name** (e.g., `agent-bridge-clipboard-aaron`)
   - **Agent ID** (e.g., `surface95-agent`)
   - **Agent Role** (either `worker` or `orchestrator`, default: `worker`)

2. **Save Configuration Directly**: Once the user provides the parameters, write them directly to the `config.json` file in the plugin directory. **Do NOT run any shell/node commands to save it.**
   - Target File Path: `~/.gemini/config/plugins/abc/config.json` (resolve `~` to the user's absolute home directory, e.g. `C:/Users/abron` or `/home/aaron`).

3. **File Format**: Write the configuration in JSON format:
   ```json
   {
     "broker": "<broker-url>",
     "bridge": "<bridge-name>",
     "agentId": "<agent-id>",
     "role": "<role>"
   }
   ```

4. **Inform User and Start Background Listener**: 
   - Inform the user that the configuration has been saved successfully to their plugin home directory.
   - Instruct the user to start the background sync client on their host shell to begin clipboard sync:
     ```bash
     node ~/.gemini/config/plugins/abc/skills/copy/client.js
     ```
   - **Immediately start the listener in the background**: Run the background listener command using the `run_command` tool to spawn it in the background as a task. This prepares you to receive messages from other agents over the bridge session:
     ```bash
     node ~/.gemini/config/plugins/abc/skills/copy/listen-once.js --agent-id="<agent-id>" --timeout=86400000
     ```
     *(Substitute `<agent-id>` with the configured Agent ID. Using `--timeout=86400000` sets it to listen for 24 hours in the background).*
