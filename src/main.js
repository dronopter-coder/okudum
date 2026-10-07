import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { api } from './veri/index.js';
import { durum, degisti, abone, kitaplariSuz } from './durum.js';
import { ikon, $, titret, toast, hataMetni, ustSayfayiKapat } from './ui.js';
import { git, geri, yiginiSifirla, tarayiciGeriGitti, rotalayiciAyarla } from './yon.js';
import { App } from '@capacitor/app';
import { reklamlariBaslat, bannerGoster } from './reklam.js';
import { bildirimleriBaslat, bildirimleriSifirla, talepDegisti } from './bildirim.js';
import { girisEkrani } from './ekranlar/giris.js';
import { kesfetEkrani } from './ekranlar/kesfet.js';
import { araEkrani } from './ekranlar/ara.js';
import { kitapEkrani } from './ekranlar/kitap.js';
import { ekleEkrani } from './ekranlar/ekle.js';
import { takasEkrani } from './ekranlar/takas.js';
import { profilEkrani } from './ekranlar/profil.js';
import { profilDuzenleEkrani } from './ekranlar/profilDuzenle.js';
import { kisiEkrani } from './ekranlar/kisi.js';
import { dogrulaEkrani } from './ekranlar/dogrula.js';
import { haritaEkrani } from './ekranlar/harita.js';
import { yolculuklarEkrani } from './ekranlar/yolculuklar.js';
import { yildizlarEkrani } from './ekranlar/yildizlar.js';
import { yonetimEkrani } from './ekranlar/yonetim.js';

const ROTALAR = {
  giris: { ekran: girisEkrani, acik: true, koyu: true },
  dogrula: { ekran: dogrulaEkrani },
  kesfet: { ekran: kesfetEkrani, sekme: 'kesfet' },
  ara: { ekran: araEkrani },
  harita: { ekran: haritaEkrani, sekme: 'harita', tamEkran: true },
  yolculuklar: { ekran: yolculuklarEkrani },
  yildizlar: { ekran: yildizlarEkrani },
  takas: { ekran: takasEkrani, sekme: 'takas' },
  profil: { ekran: profilEkrani, sekme: 'profil' },
  kitap: { ekran: kitapEkrani },
  ekle: { ekran: ekleEkrani },
  kisi: { ekran: kisiEkrani },
  'profil-duzenle': { ekran: profilDuzenleEkrani },
  yonetim: { ekran: yonetimEkrani },
};

let aktif = null; // { ad, ekran örneği }
let kitapAboneligi = null;
let talepAboneligi = null;
let yolculukAboneligi = null;
let hesapAboneligi = null;
let sikayetAboneligi = null;

