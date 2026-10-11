'use strict';
const assert = require('assert');
const { validateExternalUrl, parseRepoInput, normalizeKey } = require('../../src/util/security');

describe('Security Utility Tests', () => {
    describe('normalizeKey', () => {
        it('normalizes backslashes to forward slashes', () => {
            assert.strictEqual(normalizeKey('C:\\Users\\Kaan\\Project'), 'c:/users/kaan/project');
        });

        it('trims leading/trailing whitespace and slashes', () => {
            assert.strictEqual(normalizeKey('  /path/to/repo/  '), 'path/to/repo');
        });

        it('returns empty string for null or undefined', () => {
            assert.strictEqual(normalizeKey(null), '');
            assert.strictEqual(normalizeKey(undefined), '');
        });
    });

    describe('validateExternalUrl', () => {
        it('allows valid http and https URLs', () => {
            assert.strictEqual(validateExternalUrl('https://github.com/HasanKaan28'), 'https://github.com/HasanKaan28');
            assert.strictEqual(validateExternalUrl('http://localhost:9749'), 'http://localhost:9749/');
        });

        it('rejects dangerous protocols (javascript:, file:, data:)', () => {
            assert.strictEqual(validateExternalUrl('javascript:alert(1)'), null);
            assert.strictEqual(validateExternalUrl('file:///C:/Windows/System32'), null);
            assert.strictEqual(validateExternalUrl('data:text/html,<script>alert(1)</script>'), null);
        });

        it('rejects malformed URLs', () => {
            assert.strictEqual(validateExternalUrl('not-a-valid-url'), null);
            assert.strictEqual(validateExternalUrl(''), null);
            assert.strictEqual(validateExternalUrl(null), null);
        });
    });

    describe('parseRepoInput', () => {
        it('parses owner/repo strings', () => {
            const parsed = parseRepoInput('microsoft/vscode');
            assert.deepStrictEqual(parsed, {
                owner: 'microsoft',
                repo: 'vscode',
                fullName: 'microsoft/vscode',
                url: 'https://github.com/microsoft/vscode'
            });
        });

        it('applies default owner for bare repo names', () => {
            const parsed = parseRepoInput('Market_Kasa', 'HasanKaan28');
            assert.deepStrictEqual(parsed, {
                owner: 'HasanKaan28',
                repo: 'Market_Kasa',
                fullName: 'HasanKaan28/Market_Kasa',
                url: 'https://github.com/HasanKaan28/Market_Kasa'
            });
        });

        it('handles full GitHub URLs with .git suffix', () => {
            const parsed = parseRepoInput('https://github.com/HasanKaan28/antigravity-brain-sync.git');
            assert.deepStrictEqual(parsed, {
                owner: 'HasanKaan28',
                repo: 'antigravity-brain-sync',
                fullName: 'HasanKaan28/antigravity-brain-sync',
                url: 'https://github.com/HasanKaan28/antigravity-brain-sync'
            });
        });

        it('rejects invalid repo names with special characters or path traversal', () => {
            assert.strictEqual(parseRepoInput('../../../etc/passwd'), null);
            assert.strictEqual(parseRepoInput('repo; rm -rf /'), null);
            assert.strictEqual(parseRepoInput('owner/repo/extra/sub'), null);
        });
    });
});
