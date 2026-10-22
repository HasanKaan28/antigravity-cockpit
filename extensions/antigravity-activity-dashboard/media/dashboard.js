(function () {
    'use strict';

    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
    let appData = window.__INITIAL_DATA__ || {};
    let currentNavTab = 'projects';
    let currentSubFilter = 'all';
    let isArchiveDrawerOpen = false;
    let isAgDetailsModalOpen = false;
    let isAgPanelCollapsed = false;

    // --- Internationalization (i18n) Subsystem ---
    const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'es', 'fr', 'zh', 'ja'];
    const LOCALE_NAMES = {
        auto: 'Otomatik (IDE Dili)',
        en: 'English',
        tr: 'Türkçe',
        de: 'Deutsch',
        es: 'Español',
        fr: 'Français',
        zh: '简体中文',
        ja: '日本語'
    };
    const LOCALE_FLAGS = {
        auto: '🌐',
        en: '🇺🇸',
        tr: '🇹🇷',
        de: '🇩🇪',
        es: '🇪🇸',
        fr: '🇫🇷',
        zh: '🇨🇳',
        ja: '🇯🇵'
    };

    const LOCALES = {
        en: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': 'New Chat',
            'hud.newChatTitle': 'Start New Antigravity AI Chat',
            'hud.refresh': 'Refresh',
            'hud.refreshTitle': 'Refresh Dashboard Data',
            'hud.settings': 'Settings',
            'hud.settingsTitle': 'Cockpit Settings',
            'telemetry.gpu': 'GPU ARCHITECTURE',
            'telemetry.quota': 'GEMINI TOKEN & QUOTA',
            'telemetry.github': 'GITHUB SYNC',
            'telemetry.remaining': 'Remaining:',
            'telemetry.live': 'Live',
            'telemetry.weekly': 'Weekly:',
            'nav.projects': 'Projects & Workspaces',
            'nav.github': 'My GitHub Repos',
            'nav.sessions': 'Recent Activity & Sessions',
            'nav.radar': 'Graphify Knowledge Radar',
            'filter.searchPlaceholder': 'Search project, repo, or commit... (Ctrl + K)',
            'filter.all': 'All',
            'filter.favorites': 'Favorites',
            'filter.git': 'Git Repos',
            'filter.graphify': 'Graphify Ready',
            'filter.archive': 'Archive Drawer',
            'projects.emptyTitle': 'No Projects Found',
            'projects.emptyDesc': 'No project matches the selected filter or search query.',
            'projects.graph': 'Graph',
            'projects.ide': 'Open in IDE',
            'projects.github': 'GitHub',
            'projects.clone': 'Clone',
            'projects.local': 'Local',
            'projects.unarchive': 'Restore',
            'projects.open': 'Open',
            'projects.archiveEmpty': 'No archived repositories or projects.',
            'sessions.emptyTitle': 'No Sessions Found',
            'sessions.emptyDesc': 'Antigravity IDE conversations will appear here chronologically.',
            'sessions.transcript': 'Transcript',
            'sessions.folder': 'Folder',
            'sessions.toolCalls': 'Tool Calls',
            'radar.maps': 'Maps',
            'radar.empty': 'No Graphify maps detected yet.',
            'radar.openEdge': 'Open in Edge',
            'nav.skills': 'Agent Skills & Arsenal',
            'skills.heroTitle': 'Antigravity Agent Skills & Arsenal',
            'skills.heroDesc': '21 elite capabilities powering autonomous coding, architecture review, UI design, and local AI delegation.',
            'skills.activeSkills': 'Active Skills',
            'skills.searchPlaceholder': 'Search skill, trigger, or description...',
            'skills.catArchitecture': 'Architecture',
            'skills.catDesign': 'Design & UI',
            'skills.catQuality': 'Code Quality',
            'skills.catOptimization': 'Optimization & Memory',
            'skills.catLocalAi': 'Local AI & Python',
            'skills.promptCopied': 'Trigger prompt for {name} copied!',
            'skills.rulesFile': 'Rule File',
            'skills.startChat': 'Start Chat',
            'skills.copyHint': 'Click to copy trigger prompt',
            'skills.emptyTitle': 'No Skills Found',
            'skills.emptyDesc': 'No skill matches your search or category filter.',
            'settings.modalTitle': 'Cockpit Settings',
            'settings.modalSubtitle': 'Appearance, language, startup preferences, and local engine configuration',
            'settings.close': 'Close',
            'settings.langTitle': 'Interface Language',
            'settings.langDesc': 'Select your preferred display language. Defaults to Antigravity IDE language.',
            'settings.themeTitle': 'Theme Selection',
            'settings.widgetsTitle': 'Hub & Component Visibility (Dashboard Customization)',
            'settings.widgetsDesc': 'Choose which cards, tabs, and panels to display. Toggle off any unused items.',
            'settings.widgetsAllOpen': 'All Visible',
            'settings.widgetsAllHidden': 'All Hidden',
            'settings.widgetsPartial': '{count} Visible',
            'settings.subgroupTele': 'Telemetry & Top Cards',
            'settings.subgroupTabs': 'Main Navigation Tabs',
            'settings.subgroupPanels': 'Information Panels',
            'settings.startupTitle': 'Startup & Notification Preferences',
            'settings.startupAuto': 'Auto-Launch on IDE Startup',
            'settings.startupAutoDesc': 'Automatically open the Cockpit when Antigravity IDE launches.',
            'settings.sfx': 'Interface Sound Effects (SFX)',
            'settings.sfxDesc': 'Subtle futuristic audio feedback when changing themes or clicking buttons.',
            'settings.localAiTitle': 'Extra: Local Code & Model Engine',
            'settings.localAiPill': 'Local AI',
            'settings.localAiDesc': 'Autonomous local coding engine (e.g. Ollama, LM Studio) on local GPU / NPU.',
            'settings.startEngine': 'Start Engine',
            'settings.stopEngine': 'Stop Engine',
            'settings.testConn': 'Test Connection',
            'settings.refreshConn': 'Refresh Link',
            'settings.radarTitle': 'Architecture Observatory & Tools',
            'settings.radarDesc': 'Opens interactive call and dependency graph in Microsoft Edge.',
            'settings.openMap': 'Open Map',
            'settings.refreshAll': 'Refresh All Data',
            'settings.done': 'Done',
            'toast.langChanged': 'Language updated: {lang}',
            'toast.themeChanged': 'Theme set to: {theme}',
            'toast.audioOn': 'Interface SFX Enabled',
            'toast.audioOff': 'Interface SFX Muted',
            'toast.startupOn': 'Auto-startup enabled',
            'toast.startupOff': 'Auto-startup disabled',
            'toast.copied': 'Copied to clipboard',
            'power.acOnline': 'AC Power Online',
            'power.batteryEco': 'Battery Eco Mode',
            'power.batteryDesc': 'Device running on battery ({percent}%). Local engine is kept in Eco Mode.',
            'lang.auto': 'Auto (IDE Language)',
            'lang.autoSub': 'System & Antigravity IDE default'
        },
        tr: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': 'Yeni Sohbet',
            'hud.newChatTitle': 'Yeni Antigravity AI Sohbeti Başlat',
            'hud.refresh': 'Yenile',
            'hud.refreshTitle': 'Dashboard Verilerini Yenile',
            'hud.settings': 'Ayarlar',
            'hud.settingsTitle': 'Kontrol Paneli Ayarları',
            'telemetry.gpu': 'GPU MİMARİSİ',
            'telemetry.quota': 'GEMINI TOKEN & KOTA',
            'telemetry.github': 'GITHUB SENKRONİZASYONU',
            'telemetry.remaining': 'Kalan:',
            'telemetry.live': 'Canlı',
            'telemetry.weekly': 'Haftalık:',
            'nav.projects': 'Projeler & Çalışma Alanları',
            'nav.github': 'GitHub Repolarım',
            'nav.sessions': 'Son Yapılanlar & Oturumlar',
            'nav.radar': 'Graphify Bilgi Radarı',
            'filter.searchPlaceholder': 'Proje, repo veya commit ara... (Ctrl + K)',
            'filter.all': 'Tümü',
            'filter.favorites': 'Favoriler',
            'filter.git': 'Git Repoları',
            'filter.graphify': 'Graphify Hazır',
            'filter.archive': 'Arşiv Çekmecesi',
            'projects.emptyTitle': 'Proje Bulunamadı',
            'projects.emptyDesc': 'Seçilen filtreye veya arama terimine uyan bir proje yok.',
            'projects.graph': 'Grafik',
            'projects.ide': 'IDE\'de Aç',
            'projects.github': 'GitHub',
            'projects.clone': 'Klonla',
            'projects.local': 'Yerel',
            'projects.unarchive': 'Geri Yükle',
            'projects.open': 'Aç',
            'projects.archiveEmpty': 'Arşivlenmiş herhangi bir depo veya proje bulunmuyor.',
            'sessions.emptyTitle': 'Oturum Kaydı Bulunamadı',
            'sessions.emptyDesc': 'Antigravity IDE oturumları burada kronolojik olarak listelenir.',
            'sessions.transcript': 'Transkript',
            'sessions.folder': 'Klasör',
            'sessions.toolCalls': 'Araç Çağrısı',
            'radar.maps': 'Harita',
            'radar.empty': 'Henüz Graphify haritası yok.',
            'radar.openEdge': 'Edge ile Aç',
            'nav.skills': 'Agent Becerileri & Arsenal',
            'skills.heroTitle': 'Antigravity Agent Becerileri & Arsenal',
            'skills.heroDesc': 'Yapay zeka ajanınızın kodlama, mimari analiz, UI tasarımı ve yerel model delegasyonunda kullandığı 21 özel yetenek.',
            'skills.activeSkills': 'Aktif Beceri',
            'skills.searchPlaceholder': 'Beceri, tetikleyici veya açıklama ara...',
            'skills.catArchitecture': 'Mimari',
            'skills.catDesign': 'Tasarım & UI',
            'skills.catQuality': 'Kod Kalitesi',
            'skills.catOptimization': 'Optimizasyon & Bellek',
            'skills.catLocalAi': 'Yerel AI & Python',
            'skills.promptCopied': '{name} tetikleyici promptu panoya kopyalandı!',
            'skills.rulesFile': 'Kural Dosyası',
            'skills.startChat': 'Sohbet Başlat',
            'skills.copyHint': 'Tetikleyici promptu kopyalamak için tıkla',
            'skills.emptyTitle': 'Beceri Bulunamadı',
            'skills.emptyDesc': 'Seçilen filtreye veya aramaya uygun beceri bulunamadı.',
            'settings.modalTitle': 'Kontrol Paneli Ayarları',
            'settings.modalSubtitle': 'Görünüm, dil, başlangıç tercihleri ve yerel motor yapılandırması',
            'settings.close': 'Kapat',
            'settings.langTitle': 'Dil Seçimi / Language',
            'settings.langDesc': 'Arayüz dilini seçin. Yeni kurulumlarda Antigravity IDE diline otomatik uyum sağlar.',
            'settings.themeTitle': 'Tema Seçimi',
            'settings.widgetsTitle': 'Hub & Bileşen Görünürlüğü (Dashboard Özelleştirme)',
            'settings.widgetsDesc': 'Ana ekranda görünmesini istediğiniz kartları, sekmeleri ve panelleri seçin.',
            'settings.widgetsAllOpen': 'Tümü Açık',
            'settings.widgetsAllHidden': 'Tümü Gizli',
            'settings.widgetsPartial': '{count} Açık',
            'settings.subgroupTele': 'Telemetri & Üst Kartlar',
            'settings.subgroupTabs': 'Ana Gezinme Sekmeleri',
            'settings.subgroupPanels': 'Bilgi Panelleri',
            'settings.startupTitle': 'Başlangıç & Bildirim Tercihleri',
            'settings.startupAuto': 'IDE Açıldığında Otomatik Göster',
            'settings.startupAutoDesc': 'Antigravity IDE veya VS Code açıldığında kontrol paneli otomatik olarak açılsın.',
            'settings.sfx': 'Arayüz Ses Efektleri (SFX)',
            'settings.sfxDesc': 'Tema değiştirildiğinde veya butonlara tıklandığında hafif sesli geri bildirim ver.',
            'settings.localAiTitle': 'Ekstra: Yerel Kod & Model Motoru',
            'settings.localAiPill': 'Yerel AI',
            'settings.localAiDesc': 'Bilgisayarınızda algılanan yerel motor üzerinden bağımsız kodlama ve algoritma çalıştırma.',
            'settings.startEngine': 'Motoru Başlat',
            'settings.stopEngine': 'Motoru Durdur',
            'settings.testConn': 'Bağlantıyı Sına',
            'settings.refreshConn': 'Bağlantıyı Yenile',
            'settings.radarTitle': 'Mimari Gözlemci & Araçlar',
            'settings.radarDesc': 'Projenin interaktif çağrı ve modül haritasını Microsoft Edge tarayıcısında açar.',
            'settings.openMap': 'Haritayı Aç',
            'settings.refreshAll': 'Tüm Verileri Yenile',
            'settings.done': 'Tamam',
            'toast.langChanged': 'Dil değiştirildi: {lang}',
            'toast.themeChanged': 'Tema ayarlandı: {theme}',
            'toast.audioOn': 'Ses Efektleri Açıldı',
            'toast.audioOff': 'Ses Efektleri Kapatıldı',
            'toast.startupOn': 'Açılışta başlatma aktif',
            'toast.startupOff': 'Açılışta başlatma devre dışı',
            'toast.copied': 'Panoya kopyalandı',
            'power.acOnline': 'Priz / Şarj Bağlı',
            'power.batteryEco': 'Pil Modu (Eko)',
            'power.batteryDesc': 'Cihaz pilde (%{percent}). Batarya koruması için yerel motor Eko Modunda tutuluyor.',
            'lang.auto': 'Otomatik (IDE Dili)',
            'lang.autoSub': 'Sistem ve IDE varsayılanı'
        },
        de: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': 'Neuer Chat',
            'hud.newChatTitle': 'Neuen Antigravity KI-Chat starten',
            'hud.refresh': 'Aktualisieren',
            'hud.refreshTitle': 'Dashboard-Daten aktualisieren',
            'hud.settings': 'Einstellungen',
            'hud.settingsTitle': 'Cockpit-Einstellungen',
            'telemetry.gpu': 'GPU-ARCHITEKTUR',
            'telemetry.quota': 'GEMINI TOKEN & KONTINGENT',
            'telemetry.github': 'GITHUB-SYNCHRONISATION',
            'telemetry.remaining': 'Verbleibend:',
            'telemetry.live': 'Live',
            'telemetry.weekly': 'Wöchentlich:',
            'nav.projects': 'Projekte & Arbeitsbereiche',
            'nav.github': 'Meine GitHub-Repos',
            'nav.sessions': 'Letzte Aktivitäten & Sitzungen',
            'nav.radar': 'Graphify Wissensradar',
            'filter.searchPlaceholder': 'Projekt, Repo oder Commit suchen... (Strg + K)',
            'filter.all': 'Alle',
            'filter.favorites': 'Favoriten',
            'filter.git': 'Git-Repositories',
            'filter.graphify': 'Graphify bereit',
            'filter.archive': 'Archiv-Schublade',
            'projects.emptyTitle': 'Keine Projekte gefunden',
            'projects.emptyDesc': 'Kein Projekt entspricht dem ausgewählten Filter.',
            'projects.graph': 'Grafik',
            'projects.ide': 'In IDE öffnen',
            'projects.github': 'GitHub',
            'projects.clone': 'Klonen',
            'projects.local': 'Lokal',
            'projects.unarchive': 'Wiederherstellen',
            'projects.open': 'Öffnen',
            'projects.archiveEmpty': 'Keine archivierten Repositories oder Projekte.',
            'sessions.emptyTitle': 'Keine Sitzungen gefunden',
            'sessions.emptyDesc': 'Antigravity IDE Sitzungen werden hier chronologisch aufgeführt.',
            'sessions.transcript': 'Transkript',
            'sessions.folder': 'Ordner',
            'sessions.toolCalls': 'Tool-Aufrufe',
            'radar.maps': 'Karten',
            'radar.empty': 'Noch keine Graphify-Karten vorhanden.',
            'radar.openEdge': 'In Edge öffnen',
            'nav.skills': 'Agent-Fähigkeiten & Arsenal',
            'skills.heroTitle': 'Antigravity Agent-Fähigkeiten & Arsenal',
            'skills.heroDesc': '21 Elite-Fähigkeiten für autonome Codierung, Architektur, UI-Design und lokale KI.',
            'skills.activeSkills': 'Aktive Fähigkeiten',
            'skills.searchPlaceholder': 'Fähigkeit, Trigger oder Beschreibung suchen...',
            'skills.catArchitecture': 'Architektur',
            'skills.catDesign': 'Design & UI',
            'skills.catQuality': 'Code-Qualität',
            'skills.catOptimization': 'Optimierung & Speicher',
            'skills.catLocalAi': 'Lokale KI & Python',
            'skills.promptCopied': 'Trigger-Prompt für {name} kopiert!',
            'skills.rulesFile': 'Regeldatei',
            'skills.startChat': 'Chat starten',
            'skills.copyHint': 'Klicken, um Trigger-Prompt zu kopieren',
            'skills.emptyTitle': 'Keine Fähigkeiten gefunden',
            'skills.emptyDesc': 'Keine Fähigkeit entspricht Ihrem Filter oder Ihrer Suche.',
            'settings.modalTitle': 'Cockpit-Einstellungen',
            'settings.modalSubtitle': 'Erscheinungsbild, Sprache, Startpräferenzen und lokale Engine',
            'settings.close': 'Schließen',
            'settings.langTitle': 'Oberflächensprache / Language',
            'settings.langDesc': 'Wählen Sie Ihre Anzeigesprache. Standardmäßig an die Antigravity IDE-Sprache angepasst.',
            'settings.themeTitle': 'Designauswahl',
            'settings.widgetsTitle': 'Widget- & Komponenten-Sichtbarkeit',
            'settings.widgetsDesc': 'Wählen Sie die auf dem Dashboard sichtbaren Karten und Registerkarten.',
            'settings.widgetsAllOpen': 'Alle sichtbar',
            'settings.widgetsAllHidden': 'Alle ausgeblendet',
            'settings.widgetsPartial': '{count} sichtbar',
            'settings.subgroupTele': 'Telemetrie & Kopfkarten',
            'settings.subgroupTabs': 'Hauptnavigation',
            'settings.subgroupPanels': 'Infobereiche',
            'settings.startupTitle': 'Start- & Benachrichtigungseinstellungen',
            'settings.startupAuto': 'Beim IDE-Start automatisch öffnen',
            'settings.startupAutoDesc': 'Cockpit beim Starten der IDE automatisch laden.',
            'settings.sfx': 'Audio-Effekte (SFX)',
            'settings.sfxDesc': 'Dezentes akustisches Feedback bei Aktionen.',
            'settings.localAiTitle': 'Extra: Lokale Code-Engine',
            'settings.localAiPill': 'Lokale KI',
            'settings.localAiDesc': 'Autonome lokale Code-Engine (z.B. Ollama Qwen 2.5 Coder 14B).',
            'settings.startEngine': 'Engine starten',
            'settings.stopEngine': 'Engine stoppen',
            'settings.testConn': 'Verbindung prüfen',
            'settings.refreshConn': 'Link erneuern',
            'settings.radarTitle': 'Architektur-Observatorium & Tools',
            'settings.radarDesc': 'Öffnet interaktive Architekturkarte in Microsoft Edge.',
            'settings.openMap': 'Karte öffnen',
            'settings.refreshAll': 'Alle Daten aktualisieren',
            'settings.done': 'Fertig',
            'toast.langChanged': 'Sprache geändert: {lang}',
            'toast.themeChanged': 'Design festgelegt: {theme}',
            'toast.audioOn': 'Audioeffekte aktiviert',
            'toast.audioOff': 'Audioeffekte stummgeschaltet',
            'toast.startupOn': 'Autostart aktiviert',
            'toast.startupOff': 'Autostart deaktiviert',
            'toast.copied': 'In die Zwischenablage kopiert',
            'power.acOnline': 'Netzstrom verbunden',
            'power.batteryEco': 'Batteriesparmodus',
            'power.batteryDesc': 'Gerät läuft im Akkubetrieb ({percent}%). Lokale Engine im Sparmodus.',
            'lang.auto': 'Automatisch (IDE-Sprache)',
            'lang.autoSub': 'System- und IDE-Standard'
        },
        es: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': 'Nuevo Chat',
            'hud.newChatTitle': 'Iniciar Nuevo Chat Antigravity AI',
            'hud.refresh': 'Actualizar',
            'hud.refreshTitle': 'Actualizar Datos del Panel',
            'hud.settings': 'Configuración',
            'hud.settingsTitle': 'Configuración de Cockpit',
            'telemetry.gpu': 'ARQUITECTURA GPU',
            'telemetry.quota': 'TOKEN Y CUOTA GEMINI',
            'telemetry.github': 'SINCRONIZACIÓN GITHUB',
            'telemetry.remaining': 'Restante:',
            'telemetry.live': 'En Vivo',
            'telemetry.weekly': 'Semanal:',
            'nav.projects': 'Proyectos y Espacios de Trabajo',
            'nav.github': 'Mis Repositorios GitHub',
            'nav.sessions': 'Actividad Reciente y Sesiones',
            'nav.radar': 'Radar de Conocimiento Graphify',
            'filter.searchPlaceholder': 'Buscar proyecto, repo o commit... (Ctrl + K)',
            'filter.all': 'Todos',
            'filter.favorites': 'Favoritos',
            'filter.git': 'Repos Git',
            'filter.graphify': 'Graphify Listo',
            'filter.archive': 'Cajón de Archivo',
            'projects.emptyTitle': 'No se encontraron proyectos',
            'projects.emptyDesc': 'Ningún proyecto coincide con el filtro seleccionado.',
            'projects.graph': 'Gráfico',
            'projects.ide': 'Abrir en IDE',
            'projects.github': 'GitHub',
            'projects.clone': 'Clonar',
            'projects.local': 'Local',
            'projects.unarchive': 'Restaurar',
            'projects.open': 'Abrir',
            'projects.archiveEmpty': 'No hay repositorios ni proyectos archivados.',
            'sessions.emptyTitle': 'No se encontraron sesiones',
            'sessions.emptyDesc': 'Las sesiones de Antigravity IDE aparecerán aquí cronológicamente.',
            'sessions.transcript': 'Transcripción',
            'sessions.folder': 'Carpeta',
            'sessions.toolCalls': 'Llamadas de Herramientas',
            'radar.maps': 'Mapas',
            'radar.empty': 'Aún no hay mapas Graphify.',
            'radar.openEdge': 'Abrir en Edge',
            'nav.skills': 'Habilidades del Agente y Arsenal',
            'skills.heroTitle': 'Habilidades del Agente y Arsenal Antigravity',
            'skills.heroDesc': '21 habilidades de élite para codificación autónoma, arquitectura, diseño y delegación local de IA.',
            'skills.activeSkills': 'Habilidades Activas',
            'skills.searchPlaceholder': 'Buscar habilidad, disparador o descripción...',
            'skills.catArchitecture': 'Arquitectura',
            'skills.catDesign': 'Diseño y UI',
            'skills.catQuality': 'Calidad de Código',
            'skills.catOptimization': 'Optimización y Memoria',
            'skills.catLocalAi': 'IA Local y Python',
            'skills.promptCopied': '¡Prompt activador para {name} copiado!',
            'skills.rulesFile': 'Archivo de Reglas',
            'skills.startChat': 'Iniciar Chat',
            'skills.copyHint': 'Haz clic para copiar el prompt',
            'skills.emptyTitle': 'No se encontraron habilidades',
            'skills.emptyDesc': 'Ninguna habilidad coincide con el filtro o la búsqueda.',
            'settings.modalTitle': 'Configuración de Cockpit',
            'settings.modalSubtitle': 'Apariencia, idioma, preferencias de inicio y motor local',
            'settings.close': 'Cerrar',
            'settings.langTitle': 'Idioma de Interfaz / Language',
            'settings.langDesc': 'Seleccione su idioma preferido. Por defecto se adapta al idioma de Antigravity IDE.',
            'settings.themeTitle': 'Selección de Tema',
            'settings.widgetsTitle': 'Visibilidad de Widgets y Componentes',
            'settings.widgetsDesc': 'Elija qué tarjetas y pestañas desea mostrar en el panel.',
            'settings.widgetsAllOpen': 'Todo Visible',
            'settings.widgetsAllHidden': 'Todo Oculto',
            'settings.widgetsPartial': '{count} Visible',
            'settings.subgroupTele': 'Telemetría y Tarjetas Superiores',
            'settings.subgroupTabs': 'Pestañas de Navegación',
            'settings.subgroupPanels': 'Paneles Informativos',
            'settings.startupTitle': 'Preferencias de Inicio y Notificación',
            'settings.startupAuto': 'Abrir Automáticamente al Iniciar IDE',
            'settings.startupAutoDesc': 'Abre Cockpit al iniciar Antigravity IDE.',
            'settings.sfx': 'Efectos de Sonido (SFX)',
            'settings.sfxDesc': 'Retroalimentación de audio sutil al interactuar.',
            'settings.localAiTitle': 'Extra: Motor de Código Local',
            'settings.localAiPill': 'IA Local',
            'settings.localAiDesc': 'Motor de código local autónomo (ej. Ollama Qwen 2.5 Coder 14B).',
            'settings.startEngine': 'Iniciar Motor',
            'settings.stopEngine': 'Detener Motor',
            'settings.testConn': 'Probar Conexión',
            'settings.refreshConn': 'Actualizar Enlace',
            'settings.radarTitle': 'Observatorio y Herramientas',
            'settings.radarDesc': 'Abre el mapa interactivo de llamadas en Microsoft Edge.',
            'settings.openMap': 'Abrir Mapa',
            'settings.refreshAll': 'Actualizar Datos',
            'settings.done': 'Aceptar',
            'toast.langChanged': 'Idioma actualizado: {lang}',
            'toast.themeChanged': 'Tema aplicado: {theme}',
            'toast.audioOn': 'Efectos de sonido activados',
            'toast.audioOff': 'Efectos de sonido silenciados',
            'toast.startupOn': 'Inicio automático activado',
            'toast.startupOff': 'Inicio automático desactivado',
            'toast.copied': 'Copiado al portapapeles',
            'power.acOnline': 'Conectado a la Corriente',
            'power.batteryEco': 'Modo Batería (Ecológico)',
            'power.batteryDesc': 'Dispositivo en batería ({percent}%). Motor local en modo ecológico.',
            'lang.auto': 'Automático (Idioma IDE)',
            'lang.autoSub': 'Predeterminado del sistema e IDE'
        },
        fr: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': 'Nouvelle Discussion',
            'hud.newChatTitle': 'Démarrer une Nouvelle Discussion IA',
            'hud.refresh': 'Actualiser',
            'hud.refreshTitle': 'Actualiser les Données du Tableau de Bord',
            'hud.settings': 'Paramètres',
            'hud.settingsTitle': 'Paramètres Cockpit',
            'telemetry.gpu': 'ARCHITECTURE GPU',
            'telemetry.quota': 'JETON & QUOTA GEMINI',
            'telemetry.github': 'SYNCHRONISATION GITHUB',
            'telemetry.remaining': 'Restant :',
            'telemetry.live': 'En Direct',
            'telemetry.weekly': 'Hebdo :',
            'nav.projects': 'Projets & Espaces de Travail',
            'nav.github': 'Mes Dépôts GitHub',
            'nav.sessions': 'Activités Récentes & Sessions',
            'nav.radar': 'Radar de Connaissances Graphify',
            'filter.searchPlaceholder': 'Rechercher projet, dépôt ou commit... (Ctrl + K)',
            'filter.all': 'Tous',
            'filter.favorites': 'Favoris',
            'filter.git': 'Dépôts Git',
            'filter.graphify': 'Graphify Prêt',
            'filter.archive': 'Tiroir d\'Archives',
            'projects.emptyTitle': 'Aucun projet trouvé',
            'projects.emptyDesc': 'Aucun projet ne correspond au filtre sélectionné.',
            'projects.graph': 'Graphe',
            'projects.ide': 'Ouvrir dans l\'IDE',
            'projects.github': 'GitHub',
            'projects.clone': 'Cloner',
            'projects.local': 'Local',
            'projects.unarchive': 'Restaurer',
            'projects.open': 'Ouvrir',
            'projects.archiveEmpty': 'Aucun dépôt ni projet archivé.',
            'sessions.emptyTitle': 'Aucune session trouvée',
            'sessions.emptyDesc': 'Les conversations de l\'IDE Antigravity apparaîtront ici chronologiquement.',
            'sessions.transcript': 'Transcription',
            'sessions.folder': 'Dossier',
            'sessions.toolCalls': 'Appels d\'outils',
            'radar.maps': 'Cartes',
            'radar.empty': 'Aucune carte Graphify détectée.',
            'radar.openEdge': 'Ouvrir dans Edge',
            'nav.skills': 'Compétences de l\'Agent & Arsenal',
            'skills.heroTitle': 'Compétences de l\'Agent & Arsenal Antigravity',
            'skills.heroDesc': '21 compétences d\'élite pour le codage autonome, l\'architecture, l\'interface utilisateur et l\'IA locale.',
            'skills.activeSkills': 'Compétences Actives',
            'skills.searchPlaceholder': 'Rechercher une compétence, un déclencheur...',
            'skills.catArchitecture': 'Architecture',
            'skills.catDesign': 'Design & UI',
            'skills.catQuality': 'Qualité du Code',
            'skills.catOptimization': 'Optimisation & Mémoire',
            'skills.catLocalAi': 'IA Locale & Python',
            'skills.promptCopied': 'Prompt de déclenchement pour {name} copié !',
            'skills.rulesFile': 'Fichier de Règles',
            'skills.startChat': 'Démarrer Discussion',
            'skills.copyHint': 'Cliquer pour copier le prompt',
            'skills.emptyTitle': 'Aucune compétence trouvée',
            'skills.emptyDesc': 'Aucune compétence ne correspond à votre filtre.',
            'settings.modalTitle': 'Paramètres Cockpit',
            'settings.modalSubtitle': 'Apparence, langue, démarrage et moteur local',
            'settings.close': 'Fermer',
            'settings.langTitle': 'Langue de l\'Interface / Language',
            'settings.langDesc': 'Sélectionnez votre langue d\'affichage. Par défaut aligné sur l\'IDE Antigravity.',
            'settings.themeTitle': 'Sélection du Thème',
            'settings.widgetsTitle': 'Visibilité des Widgets et Composants',
            'settings.widgetsDesc': 'Personnalisez les éléments affichés sur le tableau de bord.',
            'settings.widgetsAllOpen': 'Tous Visibles',
            'settings.widgetsAllHidden': 'Tous Masqués',
            'settings.widgetsPartial': '{count} Visibles',
            'settings.subgroupTele': 'Télémétrie & Cartes Hautes',
            'settings.subgroupTabs': 'Onglets de Navigation',
            'settings.subgroupPanels': 'Panneaux d\'Information',
            'settings.startupTitle': 'Préférences de Démarrage et Notifications',
            'settings.startupAuto': 'Lancement Automatique au Démarrage',
            'settings.startupAutoDesc': 'Ouvrir automatiquement le Cockpit au lancement de l\'IDE.',
            'settings.sfx': 'Effets Sonores (SFX)',
            'settings.sfxDesc': 'Retour sonore discret lors des interactions.',
            'settings.localAiTitle': 'Extra : Moteur de Code Local',
            'settings.localAiPill': 'IA Locale',
            'settings.localAiDesc': 'Moteur de code local autonome (ex. Ollama Qwen 2.5 Coder 14B).',
            'settings.startEngine': 'Démarrer le Moteur',
            'settings.stopEngine': 'Arrêter le Moteur',
            'settings.testConn': 'Tester Connexion',
            'settings.refreshConn': 'Actualiser Lien',
            'settings.radarTitle': 'Observatoire & Outils',
            'settings.radarDesc': 'Ouvre la cartographie d\'architecture dans Microsoft Edge.',
            'settings.openMap': 'Ouvrir la Carte',
            'settings.refreshAll': 'Actualiser Tout',
            'settings.done': 'Valider',
            'toast.langChanged': 'Langue mise à jour : {lang}',
            'toast.themeChanged': 'Thème appliqué : {theme}',
            'toast.audioOn': 'Effets sonores activés',
            'toast.audioOff': 'Effets sonores désactivés',
            'toast.startupOn': 'Démarrage automatique activé',
            'toast.startupOff': 'Démarrage automatique désactivé',
            'toast.copied': 'Copié dans le presse-papiers',
            'power.acOnline': 'Sur Secteur (Alimenté)',
            'power.batteryEco': 'Mode Batterie (Éco)',
            'power.batteryDesc': 'Appareil sur batterie ({percent}%). Moteur local en mode économie.',
            'lang.auto': 'Automatique (Langue IDE)',
            'lang.autoSub': 'Par défaut du système et de l\'IDE'
        },
        zh: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': '新建对话',
            'hud.newChatTitle': '开启全新 Antigravity AI 对话',
            'hud.refresh': '刷新',
            'hud.refreshTitle': '刷新控制面板数据',
            'hud.settings': '设置',
            'hud.settingsTitle': '控制面板设置',
            'telemetry.gpu': 'GPU 硬件架构',
            'telemetry.quota': 'GEMINI 额度与 TOKEN',
            'telemetry.github': 'GITHUB 同步状态',
            'telemetry.remaining': '剩余：',
            'telemetry.live': '实时',
            'telemetry.weekly': '每周：',
            'nav.projects': '项目与工作区',
            'nav.github': 'GitHub 仓库',
            'nav.sessions': '会话历史与活动',
            'nav.radar': 'Graphify 知识雷达',
            'filter.searchPlaceholder': '搜索项目、仓库或提交记录... (Ctrl + K)',
            'filter.all': '全部',
            'filter.favorites': '收藏项目',
            'filter.git': 'Git 仓库',
            'filter.graphify': 'Graphify 已就绪',
            'filter.archive': '归档抽屉',
            'projects.emptyTitle': '未找到项目',
            'projects.emptyDesc': '没有与当前筛选或搜索关键词匹配的项目。',
            'projects.graph': '拓扑图',
            'projects.ide': 'IDE 打开',
            'projects.github': 'GitHub',
            'projects.clone': '克隆',
            'projects.local': '本地',
            'projects.unarchive': '还原',
            'projects.open': '打开',
            'projects.archiveEmpty': '当前暂无已归档的仓库或项目。',
            'sessions.emptyTitle': '未找到会话记录',
            'sessions.emptyDesc': 'Antigravity IDE 的所有对话将在此按时间倒序排列。',
            'sessions.transcript': '对话实录',
            'sessions.folder': '打开目录',
            'sessions.toolCalls': '工具调用',
            'radar.maps': '张图谱',
            'radar.empty': '尚未检测到 Graphify 拓扑图。',
            'radar.openEdge': 'Edge 打开',
            'nav.skills': '智能体技能库与 Arsenal',
            'skills.heroTitle': 'Antigravity 智能体技能库与 Arsenal',
            'skills.heroDesc': '驱动自主编程、架构审查、UI 设计及本地模型委托的 21 项专属顶尖能力。',
            'skills.activeSkills': '项活跃技能',
            'skills.searchPlaceholder': '搜索技能名称、触发词或描述...',
            'skills.catArchitecture': '架构设计',
            'skills.catDesign': '界面与 UI',
            'skills.catQuality': '代码质量',
            'skills.catOptimization': '优化与上下文',
            'skills.catLocalAi': '本地 AI 与 Python',
            'skills.promptCopied': '已复制 {name} 的触发词 Prompt！',
            'skills.rulesFile': '规则文件',
            'skills.startChat': '发起对话',
            'skills.copyHint': '点击复制触发词 Prompt',
            'skills.emptyTitle': '未找到相关技能',
            'skills.emptyDesc': '没有与当前筛选条件匹配的智能体技能。',
            'settings.modalTitle': '控制面板设置',
            'settings.modalSubtitle': '外观、界面语言、启动偏好与本地引擎配置',
            'settings.close': '关闭',
            'settings.langTitle': '界面语言 / Language',
            'settings.langDesc': '选择显示语言。新安装时默认自动匹配 Antigravity IDE 语言。',
            'settings.themeTitle': '界面主题风格',
            'settings.widgetsTitle': '组件与面板可见性自定义',
            'settings.widgetsDesc': '选择要在主界面显示的卡片与选项卡。',
            'settings.widgetsAllOpen': '全部显示',
            'settings.widgetsAllHidden': '全部隐藏',
            'settings.widgetsPartial': '{count} 项可见',
            'settings.subgroupTele': '遥测与顶部卡片',
            'settings.subgroupTabs': '主导航选项卡',
            'settings.subgroupPanels': '信息面板',
            'settings.startupTitle': '启动偏好与系统反馈',
            'settings.startupAuto': 'IDE 启动时自动打开',
            'settings.startupAutoDesc': '启动 Antigravity IDE 时自动显示本控制台。',
            'settings.sfx': '未来感界面音效 (SFX)',
            'settings.sfxDesc': '切换主题或点击按钮时播放轻微操作音效反馈。',
            'settings.localAiTitle': '扩展：本地代码与模型引擎',
            'settings.localAiPill': '本地 AI',
            'settings.localAiDesc': '基于本地 GPU 的独立本地离线编码引擎 (如 Ollama 等)。',
            'settings.startEngine': '启动引擎',
            'settings.stopEngine': '停止引擎',
            'settings.testConn': '测试连接',
            'settings.refreshConn': '刷新链路',
            'settings.radarTitle': '架构全景观测与工具',
            'settings.radarDesc': '在 Microsoft Edge 中打开可交互的代码调用依赖拓扑图。',
            'settings.openMap': '打开地图',
            'settings.refreshAll': '刷新全部数据',
            'settings.done': '完成',
            'toast.langChanged': '语言已更新：{lang}',
            'toast.themeChanged': '主题已切换：{theme}',
            'toast.audioOn': '界面音效已开启',
            'toast.audioOff': '界面音效已静音',
            'toast.startupOn': '自启动已启用',
            'toast.startupOff': '自启动已禁用',
            'toast.copied': '已复制到剪贴板',
            'power.acOnline': '已接通电源 (AC)',
            'power.batteryEco': '电池节能模式',
            'power.batteryDesc': '当前使用电池供电 ({percent}%)。本地引擎已启用节能保护。',
            'lang.auto': '自动 (IDE 语言)',
            'lang.autoSub': '跟随系统与 IDE 默认设置'
        },
        ja: {
            'hud.title': 'Antigravity Cockpit',
            'hud.newChat': '新規チャット',
            'hud.newChatTitle': '新規 Antigravity AI チャットを開始',
            'hud.refresh': '更新',
            'hud.refreshTitle': 'ダッシュボードのデータを更新',
            'hud.settings': '設定',
            'hud.settingsTitle': 'Cockpit 設定',
            'telemetry.gpu': 'GPU アーキテクチャ',
            'telemetry.quota': 'GEMINI トークン＆クォータ',
            'telemetry.github': 'GITHUB 同期状態',
            'telemetry.remaining': '残り：',
            'telemetry.live': 'リアルタイム',
            'telemetry.weekly': '週間：',
            'nav.projects': 'プロジェクト＆ワークスペース',
            'nav.github': 'GitHub リポジトリ',
            'nav.sessions': '最近の履歴＆セッション',
            'nav.radar': 'Graphify 知識レーダー',
            'filter.searchPlaceholder': 'プロジェクト、リポ、コミットを検索... (Ctrl + K)',
            'filter.all': 'すべて',
            'filter.favorites': 'お気に入り',
            'filter.git': 'Git リポジトリ',
            'filter.graphify': 'Graphify 準備完了',
            'filter.archive': 'アーカイブ引き出し',
            'projects.emptyTitle': 'プロジェクトが見つかりません',
            'projects.emptyDesc': '検索条件またはフィルターに一致するプロジェクトがありません。',
            'projects.graph': 'グラフ',
            'projects.ide': 'IDE で開く',
            'projects.github': 'GitHub',
            'projects.clone': 'クローン',
            'projects.local': 'ローカル',
            'projects.unarchive': '復元',
            'projects.open': '開く',
            'projects.archiveEmpty': 'アーカイブされたプロジェクトはありません。',
            'sessions.emptyTitle': 'セッションが見つかりません',
            'sessions.emptyDesc': 'Antigravity IDE の会話履歴が時系列でここに表示されます。',
            'sessions.transcript': '文字起こし',
            'sessions.folder': 'フォルダを開く',
            'sessions.toolCalls': 'ツール呼び出し',
            'radar.maps': 'マップ',
            'radar.empty': 'Graphify マップはまだありません。',
            'radar.openEdge': 'Edge で開く',
            'nav.skills': 'エージェントスキル＆アーセナル',
            'skills.heroTitle': 'Antigravity エージェントスキル＆アーセナル',
            'skills.heroDesc': '自律型コーディング、アーキテクチャレビュー、UI デザイン、ローカル AI を強化する 21 の専用機能。',
            'skills.activeSkills': '個のアクティブスキル',
            'skills.searchPlaceholder': 'スキル名、トリガー、説明を検索...',
            'skills.catArchitecture': 'アーキテクチャ',
            'skills.catDesign': 'デザイン＆UI',
            'skills.catQuality': 'コード品質',
            'skills.catOptimization': '最適化＆メモリ',
            'skills.catLocalAi': 'ローカル AI＆Python',
            'skills.promptCopied': '{name} のトリガープ prompt をコピーしました！',
            'skills.rulesFile': 'ルールファイル',
            'skills.startChat': 'チャット開始',
            'skills.copyHint': 'クリックしてプロンプトをコピー',
            'skills.emptyTitle': 'スキルが見つかりません',
            'skills.emptyDesc': '条件に一致するスキルはありません。',
            'settings.modalTitle': 'Cockpit 設定',
            'settings.modalSubtitle': '外観、言語、起動設定およびローカル AI エンジン構成',
            'settings.close': '閉じる',
            'settings.langTitle': '表示言語 / Language',
            'settings.langDesc': 'インターフェース言語を選択します。初回時は Antigravity IDE の言語に自動適応します。',
            'settings.themeTitle': 'テーマ選択',
            'settings.widgetsTitle': 'ウィジェット＆コンポーネント表示設定',
            'settings.widgetsDesc': 'メイン画面に表示するカードやタブを選択します。',
            'settings.widgetsAllOpen': 'すべて表示',
            'settings.widgetsAllHidden': 'すべて非表示',
            'settings.widgetsPartial': '{count} 件表示中',
            'settings.subgroupTele': 'テレメトリ＆ヘッダーカード',
            'settings.subgroupTabs': 'メインナビゲーションタブ',
            'settings.subgroupPanels': '情報パネル',
            'settings.startupTitle': '起動および通知設定',
            'settings.startupAuto': 'IDE 起動時に自動で開く',
            'settings.startupAutoDesc': 'Antigravity IDE 起動時にコントロールパネルを自動起動します。',
            'settings.sfx': '効果音 (SFX)',
            'settings.sfxDesc': 'テーマ変更やボタン操作時に心地よいサウンドフィードバックを提供します。',
            'settings.localAiTitle': '追加機能: ローカルコード＆モデルエンジン',
            'settings.localAiPill': 'ローカル AI',
            'settings.localAiDesc': 'ローカル GPU を活用した完全オフラインの自律型コーディングエンジン (Ollama 等)。',
            'settings.startEngine': 'エンジン開始',
            'settings.stopEngine': 'エンジン停止',
            'settings.testConn': '接続テスト',
            'settings.refreshConn': 'リンク更新',
            'settings.radarTitle': 'アーキテクチャ構造ビューア＆ツール',
            'settings.radarDesc': 'インタラクティブな依存関係マップを Microsoft Edge で表示します。',
            'settings.openMap': 'マップを開く',
            'settings.refreshAll': '全データを更新',
            'settings.done': '完了',
            'toast.langChanged': '言語を変更しました: {lang}',
            'toast.themeChanged': 'テーマを適用しました: {theme}',
            'toast.audioOn': '効果音をオンにしました',
            'toast.audioOff': '効果音をミュートにしました',
            'toast.startupOn': '自動起動を有効化しました',
            'toast.startupOff': '自動起動を無効化しました',
            'toast.copied': 'クリップボードにコピーしました',
            'power.acOnline': 'AC電源接続中',
            'power.batteryEco': 'バッテリー省電力モード',
            'power.batteryDesc': 'バッテリー駆動中 ({percent}%)。ローカルエンジンは保護のため省電力モードです。',
            'lang.auto': '自動 (IDE 言語)',
            'lang.autoSub': 'システムおよび IDE の既定値'
        }
    };

    let currentLanguage = 'auto';
    let activeLocale = 'tr';

    function resolveActiveLocale(prefLang) {
        if (prefLang && prefLang !== 'auto' && SUPPORTED_LOCALES.includes(prefLang)) {
            return prefLang;
        }
        const ideLang = (appData && (appData.ideLanguage || appData.configuredLanguage)) ||
                        (window.__INITIAL_DATA__ && (window.__INITIAL_DATA__.ideLanguage || window.__INITIAL_DATA__.configuredLanguage)) ||
                        (navigator.language || 'en');
        const norm = String(ideLang).toLowerCase().split(/[-_]/)[0];
        if (SUPPORTED_LOCALES.includes(norm)) {
            return norm;
        }
        return 'en';
    }

    function t(key, params = {}) {
        const dict = LOCALES[activeLocale] || LOCALES.en;
        let text = dict[key] || LOCALES.en[key] || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(p => {
                text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
            });
        }
        return text;
    }

    function applyLanguage(prefLang, showFeedback = false) {
        currentLanguage = prefLang || 'auto';
        activeLocale = resolveActiveLocale(currentLanguage);

        try {
            localStorage.setItem('antigravity_language', currentLanguage);
        } catch (_) {}

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const k = el.getAttribute('data-i18n');
            const v = t(k);
            if (v) el.textContent = v;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const k = el.getAttribute('data-i18n-placeholder');
            const v = t(k);
            if (v) el.setAttribute('placeholder', v);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const k = el.getAttribute('data-i18n-title');
            const v = t(k);
            if (v) el.setAttribute('title', v);
        });

        const langBadge = document.getElementById('currentLangBadge');
        if (langBadge) {
            if (currentLanguage === 'auto') {
                langBadge.textContent = `🌐 ${t('lang.auto')} (${LOCALE_NAMES[activeLocale]})`;
            } else {
                langBadge.textContent = `${LOCALE_FLAGS[activeLocale]} ${LOCALE_NAMES[activeLocale]}`;
            }
        }

        const autoSub = document.getElementById('autoLangDetectedLabel');
        if (autoSub) {
            autoSub.textContent = `IDE: ${LOCALE_NAMES[activeLocale] || activeLocale}`;
        }

        document.querySelectorAll('.lang-card-btn').forEach(btn => {
            const bLang = btn.getAttribute('data-lang');
            btn.classList.toggle('active', bLang === currentLanguage);
        });

        if (vscode) {
            vscode.postMessage({ command: 'setLanguage', language: currentLanguage });
        }

        if (currentNavTab === 'projects') renderProjects();
        else if (currentNavTab === 'github') renderGithub();
        else if (currentNavTab === 'sessions') renderSessions();
        else if (currentNavTab === 'radar') renderRadar();
        else if (currentNavTab === 'skills') renderSkills();

        if (isArchiveDrawerOpen) renderArchive();

        if (showFeedback) {
            const langName = currentLanguage === 'auto' ? `${t('lang.auto')} (${LOCALE_NAMES[activeLocale]})` : LOCALE_NAMES[activeLocale];
            showToast(t('toast.langChanged', { lang: langName }));
        }
    }

    function initLanguage() {
        let savedLang = null;
        try {
            savedLang = localStorage.getItem('antigravity_language');
        } catch (_) {}
        if (!savedLang) {
            savedLang = (appData && appData.configuredLanguage) || 'auto';
        }
        applyLanguage(savedLang, false);
    }

    // --- High-Fidelity SVG Icon Set for Antigravity IDE Cockpit ---
    const ICONS = {
        logo: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--neon-cyan)" stroke-width="1.8" opacity="0.6"/><ellipse cx="12" cy="12" rx="10" ry="4" stroke="var(--neon-blue)" stroke-width="1.5" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r="3" fill="var(--neon-cyan)"/></svg></span>',
        chat: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>',
        observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><circle cx="19" cy="5" r="2"></circle><circle cx="5" cy="19" r="2"></circle><path d="m10.4 10.4-4 7.2"></path><path d="m13.6 13.6 4-7.2"></path></svg></span>',
        volumeOn: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></span>',
        volumeOff: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg></span>',
        cpu: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg></span>',
        refresh: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></span>',
        checkSquare: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span>',
        square: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect></svg></span>',
        gpu: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><circle cx="7" cy="10" r="2"></circle><circle cx="12" cy="10" r="2"></circle><circle cx="17" cy="10" r="2"></circle></svg></span>',
        github: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg></span>',
        sparkle: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path></svg></span>',
        folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>',
        folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg></span>',
        clock: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>',
        history: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg></span>',
        search: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>',
        star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
        starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
        gitBranch: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg></span>',
        gitCommit: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><line x1="1.05" y1="12" x2="7" y2="12"></line><line x1="17" y1="12" x2="22.95" y2="12"></line></svg></span>',
        archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></span>',
        externalLink: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span>',
        window: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span>',
        lock: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>',
        globe: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></span>',
        download: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></span>',
        check: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>',
        tools: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg></span>',
        fileCode: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></span>',
        plus: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>',
        undo: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></span>',
        play: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg></span>',
        stop: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg></span>',
        network: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></span>',
        grid: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>'
    };

    // Immutable snapshot of the default icon set. Theme profiles are layered on top of this
    // on every family switch, so a theme can never inherit glyphs leaked from the previous one.
    const BASE_ICONS = Object.freeze(Object.assign({}, ICONS));

    // --- Dynamic Theme Customization Profiles (Title, Subtext, SVG Logo, and Themed Icon Sets) ---
    const THEME_PROFILES = {
        'cockpit-classic': {
            name: 'Cockpit Classic',
            title: 'Antigravity Cockpit',
            subtext: '• SYSTEM READY // IDE NOMINAL',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#0084ff" stroke-width="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#38bdf8" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#0084ff"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></span>',
                window: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span>',
                gitBranch: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg></span>'
            }
        },
        'antigravity': {
            name: 'Antigravity IDE',
            title: 'Antigravity Dashboard',
            subtext: '• WORKBENCH // IDE NOMINAL',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--vscode-blue)" stroke-width="2" opacity="0.85"/><circle cx="12" cy="12" r="6" stroke="var(--text-bright)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3.5" fill="var(--vscode-blue)"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><circle cx="19" cy="5" r="2"></circle><circle cx="5" cy="19" r="2"></circle><path d="m10.4 10.4-4 7.2"></path><path d="m13.6 13.6 4-7.2"></path></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></span>'
            }
        },
        'dark': {
            name: 'Deep Space',
            title: 'Deep Space Observatory',
            subtext: '• CYBERNETIC RADAR ONLINE',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" stroke="#38bdf8" stroke-width="2" fill="rgba(56,189,248,0.12)"/><circle cx="12" cy="12" r="4" fill="#38bdf8"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" stroke-width="2"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8"></polygon><circle cx="12" cy="12" r="3" fill="#38bdf8"></circle></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3,4 10,4 13,7 21,7 21,20 3,20"></polygon></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3,4 10,4 13,7 21,7 21,11 3,11"></polygon><polygon points="2,20 6,12 22,12 18,20"></polygon></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"></polygon></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"></polygon></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="3" x2="12" y2="21"></line><line x1="3" y1="12" x2="21" y2="12"></line><circle cx="12" cy="12" r="4"></circle></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"></polygon><line x1="12" y1="12" x2="12" y2="22"></line><line x1="12" y1="12" x2="22" y2="7"></line><line x1="12" y1="12" x2="2" y2="7"></line></svg></span>'
            }
        },
        'midnight': {
            name: 'Midnight Obsidian',
            title: 'Midnight Obsidian',
            subtext: '• PURE OLED VOID',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--text-bright)" stroke-width="1.2"/><polygon points="12,5 14,12 12,19 10,12" fill="var(--text-bright)"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="1"></rect><circle cx="12" cy="12" r="4"></circle></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></span>'
            }
        },
        'nord': {
            name: 'Nord Slate',
            title: 'Nord Cockpit',
            subtext: '• ARCTIC FROST WORKSPACE',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="9.5" stroke="#88c0d0" stroke-width="2"/><path d="M12 4v16M4 12h16" stroke="#88c0d0" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="2.5" fill="#eceff4"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#88c0d0" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="3"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h4l2 3h8a3 3 0 0 1 3 3z"></path></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polygon points="12 6 14 12 12 18 10 12"></polygon></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5" rx="1"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></span>'
            }
        },
        'synchronized': {
            name: 'Synchronized Studio',
            title: 'Synchronized Studio',
            subtext: '• DIGITAL CREATIVE DIRECTION',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" stroke="#deebc8" stroke-width="1.5"/><line x1="12" y1="4" x2="12" y2="20" stroke="#deebc8" stroke-width="2"/><line x1="4" y1="12" x2="20" y2="12" stroke="#deebc8" stroke-width="2"/><line x1="6.34" y1="6.34" x2="17.66" y2="17.66" stroke="#deebc8" stroke-width="1.5"/><line x1="6.34" y1="17.66" x2="17.66" y2="6.34" stroke="#deebc8" stroke-width="1.5"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#deebc8" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="0"></rect><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>',
            icons: {
                folder: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg></span>',
                folderOpen: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="10" x2="12" y2="20"></line></svg></span>',
                star: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="4" x2="12" y2="20"></line><line x1="4" y1="12" x2="20" y2="12"></line></svg></span>',
                starFilled: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4" fill="var(--bg-card)"></circle></svg></span>',
                observatory: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16"></rect><circle cx="12" cy="12" r="5"></circle></svg></span>',
                archive: '<span class="ag-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg></span>'
            }
        },
        'tokyo-night': {
            name: 'Tokyo Night',
            title: 'Tokyo Night Cockpit',
            subtext: '• NEON CITY // NIGHT SHIFT',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="var(--vscode-blue)" stroke-width="1.8" stroke-linejoin="round"/><circle cx="17" cy="6" r="1.3" fill="var(--neon-purple)"/><circle cx="20.5" cy="9.5" r="0.8" fill="var(--neon-cyan)"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><rect x="9" y="9" width="6" height="6" rx="1"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line></svg>'
        },
        'catppuccin': {
            name: 'Catppuccin',
            title: 'Catppuccin Cockpit',
            subtext: '• SOOTHING PASTEL // FLOW STATE',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M4 9V3l4 3.5h8L20 3v6a8 8 0 0 1-16 0z" stroke="var(--vscode-blue)" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="11" r="1.2" fill="var(--neon-pink)"/><circle cx="15" cy="11" r="1.2" fill="var(--neon-pink)"/><path d="M10.5 14.5 12 15.5l1.5-1" stroke="var(--text-bright)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3"></circle><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line></svg>'
        },
        'solarized': {
            name: 'Solarized',
            title: 'Solarized Cockpit',
            subtext: '• PRECISION CONTRAST // CALM FOCUS',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="5" stroke="var(--neon-amber)" stroke-width="1.8"/><path d="M12 7a5 5 0 0 1 0 10z" fill="var(--neon-amber)"/><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" stroke="var(--vscode-blue)" stroke-width="1.6" stroke-linecap="round"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>'
        },
        'hc': {
            name: 'Yüksek Kontrast',
            title: 'Antigravity Cockpit',
            subtext: '• HIGH CONTRAST // ACCESSIBLE',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5a9.5 9.5 0 0 1 0 19z" fill="currentColor"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            // Thicker strokes on every icon for low-vision legibility
            iconStroke: 2.5
        },
        'system': {
            name: 'Sistem / IDE',
            title: 'Antigravity System',
            subtext: '• IDE SYNC // AUTO APPEARANCE',
            logoSvg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="6" r="1" fill="currentColor"/></svg>',
            teleGpuIcon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            icons: {}
        }
    };

    // Persisted webview state is read below, right after AudioEngine is declared
    // (reading it here used to hit AudioEngine inside its temporal dead zone).
    let currentTheme = 'antigravity';
    const savedState = vscode ? vscode.getState() : null;

    function saveState() {
        if (vscode) {
            vscode.setState({
                audioEnabled: AudioEngine.enabled,
                navTab: currentNavTab,
                panelCollapsed: isAgPanelCollapsed,
                theme: currentTheme,
                widgetVisibility: widgetVisibility
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
        theme() {
            if (!this.enabled) return;
            this.playTone(523.25, 'sine', 0.06, 0.06);
            setTimeout(() => this.playTone(783.99, 'sine', 0.08, 0.05), 50);
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
        },
        toggle() {
            this.enabled = !this.enabled;
            if (this.enabled) this.click();
            saveState();
            return this.enabled;
        },
        setEnabled(val) {
            this.enabled = Boolean(val);
            if (this.enabled) this.click();
            saveState();
            return this.enabled;
        }
    };

    // Restore persisted webview state now that AudioEngine is fully initialized
    if (savedState) {
        if (typeof savedState.audioEnabled === 'boolean') {
            AudioEngine.enabled = savedState.audioEnabled;
        }
        if (savedState.navTab) {
            currentNavTab = savedState.navTab;
        }
        if (savedState.theme) {
            currentTheme = savedState.theme;
        }
    }

    // --- Theme Controller (Family + Mode System) ---
    // Families: 'antigravity', 'dark', 'midnight', 'nord', 'tokyo-night', 'catppuccin', 'solarized', 'synchronized', 'cockpit-classic', 'hc', 'system'
    // Modes: 'dark', 'light'
    let themeFamily = 'antigravity';
    let themeMode = 'dark';
    let isThemeDropdownOpen = false;

    const THEME_FAMILY_NAMES = {
        antigravity: 'Antigravity IDE',
        dark: 'Deep Space',
        midnight: 'Midnight Obsidian',
        nord: 'Nord Slate',
        'tokyo-night': 'Tokyo Night',
        catppuccin: 'Catppuccin',
        solarized: 'Solarized',
        synchronized: 'Synchronized Studio',
        'cockpit-classic': 'Cockpit Classic',
        hc: 'Yüksek Kontrast',
        system: 'Sistem / IDE'
    };

    function resolveThemeAttr(family, mode) {
        if (family === 'system') {
            const sysLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
            return sysLight ? 'light' : 'antigravity';
        }
        if (family === 'antigravity') {
            return mode === 'light' ? 'light' : 'antigravity';
        }
        if (family === 'dark') {
            return mode === 'light' ? 'deepspace-light' : 'dark';
        }
        if (family === 'midnight') {
            return mode === 'light' ? 'midnight-light' : 'midnight';
        }
        if (family === 'nord') {
            return mode === 'light' ? 'nord-light' : 'nord-dark';
        }
        if (family === 'tokyo-night') {
            return mode === 'light' ? 'tokyo-night-light' : 'tokyo-night';
        }
        if (family === 'catppuccin') {
            return mode === 'light' ? 'catppuccin-light' : 'catppuccin';
        }
        if (family === 'solarized') {
            return mode === 'light' ? 'solarized-light' : 'solarized-dark';
        }
        if (family === 'synchronized') {
            return mode === 'light' ? 'synchronized-light' : 'synchronized';
        }
        if (family === 'cockpit-classic') {
            return mode === 'light' ? 'cockpit-classic-light' : 'cockpit-classic';
        }
        if (family === 'hc') {
            return mode === 'light' ? 'hc-light' : 'hc-dark';
        }
        return mode === 'light' ? 'light' : 'antigravity';
    }

    function initTheme() {
        try {
            const savedFam = localStorage.getItem('antigravity_theme_family');
            const savedMod = localStorage.getItem('antigravity_theme_mode');
            if (savedFam && (savedFam in THEME_FAMILY_NAMES || savedFam === 'system')) {
                themeFamily = savedFam;
            }
            if (savedMod && (savedMod === 'dark' || savedMod === 'light')) {
                themeMode = savedMod;
            } else {
                // Check legacy theme preference
                const legacy = localStorage.getItem('antigravity_theme_pref') || localStorage.getItem('antigravity_theme');
                if (legacy === 'light') {
                    themeFamily = 'antigravity';
                    themeMode = 'light';
                } else if (legacy === 'dark') {
                    themeFamily = 'dark';
                    themeMode = 'dark';
                } else if (legacy === 'midnight') {
                    themeFamily = 'midnight';
                    themeMode = 'dark';
                } else if (legacy === 'nord' || legacy === 'nord-dark') {
                    themeFamily = 'nord';
                    themeMode = 'dark';
                } else if (legacy === 'nord-light') {
                    themeFamily = 'nord';
                    themeMode = 'light';
                } else if (legacy === 'synchronized') {
                    themeFamily = 'synchronized';
                    themeMode = 'dark';
                } else if (legacy === 'synchronized-light') {
                    themeFamily = 'synchronized';
                    themeMode = 'light';
                } else if (legacy === 'cockpit-classic') {
                    themeFamily = 'cockpit-classic';
                    themeMode = 'dark';
                } else if (legacy === 'cockpit-classic-light') {
                    themeFamily = 'cockpit-classic';
                    themeMode = 'light';
                } else if (legacy === 'deepspace-light') {
                    themeFamily = 'dark';
                    themeMode = 'light';
                } else if (legacy === 'midnight-light') {
                    themeFamily = 'midnight';
                    themeMode = 'light';
                } else if (legacy === 'system') {
                    themeFamily = 'system';
                    themeMode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
                }
            }
        } catch {
            themeFamily = 'antigravity';
            themeMode = 'dark';
        }

        applyCurrentTheme(false);

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (themeFamily === 'system') {
                    applyCurrentTheme(false);
                }
            });
        }
    }

    function applyCurrentTheme(showFeedback = false) {
        const themeAttr = resolveThemeAttr(themeFamily, themeMode);
        currentTheme = themeAttr;
        document.documentElement.setAttribute('data-theme', themeAttr);
        document.body.setAttribute('data-theme', themeAttr);

        try {
            localStorage.setItem('antigravity_theme_family', themeFamily);
            localStorage.setItem('antigravity_theme_mode', themeMode);
            localStorage.setItem('antigravity_theme', themeAttr);
            localStorage.setItem('antigravity_theme_pref', themeFamily);
        } catch {
            // Ignore localStorage quota or private browsing exceptions
        }

        const metaTheme = document.getElementById('metaThemeColor');
        if (metaTheme) {
            let color = '#181818';
            if (themeAttr === 'light' || themeAttr === 'midnight-light') color = '#ffffff';
            else if (themeAttr === 'deepspace-light') color = '#f0f9ff';
            else if (themeAttr === 'nord-light') color = '#eceff4';
            else if (themeAttr === 'tokyo-night-light') color = '#e1e2e7';
            else if (themeAttr === 'tokyo-night') color = '#1a1b26';
            else if (themeAttr === 'catppuccin-light') color = '#eff1f5';
            else if (themeAttr === 'catppuccin') color = '#1e1e2e';
            else if (themeAttr === 'solarized-light') color = '#fdf6e3';
            else if (themeAttr === 'solarized-dark') color = '#002b36';
            else if (themeAttr === 'synchronized-light') color = '#f7f8f4';
            else if (themeAttr === 'synchronized') color = '#151515';
            else if (themeAttr === 'cockpit-classic') color = '#121317';
            else if (themeAttr === 'cockpit-classic-light') color = '#f2f4f8';
            else if (themeAttr === 'midnight') color = '#030712';
            else if (themeAttr === 'dark') color = '#090d16';
            else if (themeAttr === 'nord-dark') color = '#2e3440';
            else if (themeAttr === 'hc-dark') color = '#000000';
            else if (themeAttr === 'hc-light') color = '#ffffff';
            metaTheme.setAttribute('content', color);
        }

        // Always reset icons back to base before applying any custom theme overrides.
        // This guarantees theme switching never leaks modified icons into other themes.
        Object.assign(ICONS, BASE_ICONS);

        const prof = THEME_PROFILES[themeFamily] || THEME_PROFILES.antigravity;
        if (prof) {
            const titleEl = document.getElementById('dashboardMainTitle');
            if (titleEl && prof.title) titleEl.textContent = prof.title;

            const subtextEl = document.getElementById('dashboardSubtext');
            if (subtextEl && prof.subtext) subtextEl.textContent = prof.subtext;

            const logoEl = document.getElementById('hudLogoBadge');
            if (logoEl && prof.logoSvg) logoEl.innerHTML = prof.logoSvg;

            const gpuIconEl = document.getElementById('teleIconGpu');
            if (gpuIconEl && prof.teleGpuIcon) gpuIconEl.innerHTML = prof.teleGpuIcon;

            const ghIconEl = document.getElementById('teleIconGithub');
            if (ghIconEl && prof.teleGithubIcon) ghIconEl.innerHTML = prof.teleGithubIcon;

            if (prof.icons) {
                Object.assign(ICONS, prof.icons);
            }
        }

        // Dynamically update Navigation Command Tab icons
        const navProjects = document.querySelector('#tabBtnProjects .ag-icon');
        if (navProjects) navProjects.innerHTML = ICONS.folder;

        const navGithub = document.querySelector('#tabBtnGithub .ag-icon');
        if (navGithub) navGithub.innerHTML = ICONS.github;

        const navSessions = document.querySelector('#tabBtnSessions .ag-icon');
        if (navSessions) navSessions.innerHTML = ICONS.clock;

        const navRadar = document.querySelector('#tabBtnRadar .ag-icon');
        if (navRadar) navRadar.innerHTML = ICONS.observatory;

        // Re-render current tab views so cards and icons immediately reflect the selected theme
        if (currentNavTab === 'projects') renderProjects();
        else if (currentNavTab === 'github') renderGithub();
        else if (currentNavTab === 'sessions') renderSessions();
        else if (currentNavTab === 'radar') renderRadar();
        else if (currentNavTab === 'skills') renderSkills();
        renderArchive();

        saveState();
        updateThemeUI();

        if (showFeedback) {
            const famLabel = THEME_FAMILY_NAMES[themeFamily] || 'Antigravity';
            const modeLabel = themeMode === 'light' ? 'Açık Mod' : 'Koyu Mod';
            showToast(`${famLabel} (${modeLabel}) Etkinleştirildi`);
        }
    }

    function toggleThemeDropdown() {
        isThemeDropdownOpen = !isThemeDropdownOpen;
        const container = document.getElementById('themeDropdownContainer');
        if (container) {
            container.classList.toggle('open', isThemeDropdownOpen);
        }
    }

    function closeThemeDropdown() {
        if (!isThemeDropdownOpen) return;
        isThemeDropdownOpen = false;
        const container = document.getElementById('themeDropdownContainer');
        if (container) {
            container.classList.remove('open');
        }
    }

    function setThemeModeType(mode, showFeedback = false) {
        if (mode !== 'dark' && mode !== 'light') return;
        themeMode = mode;
        applyCurrentTheme(showFeedback);
    }

    function selectThemeFamily(family, showFeedback = false) {
        if (!(family in THEME_FAMILY_NAMES) && family !== 'system') return;
        themeFamily = family;
        applyCurrentTheme(showFeedback);
    }

    function toggleTheme() {
        // Quick toggle between dark and light modes
        themeMode = (themeMode === 'light') ? 'dark' : 'light';
        applyCurrentTheme(true);
    }

    function updateThemeUI() {
        // 1. Top HUD Dropdown trigger button text & title
        const btnText = document.getElementById('themeBtnText');
        const famName = THEME_FAMILY_NAMES[themeFamily] || 'Antigravity IDE';
        const modeSuffix = themeMode === 'light' ? 'Açık' : 'Koyu';
        if (btnText) {
            btnText.textContent = `${famName} (${modeSuffix})`;
        }
        const ddBtn = document.getElementById('themeDropdownBtn');
        if (ddBtn) {
            ddBtn.title = `Mevcut Tema: ${famName} (${modeSuffix}) — Tıklayarak Değiştir`;
        }

        // 2. Segmented Mode buttons (🌙 Koyu / ☀️ Açık)
        const segDark = document.getElementById('segModeDark');
        const segLight = document.getElementById('segModeLight');
        if (segDark) segDark.classList.toggle('active', themeMode === 'dark');
        if (segLight) segLight.classList.toggle('active', themeMode === 'light');

        // 3. Dropdown list items & checkmarks
        const families = [
            { id: 'antigravity', suffix: 'Antigravity' },
            { id: 'dark', suffix: 'Dark' },
            { id: 'midnight', suffix: 'Midnight' },
            { id: 'nord', suffix: 'Nord' },
            { id: 'tokyo-night', suffix: 'TokyoNight' },
            { id: 'catppuccin', suffix: 'Catppuccin' },
            { id: 'solarized', suffix: 'Solarized' },
            { id: 'synchronized', suffix: 'Synchronized' },
            { id: 'cockpit-classic', suffix: 'CockpitClassic' },
            { id: 'hc', suffix: 'Hc' },
            { id: 'system', suffix: 'System' }
        ];
        families.forEach(item => {
            const itemEl = document.getElementById('themeItem' + item.suffix);
            const checkEl = document.getElementById('check' + item.suffix);
            const isActive = (themeFamily === item.id);
            if (itemEl) itemEl.classList.toggle('active', isActive);
            if (checkEl) checkEl.style.display = isActive ? 'block' : 'none';
        });

        // 4. Settings modal badge
        const badge = document.getElementById('currentThemeBadge');
        if (badge) {
            badge.textContent = `${famName} (${modeSuffix})`;
        }

        // 5. Settings modal cards
        const cards = {
            antigravity: document.getElementById('themeCardAntigravity'),
            dark: document.getElementById('themeCardDark'),
            midnight: document.getElementById('themeCardMidnight'),
            light: document.getElementById('themeCardLight'),
            'tokyo-night': document.getElementById('themeCardTokyoNight'),
            catppuccin: document.getElementById('themeCardCatppuccin'),
            solarized: document.getElementById('themeCardSolarized'),
            synchronized: document.getElementById('themeCardSynchronized'),
            'cockpit-classic': document.getElementById('themeCardCockpitClassic'),
            hc: document.getElementById('themeCardHc'),
            system: document.getElementById('themeCardSystem')
        };
        Object.keys(cards).forEach(key => {
            if (cards[key]) {
                let isCardActive;
                if (key === 'light') {
                    isCardActive = (themeMode === 'light' && themeFamily === 'antigravity');
                } else if (key === 'system') {
                    isCardActive = (themeFamily === 'system');
                } else {
                    isCardActive = (themeFamily === key);
                }
                cards[key].classList.toggle('active', isCardActive);
            }
        });
    }

    // --- Settings Modal Controller ---
    function openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        modal.classList.add('open');

        // Sync inputs
        const startChk = document.getElementById('settingsStartupInput');
        if (startChk) startChk.checked = !!appData.openOnStartup;

        const audioChk = document.getElementById('settingsAudioInput');
        if (audioChk) audioChk.checked = !!AudioEngine.enabled;

        // Sync Hub & Widget Visibility switches
        applyWidgetVisibility(false);

        // Sync Language picker selection
        document.querySelectorAll('.lang-card-btn').forEach(btn => {
            const bLang = btn.getAttribute('data-lang');
            btn.classList.toggle('active', bLang === currentLanguage);
        });
        const langBadge = document.getElementById('currentLangBadge');
        if (langBadge) {
            if (currentLanguage === 'auto') {
                langBadge.textContent = `🌐 ${t('lang.auto')} (${LOCALE_NAMES[activeLocale]})`;
            } else {
                langBadge.textContent = `${LOCALE_FLAGS[activeLocale]} ${LOCALE_NAMES[activeLocale]}`;
            }
        }
        const autoSub = document.getElementById('autoLangDetectedLabel');
        if (autoSub) {
            autoSub.textContent = `IDE: ${LOCALE_NAMES[activeLocale] || activeLocale}`;
        }

        // Sync Extra / Local AI section visibility (only display if ANY local engine is detected)
        const localAi = appData.system && appData.system.localAi;
        const hasLocal = Boolean(
            appData.system && (
                appData.system.hasLocalEngine ||
                appData.system.ollamaInstalled ||
                appData.system.ollamaOnline ||
                (localAi && (localAi.hasLocalEngine || (localAi.detectedEngines && localAi.detectedEngines.length > 0)))
            )
        );

        const extraSection = document.getElementById('settingsExtraLocalAiSection') || document.getElementById('settingsExtraOllamaSection');
        if (extraSection) {
            extraSection.style.display = hasLocal ? 'block' : 'none';
        }

        if (hasLocal) {
            const primary = (localAi && localAi.primaryEngine) || {
                id: 'ollama',
                name: 'Ollama',
                endpoint: 'http://127.0.0.1:11434',
                online: Boolean(appData.system && appData.system.ollamaOnline),
                activeModel: appData.system && appData.system.localModel
            };

            const isOnline = Boolean(primary.online);
            const pill = document.getElementById('settingsLocalAiPill') || document.getElementById('settingsOllamaPill');
            const btnText = document.getElementById('settingsLocalAiBtnText') || document.getElementById('settingsOllamaBtnText');
            const title = document.getElementById('settingsLocalAiTitle') || document.getElementById('settingsOllamaTitle');
            const desc = document.getElementById('settingsLocalAiDesc') || document.getElementById('settingsOllamaDesc');
            const endpointEl = document.getElementById('settingsLocalAiEndpoint');
            const dotEl = document.getElementById('settingsLocalAiDot');
            const tagEl = document.getElementById('settingsLocalAiModelTag');

            if (pill) {
                pill.textContent = `${primary.name}: ${isOnline ? 'Aktif' : 'Çevrimdışı'}`;
                pill.style.color = isOnline ? 'var(--neon-emerald)' : 'var(--text-dim)';
            }
            if (btnText) {
                if (primary.id === 'ollama') {
                    btnText.textContent = isOnline ? 'Motoru Durdur' : 'Motoru Başlat';
                } else {
                    btnText.textContent = isOnline ? 'Bağlantıyı Yenile' : 'Bağlantıyı Sına';
                }
            }
            if (title) {
                title.textContent = `Yerel Model (${primary.name})`;
            }
            if (endpointEl) {
                endpointEl.textContent = primary.endpoint || 'http://127.0.0.1';
            }
            if (dotEl) {
                dotEl.style.background = isOnline ? 'var(--neon-emerald)' : 'var(--text-dark)';
            }
            if (tagEl) {
                if (primary.activeModel) {
                    tagEl.textContent = primary.activeModel;
                    tagEl.style.display = 'inline-block';
                } else {
                    tagEl.style.display = 'none';
                }
            }
            if (desc && appData.system && appData.system.power && !appData.system.power.onAc) {
                desc.textContent = `Cihaz pilde (%${appData.system.power.percent}). Batarya koruması için yerel motor Eko Modunda tutuluyor.`;
            } else if (desc) {
                desc.textContent = `Bilgisayarınızda algılanan yerel ${primary.name} motoru üzerinden bağımsız kodlama ve algoritma çalıştırma.`;
            }
        }
    }

    function closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        modal.classList.remove('open');
    }

    // --- Hub & Widget Visibility Controller (Dashboard Özelleştirme) ---
    const DEFAULT_WIDGET_VISIBILITY = {
        gpu: true,
        quota: true,
        github: true,
        tabProjects: true,
        tabGithub: true,
        tabSessions: true,
        tabRadar: true,
        tabSkills: true,
        newChat: true,
        archiveDrawer: true,
        spaceCanvas: false // Varsayılan olarak kapalı (sade, dikkat dağıtmayan Antigravity Workbench deneyimi)
    };

    const widgetVisibility = Object.assign({}, DEFAULT_WIDGET_VISIBILITY);

    const WIDGET_SELECTORS = {
        gpu: '#teleCardGpu',
        quota: '#teleCardQuota',
        github: '#teleCardGithub',
        tabProjects: '#tabBtnProjects',
        tabGithub: '#tabBtnGithub',
        tabSessions: '#tabBtnSessions',
        tabRadar: '#tabBtnRadar',
        tabSkills: '#tabBtnSkills',
        newChat: '#hudBtnNewChat',
        archiveDrawer: '#archiveDrawerWrap',
        spaceCanvas: '#spaceCanvas'
    };

    const WIDGET_LABELS = {
        gpu: 'GPU Mimarisi Kartı',
        quota: 'Gemini Token & Kota Kartı',
        github: 'GitHub Senkronizasyon Kartı',
        tabProjects: 'Projeler Sekmesi',
        tabGithub: 'GitHub Sekmesi',
        tabSessions: 'Oturumlar Sekmesi',
        tabRadar: 'Graphify Radar Sekmesi',
        tabSkills: 'Agent Becerileri Sekmesi',
        newChat: 'Yeni Sohbet Butonu',
        archiveDrawer: 'Arşiv Çekmecesi',
        spaceCanvas: 'Parçacık Animasyonu'
    };

    function loadWidgetVisibility() {
        try {
            const raw = localStorage.getItem('antigravity_widget_visibility');
            if (raw) {
                const parsed = JSON.parse(raw);
                Object.keys(DEFAULT_WIDGET_VISIBILITY).forEach(k => {
                    if (typeof parsed[k] === 'boolean') {
                        widgetVisibility[k] = parsed[k];
                    }
                });
            } else if (savedState && savedState.widgetVisibility) {
                Object.keys(DEFAULT_WIDGET_VISIBILITY).forEach(k => {
                    if (typeof savedState.widgetVisibility[k] === 'boolean') {
                        widgetVisibility[k] = savedState.widgetVisibility[k];
                    }
                });
            }
        } catch {
            // Ignore corrupted JSON in storage
        }
    }

    function saveWidgetVisibility() {
        try {
            localStorage.setItem('antigravity_widget_visibility', JSON.stringify(widgetVisibility));
        } catch {
            // Ignore storage restrictions
        }
        saveState();
    }

    function applyWidgetVisibility(showFeedback = false, feedbackKey = null) {
        let activeCount = 0;
        const totalCount = Object.keys(DEFAULT_WIDGET_VISIBILITY).length;

        Object.keys(WIDGET_SELECTORS).forEach(key => {
            const isVisible = widgetVisibility[key] !== false;
            if (isVisible) activeCount++;

            const selector = WIDGET_SELECTORS[key];
            const targetEl = document.querySelector(selector);
            if (targetEl) {
                targetEl.style.display = isVisible ? '' : 'none';
            }

            // Sync corresponding toggle input in settings modal
            const inputId = 'visToggle' + key.charAt(0).toUpperCase() + key.slice(1);
            const toggleInput = document.getElementById(inputId);
            if (toggleInput) {
                toggleInput.checked = isVisible;
            }
        });

        // If all 3 telemetry cards are hidden, collapse #telemetryGrid
        const teleGrid = document.getElementById('telemetryGrid');
        if (teleGrid) {
            const anyTeleVisible = (widgetVisibility.gpu !== false) || (widgetVisibility.quota !== false) || (widgetVisibility.github !== false);
            teleGrid.style.display = anyTeleVisible ? 'grid' : 'none';
        }

        // Update visibility pill in settings header
        const countBadge = document.getElementById('visActiveCountBadge');
        if (countBadge) {
            if (activeCount === totalCount) {
                countBadge.textContent = 'Tümü Açık';
            } else if (activeCount === 0) {
                countBadge.textContent = 'Tümü Gizli';
            } else {
                countBadge.textContent = `${activeCount}/${totalCount} Açık`;
            }
        }

        // Check if the currently active tab has been hidden
        const tabMap = {
            projects: 'tabProjects',
            github: 'tabGithub',
            sessions: 'tabSessions',
            radar: 'tabRadar',
            skills: 'tabSkills'
        };
        if (widgetVisibility[tabMap[currentNavTab]] === false) {
            const order = ['projects', 'github', 'sessions', 'radar', 'skills'];
            const firstVisible = order.find(t => widgetVisibility[tabMap[t]] !== false);
            if (firstVisible) {
                switchNavTab(firstVisible);
            } else {
                document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));
                const filterBar = document.getElementById('filterBar');
                if (filterBar) filterBar.style.display = 'none';
            }
        }

        if (showFeedback && feedbackKey) {
            const name = WIDGET_LABELS[feedbackKey] || feedbackKey;
            const stateText = widgetVisibility[feedbackKey] ? 'Gösterildi' : 'Gizlendi';
            showToast(`${name} ${stateText}`);
        }
    }

    function setWidgetVisibility(widgetKey, visible, showFeedback = false) {
        if (widgetKey in DEFAULT_WIDGET_VISIBILITY) {
            widgetVisibility[widgetKey] = Boolean(visible);
            saveWidgetVisibility();
            applyWidgetVisibility(showFeedback, widgetKey);
        }
    }

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
        const count = Math.min(60, Math.floor((w * h) / 25000));
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                size: Math.random() * 1.5 + 0.4,
                alpha: Math.random() * 0.5 + 0.15
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

            // Zero-waste battery & CPU optimization:
            // Check if current theme disables canvas or reduces opacity to 0
            const canvasStyle = window.getComputedStyle(canvas);
            const canvasOpacity = parseFloat(canvasStyle.opacity || '1');
            if (canvasOpacity <= 0.02 || canvasStyle.display === 'none') {
                ctx.clearRect(0, 0, w, h);
                // Throttle animation frame when canvas is invisible/disabled
                animFrameId = setTimeout(() => {
                    animFrameId = requestAnimationFrame(render);
                }, 500);
                return;
            }

            ctx.clearRect(0, 0, w, h);
            const isLight = (themeMode === 'light');
            let starRgb = isLight ? '71, 85, 105' : '56, 189, 248';
            if (themeFamily === 'tokyo-night') starRgb = isLight ? '55, 96, 191' : '122, 162, 247';
            else if (themeFamily === 'catppuccin') starRgb = isLight ? '136, 57, 239' : '203, 166, 247';
            else if (themeFamily === 'solarized') starRgb = isLight ? '38, 139, 210' : '42, 161, 152';
            else if (themeFamily === 'nord') starRgb = isLight ? '94, 129, 172' : '136, 192, 208';
            else if (themeFamily === 'synchronized') starRgb = isLight ? '45, 90, 39' : '222, 235, 200';
            else if (themeFamily === 'cockpit-classic') starRgb = isLight ? '0, 132, 255' : '56, 189, 248';

            const starAlphaMult = isLight ? 0.35 : 1.0;

            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.x += s.vx;
                s.y += s.vy;
                if (s.x < 0) s.x = w;
                if (s.x > w) s.x = 0;
                if (s.y < 0) s.y = h;
                if (s.y > h) s.y = 0;

                ctx.fillStyle = `rgba(${starRgb}, ${s.alpha * starAlphaMult})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();

                if (mouseX >= 0 && mouseY >= 0) {
                    const dx = mouseX - s.x;
                    const dy = mouseY - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.strokeStyle = `rgba(${starRgb}, ${(1 - dist / 100) * (isLight ? 0.1 : 0.25)})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(s.x, s.y);
                        ctx.lineTo(mouseX, mouseY);
                        ctx.stroke();
                    }
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
        else if (tabId === 'skills') renderSkills();
    }

    function setSubFilter(filterId) {
        AudioEngine.click();
        currentSubFilter = filterId;
        document.querySelectorAll('#filterBar .chip-btn').forEach(b => b.classList.remove('active'));
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
            const hasAny = (appData.projects || []).length > 0;
            if (hasAny) {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
                    `<div class="icon">${ICONS.search}</div>` +
                    `<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">${escapeHtml(t('projects.emptyTitle'))}</h3>` +
                    `<p style="font-size: 13px;">${escapeHtml(t('projects.emptyDesc'))}</p>` +
                    '</div>';
            } else {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">' +
                    '<div class="icon" style="font-size: 36px; margin-bottom: 12px;">📁</div>' +
                    '<h3 style="font-size: 18px; margin-bottom: 8px; color: #fff;">Henüz Kayıtlı Proje Bulunamadı</h3>' +
                    '<p style="font-size: 13px; color: var(--text-dim); max-width: 480px; margin: 0 auto 20px;">' +
                    'Çalıştığınız projeleri Cockpit\'te anında görmek için bir klasör açabilir veya Ayarlar panelinden taranacak proje dizinleri ekleyebilirsiniz.' +
                    '</p>' +
                    '<div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">' +
                    `<button class="card-btn primary" data-action="openNewWorkspace">${ICONS.folderOpen} Klasör Aç</button>` +
                    `<button class="card-btn" data-action="openSettings">${ICONS.settings} Taranacak Dizin Ekle</button>` +
                    '</div>' +
                    '</div>';
            }
            return;
        }

        let html = '';
        for (const p of list) {
            const favClass = p.isFavorite ? 'favorite is-favorite' : '';
            const favActive = p.isFavorite ? 'active' : '';
            const lastCommit = (p.gitLog && p.gitLog.length > 0) ? p.gitLog[0] : null;

            html += `<div class="project-card ${favClass}" id="card-${escapeHtml(p.name)}">` +
                '<div class="card-header">' +
                    '<div>' +
                        `<div class="card-name">${escapeHtml(p.name)}</div>` +
                    '</div>' +
                    '<div style="display:flex; gap:6px;">' +
                        `<button class="icon-action-btn fav-btn ${favActive}" aria-label="Favori" title="${p.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" data-action="toggleFav" data-id="${escapeHtml(p.path)}">${p.isFavorite ? ICONS.starFilled : ICONS.star}</button>` +
                        `<button class="icon-action-btn arch-btn" aria-label="Arşivle" title="${p.isArchived ? 'Arşivden Çıkar' : 'Arşivle'}" data-action="toggleArch" data-id="${escapeHtml(p.path)}">${ICONS.archive}</button>` +
                    '</div>' +
                '</div>' +
                `<div class="card-path" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>` +
                '<div class="card-badges">' +
                    (p.isGit ? `<span class="badge-pill badge-git">${ICONS.gitBranch} ${escapeHtml(p.branch)}</span>` : '') +
                    (p.hasUncommitted ? '<span class="badge-pill badge-uncommitted" title="Kaydedilmemiş değişiklikler var"><span class="status-dot-sm"></span> Değişiklikler Var</span>' : '') +
                    (p.hasGraphify ? `<span class="badge-pill badge-graphify">${ICONS.network} Graphify</span>` : '') +
                '</div>' +
                (lastCommit ? `<div class="card-commit"><span>${ICONS.gitCommit} ${escapeHtml(lastCommit.msg.slice(0, 75))} <em style="color:var(--text-dark); margin-left:6px;">(${escapeHtml(lastCommit.ago)})</em></span></div>` : '') +
                (!lastCommit && p.sessionNotes ? `<div class="card-commit"><span>${escapeHtml(p.sessionNotes.slice(0, 90))}...</span></div>` : '') +
                '<div class="card-footer">' +
                    `<button class="card-btn primary" data-action="openFolder" data-path="${escapeHtml(p.rawPath)}">${ICONS.folderOpen} ${escapeHtml(t('projects.ide'))}</button>` +
                    `<button class="card-btn" data-action="openFolderNewWin" data-path="${escapeHtml(p.rawPath)}" title="${escapeHtml(t('projects.open'))}">${ICONS.window} ${escapeHtml(t('projects.open'))}</button>` +
                    (p.hasGraphify ? `<button class="card-btn graph-btn" data-action="openGraphify" data-path="${escapeHtml(p.graphifyPath)}">${ICONS.observatory} ${escapeHtml(t('projects.graph'))}</button>` : '') +
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
            const hasAny = (appData.githubRepos || []).length > 0;
            if (hasAny || q) {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
                    `<div class="icon">${ICONS.github}</div>` +
                    `<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">${escapeHtml(t('projects.emptyTitle'))}</h3>` +
                    `<p style="font-size: 13px;">${escapeHtml(t('projects.emptyDesc'))}</p>` +
                    '</div>';
            } else {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">' +
                    `<div class="icon" style="font-size: 36px; margin-bottom: 12px;">${ICONS.github}</div>` +
                    '<h3 style="font-size: 18px; margin-bottom: 8px; color: #fff;">GitHub Hesabınızı Bağlayın</h3>' +
                    '<p style="font-size: 13px; color: var(--text-dim); max-width: 480px; margin: 0 auto 20px;">' +
                    'GitHub repolarınızı Cockpit\'te anında listelemek ve tek tıkla açmak için Ayarlar\'dan kullanıcı adınızı girin veya terminalde <code style="color:var(--neon-cyan); background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">gh auth login</code> çalıştırın.' +
                    '</p>' +
                    '<div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">' +
                    `<button class="card-btn primary" data-action="openSettings">${ICONS.settings} Kullanıcı Adı Ayarla</button>` +
                    '<button class="card-btn" data-action="copyGhAuthCommand">📋 "gh auth login" Kopyala</button>' +
                    '</div>' +
                    '</div>';
            }
            return;
        }

        let html = '';
        for (const r of list) {
            const isFav = Boolean(r.isFavorite);
            const favClass = isFav ? 'favorite is-favorite' : '';
            const favActive = isFav ? 'active' : '';

            html += `<div class="project-card ${favClass}">` +
                '<div class="card-header">' +
                    '<div>' +
                        `<div class="card-name">${escapeHtml(r.name)}</div>` +
                        `<div style="font-size: 11px; color: var(--text-dark); font-family: 'JetBrains Mono', monospace;">${escapeHtml(r.fullName)}</div>` +
                    '</div>' +
                    '<div style="display:flex; gap:6px;">' +
                        `<button class="icon-action-btn fav-btn ${favActive}" aria-label="Favori" title="${isFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" data-action="toggleFav" data-id="${escapeHtml(r.url || r.name)}">${isFav ? ICONS.starFilled : ICONS.star}</button>` +
                        `<button class="icon-action-btn arch-btn" aria-label="Arşivle" title="Arşivle" data-action="toggleArch" data-id="${escapeHtml(r.name)}">${ICONS.archive}</button>` +
                    '</div>' +
                '</div>' +
                `<div class="card-path" style="height:36px; -webkit-line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;" title="${escapeHtml(r.description)}">${escapeHtml(r.description)}</div>` +
                '<div class="card-badges">' +
                    `<span class="badge-pill badge-git">${ICONS.gitBranch} ${escapeHtml(r.defaultBranch || 'main')}</span>` +
                    (r.language ? `<span class="badge-pill badge-tech">${escapeHtml(r.language)}</span>` : '') +
                    (r.stars > 0 ? `<span class="badge-pill badge-star">${ICONS.starFilled} ${r.stars}</span>` : '') +
                    (r.isPrivate ? `<span class="badge-pill badge-private">${ICONS.lock} Gizli</span>` : `<span class="badge-pill badge-public">${ICONS.globe} Açık</span>`) +
                    (r.isCloned ? `<span class="badge-pill badge-cloned">${ICONS.check} Klonlanmış</span>` : '') +
                '</div>' +
                `<div class="card-commit"><span>${ICONS.clock} Son güncelleme: ${escapeHtml(r.timeAgo)}</span></div>` +
                '<div class="card-footer">' +
                    `<button class="card-btn primary" data-action="openUrl" data-url="${escapeHtml(r.url)}">${ICONS.github} GitHub.com</button>` +
                    (r.isCloned ? (
                        `<button class="card-btn" data-action="openFolder" data-path="${escapeHtml(r.localPath)}">${ICONS.folderOpen} ${escapeHtml(t('projects.ide'))}</button>`
                    ) : (
                        `<button class="card-btn" style="background: rgba(129, 140, 248, 0.15); border-color: var(--neon-purple);" data-action="cloneRepo" data-name="${escapeHtml(r.name)}">${ICONS.download} ${escapeHtml(t('projects.clone'))}</button>`
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
                `<div class="icon">${ICONS.history}</div>` +
                `<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">${escapeHtml(t('sessions.emptyTitle'))}</h3>` +
                `<p style="font-size: 13px;">${escapeHtml(t('sessions.emptyDesc'))}</p>` +
                '</div>';
            return;
        }

        let html = '';
        for (const s of list) {
            html += '<div class="session-card">' +
                '<div class="sess-main">' +
                    `<div class="sess-prompt">${escapeHtml(s.prompt)}</div>` +
                    '<div class="sess-meta">' +
                        `<span>${ICONS.clock} ${escapeHtml(s.time)} (${escapeHtml(s.timeAgo)})</span>` +
                        `<span>${ICONS.tools} ${s.toolCount} ${escapeHtml(t('sessions.toolCalls'))}</span>` +
                        (s.activeDoc ? `<span style="color: var(--neon-cyan);">${ICONS.fileCode} ${escapeHtml(s.activeDoc.split('/').pop())}</span>` : '') +
                    '</div>' +
                '</div>' +
                '<div class="sess-actions">' +
                    `<button class="card-btn primary" data-action="openTranscript" data-path="${escapeHtml(s.transcriptPath)}">${ICONS.fileCode} ${escapeHtml(t('sessions.transcript'))}</button>` +
                    `<button class="card-btn" data-action="openSessionFolder" data-path="${escapeHtml(s.path)}">${ICONS.folder} ${escapeHtml(t('sessions.folder'))}</button>` +
                '</div>' +
            '</div>';
        }
        listEl.innerHTML = html;
    }

    function renderRadar() {
        const graphList = document.getElementById('radarGraphList');

        if (graphList) {
            let html = '';
            const graphs = (appData.projects || []).filter(p => p.hasGraphify);
            const badge = document.getElementById('badgeGraphCount');
            if (badge) badge.textContent = `${graphs.length} ${t('radar.maps')}`;

            for (const p of graphs) {
                html += '<li class="radar-item" style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">' +
                    '<div style="display: flex; align-items: center; gap: 8px; min-width: 0;">' +
                        `<span class="ag-icon" style="color: var(--neon-cyan);">${ICONS.network}</span>` +
                        `<span style="color: #fff; font-weight: 600; font-size: 13px;">${escapeHtml(p.name)}</span>` +
                    '</div>' +
                    `<button class="chip-btn" style="padding: 4px 10px; font-size: 11px;" data-action="openGraphify" data-path="${escapeHtml(p.graphifyPath)}">${ICONS.externalLink} ${escapeHtml(t('radar.openEdge'))}</button>` +
                '</li>';
            }
            if (!html) html = `<li class="radar-item" style="opacity: 0.5;">${escapeHtml(t('radar.empty'))}</li>`;
            graphList.innerHTML = html;
        }
    }

    let currentSkillCategory = 'all';

    const SKILL_CAT_ICONS = {
        'architecture': '🏛️',
        'design': '🎨',
        'quality': '🧼',
        'optimization': '⚡',
        'local-ai': '🤖',
        'general': '⚙️'
    };

    function renderSkills() {
        const grid = document.getElementById('skillsGrid');
        if (!grid) return;

        const skillsData = appData.skills || { skills: [], categories: {}, totalCount: 0 };
        const rawList = skillsData.skills || [];

        // Update stats and badge counts
        const totalCount = typeof skillsData.totalCount === 'number' ? skillsData.totalCount : rawList.length;
        const statTotal = document.getElementById('skillsStatTotal');
        if (statTotal) statTotal.textContent = totalCount;

        const badgeSkill = document.getElementById('badgeSkillCount');
        if (badgeSkill) badgeSkill.textContent = totalCount;

        const cats = skillsData.categories || {};
        const countAll = document.getElementById('catCountAll');
        if (countAll) countAll.textContent = totalCount;
        const countArch = document.getElementById('catCountArch');
        if (countArch) countArch.textContent = cats.architecture || 0;
        const countDesign = document.getElementById('catCountDesign');
        if (countDesign) countDesign.textContent = cats.design || 0;
        const countQuality = document.getElementById('catCountQuality');
        if (countQuality) countQuality.textContent = cats.quality || 0;
        const countOpt = document.getElementById('catCountOpt');
        if (countOpt) countOpt.textContent = cats.optimization || 0;
        const countLocalAi = document.getElementById('catCountLocalAi');
        if (countLocalAi) countLocalAi.textContent = cats['local-ai'] || 0;

        // Filter list by category and search query
        const q = (document.getElementById('skillSearchInput')?.value || '').trim().toLowerCase();
        const list = rawList.filter(s => {
            if (currentSkillCategory !== 'all' && s.category !== currentSkillCategory) {
                return false;
            }
            if (q) {
                const inName = (s.name || '').toLowerCase().includes(q);
                const inDisplay = (s.displayName || '').toLowerCase().includes(q);
                const inDesc = (s.description || '').toLowerCase().includes(q);
                const inPrompt = (s.promptHint || '').toLowerCase().includes(q);
                return inName || inDisplay || inDesc || inPrompt;
            }
            return true;
        });

        if (list.length === 0) {
            if (totalCount === 0) {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">' +
                    '<div class="icon" style="font-size: 36px; margin-bottom: 12px;">🧠</div>' +
                    '<h3 style="font-size: 18px; margin-bottom: 8px; color: #fff;">Henüz Kayıtlı Ajan Yeteneği Bulunamadı</h3>' +
                    '<p style="font-size: 13px; color: var(--text-dim); max-width: 480px; margin: 0 auto 20px;">' +
                    'Antigravity yetenekleri ~/.gemini/config/skills/ klasöründen taranır. Kendi yeteneklerinizi ekleyebilir veya Antigravity Agent\'tan yüklemesini isteyebilirsiniz.' +
                    '</p>' +
                    `<button class="card-btn primary" data-action="openSkillsFolder">${ICONS.folderOpen} Skills Klasörünü Aç</button>` +
                    '</div>';
            } else {
                grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">' +
                    `<div class="icon">${ICONS.search}</div>` +
                    `<h3 style="font-size: 18px; margin-bottom: 6px; color: #fff;">${escapeHtml(t('skills.emptyTitle'))}</h3>` +
                    `<p style="font-size: 13px;">${escapeHtml(t('skills.emptyDesc'))}</p>` +
                    '</div>';
            }
            return;
        }

        let html = '';
        for (const s of list) {
            const catIcon = SKILL_CAT_ICONS[s.category] || '⚡';
            const catKey = 'skills.cat' + s.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
            const catLabel = t(catKey) || s.category;

            html += `<div class="skill-card" data-category="${escapeHtml(s.category)}">` +
                '<div class="skill-card-top">' +
                    '<div class="skill-title-wrap">' +
                        `<span class="skill-icon">${catIcon}</span>` +
                        `<span class="skill-name">${escapeHtml(s.displayName)}</span>` +
                    '</div>' +
                    `<span class="skill-badge cat-${escapeHtml(s.category)}">${escapeHtml(catLabel)}</span>` +
                '</div>' +
                `<div class="skill-desc">${escapeHtml(s.description)}</div>` +
                `<div class="skill-prompt-box" data-action="copySkillPrompt" data-prompt="${escapeHtml(s.promptHint)}" data-name="${escapeHtml(s.displayName)}" title="${escapeHtml(t('skills.copyHint', { name: s.displayName }))}">` +
                    `<code>${escapeHtml(s.promptHint)}</code>` +
                    '<span class="skill-prompt-copy-icon">📋</span>' +
                '</div>' +
                '<div class="skill-actions">' +
                    `<button class="skill-btn" data-action="openSkillFile" data-path="${escapeHtml(s.skillPath)}" title="${escapeHtml(t('skills.rulesFile'))}">` +
                        '<span>📄</span>' +
                        `<span>${escapeHtml(t('skills.rulesFile'))}</span>` +
                    '</button>' +
                    `<button class="skill-btn primary" data-action="chatWithSkill" data-prompt="${escapeHtml(s.promptHint)}" title="${escapeHtml(t('skills.startChat'))}">` +
                        '<span>💬</span>' +
                        `<span>${escapeHtml(t('skills.startChat'))}</span>` +
                    '</button>' +
                '</div>' +
            '</div>';
        }
        grid.innerHTML = html;
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
            grid.innerHTML = `<div class="empty-archive">${ICONS.archive} ${escapeHtml(t('projects.archiveEmpty'))}</div>`;
            return;
        }

        let html = '';
        for (const p of archivedProjects) {
            html += '<div class="archived-card">' +
                '<div class="archived-info">' +
                    `<div class="archived-title">${ICONS.folder} ${escapeHtml(p.name)} <span class="archived-type local">${escapeHtml(t('projects.local'))}</span></div>` +
                    `<div class="archived-sub" title="${escapeHtml(p.path)}">${escapeHtml(p.path)}</div>` +
                '</div>' +
                '<div class="archived-actions">' +
                    `<button class="unarch-btn" data-action="toggleArch" data-id="${escapeHtml(p.path)}">${ICONS.undo} ${escapeHtml(t('projects.unarchive'))}</button>` +
                    `<button class="card-btn" style="padding: 6px 10px; font-size: 11px;" data-action="openFolder" data-path="${escapeHtml(p.rawPath)}">${ICONS.folderOpen} ${escapeHtml(t('projects.open'))}</button>` +
                '</div>' +
            '</div>';
        }

        for (const r of archivedGithub) {
            html += '<div class="archived-card">' +
                '<div class="archived-info">' +
                    `<div class="archived-title">${ICONS.github} ${escapeHtml(r.name)} <span class="archived-type gh">${escapeHtml(t('projects.github'))}</span></div>` +
                    `<div class="archived-sub" title="${escapeHtml(r.fullName)}">${escapeHtml(r.fullName)}</div>` +
                '</div>' +
                '<div class="archived-actions">' +
                    `<button class="unarch-btn" data-action="toggleArch" data-id="${escapeHtml(r.name)}">${ICONS.undo} ${escapeHtml(t('projects.unarchive'))}</button>` +
                    `<button class="card-btn" style="padding: 6px 10px; font-size: 11px;" data-action="openUrl" data-url="${escapeHtml(r.url)}">${ICONS.github} ${escapeHtml(t('projects.github'))}</button>` +
                '</div>' +
            '</div>';
        }

        grid.innerHTML = html;
    }

    // --- Live Quota Countdown State ---
    const liveResetDates = {
        gemini: null,
        claude: null
    };

    function updateLiveCountdown() {
        if (!liveResetDates.gemini) return;
        const now = Date.now();
        const diff = liveResetDates.gemini - now;
        const geminiTimer = document.getElementById('geminiTimerVal');
        if (geminiTimer) {
            if (diff > 0) {
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                geminiTimer.textContent = `${hours}h ${mins}m ${secs}s`;
                geminiTimer.title = `Sıfırlanmaya kalan: ${hours} saat ${mins} dakika ${secs} saniye`;
            } else {
                geminiTimer.textContent = 'Canlı';
            }
        }
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
        const pAvail = promptCredits.available ?? (tokens.formatted?.promptAvailable ?? '—');
        const pMonthly = tokens.formatted?.promptMonthly ?? (promptCredits.monthly ? `${Math.round(promptCredits.monthly / 1000)}K` : '50K');
        const fAvail = flowCredits.available ?? (tokens.formatted?.flowAvailable ?? '—');
        const fMonthly = tokens.formatted?.flowMonthly ?? (flowCredits.monthly ? `${Math.round(flowCredits.monthly / 1000)}K` : '150K');

        // Main card token credits pill
        const telePromptVal = document.getElementById('teleTokenPromptVal');
        if (telePromptVal) telePromptVal.textContent = pAvail;
        const telePromptMonthly = document.getElementById('teleTokenPromptMonthly');
        if (telePromptMonthly) telePromptMonthly.textContent = pMonthly;

        const modalPrompt = document.getElementById('modalPromptCredits');
        if (modalPrompt) modalPrompt.textContent = `${pAvail} / ${pMonthly}`;
        const modalFlow = document.getElementById('modalFlowCredits');
        if (modalFlow) modalFlow.textContent = `${fAvail} / ${fMonthly}`;

        const modalPromptBar = document.getElementById('modalPromptBar');
        if (modalPromptBar && promptCredits.remainingPercentage !== undefined) {
            const pct = Math.min(100, Math.max(0, promptCredits.remainingPercentage * 100));
            modalPromptBar.style.width = `${pct}%`;
        }
        const modalFlowBar = document.getElementById('modalFlowBar');
        if (modalFlowBar && flowCredits.remainingPercentage !== undefined) {
            const pct = Math.min(100, Math.max(0, flowCredits.remainingPercentage * 100));
            modalFlowBar.style.width = `${pct}%`;
        }

        const groups = panelData.groups || [];
        const gemini = groups.find(g => g.id === 'gemini') || { remaining: null, resetTime: '—' };
        const claude = groups.find(g => g.id === 'non-google' || g.id === 'claude') || { remaining: null, resetTime: '—' };

        updateAgGauges(gemini, claude, isOnline);
    }

    function updateAgGauges(gemini, claude, isOnline) {
        const CIRCUMFERENCE = 100.53;

        liveResetDates.gemini = gemini.resetDate ? Number(gemini.resetDate) : null;
        liveResetDates.claude = claude.resetDate ? Number(claude.resetDate) : null;

        // Gemini with 1 decimal precision for instantaneous real-time responsiveness
        const rawGPct = (gemini.remaining !== null && typeof gemini.remaining !== 'undefined') ? Number(gemini.remaining) : null;
        const gPctStr = rawGPct !== null ? rawGPct.toFixed(1) : '—';

        const geminiArc = document.getElementById('geminiGaugeArc');
        if (geminiArc) {
            const pct = rawGPct !== null ? Math.min(100, Math.max(0, rawGPct)) : 0;
            const gOffset = rawGPct !== null ? CIRCUMFERENCE * (1 - pct / 100) : CIRCUMFERENCE;
            geminiArc.style.strokeDashoffset = gOffset;
        }

        const geminiPct = document.getElementById('geminiPctVal');
        if (geminiPct) {
            if (geminiPct.textContent !== gPctStr) {
                geminiPct.classList.remove('flash-update');
                void geminiPct.offsetWidth;
                geminiPct.classList.add('flash-update');
            }
            geminiPct.textContent = gPctStr;
        }

        const geminiTimer = document.getElementById('geminiTimerVal');
        if (geminiTimer && !gemini.resetDate) {
            geminiTimer.textContent = gemini.resetTime || (isOnline ? 'Canlı' : 'Bağlantı Yok');
        }

        const teleGeminiText = document.getElementById('teleGeminiPctText');
        if (teleGeminiText) {
            const newText = rawGPct !== null ? `${gPctStr}%` : '—%';
            if (teleGeminiText.textContent !== newText) {
                teleGeminiText.classList.remove('flash-update');
                void teleGeminiText.offsetWidth;
                teleGeminiText.classList.add('flash-update');
            }
            teleGeminiText.textContent = newText;
        }

        const gWeekly = gemini.weekly || {};
        const gWeeklyVal = document.getElementById('geminiWeeklyVal');
        if (gWeeklyVal) {
            const wVal = gWeekly.remaining ? Number(gWeekly.remaining).toFixed(1) + '%' : (rawGPct !== null ? `${gPctStr}%` : '—');
            gWeeklyVal.textContent = wVal;
        }
        const gWeeklyReset = document.getElementById('geminiWeeklyReset');
        if (gWeeklyReset) gWeeklyReset.textContent = gWeekly.resetTime || '—';

        // Claude
        const rawCPct = (claude.remaining !== null && typeof claude.remaining !== 'undefined') ? Number(claude.remaining) : null;
        const cPctStr = rawCPct !== null ? rawCPct.toFixed(1) : '—';
        const claudeArc = document.getElementById('claudeGaugeArc');
        if (claudeArc) {
            const cPctNum = rawCPct !== null ? Math.min(100, Math.max(0, rawCPct)) : 0;
            const cOffset = rawCPct !== null ? CIRCUMFERENCE * (1 - cPctNum / 100) : CIRCUMFERENCE;
            claudeArc.style.strokeDashoffset = cOffset;
        }

        const claudePct = document.getElementById('claudePctVal');
        if (claudePct) claudePct.textContent = cPctStr;

        const claudeTimer = document.getElementById('claudeTimerVal');
        if (claudeTimer && !claude.resetDate) {
            claudeTimer.textContent = claude.resetTime || (isOnline ? 'Canlı' : 'Bağlantı Yok');
        }

        const claudeMiniPill = document.getElementById('claudeMiniPill');
        if (claudeMiniPill) {
            claudeMiniPill.innerHTML = `Claude: <strong style="color: ${rawCPct !== null && rawCPct > 0 ? '#fb923c' : 'var(--text-dark)'};">${rawCPct !== null ? cPctStr + '%' : '0%'}</strong>`;
        }

        // Collapsed summary indicator
        const summary = document.getElementById('agCollapsedSummary');
        if (summary) {
            summary.innerHTML = isOnline
                ? `<span style="color: #40C4FF; font-weight: 700;">Gemini: ${gPctStr}% (${gemini.resetTime || '—'})</span><span style="opacity: 0.4;">|</span><span style="color: #FFAB40; font-weight: 700;">Claude: ${cPctStr}% (${claude.resetTime || '—'})</span>`
                : '<span style="color: var(--text-dark);">Antigravity Panel: Çevrimdışı</span>';
        }
    }

    function updateDashboardUI(data) {
        if (!data) return;
        appData = data;

        let savedLang = null;
        try {
            savedLang = localStorage.getItem('antigravity_language');
        } catch (_) {}
        if (!savedLang && data.configuredLanguage) {
            currentLanguage = data.configuredLanguage;
        }
        applyLanguage(currentLanguage, false);

        const pCount = (data.projects || []).filter(p => !p.isArchived).length;
        const ghCount = (data.githubRepos || []).filter(r => !r.isArchived).length;
        const sessCount = (data.sessions || []).length;

        const bProj = document.getElementById('badgeProjCount');
        if (bProj) bProj.textContent = pCount;
        const bGh = document.getElementById('badgeGhCount');
        if (bGh) bGh.textContent = ghCount;
        const bSess = document.getElementById('badgeSessCount');
        if (bSess) bSess.textContent = sessCount;
        const bSkills = document.getElementById('badgeSkillCount');
        if (bSkills) bSkills.textContent = (data.skills && typeof data.skills.totalCount === 'number') ? data.skills.totalCount : (data.skills?.skills?.length || 0);

        const favCountEl = document.getElementById('favChipCount');
        if (favCountEl) favCountEl.textContent = data.favCount || 0;

        const archBadge = document.getElementById('archCountBadge');
        if (archBadge) archBadge.textContent = data.archCount || 0;

        const startupIcon = document.getElementById('startupIcon');
        if (startupIcon) {
            startupIcon.innerHTML = data.openOnStartup ? ICONS.checkSquare : ICONS.square;
        }

        const audioIcon = document.getElementById('audioIcon');
        if (audioIcon) {
            audioIcon.innerHTML = AudioEngine.enabled ? ICONS.volumeOn : ICONS.volumeOff;
        }

        const teleGraphify = document.getElementById('teleGraphify');
        if (teleGraphify && data.system) {
            teleGraphify.textContent = data.system.graphifyStatus || 'Canlı Mimari Harita';
        }

        const teleGh = document.getElementById('teleGithubUser');
        if (teleGh) {
            if (data.githubUser) {
                teleGh.textContent = `${data.githubUser} (Aktif)`;
                teleGh.style.color = 'var(--neon-emerald)';
            } else {
                teleGh.textContent = 'Bağlı Değil (Hesap Ekle)';
                teleGh.style.color = 'var(--text-dim)';
            }
        }
        const heroTitle = document.getElementById('ghHeroTitle');
        if (heroTitle) {
            heroTitle.textContent = data.githubUser ? `${data.githubUser} GitHub Ekosistemi` : 'GitHub Repoları & Ekosistem';
        }

        if (data.system) {
            const teleGpu = document.getElementById('teleGpu');
            if (teleGpu) teleGpu.textContent = data.system.gpu || 'GPU Algılanmadı';

            // Sync Extra section visibility in settings modal (only show if any local engine exists)
            const localAi = data.system.localAi;
            const hasLocal = Boolean(
                data.system.hasLocalEngine ||
                data.system.ollamaInstalled ||
                data.system.ollamaOnline ||
                (localAi && (localAi.hasLocalEngine || (localAi.detectedEngines && localAi.detectedEngines.length > 0)))
            );
            const extraSection = document.getElementById('settingsExtraLocalAiSection') || document.getElementById('settingsExtraOllamaSection');
            if (extraSection) {
                extraSection.style.display = hasLocal ? 'block' : 'none';
            }

            if (hasLocal) {
                const primary = (localAi && localAi.primaryEngine) || {
                    id: 'ollama',
                    name: 'Ollama',
                    endpoint: 'http://127.0.0.1:11434',
                    online: Boolean(data.system.ollamaOnline),
                    activeModel: data.system.localModel
                };

                const isOnline = Boolean(primary.online);
                const pill = document.getElementById('settingsLocalAiPill') || document.getElementById('settingsOllamaPill');
                const btnText = document.getElementById('settingsLocalAiBtnText') || document.getElementById('settingsOllamaBtnText');
                const title = document.getElementById('settingsLocalAiTitle') || document.getElementById('settingsOllamaTitle');
                const desc = document.getElementById('settingsLocalAiDesc') || document.getElementById('settingsOllamaDesc');
                const endpointEl = document.getElementById('settingsLocalAiEndpoint');
                const dotEl = document.getElementById('settingsLocalAiDot');
                const tagEl = document.getElementById('settingsLocalAiModelTag');

                if (pill) {
                    pill.textContent = `${primary.name}: ${isOnline ? 'Aktif' : 'Çevrimdışı'}`;
                    pill.style.color = isOnline ? 'var(--neon-emerald)' : 'var(--text-dim)';
                }
                if (btnText) {
                    if (primary.id === 'ollama') {
                        btnText.textContent = isOnline ? 'Motoru Durdur' : 'Motoru Başlat';
                    } else {
                        btnText.textContent = isOnline ? 'Bağlantıyı Yenile' : 'Bağlantıyı Sına';
                    }
                }
                if (title) {
                    title.textContent = `Yerel Model (${primary.name})`;
                }
                if (endpointEl) {
                    endpointEl.textContent = primary.endpoint || 'http://127.0.0.1';
                }
                if (dotEl) {
                    dotEl.style.background = isOnline ? 'var(--neon-emerald)' : 'var(--text-dark)';
                }
                if (tagEl) {
                    if (primary.activeModel) {
                        tagEl.textContent = primary.activeModel;
                        tagEl.style.display = 'inline-block';
                    } else {
                        tagEl.style.display = 'none';
                    }
                }
                if (desc && data.system.power && !data.system.power.onAc) {
                    desc.textContent = `Cihaz pilde (%${data.system.power.percent}). Batarya koruması için yerel motor Eko Modunda tutuluyor.`;
                } else if (desc) {
                    desc.textContent = `Bilgisayarınızda algılanan yerel ${primary.name} motoru üzerinden bağımsız kodlama ve algoritma çalıştırma.`;
                }
            }
        }

        renderProjects();
        renderGithub();
        renderSessions();
        renderRadar();
        renderSkills();
        renderArchive();
        renderAntigravityPanel(data.panel);
    }

    // --- Action Dispatcher ---
    function handleAction(action, el, event) {
        switch (action) {
            case 'toggleTheme':
                AudioEngine.theme();
                toggleTheme();
                break;

            case 'toggleThemeDropdown':
                AudioEngine.click();
                toggleThemeDropdown();
                break;

            case 'closeThemeDropdown':
                closeThemeDropdown();
                break;

            case 'setThemeModeType': {
                const mode = el.dataset.mode;
                if (mode) {
                    AudioEngine.theme();
                    setThemeModeType(mode, true);
                }
                break;
            }

            case 'selectThemeFamily': {
                const family = el.dataset.family;
                if (family) {
                    AudioEngine.theme();
                    selectThemeFamily(family, true);
                }
                break;
            }

            case 'startNewChat':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openChat' });
                showToast('Yeni sohbet başlatılıyor...');
                break;

            case 'toggleLocalAi':
            case 'toggleOllama': {
                AudioEngine.click();
                const primary = (appData.system && appData.system.localAi && appData.system.localAi.primaryEngine) || { id: 'ollama', name: 'Yerel Motor' };
                showToast(`${primary.name || 'Yerel motor'} durumu güncelleniyor...`);
                if (vscode) vscode.postMessage({ command: 'toggleLocalAi', engineId: primary.id });
                break;
            }

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

            case 'openSettings':
                AudioEngine.click();
                openSettingsModal();
                break;

            case 'closeSettings':
                if (el.id === 'settingsModal' && event && event.target !== el) {
                    break;
                }
                AudioEngine.click();
                closeSettingsModal();
                break;

            case 'toggleWidgetVisibility': {
                const widgetKey = el.dataset.widget;
                if (widgetKey) {
                    AudioEngine.click();
                    const newVal = el.checked !== undefined ? el.checked : !widgetVisibility[widgetKey];
                    setWidgetVisibility(widgetKey, newVal, true);
                }
                break;
            }

            case 'setThemeMode': {
                const mode = el.dataset.theme;
                if (mode) {
                    AudioEngine.theme();
                    if (mode === 'light') {
                        setThemeModeType('light', true);
                    } else if (mode === 'system') {
                        selectThemeFamily('system', true);
                    } else {
                        selectThemeFamily(mode, true);
                        setThemeModeType('dark', false);
                    }
                }
                break;
            }

            case 'setLanguage': {
                const lang = el.dataset.lang || 'auto';
                AudioEngine.click();
                applyLanguage(lang, true);
                break;
            }

            case 'toggleAudio': {
                const enabled = el.tagName === 'INPUT' ? AudioEngine.setEnabled(el.checked) : AudioEngine.toggle();
                const chk = document.getElementById('settingsAudioInput');
                if (chk && chk !== el) chk.checked = enabled;
                const icon = document.getElementById('audioIcon');
                if (icon) icon.innerHTML = enabled ? ICONS.volumeOn : ICONS.volumeOff;
                showToast(enabled ? 'Arayüz ses efektleri etkinleştirildi' : 'Ses efektleri kapatıldı');
                break;
            }

            case 'refresh':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'refresh' });
                showToast('Veriler güncelleniyor...');
                break;

            case 'toggleStartup': {
                AudioEngine.click();
                const newVal = (el.tagName === 'INPUT') ? el.checked : !appData.openOnStartup;
                appData.openOnStartup = newVal;
                const chk = document.getElementById('settingsStartupInput');
                if (chk && chk !== el) chk.checked = newVal;
                const icon = document.getElementById('startupIcon');
                if (icon) icon.innerHTML = newVal ? ICONS.checkSquare : ICONS.square;
                if (vscode) vscode.postMessage({ command: 'toggleStartup', value: newVal });
                showToast(newVal ? 'Açılışta otomatik başlatma açıldı' : 'Açılışta otomatik başlatma kapatıldı');
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

            case 'filterSkills': {
                const cat = el.dataset.category || 'all';
                currentSkillCategory = cat;
                document.querySelectorAll('#skillsCatChips .chip-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.category === cat);
                });
                AudioEngine.click();
                renderSkills();
                break;
            }

            case 'copySkillPrompt': {
                const prompt = el.dataset.prompt || '';
                const name = el.dataset.name || 'Skill';
                if (prompt) {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(prompt).catch(() => {});
                    }
                    if (vscode) vscode.postMessage({ command: 'copySkillPrompt', prompt });
                    AudioEngine.click();
                    showToast(t('skills.promptCopied', { name }));
                }
                break;
            }

            case 'openSkillFile': {
                const fPath = el.dataset.path || '';
                if (fPath) {
                    AudioEngine.click();
                    showToast('Kural dosyası açılıyor...');
                    if (vscode) {
                        vscode.postMessage({ command: 'openSkillFile', path: fPath });
                    } else {
                        window.open('file:///' + fPath, '_blank');
                    }
                }
                break;
            }

            case 'chatWithSkill': {
                const prompt = el.dataset.prompt || '';
                AudioEngine.click();
                if (navigator.clipboard && prompt) {
                    navigator.clipboard.writeText(prompt).catch(() => {});
                }
                const previewText = prompt.length > 35 ? prompt.slice(0, 35) + '...' : prompt;
                showToast(`💬 Sohbet başlatılıyor: "${previewText}"`);
                if (vscode) {
                    vscode.postMessage({ command: 'chatWithSkill', prompt });
                }
                break;
            }

            case 'toggleFav': {
                const id = el.dataset.id;
                if (!id) break;
                AudioEngine.favorite();
                (appData.projects || []).forEach(p => {
                    if (p.path === id || p.rawPath === id) p.isFavorite = !p.isFavorite;
                });
                (appData.githubRepos || []).forEach(r => {
                    if (r.name === id || r.url === id) r.isFavorite = !r.isFavorite;
                });
                renderProjects();
                renderGithub();
                if (vscode) vscode.postMessage({ command: 'toggleFavorite', id });
                break;
            }

            case 'toggleArch': {
                const id = el.dataset.id;
                if (!id) break;
                AudioEngine.archive();
                (appData.projects || []).forEach(p => {
                    if (p.path === id || p.rawPath === id) p.isArchived = !p.isArchived;
                });
                (appData.githubRepos || []).forEach(r => {
                    if (r.name === id || r.url === id) r.isArchived = !r.isArchived;
                });
                renderProjects();
                renderGithub();
                renderArchive();
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

            case 'cloneRepo': {
                const repoName = el.dataset.name;
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'cloneGithubRepo', name: repoName });
                showToast(`${repoName} klonlanıyor...`);
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
                if (el.id === 'agDetailsModal' && event && event.target !== el) {
                    break;
                }
                AudioEngine.click();
                isAgDetailsModalOpen = false;
                {
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
                else showToast('Antigravity ayarları açılıyor...');
                break;

            case 'openAgSidebar':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openAgSidebar' });
                else showToast('Antigravity yan paneli açılıyor...');
                break;

            case 'refreshAgQuota': {
                AudioEngine.click();
                const btn = document.getElementById('agRefreshBtn');
                if (btn) btn.classList.add('spinning');
                showToast('Token bakiyesi ve kotalar canlı sorgulanıyor...');
                if (vscode) {
                    vscode.postMessage({ command: 'refreshAgQuota', isManual: true });
                } else {
                    // Dev preview fallback simulation
                    setTimeout(() => {
                        if (btn) btn.classList.remove('spinning');
                        showToast('Model kotaları ve token bakiyesi güncellendi');
                    }, 600);
                }
                setTimeout(() => {
                    if (btn) btn.classList.remove('spinning');
                }, 2000);
                break;
            }

            case 'openNewWorkspace':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openFolderDialog' });
                else showToast('Klasör seçimi tetiklendi');
                break;

            case 'openSkillsFolder':
                AudioEngine.click();
                if (vscode) vscode.postMessage({ command: 'openSkillsFolder' });
                else showToast('Yetenekler klasörü açılıyor...');
                break;

            case 'copyGhAuthCommand':
                AudioEngine.click();
                if (navigator.clipboard) {
                    navigator.clipboard.writeText('gh auth login').catch(() => {});
                }
                showToast('💬 "gh auth login" komutu panoya kopyalandı!');
                break;
        }
    }

    // --- Global Event Delegation ---
    document.addEventListener('click', (e) => {
        // Auto-close theme dropdown when clicking outside
        const dropdownContainer = document.getElementById('themeDropdownContainer');
        if (dropdownContainer && !dropdownContainer.contains(e.target)) {
            closeThemeDropdown();
        }

        const stopEl = e.target.closest('[data-stop-propagation="true"]');
        const actionEl = e.target.closest('[data-action]');

        // If click occurred inside modal content but actionEl is outside (e.g. backdrop close action), ignore
        if (actionEl && stopEl && !stopEl.contains(actionEl)) {
            return;
        }

        if (stopEl && e.target === stopEl) {
            e.stopPropagation();
            return;
        }

        if (actionEl) {
            const action = actionEl.dataset.action;
            handleAction(action, actionEl, e);
        }
    });

    // --- Global Change Listener (Checkboxes & Toggle Switches) ---
    document.addEventListener('change', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (actionEl && actionEl.dataset.action === 'toggleWidgetVisibility') {
            const widgetKey = actionEl.dataset.widget;
            if (widgetKey) {
                AudioEngine.click();
                setWidgetVisibility(widgetKey, actionEl.checked, true);
            }
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

    const skillSearchInput = document.getElementById('skillSearchInput');
    if (skillSearchInput) {
        skillSearchInput.addEventListener('input', () => {
            renderSkills();
        });
    }

    const customGhInput = document.getElementById('customGhInput');
    if (customGhInput) {
        customGhInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.querySelector('[data-action="submitCustomRepo"]');
                if (btn) btn.click();
            }
        });
    }

    // --- Keyboard Shortcuts (Ctrl + K, Escape) ---
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchInput) {
                switchNavTab('projects');
                searchInput.focus();
                searchInput.select();
            }
        } else if (e.key === 'Escape') {
            closeThemeDropdown();
            closeSettingsModal();
            const agModal = document.getElementById('agDetailsModal');
            if (agModal) agModal.classList.remove('open');
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
                const btn = document.getElementById('agRefreshBtn');
                if (btn) btn.classList.remove('spinning');
            }
        }
    });

    // --- Live Background Quota & Countdown Tickers ---
    setInterval(updateLiveCountdown, 1000);

    // High frequency 2500ms polling for instant token quota synchronization
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            if (vscode) {
                vscode.postMessage({ command: 'refreshAgQuota', isManual: false });
            } else if (appData.antigravityPanel) {
                // Keep live visual countdown alive in standalone browser preview
                renderAntigravityPanel(appData.antigravityPanel);
            }
        }
    }, 2500);

    window.addEventListener('focus', () => {
        if (vscode) {
            vscode.postMessage({ command: 'refreshAgQuota', isManual: false });
        }
    });

    // --- Initial Render ---
    initTheme();
    initLanguage();
    loadWidgetVisibility();
    applyWidgetVisibility(false);
    updateDashboardUI(appData);

    // Initial tab switch if restored
    if (currentNavTab !== 'projects') {
        switchNavTab(currentNavTab);
    }
})();
