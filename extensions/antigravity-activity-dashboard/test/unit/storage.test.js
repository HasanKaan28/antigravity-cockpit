'use strict';
const assert = require('assert');
const { toCanonicalId } = require('../../src/storage');

describe('Storage Canonical ID Tests', () => {
    it('creates canonical ID for GitHub objects', () => {
        const item = { url: 'https://github.com/example/demo-project', fullName: 'example/demo-project' };
        assert.strictEqual(toCanonicalId(item), 'github:example/demo-project');
    });

    it('creates canonical ID for GitHub string inputs', () => {
        assert.strictEqual(toCanonicalId('github:example/demo-project'), 'github:example/demo-project');
    });

    it('creates canonical ID for local projects with normalized paths', () => {
        const item = { path: 'C:\\Users\\Dev\\projects\\demo-project' };
        assert.strictEqual(toCanonicalId(item), 'c:/users/dev/projects/demo-project');
    });

    it('normalizes bare string paths', () => {
        assert.strictEqual(toCanonicalId('C:\\Users\\Dev\\Project\\'), 'c:/users/dev/project');
    });
});
