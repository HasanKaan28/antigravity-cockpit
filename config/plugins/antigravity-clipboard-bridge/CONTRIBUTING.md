# Contributor Workflow: Setting Up & Verifying

To contribute to `antigravity-clipboard-bridge`, follow these steps to set up your environment, synchronize logic, and verify the plugin locally.

## 1. Environment Setup
Ensure you have the following prerequisites:
- **Antigravity CLI** installed.
- **Upstream Repository**: You must have `agent-bridge-clipboard` cloned as a sibling directory to this project.

```bash
# Clone the projects
git clone https://github.com/aaronbronow/agent-bridge-clipboard
git clone https://github.com/aaronbronow/antigravity-clipboard-bridge

# Your directory structure should look like this:
# /dev/
#   ├── agent-bridge-clipboard/
#   └── antigravity-clipboard-bridge/
```

## 2. Synchronize Upstream Logic
This project uses a modular "hybrid distribution" model. It vendors the core transport logic from the upstream `dist/` directory.

```bash
# First, build the upstream project to generate modular artifacts
cd ../agent-bridge-clipboard
make build

# Return to this project and import the latest skill logic
cd ../antigravity-clipboard-bridge
make import-upstream
```

## 3. Verify Files & Branding
The `import-upstream` target automatically applies Antigravity-specific branding and fixes pathing. Use the built-in integration tests to verify the project state:

```bash
make test
```
*Expected output: `All integration tests passed!`*

## 4. Run Locally in a Sandbox
To test the plugin logic within an agent session without installing it globally, use the Antigravity CLI's **Sandbox Mode**.

```bash
# Start a sandbox session in the current directory
agy --sandbox .
```

### Verification Steps inside the Agent:
1.  **Check Help**: Run `/clipboard:help` or ask the agent for help with clipboard synchronization. It should present the instructions from `skills/help/SKILL.md`.
2.  **Test Copy Action**: Run `/clipboard:copy "Hello from Sandbox"` and verify that your host clipboard is updated.
3.  **Test AI Skill**: Ask the agent, "Copy the current date to my clipboard." It should use the `copy` skill to execute the `copy.sh` script.

## 5. Submitting Changes
- **Logic Changes**: If you need to modify the transport logic (e.g., `copy.sh`), do it in the **upstream** project and then re-run `make import-upstream` here.
- **Antigravity Metadata**: Changes to `plugin.json` or the `/clipboard` commands should be made directly in this repository.

## 7. Key Plugin Constraints & Best Practices
When contributing to this plugin, adhere to these technical constraints identified through development:

- **Centralized Help & Troubleshooting**: Keep all environment constraints, setup guidelines, policy checks, and troubleshooting context in `skills/help/SKILL.md` so that they are presented as a single source of truth for both users and agents under `/clipboard:help`. This ensures rules are consistently accessible.
- **Path Resolution in Skills**: When writing instructions for skills (in `SKILL.md` files), the agent may run commands relative to the user's current working directory. To ensure helper scripts are always found regardless of where the user is working, use absolute, shell-expandable paths targeting the installed plugin location: `~/.gemini/antigravity-cli/plugins/clipboard/skills/copy/copy.sh`.
- **OSC 52 Constraints**: The transport is write-only. Never instruct the agent to attempt to read from the clipboard.
- **Dynamic Slash Command Mapping**: Slash commands for custom skills are dynamically registered by the Antigravity CLI following the format `/<plugin_name>:<skill_name>` (e.g., `/clipboard:copy`). The plugin name is defined in `plugin.json` (under `"name"`), and the skill name is taken directly from the `name:` field in the `SKILL.md` YAML frontmatter.
- **Help Text Auto-Extraction**: The CLI automatically extracts the command-line help description displayed for the slash command from the `description:` field in the YAML frontmatter of `skills/<skill_name>/SKILL.md`. Keep this description clear and concise, as it is exposed directly to the user in interactive help contexts.
- **Local Installation Copy (No Symlinks by Default)**: When installing the plugin locally using `agy plugins install .`, the CLI creates a **literal directory copy** under `~/.gemini/antigravity-cli/plugins/clipboard` instead of a symbolic link. (Note: The built-in `agy plugins link` command is specifically for linking custom plugin marketplaces, not individual local development directories). Consequently, subsequent local code changes in your workspace will not reflect in your active shell environment.
  - *Sandbox Option*: Use **Sandbox Mode** (`agy --sandbox .`) for interactive testing with real-time updates.
  - *Symlink Development Workaround*: To develop directly against your live workspace in the global shell, you can first install the plugin once (`agy plugins install .`) to register it in `import_manifest.json`, then manually replace the installed folder with a symbolic link:
    ```bash
    # Remove the literal copy and replace it with a symlink to your dev directory
    rm -rf ~/.gemini/antigravity-cli/plugins/clipboard
    ln -s /Users/aaron/dev/antigravity-clipboard-bridge ~/.gemini/antigravity-cli/plugins/clipboard
    ```



## 8. Releasing
To automate the release process, use the `make release` target. This command automatically verifies that integration tests pass, bumps the version in `gemini-extension.json`, commits and pushes the version bump, creates an annotated git tag, pushes the tag, and creates a GitHub release with the required installation and update instructions.

```bash
make release VERSION=1.0.2
```

Every release **must** include the standard installation instructions in the release notes:
- **Install Command**: Use a fully qualified URL: `agy plugins install https://github.com/aaronbronow/antigravity-clipboard-bridge`.
- **Update Command**: `agy plugins update clipboard`.

