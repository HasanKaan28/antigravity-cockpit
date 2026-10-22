#!/usr/bin/env node
/**
 * Captures README screenshots and an animated demo GIF of the Cockpit webview.
 *
 * Renders preview.html with the fictional data in test/fixtures/docs-data.json (no personal data),
 * stubs the VS Code webview API, drives headless Microsoft Edge, and converts the recorded video to
 * a GIF with the system ffmpeg (palette pass for clean colors).
 *
 * Usage: node scripts/capture-docs.js [--out <dir>] [--no-gif]
 * Default output: <repo root>/docs/images
 */
'use strict';
/* global window, document -- used inside page init scripts */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outArg = process.argv.indexOf('--out');
const outDir = outArg > -1 ? path.resolve(process.argv[outArg + 1]) : path.resolve(root, '..', '..', 'docs', 'images');
const withGif = !process.argv.includes('--no-gif');
const fixture = path.join(root, 'test', 'fixtures', 'docs-data.json');
const previewUrl = 'file:///' + path.join(root, 'preview.html').replace(/\\/g, '/');

// Webview API stub plus a clean, English, default-theme start for every capture.
function prepareScript({ cursor }) {
    window.acquireVsCodeApi = () => ({ postMessage: () => {}, getState: () => null, setState: () => {} });
    try {
        localStorage.clear();
        localStorage.setItem('antigravity_language', 'en');
        localStorage.setItem('antigravity_theme_family', 'antigravity');
        localStorage.setItem('antigravity_theme_mode', 'dark');
    } catch { /* storage unavailable */ }
    if (!cursor) return;
    // Playwright does not paint the mouse, so draw one for the demo recording.
    window.addEventListener('DOMContentLoaded', () => {
        const el = document.createElement('div');
        el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4 3.9 7.6-2.8 1.4-3.9-7.6L4 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
        el.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);transition:scale .12s ease;filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))';
        document.body.appendChild(el);
        window.addEventListener('mousemove', e => { el.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`; }, true);
        window.addEventListener('mousedown', () => { el.style.scale = '0.85'; }, true);
        window.addEventListener('mouseup', () => { el.style.scale = '1'; }, true);
    });
}

async function openPage(context) {
    const page = await context.newPage();
    await page.goto(previewUrl);
    await page.waitForTimeout(500);
    return page;
}

async function shot(page, name) {
    await page.waitForTimeout(450);
    const file = path.join(outDir, name);
    await page.screenshot({ path: file });
    console.log('  saved', path.relative(process.cwd(), file));
}

async function captureScreenshots(browser) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(prepareScript, { cursor: false });
    const page = await openPage(context);

    await shot(page, 'cockpit-projects.png');
    await page.click('#tabBtnGithub');
    await shot(page, 'cockpit-github.png');
    await page.click('#tabBtnSessions');
    await shot(page, 'cockpit-sessions.png');
    await page.click('#tabBtnSkills');
    await shot(page, 'cockpit-skills.png');
    await page.click('#tabBtnProjects');
    await page.click('#openSettingsBtn');
    await shot(page, 'cockpit-settings.png');
    await page.keyboard.press('Escape');

    await page.click('#themeDropdownBtn');
    await page.click('#segModeLight');
    await page.keyboard.press('Escape');
    await shot(page, 'cockpit-light.png');

    await page.click('#themeDropdownBtn');
    await page.click('#themeItemTokyoNight');
    await page.click('#segModeDark');
    await page.keyboard.press('Escape');
    await shot(page, 'cockpit-tokyo-night.png');

    await context.close();

    // Narrow side panel next to the agent chat.
    const narrow = await browser.newContext({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2 });
    await narrow.addInitScript(prepareScript, { cursor: false });
    const side = await openPage(narrow);
    await shot(side, 'cockpit-narrow.png');
    await narrow.close();
}

async function moveAndClick(page, selector, opts = {}) {
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const box = await target.boundingBox();
    if (!box) throw new Error('Not visible: ' + selector);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: opts.steps || 22 });
    await page.waitForTimeout(160);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(opts.after === undefined ? 700 : opts.after);
}

// Records frames through the DevTools screencast so only the system ffmpeg is needed.
async function startRecording(context, page) {
    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        frames.push({ data, t: metadata.timestamp });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    return async () => {
        await cdp.send('Page.stopScreencast');
        return frames;
    };
}

function framesToGif(frames, gif) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-demo-'));
    const lines = [];
    frames.forEach((f, i) => {
        const name = `f${String(i).padStart(5, '0')}.png`;
        fs.writeFileSync(path.join(dir, name), Buffer.from(f.data, 'base64'));
        const next = frames[i + 1] ? frames[i + 1].t : f.t + 1.2;
        lines.push(`file '${name}'`, `duration ${Math.max(0.01, next - f.t).toFixed(3)}`);
    });
    lines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.png'`);
    fs.writeFileSync(path.join(dir, 'frames.txt'), lines.join('\n'));
    const filter = 'fps=12,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt'), '-vf', filter, '-loop', '0', gif]);
    fs.rmSync(dir, { recursive: true, force: true });
}

