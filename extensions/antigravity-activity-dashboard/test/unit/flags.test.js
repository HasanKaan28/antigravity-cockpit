'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Loads a fresh storage module whose COCKPIT_DIR lives in a temp home, so the user's real
// favorites and archive files are never touched.
function loadIsolatedStorage(home) {
    const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    const modPath = require.resolve('../../src/storage');
    delete require.cache[modPath];
    const storage = require(modPath);
    delete require.cache[modPath];
    process.env.HOME = saved.HOME;
    process.env.USERPROFILE = saved.USERPROFILE;
    return storage;
}

function sampleData() {
    return {
        projects: [
            { name: 'fizik101', path: 'c:/Users/Dev/scratch/fizik101', rawPath: 'c:\\Users\\Dev\\scratch\\fizik101', isFavorite: false, isArchived: false },
            { name: 'orbit-api', path: 'C:/Users/Dev/repos/orbit-api', rawPath: 'C:\\Users\\Dev\\repos\\orbit-api', isFavorite: false, isArchived: false }
        ],
        githubRepos: [
            { name: 'orbit-api', fullName: 'Example/orbit-api', url: 'https://github.com/Example/orbit-api', localPath: 'C:/Users/Dev/repos/orbit-api', isFavorite: false, isArchived: false },
            { name: 'harbor-infra', fullName: 'Example/harbor-infra', url: 'https://github.com/Example/harbor-infra', localPath: null, isFavorite: false, isArchived: false }
        ]
    };
}

describe('Favorite and archive flags', () => {
    let home;
    let storage;

    beforeEach(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-flags-'));
        storage = loadIsolatedStorage(home);
    });

    afterEach(() => {
        fs.rmSync(home, { recursive: true, force: true });
    });

    it('maps GitHub URLs to the canonical repo id', () => {
        assert.strictEqual(storage.toCanonicalId('https://github.com/Example/orbit-api'), 'github:example/orbit-api');
        assert.strictEqual(storage.toCanonicalId('https://github.com/Example/orbit-api.git'), 'github:example/orbit-api');
    });

    it('lists the keys the collectors read for projects and repos', () => {
        const data = sampleData();
        assert.deepStrictEqual(storage.itemKeys(data.projects[0]), ['c:\\Users\\Dev\\scratch\\fizik101']);
        assert.deepStrictEqual(storage.itemKeys(data.githubRepos[0]), ['github:example/orbit-api', 'C:/Users/Dev/repos/orbit-api']);
        assert.deepStrictEqual(storage.itemKeys(data.githubRepos[1]), ['github:example/harbor-infra']);
    });

    it('a toggled project favorite survives the flag refresh sent back to the webview', () => {
        const data = sampleData();
        assert.strictEqual(storage.toggleItemFavorite(data.projects[0]), true);
        storage.applyUserFlags(data);
        assert.strictEqual(data.projects[0].isFavorite, true, 'fizik101 must stay a favorite without a page refresh');
        assert.strictEqual(storage.toggleItemFavorite(data.projects[0]), false);
        storage.applyUserFlags(data);
        assert.strictEqual(data.projects[0].isFavorite, false);
    });

    it('favorites an uncloned GitHub repo and keeps it after a refresh', () => {
        const data = sampleData();
        storage.toggleItemFavorite(data.githubRepos[1]);
        storage.applyUserFlags(data);
        assert.strictEqual(data.githubRepos[1].isFavorite, true);
        // A full refresh rebuilds the module state from disk.
        const reloaded = loadIsolatedStorage(home);
        assert.strictEqual(reloaded.isFavorite('github:example/harbor-infra'), true);
    });

    it('archives and restores a GitHub repo', () => {
        const data = sampleData();
        storage.toggleItemArchived(data.githubRepos[1]);
        storage.applyUserFlags(data);
        assert.strictEqual(data.githubRepos[1].isArchived, true);
        storage.toggleItemArchived(data.githubRepos[1]);
        storage.applyUserFlags(data);
        assert.strictEqual(data.githubRepos[1].isArchived, false);
    });

    it('treats a cloned repo and its project folder as the same item', () => {
        const data = sampleData();
        storage.toggleItemFavorite(data.projects[1]);
        storage.applyUserFlags(data);
        assert.strictEqual(data.githubRepos[0].isFavorite, true, 'the clone path marks the repo too, as in the collectors');
        storage.toggleItemFavorite(data.githubRepos[0]);
        storage.applyUserFlags(data);
        assert.strictEqual(data.projects[1].isFavorite, false, 'un-favoriting the repo clears the shared path key');
        assert.strictEqual(data.githubRepos[0].isFavorite, false);
    });
});
