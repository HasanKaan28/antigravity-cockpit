'use strict';
/**
 * Collector: Codebase Memory MCP database index status.
 * Exact canonical matching prevents false positive substring claims.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileAsync } = require('../util/proc');
const logger = require('../logger');

const CBM_CACHE_DIR = path.join(os.homedir(), '.cache', 'codebase-memory-mcp');
const CBM_EXE = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'codebase-memory-mcp', 'codebase-memory-mcp.exe');

async function getCbmData() {
    let isInstalled = false;
    let version = 'Kurulu Değil';

    try {
        if (fs.existsSync(CBM_EXE)) {
            isInstalled = true;
            try {
                const { stdout } = await execFileAsync(CBM_EXE, ['--version'], {}, 2000);
                if (stdout) version = stdout.replace(/codebase-memory-mcp/i, '').trim() || '0.11.0';
            } catch {
                version = '0.11.0';
            }
        }
    } catch (err) {
        logger.warn('CBM detection error:', err);
    }

    const dbMap = new Map();
    let totalDbSizeBytes = 0;
    let indexedProjectsCount = 0;

    try {
        if (fs.existsSync(CBM_CACHE_DIR)) {
            const files = await fs.promises.readdir(CBM_CACHE_DIR);
            for (const file of files) {
                if (file.endsWith('.db') && !file.startsWith('_')) {
                    const fullP = path.join(CBM_CACHE_DIR, file);
                    try {
                        const stat = await fs.promises.stat(fullP);
                        totalDbSizeBytes += stat.size;
                        indexedProjectsCount++;
                        const sizeMb = (stat.size / (1024 * 1024)).toFixed(1) + ' MB';
                        const baseName = file.replace(/\.db$/i, '').toLowerCase();
                        dbMap.set(baseName, {
                            fileName: file,
                            sizeMb,
                            sizeBytes: stat.size,
                            mtime: stat.mtime
                        });
                    } catch {
                        // skip single unreadable file
                    }
                }
            }
        }
    } catch (err) {
        logger.warn('Failed reading CBM cache directory:', err);
    }

    const totalDbSizeMb = (totalDbSizeBytes / (1024 * 1024)).toFixed(1) + ' MB';
    const indexedProjects = Array.from(dbMap.entries()).map(([k, v]) => ({ key: k, fileName: v.fileName, sizeMb: v.sizeMb }));

    return {
        installed: isInstalled,
        version,
        path: isInstalled ? CBM_EXE.split('\\').join('/') : '',
        uiUrl: 'http://localhost:9749',
        totalDbSizeMb,
        indexedProjectsCount,
        indexedProjects,
        dbMap
    };
}

const http = require('http');
const { spawn } = require('child_process');

function isCbmServerRunning(port = 9749, timeoutMs = 800) {
    return new Promise((resolve) => {
        const req = http.get({
            hostname: '127.0.0.1',
            port,
            path: '/api/ui-config',
            timeout: timeoutMs
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.on('error', () => resolve(false));
    });
}

async function ensureCbmServerRunning(cbmPath = CBM_EXE, port = 9749) {
    if (await isCbmServerRunning(port, 600)) {
        return { success: true, alreadyRunning: true };
    }

    if (!fs.existsSync(cbmPath)) {
        return { success: false, message: 'Codebase Memory MCP çalıştırılabilir dosyası bulunamadı.' };
    }

    logger.info(`Starting CBM Web UI server: ${cbmPath} --ui=true --port=${port}`);
    try {
        const child = spawn(cbmPath, ['--ui=true', `--port=${port}`], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true
        });
        child.unref();
    } catch (err) {
        logger.error('Failed to spawn CBM daemon:', err);
        return { success: false, message: 'CBM servisi başlatılamadı: ' + (err.message || String(err)) };
    }

    // Wait for the HTTP server to start listening (up to 5 seconds)
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 350));
        if (await isCbmServerRunning(port, 400)) {
            return { success: true, alreadyRunning: false };
        }
    }

    return { success: true, warning: 'CBM sunucusu arka planda başlatıldı ancak port doğrulaması zaman aşımına uğradı.' };
}

function buildCbmUrl(targetProject = null, tab = 'graph', port = 9749) {
    if (targetProject) {
        return `http://localhost:${port}/?tab=${encodeURIComponent(tab)}&project=${encodeURIComponent(targetProject)}`;
    }
    return `http://localhost:${port}/?tab=stats`;
}

/**
 * Checks if a project is indexed using exact path encoding and exact name match.
 */
function matchProjectCbm(rawPath, projectName, dbMap) {
    if (!dbMap || dbMap.size === 0) return { indexed: false, sizeMb: null, cbmKey: null };

    const nameKey = (projectName || '').toLowerCase();
    // Path encoded as CBM does: e.g. C-Users-username-folder-name
    const pathKey = (rawPath || '')
        .replace(/^[a-zA-Z]:/i, (m) => m[0].toUpperCase())
        .replace(/[:\\/]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    // 1. Exact path encoded key
    if (dbMap.has(pathKey)) {
        return { indexed: true, sizeMb: dbMap.get(pathKey).sizeMb, cbmKey: pathKey };
    }

    // 2. Exact project name key
    if (dbMap.has(nameKey)) {
        return { indexed: true, sizeMb: dbMap.get(nameKey).sizeMb, cbmKey: nameKey };
    }

    return { indexed: false, sizeMb: null, cbmKey: null };
}

module.exports = {
    CBM_EXE,
    getCbmData,
    matchProjectCbm,
    isCbmServerRunning,
    ensureCbmServerRunning,
    buildCbmUrl
};
