// Haftalık talep hakkı: son 7 günde en fazla 2 talep. 1. talep serbest, 2. talep ödüllü reklamla açılır.
// Reddedilen ya da geri çekilen talepler hakkı tüketmez.
import { Capacitor } from '@capacitor/core';
import { durum } from './durum.js';
import { h, ikon, $, sayfaAc, toast, titret } from './ui.js';
import { odulluReklam } from './reklam.js';
import { sesCal } from './ses.js';
import { git } from './yon.js';

export const HAFTALIK_SINIR = 2;
const HAFTA = 7 * 86400000;
const odulAnahtari = () => `okudum_odul_${durum.kullanici?.uid || ''}`;

// Bu hafta sayılan talepler (eskiden yeniye)
export function haftalikTalepler() {
  const sinir = Date.now() - HAFTA;
  return durum.giden
    .filter((t) => (t.olusturma || 0) >= sinir && t.durum !== 'red' && t.durum !== 'iptal')
    .sort((a, b) => a.olusturma - b.olusturma);
}

// Reklam izlendiyse hak 24 saat saklanır: talep formu kapatılırsa yeniden izlemek gerekmez.
const odulVar = () => {
  try { return Date.now() - Number(localStorage.getItem(odulAnahtari()) || 0) < 86400000; } catch { return false; }
};
const odulVer = () => { try { localStorage.setItem(odulAnahtari(), String(Date.now())); } catch {} };
export const odulKullan = () => { try { localStorage.removeItem(odulAnahtari()); } catch {} };

const tarihYaz = (ms) => new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

// true → talep formu açılabilir. Sıra: ihtar cezası → puan → haftalık sınır (2. talep reklamla)
export async function talepHakkiAl() {
  const hs = durum.hesap || { puan: 2, ihtar: 0 };
  if (hs.askida) {
    bilgiSayfasi('kalkan', 'Hesabın askıya alındı', 'Topluluk kurallarına aykırı bir durum nedeniyle hesabın askıya alındı; bu sürede kitap isteyemez ve ekleyemezsin. Bir yanlışlık olduğunu düşünüyorsan <a href="mailto:eroglu2141@gmail.com">eroglu2141@gmail.com</a> adresine yaz.');
    return false;
  }
  if (hs.ihtar >= 3) {
    bilgiSayfasi('engel', 'Talep hakkın kapatıldı', 'Hesabına <b>3 ihtar</b> yazıldığı için yeni kitap isteyemiyorsun. Bir yanlışlık olduğunu düşünüyorsan <a href="mailto:eroglu2141@gmail.com">eroglu2141@gmail.com</a> adresine yaz.');
    return false;
  }
  if (hs.ihtar === 2 && hs.sonIhtar && Date.now() < hs.sonIhtar + 30 * 86400000) {
    bilgiSayfasi('uyari', '30 gün talep yapamazsın', `Hesabında <b>2 ihtar</b> var (teslim alınmayan kargo ya da bildirilen sorun). Yeniden kitap isteyebileceğin gün: <b>${h(tarihYaz(hs.sonIhtar + 30 * 86400000))}</b>. Bir ihtar daha alırsan talep hakkın tamamen kapanır.`);
    return false;
  }
  if ((hs.puan ?? 2) < 1) {
    bilgiSayfasi('puan', 'Puanın kalmadı', 'Okudum\'da kitaplar <b>ver-al dengesiyle</b> dolaşır: her talep 1 puan harcar, gönderdiğin her kitap yeni okuruna ulaşınca 1 puan kazanırsın. Rafına bir kitap ekle; biri isteyip teslim aldığında yeniden kitap isteyebilirsin.', true);
    return false;
  }
  const liste = haftalikTalepler();
  if (liste.length === 0) return true;
  if (liste.length >= HAFTALIK_SINIR) {
    const acilis = liste[liste.length - HAFTALIK_SINIR].olusturma + HAFTA;
    sinirSayfasi(acilis);
    return false;
  }
  if (odulVar()) return true;
  return reklamSayfasi();
}

