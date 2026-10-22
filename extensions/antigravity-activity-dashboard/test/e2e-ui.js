/**
 * End-to-end UI audit for the Cockpit webview.
 *
 * Builds preview.html from test/fixtures/ui-data.json, stubs the VS Code webview API so every
 * button's postMessage can be asserted, then drives the page in headless Microsoft Edge:
 * navigation, filters, search, favorites, archive, GitHub, sessions, Graphify, skills, settings,
 * themes (with WCAG contrast checks for every palette), language, layout toggles, live updates
 * and narrow widths.
 *
 * Run: node test/e2e-ui.js
 */
'use strict';
/* global window, document, getComputedStyle -- used inside page.evaluate callbacks */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const fixture = path.join(__dirname, 'fixtures', 'ui-data.json');
const previewUrl = 'file:///' + path.join(root, 'preview.html').replace(/\\/g, '/');

const results = [];
async function step(name, fn) {
    try {
        await fn();
        results.push({ name, ok: true });
        console.log(`  ok    ${name}`);
    } catch (err) {
        results.push({ name, ok: false, err });
        console.log(`  FAIL  ${name}\n        ${String(err && err.message || err).split('\n')[0]}`);
    }
}

(async () => {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'dev-preview.js'), '--data', fixture], { stdio: 'ignore' });

    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.addInitScript(() => {
        window.__posted = [];
        window.acquireVsCodeApi = () => ({
            postMessage: (m) => window.__posted.push(m),
            getState: () => null,
            setState: () => {}
        });
    });

    const posted = async () => {
        const list = await page.evaluate(() => window.__posted.filter(m => !(m.command === 'refreshAgQuota' && m.isManual === false)));
        await page.evaluate(() => { window.__posted = []; });
        return list;
    };
    const lastPost = async (command) => (await posted()).filter(m => m.command === command).pop();
    const toast = () => page.textContent('#cockpitToast');
    const attr = (sel, name) => page.getAttribute(sel, name);
    const visible = (sel) => page.isVisible(sel);

    await page.goto(previewUrl);
    await page.waitForTimeout(300);
    await posted();

    console.log('Cockpit UI audit');

    await step('loads without script errors', async () => {
        assert.deepStrictEqual(pageErrors, []);
        assert.strictEqual((await page.textContent('#dashboardMainTitle')).trim(), 'Antigravity Cockpit');
    });

    await step('uses configured language (tr) and IDE language fallback', async () => {
        assert.strictEqual(await attr('html', 'lang'), 'tr');
        assert.strictEqual((await page.textContent('#tabBtnProjects .nav-label')).trim(), 'Projeler');
    });

    await step('rail counts match data', async () => {
        assert.strictEqual(await page.textContent('#badgeProjCount'), '3');
        assert.strictEqual(await page.textContent('#badgeGhCount'), '2');
        assert.strictEqual(await page.textContent('#badgeSessCount'), '2');
        assert.strictEqual(await page.textContent('#badgeSkillCount'), '3');
        assert.strictEqual(await page.textContent('#archCountBadge'), '1');
        assert.strictEqual(await page.textContent('#badgeGraphCount'), '1');
    });

    await step('quota instruments render meters, countdown and credits', async () => {
        assert.match(await page.textContent('#geminiPctVal'), /72\.5/);
        assert.match(await page.textContent('#claudePctVal'), /35\.0/);
        assert.ok(await page.$eval('#claudeFill', el => el.classList.contains('mid')), 'Claude at 35% shows the warning tone');
        assert.match(await page.textContent('#geminiTimerVal'), /\d+h \d{2}m \d{2}s/);
        assert.strictEqual(await page.textContent('#teleTokenPromptVal'), '500');
        assert.strictEqual(await attr('#geminiMeter', 'aria-valuenow'), '73');
    });

    await step('low prompt credits are flagged from raw counts', async () => {
        assert.ok(await page.$eval('#teleCredits', el => el.classList.contains('low')), '500 of 50.0K is under the threshold');
        assert.match(await attr('#teleCredits', 'title'), /%1\b/);
        assert.ok(await page.$eval('#modalPromptCredits', el => el.classList.contains('low')));
        assert.strictEqual(await page.$$eval('#agDetailsModal .meter-track', els => els.length), 0, 'credit bars are gone');
    });

    await step('Turkish glyphs load from the latin-ext font subsets', async () => {
        const faces = await page.evaluate(async () => {
            await document.fonts.load('16px Outfit', 'ş');
            await document.fonts.load('16px "JetBrains Mono"', 'ğ');
            return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.unicodeRange.split(',')[0].toUpperCase());
        });
        assert.ok(faces.includes('Outfit U+100-2BA'), faces.join(' | '));
        assert.ok(faces.includes('JetBrains Mono U+100-2BA'), faces.join(' | '));
    });

    await step('resume strip opens the latest commit and the latest session', async () => {
        assert.ok(await visible('#resumeStrip'));
        assert.match(await page.textContent('#resumeStrip .resume-item:first-child'), /orbit-api/);
        assert.doesNotMatch(await page.textContent('#resumeStrip'), /\bago\b/);
        await page.click('#resumeStrip [data-action="openFolder"]');
        assert.deepStrictEqual(await lastPost('openFolder'), { command: 'openFolder', path: '/workspaces/orbit-api', newWindow: false });
        await page.click('#resumeStrip [data-action="openTranscript"]');
        assert.strictEqual((await lastPost('openTranscript')).path, '/workspaces/.brain/session-001/transcript.jsonl');
    });

    await step('commit ages follow the UI language', async () => {
        const ages = await page.$$eval('#projectsGrid .ago', els => els.map(el => el.textContent));
        assert.ok(ages.length >= 2, ages.join(' | '));
        ages.filter(a => /\d/.test(a)).forEach(a => assert.match(a, /önce$/, a));
    });

    await step('favorites render as cards, others as aligned rows', async () => {
        assert.strictEqual(await page.$$eval('#projectsGrid .card', els => els.length), 1);
        assert.strictEqual(await page.$$eval('#projectsGrid .row', els => els.length), 2);
    });

    await step('project actions post openFolder / new window / graph', async () => {
        await page.click('#projectsGrid .card [data-action="openFolder"]');
        assert.deepStrictEqual(await lastPost('openFolder'), { command: 'openFolder', path: '/workspaces/orbit-api', newWindow: false });
        await page.click('#projectsGrid .card [data-action="openFolderNewWin"]');
        assert.strictEqual((await lastPost('openFolder')).newWindow, true);
        await page.click('#projectsGrid .card [data-action="openGraphify"]');
        assert.strictEqual((await lastPost('openGraphify')).path, '/workspaces/orbit-api/graphify-out/graph.html');
    });

    await step('sub-filters (git, graphify, favorites, all)', async () => {
        await page.click('#chipGit');
        assert.strictEqual(await page.$$eval('#projectsGrid .row, #projectsGrid .card', els => els.length), 2);
        await page.click('#chipGraph');
        assert.strictEqual(await page.$$eval('#projectsGrid .row, #projectsGrid .card', els => els.length), 1);
        await page.click('#chipFav');
        assert.strictEqual(await page.$$eval('#projectsGrid .card', els => els.length), 1);
        await page.click('#chipAll');
        assert.ok(await page.$eval('#chipAll', el => el.classList.contains('active')));
    });

    await step('search filters by name and commit; Escape clears', async () => {
        await page.keyboard.press('Control+k');
        assert.ok(await page.evaluate(() => document.activeElement.id === 'projectSearchInput'));
        await page.keyboard.type('hydrate');
        assert.strictEqual(await page.$$eval('#projectsGrid .row', els => els.length), 1);
        assert.match(await page.textContent('#projectsGrid .row'), /lumen-web/);
        await page.keyboard.press('Escape');
        assert.strictEqual(await page.inputValue('#projectSearchInput'), '');
        assert.strictEqual(await page.$$eval('#projectsGrid .row', els => els.length), 2);
    });

    await step('favorite toggle posts toggleFavorite and promotes the row', async () => {
        await page.click('#projectsGrid .row [data-action="toggleFav"][data-id="/workspaces/lumen-web"]');
        assert.deepStrictEqual(await lastPost('toggleFavorite'), { command: 'toggleFavorite', id: '/workspaces/lumen-web' });
        assert.strictEqual(await page.$$eval('#projectsGrid .card', els => els.length), 2);
        assert.strictEqual(await page.textContent('#favChipCount'), '2');
        await page.click('#projectsGrid .card [data-action="toggleFav"][data-id="/workspaces/lumen-web"]');
        assert.strictEqual(await page.$$eval('#projectsGrid .card', els => els.length), 1);
    });

    await step('archive moves a project to the archive and restore brings it back', async () => {
        await page.click('#projectsGrid [data-action="toggleArch"][data-id="/workspaces/scratch-notes"]');
        assert.strictEqual((await lastPost('toggleArchive')).id, '/workspaces/scratch-notes');
        assert.strictEqual(await page.textContent('#archCountBadge'), '2');
        await page.click('#tabBtnArchive');
        assert.ok(await visible('#viewArchive'));
        assert.strictEqual(await page.$$eval('#archiveGrid .row', els => els.length), 2);
        await page.click('#archiveGrid [data-action="toggleArch"][data-id="/workspaces/scratch-notes"]');
        assert.strictEqual(await page.textContent('#archCountBadge'), '1');
        await posted();
    });

    await step('GitHub view: open, clone, web link, add repository', async () => {
        await page.click('#tabBtnGithub');
        assert.match(await page.textContent('#ghHeroTitle'), /sample-org/);
        await page.click('#githubGrid [data-action="cloneRepo"]');
        assert.deepStrictEqual(await lastPost('cloneGithubRepo'), { command: 'cloneGithubRepo', name: 'sample-org/design-tokens' });
        await page.click('#githubGrid [data-action="openUrl"]');
        assert.strictEqual((await lastPost('openExternalUrl')).url, 'https://github.com/sample-org/orbit-api');
        await page.fill('#customGhInput', 'sample-org/new-repo');
        await page.press('#customGhInput', 'Enter');
        assert.deepStrictEqual(await lastPost('addCustomGithubRepo'), { command: 'addCustomGithubRepo', text: 'sample-org/new-repo' });
        assert.strictEqual(await page.inputValue('#customGhInput'), '');
    });

    await step('GitHub repos are favorited and archived by URL, the id the extension stores', async () => {
        const url = 'https://github.com/sample-org/design-tokens';
        await page.click(`#githubGrid [data-action="toggleFav"][data-id="${url}"]`);
        assert.deepStrictEqual(await lastPost('toggleFavorite'), { command: 'toggleFavorite', id: url });
        await page.click(`#githubGrid [data-action="toggleFav"][data-id="${url}"]`);
        await page.click(`#githubGrid [data-action="toggleArch"][data-id="${url}"]`);
        assert.deepStrictEqual(await lastPost('toggleArchive'), { command: 'toggleArchive', id: url });
        await page.click('#tabBtnArchive');
        await page.click(`#archiveGrid [data-action="toggleArch"][data-id="${url}"]`);
        assert.deepStrictEqual(await lastPost('toggleArchive'), { command: 'toggleArchive', id: url });
        await page.click('#tabBtnGithub');
    });

    await step('sessions view: transcript and folder', async () => {
        await page.click('#tabBtnSessions');
        assert.strictEqual(await page.$$eval('#sessionsList .row', els => els.length), 2);
        await page.click('#sessionsList [data-action="openTranscript"]');
        assert.strictEqual((await lastPost('openTranscript')).path, '/workspaces/.brain/session-001/transcript.jsonl');
        await page.click('#sessionsList [data-action="openSessionFolder"]');
        assert.strictEqual((await lastPost('openSessionFolder')).path, '/workspaces/.brain/session-001');
    });

    await step('sessions are grouped under day labels', async () => {
        const days = await page.evaluate(() => new Set(window.__INITIAL_DATA__.sessions.map(s => new Date(s.timestamp).toDateString())).size);
        const labels = await page.$$eval('#sessionsList .group-label', els => els.map(el => el.textContent.trim()));
        assert.strictEqual(labels.length, days, labels.join(' | '));
        labels.forEach(l => assert.match(l, /^[\d\p{Lu}]/u, l));
    });

    await step('keyboard: 1-6 switch sections, arrows walk items, Enter opens', async () => {
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        await page.keyboard.press('1');
        assert.ok(await visible('#viewProjects'));
        await page.keyboard.press('ArrowDown');
        assert.ok(await page.evaluate(() => document.activeElement.matches('#resumeStrip .resume-item')));
        await page.keyboard.press('Enter');
        assert.strictEqual((await lastPost('openFolder')).path, '/workspaces/orbit-api');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.strictEqual((await lastPost('openTranscript')).path, '/workspaces/.brain/session-001/transcript.jsonl');
        await page.keyboard.press('3');
        assert.ok(await visible('#viewSessions'));
        await page.keyboard.press('Control+k');
        await page.keyboard.type('2');
        assert.ok(await visible('#viewSessions'), 'digits typed into search do not switch sections');
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        await posted();
    });

    await step('Graphify view: observatory button and map tiles, search hidden', async () => {
        await page.click('#tabBtnRadar');
        assert.ok(await page.$eval('#searchWrap', el => el.classList.contains('is-hidden')));
        assert.strictEqual(await page.textContent('#radarMapCount'), '1');
        await page.click('#viewRadar [data-action="openGraphifyRoot"]');
        assert.strictEqual((await lastPost('openGraphify')).path, '/workspaces/orbit-api/graphify-out/graph.html');
        await page.click('#radarGraphList [data-action="openGraphify"]');
        assert.ok(await lastPost('openGraphify'));
    });

    await step('skills view: category chips, copy, rule file, start chat', async () => {
        await page.click('#tabBtnSkills');
        assert.strictEqual(await page.$$eval('#skillsCatChips .chip', els => els.length), 4);
        await page.click('#skillsCatChips [data-category="design"]');
        assert.strictEqual(await page.$$eval('#skillsGrid .skill-card', els => els.length), 1);
        await page.click('#skillsCatChips [data-category="all"]');
        await page.click('#skillsGrid .skill-card [data-action="copySkillPrompt"]');
        assert.strictEqual((await lastPost('copySkillPrompt')).prompt, '@skill:api-design-principles');
        assert.match(await toast(), /kopyalandı/);
        await page.click('#skillsGrid .skill-card [data-action="openSkillFile"]');
        assert.strictEqual((await lastPost('openSkillFile')).path, '/skills/api-design/SKILL.md');
        await page.click('#skillsGrid .skill-card [data-action="chatWithSkill"]');
        assert.strictEqual((await lastPost('chatWithSkill')).prompt, '@skill:api-design-principles');
        assert.match(await toast(), /Sohbet başlatılıyor/);
        assert.strictEqual(await page.$$eval('#skillsGrid [data-action="openSkillFile"]', els => els.length), 2, 'skills without a path get no rule-file button');
    });

    await step('top bar: new chat, refresh, quota refresh', async () => {
        await page.click('#hudBtnNewChat');
        assert.ok(await lastPost('openChat'));
        await page.click('#hudBtnRefresh');
        assert.ok(await lastPost('refresh'));
        await page.click('#agRefreshBtn');
        assert.deepStrictEqual(await lastPost('refreshAgQuota'), { command: 'refreshAgQuota', isManual: true });
    });

    await step('account dialog: open, inner click keeps it, backdrop and Escape close', async () => {
        await page.click('[data-action="toggleAgDetailsModal"]');
        assert.ok(await page.$eval('#agDetailsModal', el => el.classList.contains('open')));
        assert.strictEqual(await page.textContent('#modalUserEmail'), 'dev@example.com');
        await page.click('#agDetailsModal .dialog-body');
        assert.ok(await page.$eval('#agDetailsModal', el => el.classList.contains('open')));
        await page.click('#agDetailsModal [data-action="openAgSidebar"]');
        assert.ok(await lastPost('openAgSidebar'));
        await page.click('#agDetailsModal [data-action="openAgSettings"]');
        assert.ok(await lastPost('openAgSettings'));
        await page.mouse.click(10, 10);
        assert.ok(!(await page.$eval('#agDetailsModal', el => el.classList.contains('open'))));
        await page.click('[data-action="toggleAgDetailsModal"]');
        await page.keyboard.press('Escape');
        assert.ok(!(await page.$eval('#agDetailsModal', el => el.classList.contains('open'))));
    });

    await step('settings sheet: open, inner click, startup, sound, local engine', async () => {
        await page.click('#openSettingsBtn');
        assert.ok(await page.$eval('#settingsModal', el => el.classList.contains('open')));
        await page.click('#settingsModal .sheet-body');
        assert.ok(await page.$eval('#settingsModal', el => el.classList.contains('open')));
        assert.ok(await page.isChecked('#settingsStartupInput'));
        await page.click('#settingsStartupInput');
        assert.deepStrictEqual(await lastPost('toggleStartup'), { command: 'toggleStartup', value: false });
        await page.click('#settingsAudioInput');
        assert.match(await toast(), /sesleri/);
        assert.ok(await visible('#settingsExtraLocalAiSection'));
        assert.match(await page.textContent('#settingsLocalAiBtnText'), /durdur/i);
        await page.click('#settingsLocalAiBtn');
        assert.deepStrictEqual(await lastPost('toggleLocalAi'), { command: 'toggleLocalAi', engineId: 'ollama' });
    });

    await step('settings: layout toggles hide and restore panels and tabs', async () => {
        await page.click('#visToggleGpu');
        assert.ok(!(await visible('#teleCardGpu')));
        await page.click('#visToggleTabProjects');
        assert.ok(!(await visible('#tabBtnProjects')));
        await page.click('#visToggleGpu');
        await page.click('#visToggleTabProjects');
        assert.ok(await visible('#teleCardGpu'));
        assert.ok(await visible('#tabBtnProjects'));
        const stored = JSON.parse(await page.evaluate(() => localStorage.getItem('antigravity_widget_visibility')));
        assert.strictEqual(stored.gpu, true);
    });

    await step('settings: language switch re-renders and posts setLanguage', async () => {
        await page.click('#langCardEn');
        assert.deepStrictEqual(await lastPost('setLanguage'), { command: 'setLanguage', language: 'en' });
        assert.strictEqual((await page.textContent('#tabBtnProjects .nav-label')).trim(), 'Projects');
        assert.strictEqual(await attr('html', 'lang'), 'en');
        await page.click('#langCardTr');
        assert.strictEqual((await page.textContent('#tabBtnProjects .nav-label')).trim(), 'Projeler');
        await page.click('#closeSettingsBtn');
        assert.ok(!(await page.$eval('#settingsModal', el => el.classList.contains('open'))));
    });

    await step('theme dropdown: family, light mode, IDE-matched theme', async () => {
        await page.click('#themeDropdownBtn');
        assert.ok(await page.$eval('#themeDropdownContainer', el => el.classList.contains('open')));
        // The menu stays open while picking, so palettes can be compared side by side.
        await page.click('#themeItemTokyoNight');
        assert.strictEqual(await attr('html', 'data-theme'), 'tokyo-night');
        await page.click('#segModeLight');
        assert.strictEqual(await attr('html', 'data-theme'), 'tokyo-night-light');
        await page.click('#themeItemSystem');
        assert.strictEqual(await attr('html', 'data-theme'), 'system');
        assert.ok(await page.$eval('#segModeLight', el => el.disabled));
        await page.click('#themeItemAntigravity');
        await page.click('#segModeDark');
        assert.strictEqual(await attr('html', 'data-theme'), 'antigravity');
        assert.strictEqual(await page.evaluate(() => localStorage.getItem('antigravity_theme_family')), 'antigravity');
        await page.mouse.click(700, 600);
        assert.ok(!(await page.$eval('#themeDropdownContainer', el => el.classList.contains('open'))), 'outside click closes the menu');
    });

    await step('every palette meets WCAG contrast for text and accent buttons', async () => {
        const report = await page.evaluate(() => {
            const attrs = ['antigravity', 'light', 'dark', 'deepspace-light', 'midnight', 'midnight-light', 'nord-dark', 'nord-light',
                'tokyo-night', 'tokyo-night-light', 'catppuccin', 'catppuccin-light', 'solarized-dark', 'solarized-light',
                'synchronized', 'synchronized-light', 'cockpit-classic', 'cockpit-classic-light', 'hc-dark', 'hc-light'];
            const probe = document.createElement('div');
            document.body.appendChild(probe);
            const rgb = (v) => { probe.style.color = v; return getComputedStyle(probe).color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number); };
            const lum = ([r, g, b]) => [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
                .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
            const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
            const prev = document.documentElement.getAttribute('data-theme');
            const out = [];
            for (const a of attrs) {
                document.documentElement.setAttribute('data-theme', a);
                const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
                out.push({
                    theme: a,
                    text: ratio(v('--text'), v('--surface')),
                    text2: ratio(v('--text-2'), v('--surface')),
                    text3: ratio(v('--text-3'), v('--surface')),
                    button: ratio(v('--accent-ink'), v('--accent')),
                    accent: ratio(v('--accent'), v('--surface'))
                });
            }
            document.documentElement.setAttribute('data-theme', prev);
            probe.remove();
            return out;
        });
        const failures = report.filter(r => r.text < 7 || r.text2 < 4.5 || r.text3 < 3 || r.button < 4.5 || r.accent < 3);
        if (failures.length) {
            assert.fail(failures.map(f => `${f.theme} text=${f.text.toFixed(2)} text2=${f.text2.toFixed(2)} text3=${f.text3.toFixed(2)} button=${f.button.toFixed(2)} accent=${f.accent.toFixed(2)}`).join(' | '));
        }
    });

    await step('live messages: updateAgPanel and updateData re-render', async () => {
        await page.evaluate(() => window.postMessage({ command: 'updateAgPanel', panel: { status: 'ok', groups: [{ id: 'gemini', remaining: 12 }, { id: 'claude', remaining: 90 }], user: {} } }, '*'));
        await page.waitForTimeout(100);
        assert.match(await page.textContent('#geminiPctVal'), /12\.0/);
        assert.ok(await page.$eval('#geminiFill', el => el.classList.contains('low')));
        await page.evaluate(() => window.postMessage({ command: 'updateData', data: Object.assign({}, window.__INITIAL_DATA__, { sessions: [] }) }, '*'));
        await page.waitForTimeout(100);
        assert.strictEqual(await page.textContent('#badgeSessCount'), '0');
    });

    await step('narrow widths keep the page free of horizontal scroll', async () => {
        for (const width of [760, 480, 360]) {
            await page.setViewportSize({ width, height: 800 });
            await page.waitForTimeout(150);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            assert.ok(overflow <= 0, `${width}px overflows by ${overflow}px`);
        }
    });

    await step('no script errors during the whole run', async () => {
        assert.deepStrictEqual(pageErrors, []);
    });

    await browser.close();
    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exit(failed.length ? 1 : 0);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
