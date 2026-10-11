'use strict';
const assert = require('assert');
const { matchProjectCbm } = require('../../src/collectors/cbm');

describe('CBM Exact Matching Tests', () => {
    const mockDbMap = new Map([
        ['c-users-kaan-github-repos-market_kasa', { sizeMb: '2.8 MB' }],
        ['antigravity-brain-sync', { sizeMb: '1.9 MB' }]
    ]);

    it('matches exact encoded path', () => {
        const result = matchProjectCbm('C:\\Users\\Kaan\\github-repos\\Market_Kasa', 'Market_Kasa', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '2.8 MB');
        assert.strictEqual(result.cbmKey, 'c-users-kaan-github-repos-market_kasa');
    });

    it('matches exact project name when encoded as simple name', () => {
        const result = matchProjectCbm('/custom/path/antigravity-brain-sync', 'antigravity-brain-sync', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '1.9 MB');
        assert.strictEqual(result.cbmKey, 'antigravity-brain-sync');
    });

    it('does NOT false-positive match on partial substrings', () => {
        // e.g. "Market" should NOT match "c-users-kaan-github-repos-market_kasa"
        const result = matchProjectCbm('C:\\Users\\Kaan\\Market', 'Market', mockDbMap);
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
        const url = buildCbmUrl('antigravity-brain-sync', 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=graph&project=antigravity-brain-sync');
    });

    it('builds stats URL when project is null', () => {
        const { buildCbmUrl } = require('../../src/collectors/cbm');
        const url = buildCbmUrl(null, 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=stats');
    });
});
