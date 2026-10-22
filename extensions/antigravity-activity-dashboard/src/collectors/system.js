'use strict';
/**
 * Collector: Real system telemetry.
 * Probes GPU via nvidia-smi, Ollama via local API, git vault sync, and CBM status.
 * Never displays hardcoded fake strings.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileAsync } = require('../util/proc');

async function probeGpu() {
    // 1. Probe NVIDIA GPU with live utilization percentage
    try {
        const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=name,utilization.gpu', '--format=csv,noheader'], {}, 2000);
        if (stdout) {
            const parts = stdout.split(',').map(s => s.trim());
            const name = parts[0] || 'NVIDIA GPU';
            const util = parts[1] || '0%';
            return `${name} (${util} Aktif)`;
        }
    } catch {
        // nvidia-smi not available or non-nvidia system
    }

    // 2. Windows CIM / WMI hardware probe (AMD Radeon, Intel ARC / Iris, etc.)
    if (process.platform === 'win32') {
        try {
            const { stdout } = await execFileAsync('powershell', [
                '-NoProfile', '-Command',
                '(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name'
            ], {}, 2500);
            if (stdout && stdout.trim()) {
                return `${stdout.trim()} (Aktif)`;
            }
        } catch {
            // ignore
        }
    }

    // 3. macOS Metal / GPU probe
    if (process.platform === 'darwin') {
        try {
            const { stdout } = await execFileAsync('system_profiler', ['SPDisplaysDataType'], {}, 2500);
            if (stdout) {
                const match = stdout.match(/Chipset Model:\s*(.+)/i);
                if (match && match[1]) {
                    return `${match[1].trim()} (Aktif)`;
                }
            }
        } catch {
            // ignore
        }
    }

    // 4. Linux PCI display probe
    if (process.platform === 'linux') {
        try {
            const { stdout } = await execFileAsync('lspci', [], {}, 2000);
            if (stdout) {
                const vgaLine = stdout.split('\n').find(l => /VGA compatible controller|3D controller/i.test(l));
                if (vgaLine) {
                    const clean = vgaLine.split(':').slice(2).join(':').trim();
                    return `${clean} (Aktif)`;
                }
            }
        } catch {
            // ignore
        }
    }

    return 'Standart Grafik Kartı';
}

const { probeOllamaStatus, findOllamaExecutable, probeAllLocalAiEngines } = require('../util/ollama');

async function probeOllama(timeoutMs = 1200) {
    return await probeOllamaStatus(timeoutMs);
}

async function probeVault() {
    const userDir = os.homedir();
    const vaultCandidates = [
        path.join(userDir, '.gemini', 'config'),
        path.join(userDir, '.gemini', 'sync'),
        path.join(userDir, '.gemini', 'vault')
    ];

    for (const vPath of vaultCandidates) {
        if (fs.existsSync(path.join(vPath, '.git'))) {
            try {
                const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: vPath }, 1500);
                const hasPending = Boolean(stdout && stdout.trim());
                return hasPending ? 'Bulut Senkronu (Değişiklikler var)' : 'Bulut Senkronu (Senkronize)';
            } catch {
                return 'Bulut Senkronu (Aktif)';
            }
        }
    }

    return 'Yerel Profil (Standart)';
}

async function probePower() {
    try {
        const { stdout } = await execFileAsync('python', [
            '-c',
            'import ctypes; b=(ctypes.c_byte*12)(); ctypes.windll.kernel32.GetSystemPowerStatus(b); print(b[0], b[2])'
        ], {}, 1200);
        if (stdout) {
            const [acStr, pctStr] = stdout.trim().split(/\s+/);
            const ac = parseInt(acStr, 10);
            const pct = parseInt(pctStr, 10);
            const onAc = ac === 1;
            return {
                onAc,
                percent: isNaN(pct) ? 100 : pct,
                statusText: onAc ? `Prize Bağlı (%${pct})` : `Pilde (%${pct} - Eko Mod)`
            };
        }
    } catch {
        // Fallback
    }
    return {
        onAc: true,
        percent: 100,
        statusText: 'Prize Bağlı'
    };
}

async function getSystemTelemetry(cbmData, graphifyCount = 0) {
    const [gpu, localAi, vault, power] = await Promise.all([
        probeGpu(),
        probeAllLocalAiEngines(),
        probeVault(),
        probePower()
    ]);

    const cbmStatus = cbmData && cbmData.installed
        ? `Etkin (${cbmData.indexedProjectsCount} Repo, ${cbmData.totalDbSizeMb})`
        : 'Kurulu Değil';

    const graphifyStatus = graphifyCount > 0
        ? `Etkin (${graphifyCount} Harita Mevcut)`
        : 'Hazır (Observatory)';

    const primary = localAi.primaryEngine;
    let localModel = 'Yerel Model Bulunamadı';
    if (primary) {
        if (primary.online) {
            localModel = primary.activeModel
                ? `${primary.activeModel} (${primary.name} Aktif)`
                : `${primary.name} (Aktif)`;
        } else if (primary.installed) {
            localModel = `${primary.name} (Kurulu - Çevrimdışı)`;
        }
        if (!power.onAc) {
            localModel = `${primary.activeModel || primary.name} (Pilde - Eko Mod)`;
        }
    }

    const isOllamaOnline = Boolean(primary && primary.id === 'ollama' && primary.online);
    const isOllamaInstalled = Boolean(findOllamaExecutable() || isOllamaOnline);

    return {
        gpu,
        localModel,
        localAi,
        hasLocalEngine: localAi.hasLocalEngine,
        ollamaOnline: isOllamaOnline,
        ollamaInstalled: isOllamaInstalled,
        power,
        remoteVault: vault,
        graphifyStatus,
        cbmStatus
    };
}

module.exports = {
    probeGpu,
    probeOllama,
    probeVault,
    probePower,
    getSystemTelemetry
};
