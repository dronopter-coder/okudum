// Bildir (şikâyet) ve engelle
import { durum, kitaplariSuz, degisti } from './durum.js';
import { api } from './veri/index.js';
import { h, ikon, $, $$, sayfaAc, toast, hataMetni, yukleniyor, onayla, titret } from './ui.js';

const SEBEPLER = {
  kitap: [['alakasiz', 'Kitap değil ya da fotoğraf alakasız'], ['satis', 'Satış ya da ücret istiyor'], ['uygunsuz', 'Uygunsuz içerik'], ['diger', 'Başka bir sebep']],
  kisi: [['gondermedi', 'Kitabı göndermedi'], ['tahsilat', 'Ek ücret / tahsilat istedi'], ['davranis', 'Kaba ya da rahatsız edici'], ['sahte', 'Sahte hesap'], ['diger', 'Başka bir sebep']],
};

export function sikayetSayfasi(hedefTur, hedefId, ad) {
  let sebep = '';
  const s = sayfaAc(`
    <h3 class="sheet-baslik">${hedefTur === 'kitap' ? 'İlanı bildir' : 'Kullanıcıyı bildir'}</h3>
    <p class="sheet-metin"><b>${h(ad)}</b> ile ilgili sorun ne? Bildirimin gizli tutulur ve incelenir.</p>
    <div class="secenek-liste" id="sk-sebep">${SEBEPLER[hedefTur].map(([k, a]) => `<button type="button" data-v="${k}">${h(a)}<i>${ikon('tik', 16, 2.6)}</i></button>`).join('')}</div>
    <label class="alan"><span>Açıklama <em>(isteğe bağlı)</em></span><textarea id="sk-not" rows="2" maxlength="300" placeholder="Kısaca anlat…"></textarea></label>
    <button class="dugme ana genis" id="sk-gonder" disabled>${ikon('bildir', 18)}<span>Bildir</span></button>`);
  $('#sk-sebep', s.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    sebep = b.dataset.v;
    $$('#sk-sebep button', s.el).forEach((x) => x.classList.toggle('secili', x === b));
    $('#sk-gonder', s.el).disabled = false;
    titret();
  });
  $('#sk-gonder', s.el).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    yukleniyor(b, true);
    try {
      await api.sikayetEt(durum.kullanici.uid, hedefTur, hedefId, sebep, $('#sk-not', s.el).value.trim());
      await s.kapat();
      toast('Bildirimin alındı. Teşekkürler!', 'basari');
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}

export const engelliMi = (uid) => durum.engel.has(uid);

export async function engelDegistir(uid, ad) {
  const ekle = !engelliMi(uid);
  if (ekle && !(await onayla(`${ad} engellensin mi?`, 'Kitaplarını artık görmezsin ve senin kitaplarını isteyemez. Engeli istediğin zaman kaldırabilirsin.', { evet: 'Engelle', tehlike: true }))) return false;
  try {
    await api.engelle(durum.kullanici.uid, uid, ekle);
    if (ekle) durum.engel.add(uid); else durum.engel.delete(uid);
    kitaplariSuz();
    degisti('kitaplar');
    toast(ekle ? `${ad} engellendi.` : 'Engel kaldırıldı.', 'basari');
    return true;
  } catch (e) {
    toast(hataMetni(e), 'hata');
    return false;
  }
}
