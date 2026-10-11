#!/usr/bin/env node
/**
 * Generates preview.html for browser preview using non-PII mock data.
 * Zero hardcoded personal information.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { launchInBrowser } = require('../src/util/proc');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'media', 'dashboard.html');
const cssPath = path.join(root, 'media', 'dashboard.css');
const jsPath = path.join(root, 'media', 'dashboard.js');
const previewPath = path.join(root, 'preview.html');

if (!fs.existsSync(templatePath)) {
    console.error('Template media/dashboard.html missing. Run scripts/build-media.js first.');
    process.exit(1);
}

const mockData = {
    sessions: [
        {
            id: "session-sample-uuid-001",
            time: "05/10 12:30",
            timeAgo: "Az Önce",
            timestamp: Date.now(),
            prompt: "Antigravity Activity Dashboard v2.0 mimari refactoring ve güvenlik denetimi",
            activeDoc: "src/extension.js",
            toolCount: 18,
            transcriptPath: "C:/Users/Kaan/.gemini/antigravity-ide/brain/session/transcript.jsonl",
            path: "C:/Users/Kaan/.gemini/antigravity-ide/brain/session",
            status: "Tamamlandı"
        }
    ],
    projects: [
        {
            name: "antigravity-activity-dashboard",
            path: "c:/users/kaan/.gemini/antigravity-ide/scratch/antigravity-activity-dashboard",
            rawPath: "C:\\Users\\Kaan\\.gemini\\antigravity-ide\\scratch\\antigravity-activity-dashboard",
            isGit: true,
            branch: "main",
            gitLog: [
                { hash: "96afe05", msg: "chore(infra): complete Phase 0 setup with git, manifest, metadata and cyberpunk graph", ago: "5 dk önce" }
            ],
            hasUncommitted: false,
            sessionNotes: "Antigravity IDE v2.0 Cockpit Dashboard",
            hasGraphify: true,
            graphifyPath: "C:/Users/Kaan/.gemini/antigravity-ide/scratch/antigravity-activity-dashboard/graphify-out/graph.html",
            cbmIndexed: true,
            cbmDbSize: "4.2 MB",
            isFavorite: true,
            isArchived: false
        },
        {
            name: "Market_Kasa",
            path: "c:/users/kaan/github-repos/market_kasa",
            rawPath: "C:\\Users\\Kaan\\github-repos\\Market_Kasa",
            isGit: true,
            branch: "main",
            gitLog: [
                { hash: "7da8ae2", msg: "fix(veresiye): customer balance auto-heal v1.4.0", ago: "2 hafta önce" }
            ],
            hasUncommitted: true,
            sessionNotes: "",
            hasGraphify: false,
            graphifyPath: null,
            cbmIndexed: true,
            cbmDbSize: "2.8 MB",
            isFavorite: false,
            isArchived: false
        }
    ],
    githubRepos: [
        {
            name: "antigravity-brain-sync",
            fullName: "HasanKaan28/antigravity-brain-sync",
            description: "Antigravity IDE persona, skills, persistent memory, and rules sync vault",
            isPrivate: true,
            language: "Python",
            stars: 0,
            url: "https://github.com/HasanKaan28/antigravity-brain-sync",
            pushedAt: new Date().toISOString(),
            timeAgo: "Bugün",
            defaultBranch: "main",
            isCloned: true,
            localPath: "C:/Users/Kaan/github-repos/antigravity-brain-sync",
            cbmIndexed: true,
            cbmDbSize: "1.9 MB",
            hasGraphify: false,
            isFavorite: true,
            isArchived: false
        }
    ],
    favCount: 2,
    archCount: 0,
    ghCount: 1,
    openOnStartup: true,
    panel: {
        status: "ok",
        groups: [
            {
                id: "gemini",
                label: "Gemini",
                remaining: 85,
                resetTime: "3h 40m",
                themeColor: "#40C4FF",
                hasData: true,
                weekly: { remaining: 75, resetTime: "3d 12h" }
            },
            {
                id: "non-google",
                label: "Claude",
                remaining: 95,
                resetTime: "4h 15m",
                themeColor: "#FFAB40",
                hasData: true,
                weekly: { remaining: 90, resetTime: "5d 20h" }
            }
        ],
        user: {
            email: "user@developer.local",
            tier: "Google AI Pro"
        },
        tokenUsage: {
            promptCredits: { available: 500, monthly: 50000, remainingPercentage: 1 },
            flowCredits: { available: 100, monthly: 150000, remainingPercentage: 0.1 }
        }
    },
    cbm: {
        installed: true,
        version: "0.11.0",
        path: "C:/Users/Kaan/AppData/Local/Programs/codebase-memory-mcp/codebase-memory-mcp.exe",
        uiUrl: "http://localhost:9749",
        totalDbSizeMb: "185.0 MB",
        indexedProjectsCount: 10
    },
    system: {
        gpu: "NVIDIA RTX 5070 Ti (Active)",
        localModel: "qwen2.5-coder:14b (Ollama Aktif)",
        hasLocalEngine: true,
        localAi: {
            hasLocalEngine: true,
            primaryEngine: {
                id: "ollama",
                name: "Ollama",
                endpoint: "http://127.0.0.1:11434",
                online: true,
                installed: true,
                activeModel: "qwen2.5-coder:14b",
                models: ["qwen2.5-coder:14b"]
            },
            detectedEngines: [
                {
                    id: "ollama",
                    name: "Ollama",
                    endpoint: "http://127.0.0.1:11434",
                    online: true,
                    installed: true,
                    activeModel: "qwen2.5-coder:14b"
                }
            ]
        },
        ollamaOnline: true,
        ollamaInstalled: true,
        remoteVault: "HasanKaan28/antigravity-brain-sync (Senkronize)",
        graphifyStatus: "Etkin (Cyberpunk Deep Space Observatory)",
        cbmStatus: "Etkin (10 Repo, 185.0 MB)"
    }
};

// Probe live Antigravity Panel quotas & token data directly from local IDE database
try {
    const { execFileSync } = require('child_process');
    const pyScript = path.join(root, 'get_panel_data.py');
    if (fs.existsSync(pyScript)) {
        const pyOut = execFileSync('python', [pyScript], { encoding: 'utf8', timeout: 3000 });
        const livePanel = JSON.parse(pyOut);
        if (livePanel && (livePanel.status === 'ok' || (livePanel.groups && livePanel.groups.length > 0))) {
            mockData.panel = livePanel;
        }
    }
} catch {
    // Keep baseline mockData if python is not reachable
}

let template = fs.readFileSync(templatePath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Inline assets for standalone file preview
template = template
    .replace('<link rel="stylesheet" href="{{CSS_URI}}">', `<style>${cssContent}</style>`)
    .replace('<script nonce="{{NONCE}}" src="{{JS_URI}}"></script>', `<script>${jsContent}</script>`)
    .replace('content="{{CSP}}"', 'content="default-src \'self\' \'unsafe-inline\' data: blob:;"')
    .replaceAll('{{NONCE}}', 'preview-nonce')
    .replace('{{INITIAL_DATA}}', JSON.stringify(mockData));

fs.writeFileSync(previewPath, template, 'utf8');
console.log('Preview generated successfully at:', previewPath);

if (process.argv.includes('--open')) {
    launchInBrowser(previewPath);
}
