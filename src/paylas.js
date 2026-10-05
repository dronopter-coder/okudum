// Paylaşım (uygulama ve kitap tavsiyesi) ve Play Store değerlendirme daveti
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { ikon, $, sayfaAc, toast, titret } from './ui.js';

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.okudum.app';

async function paylas({ baslik, metin, url }) {
  titret();
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title: baslik, text: metin, url, dialogTitle: baslik });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: baslik, text: metin, url });
      return;
    }
  } catch (e) {
    if (/cancel|abort/i.test(String(e?.message || e?.name || ''))) return;
  }
  try {
    await navigator.clipboard.writeText(`${metin}\n${url}`);
    toast('Paylaşım metni kopyalandı.', 'basari');
  } catch {
    toast(url);
  }
}

export const uygulamayiPaylas = () => paylas({
  baslik: 'Okudum — Sen de oku.',
  metin: 'Okuduğun kitapları paylaş, merak ettiklerini ücretsiz iste. Okudum\'da kitaplar okurdan okura yolculuk ediyor. Sen de katıl! 📚',
  url: PLAY_URL,
});

export const kitabiPaylas = (k) => paylas({
  baslik: `${k.ad} — ${k.yazar}`,
  metin: `“${k.ad}” (${k.yazar}) kitabını okumanı tavsiye ederim! 📖\n\nOkudum'da ikinci el kitaplar okurlar arasında ücretsiz paylaşılıyor; bu kitap da orada yeni okurunu bekliyor:`,
  url: PLAY_URL,
});

// ——— Play Store değerlendirme daveti ———
// İlk tamamlanan takastan sonra bir kez sorulur. "Sonra" denirse 2 takas sonra yeniden sorulur; değerlendirince bir daha sorulmaz.
const ANAHTAR = 'okudum_yorum_daveti';
const oku = () => { try { return JSON.parse(localStorage.getItem(ANAHTAR)) || { bitti: false, sonraki: 1, sayac: 0 }; } catch { return { bitti: false, sonraki: 1, sayac: 0 }; } };
const yaz = (v) => { try { localStorage.setItem(ANAHTAR, JSON.stringify(v)); } catch {} };

export function takasTamamlandi() {
  const v = oku();
  if (v.bitti) return;
  v.sayac += 1;
  yaz(v);
  if (v.sayac < v.sonraki) return;
  setTimeout(yorumDaveti, 900);
}

export function yorumDaveti() {
  const s = sayfaAc(`
    <div class="yorum-davet">
      <div class="yorum-yildizlar" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i style="--i:${i}">${ikon('yildiz', 30, 1.6)}</i>`).join('')}</div>
      <h3 class="sheet-baslik">Bir kitap daha yerini buldu! 🎉</h3>
      <p class="sheet-metin">Okudum tamamen <b>ücretsiz</b> ve okurların iyiliğiyle büyüyor. Play Store'da birkaç güzel söz ve yıldız bırakırsan, daha çok okur bizi bulur, daha çok kitap yeni okuruna kavuşur. 💛</p>
      <button class="dugme ana genis buyuk" id="yd-evet">${ikon('yildiz', 20)}<span>Değerlendir</span></button>
      <button class="dugme hayalet genis" id="yd-sonra">Daha sonra</button>
    </div>`);
  $('#yd-evet', s.el).addEventListener('click', async () => {
    yaz({ ...oku(), bitti: true });
    await s.kapat();
    window.open(PLAY_URL, '_blank'); // telefonda Play Store uygulamasında açılır
  });
  $('#yd-sonra', s.el).addEventListener('click', () => {
    const v = oku();
    yaz({ ...v, sonraki: v.sayac + 2 });
    s.kapat();
  });
}

