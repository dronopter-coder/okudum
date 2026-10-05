// Takas bildirimleri: talep listesindeki değişiklikleri izler.
// Uygulama açıkken: kısa tını + bildirim balonu. Arka plandayken: telefonun bildirim çubuğuna sesli bildirim.
// Uygulama kapalıyken olanlar, uygulama bir sonraki açılışta toplu olarak bildirilir.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { sesCal } from './ses.js';
import { toast } from './ui.js';
import { takasTamamlandi } from './paylas.js';

const KANAL = 'okudum_takas';
const YEREL = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
let onPlanda = !document.hidden;
let hazir = false;
let gecmis = null; // talepId → bilinen son durum
let anahtar = '';
let tiklaninca = () => {};

const kisa = (s, n = 60) => (String(s || '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s || ''));

// Başkasının yaptığı değişiklikler (kendi işlemlerimiz bildirim üretmez)
function olaylar(gelen, giden) {
  const liste = [];
  for (const t of gelen) {
    const once = gecmis[t.id];
    if (once === t.durum) continue;
    if (!once && t.durum === 'bekliyor') {
      liste.push({ ses: 'gelen', baslik: 'Yeni kitap talebi 📚', metin: `${kisa(t.isteyenAd, 30) || 'Bir okur'}, “${kisa(t.kitapAd)}” kitabını istiyor.`, sekme: 'gelen' });
    } else if (once && t.durum === 'teslim') {
      liste.push({ ses: 'teslim', baslik: 'Kitabın yeni okuruna ulaştı 🎉', metin: `${kisa(t.isteyenAd, 30) || 'Okur'}, “${kisa(t.kitapAd)}” kitabını teslim aldı. 1 puan kazandın!`, sekme: 'gelen', tamamlandi: true });
    } else if (once === 'kabul' && t.durum === 'iptal') {
      liste.push({ ses: 'yumusak', baslik: 'Talep süresi doldu', metin: `“${kisa(t.kitapAd)}” 7 gün kargoya verilmediği için ${kisa(t.isteyenAd, 30) || 'okur'} talebinden vazgeçti.`, sekme: 'gelen' });
    } else if (once === 'bekliyor' && t.durum === 'iptal') {
      liste.push({ ses: 'yumusak', baslik: 'Talep geri çekildi', metin: `${kisa(t.isteyenAd, 30) || 'Okur'}, “${kisa(t.kitapAd)}” talebinden vazgeçti.`, sekme: 'gelen' });
    }
  }
  // Okurun sorun bildirimi (durum değişmeden "sorun" alanı eklenir)
  for (const t of gelen) {
    if (t.sorun && !gecmis[`${t.id}:s`] && gecmis[t.id]) {
      liste.push({ ses: 'yumusak', baslik: 'Okur bir sorun bildirdi', metin: `“${kisa(t.kitapAd)}” gönderisiyle ilgili bir sorun bildirildi. Takas sayfasından ayrıntıya bak.`, sekme: 'gelen' });
    }
  }
  for (const t of giden) {
    const once = gecmis[t.id];
    if (!once || once === t.durum) continue;
    if (t.durum === 'iade') {
      liste.push({ ses: 'yumusak', baslik: 'Kargo iade döndü', metin: `“${kisa(t.kitapAd)}” teslim alınmadığı için göndericiye döndü. Hesabına 1 ihtar yazıldı.`, sekme: 'giden' });
      continue;
    }
    if (t.durum === 'kabul') {
      liste.push({ ses: 'kabul', baslik: 'Talebin kabul edildi! 🎉', metin: `${kisa(t.sahipAd, 30) || 'Kitabın sahibi'}, “${kisa(t.kitapAd)}” kitabını sana gönderecek.`, sekme: 'giden' });
    } else if (t.durum === 'kargoda') {
      const k = t.kargo || {};
      liste.push({ ses: 'kargo', baslik: 'Kitabınız kargolandı 📦', metin: `“${kisa(t.kitapAd)}” yola çıktı.${k.firma ? ` ${k.firma}` : ''}${k.takipNo ? ` · Takip no: ${k.takipNo}` : ''}`, sekme: 'giden' });
    } else if (t.durum === 'red') {
      liste.push({ ses: 'yumusak', baslik: 'Talebin bu sefer olmadı', metin: `“${kisa(t.kitapAd)}” başka bir okura gidiyor. Raflarda seni bekleyen çok kitap var!`, sekme: 'giden' });
    }
  }
  return liste;
}

function kaydet() {
  try { localStorage.setItem(anahtar, JSON.stringify(gecmis)); } catch {}
}

async function sistemBildirimi(o, sira) {
  if (!YEREL) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: (Date.now() % 2000000000) + sira,
        title: o.baslik,
        body: o.metin,
        largeBody: o.metin,
        channelId: KANAL,
        smallIcon: 'ic_stat_okudum',
        iconColor: '#E8643A',
        sound: 'okudum_bildirim.wav',
        extra: { sekme: o.sekme },
      }],
    });
  } catch {}
}

