// Bir okurun sayfası: rafı ve gönderdiği kitaplar (kime hangi kitabı gönderdi)
import { durum } from '../durum.js';
import { h, ikon, avatar, kapak, sayfaAc, toast, zamanOnce, titret } from '../ui.js';
import { kitapKarti, bosDurum, ustBar } from './ortak.js';
import { profilleriYukle, profilBilgisi } from './yildizlar.js';
import { sikayetSayfasi, engelliMi, engelDegistir } from '../sikayet.js';
import { sahipPuaniYaz } from './kitap.js';
import { yoneticiCubugu, yoneticiAskiDegistir } from './yonetim.js';

export function kisiEkrani(kok, { parca }) {
  const uid = parca[0];

  const gonderilenler = () => durum.yolculuklar.filter((y) => y.sahipId === uid).sort((a, b) => b.tarih - a.tarih);

  const ciz = () => {
    const kitaplar = durum.kitaplar.filter((k) => k.sahipId === uid);
    const ornek = kitaplar[0];
    const prof = profilBilgisi(uid);
    const ad = prof.ad || ornek?.sahipAd || '';
    const foto = prof.foto || ornek?.sahipFoto || '';
    const sehir = prof.sehir || ornek?.sehir || '';
    const rafta = kitaplar.filter((k) => k.durum === 'musait');
    const gonderilen = gonderilenler();

    kok.innerHTML = `
      ${ustBar('')}
      ${ad ? `<section class="kisi-bas">
        <div class="kisi-avatar">${avatar(ad, foto, 84)}</div>
        <h1>${h(ad)}</h1>
        <p>${sehir ? `${ikon('konum', 15)} ${h(sehir)}` : ''}</p>
        <span class="sahip-puan" id="ks-puan"></span>
        ${durum.yonetici && durum.askidakiler.has(uid) ? `<div class="ipucu dikkat">${ikon('kalkan', 18)}<span>Bu hesap askıda: kitap ekleyemez, kitap isteyemez.</span></div>` : ''}
        ${engelliMi(uid) ? `<div class="ipucu dikkat">${ikon('engel', 18)}<span>Bu okuru engelledin. Kitaplarını görmüyorsun ve senin kitaplarını isteyemez.</span></div>` : ''}
        <div class="istatistik kucuk">
          <div class="ist"><b>${rafta.length}</b><span>Rafında</span></div>
          <button class="ist dokunulur" id="ks-paylasti" aria-label="Gönderdiği kitapları gör"><b>${gonderilen.length}</b><span>Paylaştı ${ikon('sag', 12, 2.6)}</span></button>
        </div>
      </section>
      <section class="bolum"><div class="bolum-bas"><h2>Rafındaki kitaplar</h2></div>
        ${rafta.length ? `<div class="izgara">${rafta.map((k) => kitapKarti(k)).join('')}</div>` : bosDurum('raf', 'Rafı şu an boş', 'Bu okurun paylaşacak kitabı kalmamış.')}
      </section>
      ${uid !== durum.kullanici.uid ? `<div class="kisi-eylem">
        <button class="bildir-bag" id="ks-bildir">${ikon('bildir', 14)}<span>Bildir</span></button>
        <button class="bildir-bag" id="ks-engel">${ikon('engel', 14)}<span>${engelliMi(uid) ? 'Engeli kaldır' : 'Engelle'}</span></button>
      </div>
      ${yoneticiCubugu(`<button class="dugme ${durum.askidakiler.has(uid) ? 'ikincil' : 'tehlike'} kucuk" id="ks-y-aski">${ikon('kalkan', 16)}<span>${durum.askidakiler.has(uid) ? 'Askıyı kaldır' : 'Hesabı askıya al'}</span></button>`)}` : ''}` : bosDurum('kisi', 'Okur bulunamadı', '')}`;
    sahipPuaniYaz(uid, kok.querySelector('#ks-puan'));
    kok.querySelector('#ks-bildir')?.addEventListener('click', () => sikayetSayfasi('kisi', uid, ad));
    kok.querySelector('#ks-y-aski')?.addEventListener('click', async () => { if (await yoneticiAskiDegistir(uid, ad)) ciz(); });
    kok.querySelector('#ks-engel')?.addEventListener('click', async () => { if (await engelDegistir(uid, ad)) ciz(); });

    kok.querySelector('#ks-paylasti')?.addEventListener('click', () => { titret(); gonderilenleriGoster(ad, gonderilen); });
  };

  // Gönderdiği kitaplar: kitap → alıcı (ad, şehir), ne zaman, ulaştı mı
  const gonderilenleriGoster = (ad, liste) => {
    if (!liste.length) return toast(`${ad.split(' ')[0]} henüz kitap göndermedi.`);
    const ciz2 = () => liste.map((y) => {
      const a = profilBilgisi(y.isteyenId);
      return `<li class="${y.teslim ? 'ulasti' : 'yolda'}" ${y.kitapId ? `data-git="kitap/${h(y.kitapId)}" data-kapat` : ''}>
        <div class="gunluk-kapak">${kapak({ ad: y.kitapAd, yazar: y.kitapYazar || '', foto: y.kitapFoto }, 'mini')}</div>
        <div class="gunluk-bilgi">
          <b>${h(y.kitapAd)}</b>
          <span class="kisi-ok">${ikon('sag', 14)}${avatar(a.ad || 'Okur', a.foto, 20)}<span><b>${h(a.ad || 'Okur')}</b>${y.nereye ? ` · ${h(y.nereye)}` : ''}</span></span>
          <span class="gunluk-meta">${zamanOnce(y.tarih)}</span>
        </div>
        <span class="gunluk-durum">${y.teslim ? `${ikon('tik', 14, 2.6)} Ulaştı` : `${ikon('kargo', 14)} Yolda`}</span>
      </li>`;
    }).join('');
    const s = sayfaAc(`
      <h3 class="sheet-baslik">${h(ad.split(' ')[0])}'in gönderdikleri</h3>
      <p class="sheet-metin">Hangi kitabı kime gönderdi? Yalnızca kitap ve okurun adı görünür; adres ve telefon bilgisi asla paylaşılmaz.</p>
      <ol class="gunluk duz sheet-liste" id="ks-liste">${ciz2()}</ol>
      <button class="dugme ana genis" data-kapat>Tamam</button>`, { sinif: 'uzun' });
    // Alıcıların adları/fotoğrafları geldikçe listeyi tazele
    profilleriYukle(liste.map((y) => y.isteyenId)).then((degisti) => {
      const l = s.el.querySelector('#ks-liste');
      if (degisti && l) l.innerHTML = ciz2();
    });
  };

  ciz();
  profilleriYukle([uid]).then((degisti) => { if (degisti && kok.isConnected) ciz(); });
  return { guncelle: (n) => (n === 'kitaplar' || n === 'yolculuklar') && ciz() };
}
