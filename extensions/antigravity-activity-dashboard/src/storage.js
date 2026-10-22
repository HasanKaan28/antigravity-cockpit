'use strict';
/**
 * Cockpit persistence: favorites, archives, custom repos and GitHub cache.
 * Implements canonical IDs and one-time migration from legacy basename sets.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');
const { normalizeKey, parseRepoInput } = require('./util/security');

const COCKPIT_DIR = path.join(os.homedir(), '.antigravity_cockpit');
const FAVORITES_FILE = path.join(COCKPIT_DIR, 'favorites.json');
const ARCHIVED_FILE = path.join(COCKPIT_DIR, 'archived.json');
const CUSTOM_REPOS_FILE = path.join(COCKPIT_DIR, 'custom_repos.json');
const GITHUB_CACHE_FILE = path.join(COCKPIT_DIR, 'github_repos_cache.json');

function ensureStorageDir() {
    try {
        if (!fs.existsSync(COCKPIT_DIR)) {
            fs.mkdirSync(COCKPIT_DIR, { recursive: true });
        }
    } catch (err) {
        logger.error('Failed to create storage dir:', err);
    }
}

function readJsonFile(filePath, defaultValue) {
    ensureStorageDir();
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (err) {
        logger.warn(`Could not read ${path.basename(filePath)}, using default:`, err.message);
    }
    return defaultValue;
}

function writeJsonFile(filePath, data) {
    ensureStorageDir();
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        logger.error(`Could not write to ${path.basename(filePath)}:`, err);
    }
}

/**
 * Canonical ID creator:
 * For GitHub: 'github:owner/repo'
 * For Local: normalized absolute path 'c:/path/to/project'
 */
function toCanonicalId(item) {
    if (!item) return '';
    if (typeof item === 'string') {
        const str = item.trim();
        if (str.startsWith('github:')) {
            const parsed = parseRepoInput(str.slice(7));
            return parsed ? `github:${parsed.fullName.toLowerCase()}` : normalizeKey(str);
        }
        if (/^https?:\/\/github\.com\//i.test(str)) {
            const parsed = parseRepoInput(str);
            if (parsed && parsed.owner) return `github:${parsed.fullName.toLowerCase()}`;
        }
        return normalizeKey(str);
    }
    if (item.url && item.fullName) {
        return `github:${item.fullName.toLowerCase()}`;
    }
    if (item.path || item.rawPath) {
        return normalizeKey(item.path || item.rawPath);
    }
    if (item.name) {
        return normalizeKey(item.name);
    }
    return '';
}

// In-memory sets
let favoritesSet = null;
let archivedSet = null;

function getFavorites() {
    if (!favoritesSet) {
        const raw = readJsonFile(FAVORITES_FILE, []);
        favoritesSet = new Set(Array.isArray(raw) ? raw.map(toCanonicalId).filter(Boolean) : []);
    }
    return favoritesSet;
}

function saveFavorites(set) {
    favoritesSet = set;
    writeJsonFile(FAVORITES_FILE, Array.from(favoritesSet));
}

function isFavorite(item) {
    const cid = toCanonicalId(item);
    if (!cid) return false;
    const favs = getFavorites();
    if (favs.has(cid)) return true;
    // Fallback match for legacy entries
    const norm = normalizeKey(typeof item === 'string' ? item : (item.path || item.name));
    return favs.has(norm);
}

function toggleFavorite(idOrItem) {
    const cid = toCanonicalId(idOrItem);
    if (!cid) return false;
    const favs = getFavorites();
    const willBeFav = !favs.has(cid);
    if (willBeFav) {
        favs.add(cid);
    } else {
        favs.delete(cid);
        // Also clean up any legacy entries
        const norm = normalizeKey(typeof idOrItem === 'string' ? idOrItem : (idOrItem.path || idOrItem.name));
        favs.delete(norm);
    }
    saveFavorites(favs);
    return willBeFav;
}

