// Arka plan kontrolü (Capacitor Background Runner): uygulama kapalıyken yaklaşık 30 dakikada bir çalışır.
// Web görünümü yoktur; yalnızca fetch, CapacitorKV ve CapacitorNotifications kullanılabilir.
// Firestore'u yormamak için önce kullanıcının tek "kutu" belgesine bakılır (1 okuma);
// yalnızca son kontrolden beri bir gelişme olduysa talepler okunur.

const KV = (a) => { try { return CapacitorKV.get(a)?.value || ''; } catch { return ''; } };
const KVyaz = (a, v) => { try { CapacitorKV.set(a, v); } catch { /* yok */ } };

const kisa = (s, n = 60) => (String(s || '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s || ''));
const deger = (f) => (f ? (f.stringValue ?? f.integerValue ?? f.timestampValue ?? f.booleanValue ?? null) : null);

async function kimlikJetonu(ayar) {
  const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${ayar.key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(ayar.rt)}`,
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (j.refresh_token && j.refresh_token !== ayar.rt) { ayar.rt = j.refresh_token; KVyaz('ayar', JSON.stringify(ayar)); }
  return j.id_token;
}

async function talepler(ayar, jeton, alan) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${ayar.pid}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'talepler' }],
      where: { fieldFilter: { field: { fieldPath: alan }, op: 'EQUAL', value: { stringValue: ayar.uid } } },
      select: { fields: ['durum', 'kitapAd', 'isteyenAd', 'sahipAd', 'kargo', 'sorun'].map((f) => ({ fieldPath: f })) },
      limit: 100,
    } }),
  });
  if (!r.ok) return [];
  const satirlar = await r.json();
  return satirlar.filter((s) => s.document).map((s) => {
    const f = s.document.fields || {};
    const k = f.kargo?.mapValue?.fields || {};
    return {
      id: s.document.name.split('/').pop(), durum: deger(f.durum), kitapAd: deger(f.kitapAd),
      isteyenAd: deger(f.isteyenAd), sahipAd: deger(f.sahipAd), sorun: !!f.sorun?.mapValue,
      firma: deger(k.firma), takipNo: deger(k.takipNo),
    };
  });
}

// Uygulamanın kendi bildirimleriyle aynı mesajlar (bkz. src/bildirim.js)
function olaylar(gelen, giden, gecmis) {
  const l = [];
  for (const t of gelen) {
    const once = gecmis[t.id];
    if (once === t.durum && !(t.sorun && !gecmis[`${t.id}:s`])) continue;
    if (!once && t.durum === 'bekliyor') l.push(['Yeni kitap talebi 📚', `${kisa(t.isteyenAd, 30) || 'Bir okur'}, “${kisa(t.kitapAd)}” kitabını istiyor.`]);
    else if (once && once !== 'teslim' && t.durum === 'teslim') l.push(['Kitabın yeni okuruna ulaştı 🎉', `${kisa(t.isteyenAd, 30) || 'Okur'}, “${kisa(t.kitapAd)}” kitabını teslim aldı. 1 puan kazandın!`]);
    else if (once && once !== 'iptal' && t.durum === 'iptal') l.push(['Talep geri çekildi', `“${kisa(t.kitapAd)}” talebinden vazgeçildi.`]);
    else if (once && t.sorun && !gecmis[`${t.id}:s`]) l.push(['Okur bir sorun bildirdi', `“${kisa(t.kitapAd)}” gönderisiyle ilgili bir sorun bildirildi.`]);
  }
  for (const t of giden) {
    const once = gecmis[t.id];
    if (!once || once === t.durum) continue;
    if (t.durum === 'kabul') l.push(['Talebin kabul edildi! 🎉', `${kisa(t.sahipAd, 30) || 'Kitabın sahibi'}, “${kisa(t.kitapAd)}” kitabını sana gönderecek.`]);
    else if (t.durum === 'kargoda') l.push(['Kitabınız kargolandı 📦', `“${kisa(t.kitapAd)}” yola çıktı.${t.firma ? ` ${t.firma}` : ''}${t.takipNo ? ` · Takip no: ${t.takipNo}` : ''}`]);
    else if (t.durum === 'red') l.push(['Talebin bu sefer olmadı', `“${kisa(t.kitapAd)}” başka bir okura gidiyor. Raflarda seni bekleyen çok kitap var!`]);
    else if (t.durum === 'iade') l.push(['Kargo iade döndü', `“${kisa(t.kitapAd)}” teslim alınmadığı için göndericiye döndü.`]);
  }
  return l;
}

// Uygulama, oturum ve bilinen talep durumlarını buraya iletir
addEventListener('ayarla', (resolve, reject, args) => {
  try {
    if (!args?.uid) { KVyaz('ayar', ''); return resolve(); }
    KVyaz('ayar', JSON.stringify({ uid: args.uid, rt: args.rt, key: args.key, pid: args.pid }));
    if (args.durumlar) KVyaz('durumlar', JSON.stringify(args.durumlar));
    if (args.kutu) KVyaz('kutu', String(args.kutu));
    resolve();
  } catch (e) { reject(e); }
});

// Uygulama açılınca: arka planda bildirilmiş gelişmeler tekrar bildirilmesin
addEventListener('durumAl', (resolve) => {
  let d = {};
  try { d = JSON.parse(KV('durumlar') || '{}'); } catch { d = {}; }
  resolve({ durumlar: d });
});

addEventListener('kontrol', async (resolve) => {
  try {
    if (CapacitorApp.getState?.()?.isActive) return resolve(); // uygulama açıkken kendi dinleyicisi çalışıyor
    const ayar = JSON.parse(KV('ayar') || 'null');
    if (!ayar?.uid || !ayar.rt) return resolve();
    if (CapacitorDevice.getNetworkStatus?.()?.connected === false) return resolve();
    const jeton = await kimlikJetonu(ayar);
    if (!jeton) return resolve();

    // 1 okuma: son gelişme zamanı
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${ayar.pid}/databases/(default)/documents/kutular/${ayar.uid}`, {
      headers: { Authorization: `Bearer ${jeton}` },
    });
    if (!r.ok) return resolve();
    const kutu = deger((await r.json()).fields?.son) || '';
    if (!kutu || kutu === KV('kutu')) return resolve();
    KVyaz('kutu', kutu);

    const [gelen, giden] = await Promise.all([talepler(ayar, jeton, 'sahipId'), talepler(ayar, jeton, 'isteyenId')]);
    let gecmis = {};
    try { gecmis = JSON.parse(KV('durumlar') || '{}'); } catch { gecmis = {}; }
    const yeni = olaylar(gelen, giden, gecmis);
    for (const t of [...gelen, ...giden]) { gecmis[t.id] = t.durum; if (t.sorun) gecmis[`${t.id}:s`] = 1; }
    KVyaz('durumlar', JSON.stringify(gecmis));

    if (yeni.length) {
      CapacitorNotifications.schedule(yeni.slice(-4).map(([title, body], i) => ({
        id: (Math.floor(Date.now() / 1000) % 1000000) * 10 + i,
        title, body, largeBody: body,
        channelId: 'okudum_takas', smallIcon: 'ic_stat_okudum', sound: 'okudum_bildirim.wav', autoCancel: true,
      })));
    }
    resolve();
  } catch {
    resolve();
  }
});