// Oturum açıldığında bir kez: izin, kanal ve dokunma dinleyicisi
export async function bildirimleriBaslat(uid, { dokununca } = {}) {
  anahtar = `okudum_bildirim_${uid}`;
  try { gecmis = JSON.parse(localStorage.getItem(anahtar) || 'null'); } catch { gecmis = null; }
  if (dokununca) tiklaninca = dokununca;
  if (hazir) return;
  hazir = true;
  document.addEventListener('visibilitychange', () => { onPlanda = !document.hidden; });
  if (!YEREL) return;
  App.addListener('appStateChange', ({ isActive }) => { onPlanda = isActive; });
  try {
    await LocalNotifications.createChannel({
      id: KANAL, name: 'Takas bildirimleri', description: 'Kitap talepleri, onaylar ve kargo haberleri',
      importance: 4, visibility: 1, sound: 'okudum_bildirim.wav', vibration: true, lights: true, lightColor: '#E8643A',
    });
  } catch {}
  try {
    const izin = await LocalNotifications.checkPermissions();
    if (izin.display === 'prompt' || izin.display === 'prompt-with-rationale') await LocalNotifications.requestPermissions();
  } catch {}
  LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    tiklaninca(e?.notification?.extra?.sekme || '');
  });
}

export function bildirimleriSifirla() {
  gecmis = null;
  anahtar = '';
}

// Her talep güncellemesinde çağrılır
export function talepDegisti(gelen, giden) {
  if (!anahtar) return;
  if (!gecmis) {
    // İlk kurulum: mevcut talepler bilinen kabul edilir (eski olaylar için bildirim yağmuru olmasın)
    gecmis = {};
    for (const t of [...gelen, ...giden]) { gecmis[t.id] = t.durum; if (t.sorun) gecmis[`${t.id}:s`] = 1; }
    hatirlaticilar(gelen, giden);
    return kaydet();
  }
  const yeni = olaylar(gelen, giden);
  for (const t of [...gelen, ...giden]) { gecmis[t.id] = t.durum; if (t.sorun) gecmis[`${t.id}:s`] = 1; }
  hatirlaticilar(gelen, giden);
  kaydet();
  if (!yeni.length) return;

  if (yeni.some((o) => o.tamamlandi) && onPlanda) takasTamamlandi();
  if (onPlanda) {
    sesCal(yeni[yeni.length - 1].ses);
    const o = yeni[yeni.length - 1];
    toast(yeni.length > 1 ? `${o.baslik} (+${yeni.length - 1} gelişme daha)` : `${o.baslik} ${o.metin}`, 'basari');
  } else {
    yeni.slice(-5).forEach((o, i) => sistemBildirimi(o, i));
  }
}

// ——— Zamanlanmış hatırlatmalar (uygulama kapalıyken de telefonda çıkar) ———
// Kabulden 3 gün sonra kitap sahibine "kargoya ver"; kargodan 5 gün sonra talep edene "teslim aldın mı?"
const GUN = 86400000;
const kimlik = (id, ek) => {
  let x = ek;
  for (const c of id) x = (x * 31 + c.charCodeAt(0)) % 1000000007;
  return 1000000 + (x % 900000000);
};
// Planlananlar saklanır: uygulama yeniden açıldığında artık gereksiz olanlar iptal edilebilsin
let planli = (() => { try { return new Map(JSON.parse(localStorage.getItem('okudum_planli') || '[]')); } catch { return new Map(); } })();
function hatirlaticilar(gelen, giden) {
  if (!YEREL) return;
  const istenen = new Map();
  for (const t of gelen) {
    if (t.durum === 'kabul' && t.kabulTarihi) {
      istenen.set(kimlik(t.id, 7), { at: t.kabulTarihi + 3 * GUN, baslik: 'Kargoya vermeyi unutma 📦', metin: `“${kisa(t.kitapAd)}” ${kisa(t.isteyenAd, 30) || 'okurunu'} bekliyor. Kabulden 7 gün sonra okur talebinden vazgeçebilir.`, sekme: 'gelen' });
    }
  }
  for (const t of giden) {
    if (t.durum === 'kargoda' && t.kargoTarihi && !t.sorun) {
      istenen.set(kimlik(t.id, 11), { at: t.kargoTarihi + 5 * GUN, baslik: 'Kitabın eline ulaştı mı? 📖', metin: `“${kisa(t.kitapAd)}” geldiyse “Teslim aldım”a bas; gönderen puanını kazansın.`, sekme: 'giden' });
    }
  }
  const iptal = [...planli.keys()].filter((id) => !istenen.has(id)).map((id) => ({ id }));
  if (iptal.length) LocalNotifications.cancel({ notifications: iptal }).catch(() => {});
  const yeni = [...istenen.entries()].filter(([id, o]) => o.at > Date.now() + 60000 && planli.get(id) !== o.at);
  if (yeni.length) {
    LocalNotifications.schedule({
      notifications: yeni.map(([id, o]) => ({
        id, title: o.baslik, body: o.metin, largeBody: o.metin, channelId: KANAL, smallIcon: 'ic_stat_okudum', iconColor: '#E8643A',
        sound: 'okudum_bildirim.wav', schedule: { at: new Date(o.at), allowWhileIdle: true }, extra: { sekme: o.sekme },
      })),
    }).catch(() => {});
  }
  planli = new Map([...istenen.entries()].map(([id, o]) => [id, o.at]));
  try { localStorage.setItem('okudum_planli', JSON.stringify([...planli])); } catch {}
}
