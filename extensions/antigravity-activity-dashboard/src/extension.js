'use strict';
/**
 * Extension Entry Point.
 * Orchestrates commands, status bar indicator, serialization, and background quota watcher.
 */
const vscode = require('vscode');
const logger = require('./logger');
const { openDashboardPanel, collectAllDashboardData, attachPanelListeners, getWebviewHtml, getCurrentPanel, refreshDashboardPanel, followGithubUpdate } = require('./webviewProvider');
const { getPanelData } = require('./collectors/panel');
const { hostText } = require('./hostStrings');

let quotaInterval = null;
const lastKnownQuotas = { gemini: null, claude: null };
let restoredFromSerializer = false;

function hasDashboardTab() {
    try {
        const groups = (vscode.window.tabGroups && vscode.window.tabGroups.all) || [];
        return groups.some(group => group.tabs.some(tab =>
            tab.input && typeof tab.input.viewType === 'string' && tab.input.viewType.endsWith('antigravityActivityDashboard')));
    } catch {
        return false;
    }
}

function activate(context) {
    logger.initLogger(vscode);
    logger.info('Antigravity Activity Dashboard & Cockpit v2.0 activating...');

    // 1. Register Commands
    const openCmd = vscode.commands.registerCommand('antigravity.openActivityDashboard', () => {
        openDashboardPanel(context, vscode);
    });

    const refreshCmd = vscode.commands.registerCommand('antigravity.refreshActivityDashboard', () => {
        refreshDashboardPanel(vscode).then(() => {
            vscode.window.showInformationMessage(hostText(vscode, 'dataRefreshed'));
        }).catch(err => {
            logger.error('Manual refresh failed:', err);
        });
    });

    const newChatCmd = vscode.commands.registerCommand('antigravity.cockpitNewChat', async (prompt) => {
        if (prompt && typeof prompt === 'string') {
            try {
                await vscode.env.clipboard.writeText(prompt);
            } catch {
                /* ignore */
            }
        }

        const openCommands = [
            'antigravity.openChatView',
            'antigravity.startNewConversation',
            'antigravity.toggleChatFocus',
            'workbench.action.chat.open',
            'workbench.action.chat.newChat',
            'workbench.action.quickchat.toggle'
        ];

        for (const cmd of openCommands) {
            try {
                await vscode.commands.executeCommand(cmd);
                break;
            } catch {
                /* ignore */
            }
        }

        if (prompt && typeof prompt === 'string') {
            try {
                await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', prompt);
            } catch {
                /* ignore */
            }
        }
    });

    context.subscriptions.push(openCmd, refreshCmd, newChatCmd);

    // 2. Webview Panel Serializer for persistence across IDE reloads
    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer('antigravityActivityDashboard', {
            async deserializeWebviewPanel(webviewPanel) {
                restoredFromSerializer = true;
                attachPanelListeners(webviewPanel, context, vscode);
                try {
                    const data = await collectAllDashboardData(vscode);
                    webviewPanel._lastData = data;
                    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, context.extensionUri, data);
                    followGithubUpdate(webviewPanel, data);
                } catch (err) {
                    logger.error('Deserialization data fetch error:', err);
                    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, context.extensionUri, {});
                }
            }
        });
    }

    // 3. Status Bar Item
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.text = '$(dashboard) Cockpit';
    statusBar.tooltip = 'Antigravity Cockpit';
    statusBar.command = 'antigravity.openActivityDashboard';
    statusBar.show();
    context.subscriptions.push(statusBar);

    // 4. Background Silent Quota Polling (every 60s)
    quotaInterval = setInterval(async () => {
        try {
            const pData = await getPanelData();
            const panel = getCurrentPanel && getCurrentPanel();
            if (panel && panel.visible) {
                panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
            }
            if (pData.status === 'ok' && Array.isArray(pData.groups)) {
                const g = pData.groups.find(x => x.id === 'gemini');
                const c = pData.groups.find(x => x.id === 'non-google' || x.id === 'claude');
                const gVal = g ? Math.round(Number(g.remaining)) : null;
                const cVal = c ? Math.round(Number(c.remaining)) : null;

                if (lastKnownQuotas.gemini === null && gVal !== null) lastKnownQuotas.gemini = gVal;
                if (lastKnownQuotas.claude === null && cVal !== null) lastKnownQuotas.claude = cVal;

                const diffG = (gVal !== null && lastKnownQuotas.gemini !== null) ? Math.abs(gVal - lastKnownQuotas.gemini) : 0;
                const diffC = (cVal !== null && lastKnownQuotas.claude !== null) ? Math.abs(cVal - lastKnownQuotas.claude) : 0;

                if (diffG >= 5 || diffC >= 5) {
                    const changes = [];
                    if (diffG >= 5) {
                        changes.push(`Gemini: %${lastKnownQuotas.gemini} ➔ %${gVal}`);
                        lastKnownQuotas.gemini = gVal;
                    }
                    if (diffC >= 5) {
                        changes.push(`Claude: %${lastKnownQuotas.claude} ➔ %${cVal}`);
                        lastKnownQuotas.claude = cVal;
                    }
                    vscode.window.showInformationMessage(hostText(vscode, 'quotaChanged', { changes: changes.join(' | ') }));
                }
            }
        } catch {
            // silent background poll
        }
    }, 60000);

    // 5. Auto-launch on startup if enabled and not already restored
    const config = vscode.workspace.getConfiguration('antigravity.dashboard');
    const openOnStartup = config.get('openOnStartup', true);
    if (openOnStartup) {
        setTimeout(() => {
            // A restored tab is only deserialized once it is shown, so also look for one in the tab strip.
            if (!restoredFromSerializer && !hasDashboardTab()) {
                openDashboardPanel(context, vscode);
            }
        }, 1200);
    }

    // 6. Live Hot-Reload Watcher for media/dashboard files
    try {
        const mediaWatcher = vscode.workspace.createFileSystemWatcher('**/media/dashboard.*');
        const triggerReload = async () => {
            const panel = getCurrentPanel && getCurrentPanel();
            if (panel) {
                try {
                    const data = panel._lastData || await collectAllDashboardData(vscode);
                    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, data);
                    logger.info('Live reloaded dashboard webview.');
                } catch (e) {
                    logger.error('Failed to live reload dashboard:', e);
                }
            }
        };
        mediaWatcher.onDidChange(triggerReload);
        mediaWatcher.onDidCreate(triggerReload);
        context.subscriptions.push(mediaWatcher);
    } catch {
        // file watcher setup exception ignored
    }

    logger.info('Antigravity Activity Dashboard & Cockpit v2.2 successfully activated.');
}

function deactivate() {
    if (quotaInterval) {
        clearInterval(quotaInterval);
        quotaInterval = null;
    }
}

module.exports = {
    activate,
    deactivate
};
