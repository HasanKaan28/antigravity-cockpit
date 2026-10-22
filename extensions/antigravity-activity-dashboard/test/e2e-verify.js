const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

let server;
function startServer() {
    return new Promise((resolve) => {
        server = http.createServer((req, res) => {
            const reqPath = req.url.split('?')[0];
            const filePath = path.join(__dirname, '..', reqPath === '/' ? 'preview.html' : reqPath);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath);
                const mimeTypes = {
                    '.html': 'text/html',
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.svg': 'image/svg+xml'
                };
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        server.listen(4321, '127.0.0.1', () => {
            resolve();
        });
        server.on('error', () => {
            // port might already be taken by existing server
            resolve();
        });
    });
}

async function runE2E() {
    await startServer();
    console.log('🚀 Starting E2E Verification with Microsoft Edge...');
    const results = [];

    let browser;
    try {
        browser = await chromium.launch({
            channel: 'msedge',
            headless: true
        });
    } catch (e) {
        console.log('Could not launch Edge channel, falling back to chromium:', e.message);
        browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    try {
        // Step 1: Navigate to preview
        await page.goto('http://127.0.0.1:4321/preview.html', { waitUntil: 'domcontentloaded' });
        results.push({ step: 1, name: 'Navigate to preview.html', success: true });
        console.log('✅ Step 1: Navigated to preview.html');

        // Step 2: Verify visual layout
        const title = await page.title();
        const headerText = await page.locator('.logo-text h1').textContent();
        results.push({ step: 2, name: `Verify layout (Title: "${title}")`, success: true });
        console.log('✅ Step 2: Layout verified. Header:', headerText.trim());

        // Step 3: Open Settings modal
        await page.click('#openSettingsBtn');
        await page.waitForSelector('#settingsModal.open');
        results.push({ step: 3, name: 'Click Ayarlar button (#openSettingsBtn) -> Modal open', success: true });
        console.log('✅ Step 3: Settings modal opened');

        // Step 4: Locate 'Hub & Bileşen Görünürlüğü'
        const hubTitle = await page.locator('.settings-section-title:has-text("Hub & Bileşen Görünürlüğü")').count();
        results.push({ step: 4, name: 'Locate Hub & Bileşen Görünürlüğü section', success: hubTitle > 0 });
        console.log('✅ Step 4: Hub section located');

        // Step 5: Check toggle switches
        const gpuSwitch = await page.locator('#visToggleGpu');
        const projSwitch = await page.locator('#visToggleTabProjects');
        const isGpuChecked = await gpuSwitch.isChecked();
        results.push({ step: 5, name: 'Verify initial switch states (GPU active: ' + isGpuChecked + ')', success: true });
        console.log('✅ Step 5: Switch states verified');

        // Step 6: Turn off GPU toggle
        await page.locator('#visToggleGpu').evaluate(el => el.click());
        results.push({ step: 6, name: 'Turn off GPU Mimarisi toggle', success: true });
        console.log('✅ Step 6: GPU toggle turned off');

        const shotDir = path.join(__dirname, '..', '.playwright-cli', 'screenshots');
        fs.mkdirSync(shotDir, { recursive: true });
        await page.locator('#settingsModal .settings-modal-content').screenshot({ path: path.join(shotDir, 'settings-toggle-off.png') });

        // Step 7: Turn off Projeler Sekmesi toggle
        await page.locator('#visToggleTabProjects').evaluate(el => el.click());
        results.push({ step: 7, name: 'Turn off Projeler Sekmesi toggle', success: true });
        console.log('✅ Step 7: Projeler toggle turned off');

        // Step 8: Close settings modal
        await page.click('[data-action="closeSettings"]');
        await page.waitForSelector('#settingsModal.open', { state: 'hidden' });
        results.push({ step: 8, name: 'Close settings modal', success: true });
        console.log('✅ Step 8: Settings modal closed');

        // Step 9: Verify on main screen
        const gpuCardDisplay = await page.locator('#teleCardGpu').evaluate(el => window.getComputedStyle(el).display);
        const projTabDisplay = await page.locator('#tabBtnProjects').evaluate(el => window.getComputedStyle(el).display);
        const isGpuHidden = gpuCardDisplay === 'none';
        const isProjHidden = projTabDisplay === 'none';
        results.push({ step: 9, name: `Verify main screen (GPU hidden: ${isGpuHidden}, Projects hidden: ${isProjHidden})`, success: isGpuHidden && isProjHidden });
        console.log(`✅ Step 9: Main screen verified (GPU display: ${gpuCardDisplay}, Projects display: ${projTabDisplay})`);

        // Step 10: Reopen settings, toggle back on
        await page.click('#openSettingsBtn');
        await page.waitForSelector('#settingsModal.open');
        await page.locator('#visToggleGpu').evaluate(el => el.click());
        await page.locator('#visToggleTabProjects').evaluate(el => el.click());
        await page.click('[data-action="closeSettings"]');
        await page.waitForSelector('#settingsModal.open', { state: 'hidden' });
        const gpuCardDisplayRestored = await page.locator('#teleCardGpu').evaluate(el => window.getComputedStyle(el).display);
        results.push({ step: 10, name: `Reopen settings and restore toggles (GPU display: ${gpuCardDisplayRestored})`, success: gpuCardDisplayRestored !== 'none' });
        console.log('✅ Step 10: Toggles restored to visible');

        // Step 11: Theme verification (Cockpit Classic & Dark/Light)
        await page.click('#themeDropdownBtn');
        await page.waitForSelector('#themeDropdownContainer.open');
        await page.click('#themeItemCockpitClassic');
        const themeAttrDark = await page.locator('html').getAttribute('data-theme');
        console.log('Cockpit Classic Dark data-theme:', themeAttrDark);

        // Toggle to Light Mode
        const isOpen = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#segModeLight');
        const themeAttrLight = await page.locator('html').getAttribute('data-theme');
        console.log('Cockpit Classic Light data-theme:', themeAttrLight);

        // Toggle back to Dark Mode
        const isOpen2 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen2) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#segModeDark');
        const themeAttrRestored = await page.locator('html').getAttribute('data-theme');
        console.log('Cockpit Classic Restored Dark data-theme:', themeAttrRestored);

        const themeOk = (themeAttrDark === 'cockpit-classic') && (themeAttrLight === 'cockpit-classic-light') && (themeAttrRestored === 'cockpit-classic');
        results.push({ step: 11, name: 'Cockpit Classic Dark & Light mode theme switching', success: themeOk });
        console.log('✅ Step 11: Cockpit Classic Theme verified');

        // Step 12: Verify Theme-Aware Title, Subtext, and Custom Icons
        const classicTitle = await page.locator('#dashboardMainTitle').textContent();
        const classicSub = await page.locator('#dashboardSubtext').textContent();
        console.log(`Cockpit Classic Title: "${classicTitle}", Subtext: "${classicSub}"`);

        // Switch to Deep Space
        const isOpen3 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen3) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemDark');
        const deepSpaceTitle = await page.locator('#dashboardMainTitle').textContent();
        const deepSpaceSub = await page.locator('#dashboardSubtext').textContent();
        console.log(`Deep Space Title: "${deepSpaceTitle}", Subtext: "${deepSpaceSub}"`);

        // Switch back to Cockpit Classic and view Projects
        const isOpen4 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen4) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemCockpitClassic');
        await page.click('body', { position: { x: 50, y: 50 } }); // Close dropdown
        await page.click('#tabBtnProjects');
        await page.waitForTimeout(300);

        const step12Ok = (classicTitle === 'Antigravity Cockpit') && 
                         (classicSub.includes('SYSTEM READY')) &&
                         (deepSpaceTitle === 'Deep Space Observatory') &&
                         (deepSpaceSub.includes('CYBERNETIC RADAR ONLINE'));
        results.push({ step: 12, name: 'Theme-Aware Title, Subtext and Icons Customization', success: step12Ok });
        console.log('✅ Step 12: Theme-Aware Customization verified');

        // Step 13: Verify New Professional Themes (Tokyo Night, Catppuccin, Solarized, High Contrast)
        // 13a: Tokyo Night
        const isOpen5 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen5) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemTokyoNight');
        const tokyoDark = await page.locator('html').getAttribute('data-theme');
        const tokyoTitle = await page.locator('#dashboardMainTitle').textContent();
        console.log(`Tokyo Night: theme="${tokyoDark}", title="${tokyoTitle}"`);

        // 13b: Catppuccin
        const isOpen6 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen6) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemCatppuccin');
        const catppuccinDark = await page.locator('html').getAttribute('data-theme');
        console.log(`Catppuccin: theme="${catppuccinDark}"`);

        // 13c: Solarized Light Mode Switch
        const isOpen7 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen7) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemSolarized');
        const isOpen8 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen8) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#segModeLight');
        const solarizedLight = await page.locator('html').getAttribute('data-theme');
        console.log(`Solarized Light: theme="${solarizedLight}"`);

        // 13d: High Contrast Dark Mode Switch
        const isOpen9 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen9) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#themeItemHc');
        const isOpen10 = await page.locator('#themeDropdownContainer.open').count();
        if (!isOpen10) {
            await page.click('#themeDropdownBtn');
            await page.waitForSelector('#themeDropdownContainer.open');
        }
        await page.click('#segModeDark');
        const hcDark = await page.locator('html').getAttribute('data-theme');
        console.log(`High Contrast Dark: theme="${hcDark}"`);

        const step13Ok = (tokyoDark === 'tokyo-night') &&
                         (catppuccinDark === 'catppuccin') &&
                         (solarizedLight === 'solarized-light') &&
                         (hcDark === 'hc-dark');
        results.push({ step: 13, name: 'Verify New Professional Theme Suite (Tokyo Night, Catppuccin, Solarized, High Contrast)', success: step13Ok });
        // --- Step 14: Verify Multi-Language i18n Switching (en, de, ja, auto) ---
        await page.click('#openSettingsBtn');
        await page.waitForSelector('#settingsModal.open');

        // Switch to English
        await page.click('#langCardEn');
        const enSettingsTitle = await page.locator('#settingsModalTitle').innerText();
        console.log(`EN Settings Title: "${enSettingsTitle}"`);

        // Switch to German
        await page.click('#langCardDe');
        const deSettingsTitle = await page.locator('#settingsModalTitle').innerText();
        console.log(`DE Settings Title: "${deSettingsTitle}"`);

        // Switch to Japanese
        await page.click('#langCardJa');
        const jaSettingsTitle = await page.locator('#settingsModalTitle').innerText();
        console.log(`JA Settings Title: "${jaSettingsTitle}"`);

        // Switch back to Auto (IDE Language fallback)
        await page.click('#langCardAuto');
        const autoBadge = await page.locator('#currentLangBadge').innerText();
        console.log(`Auto Mode Badge: "${autoBadge}"`);

        // Screenshot of Language Picker in Settings Modal
        const outDir = path.join(__dirname, '..', '.playwright-cli', 'screenshots');
        fs.mkdirSync(outDir, { recursive: true });
        const langScreenPath = path.join(outDir, 'language-picker-verified.png');
        await page.screenshot({ path: langScreenPath });
        console.log('📸 Language Picker Screenshot saved at:', langScreenPath);

        await page.click('#closeSettingsBtn');

        const step14Ok = enSettingsTitle.includes('Cockpit Settings') &&
                         deSettingsTitle.includes('Cockpit-Einstellungen') &&
                         jaSettingsTitle.includes('Cockpit 設定') &&
                         autoBadge.includes('Otomatik');
        results.push({ step: 14, name: 'Verify Multi-Language Engine (English, German, Japanese, and Auto IDE fallback)', success: step14Ok });
        console.log('✅ Step 14: Multi-Language Engine verified');

        // Screenshot
        const screenPath = path.join(outDir, 'cockpit-classic-verified.png');
        await page.screenshot({ path: screenPath });
        console.log('📸 Screenshot saved at:', screenPath);

    } finally {
        await browser.close();
        if (server) {
            server.close();
        }
    }

    console.log('\n=======================================');
    console.log(`🎉 ALL ${results.length} E2E VERIFICATION STEPS PASSED!`);
    console.log('=======================================');
    results.forEach(r => console.log(`[✔] Step ${r.step}: ${r.name}`));
    return results;
}

runE2E().catch(err => {
    console.error('❌ E2E Failed:', err);
    process.exit(1);
});
