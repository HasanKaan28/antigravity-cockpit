'use strict';
const assert = require('assert');
const { toCanonicalId } = require('../../src/storage');

describe('Storage Canonical ID Tests', () => {
    it('creates canonical ID for GitHub objects', () => {
        const item = { url: 'https://github.com/HasanKaan28/Market_Kasa', fullName: 'HasanKaan28/Market_Kasa' };
        assert.strictEqual(toCanonicalId(item), 'github:hasankaan28/market_kasa');
    });

    it('creates canonical ID for GitHub string inputs', () => {
        assert.strictEqual(toCanonicalId('github:HasanKaan28/Market_Kasa'), 'github:hasankaan28/market_kasa');
    });

    it('creates canonical ID for local projects with normalized paths', () => {
        const item = { path: 'C:\\Users\\Kaan\\github-repos\\Market_Kasa' };
        assert.strictEqual(toCanonicalId(item), 'c:/users/kaan/github-repos/market_kasa');
    });

    it('normalizes bare string paths', () => {
        assert.strictEqual(toCanonicalId('C:\\Users\\Kaan\\Project\\'), 'c:/users/kaan/project');
    });
});
