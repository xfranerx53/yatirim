# DURUM.md — Devir Notu (yeni sohbet için ilk okunacak dosya)

Son güncelleme: 2026-10-26 · Uygulama sürümü: sw cache `portfoy-v6`

## Yeni sohbete ilk mesaj (kopyala-yapıştır)
> Bu zip "yatirim" portföy PWA projem. Önce DURUM.md'yi oku, sonra index.html'e bak. Aynı kurallarla devam et.

## Çalışma kuralları (Claude için, her sohbette geçerli)
- Kullanıcı Türkçe yazar, her şeyi **telefondan** (Samsung S21 5G, Chrome) yapar.
- Kullanıcı yeni sohbette zip'i atınca önce bu DURUM.md okunur; her değişiklikte **güncel DURUM.md ve index.html/sw.js tekrar verilir**.
- Dosyalar **tek tek ve klasörsüz** verilir (zip değil, alt klasör yok); kullanıcı GitHub web'den "Add file > Upload files" ile yükler, aynı adlı dosyanın üzerine yazılır.
- **Her değişiklikte:** (1) değişen dosyaları ver, (2) bu DURUM.md'yi güncelle (aşağıdaki "Yapılanlar"a ekle, "Açık işler"i düzelt, tarihi yaz) ve onu da ver, (3) `sw.js` içindeki `VERSION` numarasını 1 artır, (4) Firebase rules değiştiyse `database.rules.json` dosyasını da güncelle.
- Repo **herkese açık**: şifre, kişisel veri, kullanıcı UID'si bu dosyalara yazılmaz.
- Kısa ve net cevap; telefon ekranı için uzun liste yapma.

## Proje
Çoklu sepetli (TL / USD) portföy takibi: enflasyon başabaş, hedef satış, realize kâr, XIRR, ağırlıklı vade, pasta/çizgi grafikler.
- Canlı adres: https://xfranerx53.github.io/yatirim/
- Teknoloji: tek dosya `index.html` (vanilla JS), Chart.js 4.4.1 + datalabels (CDN), Firebase 10.12.0 compat (Auth + Realtime Database), GitHub Pages.
- Giriş: Firebase e-posta/şifre. Kullanıcı adı yazılırsa `@yatirim.app` eklenir (sahte e-posta, şifre sıfırlama çalışmaz); gerçek e-posta yazılırsa "Şifremi unuttum" çalışır.

