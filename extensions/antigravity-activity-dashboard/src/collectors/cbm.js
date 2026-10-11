'use strict';
/**
 * Collector: Codebase Memory MCP database index status.
 * Exact canonical matching prevents false positive substring claims.
 */
const fs = require('fs');
const path = require('path');
const { execFileAsync } = require('../util/proc');
const logger = require('../logger');

const CBM_CACHE_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\Kaan', '.cache', 'codebase-memory-mcp');
const CBM_EXE = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\Kaan\\AppData\\Local', 'Programs', 'codebase-memory-mcp', 'codebase-memory-mcp.exe');

async function getCbmData() {
    return {
        installed: false,
        version: 'Devre Dışı',
        path: '',
        uiUrl: '',
        totalDbSizeMb: '0 MB',
        indexedProjectsCount: 0,
        indexedProjects: [],
        dbMap: new Map()
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

async function ensureCbmServerRunning() {
    return { success: false, message: 'Codebase Memory MCP devre dışı bırakıldı.' };
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
    // Path encoded as CBM does: C-Users-Kaan-folder-name
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
