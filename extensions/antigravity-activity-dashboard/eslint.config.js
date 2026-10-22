// @ts-check
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/**', 'graphify-out/**', '.vscode-test/**', 'preview.html', '*.vsix'] },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        },
        rules: {
            'no-empty': ['error', { allowEmptyCatch: false }],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            eqeqeq: ['error', 'smart'],
            'prefer-const': 'warn'
        }
    },
    {
        files: ['media/**/*.js'],
        languageOptions: {
            sourceType: 'script',
            globals: { ...globals.browser, acquireVsCodeApi: 'readonly' }
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: { globals: { ...globals.node, ...globals.mocha } }
    }
];
