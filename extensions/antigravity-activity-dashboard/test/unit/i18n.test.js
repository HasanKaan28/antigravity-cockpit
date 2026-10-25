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

        const sets = localeKeySets();
        SUPPORTED_LOCALES.forEach(locale => {
            assert(sets[locale], `dictionary for ${locale} exists`);
            requiredKeys.forEach(k => {
                assert(sets[locale].has(k), `Translation key '${k}' should exist in the ${locale} dictionary`);
            });
        });
    });

    it('defines the same keys in every language as in English', () => {
        const sets = localeKeySets();
        const english = [...sets.en].sort();
        SUPPORTED_LOCALES.forEach(locale => {
            assert.deepStrictEqual([...sets[locale]].sort(), english, `${locale} has exactly the English keys`);
        });
    });

    // The keys each locale defines, read from the LOCALES literal block by block.
    function localeKeySets() {
        const start = dashboardJs.indexOf('    const LOCALES = {');
        const end = dashboardJs.indexOf('\n    };', start);
        assert(start > -1 && end > start, 'LOCALES literal found in dashboard.js');
        const sets = {};
        let current = null;
        for (const line of dashboardJs.slice(start, end).split(/\r?\n/)) {
            const block = line.match(/^ {8}([a-z]{2}): \{$/);
            if (block) {
                current = block[1];
                sets[current] = new Set();
                continue;
            }
            const key = current && line.match(/^ {12}'([^']+)':/);
            if (key) sets[current].add(key[1]);
        }
        return sets;
    }

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
