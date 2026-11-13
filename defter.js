/* İşlem defteri: alım/satım kayıtları, ortalama maliyet, adet, gerçekleşen kâr, otomatik değer */
(function () {
  var DEFTER = [], GECMIS = {}, KOM = 0, hazir = false, sonAnahtar = '';
  function AU() { try { return auth; } catch (e) { return null; } }
  function SP() { try { return sepetler || []; } catch (e) { return []; } }
  function AKT() { try { return aktifSepetId; } catch (e) { return null; } }
  var ESLE = [['PAXG', 'PAXG (altın)'], ['NVDAB', 'NVDAB (Nvidia)'], ['GOOGLB', 'GOOGLB (Alphabet)'], ['UUUU', 'UUUU'], ['YAY', 'YAY (fon)'], ['NAK', 'NAKİT USD'], ['BIST', ['THYAO', 'TUPRS', 'FROTO', 'BIMAS', 'KCHOL', 'ORZAX']]];
  var $ = function (i) { return document.getElementById(i); };
  var f2 = function (n, d) { return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); };
  var bugunStr = function () { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  var yol = function (k) { return 'users/' + AU().currentUser.uid + '/' + k; };
  var SABIT = { 'NAKİT USD': 1 };   // fiyatı sabit varlıklar (USDT = 1 $)
  var cur = function (ad) { if (SABIT[ad]) return '$'; if (/\(fon\)$/.test(ad)) return '₺'; var v = (window.SKOR && SKOR.varliklar || []).find(function (x) { return x.ad === ad; }); return v && v.para === 'USD' ? '$' : '₺'; };
  var fiyatSon = function (ad) { if (SABIT[ad]) return SABIT[ad]; var v = (window.SKOR && SKOR.varliklar || []).find(function (x) { return x.ad === ad; }); return v ? v.fiyat : null; };

  function fiyatBul(ad, tarih) {
    var g = GECMIS[ad];
    if (g && tarih < bugunStr()) {
      var ks = Object.keys(g).sort(), son = null;
      for (var i = 0; i < ks.length; i++) { if (ks[i] <= tarih) son = ks[i]; else break; }
      if (son) return g[son];
      if (ks.length) return g[ks[0]];
    }
    return fiyatSon(ad);
  }

  function hesapla() {
    var o = {};
    DEFTER.slice().sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : (a.id < b.id ? -1 : 1); }).forEach(function (e) {
      var r = o[e.a] || (o[e.a] = { adet: 0, mal: 0, yat: 0, real: 0, kom: 0, tah: false });
      var a = Number(e.adet) || 0, t = Number(e.tutar) || 0, k = Number(e.kom) || 0;
      r.kom += k;
      if (e.k === 'sat') {
        var ort = r.adet > 0 ? r.mal / r.adet : 0, aa = Math.min(a, r.adet);
        r.real += t - k - aa * ort; r.mal -= aa * ort; r.adet -= aa;
        if (r.adet < 1e-9) { r.adet = 0; r.mal = 0; r.tah = false; }
      } else { r.adet += a; r.mal += t + k; r.yat += t; if (e.tah) r.tah = true; }
    });
    return o;
  }

  function uygula() {
    var H = hesapla(), M = {};
    Object.keys(H).forEach(function (ad) { var r = H[ad]; if (r.adet > 0 && !r.tah) M[ad] = r.mal / r.adet; });
    window.DEFTER_MAL = M; window.DEFTER_HESAP = H;
    // sepet değerini otomatik güncelle
    var degisti = false;
    SP().forEach(function (s) {
      if (!s.oto) return;
      var L = Array.isArray(s.oto) ? s.oto : [s.oto], d = 0, var_ = false, eksik = false;
      L.forEach(function (a) {
        if (!H[a] || !(H[a].adet > 0)) return;
        var p = fiyatSon(a); if (!p) { eksik = true; return; }
        d += H[a].adet * p; var_ = true;
      });
      if (!var_ || eksik) return;
      d = Math.round(d * 100) / 100;
      if (Math.abs((Number(s.guncelDeger) || 0) - d) > 0.005) { s.guncelDeger = d; degisti = true; }
    });
    if (degisti) {
      sepetleriKaydet();
      if (window.sepetBarCiz) sepetBarCiz(false);
      if (AKT() && window.sepetYukle) sepetYukle(AKT());
    }
    if (window.bolustur) bolustur();
  }

  function kaydet() {
    if (!AU() || !AU().currentUser) return;
    database.ref(yol('defter')).set(DEFTER.length ? DEFTER : null).catch(function () { bildir('Defter kaydedilemedi'); });
  }

  function ciz() {
    var el = $('dfRoot'); if (!el) return;
    var S = window.SKOR; if (!S) { el.innerHTML = '<div class="card"><span style="color:var(--text-muted)">Fiyat verisi yükleniyor…</span></div>'; return; }
    var H = hesapla(), adlar = S.varliklar.map(function (v) { return v.ad; }).concat(Object.keys(SABIT));
    var satirlar = Object.keys(H).filter(function (ad) { return H[ad].adet > 0 || Math.abs(H[ad].real) > 0; }).map(function (ad) {
      var r = H[ad], p = fiyatSon(ad), c = cur(ad), ort = r.adet > 0 ? r.mal / r.adet : 0, deger = r.adet * (p || 0);
      var kz = r.adet > 0 && r.mal > 0 ? (deger / r.mal - 1) * 100 : null;
      return '<div style="border-top:1px solid var(--card-border);padding:7px 0;font-size:11px;">' +
        '<div style="display:flex;justify-content:space-between;"><b>' + ad + (r.tah ? ' <span style="color:var(--accent-orange);font-weight:normal;">· tahmini fiyat</span>' : '') + '</b>' +
        (kz != null ? '<b style="color:' + (kz >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + (kz >= 0 ? '+' : '') + f2(kz, 1) + '%</b>' : '') + '</div>' +
        '<div style="color:var(--text-muted);">Adet ' + f2(r.adet, 4) + ' · Ort. maliyet ' + f2(ort) + c + ' · Maliyet ' + f2(r.mal) + c + ' · Değer ' + f2(deger) + c +
        (Math.abs(r.real) > 0 ? ' · Gerçekleşen <span style="color:' + (r.real >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + f2(r.real) + c + '</span>' : '') + '</div></div>';
    }).join('') || '<div style="font-size:11px;color:var(--text-muted);">Henüz kayıt yok. Aşağıdan ekle ya da "Sepetlerden içe aktar" a bas.</div>';

    var liste = DEFTER.slice().sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; }).slice(0, 40).map(function (e) {
      var c = cur(e.a);
      return '<div style="border-top:1px solid var(--card-border);padding:6px 0;font-size:11px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;"><span><b style="color:' + (e.k === 'sat' ? 'var(--accent-red)' : 'var(--accent-green)') + '">' + (e.k === 'sat' ? 'SAT' : 'AL') + '</b> ' + e.a + ' · ' + e.t + '</span>' +
        '<button onclick="dfSil(\'' + e.id + '\')" style="background:none;border:none;color:var(--accent-red);font-size:15px;">✕</button></div>' +
        '<div style="display:flex;gap:8px;align-items:center;color:var(--text-muted);">' + f2(e.tutar) + c + ' · ' + f2(e.adet, 4) + ' adet · fiyat ' +
        '<input type="number" step="any" inputmode="decimal" value="' + e.fiyat + '" onchange="dfFiyat(\'' + e.id + '\',this.value)" style="width:78px;padding:3px;font-size:11px;' + (e.tah ? 'border-color:var(--accent-orange);' : '') + '">' + (e.tah ? '<span style="color:var(--accent-orange);">tahmini</span>' : '') + '</div></div>';
    }).join('');

    var otoSatir = SP().map(function (s) {
      var i = ESLE.findIndex(function (m) { return (s.name || '').toUpperCase().indexOf(m[0]) >= 0; });
      if (i < 0) return '';
      return '<label style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;"><span>' + s.name + ' sepeti değeri defterden hesaplansın</span><input type="checkbox" ' + (s.oto ? 'checked' : '') + ' onchange="dfOto(\'' + s.id + '\',' + i + ',this.checked)" style="width:auto;"></label>';
    }).join('');

    el.innerHTML =
      '<div class="card" style="border-color:rgba(16,185,129,.3);"><div class="card-title" style="color:var(--accent-green);"><span>📒 POZİSYONLARIM (defterden)</span></div>' + satirlar +
      '<div style="font-size:9px;color:var(--text-muted);margin-top:6px;">Ortalama maliyet yöntemi. Fiyatlar canlı çekilir (hisse ~15 dk gecikmeli, YAY günlük TEFAS fiyatı). Yatırım tavsiyesi değildir.</div></div>' +
      '<div class="card" style="border-color:rgba(59,130,246,.3);"><div class="card-title" style="color:var(--accent-blue);"><span>➕ İŞLEM EKLE</span></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px;"><select id="dfVarlik">' + adlar.map(function (a) { return '<option>' + a + '</option>'; }).join('') + '</select>' +
      '<select id="dfTur" style="max-width:90px;"><option value="al">Alım</option><option value="sat">Satım</option></select></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px;"><input type="date" id="dfTarih" value="' + bugunStr() + '"><input type="number" step="any" inputmode="decimal" id="dfTutar" placeholder="Tutar (₺ / $)"></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px;"><input type="number" step="any" inputmode="decimal" id="dfFiyatGir" placeholder="Fiyat (boşsa otomatik)"><input type="number" step="any" inputmode="decimal" id="dfAdetGir" placeholder="Adet (boşsa hesaplanır)"></div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;"><span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">Komisyon %</span><input type="number" step="any" inputmode="decimal" id="dfKom" value="' + KOM + '" onchange="dfKomKaydet(this.value)" style="max-width:80px;"></div>' +
      '<button onclick="dfEkle()" style="width:100%;padding:10px;background:var(--accent-blue);border:none;border-radius:8px;color:#fff;font-weight:bold;">Kaydet</button>' +
      '<div style="font-size:9px;color:var(--text-muted);margin-top:6px;">Sadece tutarı yazman yeterli: fiyatı o günün kapanışından, adedi kendisi bulur (tahmini olarak işaretlenir). Gerçek fiyatı sonradan listeden düzeltebilirsin.</div></div>' +
      '<div class="card"><div class="card-title"><span>🧾 SON İŞLEMLER</span></div>' + (liste || '<div style="font-size:11px;color:var(--text-muted);">Kayıt yok.</div>') + '</div>' +
      '<div class="card" style="border-color:rgba(245,158,11,.3);"><div class="card-title" style="color:var(--accent-orange);"><span>🔧 ARAÇLAR</span></div>' + otoSatir +
      '<button onclick="dfIceAktar()" style="width:100%;padding:9px;margin-top:8px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:8px;color:#fff;">Sepetlerden içe aktar (PAXG, NVDAB, GOOGLB, UUUU)</button>' +
      '<button onclick="dfYedek()" style="width:100%;padding:9px;margin-top:6px;background:var(--input-bg);border:1px solid var(--card-border);border-radius:8px;color:#fff;">Tüm veriyi yedek olarak indir</button>' +
      '<div style="font-size:9px;color:var(--text-muted);margin-top:6px;">Her gün otomatik yedek de özel depoya alınır (son 30 gün). Fiyatlar canlı çekilir; bakiyeler defterden hesaplanır, elle bakiye yazmana gerek yok.</div></div>';
  }

  window.dfKomKaydet = function (v) { KOM = parseFloat(v) || 0; database.ref(yol('defterAyar/kom')).set(KOM); };
  window.dfEkle = function () {
    var ad = $('dfVarlik').value, tur = $('dfTur').value, t = $('dfTarih').value || bugunStr();
    var tutar = parseFloat($('dfTutar').value) || 0, fiyat = parseFloat($('dfFiyatGir').value) || 0, adet = parseFloat($('dfAdetGir').value) || 0;
    var tah = false;
    if (!fiyat) { fiyat = fiyatBul(ad, t) || 0; tah = true; if (!fiyat) { bildir('Fiyat bulunamadı, fiyatı yaz.'); return; } }
    if (tutar && !adet) adet = tutar / fiyat; else if (adet && !tutar) tutar = adet * fiyat; else if (!tutar && !adet) { bildir('Tutar veya adet yaz.'); return; }
    var kom = tutar * (parseFloat($('dfKom').value) || 0) / 100;
    DEFTER.push({ id: 'd' + Date.now().toString(36), t: t, a: ad, k: tur, tutar: Math.round(tutar * 100) / 100, adet: Math.round(adet * 1e6) / 1e6, fiyat: Math.round(fiyat * 1e4) / 1e4, kom: Math.round(kom * 100) / 100, tah: tah ? 1 : 0 });
    kaydet(); uygula(); ciz();
  };
  window.dfSil = function (id) { if (!confirm('Bu işlem silinsin mi?')) return; DEFTER = DEFTER.filter(function (e) { return e.id !== id; }); kaydet(); uygula(); ciz(); };
  window.dfFiyat = function (id, v) {
    v = parseFloat(v); if (!(v > 0)) return;
    DEFTER.forEach(function (e) { if (e.id === id) { e.fiyat = v; e.adet = Math.round(e.tutar / v * 1e6) / 1e6; e.tah = 0; } });
    kaydet(); uygula(); ciz();
  };
  window.dfOto = function (sid, i, on) {
    var ad = ESLE[i][1];
    var s = SP().find(function (x) { return x.id === sid; }); if (!s) return;
    if (on) s.oto = ad; else delete s.oto;
    sepetleriKaydet(); uygula(); ciz();
  };
  window.dfIceAktar = function () {
    var H = hesapla(), eklenen = 0, atlanan = [];
    SP().forEach(function (s) {
      var m = ESLE.find(function (m) { return typeof m[1] === 'string' && (s.name || '').toUpperCase().indexOf(m[0]) >= 0; }); if (!m) return;
      if (H[m[1]] && (H[m[1]].adet > 0 || DEFTER.some(function (e) { return e.a === m[1]; }))) { atlanan.push(m[1]); return; }
      var ekle = function (t, tutar, tur) {
        tutar = parseFloat(tutar) || 0; if (!t || tutar <= 0) return;
        var p = fiyatBul(m[1], t); if (!p) return;
        DEFTER.push({ id: 'd' + Date.now().toString(36) + (eklenen++), t: t, a: m[1], k: tur, tutar: tutar, adet: Math.round(tutar / p * 1e6) / 1e6, fiyat: p, kom: 0, tah: 1 });
      };
      (s.dates || []).forEach(function (d, i) { ekle(d, (s.amts || [])[i], 'al'); });
      (s.sDates || []).forEach(function (d, i) { ekle(d, (s.sAmts || [])[i], 'sat'); });
    });
    kaydet(); uygula(); ciz();
    bildir(eklenen ? (eklenen + ' işlem içe aktarıldı (fiyatlar tahmini, gerçek fiyatı düzeltebilirsin).') : 'Aktarılacak yeni kayıt yok' + (atlanan.length ? ' (zaten var: ' + atlanan.join(', ') + ')' : ''));
  };
  window.dfYedek = function () {
    var b = new Blob([JSON.stringify({ sepetler: SP(), defter: DEFTER, maliyet: window.MALIYET || {} }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'portfoy-tam-yedek-' + bugunStr() + '.json'; a.click();
  };
  window.dfCiz = ciz; window.dfUygula = uygula;

  function baslat() {
    if (hazir || !AU() || !AU().currentUser) return; hazir = true;
    database.ref(yol('defter')).on('value', function (s) { var v = s.val() || []; DEFTER = Array.isArray(v) ? v.filter(Boolean) : Object.values(v); uygula(); ciz(); });
    database.ref(yol('defterAyar/kom')).on('value', function (s) { KOM = Number(s.val()) || 0; });
  }
  fetch('./gecmis.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (g) { GECMIS = g; }).catch(function () {});
  var dene = setInterval(function () {
    if (AU() && AU().currentUser) baslat();
    if (hazir && window.SKOR && SP().length) {
      var k = SKOR.guncelleme + '|' + SP().length + '|' + DEFTER.length + '|' + Object.keys(GECMIS).length;
      if (k !== sonAnahtar) { sonAnahtar = k; uygula(); ciz(); }
    }
  }, 800);

  /* ---- Canlı fiyat: Cloudflare Worker (Yahoo + TEFAS) ---- */
  var WORKER = 'https://fiyat.xfranerxx.workers.dev/';
  var YSEM = { 'THYAO': 'THYAO.IS', 'TUPRS': 'TUPRS.IS', 'FROTO': 'FROTO.IS', 'BIMAS': 'BIMAS.IS', 'KCHOL': 'KCHOL.IS', 'ORZAX': 'ORZAX.IS', 'PAXG (altın)': 'PAXG-USD', 'UUUU': 'UUUU', 'GOOGLB (Alphabet)': 'GOOGL', 'NVDAB (Nvidia)': 'NVDA' };
  var FSEM = { 'YAY (fon)': 'YAY' };
  var canliBusy = false;
  function canliYenile() {
    var S = window.SKOR; if (!S || canliBusy) return; canliBusy = true;
    var url = WORKER + '?v=2&s=' + Object.keys(YSEM).map(function (k) { return YSEM[k]; }).join(',') + '&f=' + Object.keys(FSEM).map(function (k) { return FSEM[k]; }).join(',');
    fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      var n = 0;
      function yaz(ad, x, para, tip) {
        if (!x || !(x.p > 0)) return;
        var v = S.varliklar.find(function (q) { return q.ad === ad; });
        if (!v) { v = { ad: ad, tip: tip, para: para, fon: tip === 'fon' }; S.varliklar.push(v); }
        v.fiyat = Math.round(x.p * 100) / 100;
        if (x.o > 0) v.gun_degisim = Math.round((x.p / x.o - 1) * 10000) / 100;
        v.canli = 1; n++;
      }
      Object.keys(YSEM).forEach(function (ad) { yaz(ad, d[YSEM[ad]]); });
      Object.keys(FSEM).forEach(function (ad) { yaz(ad, d[FSEM[ad]], 'TL', 'fon'); });
      if (!n) return;
      S.canliZaman = new Date();
      if (typeof window.renderPiyasa === 'function') window.renderPiyasa();
      var z = $('canliZaman'), kutu = $('piyasaKutu');
      if (!z && kutu) { z = document.createElement('div'); z.id = 'canliZaman'; z.style.cssText = 'font-size:9px;color:var(--text-muted);margin-top:6px;'; kutu.parentNode.appendChild(z); }
      if (z) z.textContent = 'Canlı fiyat · ' + S.canliZaman.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' · hisse ~15 dk gecikmeli, YAY günlük TEFAS fiyatı';
      if (hazir) { uygula(); ciz(); } else if (window.bolustur) window.bolustur();
    }).catch(function () {}).then(function () { canliBusy = false; });
  }
  window.canliYenile = canliYenile;
  setInterval(function () { if (!document.hidden) canliYenile(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) canliYenile(); });
  var _cy = setInterval(function () { if (window.SKOR) { clearInterval(_cy); canliYenile(); } }, 300);
  window.dfAc = function () { ciz(); };
})();
