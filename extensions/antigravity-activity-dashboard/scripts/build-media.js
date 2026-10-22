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

// One @font-face per subset: a src list is only a fallback chain, so latin-ext glyphs
// (ş ğ İ) would otherwise never load.
const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT_RANGE = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
const fontFace = (family, file, range) => `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('fonts/${file}') format('woff2-variations');
  unicode-range: ${range};
}
`;

const fontPreamble = `/* Local Font Declarations */
${fontFace('Outfit', 'outfit-latin-wght-normal.woff2', LATIN_RANGE)}
${fontFace('Outfit', 'outfit-latin-ext-wght-normal.woff2', LATIN_EXT_RANGE)}
${fontFace('JetBrains Mono', 'jetbrains-mono-latin-wght-normal.woff2', LATIN_RANGE)}
${fontFace('JetBrains Mono', 'jetbrains-mono-latin-ext-wght-normal.woff2', LATIN_EXT_RANGE)}
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
    <title>Antigravity Cockpit</title>
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
