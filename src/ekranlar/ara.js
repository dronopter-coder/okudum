// Arama: metin, kategori ve şehir filtresi
import { durum } from '../durum.js';
import { h, ikon, $, $$ } from '../ui.js';
import { KATEGORILER, ILLER } from '../sabitler.js';
import { kitapKarti, bosDurum } from './ortak.js';

const kucuk = (s) => (s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function araEkrani(kok, { sorgu }) {
  const f = { metin: '', kategori: sorgu.kategori || '', sehir: '' };

  kok.innerHTML = `
    <header class="sayfa-bas ara-bas"><button class="yuvarlak" data-geri aria-label="Geri">${ikon('geri', 22)}</button><h1>Keşfet & ara</h1></header>
    <label class="arama-kutu">${ikon('ara', 20)}<input id="a-metin" type="search" placeholder="Kitap, yazar ya da tür ara…" autocomplete="off" enterkeyhint="search"/></label>
    <div class="filtre-satir">
      <label class="secici">${ikon('konum', 16)}<select id="a-sehir"><option value="">Tüm Türkiye</option>${ILLER.map((i) => `<option>${i}</option>`).join('')}</select></label>
    </div>
    <div class="kategori-serit yatay-kaydir" id="a-kat">
      <button class="cip" data-kat="">Tümü</button>
      ${KATEGORILER.map((k) => `<button class="cip" data-kat="${h(k)}">${h(k)}</button>`).join('')}
    </div>
    <div id="a-sonuc"></div>`;

  const sonucCiz = () => {
    const m = kucuk(f.metin.trim());
    const liste = durum.kitaplar.filter((k) => k.durum === 'musait'
      && (!f.kategori || k.kategori === f.kategori)
      && (!f.sehir || k.sehir === f.sehir)
      && (!m || kucuk(`${k.ad} ${k.yazar} ${k.kategori}`).includes(m)));
    $$('#a-kat .cip', kok).forEach((c) => c.classList.toggle('secili', c.dataset.kat === f.kategori));
    $('#a-sonuc', kok).innerHTML = liste.length
      ? `<p class="sonuc-sayi">${liste.length} kitap bulundu</p><div class="izgara">${liste.map((k) => kitapKarti(k)).join('')}</div>`
      : bosDurum('ara', 'Bulunamadı', 'Aradığın kitap henüz kimsenin rafında yok. Biraz sonra tekrar bak — raflar her gün yenileniyor.');
  };

  $('#a-metin', kok).addEventListener('input', (e) => { f.metin = e.target.value; sonucCiz(); });
  $('#a-sehir', kok).addEventListener('change', (e) => { f.sehir = e.target.value; sonucCiz(); });
  $('#a-kat', kok).addEventListener('click', (e) => {
    const c = e.target.closest('[data-kat]');
    if (!c) return;
    f.kategori = c.dataset.kat;
    history.replaceState(null, '', f.kategori ? `#/ara?kategori=${encodeURIComponent(f.kategori)}` : '#/ara');
    sonucCiz();
  });
  sonucCiz();
  $('#a-kat .cip.secili', kok)?.scrollIntoView({ inline: 'center', block: 'nearest' });

  return { guncelle: (n) => n === 'kitaplar' && sonucCiz() };
}
