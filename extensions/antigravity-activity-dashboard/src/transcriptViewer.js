'use strict';
/**
 * [⚡ OLLAMA ACTIVE] - Clean Transcript Viewer for Antigravity IDE.
 * Extracts clean user & assistant dialogue from raw transcript.jsonl
 * and renders a human-friendly conversation page inside a VS Code Webview Panel.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function parseTranscriptDialogue(transcriptPath) {
    if (!fs.existsSync(transcriptPath)) return [];
    try {
        const content = fs.readFileSync(transcriptPath, 'utf8');
        const lines = content.split('\n');
        const dialogue = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const step = JSON.parse(line);
                const timeObj = step.created_at ? new Date(step.created_at) : new Date();
                const timeStr = timeObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = timeObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                if (step.type === 'USER_INPUT') {
                    let raw = step.content || '';
                    const match = raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
                    if (match) {
                        raw = match[1].trim();
                    } else {
                        raw = raw.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').trim();
                    }
                    if (raw) {
                        // Avoid immediate identical duplicates
                        const last = dialogue[dialogue.length - 1];
                        if (last && last.role === 'user' && last.text === raw) {
                            continue;
                        }
                        dialogue.push({
                            role: 'user',
                            roleName: 'Sen (Kullanıcı)',
                            text: raw,
                            time: timeStr,
                            date: dateStr,
                            stepIndex: step.step_index
                        });
                    }
                } else if (step.type === 'PLANNER_RESPONSE' && step.content) {
                    const text = String(step.content).trim();
                    if (text) {
                        dialogue.push({
                            role: 'assistant',
                            roleName: 'Antigravity (Asistan)',
                            text: text,
                            time: timeStr,
                            date: dateStr,
                            stepIndex: step.step_index
                        });
                    }
                }
            } catch {
                // skip corrupt jsonl line
            }
        }
        return dialogue;
    } catch (err) {
        logger.error('Failed to parse transcript dialogue:', err);
        return [];
    }
}

function renderMarkdownSimple(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);

    // Code blocks with header and copy button
    escaped = escaped.replace(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = 'cb_' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-wrap">
            <div class="code-header">
                <span class="code-lang">${lang || 'kod'}</span>
                <button class="copy-btn" onclick="copySnippet('${id}')">📋 Kopyala</button>
            </div>
            <pre><code id="${id}">${code.trim()}</code></pre>
        </div>`;
    });

    // Inline code
    escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

    // Headings
    escaped = escaped.replace(/^### (.*$)/gim, '<h3 class="t-h3">$1</h3>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h2 class="t-h2">$1</h2>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h1 class="t-h1">$1</h1>');

    // Horizontal Rule
    escaped = escaped.replace(/^---$/gim, '<hr class="t-hr">');

    // Bold & Italic
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquotes
    escaped = escaped.replace(/^> (.*$)/gim, '<blockquote class="t-quote">$1</blockquote>');

    // Bullet lists
    escaped = escaped.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="t-li">$1</li>');

    // Line breaks
    escaped = escaped.replace(/\n\n+/g, '</p><p>');
    escaped = escaped.replace(/\n/g, '<br>');

    return `<p>${escaped}</p>`;
}

function generateCleanMarkdownText(dialogue, sessionTitle) {
    let md = `# 💬 Sohbet: ${sessionTitle}\n\n`;
    for (const msg of dialogue) {
        const icon = msg.role === 'user' ? '👤' : '⚡';
        md += `### ${icon} ${msg.roleName} (${msg.time})\n\n${msg.text}\n\n---\n\n`;
    }
    return md;
}

function generateCleanTranscriptHtml(dialogue, sessionTitle, _sessionFolder, _rawTranscriptPath) {
    const totalMsgs = dialogue.length;
    const userCount = dialogue.filter(d => d.role === 'user').length;
    const aiCount = dialogue.filter(d => d.role === 'assistant').length;
    const firstDate = dialogue[0]?.date || 'Bugün';

    let dialogueHtml = '';
    if (totalMsgs === 0) {
        dialogueHtml = `
        <div class="empty-box">
            <div class="empty-icon">💬</div>
            <h3>Kayıtlı Konuşma Bulunamadı</h3>
            <p>Bu oturumda kullanıcı ve asistan arasında metin mesajı yer almıyor veya oturum henüz başlatılmadı.</p>
        </div>`;
    } else {
        for (let i = 0; i < dialogue.length; i++) {
            const msg = dialogue[i];
            const isUser = msg.role === 'user';
            const roleClass = isUser ? 'user-bubble' : 'assistant-bubble';
            const badgeClass = isUser ? 'user-badge' : 'assistant-badge';
            const icon = isUser ? '👤' : '⚡';
            const contentHtml = isUser ? `<p class="user-text">${escapeHtml(msg.text).replace(/\n/g, '<br>')}</p>` : renderMarkdownSimple(msg.text);

            dialogueHtml += `
            <div class="message-card ${roleClass}" data-role="${msg.role}" data-index="${i}">
                <div class="msg-header">
                    <div class="msg-sender">
                        <span class="role-badge ${badgeClass}">${icon} ${escapeHtml(msg.roleName)}</span>
                    </div>
                    <div class="msg-time">
                        <span>#${i + 1}</span>
                        <span>•</span>
                        <span>${escapeHtml(msg.time)}</span>
                    </div>
                </div>
                <div class="msg-body">
                    ${contentHtml}
                </div>
            </div>`;
        }
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sohbet Transkripti: ${escapeHtml(sessionTitle)}</title>
    <style>
        :root {
            --bg-deep: #070a12;
            --bg-card: rgba(15, 23, 42, 0.65);
            --bg-card-user: rgba(168, 85, 247, 0.08);
            --bg-card-ai: rgba(0, 242, 254, 0.05);
            --border-glass: rgba(255, 255, 255, 0.09);
            --border-user: rgba(168, 85, 247, 0.35);
            --border-ai: rgba(0, 242, 254, 0.35);
            --neon-cyan: #00f2fe;
            --neon-purple: #a855f7;
            --text-main: #e2e8f0;
            --text-dim: #94a3b8;
            --text-dark: #64748b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Outfit", sans-serif;
            line-height: 1.6;
            padding: 24px 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        /* Top Hero Cockpit Header */
        .hero-header {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8));
            border: 1px solid var(--border-glass);
            border-radius: 16px;
            padding: 20px 24px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
        }

        .hero-title-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 12px;
        }

        .hero-title {
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .hero-title span.icon {
            font-size: 22px;
        }

        .hero-meta-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }

        .meta-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            color: var(--text-dim);
            font-family: "JetBrains Mono", Consolas, monospace;
        }

        .meta-pill.cyan {
            color: var(--neon-cyan);
            border-color: rgba(0, 242, 254, 0.3);
            background: rgba(0, 242, 254, 0.08);
        }

        .meta-pill.purple {
            color: #d8b4fe;
            border-color: rgba(168, 85, 247, 0.3);
            background: rgba(168, 85, 247, 0.08);
        }

        .hero-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .action-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: var(--text-main);
            padding: 7px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .action-btn:hover {
            background: rgba(0, 242, 254, 0.15);
            border-color: var(--neon-cyan);
            color: #ffffff;
            transform: translateY(-1px);
        }

        .action-btn.primary {
            background: linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(168, 85, 247, 0.25));
            border-color: var(--neon-cyan);
        }

        /* Search Filter Box */
        .search-box {
            position: relative;
            margin-bottom: 20px;
        }

        .search-box input {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--border-glass);
            border-radius: 12px;
            padding: 12px 16px 12px 42px;
            color: #ffffff;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s ease;
        }

        .search-box input:focus {
            border-color: var(--neon-cyan);
            box-shadow: 0 0 12px rgba(0, 242, 254, 0.2);
        }

        .search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 16px;
            color: var(--text-dark);
            pointer-events: none;
        }

        /* Message Stream */
        .messages-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message-card {
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: 14px;
            padding: 18px 20px;
            position: relative;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
        }

        .message-card.user-bubble {
            background: var(--bg-card-user);
            border-left: 4px solid var(--neon-purple);
        }

        .message-card.assistant-bubble {
            background: var(--bg-card-ai);
            border-left: 4px solid var(--neon-cyan);
        }

        .msg-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .role-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .user-badge {
            background: rgba(168, 85, 247, 0.2);
            color: #d8b4fe;
            border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .assistant-badge {
            background: rgba(0, 242, 254, 0.15);
            color: var(--neon-cyan);
            border: 1px solid rgba(0, 242, 254, 0.4);
        }

        .msg-time {
            font-size: 11px;
            color: var(--text-dark);
            font-family: "JetBrains Mono", Consolas, monospace;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .msg-body {
            font-size: 14px;
            color: var(--text-main);
            overflow-wrap: break-word;
        }

        .user-text {
            font-size: 15px;
            font-weight: 500;
            color: #f1f5f9;
        }

        /* Markdown Elements */
        .t-h1, .t-h2, .t-h3 {
            color: #ffffff;
            margin-top: 14px;
            margin-bottom: 8px;
            font-weight: 700;
        }
        .t-h1 { font-size: 17px; }
        .t-h2 { font-size: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 4px; }
        .t-h3 { font-size: 14px; color: var(--neon-cyan); }

        .t-hr {
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin: 14px 0;
        }

        .t-quote {
            border-left: 3px solid rgba(0, 242, 254, 0.5);
            padding-left: 12px;
            margin: 10px 0;
            color: #94a3b8;
            font-style: italic;
        }

        .t-li {
            margin-left: 20px;
            margin-bottom: 4px;
            list-style: square;
        }

        .inline-code {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: "JetBrains Mono", Consolas, monospace;
            font-size: 12.5px;
            color: #38bdf8;
        }

        .code-wrap {
            margin: 12px 0;
            background: #090d16;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            overflow: hidden;
        }

        .code-header {
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            font-size: 11px;
            color: var(--text-dark);
            font-family: "JetBrains Mono", Consolas, monospace;
        }

        .copy-btn {
            background: transparent;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            font-size: 11px;
            transition: color 0.15s ease;
        }

        .copy-btn:hover {
            color: #ffffff;
        }

        pre {
            padding: 12px 14px;
            overflow-x: auto;
            font-family: "JetBrains Mono", Consolas, monospace;
            font-size: 12.5px;
            color: #e2e8f0;
            line-height: 1.5;
        }

        /* Empty state */
        .empty-box {
            text-align: center;
            padding: 60px 20px;
            background: var(--bg-card);
            border: 1px dashed var(--border-glass);
            border-radius: 16px;
        }
        .empty-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }

        /* Toast notification */
        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid var(--neon-cyan);
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 8px;
            font-size: 13px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.25s ease;
            pointer-events: none;
            z-index: 1000;
        }
        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="hero-header">
            <div class="hero-title-row">
                <h1 class="hero-title">
                    <span class="icon">💬</span>
                    <span>${escapeHtml(sessionTitle)}</span>
                </h1>
            </div>
            <div class="hero-meta-row">
                <span class="meta-pill">📅 ${escapeHtml(firstDate)}</span>
                <span class="meta-pill cyan">💬 ${totalMsgs} Konuşma Mesajı</span>
                <span class="meta-pill purple">👤 ${userCount} Kullanıcı</span>
                <span class="meta-pill cyan">⚡ ${aiCount} Asistan</span>
            </div>
            <div class="hero-actions">
                <button class="action-btn primary" onclick="copyFullDialogue()">📋 Tümünü Kopyala</button>
                <button class="action-btn" onclick="openMarkdownFile()">📄 Markdown (.md) Aç</button>
                <button class="action-btn" onclick="openFolder()">📁 Oturum Klasörü</button>
                <button class="action-btn" onclick="openRawJsonl()">📜 Ham JSONL</button>
            </div>
        </header>

        <!-- Search Bar -->
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="Sohbet içinde kelime veya kod ara..." oninput="filterMessages()">
        </div>

        <!-- Messages Feed -->
        <main class="messages-list" id="messagesList">
            ${dialogueHtml}
        </main>
    </div>

    <div class="toast" id="toast">Bildirim</div>

    <script>
        const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;

        function showToast(msg) {
            const t = document.getElementById('toast');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);
        }

        function copySnippet(elementId) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const text = el.innerText || el.textContent;
            navigator.clipboard.writeText(text).then(() => {
                showToast('✅ Kod panoya kopyalandı');
            }).catch(() => {
                if (vscode) vscode.postMessage({ command: 'copyText', text });
            });
        }

        function copyFullDialogue() {
            if (vscode) {
                vscode.postMessage({ command: 'copyFullMarkdown' });
            } else {
                showToast('✅ Tüm konuşma panoya kopyalandı');
            }
        }

        function openMarkdownFile() {
            if (vscode) vscode.postMessage({ command: 'openMarkdown' });
        }

        function openFolder() {
            if (vscode) vscode.postMessage({ command: 'openFolder' });
        }

        function openRawJsonl() {
            if (vscode) vscode.postMessage({ command: 'openRawJsonl' });
        }

        function filterMessages() {
            const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
            const cards = document.querySelectorAll('.message-card');
            cards.forEach(card => {
                if (!q) {
                    card.style.display = 'block';
                    return;
                }
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(q) ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;
}

function openCleanTranscript(transcriptPath, vscodeInstance, _extensionUri) {
    if (!fs.existsSync(transcriptPath)) {
        vscodeInstance.window.showErrorMessage('Transkript dosyası bulunamadı: ' + transcriptPath);
        return;
    }

    const dialogue = parseTranscriptDialogue(transcriptPath);
    const sessionDir = path.dirname(path.dirname(transcriptPath)); // e.g. .../brain/<sessionId>
    const firstUserMsg = dialogue.find(d => d.role === 'user');
    const sessionTitle = (firstUserMsg?.text || path.basename(sessionDir)).slice(0, 60);

    // Save a clean markdown file into the session folder
    const mdContent = generateCleanMarkdownText(dialogue, sessionTitle);
    const mdPath = path.join(sessionDir, 'sohbet_gecmisi.md');
    try {
        fs.writeFileSync(mdPath, mdContent, 'utf8');
    } catch (e) {
        logger.warn('Could not save sohbet_gecmisi.md:', e);
    }

    // Create a VS Code Webview panel beside the current active editor/dashboard
    const panel = vscodeInstance.window.createWebviewPanel(
        'antigravityCleanTranscript',
        `💬 Sohbet: ${sessionTitle.slice(0, 24)}...`,
        vscodeInstance.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = generateCleanTranscriptHtml(dialogue, sessionTitle, sessionDir, transcriptPath);

    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'copyText':
                if (message.text) {
                    vscodeInstance.env.clipboard.writeText(message.text);
                    vscodeInstance.window.showInformationMessage('📋 Kod panoya kopyalandı.');
                }
                break;

            case 'copyFullMarkdown':
                vscodeInstance.env.clipboard.writeText(mdContent);
                vscodeInstance.window.showInformationMessage('📋 Tüm sohbet konuşması Markdown formatında kopyalandı.');
                break;

            case 'openMarkdown':
                if (fs.existsSync(mdPath)) {
                    vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.file(mdPath)).then(doc => {
                        vscodeInstance.window.showTextDocument(doc);
                    });
                }
                break;

            case 'openFolder':
                vscodeInstance.commands.executeCommand('revealFileInOS', vscodeInstance.Uri.file(transcriptPath));
                break;

            case 'openRawJsonl':
                vscodeInstance.workspace.openTextDocument(vscodeInstance.Uri.file(transcriptPath)).then(doc => {
                    vscodeInstance.window.showTextDocument(doc);
                });
                break;
        }
    });

    return panel;
}

module.exports = {
    parseTranscriptDialogue,
    generateCleanMarkdownText,
    generateCleanTranscriptHtml,
    openCleanTranscript,
    renderMarkdownSimple
};
