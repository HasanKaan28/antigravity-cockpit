'use strict';
/**
 * Safe process execution utilities.
 * Shell: false by default. String interpolation strictly forbidden.
 */
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../logger');
const { validateExternalUrl, isLocalHtmlFile } = require('./security');

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

// The dashboard runs git in folders the user may never have opened (scan roots, recent workspaces,
// fresh clones). Repo-local config can make git run commands on its own: core.fsmonitor on status,
// gpg.program through log.showSignature, clean filters selected by .gitattributes, hooks. Every git
// call turns those off; attributes come from the built-in empty tree so no filter can be selected.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null';
let attrSourceSupported = true;

function safeGitArgs(args, withAttrSource = attrSourceSupported) {
    return [
        '-c', 'core.fsmonitor=false',
        '-c', 'log.showSignature=false',
        '-c', `core.hooksPath=${NULL_DEVICE}`,
        ...(withAttrSource ? [`--attr-source=${EMPTY_TREE}`] : []),
        ...args
    ];
}

async function execGit(args, options = {}, timeoutMs = 5000) {
    try {
        return await execFileAsync('git', safeGitArgs(args), options, timeoutMs);
    } catch (err) {
        // git older than 2.40 has no --attr-source; keep the other protections and retry.
        if (attrSourceSupported && /attr-source/.test(err.stderr || '')) {
            attrSourceSupported = false;
            return execFileAsync('git', safeGitArgs(args, false), options, timeoutMs);
        }
        throw err;
    }
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

// The browser only ever gets an http(s) URL or an absolute path to a local .html/.htm file.
// Anything else (an option such as --flag, an .exe, a shortcut) is refused before it reaches a process.
function resolveLaunchTarget(targetUrlOrPath) {
    if (!targetUrlOrPath || typeof targetUrlOrPath !== 'string') return null;
    const trimmed = targetUrlOrPath.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        const url = validateExternalUrl(trimmed);
        return url ? { target: url, isUrl: true } : null;
    }
    return isLocalHtmlFile(trimmed) ? { target: path.normalize(trimmed), isUrl: false } : null;
}

function launchInBrowser(targetUrlOrPath, vscodeInstance = null) {
    const resolved = resolveLaunchTarget(targetUrlOrPath);
    if (!resolved) {
        logger.warn('Refused to open an unsupported browser target:', targetUrlOrPath);
        return false;
    }
    const { target: cleanTarget, isUrl } = resolved;
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

    // No PowerShell fallback: -Command joins its arguments into one script, so a target would run as code.
    logger.error('All browser launch mechanisms failed for:', cleanTarget);
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
    execGit,
    safeGitArgs,
    findEdgeExecutable,
    resolveLaunchTarget,
    launchInBrowser,
    createPool
};
