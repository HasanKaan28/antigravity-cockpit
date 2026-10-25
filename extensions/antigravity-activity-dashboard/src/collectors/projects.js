'use strict';
/**
 * Collector: Local projects scanner.
 * Uses pool-limited async git execution to avoid UI freezes.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execGit, createPool } = require('../util/proc');
const { isFavorite, isArchived } = require('../storage');
const { matchProjectCbm } = require('./cbm');
const logger = require('../logger');

const gitPool = createPool(4);

async function inspectGitRepo(projectPath) {
    return gitPool(async () => {
        let branch = 'main';
        let gitLog = [];
        let hasUncommitted = false;

        try {
            const { stdout: bOut } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectPath }, 1500);
            if (bOut) branch = bOut.trim();
        } catch {
            // not a valid HEAD yet
        }

        try {
            // Subject goes last so a "|" inside it cannot shift the fields. "time" (ms) lets the
            // webview format the age in the UI language; "ago" stays as git's English fallback.
            const { stdout: lOut } = await execGit(['log', '-n', '2', '--pretty=format:%h|%ct|%ar|%s'], { cwd: projectPath }, 1500);
            if (lOut) {
                gitLog = lOut.split('\n').filter(Boolean).map(line => {
                    const [hash = '', ct = '', ago = '', ...msg] = line.split('|');
                    return { hash, msg: msg.join('|'), ago, time: Number(ct) * 1000 || null };
                });
            }
        } catch {
            // no commits yet
        }

        try {
            const { stdout: sOut } = await execGit(['status', '--short', '--ignore-submodules=all'], { cwd: projectPath }, 1500);
            hasUncommitted = Boolean(sOut && sOut.trim());
        } catch {
            // ignore
        }

        return { branch, gitLog, hasUncommitted };
    });
}

function getRecentIdeWorkspaces() {
    const results = [];
    const userDir = os.homedir();
    const storagePaths = [
        // Windows
        process.env.APPDATA ? path.join(process.env.APPDATA, 'Antigravity IDE', 'User', 'globalStorage', 'storage.json') : null,
        process.env.APPDATA ? path.join(process.env.APPDATA, 'Code', 'User', 'globalStorage', 'storage.json') : null,
        // macOS
        path.join(userDir, 'Library', 'Application Support', 'Antigravity IDE', 'User', 'globalStorage', 'storage.json'),
        path.join(userDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'storage.json'),
        // Linux
        path.join(userDir, '.config', 'Antigravity IDE', 'User', 'globalStorage', 'storage.json'),
        path.join(userDir, '.config', 'Code', 'User', 'globalStorage', 'storage.json')
    ].filter(Boolean);

    for (const sPath of storagePaths) {
        if (!fs.existsSync(sPath)) continue;
        try {
            const raw = fs.readFileSync(sPath, 'utf8');
            const data = JSON.parse(raw);

            // Extract from profileAssociations.workspaces
            if (data.profileAssociations && typeof data.profileAssociations.workspaces === 'object') {
                for (const uriStr of Object.keys(data.profileAssociations.workspaces)) {
                    if (uriStr.startsWith('file://')) {
                        try {
                            const decoded = decodeURIComponent(uriStr.replace(/^file:\/\/\/?/i, ''));
                            const normalized = path.normalize(decoded);
                            if (fs.existsSync(normalized)) results.push(normalized);
                        } catch { /* best effort */ }
                    }
                }
            }

            // Extract from backupWorkspaces.folders
            if (data.backupWorkspaces && Array.isArray(data.backupWorkspaces.folders)) {
                for (const f of data.backupWorkspaces.folders) {
                    if (f && f.folderUri && f.folderUri.startsWith('file://')) {
                        try {
                            const decoded = decodeURIComponent(f.folderUri.replace(/^file:\/\/\/?/i, ''));
                            const normalized = path.normalize(decoded);
                            if (fs.existsSync(normalized)) results.push(normalized);
                        } catch { /* best effort */ }
                    }
                }
            }

            // Extract from windowsState.lastActiveWindow
            if (data.windowsState && data.windowsState.lastActiveWindow && data.windowsState.lastActiveWindow.folder) {
                const f = data.windowsState.lastActiveWindow.folder;
                if (f.startsWith('file://')) {
                    try {
                        const decoded = decodeURIComponent(f.replace(/^file:\/\/\/?/i, ''));
                        const normalized = path.normalize(decoded);
                        if (fs.existsSync(normalized)) results.push(normalized);
                    } catch { /* best effort */ }
                } else if (fs.existsSync(f)) {
                    results.push(path.normalize(f));
                }
            }
        } catch {
            // ignore JSON read error
        }
    }
    return results;
}

