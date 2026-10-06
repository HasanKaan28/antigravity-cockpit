---
name: copy
description: Copies text to the clipboard. Supports setting the user's clipboard from agent CLI on Mac, WSL, Powershell, and over SSH. Optional file bypass mode for Docker sandboxes.
---

# Instructions
If the user asks to copy text to the clipboard, run the `copy.js` script with the text as an argument:

```bash
node ~/.gemini/config/plugins/abc/skills/copy/copy.js "the text to copy"
```

> [!IMPORTANT]
> **PREFIX ALLOWLIST COMPATIBILITY:** Always run this command directly on a single line. Do **NOT** chain it with semicolons, set variables, or use pipes at the start of the command (e.g. do not run `$text = "..."; node copy.js $text`). This ensures the command starts with the static prefix `node ~/.gemini/.../copy.js` so the user can easily whitelist the command prefix once.

### Usage Steps:
1. **Identify the Content**: Determine the exact text, code block, or command output to be copied.
2. **Execute Command**: Run the command above using the `run_command` tool.
3. **Escaping**: Properly escape any double quotes (`"`) or backticks (`` ` ``) in the text argument.
4. **Verification**: Confirm to the user that the text was copied successfully. If the output indicates it was copied via `.clipboard_bypass` (sandbox bypass file), notify the user that they must run `tail -F .clipboard_bypass > $(tty)` in another terminal on their host machine to complete the copy operation.

## Agent-to-Agent Communication Protocol
When you need to send messages to other agents or wait for responses on the Tailscale WebSocket bridge (for multi-agent coordination or long-running dialogues):

### 1. Sending a Message to Another Agent
Use the `send-msg.js` script to send a message to a specific agent:
```bash
node ~/.gemini/config/plugins/abc/skills/copy/send-msg.js "Message content here" --recipient="surface95-agent" --type="prompt"
```
*   `--recipient`: Set to the target agent ID (e.g., `surface95-agent`), `"orchestrator"` to target the orchestrator, or omit/set to `"*"` for broadcast.
*   `--type`: The type of message (`prompt`, `status`, `result`, or `abort`).

> [!IMPORTANT]
> **PREFIX ALLOWLIST COMPATIBILITY:** Always execute the `send-msg.js` script directly as a single command starting with `node`. Do **NOT** chain commands with semicolons, set variables, or pipe input at the start. Running it directly allows the CLI to match the static prefix (`node ~/.gemini/.../send-msg.js`) so the user can whitelist it permanently.

### 2. Awaiting a Response (Listen Once)
To wait for a response without polling, run the `listen-once.js` script as a background task. Since it is run in the background, when it receives a message it will print it to stdout and exit. This will trigger a reactive wakeup in the Antigravity CLI and deliver the message directly to your context.

**Always run the listen command immediately after sending a message if you are waiting for a response:**
```bash
# Start the listener in the background
node ~/.gemini/config/plugins/abc/skills/copy/listen-once.js --agent-id="YOUR_AGENT_ID" --type="prompt"
```
*   `--agent-id`: Your unique agent ID (to identify yourself to the broker and match the recipient field of incoming messages).
*   `--type`: (Optional) filter to only wake up for a specific message type.
*   `--timeout`: (Optional) timeout in milliseconds before exiting with an error (defaults to `300000` / 5 minutes).

**Important**: After executing the background listener command, stop calling any more tools. The system will automatically wake you up when the listener receives a message and exits.

> [!IMPORTANT]
> **CONNECTION LOSS HANDLED:** If the background listener task exits with a warning or error indicating the connection was closed (e.g. containing `[Disconnected] Connection to the broker was closed before a message was received`), do **NOT** attempt to troubleshoot, read task logs, write connection scripts, or run network diagnostics. Simply inform the user that the connection to the broker was lost/closed and stop execution.

