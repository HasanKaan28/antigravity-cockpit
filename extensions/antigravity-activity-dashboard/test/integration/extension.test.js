'use strict';
const assert = require('assert');
const vscode = require('vscode');

suite('Extension Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start all integration tests.');

    test('Extension should register commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('antigravity.openActivityDashboard'), 'antigravity.openActivityDashboard should be registered');
        assert.ok(commands.includes('antigravity.refreshActivityDashboard'), 'antigravity.refreshActivityDashboard should be registered');
        assert.ok(commands.includes('antigravity.cockpitNewChat'), 'antigravity.cockpitNewChat should be registered');
    });
});
