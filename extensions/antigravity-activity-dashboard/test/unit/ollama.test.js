'use strict';
const assert = require('assert');
const { findOllamaExecutable } = require('../../src/util/ollama');

describe('Ollama Utility Tests', () => {
    it('locates ollama executable on system', () => {
        const exe = findOllamaExecutable();
        assert.ok(exe, 'Should find ollama executable');
        assert.match(exe.toLowerCase(), /ollama/i);
    });
});