function bilgiSayfasi(simge, baslik, metin, ekle = false) {
  sesCal('yumusak');
  const s = sayfaAc(`
    <div class="hak-sayfa">
      <div class="hak-simge">${ikon(simge, 30, 2)}</div>
      <h3 class="sheet-baslik">${h(baslik)}</h3>
      <p class="sheet-metin">${metin}</p>
      ${ekle ? `<button class="dugme ana genis" id="h-ekle">${ikon('arti', 18)}<span>Rafıma kitap ekle</span></button>` : ''}
      <button class="dugme hayalet genis" data-kapat>Tamam</button>
    </div>`);
  $('#h-ekle', s.el)?.addEventListener('click', async () => { await s.kapat(); git('ekle'); });
}

function hakNoktalari(kullanilan) {
  return `<div class="hak-noktalar">${Array.from({ length: HAFTALIK_SINIR }, (_, i) => `<i class="${i < kullanilan ? 'dolu' : ''}">${ikon(i < kullanilan ? 'tik' : 'kitap', 16, 2.4)}</i>`).join('')}</div>`;
}

function sinirSayfasi(acilis) {
  sesCal('yumusak');
  const s = sayfaAc(`
    <div class="hak-sayfa">
      ${hakNoktalari(HAFTALIK_SINIR)}
      <h3 class="sheet-baslik">Bu haftalık talep hakkın doldu</h3>
      <p class="sheet-metin">Kitapların herkese adil dağılması için her okur haftada en fazla <b>${HAFTALIK_SINIR} kitap</b> isteyebilir. Yeni hakkın <b>${h(tarihYaz(acilis))}</b> açılıyor.</p>
      <div class="uyari-kutu yumusak">${ikon('kalp', 20)}<p>Bu arada sen de rafına bir kitap ekleyebilirsin; paylaştıkça topluluk büyür.</p></div>
      <button class="dugme ana genis" id="h-ekle">${ikon('arti', 18)}<span>Rafıma kitap ekle</span></button>
      <button class="dugme hayalet genis" data-kapat>Tamam</button>
    </div>`);
  $('#h-ekle', s.el).addEventListener('click', async () => { await s.kapat(); git('ekle'); });
}

function reklamSayfasi() {
  return new Promise((coz) => {
    let sonuc = false;
    const s = sayfaAc(`
      <div class="hak-sayfa">
        ${hakNoktalari(1)}
        <h3 class="sheet-baslik">Haftanın ikinci talebi</h3>
        <p class="sheet-metin">Bu hafta bir kitap istedin. Haftada <b>${HAFTALIK_SINIR} talep</b> hakkın var; ikinci talebini kısa bir reklam izleyerek açabilirsin. Reklamlar Okudum'un ücretsiz kalmasını sağlıyor. 💛</p>
        <button class="dugme ana genis buyuk" id="r-izle">${ikon('oynat', 20)}<span>Reklamı izle ve devam et</span></button>
        <button class="dugme hayalet genis" data-kapat>Vazgeç</button>
      </div>`);
    s.bitti.then(() => coz(sonuc));
    $('#r-izle', s.el).addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      b.querySelector('span').textContent = 'Reklam yükleniyor…';
      const r = Capacitor.isNativePlatform() ? await odulluReklam() : await demoReklam();
      if (r === 'kapatildi') {
        toast('Talep hakkı için reklamı sonuna kadar izlemelisin.', 'hata');
        b.disabled = false;
        b.querySelector('span').textContent = 'Reklamı izle ve devam et';
        return;
      }
      // 'yok': reklam yüklenemedi (bağlantı, stok) → kullanıcı cezalandırılmaz
      odulVer();
      titret('orta');
      sesCal('gonder');
      sonuc = true;
      s.kapat();
    });
  });
}

// Web/demo: reklam yerine kısa bir sayaç gösterilir
function demoReklam() {
  return new Promise((coz) => {
    const el = document.createElement('div');
    el.className = 'demo-reklam';
    el.innerHTML = `<div><span class="kucuk-etiket acik">Reklam · demo</span><b>3</b><p>Gerçek uygulamada burada ödüllü reklam oynar.</p></div>`;
    document.body.appendChild(el);
    let n = 3;
    const t = setInterval(() => {
      n--;
      el.querySelector('b').textContent = n;
      if (n <= 0) { clearInterval(t); el.remove(); coz('odul'); }
    }, 700);
  });
}
