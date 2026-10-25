'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sessionsPath = require.resolve('../../src/collectors/sessions');

// Builds a brain folder in a temp home, so the user's real sessions are never read.
function writeSession(brainDir, id, lines, mtimeMs) {
    const logs = path.join(brainDir, id, '.system_generated', 'logs');
    fs.mkdirSync(logs, { recursive: true });
    if (lines) fs.writeFileSync(path.join(logs, 'transcript.jsonl'), lines.map(l => JSON.stringify(l)).join('\n'));
    const when = new Date(mtimeMs);
    fs.utimesSync(path.join(brainDir, id), when, when);
}

describe('Sessions collector', () => {
    let home;
    let savedEnv;
    let sessions;

    before(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-sessions-'));
        savedEnv = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
        process.env.HOME = home;
        process.env.USERPROFILE = home;
        const brain = path.join(home, '.gemini', 'antigravity-ide', 'brain');
        const now = Date.now();
        writeSession(brain, 'newest', [
            { step_index: 1, source: 'USER_EXPLICIT', type: 'USER_INPUT', content: 'Active Document: C:\\src\\app.js (OPEN)\n<USER_REQUEST>\nAdd a retry to the client\n</USER_REQUEST>' },
            { step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', content: 'Done.', tool_calls: [{ name: 'edit' }, { name: 'run' }] },
            'not json'
        ], now - 1000);
        writeSession(brain, 'silent', [
            { step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', content: 'No user turn here.' }
        ], now - 60000);
        writeSession(brain, 'no-transcript', null, now - 120000);
        fs.mkdirSync(path.join(brain, 'tempmediaStorage'));
        delete require.cache[sessionsPath];
        sessions = require(sessionsPath);
    });

    after(() => {
        delete require.cache[sessionsPath];
        process.env.HOME = savedEnv.HOME;
        process.env.USERPROFILE = savedEnv.USERPROFILE;
        fs.rmSync(home, { recursive: true, force: true });
    });

    it('lists sessions newest first and skips the media folder', async () => {
        const list = await sessions.getBrainSessions(25);
        assert.deepStrictEqual(list.map(s => s.id), ['newest', 'silent', 'no-transcript']);
    });

    it('reads the user request, active document and tool-call count from the transcript', async () => {
        const [newest] = await sessions.getBrainSessions(25);
        assert.strictEqual(newest.prompt, 'Add a retry to the client');
        assert.strictEqual(newest.activeDoc, 'C:/src/app.js');
        assert.strictEqual(newest.toolCount, 2);
        assert.ok(newest.transcriptPath.endsWith('/.system_generated/logs/transcript.jsonl'));
        assert.ok(newest.timestamp > 0);
    });

    it('leaves the prompt empty when no user turn or no transcript exists', async () => {
        const list = await sessions.getBrainSessions(25);
        assert.strictEqual(list.find(s => s.id === 'silent').prompt, '');
        assert.strictEqual(list.find(s => s.id === 'no-transcript').prompt, '');
    });

    it('honours the limit', async () => {
        assert.strictEqual((await sessions.getBrainSessions(2)).length, 2);
    });
});
