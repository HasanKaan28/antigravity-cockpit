'use strict';
const assert = require('assert');
const { findOllamaExecutable } = require('../../src/util/ollama');

describe('Ollama Utility Tests', () => {
    it('returns an Ollama path when installed and null otherwise', function () {
        const exe = findOllamaExecutable();
        if (!exe) {
            // Ollama is optional; machines without it must get null, not a bogus path.
            assert.strictEqual(exe, null);
            this.skip();
        }
        assert.match(exe.toLowerCase(), /ollama/i);
    });
});
