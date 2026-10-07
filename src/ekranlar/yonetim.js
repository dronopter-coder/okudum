// Yönetici paneli: şikâyetler, kitap kaldırma, hesap askıya alma (yalnızca yönetici hesabında görünür)
import { durum, kitaplariSuz, degisti } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, kapak, onayla, toast, hataMetni, titret, zamanOnce } from '../ui.js';
import { ustBar, bosDurum } from './ortak.js';
import { profilleriYukle, profilBilgisi } from './yildizlar.js';
import { SEBEPLER } from '../sikayet.js';
import { sesCal } from '../ses.js';

const SEBEP_AD = Object.fromEntries([...SEBEPLER.kitap, ...SEBEPLER.kisi].map(([k, a]) => [k, a]));
const kitapOnbellek = new Map(); // kitapId → kitap | null (kaldırılmış)

// ——— Ortak yönetici işlemleri (kitap ve kişi sayfalarından da çağrılır) ———
export async function yoneticiKitapKaldir(kitapId, ad) {
  if (!(await onayla('Kitap kaldırılsın mı?', `"${ad}" raftan kalıcı olarak silinecek. Bu işlem geri alınamaz.`, { evet: 'Kaldır', tehlike: true }))) return false;
  try {
    await api.kitapKaldir(kitapId);
    kitapOnbellek.set(kitapId, null);
    sesCal('yumusak');
    toast('Kitap kaldırıldı.', 'basari');
    return true;
  } catch (e) {
    toast(hataMetni(e), 'hata');
    return false;
  }
}

export async function yoneticiAskiDegistir(uid, ad) {
  const askiya = !durum.askidakiler.has(uid);
  const soru = askiya
    ? ['Hesap askıya alınsın mı?', `${ad || 'Bu kullanıcı'} kitap ekleyemeyecek, kitap isteyemeyecek ve kitapları raflarda görünmeyecek. İstediğin zaman askıyı kaldırabilirsin.`, 'Askıya al']
    : ['Askı kaldırılsın mı?', `${ad || 'Bu kullanıcı'} yeniden kitap ekleyip isteyebilecek.`, 'Askıyı kaldır'];
  if (!(await onayla(soru[0], soru[1], { evet: soru[2], tehlike: askiya }))) return false;
  try {
    await api.askiyaAl(uid, askiya);
    if (askiya) durum.askidakiler.add(uid); else durum.askidakiler.delete(uid);
    kitaplariSuz();
    degisti('kitaplar');
    toast(askiya ? 'Hesap askıya alındı.' : 'Askı kaldırıldı.', 'basari');
    return true;
  } catch (e) {
    toast(hataMetni(e), 'hata');
    return false;
  }
}

// Yönetici araç çubuğu (kitap ve kişi sayfalarına eklenir)
export function yoneticiCubugu(dugmeler) {
  if (!durum.yonetici) return '';
  return `<div class="yonetici-cubuk"><span class="kucuk-etiket">${ikon('kalkan', 13)} Yönetici</span><div>${dugmeler}</div></div>`;
}

