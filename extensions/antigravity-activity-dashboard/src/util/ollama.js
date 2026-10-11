'use strict';
/**
 * [⚡ LOCAL AI & OLLAMA ENGINE SUITE]
 * Manages local AI engine discovery, multi-engine probing (Ollama, LM Studio, vLLM, Jan, llama.cpp, OmniRoute),
 * and background process lifecycle.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const logger = require('../logger');

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

function probeHttp(port, endpointPath, timeoutMs = 500) {
    return new Promise((resolve) => {
        const req = http.get({
            hostname: '127.0.0.1',
            port,
            path: endpointPath,
            timeout: timeoutMs
        }, (res) => {
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try {
                    resolve({ ok: res.statusCode === 200, status: res.statusCode, json: JSON.parse(raw) });
                } catch {
                    resolve({ ok: res.statusCode === 200, status: res.statusCode, raw });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ ok: false, timeout: true });
        });

        req.on('error', () => {
            resolve({ ok: false, error: true });
        });
    });
}

function probeOllamaStatus(timeoutMs = 1200) {
    return new Promise((resolve) => {
        const req = http.get({
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/tags',
            timeout: timeoutMs
        }, (res) => {
            if (res.statusCode !== 200) {
                resolve({ online: false, activeModel: null, text: 'Ollama: Çevrimdışı' });
                return;
            }
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    const models = (parsed.models || []).map(m => m.name || m.model);
                    const activeModel = models.find(m => m.includes('qwen') || m.includes('coder')) || models[0] || 'Aktif';
                    resolve({
                        online: true,
                        activeModel,
                        models,
                        text: `${activeModel} (Ollama Aktif)`
                    });
                } catch {
                    resolve({ online: true, activeModel: 'Aktif', models: [], text: 'Ollama: Aktif' });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ online: false, activeModel: null, text: 'Ollama: Zaman Aşımı' });
        });

        req.on('error', () => {
            resolve({ online: false, activeModel: null, text: 'Ollama: Çevrimdışı' });
        });
    });
}

function findOllamaExecutable() {
    const userLocal = process.env.LOCALAPPDATA;
    const progFiles = process.env.ProgramFiles;
    const progFilesX86 = process.env['ProgramFiles(x86)'];
    const candidates = [];

    if (userLocal) {
        candidates.push(path.join(userLocal, 'Programs', 'Ollama', 'ollama.exe'));
        candidates.push(path.join(userLocal, 'Programs', 'Ollama', 'ollama app.exe'));
    }
    if (progFiles) {
        candidates.push(path.join(progFiles, 'Ollama', 'ollama.exe'));
    }
    if (progFilesX86) {
        candidates.push(path.join(progFilesX86, 'Ollama', 'ollama.exe'));
    }

    // Unix / Linux / macOS standard paths
    candidates.push('/usr/local/bin/ollama');
    candidates.push('/usr/bin/ollama');
    candidates.push('/opt/homebrew/bin/ollama');

    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
}

function findLmStudioExecutable() {
    const userProfile = process.env.USERPROFILE || '';
    const userLocal = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || '';
    const candidates = [
        path.join(userProfile, '.cache', 'lm-studio', 'bin', 'lms.exe'),
        path.join(userLocal, 'Programs', 'LM Studio', 'LM Studio.exe'),
        path.join(progFiles, 'LM Studio', 'LM Studio.exe'),
        path.join(userProfile, '.cache', 'lm-studio', 'bin', 'lms'),
        '/Applications/LM Studio.app/Contents/MacOS/LM Studio',
        '/usr/local/bin/lms'
    ];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
}

function findJanExecutable() {
    const userLocal = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || '';
    const candidates = [
        path.join(userLocal, 'Programs', 'jan', 'Jan.exe'),
        path.join(progFiles, 'Jan', 'Jan.exe'),
        '/Applications/Jan.app/Contents/MacOS/Jan'
    ];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
}

function findOmniRouteExecutable() {
    const appdata = process.env.APPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const candidates = [
        path.join(appdata, 'npm', 'omniroute.cmd'),
        path.join(userProfile, 'AppData', 'Roaming', 'npm', 'omniroute.cmd'),
        '/usr/local/bin/omniroute',
        '/usr/bin/omniroute'
    ];
    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
}

const KNOWN_ENGINES = [
    { id: 'ollama', name: 'Ollama', port: 11434, path: '/api/tags', type: 'ollama', finder: findOllamaExecutable },
    { id: 'lmstudio', name: 'LM Studio', port: 1234, path: '/v1/models', type: 'openai', finder: findLmStudioExecutable },
    { id: 'vllm', name: 'vLLM', port: 8000, path: '/v1/models', type: 'openai', finder: () => null },
    { id: 'jan', name: 'Jan (Local AI)', port: 1337, path: '/v1/models', type: 'openai', finder: findJanExecutable },
    { id: 'llamacpp', name: 'llama.cpp Server', port: 8080, path: '/v1/models', type: 'openai', finder: () => null },
    { id: 'omniroute', name: 'OmniRoute Router', port: 20128, path: '/v1/models', type: 'openai', finder: findOmniRouteExecutable }
];

async function probeAllLocalAiEngines(timeoutMs = 600) {
    const results = await Promise.all(KNOWN_ENGINES.map(async (eng) => {
        const exe = eng.finder ? eng.finder() : null;
        const probeRes = await probeHttp(eng.port, eng.path, timeoutMs);
        let models = [];
        if (probeRes.ok && probeRes.json) {
            if (eng.type === 'ollama') {
                models = (probeRes.json.models || []).map(m => m.name || m.model);
            } else {
                models = (probeRes.json.data || probeRes.json.models || []).map(m => m.id || m.name);
            }
        }

        const online = Boolean(probeRes.ok);
        const installed = Boolean(exe || online);
        const activeModel = models.find(m => m.includes('qwen') || m.includes('coder') || m.includes('llama')) || models[0] || null;

        return {
            id: eng.id,
            name: eng.name,
            endpoint: `http://127.0.0.1:${eng.port}`,
            port: eng.port,
            type: eng.type,
            online,
            installed,
            executable: exe,
            models,
            activeModel
        };
    }));

    const detected = results.filter(r => r.installed || r.online);
    const onlineEngines = results.filter(r => r.online);

    // Primary engine: First online engine, or first installed engine
    const primaryEngine = onlineEngines[0] || detected[0] || null;
    const hasLocalEngine = detected.length > 0;

    return {
        hasLocalEngine,
        primaryEngine,
        detectedEngines: detected,
        allEngines: results
    };
}

async function startOllama() {
    const initialStatus = await probeOllamaStatus(800);
    if (initialStatus.online) {
        return { success: true, message: `Ollama zaten çalışıyor (${initialStatus.activeModel || 'Aktif'}).`, alreadyRunning: true };
    }

    const exePath = findOllamaExecutable();
    if (!exePath) {
        return { success: false, message: 'Ollama çalıştırılabilir dosyası (ollama.exe) sistemde bulunamadı.' };
    }

    logger.info(`Starting Ollama daemon: ${exePath} serve`);
    try {
        const isWin = process.platform === 'win32';
        const child = spawn(exePath, ['serve'], {
            detached: true,
            stdio: 'ignore',
            windowsHide: isWin
        });
        child.unref();
    } catch (err) {
        logger.error('Failed to spawn Ollama:', err);
        return { success: false, message: 'Ollama başlatılamadı: ' + (err.message || String(err)) };
    }

    // Poll until port 11434 responds (up to 8 seconds)
    for (let i = 0; i < 16; i++) {
        await new Promise(r => setTimeout(r, 500));
        const status = await probeOllamaStatus(600);
        if (status.online) {
            return {
                success: true,
                message: `Ollama başarıyla başlatıldı! (${status.activeModel || 'Hazır'}).`,
                model: status.activeModel
            };
        }
    }

    return { success: false, message: 'Ollama başlatma komutu verildi ancak bağlantı noktası zaman aşımına uğradı.' };
}

async function stopOllama() {
    const initialStatus = await probeOllamaStatus(600);
    if (!initialStatus.online) {
        return { success: true, message: 'Ollama zaten çevrimdışı.', alreadyStopped: true };
    }

    logger.info('Stopping Ollama processes...');
    const isWin = process.platform === 'win32';
    if (isWin) {
        const killProcess = (imgName) => new Promise((resolve) => {
            execFile('taskkill', ['/F', '/IM', imgName, '/T'], { windowsHide: true }, () => resolve());
        });
        await killProcess('ollama.exe');
        await killProcess('ollama app.exe');
    } else {
        await new Promise((resolve) => {
            execFile('pkill', ['-f', 'ollama'], () => resolve());
        });
    }

    // Poll until port 11434 closes (up to 4 seconds)
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 300));
        const status = await probeOllamaStatus(300);
        if (!status.online) {
            return { success: true, message: '⏹️ Ollama servisi durduruldu.' };
        }
    }

    return { success: true, message: 'Ollama kapatma sinyali gönderildi.' };
}

async function toggleOllama() {
    const status = await probeOllamaStatus(800);
    if (status.online) {
        return await stopOllama();
    } else {
        return await startOllama();
    }
}

async function toggleLocalAi(engineId = 'ollama') {
    if (engineId === 'ollama') {
        return await toggleOllama();
    }
    // Generic local engine ping / status verification
    const engines = await probeAllLocalAiEngines(800);
    const eng = engines.detectedEngines.find(e => e.id === engineId) || engines.primaryEngine;
    if (eng && eng.online) {
        return {
            success: true,
            message: `${eng.name} yerel bağlantısı aktif (${eng.activeModel || eng.endpoint}).`
        };
    }
    return {
        success: false,
        message: `${(eng && eng.name) || 'Yerel motor'} çevrimdışı. Lütfen ilgili uygulamayı başlatın.`
    };
}

module.exports = {
    probeOllamaStatus,
    findOllamaExecutable,
    findLmStudioExecutable,
    findJanExecutable,
    findOmniRouteExecutable,
    probeAllLocalAiEngines,
    startOllama,
    stopOllama,
    toggleOllama,
    toggleLocalAi
};
