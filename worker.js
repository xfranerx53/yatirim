// Cloudflare Worker: Yahoo Finance fiyat köprüsü (BIST: THYAO.IS, ABD: NVDA ...)
// Kullanım: https://SENIN-ADRESIN.workers.dev/?s=THYAO.IS,NVDA  ->  {"THYAO.IS":292.1,"NVDA":140.2}
const IZIN_VERILEN_SITE = 'https://xfranerx53.github.io';

export default {
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': IZIN_VERILEN_SITE, 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    const url = new URL(req.url);
    const semboller = (url.searchParams.get('s') || '').split(',')
      .map(x => x.trim().toUpperCase()).filter(x => /^[A-Z0-9.\-^=]{1,15}$/.test(x)).slice(0, 30);
    if (!semboller.length) return yanit({ hata: 's parametresi yok' }, 400, cors);
    const sonuc = {};
    await Promise.all(semboller.map(async sym => {
      try {
        const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1d&interval=1d',
          { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 60, cacheEverything: true } });
        if (!r.ok) { sonuc[sym] = null; return; }
        const p = (await r.json())?.chart?.result?.[0]?.meta?.regularMarketPrice;
        sonuc[sym] = typeof p === 'number' ? p : null;
      } catch (e) { sonuc[sym] = null; }
    }));
    return yanit(sonuc, 200, cors);
  }
};
function yanit(obj, kod, cors) {
  return new Response(JSON.stringify(obj), { status: kod, headers: { ...cors, 'Content-Type': 'application/json' } });
}
