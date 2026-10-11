#!/usr/bin/env node
/**
 * Media builder: extracts dashboard.html into modular media/{dashboard.html, dashboard.css, dashboard.js}.
 * Replaces all inline onclick handlers with data-action attributes and safe event delegation.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const srcFile = path.resolve(__dirname, '..', 'dashboard.html');
const raw = fs.readFileSync(srcFile, 'utf8');

// 1. Extract CSS
const styleStart = raw.indexOf('<style>') + 7;
const styleEnd = raw.indexOf('</style>');
const rawCss = raw.substring(styleStart, styleEnd).trim();

const fontPreamble = `/* Local Font Declarations */
@font-face {
  font-family: 'Outfit';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('fonts/outfit-latin-wght-normal.woff2') format('woff2-variations'),
       url('fonts/outfit-latin-ext-wght-normal.woff2') format('woff2-variations');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'),
       url('fonts/jetbrains-mono-latin-ext-wght-normal.woff2') format('woff2-variations');
}

@media (prefers-reduced-motion: reduce) {
  #spaceCanvas {
    display: none !important;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

const finalCss = fontPreamble + '\n\n' + rawCss;
fs.writeFileSync(path.resolve(__dirname, '..', 'media', 'dashboard.css'), finalCss, 'utf8');
console.log('Written media/dashboard.css');

// 2. Extract HTML Body
const bodyStart = raw.indexOf('<body>') + 6;
const scriptStart = raw.indexOf('<script>');
let rawBody = raw.substring(bodyStart, scriptStart).trim();

// Replace static onclicks with data-action attributes
rawBody = rawBody
    .replace('onclick="startNewChat()"', 'data-action="startNewChat"')
    .replace('onclick="openGraphifyRoot()"', 'data-action="openGraphifyRoot"')
    .replace('onclick="toggleAudioSfx()"', 'data-action="toggleAudio"')
    .replace('onclick="refreshDashboard()"', 'data-action="refresh"')
    .replace('onclick="toggleStartupSetting()"', 'data-action="toggleStartup"')
    .replace('onclick="toggleAgDetailsModal()"', 'data-action="toggleAgDetailsModal"')
    .replace('onclick="openAgPanelSettings()"', 'data-action="openAgSettings"')
    .replace('onclick="refreshAgQuota(true)"', 'data-action="refreshAgQuota"')
    .replace('onclick="toggleAgPanelCollapse()"', 'data-action="toggleAgCollapse"')
    .replace('onclick="switchNavTab(\'projects\')"', 'data-action="switchTab" data-tab="projects"')
    .replace('onclick="switchNavTab(\'github\')"', 'data-action="switchTab" data-tab="github"')
    .replace('onclick="switchNavTab(\'sessions\')"', 'data-action="switchTab" data-tab="sessions"')
    .replace('onclick="switchNavTab(\'radar\')"', 'data-action="switchTab" data-tab="radar"')
    .replace('onclick="setSubFilter(\'all\')"', 'data-action="setSubFilter" data-filter="all"')
    .replace('onclick="setSubFilter(\'favorites\')"', 'data-action="setSubFilter" data-filter="favorites"')
    .replace('onclick="setSubFilter(\'git\')"', 'data-action="setSubFilter" data-filter="git"')
    .replace('onclick="setSubFilter(\'graphify\')"', 'data-action="setSubFilter" data-filter="graphify"')
    .replace('onclick="submitCustomRepo()"', 'data-action="submitCustomRepo"')
    .replace('onclick="openGraphifyRoot()"', 'data-action="openGraphifyRoot"')
    .replace('onclick="toggleArchiveDrawer()"', 'data-action="toggleArchiveDrawer"')
    .replace('onclick="closeAgDetailsModal(event)"', 'data-action="closeAgDetailsModal"')
    .replace('onclick="event.stopPropagation()"', 'data-stop-propagation="true"')
    .replace('onclick="toggleAgDetailsModal()"', 'data-action="toggleAgDetailsModal"')
    .replace('onclick="openAgSidebar()"', 'data-action="openAgSidebar"')
    .replace('onclick="openAgPanelSettings()"', 'data-action="openAgSettings"');

const finalHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="{{CSP}}">
    <title>Antigravity Deep Space Cockpit & Activity Dashboard v2.0</title>
    <link rel="stylesheet" href="{{CSS_URI}}">
</head>
<body id="dashboardRoot">
${rawBody}
    <script nonce="{{NONCE}}">
        window.__INITIAL_DATA__ = {{INITIAL_DATA}};
    </script>
    <script nonce="{{NONCE}}" src="{{JS_URI}}"></script>
</body>
</html>`;

fs.writeFileSync(path.resolve(__dirname, '..', 'media', 'dashboard.html'), finalHtml, 'utf8');
console.log('Written media/dashboard.html');