function cozumle() {
  const [yol, sorgu = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [ad, ...parca] = yol.split('/');
  return { ad: ad || 'kesfet', parca, sorgu: Object.fromEntries(new URLSearchParams(sorgu)) };
}

function rotala() {
  if (durum.kullanici === undefined) return; // oturum henüz bilinmiyor
  let { ad, parca, sorgu } = cozumle();
  if (!ROTALAR[ad]) ad = 'kesfet';
  if (!durum.kullanici && !ROTALAR[ad].acik) { ad = 'giris'; history.replaceState(null, '', '#/giris'); }
  if (durum.kullanici && !durum.kullanici.dogrulandi) {
    if (ad !== 'dogrula') { ad = 'dogrula'; history.replaceState(null, '', '#/dogrula'); }
  } else if (ad === 'dogrula') { ad = durum.kullanici ? 'kesfet' : 'giris'; history.replaceState(null, '', `#/${ad}`); }
  if (durum.kullanici && ad === 'giris') { ad = 'kesfet'; history.replaceState(null, '', '#/kesfet'); }
  if (durum.kullanici?.dogrulandi && !durum.profil?.sehir && ad !== 'profil-duzenle') {
    ad = 'profil-duzenle';
    sorgu = { ilk: '1' };
    history.replaceState(null, '', '#/profil-duzenle?ilk=1');
  }

  const rota = ROTALAR[ad];
  aktif?.ornek?.temizle?.();
  const sahne = $('#sahne');
  sahne.className = 'sahne giris-anim' + (rota.sekme ? ' sekmeli' : '') + (rota.tamEkran ? ' tam-ekran' : '');
  sahne.scrollTop = 0;
  sahne.innerHTML = '';
  aktif = { ad, ornek: rota.ekran(sahne, { parca, sorgu }) || {} };
  void sahne.offsetWidth;
  sekmeCiz(rota.sekme);
  durumCubugu(rota.koyu);
  bannerGoster(!!rota.sekme);
}

function sekmeCiz(secili) {
  const nav = $('#sekme');
  nav.hidden = !secili;
  if (!secili) return;
  const bekleyen = durum.gelen.filter((t) => t.durum === 'bekliyor').length
    + durum.giden.filter((t) => t.durum === 'kargoda').length;
  const s = (id, ik, ad, rozet = 0) => `<button class="sekme-d ${secili === id ? 'secili' : ''}" data-git="${id}" aria-label="${ad}">
      <span class="sekme-ikon">${ikon(ik, 22, secili === id ? 2.4 : 1.9)}${rozet ? `<i class="rozet">${rozet}</i>` : ''}</span><span>${ad}</span></button>`;
  nav.innerHTML = `
    ${s('kesfet', 'ev', 'Keşfet')}
    ${s('harita', 'harita', 'Harita')}
    <button class="sekme-fab" data-git="ekle" aria-label="Kitap ekle">${ikon('arti', 28, 2.6)}</button>
    ${s('takas', 'takas', 'Takas', bekleyen)}
    ${s('profil', 'kisi', 'Profil')}`;
}

function durumCubugu(koyu) {
  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: koyu ? Style.Dark : Style.Light }).catch(() => {});
}

// Telefonun geri tuşu:
//  1) açık pencere (alt sayfa) varsa onu kapatır
//  2) iç sayfadaysa bir önceki sayfaya döner
//  3) Harita/Takas/Profil'den Keşfet'e döner
//  4) Keşfet'te (ya da giriş/doğrulama/ilk kurulumda) iki kez basılınca uygulamadan çıkar
const CIKIS_SAYFALARI = new Set(['giris', 'dogrula', 'kesfet']);
const SEKME_SAYFALARI = new Set(['harita', 'takas', 'profil']);
let sonCikisDenemesi = 0;
export function donanimGeri() {
  if (ustSayfayiKapat()) return 'pencere';
  const { ad, sorgu } = cozumle();
  if (SEKME_SAYFALARI.has(ad)) { yiginiSifirla(); git('kesfet', { degistir: true }); return 'kesfet'; }
  const kok = CIKIS_SAYFALARI.has(ad) || (ad === 'profil-duzenle' && sorgu.ilk === '1');
  if (!kok) { geri(); return 'geri'; }
  if (Date.now() - sonCikisDenemesi < 2000) {
    if (Capacitor.isNativePlatform()) App.exitApp();
    return 'cikis';
  }
  sonCikisDenemesi = Date.now();
  toast('Çıkmak için tekrar geri tuşuna bas');
  return 'uyari';
}
window.okudumGeri = donanimGeri; // sınama için

function abonelikleriKapat() {
  kitapAboneligi?.(); kitapAboneligi = null;
  talepAboneligi?.(); talepAboneligi = null;
  yolculukAboneligi?.(); yolculukAboneligi = null;
  hesapAboneligi?.(); hesapAboneligi = null;
  sikayetAboneligi?.(); sikayetAboneligi = null;
}

// Kargodan 14 gün sonra itirazsız kalan gönderilerim teslim edilmiş sayılır (puanım yazılır)
const GUN = 86400000;
const otomatikDenenen = new Set();
function suresiDolanlar(gelen) {
  for (const t of gelen) {
    if (t.durum !== 'kargoda' || t.sorun || !t.kargoTarihi || otomatikDenenen.has(t.id)) continue;
    if (Date.now() - t.kargoTarihi < 14 * GUN + 60000) continue;
    otomatikDenenen.add(t.id);
    api.otomatikTeslim(t).catch(() => {});
  }
}

