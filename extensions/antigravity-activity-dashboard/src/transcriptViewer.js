'use strict';
/**
 * [⚡ OLLAMA ACTIVE] - Clean Transcript Viewer for Antigravity IDE.
 * Extracts clean user & assistant dialogue from raw transcript.jsonl
 * and renders a human-friendly conversation page inside a VS Code Webview Panel.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const { isTranscriptFile } = require('./util/security');
const { hostText } = require('./hostStrings');

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
    // Code blocks are swapped for placeholders first, so the inline rules and line breaks below never touch them.
    const blocks = [];
    let escaped = escapeHtml(text).replace(/```([a-zA-Z0-9_\-+]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = 'cb_' + Math.random().toString(36).slice(2, 11);
        blocks.push('<div class="code-wrap"><div class="code-header">' +
            `<span class="code-lang">${lang || 'code'}</span>` +
            `<button class="icon-btn copy-btn" data-action="copySnippet" data-target="${id}">${svgIcon('copy', 'sm')}</button>` +
            `</div><pre><code id="${id}">${code.replace(/\s+$/, '')}</code></pre></div>`);
        return `${blocks.length - 1}`;
    });

    // Inline code
    escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

    // Headings
    escaped = escaped.replace(/^#{4,6} (.*$)/gim, '<h4 class="t-h4">$1</h4>');
    escaped = escaped.replace(/^### (.*$)/gim, '<h3 class="t-h3">$1</h3>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h2 class="t-h2">$1</h2>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h1 class="t-h1">$1</h1>');

    // Horizontal Rule
    escaped = escaped.replace(/^---$/gim, '<hr class="t-hr">');

    // Bold & Italic
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquotes (the text is already escaped, so ">" arrives as "&gt;")
    escaped = escaped.replace(/^&gt; ?(.*$)/gim, '<blockquote class="t-quote">$1</blockquote>');

    // Bullet lists
    escaped = escaped.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="t-li">$1</li>');

    // Line breaks (block elements end their own line, so they get no extra <br>)
    escaped = escaped.replace(/\n\n+/g, '</p><p>');
    escaped = escaped.replace(/(<\/(?:h[1-4]|blockquote|li)>|<hr class="t-hr">)\n/g, '$1');
    escaped = escaped.replace(/\n/g, '<br>');
    escaped = escaped.replace(/(\d+)/g, (m, i) => blocks[Number(i)]);

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

// Reading-view strings; the language and theme come from the dashboard that opened the transcript.
const T_LOCALES = {
    en: { tab: 'Transcript', copyAll: 'Copy all', markdown: 'Markdown', folder: 'Session folder', raw: 'Raw JSONL', search: 'Search this conversation', prompts: 'Your prompts', you: 'You', assistant: 'Antigravity', messages: '{n} messages', fromYou: '{n} from you', replies: '{n} replies', copy: 'Copy', copyMessage: 'Copy message', copied: 'Copied to clipboard', allCopied: 'Conversation copied as Markdown', noneTitle: 'No messages in this session', noneDesc: 'This session has no text messages between you and the assistant yet.', noMatch: 'No message matches your search.' },
    tr: { tab: 'Döküm', copyAll: 'Tümünü kopyala', markdown: 'Markdown', folder: 'Oturum klasörü', raw: 'Ham JSONL', search: 'Bu sohbette ara', prompts: 'Senin mesajların', you: 'Sen', assistant: 'Antigravity', messages: '{n} mesaj', fromYou: '{n} senden', replies: '{n} yanıt', copy: 'Kopyala', copyMessage: 'Mesajı kopyala', copied: 'Panoya kopyalandı', allCopied: 'Sohbet Markdown olarak kopyalandı', noneTitle: 'Bu oturumda mesaj yok', noneDesc: 'Bu oturumda henüz seninle asistan arasında metin mesajı yok.', noMatch: 'Aramanla eşleşen mesaj yok.' },
    de: { tab: 'Transkript', copyAll: 'Alles kopieren', markdown: 'Markdown', folder: 'Sitzungsordner', raw: 'Roh-JSONL', search: 'In dieser Unterhaltung suchen', prompts: 'Deine Prompts', you: 'Du', assistant: 'Antigravity', messages: '{n} Nachrichten', fromYou: '{n} von dir', replies: '{n} Antworten', copy: 'Kopieren', copyMessage: 'Nachricht kopieren', copied: 'In die Zwischenablage kopiert', allCopied: 'Unterhaltung als Markdown kopiert', noneTitle: 'Keine Nachrichten in dieser Sitzung', noneDesc: 'Diese Sitzung enthält noch keine Textnachrichten zwischen dir und dem Assistenten.', noMatch: 'Keine Nachricht passt zu deiner Suche.' },
    es: { tab: 'Transcripción', copyAll: 'Copiar todo', markdown: 'Markdown', folder: 'Carpeta de la sesión', raw: 'JSONL sin procesar', search: 'Buscar en esta conversación', prompts: 'Tus mensajes', you: 'Tú', assistant: 'Antigravity', messages: '{n} mensajes', fromYou: '{n} tuyos', replies: '{n} respuestas', copy: 'Copiar', copyMessage: 'Copiar mensaje', copied: 'Copiado al portapapeles', allCopied: 'Conversación copiada como Markdown', noneTitle: 'No hay mensajes en esta sesión', noneDesc: 'Esta sesión aún no tiene mensajes de texto entre tú y el asistente.', noMatch: 'Ningún mensaje coincide con tu búsqueda.' },
    fr: { tab: 'Transcription', copyAll: 'Tout copier', markdown: 'Markdown', folder: 'Dossier de session', raw: 'JSONL brut', search: 'Rechercher dans cette conversation', prompts: 'Vos messages', you: 'Vous', assistant: 'Antigravity', messages: '{n} messages', fromYou: '{n} de vous', replies: '{n} réponses', copy: 'Copier', copyMessage: 'Copier le message', copied: 'Copié dans le presse-papiers', allCopied: 'Conversation copiée en Markdown', noneTitle: 'Aucun message dans cette session', noneDesc: 'Cette session ne contient pas encore de messages texte entre vous et l’assistant.', noMatch: 'Aucun message ne correspond à votre recherche.' },
    zh: { tab: '记录', copyAll: '全部复制', markdown: 'Markdown', folder: '会话文件夹', raw: '原始 JSONL', search: '在此对话中搜索', prompts: '你的消息', you: '你', assistant: 'Antigravity', messages: '{n} 条消息', fromYou: '你发送 {n} 条', replies: '{n} 条回复', copy: '复制', copyMessage: '复制消息', copied: '已复制到剪贴板', allCopied: '已将对话复制为 Markdown', noneTitle: '此会话没有消息', noneDesc: '此会话中还没有你与助手之间的文字消息。', noMatch: '没有与搜索匹配的消息。' },
    ja: { tab: 'トランスクリプト', copyAll: 'すべてコピー', markdown: 'Markdown', folder: 'セッションフォルダー', raw: '生の JSONL', search: 'この会話を検索', prompts: 'あなたのメッセージ', you: 'あなた', assistant: 'Antigravity', messages: '{n} 件のメッセージ', fromYou: 'あなたから {n} 件', replies: '{n} 件の返信', copy: 'コピー', copyMessage: 'メッセージをコピー', copied: 'クリップボードにコピーしました', allCopied: '会話を Markdown としてコピーしました', noneTitle: 'このセッションにメッセージはありません', noneDesc: 'このセッションには、まだあなたとアシスタントのテキストメッセージがありません。', noMatch: '検索に一致するメッセージはありません。' }
};

function transcriptStrings(lang) {
    return T_LOCALES[lang] || T_LOCALES.tr;
}

function fmt(template, params) {
    return Object.keys(params).reduce((s, k) => s.split(`{${k}}`).join(String(params[k])), template);
}

// Lucide glyphs (ISC), the same family as the dashboard.
const T_ICONS = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
    <symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></symbol>
    <symbol id="i-orbit" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-28 12 12)" stroke-width="2"/></symbol>
    <symbol id="i-copy" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></symbol>
    <symbol id="i-file-text" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></symbol>
    <symbol id="i-file-code" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></symbol>
    <symbol id="i-folder-open" viewBox="0 0 24 24"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></symbol>
</svg>`;

const svgIcon = (name, cls) => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function generateCleanTranscriptHtml(dialogue, sessionTitle, _sessionFolder, _rawTranscriptPath, opts = {}) {
    const theme = /^[a-z-]{2,40}$/.test(opts.theme || '') ? opts.theme : 'antigravity';
    const lang = T_LOCALES[opts.lang] ? opts.lang : 'tr';
    const L = transcriptStrings(lang);
    const nonceAttr = opts.nonce ? ` nonce="${opts.nonce}"` : '';
    const csp = opts.cspSource
        ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${opts.cspSource}; style-src ${opts.cspSource} 'unsafe-inline'; img-src ${opts.cspSource} data:; script-src 'nonce-${opts.nonce}';">`
        : '';
    const styles = (opts.dashboardCssUri ? `<link rel="stylesheet" href="${opts.dashboardCssUri}">` : '') +
        (opts.transcriptCssUri ? `<link rel="stylesheet" href="${opts.transcriptCssUri}">` : '');

    const total = dialogue.length;
    const userCount = dialogue.filter(d => d.role === 'user').length;
    const aiCount = dialogue.filter(d => d.role === 'assistant').length;
    const firstDate = dialogue[0]?.date || '';

    const messagesHtml = total === 0
        ? `<div class="empty"><div class="empty-glyph">${svgIcon('chat')}</div><h3>${escapeHtml(L.noneTitle)}</h3><p>${escapeHtml(L.noneDesc)}</p></div>`
        : dialogue.map((msg, i) => {
            const isUser = msg.role === 'user';
            const body = isUser
                ? `<div class="t-prompt">${escapeHtml(msg.text)}</div>`
                : `<div class="t-prose">${renderMarkdownSimple(msg.text)}</div>`;
            return `<article class="t-msg message-card ${isUser ? 'user' : 'assistant'}" id="m${i}" data-role="${msg.role}" data-index="${i}" style="--i:${i}">` +
                `<span class="t-avatar">${svgIcon(isUser ? 'user' : 'orbit', 'sm')}</span>` +
                '<div class="t-body">' +
                    '<div class="t-head">' +
                        `<span class="t-role">${escapeHtml(isUser ? L.you : L.assistant)}</span>` +
                        `<span class="t-when">#${i + 1} · ${escapeHtml(msg.time)}</span>` +
                        `<button class="icon-btn t-copy-msg" data-action="copyMessage" data-index="${i}" title="${escapeHtml(L.copyMessage)}" aria-label="${escapeHtml(L.copyMessage)}">${svgIcon('copy', 'sm')}</button>` +
                    '</div>' +
                    body +
                '</div>' +
            '</article>';
        }).join('');

    const outlineHtml = dialogue
        .map((msg, i) => ({ msg, i }))
        .filter(({ msg }) => msg.role === 'user')
        .map(({ msg, i }) => `<button class="t-outline-item" data-action="jump" data-target="m${i}"><span class="n">#${i + 1}</span><span class="txt">${escapeHtml(msg.text.slice(0, 120))}</span></button>`)
        .join('');

    return `<!DOCTYPE html>
<html lang="${lang}" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${csp}
    <title>${escapeHtml(sessionTitle)}</title>
    ${styles}
</head>
<body class="transcript">
${T_ICONS}
<div class="t-shell">
    <nav class="t-outline" aria-label="${escapeHtml(L.prompts)}">
        <div class="t-outline-title">${escapeHtml(L.prompts)}</div>
        ${outlineHtml}
    </nav>
    <div class="t-main">
        <header class="t-top">
            <div class="t-top-inner">
                <div class="t-title-row">
                    <span class="t-mark">${svgIcon('chat', 'sm')}</span>
                    <h1 class="t-title" title="${escapeHtml(sessionTitle)}">${escapeHtml(sessionTitle)}</h1>
                </div>
                <div class="t-meta">
                    ${firstDate ? `<span class="tag">${escapeHtml(firstDate)}</span>` : ''}
                    <span class="tag">${escapeHtml(fmt(L.messages, { n: total }))}</span>
                    <span class="tag">${escapeHtml(fmt(L.fromYou, { n: userCount }))}</span>
                    <span class="tag accent">${escapeHtml(fmt(L.replies, { n: aiCount }))}</span>
                </div>
                <div class="t-tools">
                    <label class="search">
                        <span class="sr-only">${escapeHtml(L.search)}</span>
                        ${svgIcon('search')}
                        <input type="search" id="searchInput" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(L.search)}">
                        <span class="t-count" id="searchCount"></span>
                    </label>
                    <button class="btn btn-primary" data-action="copyFullDialogue">${svgIcon('copy')}${escapeHtml(L.copyAll)}</button>
                    <button class="btn" data-action="openMarkdownFile">${svgIcon('file-text')}${escapeHtml(L.markdown)}</button>
                    <button class="btn" data-action="openFolder">${svgIcon('folder-open')}${escapeHtml(L.folder)}</button>
                    <button class="btn btn-ghost" data-action="openRawJsonl">${svgIcon('file-code')}${escapeHtml(L.raw)}</button>
                </div>
            </div>
        </header>
        <main class="t-feed" id="messagesList">
            ${messagesHtml}
            <div class="empty t-empty-search" id="noMatch"><div class="empty-glyph">${svgIcon('search')}</div><p>${escapeHtml(L.noMatch)}</p></div>
        </main>
    </div>
</div>
<div id="cockpitToast" role="status" aria-live="polite"></div>
<script type="application/json" id="t-strings">${jsonForScript(L)}</script>
<script type="application/json" id="t-texts">${jsonForScript(dialogue.map(d => d.text))}</script>
<script${nonceAttr}>
(function () {
    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
    const L = JSON.parse(document.getElementById('t-strings').textContent);
    const texts = JSON.parse(document.getElementById('t-texts').textContent);
    document.querySelectorAll('.copy-btn').forEach(b => { b.title = L.copy; b.setAttribute('aria-label', L.copy); });
    const toastEl = document.getElementById('cockpitToast');
    let toastTimer = null;

    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }
    function post(command, extra) {
        if (vscode) vscode.postMessage(Object.assign({ command }, extra || {}));
    }
    function copy(text) {
        const viaExtension = () => post('copyText', { text });
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => toast(L.copied), viaExtension);
        } else {
            viaExtension();
        }
    }

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        switch (el.dataset.action) {
            case 'copyFullDialogue':
                if (vscode) post('copyFullMarkdown'); else toast(L.allCopied);
                break;
            case 'openMarkdownFile': post('openMarkdown'); break;
            case 'openFolder': post('openFolder'); break;
            case 'openRawJsonl': post('openRawJsonl'); break;
            case 'copySnippet': {
                const code = document.getElementById(el.dataset.target);
                if (code) copy(code.innerText);
                break;
            }
            case 'copyMessage': copy(texts[Number(el.dataset.index)] || ''); break;
            case 'jump': {
                const target = document.getElementById(el.dataset.target);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
        }
    });

    // Search hides non-matching messages and highlights matches with the CSS Highlight API.
    const input = document.getElementById('searchInput');
    const counter = document.getElementById('searchCount');
    const noMatch = document.getElementById('noMatch');
    const cards = Array.from(document.querySelectorAll('.t-msg'));
    function matchRanges(root, q) {
        const ranges = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent.toLowerCase();
            let at = text.indexOf(q);
            while (at > -1) {
                const range = new Range();
                range.setStart(node, at);
                range.setEnd(node, at + q.length);
                ranges.push(range);
                at = text.indexOf(q, at + q.length);
            }
        }
        return ranges;
    }
    function search() {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        const ranges = [];
        cards.forEach((card) => {
            const content = card.querySelector('.t-prompt, .t-prose');
            const hit = !q || (content && content.textContent.toLowerCase().includes(q));
            card.hidden = !hit;
            if (hit) shown++;
            if (q && hit && content) ranges.push(...matchRanges(content, q));
        });
        counter.textContent = q ? shown + ' / ' + cards.length : '';
        noMatch.classList.toggle('show', Boolean(q) && shown === 0);
        if (window.CSS && CSS.highlights && typeof Highlight === 'function') {
            CSS.highlights.delete('t-match');
            if (ranges.length) CSS.highlights.set('t-match', new Highlight(...ranges));
        }
    }
    input.addEventListener('input', search);
    window.addEventListener('keydown', (e) => {
        const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
            e.preventDefault();
            input.focus();
            input.select();
        } else if (e.key === 'Escape' && document.activeElement === input && input.value) {
            input.value = '';
            search();
        }
    });

    // Highlight the prompt currently in view in the outline.
    const outline = new Map(Array.from(document.querySelectorAll('.t-outline-item')).map(b => [b.dataset.target, b]));
    if (outline.size && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                outline.forEach(b => b.classList.remove('active'));
                const btn = outline.get(entry.target.id);
                if (btn) btn.classList.add('active');
            });
        }, { rootMargin: '-180px 0px -60% 0px' });
        cards.filter(c => c.dataset.role === 'user').forEach(c => observer.observe(c));
    }
})();
</script>
</body>
</html>`;
}

function openCleanTranscript(transcriptPath, vscodeInstance, extensionUri, opts = {}) {
    // Only real transcript.jsonl files: the viewer writes sohbet_gecmisi.md two folders up.
    if (!isTranscriptFile(transcriptPath)) {
        vscodeInstance.window.showErrorMessage(hostText(vscodeInstance, 'transcriptMissing', { path: transcriptPath }));
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

    const mediaUri = extensionUri ? extensionUri.with({ path: path.posix.join(extensionUri.path, 'media') }) : null;
    const L = transcriptStrings(opts.lang);

    // Create a VS Code Webview panel beside the current active editor/dashboard
    const panel = vscodeInstance.window.createWebviewPanel(
        'antigravityCleanTranscript',
        `${L.tab}: ${sessionTitle.slice(0, 28)}${sessionTitle.length > 28 ? '...' : ''}`,
        vscodeInstance.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: mediaUri ? [mediaUri] : []
        }
    );

    const webview = panel.webview;
    const mediaFile = (file) => (mediaUri && webview.asWebviewUri)
        ? webview.asWebviewUri(mediaUri.with({ path: path.posix.join(mediaUri.path, file) })).toString()
        : '';
    panel.webview.html = generateCleanTranscriptHtml(dialogue, sessionTitle, sessionDir, transcriptPath, {
        theme: opts.theme,
        lang: opts.lang,
        nonce: crypto.randomBytes(16).toString('hex'),
        cspSource: webview.cspSource,
        dashboardCssUri: mediaFile('dashboard.css'),
        transcriptCssUri: mediaFile('transcript.css')
    });

    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'copyText':
                if (message.text) {
                    vscodeInstance.env.clipboard.writeText(message.text);
                    vscodeInstance.window.showInformationMessage('📋 ' + L.copied);
                }
                break;

            case 'copyFullMarkdown':
                vscodeInstance.env.clipboard.writeText(mdContent);
                vscodeInstance.window.showInformationMessage('📋 ' + L.allCopied);
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
