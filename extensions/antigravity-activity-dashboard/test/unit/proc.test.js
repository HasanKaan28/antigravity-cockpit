'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { safeGitArgs, execGit, resolveLaunchTarget } = require('../../src/util/proc');

function hasGit() {
    try {
        execFileSync('git', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

describe('Process Utility Tests', () => {
    describe('safeGitArgs', () => {
        it('turns off repo-controlled helpers before the git command', () => {
            const args = safeGitArgs(['status', '--short']);
            const pairs = [];
            for (let i = 0; i < args.length - 1; i++) {
                if (args[i] === '-c') pairs.push(args[i + 1]);
            }
            assert.ok(pairs.includes('core.fsmonitor=false'));
            assert.ok(pairs.includes('log.showSignature=false'));
            assert.ok(pairs.some(p => p.startsWith('core.hooksPath=')));
            assert.deepStrictEqual(args.slice(-2), ['status', '--short']);
        });

        it('reads attributes from the empty tree when supported', () => {
            assert.ok(safeGitArgs(['log'], true).includes('--attr-source=4b825dc642cb6eb9a060e54bf8d69288fbee4904'));
            assert.ok(!safeGitArgs(['log'], false).some(a => a.startsWith('--attr-source')));
        });
    });

    describe('execGit', function () {
        this.timeout(15000);
        let repo;

        before(function () {
            if (!hasGit()) this.skip();
            repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-git-'));
            execFileSync('git', ['init', '-q'], { cwd: repo });
            // A scanned repo can name its own fsmonitor helper; the dashboard must never start it.
            execFileSync('git', ['config', 'core.fsmonitor', 'touch fsmonitor-ran'], { cwd: repo });
            fs.writeFileSync(path.join(repo, 'a.txt'), 'x');
        });

        after(() => {
            if (repo) fs.rmSync(repo, { recursive: true, force: true });
        });

        it('reports status without starting the repo fsmonitor helper', async () => {
            const { stdout } = await execGit(['status', '--short', '--ignore-submodules=all'], { cwd: repo });
            assert.strictEqual(stdout, '?? a.txt');
            assert.ok(!fs.existsSync(path.join(repo, 'fsmonitor-ran')));
        });
    });

    describe('resolveLaunchTarget', () => {
        let dir;
        before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-launch-')); });
        after(() => fs.rmSync(dir, { recursive: true, force: true }));

        it('accepts web URLs and local HTML files', () => {
            const html = path.join(dir, 'graph.html');
            fs.writeFileSync(html, '<html></html>');
            assert.deepStrictEqual(resolveLaunchTarget('https://github.com/octocat'), { target: 'https://github.com/octocat', isUrl: true });
            assert.deepStrictEqual(resolveLaunchTarget(html), { target: path.normalize(html), isUrl: false });
        });

        it('refuses everything else', () => {
            const script = path.join(dir, 'tool.cmd');
            fs.writeFileSync(script, 'echo');
            assert.strictEqual(resolveLaunchTarget(script), null);
            assert.strictEqual(resolveLaunchTarget(dir), null);
            assert.strictEqual(resolveLaunchTarget('graph.html'), null);
            assert.strictEqual(resolveLaunchTarget('--new-window'), null);
            assert.strictEqual(resolveLaunchTarget('file:///C:/Windows'), null);
            assert.strictEqual(resolveLaunchTarget(''), null);
            assert.strictEqual(resolveLaunchTarget(undefined), null);
        });
    });
});