function verileriDinle(uid) {
  const hata = (e) => toast(hataMetni(e), 'hata');
  hesapAboneligi = api.hesabiDinle(uid, (h) => { durum.hesap = h; degisti('hesap'); });
  api.hesapHazirla(uid).then((h) => { durum.hesap = h; degisti('hesap'); }).catch(() => {});
  api.engelleriGetir(uid).then((l) => { durum.engel = new Set(l); kitaplariSuz(); degisti('kitaplar'); }).catch(() => {});
  // Yönetici: açık şikâyet sayısı (profilde rozet) ve yeni şikâyet uyarısı
  if (durum.yonetici) {
    let ilk = true;
    sikayetAboneligi = api.sikayetleriDinle((l) => {
      const acik = l.filter((x) => !x.incelendi).length;
      if (!ilk && acik > (durum.acikSikayet || 0)) toast('Yeni bir şikâyet var. Profil › Yönetici paneli', 'hata');
      ilk = false;
      durum.acikSikayet = acik;
      degisti('sikayet');
    }, () => {});
  }
  api.askidakileriGetir().then((l) => { durum.askidakiler = new Set(l); kitaplariSuz(); degisti('kitaplar'); }).catch(() => {});
  kitapAboneligi = api.kitaplariDinle((liste) => {
    durum.tumKitaplar = liste;
    kitaplariSuz();
    durum.kitaplarHazir = true;
    degisti('kitaplar');
  }, hata);
  yolculukAboneligi = api.yolculuklariDinle((liste) => {
    durum.yolculuklar = liste;
    degisti('yolculuklar');
  }, () => {});
  talepAboneligi = api.talepleriDinle(uid, ({ gelen, giden }) => {
    const sirala = (a, b) => b.guncelleme - a.guncelleme;
    durum.gelen = gelen.sort(sirala);
    durum.giden = giden.sort(sirala);
    talepDegisti(gelen, giden);
    suresiDolanlar(gelen);
    degisti('talepler');
  }, hata);
}

abone((neler) => {
  aktif?.ornek?.guncelle?.(neler);
  if (neler === 'talepler' && aktif && ROTALAR[aktif.ad].sekme) sekmeCiz(ROTALAR[aktif.ad].sekme);
});

function baslat() {
  durum.kullanici = undefined;
  rotalayiciAyarla(rotala);
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('yerel');
    App.addListener('backButton', () => donanimGeri());
  }

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-git]');
    if (g) { e.preventDefault(); titret(); git(g.dataset.git); }
    if (e.target.closest('[data-geri]')) { e.preventDefault(); titret(); geri(); }
  });
  window.addEventListener('popstate', () => {
    if ($('.sheet-kap')) return; // açık alt sayfayı kapatan geri hareketi
    tarayiciGeriGitti();
    rotala();
  });

  let onceki = null;
  api.oturumuDinle(async (k) => {
    // Jeton yenilemeleri de haber verir; kullanıcı ve doğrulama durumu değişmediyse bir şey yapma.
    const imza = k ? `${k.uid}|${k.dogrulandi}` : '';
    if (imza === onceki) return;
    onceki = imza;
    abonelikleriKapat();
    durum.kullanici = k;
    durum.yonetici = api.yoneticiMi(k);
    durum.kitaplar = []; durum.gelen = []; durum.giden = []; durum.yolculuklar = []; durum.kitaplarHazir = false;
    if (k && !k.dogrulandi) {
      durum.profil = null; // doğrulanana kadar veriye erişim yok
    } else if (k) {
      try {
        durum.profil = (await api.profilGetir(k.uid)) || { ad: k.ad || k.eposta.split('@')[0], foto: k.foto || '', sehir: '' };
        if (!durum.profil.foto && k.foto && !durum.profil.fotoKaldirildi) durum.profil.foto = k.foto;
      } catch (e) {
        durum.profil = { ad: k.ad, foto: k.foto, sehir: '' };
        toast(hataMetni(e), 'hata');
      }
      bildirimleriBaslat(k.uid, { dokununca: (sekme) => git(sekme ? `takas?sekme=${sekme}` : 'takas') });
      verileriDinle(k.uid);
      reklamlariBaslat();
    } else {
      durum.profil = null;
      bildirimleriSifirla();
    }
    $('#acilis')?.classList.add('gizli');
    setTimeout(() => $('#acilis')?.remove(), 500);
    rotala();
  });
}

baslat();
