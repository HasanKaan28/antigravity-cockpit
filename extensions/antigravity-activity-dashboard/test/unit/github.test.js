'use strict';
/**
 * GitHub collector against a stubbed gh CLI. Storage lives in a temp home, so the user's real
 * repo cache, favorites and custom repos are never read or written.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', '..', 'src');
const procPath = require.resolve(path.join(srcDir, 'util', 'proc.js'));
const storagePath = require.resolve(path.join(srcDir, 'storage.js'));
const githubPath = require.resolve(path.join(srcDir, 'collectors', 'github.js'));

const sampleRepos = [
    { name: 'orbit-api', nameWithOwner: 'sample-org/orbit-api', url: 'https://github.com/sample-org/orbit-api', pushedAt: '2026-10-01T00:00:00Z', isPrivate: false, stargazerCount: 3, primaryLanguage: { name: 'TypeScript' } },
    { name: 'design-tokens', nameWithOwner: 'sample-org/design-tokens', url: 'https://github.com/sample-org/design-tokens', pushedAt: '2026-09-01T00:00:00Z', isPrivate: true }
];

describe('GitHub collector', () => {
    let home;
    let savedEnv;
    let savedProc;
    let github;
    const calls = [];
    let responses = {};

    before(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-github-'));
        savedEnv = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
        process.env.HOME = home;
        process.env.USERPROFILE = home;

        savedProc = require.cache[procPath];
        require.cache[procPath] = {
            id: procPath, filename: procPath, loaded: true, children: [], paths: [],
            exports: {
                execFileAsync: async (file, args) => {
                    calls.push([file, ...args]);
                    const res = responses[args.slice(0, 2).join(' ')];
                    if (res instanceof Error) throw { error: res, stderr: res.message };
                    return { stdout: res === undefined ? '' : res, stderr: '' };
                },
                execGit: async () => { throw { stderr: 'no github.user' }; }
            }
        };
        [storagePath, githubPath].forEach(p => { delete require.cache[p]; });
        github = require(githubPath);
    });

    after(() => {
        if (savedProc) require.cache[procPath] = savedProc; else delete require.cache[procPath];
        [storagePath, githubPath].forEach(p => { delete require.cache[p]; });
        process.env.HOME = savedEnv.HOME;
        process.env.USERPROFILE = savedEnv.USERPROFILE;
        fs.rmSync(home, { recursive: true, force: true });
    });

    beforeEach(() => {
        calls.length = 0;
        responses = {};
    });

    it('lists the signed-in user\'s repos with one gh call and takes the owner from the list', async () => {
        responses['repo list'] = JSON.stringify(sampleRepos);
        const repos = await github.getGithubReposData(null);
        assert.strictEqual(calls.length, 1, 'no separate gh api user call');
        assert.deepStrictEqual(calls[0].slice(0, 4), ['gh', 'repo', 'list', '--limit']);
        assert.strictEqual(repos.targetUser, 'sample-org');
        assert.deepStrictEqual(repos.map(r => r.fullName), ['sample-org/orbit-api', 'sample-org/design-tokens']);
        assert.strictEqual(repos[0].language, 'TypeScript');
        assert.strictEqual(repos[1].isPrivate, true);
    });

    it('lists a configured user\'s repos by name', async () => {
        responses['repo list'] = JSON.stringify(sampleRepos);
        const repos = await github.getGithubReposData('other-org');
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0][3], 'other-org');
        assert.strictEqual(repos.targetUser, 'other-org');
    });

    it('asks gh for the user only when the list is empty', async () => {
        responses['repo list'] = '[]';
        responses['api user'] = 'sample-org';
        const repos = await github.getGithubReposData(null);
        assert.deepStrictEqual(calls.map(c => c.slice(1, 3)), [['repo', 'list'], ['api', 'user']]);
        assert.strictEqual(repos.targetUser, 'sample-org');
        assert.strictEqual(repos.length, 0);
    });

    it('builds the list from the cache without starting gh when the network is off', async () => {
        require(storagePath).saveGithubCache(sampleRepos);
        const repos = await github.getGithubReposData(null, { network: false });
        assert.strictEqual(calls.length, 0, 'gh never runs');
        assert.strictEqual(repos.length, 2);
        assert.strictEqual(repos.targetUser, 'sample-org', 'the cached owner names the user');
    });

    it('names the user from the url when an older cache has no nameWithOwner', async () => {
        require(storagePath).saveGithubCache(sampleRepos.map(r => { const old = { ...r }; delete old.nameWithOwner; return old; }));
        const repos = await github.getGithubReposData(null, { network: false });
        assert.strictEqual(calls.length, 0);
        assert.strictEqual(repos.targetUser, 'sample-org');
        assert.strictEqual(repos[0].fullName, 'sample-org/orbit-api');
    });

    it('falls back to the cached list when gh is unavailable', async () => {
        require(storagePath).saveGithubCache(sampleRepos);
        responses['repo list'] = new Error('gh: not logged in');
        responses['api user'] = new Error('gh: not logged in');
        const repos = await github.getGithubReposData(null);
        assert.strictEqual(repos.length, 2);
        assert.strictEqual(repos[0].fullName, 'sample-org/orbit-api');
        assert.strictEqual(repos.targetUser, null, 'offline: no user is claimed');
    });
});