function getArchived() {
    if (!archivedSet) {
        const raw = readJsonFile(ARCHIVED_FILE, []);
        archivedSet = new Set(Array.isArray(raw) ? raw.map(toCanonicalId).filter(Boolean) : []);
    }
    return archivedSet;
}

function saveArchived(set) {
    archivedSet = set;
    writeJsonFile(ARCHIVED_FILE, Array.from(archivedSet));
}

function isArchived(item) {
    const cid = toCanonicalId(item);
    if (!cid) return false;
    const archs = getArchived();
    if (archs.has(cid)) return true;
    // Fallback match
    const norm = normalizeKey(typeof item === 'string' ? item : (item.path || item.name));
    return archs.has(norm);
}

function toggleArchive(idOrItem) {
    const cid = toCanonicalId(idOrItem);
    if (!cid) return false;
    const archs = getArchived();
    const willBeArch = !archs.has(cid);
    if (willBeArch) {
        archs.add(cid);
    } else {
        archs.delete(cid);
        const norm = normalizeKey(typeof idOrItem === 'string' ? idOrItem : (idOrItem.path || idOrItem.name));
        archs.delete(norm);
    }
    saveArchived(archs);
    return willBeArch;
}

/**
 * Every stored key that marks a dashboard item, matching the collectors:
 * projects by path, GitHub repos by 'github:owner/repo' and by their local clone path.
 */
function itemKeys(item) {
    if (!item) return [];
    if (item.fullName) return [`github:${item.fullName.toLowerCase()}`, item.localPath].filter(Boolean);
    return [item.rawPath || item.path].filter(Boolean);
}

function toggleItemFlag(item, isSet, getSet, saveSet) {
    const keys = itemKeys(item);
    if (keys.length === 0) return false;
    const turnOn = !keys.some(k => isSet(k));
    const set = getSet();
    if (turnOn) {
        set.add(toCanonicalId(keys[0]));
    } else {
        keys.forEach(k => {
            set.delete(toCanonicalId(k));
            set.delete(normalizeKey(k));
        });
    }
    saveSet(set);
    return turnOn;
}

function toggleItemFavorite(item) {
    return toggleItemFlag(item, isFavorite, getFavorites, saveFavorites);
}

function toggleItemArchived(item) {
    return toggleItemFlag(item, isArchived, getArchived, saveArchived);
}

/** Recomputes isFavorite / isArchived on collected dashboard data from the stored sets. */
function applyUserFlags(data) {
    if (!data) return data;
    [...(data.projects || []), ...(data.githubRepos || [])].forEach(item => {
        const keys = itemKeys(item);
        item.isFavorite = keys.some(k => isFavorite(k));
        item.isArchived = keys.some(k => isArchived(k));
    });
    return data;
}

function getCustomRepos() {
    return readJsonFile(CUSTOM_REPOS_FILE, []);
}

function addCustomRepo(repoData) {
    const list = getCustomRepos();
    const exists = list.some(r => r.fullName?.toLowerCase() === repoData.fullName?.toLowerCase() || r.name?.toLowerCase() === repoData.name?.toLowerCase());
    if (!exists) {
        list.unshift(repoData);
        writeJsonFile(CUSTOM_REPOS_FILE, list);
        return true;
    }
    return false;
}

function getGithubCache() {
    return readJsonFile(GITHUB_CACHE_FILE, null);
}

function saveGithubCache(repos) {
    if (Array.isArray(repos)) {
        writeJsonFile(GITHUB_CACHE_FILE, repos);
    }
}

module.exports = {
    COCKPIT_DIR,
    toCanonicalId,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getArchived,
    isArchived,
    toggleArchive,
    itemKeys,
    toggleItemFavorite,
    toggleItemArchived,
    applyUserFlags,
    getCustomRepos,
    addCustomRepo,
    getGithubCache,
    saveGithubCache
};