async function getProjectsData(cbmDbMap, workspaceFolders = [], customScanRoots = []) {
    const userDir = os.homedir();
    const candidateDirs = new Set();

    // 1. Current workspace folders
    for (const wf of workspaceFolders) {
        if (wf && fs.existsSync(wf)) candidateDirs.add(path.normalize(wf));
    }

    // 2. Recently opened IDE workspaces from global storage
    for (const rw of getRecentIdeWorkspaces()) {
        if (rw && fs.existsSync(rw)) candidateDirs.add(rw);
    }

    // 3. User configured scan roots
    for (const root of customScanRoots) {
        if (root && fs.existsSync(root)) {
            candidateDirs.add(path.normalize(root));
            try {
                const sub = await fs.promises.readdir(root, { withFileTypes: true });
                for (const d of sub) {
                    if (d.isDirectory() && !d.name.startsWith('.')) {
                        candidateDirs.add(path.normalize(path.join(root, d.name)));
                    }
                }
            } catch {
                // ignore
            }
        }
    }

    // 4. Common standard developer directories (depth 1)
    const standardDevDirs = [
        path.join(userDir, 'Projects'),
        path.join(userDir, 'projects'),
        path.join(userDir, 'Workspace'),
        path.join(userDir, 'workspaces'),
        path.join(userDir, 'code'),
        path.join(userDir, 'dev'),
        path.join(userDir, 'development'),
        path.join(userDir, 'source', 'repos'),
        path.join(userDir, 'repos'),
        path.join(userDir, 'Documents', 'GitHub'),
        path.join(userDir, 'Documents', 'Projects'),
        path.join(userDir, 'github-repos'),
        path.join(userDir, '.gemini', 'antigravity-ide', 'scratch')
    ];

    for (const sDir of standardDevDirs) {
        if (fs.existsSync(sDir)) {
            try {
                const sub = await fs.promises.readdir(sDir, { withFileTypes: true });
                for (const d of sub) {
                    if (d.isDirectory() && !d.name.startsWith('.')) {
                        candidateDirs.add(path.normalize(path.join(sDir, d.name)));
                    }
                }
            } catch {
                // ignore
            }
        }
    }

    const projects = [];
    const seen = new Set();

    for (const cDir of candidateDirs) {
        const normDir = cDir.split('\\').join('/');
        const lower = normDir.toLowerCase();
        if (seen.has(lower) || !fs.existsSync(cDir)) continue;
        seen.add(lower);

        const isGit = fs.existsSync(path.join(cDir, '.git'));
        const isProject = isGit ||
            fs.existsSync(path.join(cDir, 'package.json')) ||
            fs.existsSync(path.join(cDir, 'requirements.txt')) ||
            fs.existsSync(path.join(cDir, 'pyproject.toml')) ||
            fs.existsSync(path.join(cDir, 'Cargo.toml')) ||
            fs.existsSync(path.join(cDir, 'go.mod')) ||
            fs.existsSync(path.join(cDir, 'pom.xml')) ||
            fs.existsSync(path.join(cDir, 'build.gradle')) ||
            fs.existsSync(path.join(cDir, 'composer.json')) ||
            fs.existsSync(path.join(cDir, 'CMakeLists.txt')) ||
            fs.existsSync(path.join(cDir, 'graphify-out'));

        if (!isProject) continue;

        const name = path.basename(cDir);
        let gitInfo = { branch: 'main', gitLog: [], hasUncommitted: false };
        if (isGit) {
            gitInfo = await inspectGitRepo(cDir);
        }

        let sessionNotes = '';
        const sessionPath = path.join(cDir, 'SESSION_STATE.md');
        if (fs.existsSync(sessionPath)) {
            try {
                const raw = await fs.promises.readFile(sessionPath, 'utf8');
                sessionNotes = raw.slice(0, 500);
            } catch {
                // ignore
            }
        }

        let graphifyPath = path.join(cDir, 'graphify-out', 'graph.html');
        let hasGraphify = fs.existsSync(graphifyPath);
        if (!hasGraphify) {
            const alt = path.join(cDir, 'graph.html');
            if (fs.existsSync(alt)) {
                graphifyPath = alt;
                hasGraphify = true;
            }
        }

        const cbmStatus = matchProjectCbm(cDir, name, cbmDbMap);
        const fav = isFavorite(normDir);
        const arch = isArchived(normDir);

        projects.push({
            name,
            path: normDir,
            rawPath: cDir,
            isGit,
            branch: gitInfo.branch,
            gitLog: gitInfo.gitLog,
            hasUncommitted: gitInfo.hasUncommitted,
            sessionNotes,
            hasGraphify,
            graphifyPath: hasGraphify ? graphifyPath.split('\\').join('/') : null,
            cbmIndexed: cbmStatus.indexed,
            cbmDbSize: cbmStatus.sizeMb,
            cbmProjectKey: cbmStatus.cbmKey,
            isFavorite: fav,
            isArchived: arch
        });
    }

    projects.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
    });

    return projects;
}

module.exports = {
    getProjectsData
};
