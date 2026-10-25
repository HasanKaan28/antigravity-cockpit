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
    ideLanguage: "tr",
    configuredLanguage: "auto",
    sessions: [
        {
            id: "session-sample-uuid-001",
            time: "10:30",
            timeAgo: "Az Önce",
            timestamp: Date.now(),
            prompt: "Örnek oturum: Proje mimarisi ve bileşen oluşturma",
            activeDoc: "src/index.js",
            toolCount: 8,
            transcriptPath: null,
            path: "/workspaces/sample-project",
            status: "Tamamlandı"
        }
    ],
    projects: [
        {
            name: "sample-project",
            path: "/workspaces/sample-project",
            rawPath: "/workspaces/sample-project",
            isGit: true,
            branch: "main",
            gitLog: [
                { hash: "a1b2c3d", msg: "feat: initial project structure", ago: "1 saat önce" }
            ],
            hasUncommitted: false,
            sessionNotes: "Antigravity Cockpit Çalışma Alanı",
            hasGraphify: false,
            graphifyPath: null,
            isFavorite: false,
            isArchived: false
        }
    ],
    githubRepos: [],
    githubUser: null,
    githubConnected: false,
    favCount: 0,
    archCount: 0,
    ghCount: 0,
    openOnStartup: true,
    panel: {
        status: "ok",
        groups: [
            {
                id: "gemini",
                label: "Gemini",
                remaining: 90,
                resetTime: "4h 00m",
                themeColor: "#40C4FF",
                hasData: true,
                weekly: { remaining: 80, resetTime: "4d 12h" }
            },
            {
                id: "non-google",
                label: "Claude",
                remaining: 95,
                resetTime: "4h 15m",
                themeColor: "#FFAB40",
                hasData: true,
                weekly: { remaining: 85, resetTime: "5d 20h" }
            }
        ],
        user: {
            email: "developer@example.com",
            tier: "Antigravity Pro"
        },
        tokenUsage: {
            promptCredits: { available: 500, monthly: 50000, remainingPercentage: 1 },
            flowCredits: { available: 100, monthly: 150000, remainingPercentage: 0.1 }
        }
    },
    system: {
        gpu: "Sistem GPU (Aktif)",
        localModel: "Yerel Model Bulunamadı",
        hasLocalEngine: false,
        localAi: {
            hasLocalEngine: false,
            primaryEngine: null,
            detectedEngines: []
        },
        ollamaOnline: false,
        ollamaInstalled: false,
        remoteVault: "Yapılandırılmadı",
        graphifyStatus: "Hazır (Observatory)"
    }
};

(async () => {
    // Clean non-PII generic sample skills for preview and standalone HTML
    mockData.skills = {
        totalCount: 3,
        categories: {
            architecture: 1,
            design: 1,
            quality: 1,
            optimization: 0,
            'local-ai': 0
        },
        skills: [
            {
                id: 'code-review',
                displayName: 'Code Review Excellence',
                category: 'quality',
                description: 'Systematic code analysis, clean architecture patterns, and collaborative feedback.',
                promptHint: '@skill:code-review',
                skillPath: null
            },
            {
                id: 'api-design',
                displayName: 'API Design Principles',
                category: 'architecture',
                description: 'Master REST and GraphQL API design principles for scalable and maintainable systems.',
                promptHint: '@skill:api-design-principles',
                skillPath: null
            },
            {
                id: 'frontend-design',
                displayName: 'Frontend Design Guidelines',
                category: 'design',
                description: 'Distinctive frontend implementations, design tokens, and accessibility standards.',
                promptHint: '@skill:frontend-design',
                skillPath: null
            }
        ]
    };

    // Optional: --data <file.json> renders the preview with a real data snapshot instead of the mock.
    const dataArg = process.argv.indexOf('--data');
    const previewData = dataArg > -1 && process.argv[dataArg + 1]
        ? JSON.parse(fs.readFileSync(path.resolve(process.argv[dataArg + 1]), 'utf8'))
        : mockData;

    let template = fs.readFileSync(templatePath, 'utf8');
    // preview.html lives in the project root, so font URLs must point into media/.
    const cssContent = fs.readFileSync(cssPath, 'utf8').replace(/url\('fonts\//g, "url('media/fonts/");
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // Inline assets for standalone file preview (replacer functions keep "$" sequences literal)
    template = template
        .replace('<link rel="stylesheet" href="{{CSS_URI}}">', () => `<style>${cssContent}</style>`)
        .replace('<script nonce="{{NONCE}}" src="{{JS_URI}}"></script>', () => `<script>${jsContent}</script>`)
        .replace('content="{{CSP}}"', 'content="default-src \'self\' \'unsafe-inline\' data: blob:;"')
        .replaceAll('{{NONCE}}', 'preview-nonce')
        .replace('{{INITIAL_DATA}}', () => JSON.stringify(previewData).replace(/</g, '\\u003c'));

    fs.writeFileSync(previewPath, template, 'utf8');
    console.log('Preview generated successfully at:', previewPath);

    if (process.argv.includes('--open')) {
        launchInBrowser(previewPath);
    }
})();