export function yonetimEkrani(kok) {
  if (!durum.yonetici) {
    kok.innerHTML = `${ustBar('Yönetici paneli')}${bosDurum('kilit', 'Bu sayfa yalnızca yöneticiye açık', '')}`;
    return {};
  }
  let sekme = 'acik';
  let sikayetler = [];
  let hazir = false;

  const kitapBilgisi = (id) => {
    const k = durum.tumKitaplar.find((x) => x.id === id);
    if (k) return k;
    if (kitapOnbellek.has(id)) return kitapOnbellek.get(id);
    kitapOnbellek.set(id, undefined);
    api.kitapGetir(id).then((x) => { kitapOnbellek.set(id, x); if (kok.isConnected) ciz(); });
    return undefined;
  };

  const sikayetKarti = (s) => {
    const bildiren = profilBilgisi(s.verenId).ad || 'Bir okur';
    let hedef;
    let eylem = '';
    if (s.hedefTur === 'kitap') {
      const k = kitapBilgisi(s.hedefId);
      if (k === undefined) hedef = `<div class="yn-hedef"><span class="donen koyu"></span></div>`;
      else if (k === null) hedef = `<div class="yn-hedef"><div class="yn-simge silik">${ikon('cop', 20)}</div><div><b>Kaldırılmış kitap</b><span>Bu ilan artık rafta değil.</span></div></div>`;
      else {
        hedef = `<a class="yn-hedef" data-git="kitap/${h(k.id)}">${kapak(k, 'mini')}<div><b>${h(k.ad)}</b><span>${h(k.yazar)} · ${h(k.sahipAd || '')}</span></div>${ikon('sag', 18)}</a>`;
        eylem = `<button class="dugme tehlike kucuk" data-kaldir="${h(k.id)}" data-ad="${h(k.ad)}">${ikon('cop', 16)}<span>Kitabı kaldır</span></button>
          <button class="dugme ikincil kucuk" data-aski="${h(k.sahipId)}" data-ad="${h(k.sahipAd || '')}">${ikon('engel', 16)}<span>${durum.askidakiler.has(k.sahipId) ? 'Askıyı kaldır' : 'Sahibini askıya al'}</span></button>`;
      }
    } else {
      const p = profilBilgisi(s.hedefId);
      hedef = `<a class="yn-hedef" data-git="kisi/${h(s.hedefId)}">${avatar(p.ad || '?', p.foto, 44)}<div><b>${h(p.ad || 'Kullanıcı')}</b><span>${h(p.sehir || '')}${durum.askidakiler.has(s.hedefId) ? ' · <em>askıda</em>' : ''}</span></div>${ikon('sag', 18)}</a>`;
      eylem = `<button class="dugme ${durum.askidakiler.has(s.hedefId) ? 'ikincil' : 'tehlike'} kucuk" data-aski="${h(s.hedefId)}" data-ad="${h(p.ad || '')}">${ikon('engel', 16)}<span>${durum.askidakiler.has(s.hedefId) ? 'Askıyı kaldır' : 'Askıya al'}</span></button>`;
    }
    return `<article class="yn-kart ${s.incelendi ? 'incelendi' : ''}">
      <div class="yn-ust">
        <span class="yn-tur ${s.hedefTur}">${ikon(s.hedefTur === 'kitap' ? 'kitap' : 'kisi', 13)} ${s.hedefTur === 'kitap' ? 'İlan' : 'Kullanıcı'}</span>
        <span class="yn-zaman">${zamanOnce(s.tarih)}</span>
      </div>
      <b class="yn-sebep">${h(SEBEP_AD[s.sebep] || s.sebep)}</b>
      ${s.aciklama ? `<p class="yn-not">“${h(s.aciklama)}”</p>` : ''}
      <span class="yn-bildiren">Bildiren: <a data-git="kisi/${h(s.verenId)}">${h(bildiren)}</a></span>
      ${hedef}
      <div class="yn-eylem">${eylem}<button class="dugme hayalet kucuk" data-incele="${h(s.id)}" data-v="${s.incelendi ? '0' : '1'}">${ikon(s.incelendi ? 'iade' : 'tik', 16)}<span>${s.incelendi ? 'Yeniden aç' : 'İncelendi'}</span></button></div>
    </article>`;
  };

  const ciz = () => {
    const acik = sikayetler.filter((s) => !s.incelendi);
    const incelenen = sikayetler.filter((s) => s.incelendi);
    const askida = [...durum.askidakiler];
    let icerik;
    if (!hazir) icerik = '<div class="tam-yukleniyor"><span class="donen koyu"></span></div>';
    else if (sekme === 'askida') {
      icerik = askida.length ? `<ul class="yn-liste">${askida.map((uid) => {
        const p = profilBilgisi(uid);
        return `<li><a data-git="kisi/${h(uid)}">${avatar(p.ad || '?', p.foto, 40)}<div><b>${h(p.ad || 'Kullanıcı')}</b><span>${h(p.sehir || '')}</span></div></a>
          <button class="dugme ikincil kucuk" data-aski="${h(uid)}" data-ad="${h(p.ad || '')}">Askıyı kaldır</button></li>`;
      }).join('')}</ul>` : bosDurum('kalkan', 'Askıda hesap yok', 'Askıya aldığın kullanıcılar burada listelenir.');
    } else {
      const liste = sekme === 'acik' ? acik : incelenen;
      icerik = liste.length ? liste.map(sikayetKarti).join('')
        : bosDurum('tik', sekme === 'acik' ? 'Açık şikâyet yok' : 'İncelenen şikâyet yok', sekme === 'acik' ? 'Her şey yolunda görünüyor. 🎉' : '');
    }
    const sekmeler = [['acik', 'Açık', acik.length], ['incelenen', 'İncelenen', incelenen.length], ['askida', 'Askıdakiler', askida.length]];
    kok.innerHTML = `
      ${ustBar('Yönetici paneli')}
      <div class="yn-ozet">
        <div><b>${acik.length}</b><span>açık şikâyet</span></div>
        <div><b>${askida.length}</b><span>askıda hesap</span></div>
        <div><b>${durum.tumKitaplar.filter((k) => k.durum === 'musait').length}</b><span>rafta kitap</span></div>
      </div>
      <div class="yn-sekmeler">${sekmeler.map(([k, a, n]) => `<button data-s="${k}" class="${sekme === k ? 'secili' : ''}">${a}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
      <div class="yn-icerik">${icerik}</div>`;
    // Görünen kişilerin adlarını getir
    const uidler = [...sikayetler.flatMap((s) => [s.verenId, s.hedefTur === 'kisi' ? s.hedefId : null]), ...askida].filter(Boolean);
    profilleriYukle(uidler).then((degisti) => { if (degisti && kok.isConnected) ciz(); });
  };

  kok.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-s]');
    if (s) { sekme = s.dataset.s; titret(); return ciz(); }
    const k = e.target.closest('[data-kaldir]');
    if (k) { if (await yoneticiKitapKaldir(k.dataset.kaldir, k.dataset.ad)) ciz(); return; }
    const a = e.target.closest('[data-aski]');
    if (a) { if (await yoneticiAskiDegistir(a.dataset.aski, a.dataset.ad)) ciz(); return; }
    const i = e.target.closest('[data-incele]');
    if (i) {
      try { await api.sikayetIsaretle(i.dataset.incele, i.dataset.v === '1'); titret(); } catch (err) { toast(hataMetni(err), 'hata'); }
    }
  });

  const kapat = api.sikayetleriDinle((l) => { sikayetler = l; hazir = true; durum.acikSikayet = l.filter((x) => !x.incelendi).length; if (kok.isConnected) ciz(); }, (e) => toast(hataMetni(e), 'hata'));
  api.askidakileriGetir().then((l) => { durum.askidakiler = new Set(l); if (kok.isConnected) ciz(); }).catch(() => {});
  ciz();
  return { guncelle: (n) => n === 'kitaplar' && ciz(), temizle: () => kapat?.() };
}
