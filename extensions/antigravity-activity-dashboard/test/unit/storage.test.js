'use strict';
const assert = require('assert');
const { toCanonicalId } = require('../../src/storage');

describe('Storage Canonical ID Tests', () => {
    it('creates canonical ID for GitHub objects', () => {
        const item = { url: 'https://github.com/HasanKaan28/sample-shop', fullName: 'HasanKaan28/sample-shop' };
        assert.strictEqual(toCanonicalId(item), 'github:hasankaan28/sample-shop');
    });

    it('creates canonical ID for GitHub string inputs', () => {
        assert.strictEqual(toCanonicalId('github:HasanKaan28/sample-shop'), 'github:hasankaan28/sample-shop');
    });

    it('creates canonical ID for local projects with normalized paths', () => {
        const item = { path: 'C:\\Users\\Dev\\github-repos\\sample-shop' };
        assert.strictEqual(toCanonicalId(item), 'C:/Users/Dev/github-repos/sample-shop');
    });

    it('normalizes bare string paths', () => {
        assert.strictEqual(toCanonicalId('C:\\Users\\Dev\\Project\\'), 'C:/Users/Dev/project');
    });
});