## Dosyalar (hepsi repo kökünde)
| Dosya | Görev |
|---|---|
| `index.html` | Tüm uygulama (HTML+CSS+JS) |
| `manifest.webmanifest` | PWA bildirimi (`id: /yatirim/portfoy-app`, standalone, koyu tema) |
| `sw.js` | Servis çalışanı: kabuk network-first, CDN stale-while-revalidate, Firebase/kur istekleri önbelleğe alınmaz |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png` | İkonlar (koyu zemin, mavi/yeşil/turuncu barlar + yükselen çizgi) |
| `database.rules.json` | Firebase Realtime Database kuralları (konsola yapıştırılır) |
| `DURUM.md` | Bu dosya |

## Veri modeli (Firebase)
- `users/{uid}/portfolios` → dizi; her sepet: `{id, name, currency:'TL'|'USD', platform ('Binance'|'QNB Yatırım'|'Midas'|'Diğer'|''), yillik, hedef, guncelDeger, dates[], amts[], sDates[], sAmts[], sCosts[]}`
- `users/{uid}/history/{YYYY-MM-DD}` → eski günlük toplam değer kayıtları; uygulama artık yazmıyor/okumuyor (2026-10-26'da grafik kaldırıldı), veritabanında kalabilir, konsoldan silinebilir
- Kurallar: kullanıcı yalnızca kendi `users/$uid` düğümünü okur/yazar (`database.rules.json`). Konsolda ayrıca eski `portfolios` yolu için sahibe özel bir blok duruyor; uygulama artık o yolu kullanmıyor, silinebilir.

## Hesaplama mantığı
- Satışlar FIFO ile en eski alımlardan düşülür; satış maliyeti boşsa satış tutarı maliyet sayılır (kâr 0, ekranda uyarı çıkar).
- Başabaş = kalan anapara × günlük bileşik enflasyon; Hedef = başabaş × günlük bileşik reel kâr.
- Tarihler yerel saat, gün sayısı tam gün (bugün 00:00 baz). XIRR 365 gün esaslı.
- Ana ekran ve pasta grafik aynı `sepetHesap()` fonksiyonunu kullanır.
- Kur: frankfurter.dev → frankfurter.app → exchangerate-api; olmazsa localStorage `sonKur`, o da yoksa 48,47. Uygulamaya dönüşte 1 saatten eskiyse yenilenir.

## Yapılanlar
- 2026-10-17: PWA yapıldı (manifest, sw, ikonlar); telefona kurulum Chrome'un eski site kaydı yüzünden takıldı, Chrome "Tarama verilerini sil" ile çözüldü.
- 2026-10-17: Düzeltmeler: cihazlar arası canlı senkron (kendi yazımızın yankısı yok sayılır, bekleyen yerel değişiklik ezilmez); sadece kullanıcı değişikliğinde kayıt; eski `SAHIP_UID`/`portfolios` taşıma kodu silindi; kur yedeği ve saatlik yenileme; boş satış maliyeti uyarısı; yerel tarih ayrıştırma; tek hesap fonksiyonu; grafikler `update('none')` ile güncelleniyor; "Şifremi unuttum"; `alert` yerine ekran altı uyarı (toast).
- 2026-10-17: Bu devir notu ve `database.rules.json` eklendi.

- 2026-10-26: Aylık dağılım kartı denendi, kullanıcı istemedi, **kaldırıldı** (hedef pay alanı da gitti). Yerine **📉 En Çok Düşen Sepet** kartı: sepetleri güncel değer ÷ kalan maliyete göre sıralar (en düşük üstte), başabaşa göre % ve son alımdan beri gün sayısını gösterir. Her sepette `platform` alanı (Binance/QNB Yatırım/Midas/Diğer) kaldı. Kullanıcının asıl derdi: "son alımdan sonra hangisi en çok yüzde düştü" → şu an maliyete göre; gerçek 'son alım fiyatına göre' için alım satırına adet/fiyat girişi gerekir (açık iş 3).

- 2026-10-26: Kullanıcı Hisse Pozisyonları/Binance/Worker denemelerinden önceki **v5 haline geri döndü** ("karışmaya başlamıştı"); bu sürümden devam. **📅 Portföy Değer Geçmişi (TL)** kartı ve ilgili kod (`gecmisKaydet`, `gecmisDinle`, `historyChart`) kaldırıldı. Not: Cloudflare Worker (`fiyat.xfranerxx.workers.dev`, Yahoo fiyat köprüsü) kurulu ve çalışıyor; ileride otomatik fiyat istenirse kullanılabilir ama şu an uygulamada kullanılmıyor.

## Entegrasyon kararı (Binance / QNB / Midas)
- Midas ve QNB Yatırım'ın bireysel kullanıcıya açık API'si yok → otomatik bağlanamaz; değer elle girilir (veya ileride ekran görüntüsü/CSV ile).
- Binance'in salt-okunur API'si var ama API anahtarını herkese açık repodaki istemci koduna koymak güvensiz; yapılacaksa ayrı bir sunucu/fonksiyon gerekir. Güvenli ve anahtarsız seçenek: Binance **herkese açık fiyat** uç noktasından (PAXG, BTC vb.) canlı fiyat çekip adet × fiyat ile güncel değeri otomatik yazmak (açık iş 3 + 5).

## Açık işler / fikirler (öncelik sırasıyla)
1. Çevrimdışı/çevrimiçi göstergesi ve "yeni sürüm var" bildirimi
2. Alım/satışta komisyon ve stopaj alanı
3. Satırlara varlık adı + adet/fiyat girişi
4. Tüm sepetler için toplam XIRR ve kâr/zarar özeti
5. Canlı fiyattan güncel değer (BIST, PAXG)
6. Hedefe ulaşınca bildirim
7. Başabaş/hedef grafiğinde dönem seçimi (1 ay, 3 ay, tümü)
8. Satır silmede geri alma
9. PIN/biyometrik kilit
10. Enflasyonu TÜİK'ten otomatik çekme
11. `index.html`'i `app.js` + `style.css` olarak ayırma (alt klasör olmadan)

## Bilinen notlar
- Eski kullanıcı adıyla (`@yatirim.app`) açılan hesapta şifre sıfırlama yok; gerçek e-postayla yeni hesap açıp yedekten (⬇ Yedek Al / ⬆ Yedek Yükle) veri taşınabilir.
- Chrome "zaten yüklü" derse: Chrome > Tarama verilerini sil (çerez + önbellek) çözdü.
- Firebase `apiKey` istemci kodunda görünür; bu normaldir, güvenlik kurallarla sağlanır.
