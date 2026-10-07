// Haftanın yolculukları: bu hafta kargoya verilen kitapların şehirden şehre rotası (animasyonlu harita + infografik)
import { durum } from '../durum.js';
import { h, ikon, kapak, zamanOnce } from '../ui.js';
import { ILLER, haritaSvg, mesafeKm, yay } from '../haritaCekirdek.js';
import { ustBar, bosDurum } from './ortak.js';

const HAFTA = 7 * 86400000;
const sayi = (n) => n.toLocaleString('tr-TR');

export function haftaninYolculuklari() {
  const sinir = Date.now() - HAFTA;
  return durum.yolculuklar
    .filter((y) => y.tarih >= sinir && ILLER.has(y.nereden) && ILLER.has(y.nereye))
    .map((y) => ({ ...y, km: mesafeKm(y.nereden, y.nereye) }));
}

export function ozet(liste) {
  const km = liste.reduce((t, y) => t + y.km, 0);
  const sehirler = new Set(liste.flatMap((y) => [y.nereden, y.nereye]));
  const say = (alan) => {
    const m = new Map();
    liste.forEach((y) => m.set(y[alan], (m.get(y[alan]) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  };
  const enUzun = [...liste].filter((y) => y.km > 0).sort((a, b) => b.km - a.km)[0] || null;
  return { adet: liste.length, km, sehir: sehirler.size, enUzun, gonderen: say('nereden'), alan: say('nereye') };
}

// Animasyonlu rota haritası: kavisli yollar çizilir, üzerlerinde küçük kitaplar yol alır.
export function rotaHaritasi(liste, { mini = false } = {}) {
  // Aynı şehir içindeki gönderimler için yay çizilmez; o şehir haritada nokta olarak işaretlenir
  const yollar = liste.filter((y) => y.nereden !== y.nereye).slice(0, mini ? 8 : 24);
  const sehirIci = liste.filter((y) => y.nereden === y.nereye).slice(0, 12);
  const noktalar = new Set([...yollar.flatMap((y) => [y.nereden, y.nereye]), ...sehirIci.map((y) => y.nereye)]);
  const ek = `
    <defs>
      <linearGradient id="rota-renk" x1="0" x2="1"><stop offset="0" stop-color="#F0B43C"/><stop offset="1" stop-color="#E8643A"/></linearGradient>
      <filter id="parla" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    ${yollar.map((y, i) => {
    const d = yay(y.nereden, y.nereye);
    const sure = (2.6 + Math.min(3, y.km / 500)).toFixed(1);
    const gecikme = (i * 0.55).toFixed(2);
    return `<g class="rota" style="--g:${gecikme}s">
        <path id="r${mini ? 'm' : ''}${i}" d="${d}" class="rota-iz"/>
        <path d="${d}" class="rota-cizgi" pathLength="1"/>
        <g class="rota-kitap"><g class="kitap-ici">
          <circle r="17" class="kitap-hale" filter="url(#parla)"/>
          <rect x="-10" y="-13" width="20" height="26" rx="3" class="kitap-govde"/>
          <rect x="-10" y="-13" width="5" height="26" rx="2" class="kitap-sirt"/>
        </g>
          <animateMotion dur="${sure}s" begin="${gecikme}s" repeatCount="indefinite" rotate="0" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.35 1">
            <mpath href="#r${mini ? 'm' : ''}${i}"/>
          </animateMotion>
        </g>
      </g>`;
  }).join('')}
    ${[...noktalar].map((ad) => {
    const il = ILLER.get(ad);
    const varis = yollar.some((y) => y.nereye === ad) || sehirIci.some((y) => y.nereye === ad);
    return `<g class="durak ${varis ? 'varis' : ''}" transform="translate(${il.x} ${il.y})"><circle r="18" class="durak-dalga"/><circle r="8" class="durak-nokta"/>${mini ? '' : `<text y="-20">${h(ad)}</text>`}</g>`;
  }).join('')}`;
  return haritaSvg({ ek, svgSinif: `gece ${mini ? 'mini' : ''}` });
}

export function yolculuklarEkrani(kok, { sorgu = {} } = {}) {
  const ciz = () => {
    const liste = haftaninYolculuklari();
    const o = ozet(liste);
    const bugun = new Date();
    const once = new Date(Date.now() - HAFTA + 86400000);
    const tarih = `${once.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${bugun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`;
    // İstanbul–Ankara ≈ 350 km
    const benzetme = o.km >= 700 ? `İstanbul ile Ankara arasını <b>${sayi(Math.round(o.km / 700))}</b> kez gidip gelmek kadar.` : '';

    kok.innerHTML = `
      ${ustBar('Haftanın yolculukları')}
      <section class="yolculuk-kahraman" ${o.adet ? 'data-gunluk' : ''}>
        <div class="yk-bas"><span class="kucuk-etiket acik">${ikon('rota', 13)} ${tarih}</span>
          <h1>${o.adet ? `Bu hafta <em>${o.adet} kitap</em> yeni okuruna yol aldı` : 'Bu hafta yollar sessiz'}</h1></div>
        <div class="yk-harita">${rotaHaritasi(liste)}</div>
        <div class="yk-sayilar">
          <div><b data-say="${o.adet}">${o.adet}</b><span>kitap yolda</span></div>
          <div><b data-say="${o.km}">${sayi(o.km)}</b><span>km yol</span></div>
          <div><b data-say="${o.sehir}">${o.sehir}</b><span>şehir</span></div>
        </div>
        ${benzetme ? `<p class="yk-benzetme">${ikon('parilti', 14)} ${benzetme}</p>` : ''}
      </section>

      ${o.adet ? `
      <section class="bolum">
        <div class="infografik">
          ${o.enUzun ? `<div class="info-kart genis">
            <span class="kucuk-etiket">${ikon('bayrak', 13)} En uzun yolculuk</span>
            <div class="uzun-rota">
              <div><b>${h(o.enUzun.nereden)}</b><span>çıkış</span></div>
              <div class="uzun-cizgi"><i></i><em>${sayi(o.enUzun.km)} km</em></div>
              <div><b>${h(o.enUzun.nereye)}</b><span>varış</span></div>
            </div>
            <p>“${h(o.enUzun.kitapAd)}” ${h(o.enUzun.kitapYazar || '')}</p>
          </div>` : ''}
          ${o.gonderen ? `<div class="info-kart mercan">
            <span class="kucuk-etiket">${ikon('el', 13)} En cömert şehir</span>
            <b>${h(o.gonderen[0])}</b><span>${o.gonderen[1]} kitap gönderdi</span>
          </div>` : ''}
          ${o.alan ? `<div class="info-kart zeytin">
            <span class="kucuk-etiket">${ikon('kitap', 13)} En çok okuyan</span>
            <b>${h(o.alan[0])}</b><span>${o.alan[1]} kitap teslim alıyor</span>
          </div>` : ''}
        </div>
      </section>

      <section class="bolum" id="gunluk">
        <div class="bolum-bas"><h2>Yolculuk günlüğü</h2><span class="sayac">${o.adet} kayıt</span></div>
        <ol class="gunluk">
          ${liste.map((y) => `<li class="${y.teslim ? 'ulasti' : 'yolda'}" ${y.kitapId ? `data-git="kitap/${h(y.kitapId)}"` : ''}>
            <div class="gunluk-kapak">${kapak({ ad: y.kitapAd, yazar: y.kitapYazar || '', foto: y.kitapFoto }, 'mini')}</div>
            <div class="gunluk-bilgi">
              <b>${h(y.kitapAd)}</b>
              <span class="gunluk-rota">${h(y.nereden)} <i>${ikon('sag', 14)}</i> ${h(y.nereye)}</span>
              <span class="gunluk-meta">${y.nereden === y.nereye ? 'şehir içi' : `${sayi(y.km)} km`} · ${zamanOnce(y.tarih)}</span>
            </div>
            <span class="gunluk-durum">${y.teslim ? `${ikon('tik', 14, 2.6)} Ulaştı` : `${ikon('kargo', 14)} Yolda`}</span>
          </li>`).join('')}
        </ol>
      </section>`
    : bosDurum('rota', 'Henüz yola çıkan kitap yok', 'Bir kitap kargoya verildiğinde rotası burada canlanır. İlk yolculuğu sen başlat!', '<button class="dugme ana" data-git="ekle">Kitap ekle</button>')}`;

    sayilariCanlandir(kok);
  };
  const gunlugeIn = () => kok.querySelector('#gunluk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  kok.addEventListener('click', (e) => { if (e.target.closest('[data-gunluk]')) gunlugeIn(); });
  ciz();
  // Keşfet'teki kartla gelindiyse doğrudan yolculuk günlüğüne in
  if (sorgu.bolum === 'gunluk') setTimeout(gunlugeIn, 350);
  return { guncelle: (n) => n === 'yolculuklar' && ciz() };
}

// Büyük sayılar 0'dan yukarı sayarak gelsin
function sayilariCanlandir(kok) {
  kok.querySelectorAll('[data-say]').forEach((el) => {
    const hedef = +el.dataset.say;
    if (!hedef) return;
    const t0 = performance.now();
    const adim = (t) => {
      const p = Math.min(1, (t - t0) / 1100);
      el.textContent = sayi(Math.round(hedef * (1 - (1 - p) ** 3)));
      if (p < 1 && el.isConnected) requestAnimationFrame(adim);
    };
    requestAnimationFrame(adim);
  });
}
