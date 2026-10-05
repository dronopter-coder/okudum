// Ayın yıldızları: en çok kitap gönderen okurların sıralaması (ilk 10) + Keşfet'teki özet kartı
import { durum } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar } from '../ui.js';
import { ustBar, bosDurum } from './ortak.js';

// Sıralama, herkese açık yolculuk kayıtlarından (son 500 gönderim) hesaplanır: her kayıt bir gönderimdir.
export function siralamaHesapla(donem = 'ay') {
  const simdi = new Date();
  const bas = donem === 'ay' ? new Date(simdi.getFullYear(), simdi.getMonth(), 1).getTime() : 0;
  const m = new Map();
  const ciftler = new Set();
  for (const y of durum.yolculuklar) {
    // Yalnızca teslim alınmış gönderimler sayılır; aynı kişiye ayda bir gönderim (karşılıklı şişirmeye karşı)
    if (!y.sahipId || !y.teslim || y.tarih < bas) continue;
    const ay = new Date(y.tarih);
    const cift = `${y.sahipId}|${y.isteyenId}|${ay.getFullYear()}-${ay.getMonth()}`;
    if (ciftler.has(cift)) continue;
    ciftler.add(cift);
    const k = m.get(y.sahipId) || { uid: y.sahipId, adet: 0, ilk: y.tarih };
    k.adet++;
    k.ilk = Math.min(k.ilk, y.tarih);
    m.set(y.sahipId, k);
  }
  // Çok gönderen öne; eşitlikte o sayıya önce ulaşan
  return [...m.values()].sort((a, b) => b.adet - a.adet || a.ilk - b.ilk);
}

export const ayAdi = () => new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

// Eksik profilleri getirip önbelleğe koyar
export async function profilleriYukle(uidler) {
  durum.profilOnbellek.set(durum.kullanici.uid, { ad: durum.profil.ad, sehir: durum.profil.sehir, foto: durum.profil.foto || '' });
  const eksik = [...new Set(uidler)].filter((u) => u && !durum.profilOnbellek.has(u));
  if (!eksik.length) return false;
  const sonuc = await api.profilleriGetir(eksik).catch(() => ({}));
  for (const u of eksik) durum.profilOnbellek.set(u, sonuc[u] || { ad: '', sehir: '', foto: '' });
  return true;
}
export const profilBilgisi = (uid) => durum.profilOnbellek.get(uid) || { ad: '', sehir: '', foto: '' };
const adGoster = (uid) => profilBilgisi(uid).ad || 'Okur';

// ——— Keşfet kartı ———
export function yildizKartiHtml() {
  const lider = siralamaHesapla('ay')[0];
  const p = lider ? profilBilgisi(lider.uid) : null;
  return `<a class="ys-kart" id="ys-kart" data-git="yildizlar">
    <div class="ys-kart-isik" aria-hidden="true"></div>
    ${lider
    ? `<div class="ys-kart-avatar"><i class="tac">${ikon('tac', 20, 2)}</i>${avatar(adGoster(lider.uid), p.foto, 58)}</div>
      <div class="ys-kart-metin">
        <span class="kucuk-etiket acik">${ikon('yildiz', 13)} Ayın yıldızı</span>
        <b>${h(adGoster(lider.uid))}</b>
        <span>${lider.adet} kitap gönderdi${p.sehir ? ` · ${h(p.sehir)}` : ''}</span>
      </div>`
    : `<div class="ys-kart-avatar bos"><i class="tac">${ikon('yildiz', 24, 2)}</i></div>
      <div class="ys-kart-metin"><span class="kucuk-etiket acik">${ikon('yildiz', 13)} Ayın yıldızı</span><b>Bu ayın yıldızı henüz yok</b><span>İlk kitabı gönderen zirveye çıkar!</span></div>`}
    <span class="yk-kart-ok">${ikon('sag', 18)}</span>
  </a>`;
}

// Kartı yerinde yeniler; lider profili önbellekte yoksa getirip bir daha çizer
export function yildizKartiniYenile(kok) {
  const eski = kok.querySelector('#ys-kart');
  if (!eski) return;
  eski.outerHTML = yildizKartiHtml();
  const lider = siralamaHesapla('ay')[0];
  if (lider && !durum.profilOnbellek.has(lider.uid)) {
    profilleriYukle([lider.uid]).then((degisti) => { if (degisti) { const k = kok.querySelector('#ys-kart'); if (k) k.outerHTML = yildizKartiHtml(); } });
  }
}

