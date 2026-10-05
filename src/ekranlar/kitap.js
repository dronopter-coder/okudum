// Kitap detayı ve "Bu kitabı iste" akışı
import { durum, benimMi, kitapBul } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, kapak, kapakRengi, $, sayfaAc, toast, hataMetni, yukleniyor, onayla, titret, zamanOnce } from '../ui.js';
import { kondisyon, KITAP_DURUM, AKTIF_TALEP, ILLER } from '../sabitler.js';
import { bosDurum, durumRozeti } from './ortak.js';
import { git, geri } from '../yon.js';
import { gecisReklami } from '../reklam.js';
import { ozetiHazirla } from '../ozetAkisi.js';
import { talepHakkiAl, odulKullan, haftalikTalepler } from '../talepHakki.js';
import { sesCal } from '../ses.js';
import { kitabiPaylas } from '../paylas.js';
import { sikayetSayfasi } from '../sikayet.js';

export function kitapEkrani(kok, { parca }) {
  const id = parca[0];

  const ciz = () => {
    const k = kitapBul(id);
    if (!k) {
      kok.innerHTML = durum.kitaplarHazir
        ? `<div class="ust-bosluk"></div>${bosDurum('kitap', 'Kitap bulunamadı', 'Bu kitap raftan kaldırılmış olabilir.', '<button class="dugme ana" data-git="kesfet">Keşfete dön</button>')}`
        : '<div class="tam-yukleniyor"><span class="donen koyu"></span></div>';
      return;
    }
    const kd = kondisyon(k.kondisyon);
    const benim = benimMi(k);
    const talebim = durum.giden.find((t) => t.kitapId === k.id && AKTIF_TALEP.includes(t.durum));
    const sahipKitapSayisi = durum.kitaplar.filter((x) => x.sahipId === k.sahipId).length;
    const gelenSayisi = durum.gelen.filter((t) => t.kitapId === k.id && t.durum === 'bekliyor').length;

    let alt;
    if (benim) {
      alt = `<div class="alt-eylem">
        <button class="dugme ikincil kare" id="k-sil" aria-label="Rafımdan kaldır">${ikon('cop', 20)}</button>
        <button class="dugme ana genis" data-git="takas">${ikon('gelen', 20)}<span>${gelenSayisi ? `${gelenSayisi} talep seni bekliyor` : 'Taleplerim'}</span></button>
      </div>`;
    } else if (talebim) {
      alt = `<div class="alt-eylem"><button class="dugme ikincil genis" data-git="takas">${durumRozeti(talebim.durum)}<span>Talebini takip et</span>${ikon('sag', 18)}</button></div>`;
    } else if (k.durum !== 'musait') {
      alt = `<div class="alt-eylem"><button class="dugme genis" disabled>${h(KITAP_DURUM[k.durum])}</button></div>`;
    } else {
      alt = `<div class="alt-eylem"><button class="dugme ana genis buyuk" id="k-iste">${ikon('kitap', 20)}<span>Bu kitabı iste</span></button></div>`;
    }

    kok.innerHTML = `
    <section class="detay-kahraman" style="--ton:${h(k.foto ? '#2a2420' : kapakRengi(k))}">
      ${k.foto ? `<div class="detay-arka"><img class="detay-bulanik" src="${h(k.foto)}" alt=""/></div>` : ''}
      <div class="detay-ust">
        <button class="yuvarlak cam" data-geri aria-label="Geri">${ikon('geri', 22)}</button>
        <button class="yuvarlak cam" id="k-paylas" aria-label="Kitabı birine tavsiye et">${ikon('paylas', 20)}</button>
      </div>
      <div class="detay-kapak">${kapak(k, 'buyuk')}</div>
    </section>
    <section class="detay-govde">
      <div class="detay-etiketler">
        <span class="etiket">${h(k.kategori)}</span>
        <span class="etiket" style="--e:${kd.renk}"><i class="nokta" style="background:${kd.renk}"></i>${h(kd.ad)}</span>
        ${k.sehir ? `<span class="etiket">${ikon('konum', 14)}${h(k.sehir)}</span>` : ''}
        ${k.elden > 1 ? `<span class="etiket gezgin">${ikon('rota', 14)}Gezgin kitap · ${k.elden}. okur</span>` : ''}
      </div>
      <h1 class="detay-ad">${h(k.ad)}</h1>
      <p class="detay-yazar">${h(k.yazar)}</p>
      ${k.aciklama ? `<blockquote class="detay-not"><span class="tirnak">“</span>${h(k.aciklama.trim())}<span class="tirnak">”</span></blockquote>` : ''}
      ${ozetBlogu(k, benim)}

      <a class="sahip-kart" ${benim ? '' : `data-git="kisi/${h(k.sahipId)}"`}>
        ${avatar(k.sahipAd, k.sahipFoto, 48)}
        <div><span class="kucuk-etiket">${benim ? 'Senin rafından' : 'Kitabın sahibi'}</span><b>${h(k.sahipAd)}</b><span>${sahipKitapSayisi} kitap paylaştı · ${zamanOnce(k.olusturma)} ekledi</span><span class="sahip-puan" id="k-sahip-puan"></span></div>
        ${benim ? '' : ikon('sag', 20)}
      </a>

      <div class="adimlar-kart">
        <h3>Nasıl alırım?</h3>
        <ol>
          <li><i>${ikon('kitap', 18)}</i><div><b>İste</b><span>Teslimat adresini yazıp talep gönder.</span></div></li>
          <li><i>${ikon('tik', 18)}</i><div><b>Onay</b><span>Kitabın sahibi talebini kabul eder.</span></div></li>
          <li><i>${ikon('kargo', 18)}</i><div><b>Kargo</b><span>Kitap sana <u>karşı ödemeli</u> gönderilir; yalnızca kargo ücretini ödersin.</span></div></li>
        </ol>
      </div>
      ${benim ? '' : `<button class="bildir-bag" id="k-bildir">${ikon('bildir', 14)}<span>Bu ilanı bildir</span></button>`}
    </section>
    ${alt}`;

    $('#k-ozet', kok)?.addEventListener('click', () => { titret(); ozetSayfasi(k); });
    $('#k-ozet-uret', kok)?.addEventListener('click', async () => {
      titret('orta');
      const ozet = await ozetiHazirla(k);
      if (ozet) ozetSayfasi({ ...k, ozet });
    });
    $('#k-iste', kok)?.addEventListener('click', async () => { titret('orta'); if (await talepHakkiAl()) talepSayfasi(k); });
    $('#k-sil', kok)?.addEventListener('click', async () => {
      const aktifVar = durum.gelen.some((t) => t.kitapId === k.id && ['kabul', 'kargoda'].includes(t.durum));
      if (aktifVar) return toast('Bu kitap için süren bir takas var; önce onu tamamla.', 'hata');
      if (!(await onayla('Kitap raftan kaldırılsın mı?', `"${k.ad}" artık başkaları tarafından görülmeyecek.`, { evet: 'Kaldır', tehlike: true }))) return;
      try {
        await api.kitapSil(k);
        toast('Kitap rafından kaldırıldı.', 'basari');
        geri('profil');
      } catch (e) { toast(hataMetni(e), 'hata'); }
    });
    $('#k-paylas', kok).addEventListener('click', () => kitabiPaylas(k));
    $('#k-bildir', kok)?.addEventListener('click', () => sikayetSayfasi('kitap', k.id, k.ad));
    sahipPuaniYaz(k.sahipId, $('#k-sahip-puan', kok));
  };

  ciz();
  return { guncelle: () => { const y = kok.scrollTop; ciz(); kok.scrollTop = y; } };
}

