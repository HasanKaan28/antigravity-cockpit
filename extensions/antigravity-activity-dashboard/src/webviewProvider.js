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
const { getCbmData, CBM_EXE, ensureCbmServerRunning, buildCbmUrl, matchProjectCbm } = require('./collectors/cbm');
const { startOllama, stopOllama, toggleOllama } = require('./util/ollama');
const { getPanelData } = require('./collectors/panel');
const { getSystemTelemetry } = require('./collectors/system');
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

    const favSet = getFavorites();
    const archSet = getArchived();

    return {
        sessions: sessRes,
        projects: projRes,
        githubRepos: ghRes,
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
        system: systemRes
    };
}

function getWebviewHtml(webview, extensionUri, initialData) {
    const templatePath = path.join(extensionUri.fsPath, 'media', 'dashboard.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(vscodeUriJoin(extensionUri, 'media', 'dashboard.css'));
    const jsUri = webview.asWebviewUri(vscodeUriJoin(extensionUri, 'media', 'dashboard.js'));

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
        .replace('{{CSS_URI}}', cssUri.toString())
        .replace('{{JS_URI}}', jsUri.toString())
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
                panel.webview.postMessage({ command: 'updateData', data });
                vscodeInstance.window.showInformationMessage('🔄 Dashboard verileri güncellendi.');
            }).catch(err => {
                logger.error('Refresh failed:', err);
            });
            break;

        case 'toggleFavorite': {
            toggleFavorite(message.id);
            // Optimistic update - only sync counts
            const favCount = getFavorites().size;
            panel.webview.postMessage({
                command: 'updateData',
                data: { ...panel._lastData, favCount }
            });
            break;
        }

        case 'toggleArchive': {
            toggleArchive(message.id);
            const archCount = getArchived().size;
            panel.webview.postMessage({
                command: 'updateData',
                data: { ...panel._lastData, archCount }
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
            vscodeInstance.commands.executeCommand('antigravity.startNewConversation').then(null, () => {
                vscodeInstance.commands.executeCommand('antigravity.toggleChatFocus').then(null, () => {
                    vscodeInstance.commands.executeCommand('workbench.action.chat.open');
                });
            });
            break;

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
                vscodeInstance.window.showInformationMessage('👑 Graphify Deep Space Observatory Microsoft Edge ile açıldı.');
            } else {
                vscodeInstance.window.showWarningMessage('Graphify haritası bulunamadı. /graphify komutu ile oluşturabilirsiniz.');
            }
            break;
        }

        case 'toggleOllama': {
            vscodeInstance.window.showInformationMessage('⚡ Antigravity Cloud Native AI Motoru devrede (Gemini 2.5 / Claude 3.5). Yerel GPU gerekmez.');
            break;
        }

        case 'startOllama': {
            vscodeInstance.window.showInformationMessage('⚡ Antigravity Cloud Native AI aktif.');
            break;
        }

        case 'stopOllama': {
            vscodeInstance.window.showInformationMessage('⚡ Antigravity Cloud Native AI modu devrede.');
            break;
        }

        case 'openCbmUi': {
            getCbmData().then(async (cbm) => {
                if (!cbm.installed) {
                    vscodeInstance.window.showWarningMessage('Codebase Memory MCP çalıştırılabilir dosyası bulunamadı.');
                    return;
                }

                // 1. Determine target project for direct graph view
                let targetProject = message.project || message.name || null;
                if (!targetProject) {
                    const wf = (vscodeInstance.workspace.workspaceFolders || [])[0];
                    if (wf && wf.uri && wf.uri.fsPath) {
                        const matched = matchProjectCbm(wf.uri.fsPath, path.basename(wf.uri.fsPath), cbm.dbMap);
                        if (matched.indexed && matched.cbmKey) {
                            targetProject = matched.cbmKey;
                        }
                    }
                }
                if (!targetProject && cbm.indexedProjects && cbm.indexedProjects.length > 0) {
                    const brainSync = cbm.indexedProjects.find(p => p.key.includes('brain-sync'));
                    targetProject = brainSync ? brainSync.key : cbm.indexedProjects[0].key;
                }

                vscodeInstance.window.showInformationMessage('🧠 Codebase Memory Bilgi Grafı hazırlanıyor (9749)...');

                // 2. Ensure daemon is running detached (prevents 1s kill timeout!)
                const runRes = await ensureCbmServerRunning(cbm.path, 9749);
                if (!runRes.success) {
                    vscodeInstance.window.showErrorMessage(runRes.message || 'CBM sunucusu başlatılamadı.');
                    return;
                }

                // 3. Build target URL with ?tab=graph&project=...
                const targetUrl = buildCbmUrl(targetProject, 'graph', 9749);

                // 4. Open in Microsoft Edge or system browser
                setTimeout(() => {
                    launchInBrowser(targetUrl, vscodeInstance);
                }, 350);
            }).catch(err => {
                logger.error('openCbmUi error:', err);
                vscodeInstance.window.showErrorMessage('CBM başlatma hatası: ' + (err.message || String(err)));
            });
            break;
        }

        case 'indexInCbm': {
            const targetPath = message.path;
            if (!isExistingPath(targetPath)) {
                vscodeInstance.window.showErrorMessage('İndekslenecek proje yolu bulunamadı.');
                break;
            }

            vscodeInstance.window.withProgress({
                location: vscodeInstance.ProgressLocation.Notification,
                title: `🧠 CBM İndeksleniyor: ${path.basename(targetPath)}...`,
                cancellable: false
            }, async () => {
                try {
                    await execFileAsync(CBM_EXE, ['cli', 'index_repository', '--repo-path', targetPath], {}, 60000);
                    vscodeInstance.window.showInformationMessage(`✅ ${path.basename(targetPath)} CBM Bilgi Grafına başarıyla indekslendi!`);
                    const freshData = await collectAllDashboardData(vscodeInstance);
                    panel.webview.postMessage({ command: 'updateData', data: freshData });
                } catch (err) {
                    vscodeInstance.window.showWarningMessage('CBM İndeksleme uyarısı: ' + (err.stderr || err.error?.message || 'Bilinmeyen hata'));
                }
            });
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
                title: `📥 ${parsed.fullName} klonlanıyor...`,
                cancellable: false
            }, async () => {
                try {
                    await execFileAsync('gh', ['repo', 'clone', parsed.fullName, targetDir], {}, 60000);
                    vscodeInstance.window.showInformationMessage(`✅ ${parsed.repo} başarıyla klonlandı: ${targetDir}`);
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
                    description: 'Kullanıcı tarafından eklenen depo',
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

        case 'toggleStartup': {
            const cfg = vscodeInstance.workspace.getConfiguration('antigravity.dashboard');
            cfg.update('openOnStartup', Boolean(message.value), vscodeInstance.ConfigurationTarget.Global);
            vscodeInstance.window.showInformationMessage(
                message.value
                    ? '🚀 Antigravity açıldığında Cockpit otomatik açılacak.'
                    : '⏸️ Otomatik açılış kapatıldı.'
            );
            break;
        }

        case 'refreshAgQuota': {
            getPanelData().then(pData => {
                panel.webview.postMessage({ command: 'updateAgPanel', panel: pData });
                if (message.isManual) {
                    vscodeInstance.window.showInformationMessage('✨ Antigravity Panel model kotaları güncellendi.');
                }
            });
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

function attachPanelListeners(panel, context, vscodeInstance) {
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

    panel.onDidDispose(() => {
        if (currentPanel === panel) currentPanel = null;
    }, null, context.subscriptions);
}

async function openDashboardPanel(context, vscodeInstance) {
    if (currentPanel) {
        currentPanel.reveal(vscodeInstance.ViewColumn.One);
        // Refresh data in background
        collectAllDashboardData(vscodeInstance).then(data => {
            if (currentPanel) currentPanel.webview.postMessage({ command: 'updateData', data });
        });
        return currentPanel;
    }

    currentPanel = vscodeInstance.window.createWebviewPanel(
        'antigravityActivityDashboard',
        '⚡ Antigravity Cockpit & Dashboard v2.0',
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

module.exports = {
    openDashboardPanel,
    collectAllDashboardData,
    getWebviewHtml,
    attachPanelListeners
};
