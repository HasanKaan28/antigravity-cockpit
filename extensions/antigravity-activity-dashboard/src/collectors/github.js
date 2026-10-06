'use strict';
/**
 * Collector: GitHub Repositories.
 * Uses gh CLI asynchronously with strict argument arrays (no shell).
 * Supports caching, custom repo merging, and CBM exact index detection.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileAsync } = require('../util/proc');
const { getCustomRepos, getGithubCache, saveGithubCache, isFavorite, isArchived } = require('../storage');
const { matchProjectCbm } = require('./cbm');
const logger = require('../logger');

function getTimeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Az Önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

async function getDetectedGithubUser() {
    try {
        const { stdout } = await execFileAsync('gh', ['api', 'user', '--jq', '.login'], {}, 2500);
        if (stdout && /^[a-zA-Z0-9-]+$/.test(stdout)) {
            return stdout.trim();
        }
    } catch {
        // fallback
    }
    try {
        const { stdout: gUser } = await execFileAsync('git', ['config', 'user.name'], {}, 1500);
        if (gUser && gUser.trim()) return gUser.trim();
    } catch {}
    return '';
}

async function getGithubReposData(cbmDbMap, configUser = null) {
    const userDir = os.homedir();
    const targetUser = configUser || (await getDetectedGithubUser());
    let rawRepos = [];

    try {
        const { stdout } = await execFileAsync('gh', [
            'repo', 'list', targetUser,
            '--limit', '50',
            '--json', 'name,description,isPrivate,pushedAt,url,stargazerCount,primaryLanguage,sshUrl,defaultBranchRef'
        ], {}, 5000);

        if (stdout) {
            rawRepos = JSON.parse(stdout);
            saveGithubCache(rawRepos);
        }
    } catch (err) {
        logger.warn('gh repo list failed or offline, loading cached repos:', err.message || err);
        rawRepos = getGithubCache() || [];
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
        const fullName = r.fullName || (r.url ? r.url.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '') : `${targetUser}/${repoName}`);
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

        // CBM matching
        const cbmStatus = matchProjectCbm(localPath || repoName, repoName, cbmDbMap);

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

        let timeAgoStr = 'Yakın zamanda';
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
            description: r.description || 'GitHub deposu',
            isPrivate: Boolean(r.isPrivate),
            language: r.primaryLanguage?.name || r.language || 'Code',
            stars: r.stargazerCount || 0,
            url: r.url || `https://github.com/${fullName}`,
            pushedAt: r.pushedAt,
            timeAgo: timeAgoStr,
            defaultBranch: r.defaultBranchRef?.name || 'main',
            isCloned,
            localPath,
            cbmIndexed: cbmStatus.indexed,
            cbmDbSize: cbmStatus.sizeMb,
            cbmProjectKey: cbmStatus.cbmKey,
            hasGraphify,
            graphifyPath,
            isFavorite: isFav,
            isArchived: isArch
        });
    }

    return processed;
}

module.exports = {
    getDetectedGithubUser,
    getGithubReposData
};