// Gönderenin değerlendirme ortalaması (★ 4,8 · 12 değerlendirme)
const puanOnbellek = new Map();
export async function sahipPuaniYaz(uid, el) {
  if (!el) return;
  try {
    if (!puanOnbellek.has(uid)) puanOnbellek.set(uid, await api.sahipPuani(uid));
    const p = puanOnbellek.get(uid);
    if (p.adet && el.isConnected) el.innerHTML = `${ikon('yildiz', 13)} <b>${p.ort.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</b> · ${p.adet} değerlendirme`;
  } catch {}
}

async function talepSayfasi(k) {
  const kayitli = (await api.adresimiGetir(durum.kullanici.uid).catch(() => null)) || {};
  const p = durum.profil;
  const a = { adSoyad: p.ad, il: p.sehir, ...kayitli };
  const s = sayfaAc(`
    <div class="talep-ozet">${kapak(k, 'mini')}<div class="talep-ozet-metin"><span class="kucuk-etiket">Talep ediyorsun</span><b>${h(k.ad)}</b><span>${h(k.sahipAd)} · ${h(k.sehir || '')}</span></div></div>
    <form class="form" id="t-form" novalidate>
      <label class="alan"><span>Kitabın sahibine bir not bırak <em>(isteğe bağlı)</em></span>
        <textarea name="not" rows="2" maxlength="300" placeholder="Bu kitabı neden okumak istediğini anlatabilirsin…"></textarea></label>
      <div class="form-ara-baslik">${ikon('paket', 18)} Teslimat adresi</div>
      <label class="alan"><span>Ad Soyad</span><input name="adSoyad" autocomplete="name" value="${h(a.adSoyad || '')}" required/></label>
      <label class="alan"><span>Cep telefonu</span><input name="telefon" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" value="${h(a.telefon || '')}" required/></label>
      <div class="alan-ikili">
        <label class="alan"><span>İl</span><select name="il" required><option value="">Seç</option>${ILLER.map((i) => `<option ${i === a.il ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
        <label class="alan"><span>İlçe</span><input name="ilce" value="${h(a.ilce || '')}" required/></label>
      </div>
      <label class="alan"><span>Açık adres</span><textarea name="acikAdres" rows="2" placeholder="Mahalle, cadde/sokak, bina ve daire no" required>${h(a.acikAdres || '')}</textarea></label>
      <label class="onay-kutu"><input type="checkbox" name="kaydet" checked/><span>Bu adresi sonraki talepler için hatırla</span></label>
      <div class="uyari-kutu">${ikon('kalkan', 20)}<p>Adresin yalnızca kitabın sahibi talebini <b>kabul ettiğinde</b> ona gösterilir. Kitap <b>karşı ödemeli</b> gönderilir: teslim alırken kargo ücretini ödersin, kitap ücretsizdir.</p></div>
      <div class="uyari-kutu dikkat">${ikon('uyari', 20)}<p>Kargocuya <b>yalnızca kargo ücretini</b> ödersin. Kapıda ek bir tahsilat (ürün bedeli) istenirse paketi <b>teslim alma</b> ve uygulamadan bildir.</p></div>
      <div class="puan-bilgi">${ikon('puan', 18)}<span>Bu talep <b>1 puan</b> harcar · Kalan puanın: <b>${Math.max(0, (durum.hesap.puan ?? 2) - 1)}</b></span></div>
      <button class="dugme ana genis buyuk" type="submit">${ikon('gonder', 20)}<span>Talebi gönder</span></button>
    </form>`, { sinif: 'uzun' });

  const f = $('#t-form', s.el);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adres = {
      adSoyad: f.adSoyad.value.trim(), telefon: f.telefon.value.trim(), il: f.il.value,
      ilce: f.ilce.value.trim(), acikAdres: f.acikAdres.value.trim(),
    };
    if (Object.values(adres).some((v) => !v)) return toast('Teslimat için tüm adres alanlarını doldur.', 'hata');
    if (!api.telKimligi(adres.telefon)) return toast('Cep telefonu numaranı 05xx xxx xx xx biçiminde yaz.', 'hata');
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      if (f.kaydet.checked) await api.adresimiKaydet(durum.kullanici.uid, adres).catch(() => {});
      const ikinci = haftalikTalepler().length >= 1;
      await api.talepOlustur(durum.kullanici, durum.profil, k, f.not.value.trim(), adres);
      if (ikinci) odulKullan(); // haftanın ikinci talebi: izlenen reklamın hakkı kullanıldı
      titret('guclu');
      sesCal('gonder');
      await s.kapat();
      basariSayfasi(k);
      gecisReklami();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}

function basariSayfasi(k) {
  const s = sayfaAc(`
    <div class="basari">
      <div class="basari-isaret">${ikon('tik', 44, 3)}</div>
      <h3 class="sheet-baslik">Talebin gönderildi!</h3>
      <p class="sheet-metin">${h(k.sahipAd)} talebini onayladığında sana haber vereceğiz. Kitap yola çıkınca kargo takip numarasını <b>Takas</b> sekmesinde göreceksin.</p>
      <button class="dugme ana genis" id="b-takas">Talebimi görüntüle</button>
      <button class="dugme hayalet genis" data-kapat>Keşfetmeye devam et</button>
    </div>`);
  $('#b-takas', s.el).addEventListener('click', async () => { await s.kapat(); git('takas?sekme=giden'); });
}

// Özet alanı: hazırsa "Özeti gör", hazırlanıyorsa durum, sahibi için ve özet yoksa "oluştur"
function ozetBlogu(k, benim) {
  if (k.ozet) {
    return `<button class="ozet-dugme" id="k-ozet">${ikon('parilti', 20)}<span><b>Kitabın özetini gör</b><em>Yapay zekâ ile hazırlanmış kısa özet</em></span>${ikon('sag', 18)}</button>`;
  }
  if (durum.ozetHazirlaniyor.has(k.id)) {
    return `<div class="ozet-dugme hazirlaniyor"><span class="donen koyu"></span><span><b>Özet hazırlanıyor…</b><em>Birkaç saniye sürer</em></span></div>`;
  }
  if (benim) {
    return `<button class="ozet-dugme" id="k-ozet-uret">${ikon('parilti', 20)}<span><b>Yapay zekâ özeti oluştur</b><em>Okurlar kitabı tanımak için okuyabilir</em></span>${ikon('sag', 18)}</button>`;
  }
  return '';
}

function ozetSayfasi(k) {
  const satirlar = k.ozet.split('\n').filter(Boolean);
  sayfaAc(`
    <div class="ozet-bas">
      <div class="ozet-kapak">${kapak(k, 'mini')}</div>
      <div><span class="kucuk-etiket">${ikon('parilti', 13)} Kısa özet</span><h3 class="sheet-baslik">${h(k.ad)}</h3><span class="ozet-yazar">${h(k.yazar)}</span></div>
    </div>
    <div class="ozet-metin">${satirlar.map((s) => `<p>${h(s)}</p>`).join('')}</div>
    <p class="ozet-uyari">${ikon('bilgi', 14)} Bu özet yapay zekâ tarafından hazırlandı ve hata içerebilir. Spoiler vermemeye çalışır.</p>
    <button class="dugme ana genis" data-kapat>Tamam</button>`, { sinif: 'uzun' });
}
