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
const { validateExternalUrl, parseRepoInput, isExistingPath } = require('./util/security');
const { execFileAsync, launchInBrowser } = require('./util/proc');
const {
    toggleFavorite,
    toggleArchive,
    addCustomRepo,
    getFavorites,
    getArchived
} = require('./storage');
const { getProjectsData } = require('./collectors/projects');
const { getGithubReposData } = require('./collectors/github');
const { getBrainSessions } = require('./collectors/sessions');
const { getCbmData } = require('./collectors/cbm');
const { startOllama, stopOllama, toggleOllama, toggleLocalAi } = require('./util/ollama');
const { getPanelData } = require('./collectors/panel');
const { getSystemTelemetry } = require('./collectors/system');
const { getSkillsData } = require('./collectors/skills');
const { openCleanTranscript } = require('./transcriptViewer');

let currentPanel = null;

function getNonce() {
    return crypto.randomBytes(16).toString('hex');
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
    const [cbmRes, panelRes, sessRes] = await Promise.all([
        getCbmData(),
        getPanelData(),
        getBrainSessions(25)
    ]);

    const [projRes, ghRes] = await Promise.all([
        getProjectsData(cbmRes.dbMap, wfPaths, scanRoots),
        getGithubReposData(cbmRes.dbMap, customUser || null)
    ]);

    const graphifyCount = projRes.filter(p => p.hasGraphify).length + ghRes.filter(r => r.hasGraphify).length;
    const systemRes = await getSystemTelemetry(cbmRes, graphifyCount);
    const skillsRes = await getSkillsData(wfPaths.length > 0 ? wfPaths[0] : null);

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
        cbm: {
            installed: cbmRes.installed,
            version: cbmRes.version,
            path: cbmRes.path,
            uiUrl: cbmRes.uiUrl,
            totalDbSizeMb: cbmRes.totalDbSizeMb,
            indexedProjectsCount: cbmRes.indexedProjectsCount,
            indexedProjects: cbmRes.indexedProjects || []
        },
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
        `img-src ${webview.cspSource} data: https:`,
        "connect-src 'none'"
    ].join('; ');

    const safeJson = JSON.stringify(initialData || {}).replace(/</g, '\\u003c');

    return template
        .replace('{{CSP}}', csp)
        .replace('{{CSS_URI}}', cssUri)
        .replace('{{JS_URI}}', jsUri)
        .replaceAll('{{NONCE}}', nonce)
        .replace('{{INITIAL_DATA}}', safeJson);
}

function vscodeUriJoin(baseUri, ...segments) {
    return baseUri.with({ path: path.posix.join(baseUri.path, ...segments) });
}

