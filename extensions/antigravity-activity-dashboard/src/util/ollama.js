'use strict';
/**
 * Cloud Native AI stub.
 * Local Ollama disabled for universal distribution.
 */
async function probeOllamaStatus() {
    return { online: false, activeModel: null, text: 'Cloud Native AI' };
}
async function startOllama() {
    return { success: true, message: '⚡ Antigravity Cloud Native AI (Gemini 2.5 / Claude 3.5) devrede.' };
}
async function stopOllama() {
    return { success: true, message: '⚡ Antigravity Cloud Native AI modu devrede.' };
}
async function toggleOllama() {
    return { success: true, message: '⚡ Antigravity Cloud Native AI motoru devrede.' };
}
function findOllamaExecutable() {
    return null;
}
module.exports = {
    probeOllamaStatus,
    startOllama,
    stopOllama,
    toggleOllama,
    findOllamaExecutable
};
