'use strict';
const assert = require('assert');
const { HOST_LOCALES, resolveHostLocale, hostText } = require('../../src/hostStrings');

function fakeVscode(configured, ideLanguage) {
    return {
        env: { language: ideLanguage },
        workspace: {
            getConfiguration: () => ({
                get: (key, def) => (key === 'language' && configured !== undefined ? configured : def)
            })
        }
    };
}

describe('Host notification strings', () => {
    it('ships every key in all 7 dashboard languages', () => {
        const keys = Object.keys(HOST_LOCALES.en).sort();
        assert.deepStrictEqual(Object.keys(HOST_LOCALES).sort(), ['de', 'en', 'es', 'fr', 'ja', 'tr', 'zh']);
        for (const [locale, table] of Object.entries(HOST_LOCALES)) {
            assert.deepStrictEqual(Object.keys(table).sort(), keys, `${locale} has the same keys as en`);
        }
    });

    it('keeps the same placeholders in every translation', () => {
        for (const [key, template] of Object.entries(HOST_LOCALES.en)) {
            const expected = (template.match(/\{\w+\}/g) || []).sort();
            for (const [locale, table] of Object.entries(HOST_LOCALES)) {
                assert.deepStrictEqual((table[key].match(/\{\w+\}/g) || []).sort(), expected, `${locale}.${key}`);
            }
        }
    });

    it('follows the configured language, then the IDE language, then English', () => {
        assert.strictEqual(resolveHostLocale(fakeVscode('de', 'en')), 'de');
        assert.strictEqual(resolveHostLocale(fakeVscode('auto', 'tr')), 'tr');
        assert.strictEqual(resolveHostLocale(fakeVscode('auto', 'pt-BR')), 'en');
        assert.strictEqual(resolveHostLocale(fakeVscode('auto', 'zh-cn')), 'zh');
        assert.strictEqual(resolveHostLocale(fakeVscode('xx', 'ja')), 'ja');
        assert.strictEqual(resolveHostLocale({}), 'en');
    });

    it('fills placeholders and keeps $ sequences and unknown placeholders as they are', () => {
        assert.strictEqual(hostText(fakeVscode('en', 'en'), 'fileMissing', { path: 'C:\\a\\$&\\{b}.txt' }), 'File not found: C:\\a\\$&\\{b}.txt');
        assert.strictEqual(hostText(fakeVscode('tr', 'en'), 'cloned', { name: 'x', path: 'y' }), 'x başarıyla klonlandı: y');
        assert.strictEqual(hostText(fakeVscode('fr', 'en'), 'noSuchKey'), 'noSuchKey');
    });
});
