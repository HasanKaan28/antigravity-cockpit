'use strict';
const assert = require('assert');
const { matchProjectCbm } = require('../../src/collectors/cbm');

describe('CBM Exact Matching Tests', () => {
    const mockDbMap = new Map([
        ['c-Users-Dev-github-repos-sample-shop', { sizeMb: '2.8 MB' }],
        ['dotfiles-sync', { sizeMb: '1.9 MB' }]
    ]);

    it('matches exact encoded path', () => {
        const result = matchProjectCbm('C:\\Users\\Dev\\github-repos\\sample-shop', 'sample-shop', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '2.8 MB');
        assert.strictEqual(result.cbmKey, 'c-Users-Dev-github-repos-sample-shop');
    });

    it('matches exact project name when encoded as simple name', () => {
        const result = matchProjectCbm('/custom/path/dotfiles-sync', 'dotfiles-sync', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '1.9 MB');
        assert.strictEqual(result.cbmKey, 'dotfiles-sync');
    });

    it('does NOT false-positive match on partial substrings', () => {
        // e.g. "Market" should NOT match "c-Users-Dev-github-repos-sample-shop"
        const result = matchProjectCbm('C:\\Users\\Dev\\Market', 'Market', mockDbMap);
        assert.strictEqual(result.indexed, false);
        assert.strictEqual(result.sizeMb, null);
        assert.strictEqual(result.cbmKey, null);
    });

    it('returns false when dbMap is empty', () => {
        const result = matchProjectCbm('C:\\path', 'proj', new Map());
        assert.strictEqual(result.indexed, false);
        assert.strictEqual(result.sizeMb, null);
        assert.strictEqual(result.cbmKey, null);
    });

    it('builds direct graph URL with target project', () => {
        const { buildCbmUrl } = require('../../src/collectors/cbm');
        const url = buildCbmUrl('dotfiles-sync', 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=graph&project=dotfiles-sync');
    });

    it('builds stats URL when project is null', () => {
        const { buildCbmUrl } = require('../../src/collectors/cbm');
        const url = buildCbmUrl(null, 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=stats');
    });
});
