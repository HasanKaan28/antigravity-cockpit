'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateExternalUrl, parseRepoInput, normalizeKey, isLocalHtmlFile, isTranscriptFile } = require('../../src/util/security');

describe('Security Utility Tests', () => {
    describe('normalizeKey', () => {
        it('normalizes backslashes to forward slashes', () => {
            assert.strictEqual(normalizeKey('C:\\Users\\Developer\\Project'), 'c:/users/developer/project');
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
            assert.strictEqual(validateExternalUrl('https://github.com/octocat'), 'https://github.com/octocat');
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
            const parsed = parseRepoInput('demo-repo', 'octocat');
            assert.deepStrictEqual(parsed, {
                owner: 'octocat',
                repo: 'demo-repo',
                fullName: 'octocat/demo-repo',
                url: 'https://github.com/octocat/demo-repo'
            });
        });

        it('handles full GitHub URLs with .git suffix', () => {
            const parsed = parseRepoInput('https://github.com/octocat/demo-repo.git');
            assert.deepStrictEqual(parsed, {
                owner: 'octocat',
                repo: 'demo-repo',
                fullName: 'octocat/demo-repo',
                url: 'https://github.com/octocat/demo-repo'
            });
        });

        it('rejects invalid repo names with special characters or path traversal', () => {
            assert.strictEqual(parseRepoInput('../../../etc/passwd'), null);
            assert.strictEqual(parseRepoInput('repo; rm -rf /'), null);
            assert.strictEqual(parseRepoInput('owner/repo/extra/sub'), null);
        });

        it('rejects segments that start with a dash or are dot folders', () => {
            assert.strictEqual(parseRepoInput('-owner/repo'), null);
            assert.strictEqual(parseRepoInput('owner/-repo'), null);
            assert.strictEqual(parseRepoInput('owner/..'), null);
            assert.strictEqual(parseRepoInput('.'), null);
        });

        it('still accepts repo names that start with a dot', () => {
            assert.strictEqual(parseRepoInput('octocat/.github').fullName, 'octocat/.github');
        });
    });

    describe('local file checks', () => {
        let dir;
        before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-security-')); });
        after(() => fs.rmSync(dir, { recursive: true, force: true }));

        it('isLocalHtmlFile accepts only absolute paths to existing .html/.htm files', () => {
            const html = path.join(dir, 'graph.html');
            const htm = path.join(dir, 'graph.HTM');
            const text = path.join(dir, 'graph.txt');
            [html, htm, text].forEach(f => fs.writeFileSync(f, 'x'));
            assert.strictEqual(isLocalHtmlFile(html), true);
            assert.strictEqual(isLocalHtmlFile(htm), true);
            assert.strictEqual(isLocalHtmlFile(text), false);
            assert.strictEqual(isLocalHtmlFile('graph.html'), false, 'relative paths are refused');
            assert.strictEqual(isLocalHtmlFile(path.join(dir, 'missing.html')), false);
            assert.strictEqual(isLocalHtmlFile(null), false);
        });

        it('isTranscriptFile accepts only existing files named transcript.jsonl', () => {
            const transcript = path.join(dir, 'transcript.jsonl');
            const other = path.join(dir, 'other.jsonl');
            [transcript, other].forEach(f => fs.writeFileSync(f, '{}'));
            assert.strictEqual(isTranscriptFile(transcript), true);
            assert.strictEqual(isTranscriptFile(other), false);
            assert.strictEqual(isTranscriptFile(dir), false);
            assert.strictEqual(isTranscriptFile('transcript.jsonl'), false);
        });
    });
});
