'use strict';
/**
 * Collector: Local projects scanner.
 * Uses pool-limited async git execution to avoid UI freezes.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileAsync, createPool } = require('../util/proc');
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
            const { stdout: bOut } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectPath }, 1500);
            if (bOut) branch = bOut.trim();
        } catch {
            // not a valid HEAD yet
        }

        try {
            const { stdout: lOut } = await execFileAsync('git', ['log', '-n', '2', '--pretty=format:%h|%s|%ar'], { cwd: projectPath }, 1500);
            if (lOut) {
                gitLog = lOut.split('\n').filter(Boolean).map(line => {
                    const parts = line.split('|');
                    return { hash: parts[0] || '', msg: parts[1] || '', ago: parts[2] || '' };
                });
            }
        } catch {
            // no commits yet
        }

        try {
            const { stdout: sOut } = await execFileAsync('git', ['status', '--short'], { cwd: projectPath }, 1500);
            hasUncommitted = Boolean(sOut && sOut.trim());
        } catch {
            // ignore
        }

        return { branch, gitLog, hasUncommitted };
    });
}

async function getProjectsData(cbmDbMap, workspaceFolders = [], customScanRoots = []) {
    const userDir = os.homedir();
    const candidateDirs = new Set();

    // 1. Workspace folders
    for (const wf of workspaceFolders) {
        if (wf && fs.existsSync(wf)) candidateDirs.add(path.normalize(wf));
    }

    // 2. Default github-repos directory
    const ghReposDir = path.join(userDir, 'github-repos');
    if (fs.existsSync(ghReposDir)) {
        try {
            const sub = await fs.promises.readdir(ghReposDir, { withFileTypes: true });
            for (const d of sub) {
                if (d.isDirectory()) candidateDirs.add(path.normalize(path.join(ghReposDir, d.name)));
            }
        } catch (err) {
            logger.warn('Failed reading github-repos:', err);
        }
    }

    // 3. User configured scan roots
    for (const root of customScanRoots) {
        if (root && fs.existsSync(root)) {
            candidateDirs.add(path.normalize(root));
            try {
                const sub = await fs.promises.readdir(root, { withFileTypes: true });
                for (const d of sub) {
                    if (d.isDirectory()) candidateDirs.add(path.normalize(path.join(root, d.name)));
                }
            } catch {
                // ignore
            }
        }
    }

    // 4. Scratch folder projects
    const scratchDir = path.join(userDir, '.gemini', 'antigravity-ide', 'scratch');
    if (fs.existsSync(scratchDir)) {
        try {
            const sub = await fs.promises.readdir(scratchDir, { withFileTypes: true });
            for (const d of sub) {
                if (d.isDirectory()) candidateDirs.add(path.normalize(path.join(scratchDir, d.name)));
            }
        } catch {
            // ignore
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
            fs.existsSync(path.join(cDir, 'Cargo.toml')) ||
            fs.existsSync(path.join(cDir, 'go.mod')) ||
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
