// Ana ekran: selamlama, arama, kategoriler, yeni gelenler, şehrindekiler ve tüm raf
import { durum } from '../durum.js';
import { demoMu } from '../veri/index.js';
import { h, ikon, avatar, kapak, $ } from '../ui.js';
import { KATEGORILER } from '../sabitler.js';
import { kitapKarti, bosDurum, iskelet, logo, bulunma } from './ortak.js';
import { haftaninYolculuklari, ozet, rotaHaritasi } from './yolculuklar.js';
import { yildizKartiHtml, yildizKartiniYenile } from './yildizlar.js';
import { uygulamayiPaylas } from '../paylas.js';

function selam() {
  const s = new Date().getHours();
  if (s < 6) return 'İyi geceler';
  if (s < 12) return 'Günaydın';
  if (s < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function kesfetEkrani(kok) {
  const ciz = () => {
    const p = durum.profil;
    const ilkAd = (p?.ad || '').split(' ')[0];
    const musait = durum.kitaplar.filter((k) => k.durum === 'musait' && k.sahipId !== durum.kullanici.uid);
    const yeni = musait.slice(0, 8);
    const sehrim = musait.filter((k) => k.sehir && k.sehir === p?.sehir).slice(0, 10);
    const yolda = durum.kitaplar.filter((k) => k.durum === 'verildi').length;

    kok.innerHTML = `
    <header class="kesfet-ust">
      <a class="logo-bag" data-git="yolculuklar" aria-label="Haftanın yolculukları">${logo()}</a>
      <div class="ust-sag">
        <button class="yuvarlak paylas-dugme" id="ks-paylas" aria-label="Okudum'u paylaş">${ikon('paylas', 19)}</button>
        <button class="avatar-dugme" data-git="profil" aria-label="Profil">${avatar(p?.ad, p?.foto, 40)}</button>
      </div>
    </header>
    <section class="selam">
      <p>${selam()}${ilkAd ? `, ${h(ilkAd)}` : ''} ✨</p>
      <h1>Bugün hangi kitap <em>seni</em> bekliyor?</h1>
    </section>
    <button class="arama-hap" data-git="ara">${ikon('ara', 20)}<span>Kitap, yazar ya da tür ara…</span></button>
    ${demoMu ? `<div class="demo-serit">${ikon('parilti', 16)}<span><b>Demo modu</b> — tüm veriler bu cihazda. Bir kitap iste, akışı canlı izle!</span></div>` : ''}

    <div class="kategori-serit yatay-kaydir">
      ${KATEGORILER.slice(0, 10).map((k) => `<button class="cip" data-git="ara?kategori=${encodeURIComponent(k)}">${h(k)}</button>`).join('')}
    </div>

    ${!durum.kitaplarHazir ? `<div class="izgara">${iskelet(4)}</div>` : musait.length === 0
    ? bosDurum('kitap', 'Raflar şimdilik boş', 'İlk kitabı sen paylaş, okuma zinciri senden başlasın!', '<button class="dugme ana" data-git="ekle">Kitap ekle</button>')
    : `
    <section class="bolum">
      <div class="bolum-bas"><h2>Rafa yeni gelenler</h2><button class="baglanti" data-git="ara">Tümü</button></div>
      <div class="vitrin yatay-kaydir">
        ${yeni.map((k) => `<a class="vitrin-kitap" data-git="kitap/${h(k.id)}">
          ${kapak(k)}
          <b>${h(k.ad)}</b><span>${h(k.yazar)}</span>
        </a>`).join('')}
      </div>
    </section>

    ${sehrim.length ? `<section class="bolum">
      <div class="bolum-bas"><h2>${ikon('konum', 18)} ${h(bulunma(p.sehir))} seni bekleyenler</h2></div>
      <div class="liste-yatay yatay-kaydir">${sehrim.map((k) => kitapKarti(k, { genis: true })).join('')}</div>
    </section>` : ''}

    ${yolculukKarti()}
    ${yildizKartiHtml()}

    <section class="bilgi-kart">
      <div>
        <b>${yolda > 0 ? `${yolda} kitap yeni okuruna yol aldı` : 'Nasıl çalışır?'}</b>
        <p>Kitap ücretsiz, kargo karşı ödemeli: kitabı isteyen, teslim alırken yalnızca kargo ücretini öder.</p>
      </div>
      <div class="bilgi-kart-ikon">${ikon('el', 30, 1.8)}</div>
    </section>

    <section class="bolum">
      <div class="bolum-bas"><h2>Tüm raf</h2><span class="sayac">${musait.length} kitap</span></div>
      <div class="izgara">${musait.map((k) => kitapKarti(k)).join('')}</div>
    </section>`}
    `;
  };
  ciz();
  yildizKartiniYenile(kok);
  kok.addEventListener('click', (e) => { if (e.target.closest('#ks-paylas')) uygulamayiPaylas(); });
  return {
    guncelle(neler) {
      if (neler === 'yolculuklar') {
        const eski = $('#yk-kart', kok);
        if (eski) eski.outerHTML = yolculukKarti();
        yildizKartiniYenile(kok);
        return;
      }
      if (neler !== 'kitaplar') return;
      const y = kok.scrollTop;
      const vitrin = $('.vitrin', kok)?.scrollLeft;
      ciz();
      kok.scrollTop = y;
      if ($('.vitrin', kok) && vitrin) $('.vitrin', kok).scrollLeft = vitrin;
    },
  };
}

// Keşfet'teki "Haftanın yolculukları" kartı: mini animasyonlu harita + kısa özet
function yolculukKarti() {
  const liste = haftaninYolculuklari();
  const o = ozet(liste);
  return `<a class="yk-kart" id="yk-kart" data-git="yolculuklar">
    <div class="yk-kart-metin">
      <span class="kucuk-etiket acik">${ikon('rota', 13)} Haftanın yolculukları</span>
      <b>${o.adet ? `${o.adet} kitap, ${o.km.toLocaleString('tr-TR')} km yol yaptı` : 'Kitaplar yola çıkmayı bekliyor'}</b>
      <span>${o.enUzun ? `En uzunu: ${h(o.enUzun.nereden)} → ${h(o.enUzun.nereye)}` : 'Kargoya verilen her kitap burada iz bırakır.'}</span>
    </div>
    <div class="yk-kart-harita">${rotaHaritasi(liste, { mini: true })}</div>
    <span class="yk-kart-ok">${ikon('sag', 18)}</span>
  </a>`;
}
