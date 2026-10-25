'use strict';
/**
 * Collector: GitHub Repositories.
 * Uses gh CLI asynchronously with strict argument arrays (no shell).
 * Supports caching and custom repo merging.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileAsync, execGit } = require('../util/proc');
const { getCustomRepos, getGithubCache, saveGithubCache, isFavorite, isArchived } = require('../storage');
const logger = require('../logger');

function getTimeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

async function getDetectedGithubUser() {
    try {
        const { stdout } = await execFileAsync('gh', ['api', 'user', '--jq', '.login'], {}, 2500);
        if (stdout && /^[a-zA-Z0-9-]+$/.test(stdout.trim())) {
            return stdout.trim();
        }
    } catch {
        // fallback to git config
    }
    try {
        const { stdout } = await execGit(['config', '--get', 'github.user'], {}, 1500);
        if (stdout && stdout.trim()) return stdout.trim();
    } catch (e) {
        logger.debug('github.user git config check ignored:', e.message);
    }
    return null;
}

// Owner of a gh list entry: from nameWithOwner, or from the url for lists cached by older builds.
function repoOwner(r) {
    const full = typeof r.nameWithOwner === 'string'
        ? r.nameWithOwner
        : (typeof r.url === 'string' ? r.url.replace(/^https?:\/\/github\.com\//i, '') : '');
    return full.includes('/') ? full.split('/')[0] : null;
}

// network: false builds the list from the cached gh answer only and never starts gh.
async function getGithubReposData(configUser = null, { network = true } = {}) {
    const userDir = os.homedir();
    let targetUser = configUser || null;
    let fetched = null;

    // Without a configured user, `gh repo list` lists the signed-in user's own repos and names the
    // owner in each entry, so the separate `gh api user` round trip is only needed when the list
    // comes back empty or gh is unavailable.
    if (network) {
        try {
            const { stdout } = await execFileAsync('gh', [
                'repo', 'list', ...(targetUser ? [targetUser] : []),
                '--limit', '50',
                '--json', 'name,nameWithOwner,description,isPrivate,pushedAt,url,stargazerCount,primaryLanguage,sshUrl,defaultBranchRef'
            ], {}, 5000);

            if (stdout) {
                fetched = JSON.parse(stdout);
                saveGithubCache(fetched);
            }
        } catch (err) {
            logger.warn('gh repo list failed or offline, loading cached repos:', err.message || err);
        }
    }
    const rawRepos = fetched || getGithubCache() || [];

    if (!targetUser) {
        // Online, only a fresh answer may name the user; the cache names the user who fetched it.
        const source = network ? (fetched || []) : rawRepos;
        const owner = source.map(repoOwner).find(Boolean);
        if (owner) targetUser = owner;
        else if (network) targetUser = await getDetectedGithubUser();
    }

    // Merge custom added repos
    const customRepos = getCustomRepos();
    for (const cr of customRepos) {
        if (!rawRepos.some(r => r.name.toLowerCase() === cr.name.toLowerCase())) {
            rawRepos.push(cr);
        }
    }

    const processed = [];

    for (const r of rawRepos) {
        const repoName = r.name;
        const fullName = r.fullName || r.nameWithOwner || (r.url ? r.url.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '') : (targetUser ? `${targetUser}/${repoName}` : repoName));
        const possibleLocalPaths = [
            path.join(userDir, 'github-repos', repoName),
            path.join(userDir, repoName),
            path.join(userDir, '.gemini', 'antigravity-ide', 'scratch', repoName)
        ];

        let localPath = null;
        let isCloned = false;
        for (const p of possibleLocalPaths) {
            try {
                if (fs.existsSync(p)) {
                    localPath = p.split('\\').join('/');
                    isCloned = true;
                    break;
                }
            } catch {
                // skip
            }
        }

        // Graphify check
        let hasGraphify = false;
        let graphifyPath = null;
        if (localPath) {
            const g1 = path.join(localPath, 'graphify-out', 'graph.html');
            const g2 = path.join(localPath, 'graph.html');
            try {
                if (fs.existsSync(g1)) {
                    hasGraphify = true;
                    graphifyPath = g1.split('\\').join('/');
                } else if (fs.existsSync(g2)) {
                    hasGraphify = true;
                    graphifyPath = g2.split('\\').join('/');
                }
            } catch {
                // skip
            }
        }

        const canonicalId = `github:${fullName.toLowerCase()}`;
        const isFav = isFavorite(canonicalId) || (localPath && isFavorite(localPath));
        const isArch = isArchived(canonicalId) || (localPath && isArchived(localPath));

        let timeAgoStr = 'recently';
        if (r.pushedAt) {
            try {
                timeAgoStr = getTimeAgo(new Date(r.pushedAt));
            } catch {
                // ignore
            }
        }

        processed.push({
            name: repoName,
            fullName,
            description: r.description || 'GitHub repository',
            isPrivate: Boolean(r.isPrivate),
            language: r.primaryLanguage?.name || r.language || 'Code',
            stars: r.stargazerCount || 0,
            url: r.url || `https://github.com/${fullName}`,
            pushedAt: r.pushedAt,
            timeAgo: timeAgoStr,
            defaultBranch: r.defaultBranchRef?.name || 'main',
            isCloned,
            localPath,
            hasGraphify,
            graphifyPath,
            isFavorite: isFav,
            isArchived: isArch
        });
    }

    processed.targetUser = targetUser;
    return processed;
}

module.exports = {
    getDetectedGithubUser,
    getGithubReposData
};
