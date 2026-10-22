'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
    parseTranscriptDialogue,
    generateCleanMarkdownText,
    generateCleanTranscriptHtml,
    renderMarkdownSimple
} = require('../../src/transcriptViewer');

describe('Transcript Viewer Tests', () => {
    let tmpDir;
    let sampleTranscriptPath;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-test-transcript-'));
        sampleTranscriptPath = path.join(tmpDir, 'transcript.jsonl');

        const lines = [
            JSON.stringify({
                step_index: 1,
                source: 'USER_EXPLICIT',
                type: 'USER_INPUT',
                timestamp: '2026-10-05T14:00:00Z',
                content: '<USER_REQUEST>\nMerhaba, bana bir test fonksiyonu yazar misin?\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nsome metadata\n</ADDITIONAL_METADATA>'
            }),
            JSON.stringify({
                step_index: 2,
                source: 'MODEL',
                type: 'PLANNER_RESPONSE',
                timestamp: '2026-10-05T14:00:05Z',
                tool_calls: [{ name: 'run_command' }]
                // intermediate step without content (only tool call)
            }),
            JSON.stringify({
                step_index: 3,
                source: 'MODEL',
                type: 'PLANNER_RESPONSE',
                timestamp: '2026-10-05T14:00:10Z',
                content: 'Tabii ki! Iste ornek kod:\n```js\nfunction test() { return 42; }\n```\nUmarim yardimci olur!'
            }),
            JSON.stringify({
                step_index: 4,
                source: 'USER_EXPLICIT',
                type: 'USER_INPUT',
                timestamp: '2026-10-05T14:02:00Z',
                content: '<USER_REQUEST>\nHarika, tesekkurler!\n</USER_REQUEST>'
            })
        ];

        fs.writeFileSync(sampleTranscriptPath, lines.join('\n'), 'utf8');
    });

    after(() => {
        try {
            if (fs.existsSync(sampleTranscriptPath)) fs.unlinkSync(sampleTranscriptPath);
            if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
        } catch (_err) {
            // Ignore cleanup errors
        }
    });

    it('correctly parses user and assistant dialogue stripping noise', () => {
        const dialogue = parseTranscriptDialogue(sampleTranscriptPath);
        assert.strictEqual(dialogue.length, 3, 'Should extract exactly 3 conversational turns');

        // Turn 1: User
        assert.strictEqual(dialogue[0].role, 'user');
        assert.strictEqual(dialogue[0].text, 'Merhaba, bana bir test fonksiyonu yazar misin?');
        assert.strictEqual(dialogue[0].stepIndex, 1);

        // Turn 2: Assistant (intermediate tool step skipped, only content kept)
        assert.strictEqual(dialogue[1].role, 'assistant');
        assert.ok(dialogue[1].text.includes('function test() { return 42; }'));
        assert.strictEqual(dialogue[1].stepIndex, 3);

        // Turn 3: User
        assert.strictEqual(dialogue[2].role, 'user');
        assert.strictEqual(dialogue[2].text, 'Harika, tesekkurler!');
    });

    it('generates clean Markdown text representation', () => {
        const dialogue = parseTranscriptDialogue(sampleTranscriptPath);
        const md = generateCleanMarkdownText(dialogue, 'Test Session Title');

        assert.ok(md.includes('# 💬 Sohbet: Test Session Title'));
        assert.ok(md.includes('### 👤 Sen (Kullanıcı)'));
        assert.ok(md.includes('### ⚡ Antigravity'));
        assert.ok(md.includes('function test()'));
    });

    it('renders simple markdown to safe HTML', () => {
        const raw = '### Baslik\nBurasi **kalin** ve `kod` icerir.\n```js\nconst x = 10;\n```';
        const html = renderMarkdownSimple(raw);

        assert.ok(html.includes('<h3 class="t-h3">Baslik</h3>'));
        assert.ok(html.includes('<strong>kalin</strong>'));
        assert.ok(html.includes('<code class="inline-code">kod</code>'));
        assert.ok(html.includes('<span class="code-lang">js</span>'));
    });

    it('renders quotes, level-4 headings and code blocks without stray line breaks', () => {
        const html = renderMarkdownSimple('> Prompt: describe it\n#### Answer\n```text\nline one\n\nline two\n```\nafter');
        assert.ok(html.includes('<blockquote class="t-quote">Prompt: describe it</blockquote>'));
        assert.ok(html.includes('<h4 class="t-h4">Answer</h4>'));
        const pre = html.slice(html.indexOf('<pre>'), html.indexOf('</pre>'));
        assert.ok(pre.includes('line one\n\nline two'), 'code keeps its own newlines');
        assert.ok(!pre.includes('<br>'), 'no <br> inside code blocks');
        assert.ok(!/onclick=/.test(html), 'no inline handlers');
    });

    it('follows the dashboard theme and language and runs under a nonce CSP', () => {
        const dialogue = parseTranscriptDialogue(sampleTranscriptPath);
        const html = generateCleanTranscriptHtml(dialogue, 'Test Session', tmpDir, sampleTranscriptPath, {
            theme: 'nord-light', lang: 'en', nonce: 'abc123', cspSource: 'vscode-resource:',
            dashboardCssUri: 'res://dashboard.css', transcriptCssUri: 'res://transcript.css'
        });
        assert.ok(html.includes('data-theme="nord-light"'));
        assert.ok(html.includes('<html lang="en"'));
        assert.ok(html.includes("script-src 'nonce-abc123'"));
        assert.ok(html.includes('<script nonce="abc123">'));
        assert.ok(html.includes('href="res://dashboard.css"') && html.includes('href="res://transcript.css"'));
        assert.ok(html.includes('Search this conversation'));
        assert.ok(!/onclick=|oninput=/.test(html), 'no inline handlers');
    });

    it('rejects unexpected theme and language values', () => {
        const html = generateCleanTranscriptHtml([], 'X', tmpDir, sampleTranscriptPath, { theme: '"><script>', lang: 'xx' });
        assert.ok(html.includes('data-theme="antigravity"'));
        assert.ok(html.includes('<html lang="tr"'));
    });

    it('generates clean transcript HTML page with search and copy controls', () => {
        const dialogue = parseTranscriptDialogue(sampleTranscriptPath);
        const html = generateCleanTranscriptHtml(dialogue, 'Test Session', tmpDir, sampleTranscriptPath);

        assert.ok(html.includes('<!DOCTYPE html>'));
        assert.ok(html.includes('Test Session'));
        assert.ok(html.includes('id="searchInput"'));
        assert.ok(html.includes('copyFullDialogue'));
        assert.ok(html.includes('data-role="user"'));
        assert.ok(html.includes('data-role="assistant"'));
        assert.ok(html.includes('Merhaba, bana bir test fonksiyonu yazar misin?'));
    });
});
