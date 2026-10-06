'use strict';
const fs = require('fs');
const path = require('path');

const REPO_REGEX = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?$/;

function validateExternalUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch {
        return null;
    }
    return null;
}

function parseRepoInput(input, defaultOwner = '') {
    if (!input || typeof input !== 'string') return null;
    const clean = input.trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/^\/+|\/+$/g, '');

    if (!REPO_REGEX.test(clean)) return null;

    if (clean.includes('/')) {
        const parts = clean.split('/');
        return {
            owner: parts[0],
            repo: parts[1],
            fullName: `${parts[0]}/${parts[1]}`,
            url: `https://github.com/${parts[0]}/${parts[1]}`
        };
    }

    if (!defaultOwner) {
        return {
            owner: '',
            repo: clean,
            fullName: clean,
            url: `https://github.com/${clean}`
        };
    }
    return {
        owner: defaultOwner,
        repo: clean,
        fullName: `${defaultOwner}/${clean}`,
        url: `https://github.com/${defaultOwner}/${clean}`
    };
}

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isExistingPath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return false;
    const clean = targetPath.trim();
    try {
        return fs.existsSync(clean);
    } catch {
        return false;
    }
}

function safePath(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return null;
    const normalized = path.normalize(targetPath.trim());
    return fs.existsSync(normalized) ? normalized : null;
}

module.exports = {
    validateExternalUrl,
    parseRepoInput,
    normalizeKey,
    isExistingPath,
    safePath
};
