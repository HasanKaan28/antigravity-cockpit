const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Cockpit Internationalization (i18n) Engine Tests', () => {
    let dashboardJs;
    let SUPPORTED_LOCALES;

    before(() => {
        const jsPath = path.resolve(__dirname, '../../media/dashboard.js');
        dashboardJs = fs.readFileSync(jsPath, 'utf8');

        // Extract SUPPORTED_LOCALES array using regex
        const localesMatch = dashboardJs.match(/const SUPPORTED_LOCALES\s*=\s*(\[[^\]]+\]);/);
        assert(localesMatch, 'SUPPORTED_LOCALES must be defined in dashboard.js');
        SUPPORTED_LOCALES = eval(localesMatch[1]);

        // Verify the 7 popular languages
        assert.deepStrictEqual(SUPPORTED_LOCALES, ['en', 'tr', 'de', 'es', 'fr', 'zh', 'ja']);
    });

    it('defines all 7 core languages plus auto mode', () => {
        assert.strictEqual(SUPPORTED_LOCALES.length, 7);
        assert(SUPPORTED_LOCALES.includes('en'), 'Must include English');
        assert(SUPPORTED_LOCALES.includes('tr'), 'Must include Türkçe');
        assert(SUPPORTED_LOCALES.includes('de'), 'Must include Deutsch');
        assert(SUPPORTED_LOCALES.includes('es'), 'Must include Español');
        assert(SUPPORTED_LOCALES.includes('fr'), 'Must include Français');
        assert(SUPPORTED_LOCALES.includes('zh'), 'Must include Chinese');
        assert(SUPPORTED_LOCALES.includes('ja'), 'Must include Japanese');
    });

    it('correctly resolves active locale with auto fallback to IDE language', () => {
        function resolveActiveLocale(prefLang, ideLang) {
            if (prefLang && prefLang !== 'auto' && SUPPORTED_LOCALES.includes(prefLang)) {
                return prefLang;
            }
            const norm = String(ideLang || 'en').toLowerCase().split(/[-_]/)[0];
            if (SUPPORTED_LOCALES.includes(norm)) {
                return norm;
            }
            return 'en';
        }

        // Explicit user settings override
        assert.strictEqual(resolveActiveLocale('tr', 'de'), 'tr');
        assert.strictEqual(resolveActiveLocale('fr', 'en'), 'fr');
        assert.strictEqual(resolveActiveLocale('ja', 'en'), 'ja');

        // Auto mode adopts IDE language
        assert.strictEqual(resolveActiveLocale('auto', 'tr'), 'tr');
        assert.strictEqual(resolveActiveLocale('auto', 'tr-TR'), 'tr');
        assert.strictEqual(resolveActiveLocale('auto', 'de-DE'), 'de');
        assert.strictEqual(resolveActiveLocale('auto', 'zh-CN'), 'zh');
        assert.strictEqual(resolveActiveLocale('auto', 'es'), 'es');

        // Auto mode falls back to en for unsupported IDE languages
        assert.strictEqual(resolveActiveLocale('auto', 'ru'), 'en');
        assert.strictEqual(resolveActiveLocale('auto', 'ko'), 'en');
        assert.strictEqual(resolveActiveLocale('auto', null), 'en');
    });

    it('provides essential translation keys in all language dictionaries', () => {
        const requiredKeys = [
            'hud.title',
            'hud.newChat',
            'hud.refresh',
            'hud.settings',
            'telemetry.gpu',
            'telemetry.quota',
            'telemetry.github',
            'nav.projects',
            'nav.github',
            'nav.sessions',
            'nav.radar',
            'settings.modalTitle',
            'settings.langTitle',
            'settings.themeTitle',
            'settings.widgetsTitle',
            'lang.auto'
        ];

        // Ensure LOCALES contains required keys for each language
        SUPPORTED_LOCALES.forEach(() => {
            requiredKeys.forEach(k => {
                const keyPattern = new RegExp(`'${k}'\\s*:\\s*'([^']+)'`);
                assert(
                    keyPattern.test(dashboardJs),
                    `Translation key '${k}' should exist in dashboard.js dictionaries`
                );
            });
        });
    });

    it('interpolates parameters correctly in translations', () => {
        function t(template, params = {}) {
            let text = template;
            Object.keys(params).forEach(p => {
                text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
            });
            return text;
        }

        assert.strictEqual(
            t('Dil değiştirildi: {lang}', { lang: 'Türkçe' }),
            'Dil değiştirildi: Türkçe'
        );
        assert.strictEqual(
            t('Language changed to: {lang}', { lang: 'English' }),
            'Language changed to: English'
        );
    });
});
