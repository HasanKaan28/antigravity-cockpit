'use strict';
/**
 * Collector: Antigravity IDE Brain sessions.
 * Streams JSONL transcript files up to the first USER_INPUT using readline.
 * In-memory mtime cache prevents reading unmodified sessions repeatedly.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const logger = require('../logger');

const sessionCache = new Map();

async function parseTranscript(transcriptPath) {
    return new Promise((resolve) => {
        let userPrompt = '';
        let activeDoc = '';
        let toolCount = 0;

        const input = fs.createReadStream(transcriptPath, { encoding: 'utf8' });
        const rl = readline.createInterface({ input, crlfDelay: Infinity });

        rl.on('line', (line) => {
            if (!line) return;
            try {
                const step = JSON.parse(line);
                if (step.type === 'USER_INPUT' && !userPrompt) {
                    const match = step.content?.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
                    if (match) {
                        userPrompt = match[1].trim();
                    } else if (step.content) {
                        userPrompt = step.content.slice(0, 180).trim();
                    }
                    const docMatch = step.content?.match(/Active Document:\s*([^\r\n]+)/);
                    if (docMatch) {
                        let rawDoc = docMatch[1].trim();
                        rawDoc = rawDoc.replace(/\s*\([A-Z_]+\)$/, '').trim();
                        activeDoc = rawDoc.split('\\').join('/');
                    }
                }
                if (Array.isArray(step.tool_calls)) {
                    toolCount += step.tool_calls.length;
                }
            } catch {
                // skip broken json line
            }
        });

        rl.on('close', () => {
            resolve({
                prompt: userPrompt,
                activeDoc,
                toolCount
            });
        });

        rl.on('error', () => {
            resolve({
                prompt: '',
                activeDoc: '',
                toolCount: 0
            });
        });
    });
}

async function getBrainSessions(limit = 25) {
    const brainDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
    try {
        if (!fs.existsSync(brainDir)) return [];
        const dirents = await fs.promises.readdir(brainDir, { withFileTypes: true });
        const entries = [];

        for (const d of dirents) {
            if (!d.isDirectory() || d.name === 'tempmediaStorage') continue;
            const fullP = path.join(brainDir, d.name);
            try {
                const stat = await fs.promises.stat(fullP);
                entries.push({ id: d.name, path: fullP.split('\\').join('/'), mtime: stat.mtime });
            } catch {
                // skip
            }
        }

        entries.sort((a, b) => b.mtime - a.mtime);
        const topEntries = entries.slice(0, limit);
        const sessions = [];

        for (const entry of topEntries) {
            const transcriptPath = path.join(entry.path, '.system_generated', 'logs', 'transcript.jsonl');
            let mtimeMs = entry.mtime.getTime();

            // Check transcript file mtime specifically if exists
            let hasTranscript = false;
            try {
                if (fs.existsSync(transcriptPath)) {
                    hasTranscript = true;
                    const tStat = fs.statSync(transcriptPath);
                    mtimeMs = tStat.mtimeMs;
                }
            } catch {
                hasTranscript = false;
            }

            // Cached item check
            const cached = sessionCache.get(entry.id);
            if (cached && cached.mtimeMs === mtimeMs) {
                sessions.push(cached.data);
                continue;
            }

            // An empty prompt lets the dashboard show "untitled" in its own language.
            let parsed = { prompt: '', activeDoc: '', toolCount: 0 };
            if (hasTranscript) {
                parsed = await parseTranscript(transcriptPath);
            }

            // The dashboard formats the time from "timestamp" in the UI language.
            const sessionData = {
                id: entry.id,
                timestamp: entry.mtime.getTime(),
                prompt: parsed.prompt,
                activeDoc: parsed.activeDoc,
                toolCount: parsed.toolCount,
                transcriptPath: transcriptPath.split('\\').join('/'),
                path: entry.path
            };

            sessionCache.set(entry.id, { mtimeMs, data: sessionData });
            sessions.push(sessionData);
        }

        return sessions;
    } catch (err) {
        logger.error('Failed to get brain sessions:', err);
        return [];
    }
}

module.exports = {
    getBrainSessions
};
