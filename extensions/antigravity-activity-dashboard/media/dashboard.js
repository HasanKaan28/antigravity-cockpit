(function () {
    'use strict';

    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
    let appData = window.__INITIAL_DATA__ || {};
    let currentNavTab = 'projects';
    let currentSubFilter = 'all';
    let isArchiveDrawerOpen = false;
    let isAgDetailsModalOpen = false;
    let isAgPanelCollapsed = false;

    // Load persisted webview state
    const savedState = vscode ? vscode.getState() : null;
    if (savedState) {
        if (typeof savedState.audioEnabled === 'boolean') {
            AudioEngine.enabled = savedState.audioEnabled;
        }
        if (savedState.navTab) {
            currentNavTab = savedState.navTab;
        }
    }

    function saveState() {
        if (vscode) {
            vscode.setState({
                audioEnabled: AudioEngine.enabled,
                navTab: currentNavTab,
                panelCollapsed: isAgPanelCollapsed
            });
        }
    }

    // --- Sound Synthesis Engine ---
    const AudioEngine = {
        ctx: null,
        enabled: true,
        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        playTone(freq, type = 'sine', duration = 0.05, startGain = 0.08) {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(startGain, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + duration);
            } catch {
                // audio context blocked or unsupported
            }
        },
        click() {
            this.playTone(600, 'sine', 0.04, 0.05);
        },
        tab() {
            this.playTone(440, 'sine', 0.06, 0.05);
        },
        favorite() {
            if (!this.enabled) return;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                setTimeout(() => this.playTone(freq, 'triangle', 0.18, 0.07), idx * 45);
            });
        },
        archive() {
            this.playTone(280, 'sine', 0.12, 0.08);
        }
    };

    // --- Space Canvas Particle Engine ---
    (function initSpaceCanvas() {
        const canvas = document.getElementById('spaceCanvas');
        if (!canvas) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            canvas.style.display = 'none';
            return;
        }

        const ctx = canvas.getContext('2d');
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        });

        const stars = [];
        const count = Math.min(70, Math.floor((w * h) / 20000));
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.6 + 0.4,
                alpha: Math.random() * 0.6 + 0.2
            });
        }

        let mouseX = -1000;
        let mouseY = -1000;
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        let animFrameId = null;

        function render() {
            if (document.visibilityState === 'hidden') return;

            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.x += s.vx;
                s.y += s.vy;
                if (s.x < 0) s.x = w;
                if (s.x > w) s.x = 0;
                if (s.y < 0) s.y = h;
                if (s.y > h) s.y = 0;

                ctx.fillStyle = `rgba(0, 242, 254, ${s.alpha})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();

                const dx = mouseX - s.x;
                const dy = mouseY - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.strokeStyle = `rgba(0, 242, 254, ${(1 - dist / 100) * 0.3})`;
                    ctx.lineWidth = 0.7;
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.stroke();
                }
            }
            animFrameId = requestAnimationFrame(render);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (!animFrameId) render();
            } else {
                if (animFrameId) {
                    cancelAnimationFrame(animFrameId);
                    animFrameId = null;
                }
            }
        });

        render();
    })();

    // --- Helpers ---
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(text) {
        const toast = document.getElementById('cockpitToast');
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function updateClock() {
        const el = document.getElementById('hudClock');
        if (el) {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            el.textContent = `${h}:${m}:${s}`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Tab & Filter Switching ---
    function switchNavTab(tabId) {
        AudioEngine.tab();
        currentNavTab = tabId;
        saveState();

        document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));

        const filterBar = document.getElementById('filterBar');
        const tabBtn = document.getElementById('tabBtn' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
        const viewEl = document.getElementById('view' + tabId.charAt(0).toUpperCase() + tabId.slice(1));

        if (tabBtn) tabBtn.classList.add('active');
        if (viewEl) viewEl.classList.add('active');
        if (filterBar) {
            filterBar.style.display = (tabId === 'projects' || tabId === 'github' || tabId === 'sessions') ? 'flex' : 'none';
        }

        if (tabId === 'projects') renderProjects();
        else if (tabId === 'github') renderGithub();
        else if (tabId === 'sessions') renderSessions();
        else if (tabId === 'radar') renderRadar();
    }

    function setSubFilter(filterId) {
        AudioEngine.click();
        currentSubFilter = filterId;
        document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        const chip = document.getElementById('chip' + filterId.charAt(0).toUpperCase() + filterId.slice(1));
        if (chip) chip.classList.add('active');
        renderProjects();
    }

    // --- Renderers ---
    function renderProjects() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        const q = (document.getElementById('projectSearchInput')?.value || '').trim().toLowerCase();
        let list = appData.projects || [];

        list = list.filter(p => {
            if (p.isArchived) return false;
            if (currentSubFilter === 'favorites' && !p.isFavorite) return false;
            if (currentSubFilter === 'git' && !p.isGit) return false;
            if (currentSubFilter === 'graphify' && !p.hasGraphify) return false;
            if (currentSubFilter === 'cbm' && !p.cbmIndexed) return false;

            if (q) {
                const inName = p.name.toLowerCase().includes(q);
                const inPath = p.path.toLowerCase().includes(q);
                const inBranch = (p.branch || '').toLowerCase().includes(q);
                const inLog = (p.gitLog || []).some(l => (l.msg || '').toLowerCase().includes(q));
                return inName || inPath || inBranch || inLog;
            }
            return true;
        });

        if (list.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
                '<div class="icon">🔍</div>' +
                '<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">Proje Bulunamadı</h3>' +
                '<p style="font-size: 13px;">Seçilen filtreye veya arama terimine uyan bir proje yok.</p>' +
                '</div>';
            return;
        }

        let html = '';
        for (const p of list) {
            const favClass = p.isFavorite ? 'favorite' : '';
            const favActive = p.isFavorite ? 'active' : '';
            const lastCommit = (p.gitLog && p.gitLog.length > 0) ? p.gitLog[0] : null;

            html += `<div class="project-card ${favClass}" id="card-${escapeHtml(p.name)}">` +
                '<div class="card-header">' +
                    '<div>' +
                        `<div class="card-name">${escapeHtml(p.name)}</div>` +
                    '</div>' +
                    '<div style="display:flex; gap:6px;">' +
                        `<button class="icon-action-btn fav-btn ${favActive}" aria-label="Favori" title="${p.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" data-action="toggleFav" data-id="${escapeHtml(p.path)}">⭐</button>` +
                        `<button class="icon-action-btn arch-btn" aria-label="Arşivle" title="${p.isArchived ? 'Arşivden Çıkar' : 'Arşivle'}" data-action="toggleArch" data-id="${escapeHtml(p.path)}">📦</button>` +
                    '</div>' +
                '</div>' +
                `<div class="card-path" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>` +
                '<div class="card-badges">' +
                    (p.isGit ? `<span class="badge-pill badge-git">🌿 ${escapeHtml(p.branch)}</span>` : '') +
                    (p.hasUncommitted ? '<span class="badge-pill badge-uncommitted" title="Kaydedilmemiş değişiklikler var">● Değişiklikler Var</span>' : '') +
                    (p.hasGraphify ? '<span class="badge-pill badge-graphify">👑 Graphify</span>' : '') +
                    (p.cbmIndexed ? `<span class="badge-pill badge-cbm" title="Codebase Memory İndeksi">🧠 CBM: ${escapeHtml(p.cbmDbSize || 'Aktif')}</span>` : '') +
                '</div>' +
                (lastCommit ? `<div class="card-commit"><span>📝 ${escapeHtml(lastCommit.msg.slice(0, 75))} <em style="color:var(--text-dark); margin-left:6px;">(${escapeHtml(lastCommit.ago)})</em></span></div>` : '') +
                (!lastCommit && p.sessionNotes ? `<div class="card-commit"><span>${escapeHtml(p.sessionNotes.slice(0, 90))}...</span></div>` : '') +
                '<div class="card-footer">' +
                    `<button class="card-btn primary" data-action="openFolder" data-path="${escapeHtml(p.rawPath)}">🚀 IDE'de Aç</button>` +
                    `<button class="card-btn" data-action="openFolderNewWin" data-path="${escapeHtml(p.rawPath)}" title="Yeni Pencerede Aç">🪟 Yeni</button>` +
                    (p.hasGraphify ? `<button class="card-btn graph-btn" data-action="openGraphify" data-path="${escapeHtml(p.graphifyPath)}">👑 Graphify</button>` : '') +
                    (p.cbmIndexed ? `<button class="card-btn" style="border-color: rgba(168, 85, 247, 0.4); color: #d8b4fe;" data-action="openCbmProject" data-project="${escapeHtml(p.cbmProjectKey || p.name)}" title="CBM Bilgi Grafını Aç (9749)">🧠 Grafı Aç</button>` : '') +
                    `<button class="card-btn" data-action="indexCbm" data-path="${escapeHtml(p.rawPath)}">${p.cbmIndexed ? '🧠 CBM Güncelle' : '🧠 CBM İndeksle'}</button>` +
                '</div>' +
            '</div>';
        }
        grid.innerHTML = html;
    }

    function renderGithub() {
        const grid = document.getElementById('githubGrid');
        if (!grid) return;

        const q = (document.getElementById('projectSearchInput')?.value || '').trim().toLowerCase();
        let list = (appData.githubRepos || []).filter(r => !r.isArchived);

        if (q) {
            list = list.filter(r => r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) || (r.language || '').toLowerCase().includes(q));
        }

        if (list.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
                '<div class="icon">🐙</div>' +
                '<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">GitHub Deposu Bulunamadı</h3>' +
                '<p style="font-size: 13px;">gh CLI kurulu ve giriş yapılmışsa depolarınız burada listelenir.</p>' +
                '</div>';
            return;
        }

        let html = '';
        for (const r of list) {
            const isFav = Boolean(r.isFavorite);
            const favClass = isFav ? 'favorite' : '';
            const favActive = isFav ? 'active' : '';

            html += `<div class="project-card ${favClass}">` +
                '<div class="card-header">' +
                    '<div>' +
                        `<div class="card-name">${escapeHtml(r.name)}</div>` +
                        `<div style="font-size: 11px; color: var(--text-dark); font-family: 'JetBrains Mono', monospace;">${escapeHtml(r.fullName)}</div>` +
                    '</div>' +
                    '<div style="display:flex; gap:6px;">' +
                        `<button class="icon-action-btn fav-btn ${favActive}" aria-label="Favori" title="${isFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" data-action="toggleFav" data-id="${escapeHtml(r.url || r.name)}">⭐</button>` +
                        `<button class="icon-action-btn arch-btn" aria-label="Arşivle" title="Arşivle" data-action="toggleArch" data-id="${escapeHtml(r.name)}">📦</button>` +
                    '</div>' +
                '</div>' +
                `<div class="card-path" style="height:36px; -webkit-line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}</div>` +
                '<div class="card-badges">' +
                    `<span class="badge-pill badge-git">🌿 ${escapeHtml(r.defaultBranch || 'main')}</span>` +
                    (r.language ? `<span class="badge-pill badge-tech">${escapeHtml(r.language)}</span>` : '') +
                    (r.stars > 0 ? `<span class="badge-pill badge-star">⭐ ${r.stars}</span>` : '') +
                    (r.isPrivate ? '<span class="badge-pill" style="background:rgba(236,72,153,0.15); color:var(--neon-pink);">🔒 Gizli</span>' : '<span class="badge-pill" style="background:rgba(0,255,157,0.15); color:var(--neon-emerald);">🌐 Açık</span>') +
                    (r.isCloned ? '<span class="badge-pill" style="background:rgba(56,189,248,0.15); color:var(--neon-blue);">📥 Klonlanmış</span>' : '') +
                '</div>' +
                `<div class="card-commit"><span>🕒 Son güncelleme: ${escapeHtml(r.timeAgo)}</span></div>` +
                '<div class="card-footer">' +
                    `<button class="card-btn primary" data-action="openUrl" data-url="${escapeHtml(r.url)}">🌐 GitHub.com</button>` +
                    (r.isCloned ? (
                        `<button class="card-btn" data-action="openFolder" data-path="${escapeHtml(r.localPath)}">🚀 IDE'de Aç</button>` +
                        `<button class="card-btn" data-action="indexCbm" data-path="${escapeHtml(r.localPath)}">${r.cbmIndexed ? '🧠 CBM Güncelle' : '🧠 CBM İndeksle'}</button>`
                    ) : (
                        `<button class="card-btn" style="background: rgba(168, 85, 247, 0.2); border-color: var(--neon-purple);" data-action="cloneRepo" data-name="${escapeHtml(r.name)}">📦 Klonla</button>`
                    )) +
                '</div>' +
            '</div>';
        }
        grid.innerHTML = html;
    }

    function renderSessions() {
        const listEl = document.getElementById('sessionsList');
        if (!listEl) return;

        const q = (document.getElementById('projectSearchInput')?.value || '').trim().toLowerCase();
        let list = appData.sessions || [];

        if (q) {
            list = list.filter(s => s.prompt.toLowerCase().includes(q) || (s.activeDoc || '').toLowerCase().includes(q));
        }

        if (list.length === 0) {
            listEl.innerHTML = '<div class="empty-state">' +
                '<div class="icon">⚡</div>' +
                '<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">Oturum Kaydı Bulunamadı</h3>' +
                '<p style="font-size: 13px;">Antigravity IDE oturumları burada kronolojik olarak listelenir.</p>' +
                '</div>';
            return;
        }

        let html = '';
        for (const s of list) {
            html += '<div class="session-card">' +
                '<div class="sess-main">' +
                    `<div class="sess-prompt">${escapeHtml(s.prompt)}</div>` +
                    '<div class="sess-meta">' +
                        `<span>🕒 ${escapeHtml(s.time)} (${escapeHtml(s.timeAgo)})</span>` +
                        `<span>🛠️ ${s.toolCount} Araç Çağrısı</span>` +
                        (s.activeDoc ? `<span style="color: var(--neon-cyan);">📄 ${escapeHtml(s.activeDoc.split('/').pop())}</span>` : '') +
                    '</div>' +
                '</div>' +
                '<div class="sess-actions">' +
                    `<button class="card-btn primary" data-action="openTranscript" data-path="${escapeHtml(s.transcriptPath)}">📜 Transkript</button>` +
                    `<button class="card-btn" data-action="openSessionFolder" data-path="${escapeHtml(s.path)}">📁 Klasör</button>` +
                '</div>' +
            '</div>';
        }
        listEl.innerHTML = html;
    }

    function renderRadar() {
        const cbmList = document.getElementById('radarCbmList');
        const graphList = document.getElementById('radarGraphList');

        if (cbmList) {
            let html = '';
            const allCbm = [];
            const seenKeys = new Set();

            if (appData.cbm && Array.isArray(appData.cbm.indexedProjects)) {
                for (const item of appData.cbm.indexedProjects) {
                    const k = item.key.toLowerCase();
                    if (!seenKeys.has(k)) {
                        allCbm.push({
                            name: item.key,
                            size: item.sizeMb,
                            projectKey: item.key
                        });
                        seenKeys.add(k);
                    }
                }
            }

            for (const p of (appData.projects || [])) {
                if (p.cbmIndexed) {
                    const k = (p.cbmProjectKey || p.name).toLowerCase();
                    if (!seenKeys.has(k)) {
                        allCbm.push({
                            name: p.name,
                            size: p.cbmDbSize || 'Aktif',
                            projectKey: p.cbmProjectKey || p.name
                        });
                        seenKeys.add(k);
                    }
                }
            }

            for (const item of allCbm) {
                html += '<li class="radar-item" style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">' +
                    '<div style="display: flex; align-items: center; gap: 8px; min-width: 0;">' +
                        '<span style="font-size: 14px;">🧠</span>' +
                        `<span style="color: #fff; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>` +
                    '</div>' +
                    '<div style="display: flex; align-items: center; gap: 8px; shrink-0;">' +
                        `<span style="color: var(--neon-cyan); font-size: 12px; font-weight: 600;">${escapeHtml(item.size)}</span>` +
                        `<button class="chip-btn" style="padding: 4px 10px; font-size: 11px; background: rgba(0, 242, 254, 0.15); border-color: var(--neon-cyan); color: #fff;" data-action="openCbmProject" data-project="${escapeHtml(item.projectKey)}">Grafı Aç</button>` +
                    '</div>' +
                '</li>';
            }
            if (!html) html = '<li class="radar-item" style="opacity: 0.5;">Henüz CBM verisi yok.</li>';
            cbmList.innerHTML = html;
        }

        if (graphList) {
            let html = '';
            const graphs = (appData.projects || []).filter(p => p.hasGraphify);
            for (const p of graphs) {
                html += '<li class="radar-item">' +
                    `<span style="color: #fff; font-weight: 600;">${escapeHtml(p.name)}</span>` +
                    `<button class="chip-btn" style="padding: 4px 10px; font-size: 11px;" data-action="openGraphify" data-path="${escapeHtml(p.graphifyPath)}">Edge ile Aç</button>` +
                '</li>';
            }
            if (!html) html = '<li class="radar-item" style="opacity: 0.5;">Henüz Graphify haritası yok.</li>';
            graphList.innerHTML = html;
        }
    }

    function renderArchive() {
        const grid = document.getElementById('archiveGrid');
        const badge = document.getElementById('archCountBadge');
        if (!grid) return;

        const archivedProjects = (appData.projects || []).filter(p => p.isArchived);
        const archivedGithub = (appData.githubRepos || []).filter(r => r.isArchived);
        const totalArchived = archivedProjects.length + archivedGithub.length;

        if (badge) badge.textContent = totalArchived;

        if (totalArchived === 0) {
            grid.innerHTML = '<div class="empty-archive">📦 Arşivlenmiş herhangi bir depo veya proje bulunmuyor.</div>';
            return;
        }

        let html = '';
        for (const p of archivedProjects) {
            html += '<div class="archived-card">' +
                '<div class="archived-info">' +
                    `<div class="archived-title">📁 ${escapeHtml(p.name)} <span class="archived-type local">Yerel</span></div>` +
                    `<div class="archived-sub" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>` +
                '</div>' +
                '<div class="archived-actions">' +
                    `<button class="unarch-btn" data-action="toggleArch" data-id="${escapeHtml(p.path)}">↩️ Geri Yükle</button>` +
                    `<button class="card-btn" style="padding: 6px 10px; font-size: 11px;" data-action="openFolder" data-path="${escapeHtml(p.rawPath)}">🚀 Aç</button>` +
                '</div>' +
            '</div>';
        }

        for (const r of archivedGithub) {
            html += '<div class="archived-card">' +
                '<div class="archived-info">' +
                    `<div class="archived-title">🐙 ${escapeHtml(r.name)} <span class="archived-type gh">GitHub</span></div>` +
                    `<div class="archived-sub" title="${escapeHtml(r.fullName)}">${escapeHtml(r.fullName)}</div>` +
                '</div>' +
                '<div class="archived-actions">' +
                    `<button class="unarch-btn" data-action="toggleArch" data-id="${escapeHtml(r.name)}">↩️ Geri Yükle</button>` +
                    `<button class="card-btn" style="padding: 6px 10px; font-size: 11px;" data-action="openUrl" data-url="${escapeHtml(r.url)}">🌐 GitHub</button>` +
                '</div>' +
            '</div>';
        }

        grid.innerHTML = html;
    }

    // --- Antigravity Panel & Gauges ---
    function renderAntigravityPanel(panelData) {
        if (!panelData) return;

        const isOnline = panelData.status === 'ok';
        const user = panelData.user || {};
        const tierName = user.tier || (isOnline ? 'Google AI Pro' : 'Çevrimdışı / Önbellek');

        const tierEl = document.getElementById('agUserTier');
        if (tierEl) {
            tierEl.textContent = tierName;
            tierEl.style.color = isOnline ? 'var(--neon-cyan)' : 'var(--text-dark)';
        }

        const modalTier = document.getElementById('modalUserTier');
        if (modalTier) modalTier.textContent = tierName;

        const modalEmail = document.getElementById('modalUserEmail');
        if (modalEmail) modalEmail.textContent = user.email || (isOnline ? 'Aktif Hesap' : 'Bağlı Değil');

        const tokens = panelData.tokenUsage || {};
        const promptCredits = tokens.promptCredits || {};
        const flowCredits = tokens.flowCredits || {};
        const pAvail = promptCredits.available ?? '—';
        const pMonthly = tokens.formatted?.promptMonthly ?? '—';
        const fAvail = flowCredits.available ?? '—';
        const fMonthly = tokens.formatted?.flowMonthly ?? '—';

        const modalPrompt = document.getElementById('modalPromptCredits');
        if (modalPrompt) modalPrompt.textContent = `${pAvail} / ${pMonthly}`;
        const modalFlow = document.getElementById('modalFlowCredits');
        if (modalFlow) modalFlow.textContent = `${fAvail} / ${fMonthly}`;

        const groups = panelData.groups || [];
        const gemini = groups.find(g => g.id === 'gemini') || { remaining: null, resetTime: '—' };
        const claude = groups.find(g => g.id === 'non-google' || g.id === 'claude') || { remaining: null, resetTime: '—' };

        updateAgGauges(gemini, claude, isOnline);
    }

    function updateAgGauges(gemini, claude, isOnline) {
        const CIRCUMFERENCE = 100.53;

        // Gemini
        const gPct = (gemini.remaining !== null && typeof gemini.remaining !== 'undefined') ? Math.round(Number(gemini.remaining)) : null;
        const geminiArc = document.getElementById('geminiGaugeArc');
        if (geminiArc) {
            const gOffset = gPct !== null ? CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, gPct)) / 100) : CIRCUMFERENCE;
            geminiArc.style.strokeDashoffset = gOffset;
        }

        const geminiPct = document.getElementById('geminiPctVal');
        if (geminiPct) geminiPct.textContent = gPct !== null ? gPct : '—';

        const geminiTimer = document.getElementById('geminiTimerVal');
        if (geminiTimer) geminiTimer.textContent = gemini.resetTime || (isOnline ? 'Hazır' : 'Bağlantı Yok');

        // Claude
        const cPct = (claude.remaining !== null && typeof claude.remaining !== 'undefined') ? Math.round(Number(claude.remaining)) : null;
        const claudeArc = document.getElementById('claudeGaugeArc');
        if (claudeArc) {
            const cOffset = cPct !== null ? CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, cPct)) / 100) : CIRCUMFERENCE;
            claudeArc.style.strokeDashoffset = cOffset;
        }

        const claudePct = document.getElementById('claudePctVal');
        if (claudePct) claudePct.textContent = cPct !== null ? cPct : '—';

        const claudeTimer = document.getElementById('claudeTimerVal');
        if (claudeTimer) claudeTimer.textContent = claude.resetTime || (isOnline ? 'Hazır' : 'Bağlantı Yok');

        // Collapsed summary indicator
        const summary = document.getElementById('agCollapsedSummary');
        if (summary) {
            summary.innerHTML = isOnline
                ? `<span style="color: #40C4FF; font-weight: 700;">Gemini: ${gPct}% (${gemini.resetTime || '—'})</span><span style="opacity: 0.4;">|</span><span style="color: #FFAB40; font-weight: 700;">Claude: ${cPct}% (${claude.resetTime || '—'})</span>`
                : '<span style="color: var(--text-dark);">Antigravity Panel: Çevrimdışı</span>';
        }
    }

    function updateDashboardUI(data) {
        if (!data) return;
        appData = data;

        const pCount = (data.projects || []).filter(p => !p.isArchived).length;
        const ghCount = (data.githubRepos || []).filter(r => !r.isArchived).length;
        const sessCount = (data.sessions || []).length;

        const bProj = document.getElementById('badgeProjCount');
        if (bProj) bProj.textContent = pCount;
        const bGh = document.getElementById('badgeGhCount');
        if (bGh) bGh.textContent = ghCount;
        const bSess = document.getElementById('badgeSessCount');
        if (bSess) bSess.textContent = sessCount;

        const favCountEl = document.getElementById('favChipCount');
        if (favCountEl) favCountEl.textContent = data.favCount || 0;

        const archBadge = document.getElementById('archCountBadge');
        if (archBadge) archBadge.textContent = data.archCount || 0;

        const startupIcon = document.getElementById('startupIcon');
        if (startupIcon) startupIcon.textContent = data.openOnStartup ? '⚡ Açık' : '⚪ Kapalı';

        const audioIcon = document.getElementById('audioIcon');
        if (audioIcon) audioIcon.textContent = AudioEngine.enabled ? '🔊' : '🔇';

        if (data.cbm) {
            const teleCbm = document.getElementById('teleCbm');
            if (teleCbm) teleCbm.textContent = `${data.cbm.indexedProjectsCount} Repo // ${data.cbm.totalDbSizeMb}`;
        }
        if (data.system) {
            const teleGpu = document.getElementById('teleGpu');
            if (teleGpu) teleGpu.textContent = data.system.gpu || 'GPU Algılanmadı';
            const teleModel = document.getElementById('teleModel');
            if (teleModel) teleModel.textContent = data.system.localModel || 'Ollama Çevrimdışı';

            const isOllamaOn = Boolean(data.system.ollamaOnline);
            const teleActionBtn = document.getElementById('teleOllamaActionBtn');
            const teleActionText = document.getElementById('teleOllamaActionText');
            const teleActionIcon = document.getElementById('teleOllamaActionIcon');
            const hudOllamaBtn = document.getElementById('hudOllamaBtn');
            const hudOllamaText = document.getElementById('hudOllamaText');

            if (teleActionBtn && teleActionText && teleActionIcon) {
                if (isOllamaOn) {
                    teleActionBtn.className = 'tele-action-btn stop';
                    teleActionText.textContent = 'Kapat';
                    teleActionIcon.textContent = '⏹️';
                    teleActionBtn.title = 'Ollama yerel kod motorunu durdur ve GPU belleğini boşalt';
                } else {
                    teleActionBtn.className = 'tele-action-btn start';
                    teleActionText.textContent = 'Başlat';
                    teleActionIcon.textContent = '⚡';
                    teleActionBtn.title = 'Ollama yerel kod motorunu (Qwen 2.5 Coder 14B) başlat';
                }
            }

            if (hudOllamaBtn && hudOllamaText) {
                const isBattery = data.system.power && !data.system.power.onAc;
                if (isBattery) {
                    hudOllamaBtn.className = 'hud-btn ollama-eco';
                    hudOllamaText.textContent = `Ollama: Eko Mod (Pilde %${data.system.power.percent})`;
                    hudOllamaBtn.title = 'Cihaz pilde çalıştığı için batarya ömrü ve GPU gücünü korumak amacıyla Ollama Eko Modunda (pasif).';
                } else if (isOllamaOn) {
                    hudOllamaBtn.className = 'hud-btn ollama-on';
                    hudOllamaText.textContent = 'Ollama: Aktif';
                    hudOllamaBtn.title = 'Ollama yerel kod motoru aktif (Prize Bağlı)';
                } else {
                    hudOllamaBtn.className = 'hud-btn ollama-off';
                    hudOllamaText.textContent = 'Ollama: Kapalı';
                    hudOllamaBtn.title = 'Ollama kapalı';
                }
            }
        }

        renderProjects();
        renderGithub();
        renderSessions();
        renderRadar();
        renderArchive();
        renderAntigravityPanel(data.panel);
    }

    // --- Action Dispatcher ---
    function handleAction(action, el, event) {
        switch (action) {
            case 'startNewChat':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openChat' });
                showToast('💬 Yeni Sohbet başlatılıyor...');
                break;

            case 'toggleOllama':
                AudioEngine.click();
                showToast('⚡ Ollama durumu değiştiriliyor...');
                if (vscode) vscode.postMessage({ command: 'toggleOllama' });
                break;

            case 'openCbmProject': {
                AudioEngine.click();
                const projectKey = el.getAttribute('data-project');
                if (vscode) vscode.postMessage({ command: 'openCbmUi', project: projectKey });
                else window.open(`http://localhost:9749/?tab=graph&project=${encodeURIComponent(projectKey)}`, '_blank');
                break;
            }

            case 'openCbmWebUi':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openCbmUi' });
                else window.open('http://localhost:9749', '_blank');
                break;

            case 'openGraphifyRoot': {
                AudioEngine.click();
                const p = (appData.projects || []).find(x => x.hasGraphify);
                if (p && p.graphifyPath) {
                    if (vscode) vscode.postMessage({ command: 'openGraphify', path: p.graphifyPath });
                    else window.open('file:///' + p.graphifyPath, '_blank');
                } else {
                    showToast('Mevcut projelerde Graphify haritası bulunamadı.');
                }
                break;
            }

            case 'toggleAudio':
                AudioEngine.enabled = !AudioEngine.enabled;
                saveState();
                {
                    const icon = document.getElementById('audioIcon');
                    if (icon) icon.textContent = AudioEngine.enabled ? '🔊' : '🔇';
                }
                showToast(AudioEngine.enabled ? '🔊 Cyber Ses Efektleri Açıldı' : '🔇 Ses Efektleri Kapatıldı');
                break;

            case 'refresh':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'refresh' });
                showToast('🔄 Veriler yenileniyor...');
                break;

            case 'toggleStartup': {
                AudioEngine.click();
                const newVal = !appData.openOnStartup;
                appData.openOnStartup = newVal;
                const icon = document.getElementById('startupIcon');
                if (icon) icon.textContent = newVal ? '⚡ Açık' : '⚪ Kapalı';
                if (vscode) vscode.postMessage({ command: 'toggleStartup', value: newVal });
                break;
            }

            case 'switchTab': {
                const tab = el.dataset.tab;
                if (tab) switchNavTab(tab);
                break;
            }

            case 'setSubFilter': {
                const filter = el.dataset.filter;
                if (filter) setSubFilter(filter);
                break;
            }

            case 'toggleFav': {
                const id = el.dataset.id;
                if (!id) break;
                AudioEngine.favorite();
                if (vscode) vscode.postMessage({ command: 'toggleFavorite', id });
                break;
            }

            case 'toggleArch': {
                const id = el.dataset.id;
                if (!id) break;
                AudioEngine.archive();
                if (vscode) vscode.postMessage({ command: 'toggleArchive', id });
                break;
            }

            case 'openFolder': {
                const fPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openFolder', path: fPath, newWindow: false });
                break;
            }

            case 'openFolderNewWin': {
                const fPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openFolder', path: fPath, newWindow: true });
                break;
            }

            case 'openGraphify': {
                const gPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openGraphify', path: gPath });
                else window.open('file:///' + gPath, '_blank');
                break;
            }

            case 'indexCbm': {
                const tPath = el.dataset.path;
                AudioEngine.click();
                el.style.opacity = '0.6';
                el.innerHTML = '<span>⏳</span> İndeksleniyor...';
                if (vscode) vscode.postMessage({ command: 'indexInCbm', path: tPath });
                showToast('🧠 CBM İndeksleme başlatıldı...');
                break;
            }

            case 'cloneRepo': {
                const repoName = el.dataset.name;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'cloneGithubRepo', name: repoName });
                showToast(`📥 ${repoName} klonlanıyor...`);
                break;
            }

            case 'openUrl': {
                const url = el.dataset.url;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openExternalUrl', url });
                else window.open(url, '_blank');
                break;
            }

            case 'openTranscript': {
                const fPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openTranscript', path: fPath });
                else if (fPath) window.open('file:///' + fPath, '_blank');
                break;
            }

            case 'openFile': {
                const fPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openFile', path: fPath });
                break;
            }

            case 'openSessionFolder': {
                const fPath = el.dataset.path;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openSessionFolder', path: fPath });
                break;
            }

            case 'submitCustomRepo': {
                const input = document.getElementById('customGhInput');
                if (!input || !input.value.trim()) break;
                const val = input.value.trim();
                input.value = '';
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'addCustomGithubRepo', text: val });
                break;
            }

            case 'toggleArchiveDrawer':
                AudioEngine.click();
                isArchiveDrawerOpen = !isArchiveDrawerOpen;
                {
                    const content = document.getElementById('archiveDrawerContent');
                    const bar = document.querySelector('.archive-drawer-bar');
                    const hint = document.getElementById('archiveToggleHint');
                    if (content) content.style.display = isArchiveDrawerOpen ? 'block' : 'none';
                    if (bar) bar.classList.toggle('open', isArchiveDrawerOpen);
                    if (hint) hint.textContent = isArchiveDrawerOpen ? 'Gizlemek için tıkla' : 'Genişlet / Gizle';
                    if (isArchiveDrawerOpen) renderArchive();
                }
                break;

            case 'toggleAgDetailsModal':
                AudioEngine.click();
                isAgDetailsModalOpen = !isAgDetailsModalOpen;
                {
                    const modal = document.getElementById('agDetailsModal');
                    if (modal) modal.classList.toggle('open', isAgDetailsModalOpen);
                }
                break;

            case 'closeAgDetailsModal':
                if (event.target.id === 'agDetailsModal') {
                    isAgDetailsModalOpen = false;
                    const modal = document.getElementById('agDetailsModal');
                    if (modal) modal.classList.remove('open');
                }
                break;

            case 'toggleAgCollapse':
                AudioEngine.click();
                isAgPanelCollapsed = !isAgPanelCollapsed;
                saveState();
                {
                    const body = document.getElementById('agPanelBody');
                    const icon = document.getElementById('agCollapseIcon');
                    const summary = document.getElementById('agCollapsedSummary');
                    if (body) body.style.display = isAgPanelCollapsed ? 'none' : 'block';
                    if (icon) icon.textContent = isAgPanelCollapsed ? '▸' : '▾';
                    if (summary) summary.style.display = isAgPanelCollapsed ? 'inline-flex' : 'none';
                }
                break;

            case 'openAgSettings':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openAgSettings' });
                break;

            case 'openAgSidebar':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openAgSidebar' });
                break;

            case 'refreshAgQuota': {
                AudioEngine.click();
                const btn = document.getElementById('agRefreshBtn');
                if (btn) btn.classList.add('spinning');
                if (vscode) vscode.postMessage({ command: 'refreshAgQuota', isManual: true });
                setTimeout(() => {
                    if (btn) btn.classList.remove('spinning');
                }, 1000);
                break;
            }
        }
    }

    // --- Global Event Delegation ---
    document.addEventListener('click', (e) => {
        const stopEl = e.target.closest('[data-stop-propagation="true"]');
        if (stopEl && e.target === stopEl) {
            e.stopPropagation();
            return;
        }

        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
            const action = actionEl.dataset.action;
            handleAction(action, actionEl, e);
        }
    });

    // --- Search Input Listener ---
    const searchInput = document.getElementById('projectSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (currentNavTab === 'projects') renderProjects();
            else if (currentNavTab === 'github') renderGithub();
            else if (currentNavTab === 'sessions') renderSessions();
        });
    }

    // --- Keyboard Shortcut (Ctrl + K) ---
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchInput) {
                switchNavTab('projects');
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // --- Message Listener from Extension ---
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) return;

        if (message.command === 'updateData') {
            updateDashboardUI(message.data);
        } else if (message.command === 'updateAgPanel') {
            if (message.panel) {
                renderAntigravityPanel(message.panel);
            }
        }
    });

    // --- Initial Render ---
    updateDashboardUI(appData);

    // Initial tab switch if restored
    if (currentNavTab !== 'projects') {
        switchNavTab(currentNavTab);
    }
})();
