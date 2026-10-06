'use strict';
/**
 * Collector: Antigravity Panel live model quotas and token telemetry.
 * Reads live SQLite state.vscdb via get_panel_data.py asynchronously.
 * Strictly zero hardcoded PII. Fallbacks report status: 'offline'.
 */
const path = require('path');
const fs = require('fs');
const { execFileAsync } = require('../util/proc');
const logger = require('../logger');

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'get_panel_data.py');

async function getPanelData() {
    if (!fs.existsSync(SCRIPT_PATH)) {
        return {
            status: 'offline',
            groups: [],
            user: null,
            tokenUsage: null,
            message: 'get_panel_data.py bulunamadı'
        };
    }

    try {
        const { stdout } = await execFileAsync('python', [SCRIPT_PATH], {}, 3000);
        if (stdout) {
            const parsed = JSON.parse(stdout);
            if (parsed && (parsed.status === 'ok' || (parsed.groups && parsed.groups.length > 0))) {
                return {
                    status: 'ok',
                    groups: parsed.groups || [],
                    user: parsed.user || null,
                    tokenUsage: parsed.tokenUsage || null,
                    historyCount: parsed.historyCount || 0
                };
            }
        }
    } catch (err) {
        logger.warn('Failed to retrieve live panel quota:', err.message || err);
    }

    return {
        status: 'offline',
        groups: [
            {
                id: 'gemini',
                label: 'Gemini',
                remaining: null,
                resetTime: '—',
                themeColor: '#40C4FF',
                hasData: false,
                weekly: { remaining: null, resetTime: '—' }
            },
            {
                id: 'non-google',
                label: 'Claude',
                remaining: null,
                resetTime: '—',
                themeColor: '#FFAB40',
                hasData: false,
                weekly: { remaining: null, resetTime: '—' }
            }
        ],
        user: null,
        tokenUsage: null,
        message: 'Kota verisi okunamadı (Çevrimdışı / Eklenti kapalı)'
    };
}

module.exports = {
    getPanelData
};
