// Rafa kitap ekleme: fotoğraf, ad, yazar, tür, durum, not
import { durum } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, $, $$, kapak, toast, hataMetni, yukleniyor, fotoKucult, titret, onayla } from '../ui.js';
import { KATEGORILER, KONDISYONLAR } from '../sabitler.js';
import { ustBar, bosDurum } from './ortak.js';
import { git } from '../yon.js';
import { gecisReklami } from '../reklam.js';
import { ozetiHazirla } from '../ozetAkisi.js';
import { fotoAl as fotoGetir } from '../foto.js';

export function ekleEkrani(kok) {
  if (durum.hesap?.askida) {
    kok.innerHTML = `${ustBar('Rafına kitap ekle')}${bosDurum('kalkan', 'Hesabın askıya alındı', 'Bu sürede kitap ekleyemezsin. Bir yanlışlık olduğunu düşünüyorsan eroglu2141@gmail.com adresine yaz.')}`;
    return {};
  }
  // "Okudum, rafa koy": teslim alınan kitap ad, yazar ve fotoğrafıyla hazır gelir
  const taslak = durum.eklemeTaslagi;
  durum.eklemeTaslagi = null;
  let foto = taslak?.foto || '';

  kok.innerHTML = `
    ${ustBar('Rafına kitap ekle')}
    <form class="form ekle-form" id="e-form" novalidate>
      <div class="foto-alan" id="e-foto">
        <div class="foto-onizleme" id="e-onizleme">
          <div class="foto-bos">
            <div class="foto-bos-ikon">${ikon('kamera', 30, 1.8)}</div>
            <b>Kitabın fotoğrafını ekle</b>
            <span>Kapağı net görünsün; okurlar kitabı görmeyi sever.</span>
          </div>
        </div>
        <div class="foto-dugmeler">
          <button type="button" class="dugme ikincil" id="e-cek">${ikon('kamera', 18)}<span>Fotoğraf çek</span></button>
          <button type="button" class="dugme ikincil" id="e-galeri">${ikon('resim', 18)}<span>Galeriden seç</span></button>
        </div>
        <input type="file" accept="image/*" id="e-dosya" hidden/>
      </div>

      <div class="yz-durum" id="e-yz" hidden></div>
      <label class="alan"><span>Kitabın adı</span><input name="ad" maxlength="120" placeholder="Ör. Kürk Mantolu Madonna" required/></label>
      <label class="alan"><span>Yazar</span><input name="yazar" maxlength="80" placeholder="Ör. Sabahattin Ali" required/></label>

      <div class="alan"><span>Tür</span>
        <div class="cip-bulutu" id="e-kat">${KATEGORILER.map((k) => `<button type="button" class="cip" data-v="${h(k)}">${h(k)}</button>`).join('')}</div>
      </div>

      <div class="alan"><span>Kitabın durumu</span>
        <div class="segment" id="e-kon">${KONDISYONLAR.map((k) => `<button type="button" data-v="${k.id}" style="--s:${k.renk}" class="${k.id === 'iyi' ? 'secili' : ''}">${h(k.ad)}</button>`).join('')}</div>
      </div>

      <label class="alan"><span>Okura notun <em>(isteğe bağlı)</em></span>
        <textarea name="aciklama" rows="3" maxlength="500" placeholder="Kitabın durumu, baskısı ya da sende bıraktığı iz…"></textarea></label>

      <div class="uyari-kutu yumusak">${ikon('kargo', 20)}<p>Kitabın istendiğinde talebi sen onaylarsın, sonra kitabı <b>karşı ödemeli</b> kargoya verirsin. Sana hiçbir masraf çıkmaz.</p></div>
      <button class="dugme ana genis buyuk" type="submit">${ikon('raf', 20)}<span>Rafa koy</span></button>
    </form>`;

  const f = $('#e-form', kok);
  const onceki = taslak ? durum.tumKitaplar.find((k) => k.id === taslak.kitapId) : null;
  const secim = { kategori: onceki?.kategori || '', kondisyon: 'iyi' };
  if (taslak) {
    f.ad.value = taslak.ad;
    f.yazar.value = taslak.yazar;
    if (secim.kategori) $$('#e-kat .cip', kok).forEach((x) => x.classList.toggle('secili', x.dataset.v === secim.kategori));
    f.insertAdjacentHTML('afterbegin', `<div class="ipucu yesil">${ikon('rota', 18)}<span>Bu kitabın yolculuğu sürüyor! Bilgileri hazırladık; durumunu seçip rafına koy.</span></div>`);
  }

  const bosHal = $('#e-onizleme', kok).innerHTML;
  queueMicrotask(() => { if (foto) onizle(); });
  const onizle = () => {
    const ad = f.ad.value.trim() || 'Kitabın adı';
    const yazar = f.yazar.value.trim() || 'Yazar';
    $('#e-foto', kok).classList.toggle('dolu', !!foto);
    $('#e-onizleme', kok).innerHTML = foto
      ? `${kapak({ ad, yazar, foto }, 'onizleme')}<button type="button" class="foto-kaldir" aria-label="Fotoğrafı kaldır">${ikon('x', 18, 2.6)}</button>`
      : bosHal;
    $('.foto-kaldir', kok)?.addEventListener('click', () => { foto = ''; okumaNo++; durumYaz(''); f.ad.classList.remove('yz-bekliyor'); f.yazar.classList.remove('yz-bekliyor'); onizle(); });
  };

  // Yapay zekâ fotoğraftan kitabın adını ve yazarını okur; yalnızca boş alanlar doldurulur.
  let okumaNo = 0;
  const durumYaz = (html, sinif = '') => {
    const d = $('#e-yz', kok);
    d.className = `yz-durum ${sinif}`;
    d.innerHTML = html;
    d.hidden = !html;
  };
  const kapaktanDoldur = async (veri) => {
    if (f.ad.value.trim() && f.yazar.value.trim()) return;
    const no = ++okumaNo;
    durumYaz(`<i class="yz-nokta"></i><span>Yapay zekâ kapağı okuyor…</span>`, 'okuyor');
    f.ad.classList.add('yz-bekliyor');
    f.yazar.classList.add('yz-bekliyor');
    let sonuc = null;
    try { sonuc = await api.kapakOku(veri); } catch { sonuc = null; }
    if (no !== okumaNo || !kok.isConnected) return;
    f.ad.classList.remove('yz-bekliyor');
    f.yazar.classList.remove('yz-bekliyor');
    const doldurulan = [];
    if (sonuc?.ad && !f.ad.value.trim()) { f.ad.value = sonuc.ad; doldurulan.push(f.ad); }
    if (sonuc?.yazar && !f.yazar.value.trim()) { f.yazar.value = sonuc.yazar; doldurulan.push(f.yazar); }
    if (doldurulan.length) {
      doldurulan.forEach((g) => { g.classList.remove('yz-doldu'); void g.offsetWidth; g.classList.add('yz-doldu'); });
      durumYaz(`${ikon('parilti', 15)}<span>Kapaktan okundu, doğruluğunu kontrol et.</span>`, 'tamam');
      onizle();
      titret();
    } else {
      durumYaz(`${ikon('bilgi', 15)}<span>Kapak okunamadı, adı ve yazarı sen yaz.</span>`, 'olmadi');
    }
  };

  const fotoAl = async (kaynak) => {
    try {
      const yol = await fotoGetir(kaynak, $('#e-dosya', kok));
      if (!yol) return;
      foto = await fotoKucult(yol, 560, 0.75); // veritabanına sığacak boyut
      onizle();
      titret();
      kapaktanDoldur(foto);
    } catch (e) {
      toast('Fotoğraf alınamadı: ' + (e?.message || ''), 'hata');
    }
  };

  $('#e-cek', kok).addEventListener('click', () => fotoAl('kamera'));
  $('#e-galeri', kok).addEventListener('click', () => fotoAl('galeri'));
  $('#e-onizleme', kok).addEventListener('click', (e) => { if (!foto && !e.target.closest('button')) fotoAl('galeri'); });
  f.ad.addEventListener('input', () => { if (foto) onizle(); });
  f.yazar.addEventListener('input', () => { if (foto) onizle(); });

  $('#e-kat', kok).addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    secim.kategori = c.dataset.v;
    $$('#e-kat .cip', kok).forEach((x) => x.classList.toggle('secili', x === c));
    titret();
  });
  $('#e-kon', kok).addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    secim.kondisyon = c.dataset.v;
    $$('#e-kon button', kok).forEach((x) => x.classList.toggle('secili', x === c));
    titret();
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ad = f.ad.value.trim();
    const yazar = f.yazar.value.trim();
    if (!ad) return toast('Kitabın adını yazmalısın.', 'hata');
    if (!yazar) return toast('Yazarın adını yazmalısın.', 'hata');
    if (!secim.kategori) return toast('Bir tür seç.', 'hata');
    if (!foto && !(await onayla('Fotoğrafsız eklensin mi?', 'Fotoğraflı kitaplar çok daha hızlı yeni okurunu buluyor. Fotoğrafsız eklersen kitaba özel bir kapak tasarlarız.', { evet: 'Fotoğrafsız ekle', hayir: 'Fotoğraf ekleyeceğim' }))) return;
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      const id = await api.kitapEkle(durum.kullanici, durum.profil, {
        ad, yazar, kategori: secim.kategori, kondisyon: secim.kondisyon, aciklama: f.aciklama.value.trim(),
        ...(taslak ? { oncekiTalep: taslak.oncekiTalep, elden: (onceki?.elden || 1) + 1 } : {}),
      }, foto);
      titret('guclu');
      toast('Kitabın rafta! Özeti hazırlanıyor…', 'basari');
      // Yapay zekâ özeti arka planda hazırlanır; kitap detayında "Özeti gör" olarak belirir.
      ozetiHazirla({ id, ad, yazar }, { sessiz: true });
      git(`kitap/${id}`, { degistir: true });
      gecisReklami();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });

}