function handleWebviewMessage(panel, message, vscodeInstance, _extensionUri) {
    if (!message || !message.command) return;

    switch (message.command) {
        case 'refresh':
            collectAllDashboardData(vscodeInstance).then(data => {
                panel._lastData = data;
                panel.webview.postMessage({ command: 'updateData', data });
                vscodeInstance.window.showInformationMessage('Dashboard verileri güncellendi.');
            }).catch(err => {
                logger.error('Refresh failed:', err);
            });
            break;

        case 'toggleFavorite': {
            toggleFavorite(message.id);
            const favSet = getFavorites();
            if (panel._lastData) {
                if (Array.isArray(panel._lastData.projects)) {
                    panel._lastData.projects.forEach(p => {
                        if (p.path === message.id || p.rawPath === message.id) {
                            p.isFavorite = favSet.has(p.path) || favSet.has(p.rawPath);
                        }
                    });
                }
                if (Array.isArray(panel._lastData.githubRepos)) {
                    panel._lastData.githubRepos.forEach(r => {
                        if (r.name === message.id || r.url === message.id) {
                            r.isFavorite = favSet.has(r.name) || favSet.has(r.url);
                        }
                    });
                }
            }
            panel.webview.postMessage({
                command: 'updateData',
                data: { ...panel._lastData, favCount: favSet.size }
            });
            break;
        }

        case 'toggleArchive': {
            toggleArchive(message.id);
            const archSet = getArchived();
            if (panel._lastData) {
                if (Array.isArray(panel._lastData.projects)) {
                    panel._lastData.projects.forEach(p => {
                        if (p.path === message.id || p.rawPath === message.id) {
                            p.isArchived = archSet.has(p.path) || archSet.has(p.rawPath);
                        }
                    });
                }
                if (Array.isArray(panel._lastData.githubRepos)) {
                    panel._lastData.githubRepos.forEach(r => {
                        if (r.name === message.id || r.url === message.id) {
                            r.isArchived = archSet.has(r.name) || archSet.has(r.url);
                        }
                    });
                }
            }
            panel.webview.postMessage({
                command: 'updateData',
                data: { ...panel._lastData, archCount: archSet.size }
            });
            break;
        }

        case 'openFolder': {
            const fPath = message.path;
            if (isExistingPath(fPath)) {
                const newWin = Boolean(message.newWindow);
                vscodeInstance.commands.executeCommand('vscode.openFolder', vscodeInstance.Uri.file(fPath), newWin);
            } else {
                vscodeInstance.window.showErrorMessage(`Proje klasörü bulunamadı: ${fPath || 'Geçersiz yol'}`);
            }
            break;
        }

        case 'openTranscript': {
            const fPath = (message.path || '').trim();
            openCleanTranscript(fPath, vscodeInstance, _extensionUri);
            break;
        }

        case 'openFile': {
            const fPath = (message.path || '').trim();
            if (fPath.toLowerCase().endsWith('transcript.jsonl')) {
                openCleanTranscript(fPath, vscodeInstance, _extensionUri);
                break;
            }
            if (isExistingPath(fPath)) {
                vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.file(fPath)).then(doc => {
                    vscodeInstance.window.showTextDocument(doc);
                }, err => {
                    vscodeInstance.window.showErrorMessage('Dosya açılamadı: ' + err.message);
                });
            } else {
                vscodeInstance.window.showWarningMessage('Dosya yolu bulunamadı: ' + fPath);
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
                try { fs.mkdirSync(skillsDir, { recursive: true }); } catch {}
            }
            vscodeInstance.commands.executeCommand('revealFileInOS', vscodeInstance.Uri.file(skillsDir));
            break;
        }

        case 'openExternalUrl': {
            const valid = validateExternalUrl(message.url);
            if (valid) {
                launchInBrowser(valid, vscodeInstance);
            } else {
                vscodeInstance.window.showWarningMessage('Geçersiz web adresi: ' + message.url);
            }
            break;
        }

        case 'openGraphify': {
            const gPath = message.path;
            if (isExistingPath(gPath)) {
                launchInBrowser(gPath, vscodeInstance);
                vscodeInstance.window.showInformationMessage('Graphify Deep Space Observatory Microsoft Edge ile açıldı.');
            } else {
                vscodeInstance.window.showWarningMessage('Graphify haritası bulunamadı. /graphify komutu ile oluşturabilirsiniz.');
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
                const freshData = await collectAllDashboardData(vscodeInstance);
                panel.webview.postMessage({ command: 'updateData', data: freshData });
            }).catch(err => {
                vscodeInstance.window.showErrorMessage('Ollama işlem hatası: ' + (err.message || String(err)));
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
                const freshData = await collectAllDashboardData(vscodeInstance);
                panel.webview.postMessage({ command: 'updateData', data: freshData });
            }).catch(err => {
                vscodeInstance.window.showErrorMessage('Yerel motor işlem hatası: ' + (err.message || String(err)));
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
                const freshData = await collectAllDashboardData(vscodeInstance);
                panel.webview.postMessage({ command: 'updateData', data: freshData });
            }).catch(err => {
                vscodeInstance.window.showErrorMessage('Ollama başlatma hatası: ' + (err.message || String(err)));
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
                const freshData = await collectAllDashboardData(vscodeInstance);
                panel.webview.postMessage({ command: 'updateData', data: freshData });
            }).catch(err => {
                vscodeInstance.window.showErrorMessage('Ollama durdurma hatası: ' + (err.message || String(err)));
            });
            break;
        }

        case 'openCbmUi': {
            vscodeInstance.window.showInformationMessage('Codebase Memory (CBM) devre dışı bırakılmıştır. Mimari haritalar için Graphify kullanabilirsiniz.');
            break;
        }

        case 'indexInCbm': {
            vscodeInstance.window.showInformationMessage('Codebase Memory (CBM) devre dışı bırakılmıştır. Mimari haritalar için Graphify kullanabilirsiniz.');
            break;
        }

        case 'cloneGithubRepo': {
            const parsed = parseRepoInput(message.name);
            if (!parsed) {
                vscodeInstance.window.showErrorMessage('Geçersiz GitHub deposu adı.');
                break;
            }

            const userDir = os.homedir();
            const targetDir = path.join(userDir, 'github-repos', parsed.repo);

            if (isExistingPath(targetDir)) {
                vscodeInstance.window.showWarningMessage(`Klasör zaten mevcut: ${targetDir}`);
                break;
            }

            vscodeInstance.window.withProgress({
                location: vscodeInstance.ProgressLocation.Notification,
                title: `${parsed.fullName} klonlanıyor...`,
                cancellable: false
            }, async () => {
                try {
                    await execFileAsync('gh', ['repo', 'clone', parsed.fullName, targetDir], {}, 60000);
                    vscodeInstance.window.showInformationMessage(`${parsed.repo} başarıyla klonlandı: ${targetDir}`);
                    const freshData = await collectAllDashboardData(vscodeInstance);
                    panel.webview.postMessage({ command: 'updateData', data: freshData });
                } catch (err) {
                    vscodeInstance.window.showErrorMessage('Klonlama hatası: ' + (err.stderr || err.error?.message || 'Bilinmeyen hata'));
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
                vscodeInstance.window.showInformationMessage(`⭐ GitHub deposu eklendi: ${parsed.fullName}`);
                collectAllDashboardData(vscodeInstance).then(data => {
                    panel.webview.postMessage({ command: 'updateData', data });
                });
            } else {
                vscodeInstance.window.showWarningMessage('Geçersiz depo formatı. Örnek: owner/repo veya repo-adi');
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
                    vscodeInstance.window.showErrorMessage('Skill dosyası açılamadı: ' + err.message);
                });
            } else {
                vscodeInstance.window.showWarningMessage('Skill dosyası bulunamadı: ' + (rawPath || 'Bilinmeyen yol'));
            }
            break;
        }

        case 'copySkillPrompt': {
            if (message.prompt) {
                vscodeInstance.env.clipboard.writeText(message.prompt).then(() => {
                    vscodeInstance.window.showInformationMessage(`Skill prompt kopyalandı: "${message.prompt}"`);
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
                vscodeInstance.window.showInformationMessage(
                    `💬 Yeni sohbet başlatıldı. Prompt panoya kopyalandı:\n"${shortPrompt}"`
                );
            })();
            break;
        }

        case 'toggleStartup': {
            const cfg = vscodeInstance.workspace.getConfiguration('antigravity.dashboard');
            cfg.update('openOnStartup', Boolean(message.value), vscodeInstance.ConfigurationTarget.Global);
            vscodeInstance.window.showInformationMessage(
                message.value
                    ? 'Antigravity açıldığında Cockpit otomatik açılacak.'
                    : 'Otomatik açılış kapatıldı.'
            );
            break;
        }

        case 'setLanguage': {
            const lang = message.language || 'auto';
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
                        vscodeInstance.window.showInformationMessage('Model kotaları ve token bakiyesi güncellendi.');
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
        try { fs.unwatchFile(liveQuotaWatchedPath); } catch {}
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
                    } catch {}
                }
            });
        } catch {}
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
            try { fs.unwatchFile(liveQuotaWatchedPath); } catch {}
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
    getCurrentPanel
};
