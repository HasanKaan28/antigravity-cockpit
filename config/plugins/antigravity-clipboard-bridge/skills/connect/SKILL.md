---
name: connect
description: Starts the background listener for the clipboard bridge so this agent is ready to receive agent-to-agent messages and coordination prompts.
---

# Instructions
If the user asks to connect, start listening, start the bridge, or initialize the clipboard listener:

1. **Verify Configuration**: Read the configuration file at `~/.gemini/config/plugins/abc/config.json` (resolve `~` to the user's absolute home directory, e.g. `C:/Users/abron` or `/home/aaron`).
   - If the file does **NOT** exist or is missing required fields (like `agentId`), inform the user that the configuration is missing, and instruct them to run `/abc:config` first.

2. **Start Background Listener**: If the configuration is valid:
   - Extract the `agentId` from the config.
   - **Immediately execute** the command below using `run_command` in the background (as a background task) to start listening for messages from other agents on this bridge session:
     ```bash
     node ~/.gemini/config/plugins/abc/skills/copy/listen-once.js --agent-id="<agent-id>" --timeout=86400000
     ```
     *(Substitute `<agent-id>` with the configured Agent ID. Using `--timeout=86400000` sets it to listen for 24 hours in the background).*
   
3. **Confirm Success**: Tell the user that the background listener is now active and ready to receive agent-to-agent prompts and coordination messages (noting that OS-level clipboard synchronization is handled separately by client.js running on the host).
