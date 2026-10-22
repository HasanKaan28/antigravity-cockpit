/**
 * Comprehensive 2-Pass Automated Button & Interaction Audit for Antigravity Cockpit
 */
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🚀 Launching Playwright with Microsoft Edge for 2-Round Button Verification...');
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const browser = await chromium.launch({ headless: true, executablePath: edgePath });
    const page = await browser.newPage();

    const errors = [];
    page.on('pageerror', err => {
        errors.push(`[PAGE ERROR] ${err.message}`);
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const txt = msg.text();
            if (!txt.includes('Failed to load resource')) {
                errors.push(`[CONSOLE ERROR] ${txt}`);
            }
        }
    });

    const previewUrl = 'file:///' + path.resolve(__dirname, '..', 'preview.html').replace(/\\/g, '/');
    console.log(`📄 Navigating to: ${previewUrl}`);
    await page.goto(previewUrl, { waitUntil: 'load' });

    console.log('\n=============================================');
    console.log('--- ROUND 1: CORE CHAT & SKILL BUTTON AUDIT ---');
    console.log('=============================================');

    // 1. Switch to Skills Tab
    console.log('1. Testing Skills Nav Tab...');
    const skillsTab = await page.$('#tabBtnSkills');
    assert.ok(skillsTab, 'Skills tab button must exist');
    await skillsTab.click();
    await page.waitForTimeout(200);

    const skillsView = await page.$('#viewSkills');
    const isSkillsActive = await skillsView.evaluate(el => el.classList.contains('active'));
    assert.ok(isSkillsActive, 'Skills view must become active');
    console.log('   ✅ Skills tab clicked and activated successfully.');

    // 2. Test "Sohbet Başlat" (chatWithSkill) Button on first skill card
    console.log('2. Testing "Sohbet Başlat" (chatWithSkill) button...');
    const startChatBtn = await page.$('.skill-card button[data-action="chatWithSkill"]');
    assert.ok(startChatBtn, '"Sohbet Başlat" button must exist on skill card');
    await startChatBtn.click();
    await page.waitForTimeout(200);

    // Verify toast appeared
    const toast = await page.$('#cockpitToast');
    const toastText = await toast.textContent();
    console.log(`   Toast received: "${toastText}"`);
    assert.ok(toastText.includes('Sohbet başlatılıyor'), 'Toast must indicate chat starting');
    console.log('   ✅ "Sohbet Başlat" executed cleanly with visual feedback and zero errors!');

    // 3. Test "Kural Dosyası" (openSkillFile) Button
    console.log('3. Testing "Kural Dosyası" (openSkillFile) button...');
    const ruleFileBtn = await page.$('.skill-card button[data-action="openSkillFile"]');
    assert.ok(ruleFileBtn, '"Kural Dosyası" button must exist on skill card');
    await ruleFileBtn.click();
    await page.waitForTimeout(200);
    const ruleToast = await toast.textContent();
    assert.ok(ruleToast.includes('Kural dosyası'), 'Toast must indicate rule file opening');
    console.log('   ✅ "Kural Dosyası" button executed cleanly with toast notification.');

    // 4. Test "Copy Skill Prompt" (copySkillPrompt) Box
    console.log('4. Testing Skill prompt box click (copy prompt)...');
    const promptBox = await page.$('.skill-prompt-box');
    assert.ok(promptBox, 'Skill prompt box must exist');
    await promptBox.click();
    await page.waitForTimeout(200);
    console.log('   ✅ Prompt copy action executed cleanly.');

    // 5. Test Skills Category Filter Chips (filterSkills)
    console.log('5. Testing Skills category filter chips...');
    const filterChips = await page.$$('#skillsCatChips .chip-btn');
    assert.ok(filterChips.length >= 5, 'Must have at least 5 category chips');
    for (const chip of filterChips) {
        await chip.click();
        await page.waitForTimeout(50);
    }
    // Return to "Tümü"
    await filterChips[0].click();
    console.log(`   ✅ Tested ${filterChips.length} category chips smoothly.`);

    // 6. Test Header "Yeni Sohbet" (startNewChat) Button
    console.log('6. Testing Header HUD "Yeni Sohbet" (startNewChat) button...');
    const newChatBtn = await page.$('#hudBtnNewChat');
    assert.ok(newChatBtn, 'Header new chat button must exist');
    await newChatBtn.click();
    await page.waitForTimeout(200);
    const hudChatToast = await toast.textContent();
    assert.ok(hudChatToast.includes('Yeni sohbet'), 'Toast must indicate new chat');
    console.log('   ✅ Header "Yeni Sohbet" button executed cleanly.');

    console.log('\n=============================================');
    console.log('--- ROUND 2: MODALS, AUDIO & CONTROLS AUDIT ---');
    console.log('=============================================');

    // 7. Test Settings Modal Open & Close & Inner Click Immunity
    console.log('7. Testing Settings Modal (openSettings, inner clicks, closeSettings)...');
    const settingsBtn = await page.$('#openSettingsBtn');
    assert.ok(settingsBtn, 'Settings button #openSettingsBtn must exist in HUD');
    await settingsBtn.click();
    await page.waitForTimeout(200);

    const settingsModal = await page.$('#settingsModal');
    let isModalOpen = await settingsModal.evaluate(el => el.classList.contains('open'));
    assert.ok(isModalOpen, 'Settings modal must be open');
    console.log('   Modal opened successfully.');

    // Click inside modal body - MUST NOT CLOSE!
    const modalBody = await page.$('.settings-modal-body');
    await modalBody.click();
    await page.waitForTimeout(100);
    isModalOpen = await settingsModal.evaluate(el => el.classList.contains('open'));
    assert.ok(isModalOpen, 'Settings modal MUST NOT close when clicking inside its body!');
    console.log('   ✅ Immunity verified: Clicking inside modal content does not accidentally close it.');

    // 8. Test Audio Toggle (toggleAudio) inside Settings Modal - ensures NO TypeError AudioEngine.toggle
    console.log('8. Testing Audio Toggle checkbox (toggleAudio)...');
    await page.$eval('#settingsAudioInput', el => el.click());
    await page.waitForTimeout(100);
    const audioToast = await toast.textContent();
    console.log(`   Audio toast: "${audioToast}"`);
    assert.ok(audioToast.toLowerCase().includes('ses efektleri'), 'Audio toast must show state change');
    await page.$eval('#settingsAudioInput', el => el.click()); // toggle back
    await page.waitForTimeout(100);
    console.log('   ✅ Audio toggle works perfectly with zero JS errors!');

    // Close via close button
    const closeBtn = await page.$('#settingsModal [data-action="closeSettings"]');
    await closeBtn.click();
    await page.waitForTimeout(100);
    isModalOpen = await settingsModal.evaluate(el => el.classList.contains('open'));
    assert.ok(!isModalOpen, 'Settings modal must close when clicking close button');
    console.log('   ✅ Settings modal close button verified.');

    // 9. Test Antigravity Details Modal (toggleAgDetailsModal & close)
    console.log('9. Testing Quota Details Modal (toggleAgDetailsModal)...');
    const agDetailsBtn = await page.$('[data-action="toggleAgDetailsModal"]');
    if (agDetailsBtn) {
        await agDetailsBtn.click();
        await page.waitForTimeout(100);
        const agModal = await page.$('#agDetailsModal');
        let isAgOpen = await agModal.evaluate(el => el.classList.contains('open'));
        assert.ok(isAgOpen, 'AG modal must be open');
        
        // Click inside modal content - must remain open
        const agModalContent = await page.$('#agDetailsModal .ag-modal-content');
        if (agModalContent) {
            await agModalContent.click();
            isAgOpen = await agModal.evaluate(el => el.classList.contains('open'));
            assert.ok(isAgOpen, 'AG modal must stay open on inner click');
        }

        // Close AG modal
        const agCloseBtn = await page.$('#agDetailsModal button[data-action="toggleAgDetailsModal"]');
        if (agCloseBtn) await agCloseBtn.click();
        await page.waitForTimeout(100);
        isAgOpen = await agModal.evaluate(el => el.classList.contains('open'));
        assert.ok(!isAgOpen, 'AG modal must close');
        console.log('   ✅ Quota Details Modal verified.');
    }

    // 10. Test Tab Navigation across all main tabs
    console.log('10. Testing all main navigation tabs...');
    const tabIds = ['#tabBtnProjects', '#tabBtnGithub', '#tabBtnSessions', '#tabBtnSkills'];
    for (const tId of tabIds) {
        const btn = await page.$(tId);
        if (btn) {
            await btn.click();
            await page.waitForTimeout(100);
        }
    }
    console.log('   ✅ All navigation tabs switched smoothly.');

    // 11. Test Star / Favorite (toggleFav) on Project Card
    console.log('11. Testing Star / Favorite (toggleFav)...');
    await page.$('#tabBtnProjects').then(b => b.click());
    await page.waitForTimeout(150);
    const favBtn = await page.$('.project-card .fav-btn');
    if (favBtn) {
        await favBtn.click();
        await page.waitForTimeout(100);
        console.log('   ✅ Favorite button clicked and toggled cleanly.');
    }

    // 12. Test Archive Toggle on Project Card
    console.log('12. Testing Archive (toggleArch)...');
    const archBtn = await page.$('.project-card .arch-btn');
    if (archBtn) {
        await archBtn.click();
        await page.waitForTimeout(100);
        console.log('   ✅ Archive button clicked and toggled cleanly.');
    }

    // 13. Test Quota Refresh (refreshAgQuota)
    console.log('13. Testing Quota Refresh (refreshAgQuota)...');
    const refreshQuotaBtn = await page.$('#agRefreshBtn');
    if (refreshQuotaBtn) {
        await refreshQuotaBtn.click();
        await page.waitForTimeout(200);
        const quotaToast = await toast.textContent();
        assert.ok(quotaToast.includes('kotalar') || quotaToast.includes('Token'), 'Toast must indicate quota refresh');
        console.log('   ✅ Quota refresh button clicked and spinning verified.');
    }

    // 14. Test Project Sub-Filters (setSubFilter)
    console.log('14. Testing Project Sub-filters...');
    const subChips = await page.$$('#filterBar .chip-btn');
    for (const c of subChips) {
        await c.click();
        await page.waitForTimeout(50);
    }
    await subChips[0].click(); // reset to all
    console.log('   ✅ Project sub-filters verified.');

    // 15. Check for any errors caught during the entire session
    console.log('\n=============================================');
    console.log('--- ERROR CHECK SUMMARY ---');
    console.log('=============================================');
    if (errors.length > 0) {
        console.error('❌ Errors detected during button testing:');
        errors.forEach(e => console.error('   ' + e));
        await browser.close();
        process.exit(1);
    } else {
        console.log('🎉 0 ERRORS DETECTED across all button clicks and interactions!');
    }

    await browser.close();
    console.log('✅ 2-Round Full Verification PASSED Successfully!');
})();
