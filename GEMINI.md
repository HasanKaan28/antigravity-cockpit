# Antigravity Global Engineering Rules

## 1. Persistent Project Memory & Token Optimization (MANDATORY)
- **Zero-Waste Reading**: Proje dosyalarını ve dizinleri her turda baştan sona tekrar tekrar okuyarak token israfı yapma.
- **Continuous Knowledge Snapshotting**: Her projede kompakt ve yüksek yoğunluklu bir mimari snapshot'ı tut (`.agents/rules/project-context.md` veya proje kökündeki `GEMINI.md`).
- **Snapshot İçeriği**:
  - Çekirdek teknoloji yığını, kütüphane sürümleri ve ortam gereksinimleri.
  - Dizin hiyerarşisi ve her bir modülün kesin sorumlulukları.
  - Kritik veri şemaları, API sözleşmeleri, arayüzler ve state yönetimi.
  - Temel mimari kararlar, standartlar ve kurulum talimatları.
- **İnkremental Güncellemeler**: Yeni dosyalar, rotalar veya özellikler eklendiğinde bu snapshot'ı sessizce ve artımsal olarak güncelle.

## 2. Mandatory Graphify Engine & Post-Planning Protocol
- **Sürekli Aktif Bilgi Grafiği**: Graphify, tüm çalışma alanları ve kod tabanları için temel mimari haritalama aracıdır.
- **Otomatik Çalıştırma ve Tarayıcıda Açma**: Bir proje veya özellik planlanıp yürütülmeye başlandığında, arka planda Graphify motorunu çalıştır (`graphify-out/graph.json` ve `graphify-out/graph.html`) ve kullanıcının varsayılan tarayıcısında otomatik olarak aç.
- **Kullanıcı Bildirimi**: Kullanıcıyı her zaman şu mesajla bilgilendir:
  > *"Onu da açtım, arkadan takip edebilirsin."*
  (ve `graphify-out/graph.html` dosyasının tıklanabilir yolunu ver).
- **Cyberpunk / Deep Space Observatory UI Standartı (MANDATORY)**:
  `graph.html` çıktısı hiçbir zaman sade varsayılan haliyle bırakılamaz. Şu zenginleştirilmiş fütüristik özelliklere sahip olmalıdır:
  - **Üst HUD Barı**: Canlı Nodes, Edges, Clusters ve God Nodes sayaçları.
  - **Aksiyon Butonları**: 👑 "God Nodes" parlatma, 🧊 "Freeze" fizik dondurma, 🎯 "Reset View" ve 🔊 Cyber Audio SFX (Web Audio API ile fütüristik ses efektleri).
  - **Hızlı Arama Çubuğu (Ctrl + K)**: Otomatik tamamlama ile aranan fonksiyona kameranın yumuşakça odaklanması (`network.focus`).
  - **Sağ Holografik Detay Paneli**: Dosya/satır referansı, çağıran/çağrılan fonksiyon chipleri ve 🌐 "Isolate Connected Subgraph" alt-ağı izole etme butonu.
  - **Görsel Tasarım**: Cyberpunk cam/glassmorphism paneller, canlı neon küme renkleri ve parlayan ızgara arka planı.
- **Sıfır İsraf Kod Gezintisi**: Dosyaları baştan sona taramadan önce, modül sınırlarını anlamak ve token tasarrufu sağlamak için üretilen Graphify bilgi grafiğini referans al.

## 3. Anti-Slop & Premium Web Tasarım Standartı (Taste Skill)
- **Zengin ve Modern Estetik**: Basit, yapay zeka kokan, gri-beyaz jenerik kart şablonları KESİNLİKLE YASAKTIR.
- **Tipografi**: Tarayıcı varsayılanı fontlar yerine Google Fonts (Inter, Plus Jakarta Sans, Outfit vb.) kullanılmalıdır.
- **Renk ve Görsellik**: Uyumlu ve sofistike HSL renk paletleri, modern karanlık mod (dark mode), cam morfolojisi (glassmorphism) ve derinlik hissi katan yumuşak gölgeler uygulanmalıdır.
- **Mikro-Animasyonlar**: Tıklanabilir öğelerde hover efektleri, pürüzsüz geçişler ve etkileşimi artıran mikro-animasyonlar bulunmalıdır.
- **Görsel Varlıklar**: Kırık resim veya geçici placeholder metinler yerine çalışan, estetik SVG veya üretilmiş görseller kullanılmalıdır.

## 4. Clean Code & Architecture Review Standartları
- Robert C. Martin (Uncle Bob) Clean Code prensipleri (Tek Sorumluluk, Anlaşılır İsimlendirme, Küçük Fonksiyonlar, DRY).
- Kod incelemelerinde kapı bekçiliği yerine yapıcı analiz, mimari risk tespiti ve net rehberlik sağlama.

## 5. Depo Benimseme Protokolü ("Bu depoyu benimse")
- Kullanıcı herhangi bir cihazda "bu depoyu benimse", "repoyu kur" veya "ayarları geri yükle" dediğinde:
  - `adopt-environment` yeteneğini veya `scripts/adopt.ps1` (Linux/Mac'te `scripts/adopt.sh`) scriptini çalıştır.
  - Küresel kuralları (`~/.gemini/GEMINI.md`), tüm uzmanlık yeteneklerini (`~/.gemini/config/skills/`) ve eklentileri (`~/.gemini/config/plugins/`) anında kullanıcı ortamına uygula.
