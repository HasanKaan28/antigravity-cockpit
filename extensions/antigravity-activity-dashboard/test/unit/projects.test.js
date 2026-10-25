'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null';

function git(cwd, ...args) {
    execFileSync('git', [
        '-c', 'user.name=Cockpit Test', '-c', 'user.email=test@example.com',
        '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${NULL_DEVICE}`,
        ...args
    ], { cwd, stdio: 'ignore' });
}

function hasGit() {
    try {
        execFileSync('git', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Loads fresh projects and storage modules whose storage lives in a temp home, so the user's
// real favorites and archive files are never read or written.
function loadIsolatedProjects(home) {
    const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    const paths = ['../../src/storage', '../../src/collectors/projects'].map(p => require.resolve(p));
    paths.forEach(p => { delete require.cache[p]; });
    const projects = require(paths[1]);
    paths.forEach(p => { delete require.cache[p]; });
    process.env.HOME = saved.HOME;
    process.env.USERPROFILE = saved.USERPROFILE;
    return projects;
}

describe('Projects collector', function () {
    this.timeout(30000);
    let tmp;
    let root;
    let byName;

    before(async function () {
        if (!hasGit()) this.skip();
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-projects-'));
        root = path.join(tmp, 'repos');
        const home = path.join(tmp, 'home');
        fs.mkdirSync(home);

        const make = (name) => { const dir = path.join(root, name); fs.mkdirSync(dir, { recursive: true }); return dir; };

        const alpha = make('alpha');
        git(alpha, 'init', '-q', '-b', 'main');
        for (const msg of ['first', 'second', 'third | with a pipe']) {
            fs.writeFileSync(path.join(alpha, 'log.txt'), msg);
            git(alpha, 'add', '.');
            git(alpha, 'commit', '-q', '-m', msg);
        }
        fs.writeFileSync(path.join(alpha, 'untracked.txt'), 'x');

        const beta = make('beta');
        git(beta, 'init', '-q', '-b', 'feature/x');
        fs.writeFileSync(path.join(beta, 'a.txt'), 'a');
        git(beta, 'add', '.');
        git(beta, 'commit', '-q', '-m', 'only commit');

        git(make('unborn'), 'init', '-q', '-b', 'trunk');
        fs.writeFileSync(path.join(make('gamma'), 'package.json'), '{}');
        fs.writeFileSync(path.join(make('notes'), 'readme.txt'), 'not a project');

        const { getProjectsData } = loadIsolatedProjects(home);
        const all = await getProjectsData([], [root]);
        const prefix = root.split('\\').join('/').toLowerCase() + '/';
        byName = new Map(all.filter(p => p.path.toLowerCase().startsWith(prefix)).map(p => [p.name, p]));
    });

    after(() => {
        if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('finds git repos and marker-file projects, and skips other folders', () => {
        assert.deepStrictEqual([...byName.keys()].sort(), ['alpha', 'beta', 'gamma', 'unborn']);
    });

    it('reads the two latest commits, keeping a "|" inside the subject', () => {
        const { gitLog } = byName.get('alpha');
        assert.strictEqual(gitLog.length, 2);
        assert.strictEqual(gitLog[0].msg, 'third | with a pipe');
        assert.strictEqual(gitLog[1].msg, 'second');
        assert.ok(gitLog[0].time > 0 && /^[0-9a-f]{7,}$/.test(gitLog[0].hash));
    });

    it('reports branch and uncommitted changes per repo', () => {
        assert.strictEqual(byName.get('alpha').branch, 'main');
        assert.strictEqual(byName.get('alpha').hasUncommitted, true);
        assert.strictEqual(byName.get('beta').branch, 'feature/x');
        assert.strictEqual(byName.get('beta').hasUncommitted, false);
    });

    it('falls back to defaults for repos without commits and non-git projects', () => {
        assert.deepStrictEqual(
            ['unborn', 'gamma'].map(n => [byName.get(n).isGit, byName.get(n).branch, byName.get(n).gitLog.length]),
            [[true, 'main', 0], [false, 'main', 0]]
        );
    });
});
