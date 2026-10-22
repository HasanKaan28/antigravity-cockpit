'use strict';
/**
 * [⚡ OLLAMA ACTIVE] - Safe process execution utilities.
 * Shell: false by default. String interpolation strictly forbidden.
 */
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../logger');

function execFileAsync(file, args = [], options = {}, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const opts = {
            encoding: 'utf8',
            timeout: timeoutMs,
            windowsHide: true,
            maxBuffer: 4 * 1024 * 1024,
            ...options,
            shell: false
        };

        execFile(file, args, opts, (error, stdout, stderr) => {
            if (error) {
                reject({
                    error,
                    code: error.code,
                    killed: error.killed,
                    stdout: stdout || '',
                    stderr: stderr || ''
                });
            } else {
                resolve({
                    stdout: (stdout || '').trim(),
                    stderr: (stderr || '').trim()
                });
            }
        });
    });
}

function findEdgeExecutable() {
    const candidates = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return p;
        } catch {
            // ignore
        }
    }
    return null;
}

function launchInBrowser(targetUrlOrPath, vscodeInstance = null) {
    if (!targetUrlOrPath) return false;
    const cleanTarget = String(targetUrlOrPath).trim();
    const isUrl = /^https?:\/\//i.test(cleanTarget);
    const edgeExe = findEdgeExecutable();

    if (edgeExe) {
        try {
            const child = spawn(edgeExe, [cleanTarget], {
                detached: true,
                stdio: 'ignore',
                windowsHide: false
            });
            child.unref();
            return true;
        } catch (err) {
            logger.warn('Failed to spawn Edge directly:', err);
        }
    }

    if (vscodeInstance && vscodeInstance.env && vscodeInstance.env.openExternal) {
        try {
            const uri = isUrl ? vscodeInstance.Uri.parse(cleanTarget) : vscodeInstance.Uri.file(cleanTarget);
            vscodeInstance.env.openExternal(uri);
            return true;
        } catch (err) {
            logger.warn('Failed vscode.env.openExternal:', err);
        }
    }

    // Fallback: Start-Process via powershell with argument array (no shell string injection)
    try {
        const psExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        if (fs.existsSync(psExe)) {
            const child = spawn(psExe, ['-NoProfile', '-Command', 'Start-Process', '-FilePath', cleanTarget], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            });
            child.unref();
            return true;
        }
    } catch (err) {
        logger.error('All browser launch mechanisms failed:', err);
    }
    return false;
}

/**
 * Lightweight concurrency limiter for parallel tasks.
 */
function createPool(concurrency = 4) {
    let active = 0;
    const queue = [];

    const next = () => {
        if (queue.length === 0 || active >= concurrency) return;
        active++;
        const { fn, resolve, reject } = queue.shift();
        Promise.resolve()
            .then(fn)
            .then(resolve, reject)
            .finally(() => {
                active--;
                next();
            });
    };

    return (fn) => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
    });
}

module.exports = {
    execFileAsync,
    findEdgeExecutable,
    launchInBrowser,
    createPool
};
