'use strict';
/**
 * Webview Provider: Manages webview panel lifecycle, CSP nonce generation,
 * secure message routing, and stale-while-revalidate background refresh.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const logger = require('./logger');
const { validateExternalUrl, parseRepoInput, isExistingPath, isLocalHtmlFile } = require('./util/security');
const { execFileAsync, launchInBrowser } = require('./util/proc');
const {
    toggleFavorite,
    toggleArchive,
    toggleItemFavorite,
    toggleItemArchived,
    applyUserFlags,
    addCustomRepo,
    getFavorites,
    getArchived
} = require('./storage');
const { getProjectsData } = require('./collectors/projects');
const { getGithubReposData } = require('./collectors/github');
const { getBrainSessions } = require('./collectors/sessions');
const { startOllama, stopOllama, toggleOllama, toggleLocalAi } = require('./util/ollama');
const { getPanelData } = require('./collectors/panel');
const { getSystemTelemetry } = require('./collectors/system');
const { getSkillsData } = require('./collectors/skills');
const { openCleanTranscript } = require('./transcriptViewer');
const { hostText } = require('./hostStrings');

let currentPanel = null;

// Mirrors the enum of antigravity.dashboard.language in package.json.
const SUPPORTED_LANGUAGES = ['auto', 'en', 'tr', 'de', 'es', 'fr', 'zh', 'ja'];

function getNonce() {
    return crypto.randomBytes(16).toString('hex');
}

// Collects fresh data, keeps it as the panel state and sends it, so later toggles never act on stale data.
async function pushFreshData(panel, vscodeInstance) {
    const data = await collectAllDashboardData(vscodeInstance);
    panel._lastData = data;
    panel.webview.postMessage({ command: 'updateData', data });
    return data;
}

// Refreshes the open dashboard, if any (used by the "Refresh Dashboard" command).
async function refreshDashboardPanel(vscodeInstance) {
    if (!currentPanel) return null;
    return pushFreshData(currentPanel, vscodeInstance);
}

// The webview identifies projects by path and GitHub repos by URL (older builds sent the repo name).
function findDashboardItem(data, id) {
    if (!data || !id) return null;
    return (data.projects || []).find(p => p.path === id || p.rawPath === id) ||
        (data.githubRepos || []).find(r => r.url === id || r.name === id) ||
        null;
}

async function collectAllDashboardData(vscodeInstance) {
    const config = vscodeInstance.workspace.getConfiguration('antigravity.dashboard');
    const customUser = config.get('githubUser', '');
    const scanRoots = config.get('scanRoots', []);
    const openOnStartup = config.get('openOnStartup', true);
    const configuredLanguage = config.get('language', 'auto');
    const ideLanguage = (vscodeInstance.env && vscodeInstance.env.language) || 'en';

    const wfPaths = (vscodeInstance.workspace.workspaceFolders || []).map(f => f.uri.fsPath);

    // Run parallel async collectors
    const [panelRes, sessRes, projRes, ghRes, skillsRes] = await Promise.all([
        getPanelData(),
        getBrainSessions(25),
        getProjectsData(wfPaths, scanRoots),
        getGithubReposData(customUser || null),
        getSkillsData(wfPaths.length > 0 ? wfPaths[0] : null)
    ]);

    const graphifyCount = projRes.filter(p => p.hasGraphify).length + ghRes.filter(r => r.hasGraphify).length;
    const systemRes = await getSystemTelemetry(graphifyCount);

    const favSet = getFavorites();
    const archSet = getArchived();

    return {
        ideLanguage,
        configuredLanguage,
        sessions: sessRes,
        projects: projRes,
        githubRepos: ghRes,
        githubUser: customUser || ghRes.targetUser || null,
        githubConnected: Boolean(customUser || ghRes.targetUser),
        favCount: favSet.size,
        archCount: archSet.size,
        ghCount: ghRes.length,
        openOnStartup,
        panel: panelRes,
        system: systemRes,
        skills: skillsRes
    };
}

function getWebviewHtml(webview, extensionUri, initialData) {
    const templatePath = path.join(extensionUri.fsPath, 'media', 'dashboard.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    const nonce = getNonce();
    const cacheBuster = Date.now();
    const cssUri = webview.asWebviewUri(vscodeUriJoin(extensionUri, 'media', 'dashboard.css')).toString() + `?v=${cacheBuster}`;
    const jsUri = webview.asWebviewUri(vscodeUriJoin(extensionUri, 'media', 'dashboard.js')).toString() + `?v=${cacheBuster}`;

    const csp = [
        "default-src 'none'",
        `font-src ${webview.cspSource}`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src ${webview.cspSource} 'nonce-${nonce}'`,
        `img-src ${webview.cspSource} data:`,
        "connect-src 'none'"
    ].join('; ');

    const safeJson = JSON.stringify(initialData || {}).replace(/</g, '\\u003c');

    // Function replacers: a string replacement would expand $& / $' / $` found in commit
    // messages or session titles and splice pieces of the template into the page.
    return template
        .replace('{{CSP}}', () => csp)
        .replace('{{CSS_URI}}', () => cssUri)
        .replace('{{JS_URI}}', () => jsUri)
        .replaceAll('{{NONCE}}', () => nonce)
        .replace('{{INITIAL_DATA}}', () => safeJson);
}

function vscodeUriJoin(baseUri, ...segments) {
    return baseUri.with({ path: path.posix.join(baseUri.path, ...segments) });
}

function handleWebviewMessage(panel, message, vscodeInstance, _extensionUri) {
    if (!message || !message.command) return;

    switch (message.command) {
        case 'refresh':
            pushFreshData(panel, vscodeInstance).then(() => {
                vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'dataRefreshed'));
            }).catch(err => {
                logger.error('Refresh failed:', err);
            });
            break;

        case 'toggleFavorite':
        case 'toggleArchive': {
            // Toggle with the same keys the collectors read, then recompute every item's flags,
            // so the data sent back matches what a full refresh would show.
            const isFav = message.command === 'toggleFavorite';
            const item = findDashboardItem(panel._lastData, message.id);
            if (item) {
                if (isFav) toggleItemFavorite(item); else toggleItemArchived(item);
            } else if (isFav) {
                toggleFavorite(message.id);
            } else {
                toggleArchive(message.id);
            }
            if (panel._lastData) {
                applyUserFlags(panel._lastData);
                panel.webview.postMessage({
                    command: 'updateData',
                    data: { ...panel._lastData, favCount: getFavorites().size, archCount: getArchived().size }
                });
            }
            break;
        }

        case 'openFolder': {
            const fPath = message.path;
            if (isExistingPath(fPath)) {
                const newWin = Boolean(message.newWindow);
                vscodeInstance.commands.executeCommand('vscode.openFolder', vscodeInstance.Uri.file(fPath), newWin);
            } else {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'folderMissing', { path: fPath || hostText(vscodeInstance, 'invalidPath') }));
            }
            break;
        }

        case 'openTranscript': {
            const fPath = (message.path || '').trim();
            openCleanTranscript(fPath, vscodeInstance, _extensionUri, { theme: message.theme, lang: message.lang });
            break;
        }

        case 'openFile': {
            const fPath = (message.path || '').trim();
            if (fPath.toLowerCase().endsWith('transcript.jsonl')) {
                openCleanTranscript(fPath, vscodeInstance, _extensionUri, { theme: message.theme, lang: message.lang });
                break;
            }
            if (isExistingPath(fPath)) {
                vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.file(fPath)).then(doc => {
                    vscodeInstance.window.showTextDocument(doc);
                }, err => {
                    vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'fileOpenFailed', { error: err.message }));
                });
            } else {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'fileMissing', { path: fPath }));
            }
            break;
        }

        case 'openSessionFolder': {
            const fPath = message.path;
            if (isExistingPath(fPath)) {
                vscodeInstance.commands.executeCommand('revealFileInOS', vscodeInstance.Uri.file(fPath));
            }
            break;
        }

        case 'openChat':
            (async () => {
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
                        await vscodeInstance.commands.executeCommand(cmd);
                        break;
                    } catch {
                        /* ignore */
                    }
                }
            })();
            break;

        case 'openFolderDialog':
            vscodeInstance.commands.executeCommand('vscode.openFolder');
            break;

        case 'openSkillsFolder': {
            const userHome = os.homedir();
            const skillsDir = path.join(userHome, '.gemini', 'config', 'skills');
            if (!fs.existsSync(skillsDir)) {
                try { fs.mkdirSync(skillsDir, { recursive: true }); } catch { /* best effort */ }
            }
            vscodeInstance.commands.executeCommand('revealFileInOS', vscodeInstance.Uri.file(skillsDir));
            break;
        }

        case 'openExternalUrl': {
            const valid = validateExternalUrl(message.url);
            if (valid) {
                launchInBrowser(valid, vscodeInstance);
            } else {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'invalidUrl', { url: message.url }));
            }
            break;
        }

        case 'openGraphify': {
            const gPath = isLocalHtmlFile(message.path) ? message.path.trim() : null;
            if (gPath) {
                launchInBrowser(gPath, vscodeInstance);
                vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'graphifyOpened'));
            } else {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'graphifyMissing'));
            }
            break;
        }

        case 'toggleOllama': {
            toggleOllama().then(async (res) => {
                if (res.success) {
                    vscodeInstance.window.showInformationMessage(res.message);
                } else {
                    vscodeInstance.window.showWarningMessage(res.message);
                }
                await pushFreshData(panel, vscodeInstance);
            }).catch(err => {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'ollamaError', { error: err.message || String(err) }));
            });
            break;
        }

        case 'toggleLocalAi': {
            const engineId = message.engineId || 'ollama';
            toggleLocalAi(engineId).then(async (res) => {
                if (res.success) {
                    vscodeInstance.window.showInformationMessage(res.message);
                } else {
                    vscodeInstance.window.showWarningMessage(res.message);
                }
                await pushFreshData(panel, vscodeInstance);
            }).catch(err => {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'engineError', { error: err.message || String(err) }));
            });
            break;
        }

        case 'startOllama': {
            startOllama().then(async (res) => {
                if (res.success) {
                    vscodeInstance.window.showInformationMessage(res.message);
                } else {
                    vscodeInstance.window.showWarningMessage(res.message);
                }
                await pushFreshData(panel, vscodeInstance);
            }).catch(err => {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'ollamaStartError', { error: err.message || String(err) }));
            });
            break;
        }

        case 'stopOllama': {
            stopOllama().then(async (res) => {
                if (res.success) {
                    vscodeInstance.window.showInformationMessage(res.message);
                } else {
                    vscodeInstance.window.showWarningMessage(res.message);
                }
                await pushFreshData(panel, vscodeInstance);
            }).catch(err => {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'ollamaStopError', { error: err.message || String(err) }));
            });
            break;
        }

        case 'cloneGithubRepo': {
            const parsed = parseRepoInput(message.name);
            if (!parsed) {
                vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'invalidRepoName'));
                break;
            }

            const userDir = os.homedir();
            const targetDir = path.join(userDir, 'github-repos', parsed.repo);

            if (isExistingPath(targetDir)) {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'folderExists', { path: targetDir }));
                break;
            }

            vscodeInstance.window.withProgress({
                location: vscodeInstance.ProgressLocation.Notification,
                title: hostText(vscodeInstance, 'cloning', { name: parsed.fullName }),
                cancellable: false
            }, async () => {
                try {
                    await execFileAsync('gh', ['repo', 'clone', parsed.fullName, targetDir], {}, 60000);
                    vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'cloned', { name: parsed.repo, path: targetDir }));
                    await pushFreshData(panel, vscodeInstance);
                } catch (err) {
                    vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'cloneFailed', {
                        error: err.stderr || err.error?.message || hostText(vscodeInstance, 'unknownError')
                    }));
                }
            });
            break;
        }

        case 'addCustomGithubRepo': {
            const parsed = parseRepoInput(message.text);
            if (parsed) {
                addCustomRepo({
                    name: parsed.repo,
                    fullName: parsed.fullName,
                    url: parsed.url,
                    description: 'Custom repository',
                    isPrivate: false,
                    language: 'GitHub Repo',
                    pushedAt: new Date().toISOString()
                });
                vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'repoAdded', { name: parsed.fullName }));
                pushFreshData(panel, vscodeInstance).catch(err => logger.error('Refresh after adding a repository failed:', err));
            } else {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'invalidRepoFormat'));
            }
            break;
        }

        case 'openSkillFile': {
            const rawPath = (message.path || '').trim();
            const normalized = path.normalize(rawPath);
            if (rawPath && fs.existsSync(normalized)) {
                vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.file(normalized)).then(doc => {
                    vscodeInstance.window.showTextDocument(doc);
                }, err => {
                    vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'skillOpenFailed', { error: err.message }));
                });
            } else {
                vscodeInstance.window.showWarningMessage(hostText(vscodeInstance, 'skillMissing', { path: rawPath || hostText(vscodeInstance, 'unknownPath') }));
            }
            break;
        }

        case 'copySkillPrompt': {
            if (message.prompt) {
                vscodeInstance.env.clipboard.writeText(message.prompt).then(() => {
                    vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'skillPromptCopied', { prompt: message.prompt }));
                });
            }
            break;
        }

        case 'chatWithSkill': {
            const prompt = (message.prompt || '').trim();
            (async () => {
                if (prompt) {
                    try {
                        await vscodeInstance.env.clipboard.writeText(prompt);
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
                        await vscodeInstance.commands.executeCommand(cmd);
                        break;
                    } catch {
                        /* ignore */
                    }
                }

                if (prompt) {
                    try {
                        await vscodeInstance.commands.executeCommand('antigravity.sendPromptToAgentPanel', prompt);
                    } catch {
                        /* ignore */
                    }
                }

                const shortPrompt = prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt;
                vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'chatStarted', { prompt: shortPrompt }));
            })();
            break;
        }

        case 'toggleStartup': {
            const cfg = vscodeInstance.workspace.getConfiguration('antigravity.dashboard');
            cfg.update('openOnStartup', Boolean(message.value), vscodeInstance.ConfigurationTarget.Global);
            vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, message.value ? 'startupOn' : 'startupOff'));
            break;
        }

        case 'setLanguage': {
            const lang = message.language || 'auto';
            if (!SUPPORTED_LANGUAGES.includes(lang)) break;
            const config = vscodeInstance.workspace.getConfiguration('antigravity.dashboard');
            config.update('language', lang, vscodeInstance.ConfigurationTarget.Global);
            break;
        }

        case 'refreshAgQuota': {
            (async () => {
                try {
                    await vscodeInstance.commands.executeCommand('tfa.refresh');
                } catch {
                    // Ignore if command not present
                }
                try {
                    const pData = await getPanelData();
                    panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
                    if (panel._lastData) {
                        panel._lastData.panel = pData;
                    }
                    if (message.isManual) {
                        vscodeInstance.window.showInformationMessage(hostText(vscodeInstance, 'quotaRefreshed'));
                    }
                } catch (err) {
                    logger.error('Failed to refresh panel quota:', err);
                }
            })();
            break;
        }

        case 'openAgSettings':
            vscodeInstance.commands.executeCommand('workbench.action.openSettings', 'tfa');
            break;

        case 'openAgSidebar':
            vscodeInstance.commands.executeCommand('tfa.openPanel');
            break;
    }
}