// ——— Tam ekran sıralama ———
export function yildizlarEkrani(kok) {
  let donem = 'ay';
  const ben = durum.kullanici.uid;

  const ciz = () => {
    const tum = siralamaHesapla(donem);
    const ilk10 = tum.slice(0, 10);
    const lider = ilk10[0];
    const benimSira = tum.findIndex((x) => x.uid === ben);
    const enCok = lider?.adet || 1;
    const kicker = donem === 'ay' ? `${ayAdi()} · Ayın yıldızı` : 'Tüm zamanlar · Zirvedeki okur';

    kok.innerHTML = `
      ${ustBar('Ayın yıldızları')}
      <section class="yildiz-kahraman">
        <div class="yk-yildizlar" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <span class="kucuk-etiket acik">${ikon('kupa', 13)} ${h(kicker)}</span>
        ${lider ? `
          <div class="lider">
            <div class="lider-tac">${ikon('tac', 30, 1.8)}</div>
            <div class="lider-avatar">${avatar(adGoster(lider.uid), profilBilgisi(lider.uid).foto, 104)}</div>
            <h1>${h(adGoster(lider.uid))}${lider.uid === ben ? ' <em>· sen</em>' : ''}</h1>
            <p>${profilBilgisi(lider.uid).sehir ? `${ikon('konum', 14)} ${h(profilBilgisi(lider.uid).sehir)} · ` : ''}<b>${lider.adet}</b> kitap gönderdi</p>
          </div>`
    : `<div class="lider bos"><div class="lider-tac">${ikon('yildiz', 30, 1.8)}</div><h1>Zirve seni bekliyor</h1><p>${donem === 'ay' ? 'Bu ay henüz kitap gönderilmedi.' : 'Henüz kitap gönderilmedi.'}</p></div>`}
      </section>

      <div class="sekme-anahtar yildiz-anahtar" style="--i:${donem === 'ay' ? 0 : 1}">
        <i class="sekme-anahtar-kaydirici"></i>
        <button data-d="ay" class="${donem === 'ay' ? 'secili' : ''}"><span>Bu ay</span></button>
        <button data-d="hepsi" class="${donem === 'hepsi' ? 'secili' : ''}"><span>Tüm zamanlar</span></button>
      </div>

      ${ilk10.length ? `
      <ol class="sira-liste">
        ${ilk10.map((x, i) => {
    const p = profilBilgisi(x.uid);
    return `<li class="sira-${i + 1} ${x.uid === ben ? 'benim' : ''}" data-git="${x.uid === ben ? 'profil' : `kisi/${h(x.uid)}`}">
            <span class="sira-no">${i < 3 ? ikon('madalya', 17, 2.2) : ''}<b>${i + 1}</b></span>
            ${avatar(adGoster(x.uid), p.foto, 44)}
            <div class="sira-bilgi"><b>${h(adGoster(x.uid))}${x.uid === ben ? ' <em>· sen</em>' : ''}</b><span>${h(p.sehir || '')}</span><i class="cubuk"><u style="width:${Math.max(8, (x.adet / enCok) * 100)}%"></u></i></div>
            <span class="sira-adet"><b>${x.adet}</b><em>kitap</em></span>
          </li>`;
  }).join('')}
      </ol>
      ${benimSira >= 10 ? `<div class="benim-sira"><span class="sira-no"><b>${benimSira + 1}</b></span>${avatar(durum.profil.ad, durum.profil.foto, 40)}<div><b>Senin sıran</b><span>${tum[benimSira].adet} kitap gönderdin · zirveye ${enCok - tum[benimSira].adet} kitap kaldı</span></div></div>` : ''}
      ${benimSira < 0 ? `<div class="benim-sira"><span class="sira-no">${ikon('yildiz', 16)}</span>${avatar(durum.profil.ad, durum.profil.foto, 40)}<div><b>Sen de listeye girebilirsin</b><span>Bir kitabı kargoya ver, ilk 10'a adım at.</span></div></div>` : ''}
      <p class="ys-not">${ikon('bilgi', 14)} Sıralama, yeni okuruna ulaşan (teslim alınan) kitap sayısına göre hesaplanır. Aynı okura ayda bir gönderim sayılır; her ayın başında sıfırlanır.</p>`
    : bosDurum('kupa', 'Liste henüz boş', 'Kargoya verilen ilk kitap, gönderenini zirveye taşır.')}`;

    kok.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { donem = b.dataset.d; ciz(); yukle(); }));
  };

  // Profiller (ad, şehir, fotoğraf) geldikçe listeyi yeniden çiz
  const yukle = () => {
    const uidler = siralamaHesapla(donem).slice(0, 10).map((x) => x.uid);
    profilleriYukle(uidler).then((degisti) => { if (degisti && kok.isConnected) { const y = kok.scrollTop; ciz(); kok.scrollTop = y; } });
  };

  ciz();
  yukle();
  return { guncelle: (n) => { if (n === 'yolculuklar') { const y = kok.scrollTop; ciz(); yukle(); kok.scrollTop = y; } } };
}