async function captureGif(browser) {
    const size = { width: 1280, height: 800 };
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    await context.addInitScript(prepareScript, { cursor: true });
    const page = await openPage(context);
    await page.mouse.move(900, 420);
    const stopRecording = await startRecording(context, page);
    await page.waitForTimeout(1200);

    // Search narrows the list as you type.
    await moveAndClick(page, '#projectSearchInput', { after: 200 });
    await page.keyboard.type('rate', { delay: 120 });
    await page.waitForTimeout(1300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Pinning a project promotes it to the favorites cards.
    await moveAndClick(page, '[data-action="toggleFav"][data-id="/workspaces/ember-design-system"]', { after: 1300 });
    await moveAndClick(page, '.card [data-action="toggleFav"][data-id="/workspaces/ember-design-system"]', { after: 900 });

    // Sections.
    await moveAndClick(page, '#tabBtnGithub', { after: 1300 });
    await moveAndClick(page, '#tabBtnSessions', { after: 1300 });
    await moveAndClick(page, '#tabBtnSkills', { after: 900 });
    await moveAndClick(page, '#skillsCatChips [data-category="design"]', { after: 1100 });
    await moveAndClick(page, '#skillsCatChips [data-category="all"]', { after: 600 });

    // Themes.
    await moveAndClick(page, '#themeDropdownBtn', { after: 500 });
    await moveAndClick(page, '#themeItemTokyoNight', { after: 1000, steps: 14 });
    await moveAndClick(page, '#segModeLight', { after: 1100, steps: 14 });
    await moveAndClick(page, '#themeItemAntigravity', { after: 700, steps: 14 });
    await moveAndClick(page, '#segModeDark', { after: 500, steps: 14 });
    await page.keyboard.press('Escape');

    // Settings sheet.
    await moveAndClick(page, '#openSettingsBtn', { after: 1200 });
    await page.mouse.move(1120, 500, { steps: 18 });
    await page.mouse.wheel(0, 520);
    await page.waitForTimeout(1300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await moveAndClick(page, '#tabBtnProjects', { after: 1400 });

    const frames = await stopRecording();
    await context.close();

    const gif = path.join(outDir, 'cockpit-demo.gif');
    framesToGif(frames, gif);
    console.log('  saved', path.relative(process.cwd(), gif), `(${(fs.statSync(gif).size / 1048576).toFixed(1)} MB)`);
}

// Quota reset dates are anchored to "now" so the live countdowns read like "3h 12m 05s".
function writeTimedFixture() {
    const data = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    const toMs = (label) => {
        const h = /(\d+)h/.exec(label || '');
        const m = /(\d+)m/.exec(label || '');
        return ((h ? Number(h[1]) : 0) * 60 + (m ? Number(m[1]) : 0)) * 60000;
    };
    ((data.panel && data.panel.groups) || []).forEach(g => {
        if (g.resetTime) g.resetDate = Date.now() + toMs(g.resetTime) + 5000;
    });
    const file = path.join(os.tmpdir(), 'cockpit-docs-data.json');
    fs.writeFileSync(file, JSON.stringify(data));
    return file;
}

(async () => {
    fs.mkdirSync(outDir, { recursive: true });
    execFileSync(process.execPath, [path.join(root, 'scripts', 'dev-preview.js'), '--data', writeTimedFixture()], { stdio: 'ignore' });
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        console.log('Screenshots');
        await captureScreenshots(browser);
        if (withGif) {
            console.log('Demo GIF');
            await captureGif(browser);
        }
    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
