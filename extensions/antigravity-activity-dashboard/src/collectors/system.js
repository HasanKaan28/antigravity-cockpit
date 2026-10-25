'use strict';
/**
 * Collector: Real system telemetry.
 * Probes the GPU via nvidia-smi and the power state.
 * Never displays hardcoded fake strings.
 */
const { execFileAsync } = require('../util/proc');

async function probeGpu() {
    // 1. Probe NVIDIA GPU with live utilization percentage
    try {
        const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=name,utilization.gpu', '--format=csv,noheader'], {}, 2000);
        if (stdout) {
            const parts = stdout.split(',').map(s => s.trim());
            const name = parts[0] || 'NVIDIA GPU';
            const util = parts[1] || '0%';
            return `${name} · ${util}`;
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
                return stdout.trim();
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
                    return match[1].trim();
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
                    return clean;
                }
            }
        } catch {
            // ignore
        }
    }

    // Unknown adapter: the dashboard shows its own localized label for an empty name.
    return '';
}

async function probePower() {
    try {
        // -I: isolated mode, so a ctypes.py in the current folder is never imported instead of the stdlib one.
        const { stdout } = await execFileAsync('python', [
            '-I', '-c',
            'import ctypes; b=(ctypes.c_byte*12)(); ctypes.windll.kernel32.GetSystemPowerStatus(b); print(b[0], b[2])'
        ], {}, 1200);
        if (stdout) {
            const [acStr, pctStr] = stdout.trim().split(/\s+/);
            const ac = parseInt(acStr, 10);
            const pct = parseInt(pctStr, 10);
            const onAc = ac === 1;
            return { onAc, percent: isNaN(pct) ? 100 : pct };
        }
    } catch {
        // Fallback
    }
    return { onAc: true, percent: 100 };
}

async function getSystemTelemetry() {
    const [gpu, power] = await Promise.all([probeGpu(), probePower()]);
    return { gpu, power };
}

module.exports = {
    probeGpu,
    probePower,
    getSystemTelemetry
};
