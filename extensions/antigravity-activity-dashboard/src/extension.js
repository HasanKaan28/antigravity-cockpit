'use strict';
/**
 * Extension Entry Point.
 * Orchestrates commands, status bar indicator, serialization, and background quota watcher.
 */
const vscode = require('vscode');
const logger = require('./logger');
const { openDashboardPanel, collectAllDashboardData, attachPanelListeners, getWebviewHtml } = require('./webviewProvider');
const { getPanelData } = require('./collectors/panel');

let quotaInterval = null;
const lastKnownQuotas = { gemini: null, claude: null };
let restoredFromSerializer = false;

function activate(context) {
    logger.initLogger(vscode);
    logger.info('Antigravity Activity Dashboard & Cockpit v2.0 activating...');

    // 1. Register Commands
    const openCmd = vscode.commands.registerCommand('antigravity.openActivityDashboard', () => {
        openDashboardPanel(context, vscode);
    });

    const refreshCmd = vscode.commands.registerCommand('antigravity.refreshActivityDashboard', () => {
        collectAllDashboardData(vscode).then(_data => {
            vscode.window.showInformationMessage('🔄 Dashboard verileri güncellendi.');
        }).catch(err => {
            logger.error('Manual refresh failed:', err);
        });
    });

    const newChatCmd = vscode.commands.registerCommand('antigravity.cockpitNewChat', () => {
        vscode.commands.executeCommand('antigravity.startNewConversation').then(null, () => {
            vscode.commands.executeCommand('antigravity.toggleChatFocus').then(null, () => {
                vscode.commands.executeCommand('workbench.action.chat.open');
            });
        });
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
                    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, context.extensionUri, data);
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
    statusBar.tooltip = 'Antigravity Cockpit & Dashboard v2.0';
    statusBar.command = 'antigravity.openActivityDashboard';
    statusBar.show();
    context.subscriptions.push(statusBar);

    // 4. Background Silent Quota Polling (every 60s)
    quotaInterval = setInterval(async () => {
        try {
            const pData = await getPanelData();
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
                    vscode.window.showInformationMessage(`⚡ Antigravity Panel: Model kotasında belirgin değişim: ${changes.join(' | ')}`);
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
            if (!restoredFromSerializer) {
                openDashboardPanel(context, vscode);
            }
        }, 1200);
    }

    logger.info('Antigravity Activity Dashboard & Cockpit v2.0 successfully activated.');
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
