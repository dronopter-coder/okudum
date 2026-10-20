// Kitap haritası: illere göre kitap yoğunluğu. Uzaktan sayı balonları, yakınlaşınca kitap baloncukları.
import { durum } from '../durum.js';
import { h, ikon, kapak, $, titret } from '../ui.js';
import { ILLER, haritaSvg, kaydirYakinlastir } from '../haritaCekirdek.js';
import { kitapKarti, bulunma } from './ortak.js';

const DETAY_K = 3.2; // bu yakınlıktan sonra kitap baloncukları görünür
const HALKA = 6; // odaktaki şehirde gösterilen kitap baloncuğu

// Krem → mercan arası renk (kitap yoğunluğu)
function yogunlukRengi(oran) {
  const a = [239, 228, 210];
  const b = [232, 100, 58];
  const t = Math.pow(oran, 0.6);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

export function haritaEkrani(kok) {
  let secili = '';
  let kontrol = null;
  const ogeler = new Map(); // katmandaki balon/baloncuk öğeleri (anahtar → element)

  const veri = () => {
    const sehirler = new Map();
    for (const k of durum.kitaplar) {
      if (k.durum !== 'musait' || !ILLER.has(k.sehir)) continue;
      if (!sehirler.has(k.sehir)) sehirler.set(k.sehir, []);
      sehirler.get(k.sehir).push(k);
    }
    return sehirler;
  };
  let sehirler = veri();

  const iskelet = () => {
    const toplam = [...sehirler.values()].reduce((t, l) => t + l.length, 0);
    const enCok = Math.max(1, ...[...sehirler.values()].map((l) => l.length));
    kok.innerHTML = `
      <header class="harita-bas">
        <div>
          <h1>Kitap haritası</h1>
          <p>${toplam ? `<b>${toplam}</b> kitap · <b>${sehirler.size}</b> şehirde yeni okurunu bekliyor` : 'Henüz rafta kitap yok'}</p>
        </div>
        <button class="yuvarlak" data-git="yolculuklar" aria-label="Haftanın yolculukları">${ikon('rota', 20)}</button>
      </header>
      <div class="harita-gorunum" id="hg">
        <div class="harita-ic" id="hi">${haritaSvg({
    dolgu: (ad) => (sehirler.has(ad) ? yogunlukRengi(sehirler.get(ad).length / enCok) : ''),
    sinif: (ad) => `${sehirler.has(ad) ? 'dolu' : ''} ${ad === secili ? 'secili' : ''} ${ad === durum.profil?.sehir ? 'benim' : ''}`,
  })}</div>
        <div class="harita-katman" id="hk"></div>
        <div class="harita-kontrol">
          <button data-z="1.6" aria-label="Yakınlaştır">${ikon('arti', 20, 2.4)}</button>
          <button data-z="0.62" aria-label="Uzaklaştır">${ikon('eksi', 20, 2.4)}</button>
          <button data-z="0" aria-label="Tüm Türkiye">${ikon('merkez', 18)}</button>
        </div>
        <div class="harita-ipucu" id="hip">${ikon('parilti', 14)} Yakınlaştır, kitapları gör</div>
      </div>
      <section class="harita-panel" id="hp"></section>`;
  };

  const panelCiz = () => {
    const hp = $('#hp', kok);
    if (secili && sehirler.has(secili)) {
      const l = sehirler.get(secili);
      hp.innerHTML = `
        <div class="panel-bas">
          <div><span class="kucuk-etiket">${ikon('pin', 13)} ${h(secili)}</span><h2>${l.length} kitap seni bekliyor</h2></div>
          <button class="yuvarlak kucuk" id="hp-kapat" aria-label="Kapat">${ikon('x', 16)}</button>
        </div>
        <div class="liste-yatay yatay-kaydir">${l.map((k) => kitapKarti(k, { genis: true })).join('')}</div>`;
      $('#hp-kapat', hp).addEventListener('click', () => { secili = ''; kontrol.sifirla(); panelCiz(); svgSecim(); });
      return;
    }
    const sirali = [...sehirler.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    const enCok = sirali[0]?.[1].length || 1;
    const benim = durum.profil?.sehir;
    hp.innerHTML = sirali.length ? `
      <div class="panel-bas"><div><span class="kucuk-etiket">${ikon('yukselis', 13)} Sıralama</span><h2>En dolu raflar</h2></div></div>
      <ol class="sehir-sira">
        ${sirali.map(([ad, l], i) => `<li data-sehir="${h(ad)}" class="${ad === benim ? 'benim' : ''}">
          <span class="sira">${i + 1}</span>
          <span class="sehir-ad">${h(ad)}${ad === benim ? ' <em>· senin şehrin</em>' : ''}</span>
          <span class="cubuk"><i style="width:${Math.max(8, (l.length / enCok) * 100)}%"></i></span>
          <b>${l.length}</b>
        </li>`).join('')}
      </ol>
      ${benim && sehirler.has(benim) && !sirali.some(([a]) => a === benim) ? `<button class="dugme ikincil genis" data-sehir="${h(benim)}">${ikon('pin', 18)}<span>${h(bulunma(benim))} ${sehirler.get(benim).length} kitap var</span></button>` : ''}`
      : `<div class="bos"><div class="bos-ikon">${ikon('harita', 30, 1.8)}</div><b>Harita seni bekliyor</b><p>İlk kitabı ekle, şehrin haritada parlasın.</p><button class="dugme ana" data-git="ekle">Kitap ekle</button></div>`;
  };

  const svgSecim = () => {
    kok.querySelectorAll('.tr-harita .il.secili').forEach((p) => p.classList.remove('secili'));
    if (secili) kok.querySelector(`.tr-harita .il[data-il="${CSS.escape(secili)}"]`)?.classList.add('secili');
  };

  const sehreGit = (ad) => {
    const il = ILLER.get(ad);
    if (!il) return;
    secili = ad;
    titret();
    svgSecim();
    panelCiz();
    kontrol.git({ k: Math.max(kontrol.durum.k, 4.2), svgX: il.x, svgY: il.y + 8 });
  };

  // Katmanı çiz: uzakta sayı balonları, yakında kitap baloncukları
  const katmanCiz = (d) => {
    const hk = $('#hk', kok);
    if (!hk) return;
    const detay = d.k >= DETAY_K;
    $('#hip', kok)?.classList.toggle('gizli', detay || d.k > 1.6);
    const istenen = new Map();
    const enCok = Math.max(1, ...[...sehirler.values()].map((l) => l.length));
    // Yakında kalabalık olmasın: kitap baloncukları yalnızca odaktaki şehirde (seçili ya da ekran ortasına en yakın)
    let odak = secili && sehirler.has(secili) ? secili : '';
    if (detay && !odak) {
      let enYakin = 1e9;
      for (const ad of sehirler.keys()) {
        const il = ILLER.get(ad);
        const p = kontrol.ekran(il.x, il.y);
        const uzaklik = Math.hypot(p.x - d.g / 2, p.y - d.y / 2);
        if (uzaklik < enYakin && uzaklik < 160) { enYakin = uzaklik; odak = ad; }
      }
    }
    for (const [ad, liste] of sehirler) {
      const il = ILLER.get(ad);
      const p = kontrol.ekran(il.x, il.y);
      if (p.x < -160 || p.y < -120 || p.x > d.g + 160 || p.y > d.y + 120) continue;
      if (!detay) {
        const boy = Math.round(24 + Math.sqrt(liste.length / enCok) * 26);
        istenen.set(`b:${ad}`, { x: p.x, y: p.y, html: `<span>${liste.length}</span>`, sinif: `balon ${ad === secili ? 'secili' : ''}`, sehir: ad, boy });
        continue;
      }
      istenen.set(`e:${ad}`, { x: p.x, y: p.y, html: `${h(ad)} <b>${liste.length}</b>`, sinif: `sehir-etiket ${ad === odak ? 'secili' : 'soluk'}`, sehir: ad });
      if (ad !== odak) continue;
      const gosterilen = liste.slice(0, HALKA);
      const r = Math.min(120, 70 + (d.k - DETAY_K) * 8);
      gosterilen.forEach((k, i) => {
        const aci = -Math.PI / 2 + ((i + 0.5) / gosterilen.length) * Math.PI * 2;
        istenen.set(`k:${k.id}`, {
          x: p.x + Math.cos(aci) * r * 1.25, y: p.y + Math.sin(aci) * r, kitap: k.id, sinif: 'kitap-balon',
          html: `${kapak(k, 'mini')}<span>${h(k.ad)}</span>`,
        });
      });
      if (liste.length > HALKA) {
        istenen.set(`f:${ad}`, { x: p.x, y: p.y + r + 26, html: `+${liste.length - HALKA} kitap`, sinif: 'fazla-balon', sehir: ad });
      }
    }
    for (const [anahtar, el] of ogeler) {
      if (!istenen.has(anahtar)) { el.remove(); ogeler.delete(anahtar); }
    }
    for (const [anahtar, o] of istenen) {
      let el = ogeler.get(anahtar);
      if (!el) {
        el = document.createElement('button');
        el.dataset.tik = '';
        if (o.sehir) el.dataset.sehir = o.sehir;
        if (o.kitap) el.dataset.git = `kitap/${o.kitap}`;
        el.innerHTML = o.html;
        hk.appendChild(el);
        ogeler.set(anahtar, el);
      }
      el.className = `katman-oge ${o.sinif}`;
      if (o.boy) { el.style.width = `${o.boy}px`; el.style.height = `${o.boy}px`; }
      el.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, -50%)`;
    }
  };

  const kur = () => {
    kontrol?.kapat();
    ogeler.clear();
    iskelet();
    panelCiz();
    kontrol = kaydirYakinlastir($('#hg', kok), $('#hi', kok), katmanCiz);
    kok.querySelector('.harita-kontrol').addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
      const z = +b.dataset.z;
      if (z) kontrol.yakinlas(z);
      else { secili = ''; svgSecim(); panelCiz(); kontrol.sifirla(); }
    });
  };

  kok.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sehir]');
    if (s) { e.stopPropagation(); return sehreGit(s.dataset.sehir); }
    const il = e.target.closest('.tr-harita .il.dolu');
    if (il) sehreGit(il.dataset.il);
  });

  kur();
  return {
    guncelle(neler) {
      if (neler !== 'kitaplar') return;
      // Haritada görünen (şehir → kitaplar) değişmediyse haritayı baştan kurma
      const yeni = veri();
      const imza = (m) => [...m.entries()].map(([a, l]) => `${a}:${l.map((k) => k.id + k.ad).join(',')}`).sort().join('|');
      if (imza(yeni) === imza(sehirler)) return;
      const d = kontrol ? { ...kontrol.durum } : null;
      sehirler = yeni;
      kur();
      if (d && d.k > 1) kontrol.ayarla(d);
    },
    temizle: () => kontrol?.kapat(),
  };
}
