# ⚡ Antigravity Activity Dashboard & Cockpit

Antigravity IDE (ve VS Code) için Deep Space temalı kontrol paneli. IDE açıldığında
yerel projeleri, GitHub depolarını, son Antigravity oturumlarını, Codebase Memory (CBM)
indeks durumunu, Graphify haritalarını ve model kotalarını tek ekranda gösterir.

## Özellikler

- **Projeler** — çalışma alanı, `~/github-repos` ve yapılandırılabilir tarama köklerindeki projeler;
  git dalı, son commit, uncommitted değişiklik, Graphify ve CBM rozetleri. Favori / arşiv.
- **GitHub** — `gh` CLI ile depo listesi, klonlama, özel depo ekleme (`owner/repo`).
- **Oturumlar** — `~/.gemini/antigravity-ide/brain` altındaki son oturumlar, transcript ve klasör kısayolları.
- **Radar** — CBM indeksli projeler ve Graphify haritaları.
- **Antigravity Panel kotaları** — Gemini / Claude kota göstergeleri (`n2ns.antigravity-panel` verisinden).
- **Sistem telemetrisi** — GPU, Ollama, brain-sync vault, CBM durumu (gerçek algılama).

## Kurulum

```powershell
npm install
npm run package        # antigravity-activity-dashboard-<version>.vsix üretir
npm run install-local  # Antigravity IDE (yoksa VS Code) içine kurar
```

## Geliştirme

| Komut | Açıklama |
|---|---|
| `npm run lint` | ESLint |
| `npm run test:unit` | Mocha unit testleri (VS Code gerektirmez) |
| `npm run test:integration` | `@vscode/test-electron` ile entegrasyon testi |
| `npm run preview` | Örnek (PII'siz) veriyle `preview.html` üretir |

## Gereksinimler (opsiyonel)

- `git`, `gh` (GitHub sekmesi), Python 3 (kota okuma), `nvidia-smi`, Ollama, codebase-memory-mcp.
  Bulunamayan her bileşen panelde **"Algılanmadı"** olarak gösterilir.

## Gizlilik

Eklenti ağ isteği olarak yalnızca `gh` CLI'ını ve yerel `127.0.0.1:11434` (Ollama) adresini kullanır.
Webview sıkı bir Content-Security-Policy ile çalışır; tüm fontlar yerel olarak paketlenir.

## Lisans

MIT
