'use strict';
/**
 * Unified logging via VS Code OutputChannel "Antigravity Cockpit".
 * Gracefully falls back to console when outside VS Code (e.g. CLI tests).
 */
let outputChannel = null;

function initLogger(vscode) {
    if (vscode && vscode.window && !outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Antigravity Cockpit');
    }
    return outputChannel;
}

function getChannel() {
    return outputChannel;
}

function log(level, message, meta) {
    const ts = new Date().toISOString().slice(11, 19);
    const metaStr = meta ? ' ' + (meta instanceof Error ? meta.stack || meta.message : JSON.stringify(meta)) : '';
    const line = `[${ts}] [${level}] ${message}${metaStr}`;
    if (outputChannel) {
        outputChannel.appendLine(line);
    } else {
        if (level === 'ERROR') console.error(line);
        else if (level === 'WARN') console.warn(line);
        else console.log(line);
    }
}

module.exports = {
    initLogger,
    getChannel,
    info: (msg, meta) => log('INFO', msg, meta),
    warn: (msg, meta) => log('WARN', msg, meta),
    error: (msg, meta) => log('ERROR', msg, meta),
    debug: (msg, meta) => log('DEBUG', msg, meta)
};
