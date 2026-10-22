'use strict';
const assert = require('assert');
const { matchProjectCbm } = require('../../src/collectors/cbm');

describe('CBM Exact Matching Tests', () => {
    const mockDbMap = new Map([
        ['c-users-dev-projects-demo_app', { sizeMb: '2.8 MB' }],
        ['sample-project', { sizeMb: '1.9 MB' }]
    ]);

    it('matches exact encoded path', () => {
        const result = matchProjectCbm('C:\\Users\\Dev\\projects\\demo_app', 'demo_app', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '2.8 MB');
        assert.strictEqual(result.cbmKey, 'c-users-dev-projects-demo_app');
    });

    it('matches exact project name when encoded as simple name', () => {
        const result = matchProjectCbm('/custom/path/sample-project', 'sample-project', mockDbMap);
        assert.strictEqual(result.indexed, true);
        assert.strictEqual(result.sizeMb, '1.9 MB');
        assert.strictEqual(result.cbmKey, 'sample-project');
    });

    it('does NOT false-positive match on partial substrings', () => {
        // e.g. "demo" should NOT match "c-users-dev-projects-demo_app"
        const result = matchProjectCbm('C:\\Users\\Dev\\demo', 'demo', mockDbMap);
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
        const url = buildCbmUrl('sample-project', 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=graph&project=sample-project');
    });

    it('builds stats URL when project is null', () => {
        const { buildCbmUrl } = require('../../src/collectors/cbm');
        const url = buildCbmUrl(null, 'graph', 9749);
        assert.strictEqual(url, 'http://localhost:9749/?tab=stats');
    });
});
