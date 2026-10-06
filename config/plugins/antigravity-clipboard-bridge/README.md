# Antigravity Clipboard Bridge Skill

An Antigravity skill that enables cross-environment clipboard synchronization (SSH, WSL, Docker) using safe escape sequences.

## Why?

Long links can't be clicked or easily copied out of CLI.

<img width="632" height="255" alt="gemini-copy-link1" src="https://github.com/user-attachments/assets/511c2f99-ab98-4196-bf06-1d63b168bfb0" />

Anything that can be written to the terminal can be sent to the clipboard.

<img width="1242" height="672" alt="image" src="https://github.com/user-attachments/assets/b5bd7709-61b5-4ad5-9409-0f53bba1bdc9" />

Long content can be sent directly to the clipboard.

<img width="1242" height="672" alt="image" src="https://github.com/user-attachments/assets/52068268-89ed-421a-948b-f7a00453a678" />

Works in Powershell

<img width="1229" height="262" alt="image" src="https://github.com/user-attachments/assets/96a6c3ce-28e1-42e7-87ca-eda553614fbd" />

Works in Antigravity on Windows

<img width="759" height="293" alt="image" src="https://github.com/user-attachments/assets/1a7c8655-5725-4e61-9751-0dc097ae4b57" />



## Usage

**Prompt**
```
> Give me a find command to delete all node_modules folders older than 30 days and copy it to my clipboard.
```
**Response**
```
◇ I've sent the following command to your clipboard:
  find . -name "node_modules" -type d -mtime +30 -prune -exec rm -rf {} +
```

**Prompt**
```
> Generate a sha256 password and copy it to my clipboard.
```
**Response**
```
◇ I've generated a SHA256 password and sent the clipboard sequence to your terminal.
  a9d5e46b3a02af97e6b80734d64d3d42e10b2da110d6ed9f04df33879a1f16ee
```

**Prompt**
```
> Copy that very long URL from the last message to my clipboard.
```
**Response**
```
◇ Copied just the URL to your clipboard.
  https://accounts.google.com/o/oauth2/v2/auth?client_id=109283746556-c9i8u7y6t5r4e3w2q1a0s9d8f7g
  6h5j4.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fmyapp.example.com%2Fauth%2Fgoogle%2
  Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.readonly%20h
  ttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events%20https%3A%2F%2Fwww.googleapis.com%2Fa
  uth%2Fgmail.readonly%20openid%20profile%20email&access_type=offline&include_granted_scopes=true
  &state=af0ifjsldjkshfjksdhfksjdhfksjdhf&prompt=consent&code_challenge=E9Melho2Vp7j9vYJDe69Hq5H9
  _P5H76S9g1eA&code_challenge_method=S256
```

## How it works
- **SSH Terminal/Tmux**: Agent sends [OSC 52 escape sequence](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Operating-System-Commands) to the remote terminal which is received by your local terminal environment.
- **MacOS**: Agent uses `pbcopy`.
- **WSL**: Agent uses `clip.exe`.
- **Powershell**: Agent uses `powershell.exe -NoProfile -NonInteractive -Command "Set-Clipboard -Value \$Input"`.
- **Docker/Sandbox**: Agent writes to a temp file which you can `tail -F` and pipe to your local terminal.
- **Agent Skill**: Allows the AI to "copy to clipboard" autonomously.
- **Slash Command**: Manual copy shortcut via `/clipboard:copy`.

## Limitations
If the agent CLI doesn't have access to `/dev/tty`, none of the OS clipboard helpers are available, and the container has no access to a volume or shared filesystem, then the agent won't be able to set the clipboard. Running in headless mode is such a case.

## Installation
To install the plugin, use the fully qualified URL:
```bash
agy plugins install https://github.com/aaronbronow/antigravity-clipboard-bridge
```

## Update
To update an existing installation:
```bash
agy plugins update clipboard
```

Or update all plugins:
```bash
agy plugins update --all
```

## Commands
Ask Antigravity to "copy the last code block to my clipboard" or use the slash command:
```bash
/clipboard:copy "text to copy"
```

## Sandbox Setup (Docker/Remote)
If you are running Antigravity CLI inside a Docker sandbox or a remote environment where the TTY is restricted, you must start a listener on your **host machine** to bridge the gap:

### Option A: Raw Stream (Recommended)
Run this in a separate terminal on your host (WSL/macOS/Linux):
```bash
# Pipes the raw escape sequences directly to your TTY
tail -F .clipboard_bypass > $(tty)
```

### Option B: Named Pipe
Run this in a separate terminal on your host:
```bash
mkfifo .clipboard_pipe
cat .clipboard_pipe > $(tty)
```
