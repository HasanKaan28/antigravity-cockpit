'use strict';
/**
 * Extension-side audit: every webview message handler and every contributed command runs against a
 * fake VS Code API. Side effects are stubbed (git clone, browser launch, local AI engines, data
 * collectors) and storage lives in a temp home, so the user's machine is never touched.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const extRoot = path.resolve(__dirname, '..', '..');
const srcDir = path.join(extRoot, 'src');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'ui-data.json'), 'utf8'));
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- fake VS Code -------------------------------------------------------------------------
function makeUri(p) {
    return {
        fsPath: p,
        path: String(p).replace(/\\/g, '/'),
        scheme: 'file',
        with(change) { return Object.assign({}, this, change); },
        toString() { return 'file:///' + this.path; }
    };
}

function makePanel(viewType) {
    const panel = {
        viewType,
        visible: true,
        posted: [],
        disposeHandlers: [],
        webview: {
            html: '',
            options: {},
            cspSource: 'vscode-resource:',
            asWebviewUri: (u) => u,
            postMessage: (m) => { panel.posted.push(m); return Promise.resolve(true); },
            onDidReceiveMessage: (fn) => { panel.handler = fn; return { dispose() {} }; }
        },
        onDidChangeViewState: () => ({ dispose() {} }),
        onDidDispose: (fn) => { panel.disposeHandlers.push(fn); return { dispose() {} }; },
        reveal() { panel.revealed = true; },
        dispose() { panel.disposeHandlers.forEach(fn => fn()); }
    };
    return panel;
}

function makeVscode() {
    const state = { calls: [], info: [], warn: [], error: [], config: { openOnStartup: false }, panels: [], failing: new Set(), commands: {}, tabs: [] };
    const vscode = {
        state,
        env: { language: 'en', clipboard: { writeText: async (t) => { state.calls.push(['clipboard', t]); } } },
        Uri: { file: makeUri },
        ViewColumn: { One: 1, Beside: -2 },
        ProgressLocation: { Notification: 15 },
        ConfigurationTarget: { Global: 1 },
        StatusBarAlignment: { Left: 1 },
        workspace: {
            workspaceFolders: [],
            getConfiguration: () => ({
                get: (k, d) => (k in state.config ? state.config[k] : d),
                update: async (k, v) => { state.config[k] = v; state.calls.push(['config', k, v]); }
            }),
            openTextDocument: async (uri) => ({ uri }),
            createFileSystemWatcher: () => ({ onDidChange() {}, onDidCreate() {}, dispose() {} })
        },
        window: {
            showInformationMessage: (m) => { state.info.push(m); },
            showWarningMessage: (m) => { state.warn.push(m); },
            showErrorMessage: (m) => { state.error.push(m); },
            showTextDocument: async (doc) => { state.calls.push(['showTextDocument', doc.uri.fsPath]); },
            withProgress: async (_opts, fn) => fn(),
            createWebviewPanel: (viewType) => { const p = makePanel(viewType); state.panels.push(p); return p; },
            registerWebviewPanelSerializer: (type, serializer) => { state.serializer = { type, serializer }; return { dispose() {} }; },
            createStatusBarItem: () => ({ show() { state.statusBar = this; }, dispose() {} }),
            createOutputChannel: () => ({ appendLine() {}, append() {}, show() {}, dispose() {} }),
            tabGroups: { get all() { return [{ tabs: state.tabs }]; } }
        },
        commands: {
            registerCommand: (id, fn) => { state.commands[id] = fn; return { dispose() {} }; },
            executeCommand: async (cmd, ...args) => {
                state.calls.push(['cmd', cmd, ...args]);
                if (state.failing.has(cmd)) throw new Error('command not found: ' + cmd);
            }
        }
    };
    return vscode;
}

const cmdCalls = (vscode, name) => vscode.state.calls.filter(c => c[0] === 'cmd' && c[1] === name);

// ---- stubbed modules ----------------------------------------------------------------------
const proc = { runs: [], launched: [] };
const engines = { calls: [] };
const stubbedPaths = [];
const freshPaths = ['storage.js', 'webviewProvider.js', 'extension.js', 'transcriptViewer.js'].map(f => path.join(srcDir, f));

function setStub(rel, exportsObj) {
    const p = require.resolve(path.join(srcDir, rel));
    require.cache[p] = { id: p, filename: p, loaded: true, exports: exportsObj, children: [], paths: [] };
    stubbedPaths.push(p);
}

function engineResult(name) {
    return async (...args) => { engines.calls.push([name, ...args]); return { success: true, message: `${name} ok` }; };
}

function installStubs() {
    setStub('util/proc.js', {
        execFileAsync: async (...args) => { proc.runs.push(args); return { stdout: '', stderr: '' }; },
        launchInBrowser: (...args) => { proc.launched.push(args); },
        findEdgeExecutable: () => null,
        createPool: () => ({ run: (fn) => fn() })
    });
    setStub('util/ollama.js', {
        startOllama: engineResult('startOllama'),
        stopOllama: engineResult('stopOllama'),
        toggleOllama: engineResult('toggleOllama'),
        toggleLocalAi: engineResult('toggleLocalAi')
    });
    setStub('collectors/panel.js', { getPanelData: async () => clone(fixture.panel) });
    setStub('collectors/sessions.js', { getBrainSessions: async () => clone(fixture.sessions) });
    setStub('collectors/projects.js', { getProjectsData: async () => clone(fixture.projects) });
    setStub('collectors/github.js', {
        getGithubReposData: async () => Object.assign(clone(fixture.githubRepos), { targetUser: 'sample-org' }),
        getDetectedGithubUser: async () => 'sample-org'
    });
    setStub('collectors/system.js', { getSystemTelemetry: async () => clone(fixture.system) });
    setStub('collectors/skills.js', { getSkillsData: async () => clone(fixture.skills) });
}

function freshModules() {
    freshPaths.forEach(p => { delete require.cache[p]; });
    return {
        provider: require(path.join(srcDir, 'webviewProvider.js')),
        storage: require(path.join(srcDir, 'storage.js'))
    };
}

// ---- suite --------------------------------------------------------------------------------
describe('Extension handlers and commands (fake VS Code)', function () {
    this.timeout(10000);
    let home;
    let savedEnv;
    let originalResolve;
    let provider;
    let storage;
    let vscode;
    let panel;
    let context;

    before(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-provider-'));
        savedEnv = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
        process.env.HOME = home;
        process.env.USERPROFILE = home;
        installStubs();
        originalResolve = Module._resolveFilename;
        Module._resolveFilename = function (request, ...rest) {
            return request === 'vscode' ? 'vscode' : originalResolve.call(this, request, ...rest);
        };
    });

    after(() => {
        Module._resolveFilename = originalResolve;
        delete require.cache.vscode;
        stubbedPaths.forEach(p => { delete require.cache[p]; });
        freshPaths.forEach(p => { delete require.cache[p]; });
        process.env.HOME = savedEnv.HOME;
        process.env.USERPROFILE = savedEnv.USERPROFILE;
        fs.rmSync(home, { recursive: true, force: true });
    });

    async function openPanel() {
        ({ provider, storage } = freshModules());
        vscode = makeVscode();
        context = { extensionUri: makeUri(extRoot), subscriptions: [] };
        panel = await provider.openDashboardPanel(context, vscode);
        panel.posted.length = 0;
        return panel;
    }

    async function send(message, wait = 30) {
        panel.posted.length = 0;
        panel.handler(message);
        await tick(wait);
    }

    const lastUpdate = () => panel.posted.filter(m => m.command === 'updateData').pop();

    afterEach(() => {
        if (panel) panel.dispose();
        panel = null;
    });

    describe('panel lifecycle', () => {
        it('opens the dashboard with the CSP-protected template and initial data', async () => {
            await openPanel();
            assert.strictEqual(vscode.state.panels.length, 1);
            assert.match(panel.webview.html, /Content-Security-Policy/);
            assert.match(panel.webview.html, /Antigravity Cockpit/);
            assert.ok(!/\{\{(CSP|CSS_URI|JS_URI|NONCE|INITIAL_DATA)\}\}/.test(panel.webview.html), 'all template placeholders are replaced');
            assert.ok(panel._lastData && panel._lastData.projects.length === fixture.projects.length);
        });

        it('keeps $ sequences in the data intact when filling the template', async () => {
            ({ provider } = freshModules());
            const data = { projects: [{ name: 'x', gitLog: [{ msg: "cost $& and $' plus $` and $1 $$" }] }] };
            const html = provider.getWebviewHtml(makePanel('t').webview, makeUri(extRoot), data);
            const line = html.split('\n').find(l => l.includes('window.__INITIAL_DATA__ = '));
            const json = line.slice(line.indexOf('= ') + 2, line.lastIndexOf(';'));
            assert.deepStrictEqual(JSON.parse(json), data);
            assert.strictEqual(html.split('window.__INITIAL_DATA__').length, 2, 'the template appears once');
        });

        it('limits images to the extension and data URIs', async () => {
            await openPanel();
            const csp = panel.webview.html.match(/img-src [^;"]*/)[0];
            assert.strictEqual(csp, 'img-src vscode-resource: data:');
        });

        it('reuses the open panel instead of creating a second one', async () => {
            await openPanel();
            await provider.openDashboardPanel(context, vscode);
            assert.strictEqual(vscode.state.panels.length, 1);
            assert.ok(panel.revealed);
        });

        it('ignores messages without a command and unknown commands', async () => {
            await openPanel();
            panel.handler(null);
            panel.handler({});
            await send({ command: 'definitelyNotACommand' });
            assert.deepStrictEqual(vscode.state.error, []);
        });
    });

    describe('data', () => {
        it('refresh posts fresh data and keeps it as the panel state', async () => {
            await openPanel();
            panel._lastData = null;
            await send({ command: 'refresh' }, 60);
            assert.ok(lastUpdate(), 'updateData posted');
            assert.ok(panel._lastData, '_lastData restored');
        });

        it('manual quota refresh asks the panel extension, posts quotas and confirms', async () => {
            await openPanel();
            await send({ command: 'refreshAgQuota', isManual: true }, 40);
            assert.strictEqual(cmdCalls(vscode, 'tfa.refresh').length, 1);
            assert.ok(panel.posted.some(m => m.command === 'updateAgPanel' && m.panel.status === 'ok'));
            assert.strictEqual(vscode.state.info.length, 1);
        });

        it('background quota refresh stays silent', async () => {
            await openPanel();
            await send({ command: 'refreshAgQuota', isManual: false }, 40);
            assert.deepStrictEqual(vscode.state.info, []);
        });
    });

    describe('favorites and archive', () => {
        it('a project favorite sticks in the data sent back', async () => {
            await openPanel();
            await send({ command: 'toggleFavorite', id: '/workspaces/lumen-web' });
            assert.strictEqual(lastUpdate().data.projects.find(p => p.name === 'lumen-web').isFavorite, true);
            await send({ command: 'toggleFavorite', id: '/workspaces/lumen-web' });
            assert.strictEqual(lastUpdate().data.projects.find(p => p.name === 'lumen-web').isFavorite, false);
        });

        it('GitHub repos are favorited and archived by URL', async () => {
            await openPanel();
            const url = 'https://github.com/sample-org/design-tokens';
            await send({ command: 'toggleFavorite', id: url });
            assert.strictEqual(lastUpdate().data.githubRepos.find(r => r.url === url).isFavorite, true);
            await send({ command: 'toggleArchive', id: url });
            assert.strictEqual(lastUpdate().data.githubRepos.find(r => r.url === url).isArchived, true);
            assert.ok(storage.isArchived('github:sample-org/design-tokens'));
        });

        it('archive state of a project survives the round trip', async () => {
            await openPanel();
            await send({ command: 'toggleArchive', id: '/workspaces/scratch-notes' });
            assert.strictEqual(lastUpdate().data.projects.find(p => p.name === 'scratch-notes').isArchived, true);
        });
    });

    describe('opening things', () => {
        it('openFolder opens existing folders in this or a new window and reports missing ones', async () => {
            await openPanel();
            await send({ command: 'openFolder', path: home, newWindow: false });
            await send({ command: 'openFolder', path: home, newWindow: true });
            const calls = cmdCalls(vscode, 'vscode.openFolder');
            assert.strictEqual(calls.length, 2);
            assert.strictEqual(calls[0][3], false);
            assert.strictEqual(calls[1][3], true);
            await send({ command: 'openFolder', path: path.join(home, 'missing') });
            assert.strictEqual(vscode.state.error.length, 1);
        });

        it('openFile opens existing files and warns about missing ones', async () => {
            await openPanel();
            const file = path.join(home, 'notes.md');
            fs.writeFileSync(file, '# notes');
            await send({ command: 'openFile', path: file });
            assert.ok(vscode.state.calls.some(c => c[0] === 'showTextDocument' && c[1] === file));
            await send({ command: 'openFile', path: path.join(home, 'nope.md') });
            assert.strictEqual(vscode.state.warn.length, 1);
        });

        it('openTranscript renders a clean transcript panel', async () => {
            await openPanel();
            const dir = path.join(home, 'brain', 'session-1', 'logs');
            fs.mkdirSync(dir, { recursive: true });
            const transcript = path.join(dir, 'transcript.jsonl');
            fs.writeFileSync(transcript, [
                JSON.stringify({ step_index: 1, source: 'USER_EXPLICIT', type: 'USER_INPUT', content: '<USER_REQUEST>\nAdd a retry\n</USER_REQUEST>' }),
                JSON.stringify({ step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', content: 'Done.' })
            ].join('\n'));
            await send({ command: 'openTranscript', path: transcript });
            const viewer = vscode.state.panels.find(p => p.viewType === 'antigravityCleanTranscript');
            assert.ok(viewer, 'transcript panel created');
            assert.match(viewer.webview.html, /Add a retry/);
            await send({ command: 'openTranscript', path: path.join(home, 'missing.jsonl') });
            assert.strictEqual(vscode.state.error.length, 1);
        });

        it('openTranscript only reads files named transcript.jsonl', async () => {
            await openPanel();
            const dir = path.join(home, 'other', 'logs');
            fs.mkdirSync(dir, { recursive: true });
            const notes = path.join(dir, 'notes.jsonl');
            fs.writeFileSync(notes, JSON.stringify({ step_index: 1, source: 'USER_EXPLICIT', type: 'USER_INPUT', content: 'hi' }));
            await send({ command: 'openTranscript', path: notes });
            assert.strictEqual(vscode.state.panels.filter(p => p.viewType === 'antigravityCleanTranscript').length, 0);
            assert.strictEqual(vscode.state.error.length, 1);
            assert.ok(!fs.existsSync(path.join(home, 'other', 'sohbet_gecmisi.md')), 'nothing written next to other files');
        });

        it('openSessionFolder reveals existing folders only', async () => {
            await openPanel();
            await send({ command: 'openSessionFolder', path: home });
            await send({ command: 'openSessionFolder', path: path.join(home, 'missing') });
            assert.strictEqual(cmdCalls(vscode, 'revealFileInOS').length, 1);
        });

        it('openSkillsFolder creates and reveals ~/.gemini/config/skills', async () => {
            await openPanel();
            await send({ command: 'openSkillsFolder' });
            assert.ok(fs.existsSync(path.join(home, '.gemini', 'config', 'skills')));
            assert.strictEqual(cmdCalls(vscode, 'revealFileInOS').length, 1);
        });

        it('openSkillFile opens existing rule files and warns about missing ones', async () => {
            await openPanel();
            const skill = path.join(home, 'SKILL.md');
            fs.writeFileSync(skill, '---\nname: demo\n---');
            await send({ command: 'openSkillFile', path: skill });
            assert.ok(vscode.state.calls.some(c => c[0] === 'showTextDocument'));
            await send({ command: 'openSkillFile', path: '' });
            assert.strictEqual(vscode.state.warn.length, 1);
        });

        it('openExternalUrl launches only safe web URLs', async () => {
            await openPanel();
            proc.launched.length = 0;
            await send({ command: 'openExternalUrl', url: 'https://github.com/sample-org/orbit-api' });
            await send({ command: 'openExternalUrl', url: 'javascript:alert(1)' });
            assert.strictEqual(proc.launched.length, 1);
            assert.strictEqual(vscode.state.warn.length, 1);
        });

        it('openGraphify launches existing maps and warns about missing ones', async () => {
            await openPanel();
            proc.launched.length = 0;
            const graph = path.join(home, 'graph.html');
            fs.writeFileSync(graph, '<html></html>');
            await send({ command: 'openGraphify', path: graph });
            await send({ command: 'openGraphify', path: path.join(home, 'none.html') });
            assert.strictEqual(proc.launched.length, 1);
            assert.strictEqual(vscode.state.warn.length, 1);
        });

        it('openGraphify refuses files that are not HTML maps', async () => {
            await openPanel();
            proc.launched.length = 0;
            const other = path.join(home, 'tool.cmd');
            fs.writeFileSync(other, 'echo');
            await send({ command: 'openGraphify', path: other });
            await send({ command: 'openGraphify', path: home });
            assert.strictEqual(proc.launched.length, 0);
            assert.strictEqual(vscode.state.warn.length, 2);
        });

        it('openFolderDialog, openAgSettings and openAgSidebar run their commands', async () => {
            await openPanel();
            await send({ command: 'openFolderDialog' });
            await send({ command: 'openAgSettings' });
            await send({ command: 'openAgSidebar' });
            assert.strictEqual(cmdCalls(vscode, 'vscode.openFolder').length, 1);
            assert.strictEqual(cmdCalls(vscode, 'workbench.action.openSettings')[0][2], 'tfa');
            assert.strictEqual(cmdCalls(vscode, 'tfa.openPanel').length, 1);
        });
    });

    describe('chat', () => {
        it('openChat falls back through the chat commands until one works', async () => {
            await openPanel();
            vscode.state.failing.add('antigravity.openChatView');
            await send({ command: 'openChat' });
            assert.strictEqual(cmdCalls(vscode, 'antigravity.openChatView').length, 1);
            assert.strictEqual(cmdCalls(vscode, 'antigravity.startNewConversation').length, 1);
            assert.strictEqual(cmdCalls(vscode, 'antigravity.toggleChatFocus').length, 0);
        });

        it('chatWithSkill copies the prompt, opens chat and sends the prompt', async () => {
            await openPanel();
            await send({ command: 'chatWithSkill', prompt: '@skill:clean-code' });
            assert.ok(vscode.state.calls.some(c => c[0] === 'clipboard' && c[1] === '@skill:clean-code'));
            assert.strictEqual(cmdCalls(vscode, 'antigravity.sendPromptToAgentPanel')[0][2], '@skill:clean-code');
        });

        it('copySkillPrompt copies and confirms', async () => {
            await openPanel();
            await send({ command: 'copySkillPrompt', prompt: '/graphify' });
            assert.ok(vscode.state.calls.some(c => c[0] === 'clipboard' && c[1] === '/graphify'));
            assert.strictEqual(vscode.state.info.length, 1);
        });
    });

    describe('GitHub', () => {
        it('cloneGithubRepo validates input, refuses existing folders and clones owner/repo', async () => {
            await openPanel();
            proc.runs.length = 0;
            await send({ command: 'cloneGithubRepo', name: '../../etc' });
            await send({ command: 'cloneGithubRepo', name: '-x/repo' });
            assert.strictEqual(vscode.state.error.length, 2, 'invalid names are rejected');
            assert.strictEqual(proc.runs.length, 0, 'gh never runs for rejected names');
            fs.mkdirSync(path.join(home, 'github-repos', 'orbit-api'), { recursive: true });
            await send({ command: 'cloneGithubRepo', name: 'sample-org/orbit-api' });
            assert.strictEqual(vscode.state.warn.length, 1, 'existing folder is not overwritten');
            await send({ command: 'cloneGithubRepo', name: 'sample-org/design-tokens' }, 60);
            assert.deepStrictEqual(proc.runs[0][1], ['repo', 'clone', 'sample-org/design-tokens', path.join(home, 'github-repos', 'design-tokens')]);
            assert.ok(lastUpdate(), 'fresh data posted after clone');
            assert.strictEqual(panel._lastData, lastUpdate().data, 'panel state follows the data sent after clone');
        });

        it('addCustomGithubRepo stores valid repos and rejects garbage', async () => {
            await openPanel();
            await send({ command: 'addCustomGithubRepo', text: 'other-org/tool' }, 60);
            assert.strictEqual(storage.getCustomRepos()[0].fullName, 'other-org/tool');
            assert.strictEqual(panel._lastData, lastUpdate().data, 'panel state follows the data sent after adding');
            await send({ command: 'addCustomGithubRepo', text: 'not a repo!!' });
            assert.strictEqual(vscode.state.warn.length, 1);
        });
    });

    describe('local engine and settings', () => {
        for (const command of ['toggleLocalAi', 'toggleOllama', 'startOllama', 'stopOllama']) {
            it(`${command} reports the result and refreshes the panel state`, async () => {
                await openPanel();
                engines.calls.length = 0;
                await send({ command, engineId: 'ollama' }, 60);
                assert.strictEqual(engines.calls[0][0], command);
                assert.strictEqual(vscode.state.info.length, 1);
                assert.strictEqual(panel._lastData, lastUpdate().data, 'panel state follows the data sent after the engine change');
            });
        }

        it('toggleStartup and setLanguage write the global settings', async () => {
            await openPanel();
            await send({ command: 'toggleStartup', value: false });
            await send({ command: 'setLanguage', language: 'de' });
            assert.strictEqual(vscode.state.config.openOnStartup, false);
            assert.strictEqual(vscode.state.config.language, 'de');
        });

        it('setLanguage ignores languages the extension does not ship', async () => {
            await openPanel();
            await send({ command: 'setLanguage', language: 'xx' });
            await send({ command: 'setLanguage', language: { en: true } });
            assert.ok(!('language' in vscode.state.config));
        });
    });

    describe('extension activation', () => {
        let extension;

        function activate(config) {
            freshModules();
            vscode = makeVscode();
            Object.assign(vscode.state.config, config || {});
            require.cache.vscode = { id: 'vscode', filename: 'vscode', loaded: true, exports: vscode };
            extension = require(path.join(srcDir, 'extension.js'));
            context = { extensionUri: makeUri(extRoot), subscriptions: [] };
            extension.activate(context);
        }

        afterEach(() => {
            if (extension) extension.deactivate();
            vscode.state.panels.forEach(p => p.dispose());
        });

        it('registers commands, status bar and the panel serializer', () => {
            activate();
            for (const id of ['antigravity.openActivityDashboard', 'antigravity.refreshActivityDashboard', 'antigravity.cockpitNewChat']) {
                assert.strictEqual(typeof vscode.state.commands[id], 'function', id);
            }
            assert.strictEqual(vscode.state.statusBar.command, 'antigravity.openActivityDashboard');
            assert.strictEqual(vscode.state.serializer.type, 'antigravityActivityDashboard');
        });

        it('the open command shows the dashboard', async () => {
            activate();
            vscode.state.commands['antigravity.openActivityDashboard']();
            await tick(60);
            assert.strictEqual(vscode.state.panels.length, 1);
            assert.match(vscode.state.panels[0].webview.html, /Antigravity Cockpit/);
        });

        it('the refresh command pushes fresh data into the open dashboard', async () => {
            activate();
            vscode.state.commands['antigravity.openActivityDashboard']();
            await tick(60);
            const dash = vscode.state.panels[0];
            dash.posted.length = 0;
            vscode.state.commands['antigravity.refreshActivityDashboard']();
            await tick(60);
            assert.ok(dash.posted.some(m => m.command === 'updateData'), 'dashboard receives the refreshed data');
        });

        it('the new chat command copies the prompt and sends it to the agent', async () => {
            activate();
            await vscode.state.commands['antigravity.cockpitNewChat']('@skill:graphify');
            assert.ok(vscode.state.calls.some(c => c[0] === 'clipboard' && c[1] === '@skill:graphify'));
            assert.strictEqual(cmdCalls(vscode, 'antigravity.sendPromptToAgentPanel').length, 1);
        });

        it('a restored panel is rendered by the serializer', async () => {
            activate();
            const restored = makePanel('antigravityActivityDashboard');
            await vscode.state.serializer.serializer.deserializeWebviewPanel(restored, {});
            assert.match(restored.webview.html, /Antigravity Cockpit/);
            assert.ok(typeof restored.handler === 'function', 'message listener attached');
            restored.dispose();
        });

        it('opens on startup when enabled', async () => {
            activate({ openOnStartup: true });
            await tick(1400);
            assert.strictEqual(vscode.state.panels.length, 1);
        });

        it('does not open a second dashboard on startup when one is already restored in a tab', async () => {
            activate({ openOnStartup: true });
            vscode.state.tabs.push({ label: 'Antigravity Cockpit', input: { viewType: 'mainThreadWebview-antigravityActivityDashboard' } });
            await tick(1400);
            assert.strictEqual(vscode.state.panels.length, 0);
        });
    });
});