let liveQuotaSyncInterval = null;
let liveQuotaWatchedPath = null;

function setupLiveQuotaSync(panel) {
    if (liveQuotaSyncInterval) {
        clearInterval(liveQuotaSyncInterval);
        liveQuotaSyncInterval = null;
    }
    if (liveQuotaWatchedPath) {
        try { fs.unwatchFile(liveQuotaWatchedPath); } catch { /* best effort */ }
        liveQuotaWatchedPath = null;
    }

    // Locate active state.vscdb database on system to watch file changes directly
    const candidates = [];
    if (process.platform === 'win32') {
        const appdata = process.env.APPDATA || '';
        if (appdata) {
            candidates.push(
                path.join(appdata, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
                path.join(appdata, 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
                path.join(appdata, 'Code', 'User', 'globalStorage', 'state.vscdb')
            );
        }
    } else if (process.platform === 'darwin') {
        const home = process.env.HOME || '';
        candidates.push(
            path.join(home, 'Library', 'Application Support', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
            path.join(home, 'Library', 'Application Support', 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
            path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'state.vscdb')
        );
    } else {
        const home = process.env.HOME || '';
        candidates.push(
            path.join(home, '.config', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
            path.join(home, '.config', 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
            path.join(home, '.config', 'Code', 'User', 'globalStorage', 'state.vscdb')
        );
    }

    const activeDb = candidates.find(p => fs.existsSync(p));
    if (activeDb) {
        liveQuotaWatchedPath = activeDb;
        try {
            // Watch state.vscdb with 1000ms polling for instant token quota reaction
            fs.watchFile(activeDb, { interval: 1000 }, async (curr, prev) => {
                if (curr.mtimeMs !== prev.mtimeMs && currentPanel === panel && panel.visible) {
                    try {
                        const pData = await getPanelData();
                        if (pData && (pData.status === 'ok' || (pData.groups && pData.groups.length > 0))) {
                            panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
                            if (panel._lastData) {
                                panel._lastData.panel = pData;
                            }
                        }
                    } catch { /* best effort */ }
                }
            });
        } catch { /* best effort */ }
    }

    // High-frequency live quota & token synchronization loop every 2.5s when panel is active
    liveQuotaSyncInterval = setInterval(async () => {
        if (!currentPanel || currentPanel !== panel || !panel.visible) return;
        try {
            const pData = await getPanelData();
            if (pData && (pData.status === 'ok' || (pData.groups && pData.groups.length > 0))) {
                panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
                if (panel._lastData) {
                    panel._lastData.panel = pData;
                }
            }
        } catch {
            // silent sync
        }
    }, 2500);
}

function attachPanelListeners(panel, context, vscodeInstance) {
    currentPanel = panel;
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
            vscodeUriJoin(context.extensionUri, 'media')
        ]
    };

    panel.webview.onDidReceiveMessage(
        msg => handleWebviewMessage(panel, msg, vscodeInstance, context.extensionUri),
        undefined,
        context.subscriptions
    );

    setupLiveQuotaSync(panel);

    panel.onDidChangeViewState(
        e => {
            if (e.webviewPanel.visible) {
                getPanelData().then(pData => {
                    panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
                }).catch(() => {});
            }
        },
        null,
        context.subscriptions
    );

    panel.onDidDispose(() => {
        if (currentPanel === panel) currentPanel = null;
        if (liveQuotaWatchedPath) {
            try { fs.unwatchFile(liveQuotaWatchedPath); } catch { /* best effort */ }
            liveQuotaWatchedPath = null;
        }
        if (liveQuotaSyncInterval) {
            clearInterval(liveQuotaSyncInterval);
            liveQuotaSyncInterval = null;
        }
    }, null, context.subscriptions);
}

async function openDashboardPanel(context, vscodeInstance) {
    if (currentPanel) {
        currentPanel.reveal(vscodeInstance.ViewColumn.One);
        try {
            const data = await collectAllDashboardData(vscodeInstance);
            currentPanel._lastData = data;
            currentPanel.webview.html = getWebviewHtml(currentPanel.webview, context.extensionUri, data);
        } catch (err) {
            logger.error('Failed to refresh existing dashboard panel:', err);
        }
        return currentPanel;
    }

    currentPanel = vscodeInstance.window.createWebviewPanel(
        'antigravityActivityDashboard',
        'Antigravity Cockpit',
        vscodeInstance.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscodeUriJoin(context.extensionUri, 'media')
            ]
        }
    );

    attachPanelListeners(currentPanel, context, vscodeInstance);

    // Initial load: collect data and render
    try {
        const data = await collectAllDashboardData(vscodeInstance);
        currentPanel._lastData = data;
        currentPanel.webview.html = getWebviewHtml(currentPanel.webview, context.extensionUri, data);
    } catch (err) {
        logger.error('Failed to initialize dashboard panel:', err);
        currentPanel.webview.html = getWebviewHtml(currentPanel.webview, context.extensionUri, {});
    }

    return currentPanel;
}

function getCurrentPanel() {
    return currentPanel;
}

module.exports = {
    openDashboardPanel,
    collectAllDashboardData,
    getWebviewHtml,
    attachPanelListeners,
    getCurrentPanel,
    refreshDashboardPanel
};
