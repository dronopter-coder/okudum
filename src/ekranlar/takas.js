// Takas merkezi: gelen talepler (kitabımı isteyenler) ve giden talepler (benim isteklerim)
import { durum, degisti } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, kapak, $, sayfaAc, toast, hataMetni, yukleniyor, onayla, titret, zamanOnce } from '../ui.js';
import { TALEP_DURUM, KARGO_FIRMALARI } from '../sabitler.js';
import { bosDurum, durumRozeti } from './ortak.js';
import { gecisReklami } from '../reklam.js';
import { sesCal } from '../ses.js';
import { git } from '../yon.js';
import { takasTamamlandi } from '../paylas.js';

const ADIMLAR = ['Talep', 'Onay', 'Kargo', 'Teslim'];

function ilerleme(d) {
  const adim = TALEP_DURUM[d].adim;
  if (!adim) return '';
  return `<div class="ilerleme" style="--oran:${(adim - 1) / 3}">
    <div class="ilerleme-hat"><i></i></div>
    ${ADIMLAR.map((a, i) => `<div class="ilerleme-adim ${i < adim ? 'tamam' : ''} ${i === adim - 1 ? 'simdi' : ''}"><span></span><em>${a}</em></div>`).join('')}
  </div>`;
}

const GUN = 86400000;
const gecen = (ms) => (ms ? (Date.now() - ms) / GUN : 0);
const SORUN_AD = { ulasmadi: 'Kitap elime ulaşmadı', tahsilat: 'Kargocu ek ücret (tahsilat) istedi', bos: 'Paket boş ya da başka bir şey çıktı' };
const degerlendirilen = new Set((() => { try { return JSON.parse(localStorage.getItem('okudum_degerlendirilen') || '[]'); } catch { return []; } })());
const degerlendirildi = (id) => {
  degerlendirilen.add(id);
  try { localStorage.setItem('okudum_degerlendirilen', JSON.stringify([...degerlendirilen].slice(-300))); } catch {}
};

function kart(t, yon) {
  const gelen = yon === 'gelen';
  const kisiAd = gelen ? t.isteyenAd : t.sahipAd;
  const kisiFoto = gelen ? t.isteyenFoto : t.sahipFoto;
  let eylem = '';
  let bilgi = '';

  if (gelen) {
    if (t.durum === 'bekliyor') {
      bilgi = `<div class="guven-kart" data-guven="${h(t.isteyenId)}"><span class="donen koyu"></span></div>`;
      eylem = `<button class="dugme ikincil" data-e="reddet">Reddet</button><button class="dugme ana" data-e="kabul">${ikon('tik', 18)}<span>Kabul et</span></button>`;
    } else if (t.durum === 'kabul') {
      const g = gecen(t.kabulTarihi);
      bilgi = g >= 3
        ? `<div class="ipucu dikkat">${ikon('saat', 18)}<span><b>${Math.floor(g)} gündür</b> kargoya verilmeyi bekliyor. Kabulden 7 gün sonra okur talebini geri çekebilir.</span></div>`
        : `<div class="ipucu">${ikon('paket', 18)}<span>Kitabı paketle ve <b>5 gün içinde</b> karşı ödemeli (ücreti alıcıdan) kargoya ver. Ardından takip numarasını gir.</span></div>`;
      eylem = `<button class="dugme ikincil" data-e="vazgec">Vazgeç</button><button class="dugme ana" data-e="kargola">${ikon('kargo', 18)}<span>Kargoya verdim</span></button>`;
    } else if (t.durum === 'kargoda') {
      bilgi = kargoBilgi(t);
      if (t.sorun) {
        bilgi += `<div class="ipucu dikkat">${ikon('uyari', 18)}<span>Okur bir sorun bildirdi: <b>${h(SORUN_AD[t.sorun.tur] || '')}</b>. Kargo firmasıyla iletişime geç; kitap ulaşırsa okur teslimi onaylar.</span></div>`;
      } else {
        bilgi += `<div class="ipucu">${ikon('saat', 18)}<span>Okur teslim aldığını onaylayınca <b>1 puan</b> kazanırsın. 14 gün içinde itiraz gelmezse teslim edilmiş sayılır.</span></div>`;
        if (gecen(t.kargoTarihi) >= 2) eylem = `<button class="dugme hayalet genis" data-e="iade">${ikon('iade', 18)}<span>Kargo teslim alınmadan geri döndü</span></button>`;
      }
    } else if (t.durum === 'teslim') {
      bilgi = `<div class="ipucu yesil">${ikon('el', 18)}<span>Kitabın yeni okuruna ulaştı, <b>1 puan</b> kazandın. Paylaştığın için teşekkürler!</span></div>`;
    } else if (t.durum === 'iade') {
      bilgi = `<div class="ipucu dikkat">${ikon('iade', 18)}<span>Kargo teslim alınmadan geri döndü. Okura ihtar yazıldı; kitabın yeniden rafında.</span></div>`;
    }
  } else {
    if (t.durum === 'bekliyor') {
      bilgi = `<div class="ipucu">${ikon('saat', 18)}<span>${h(t.sahipAd.split(' ')[0])} talebini henüz görmedi ya da değerlendiriyor.</span></div>`;
      eylem = `<button class="dugme hayalet" data-e="iptal">Talebi geri çek</button>`;
    } else if (t.durum === 'kabul') {
      const g = gecen(t.kabulTarihi);
      if (t.kabulTarihi && g >= 7) {
        bilgi = `<div class="ipucu dikkat">${ikon('saat', 18)}<span>Kitap <b>${Math.floor(g)} gündür</b> kargoya verilmedi. İstersen talebinden vazgeçebilirsin; puanın iade edilir.</span></div>`;
        eylem = `<button class="dugme ikincil genis" data-e="iptal">${ikon('iade', 18)}<span>Talebimden vazgeç</span></button>`;
      } else {
        bilgi = `<div class="ipucu">${ikon('tik', 18)}<span>Harika! Kitabın paketleniyor. Kargoya verilince takip numarası burada görünecek.</span></div>`;
      }
    } else if (t.durum === 'kargoda') {
      bilgi = kargoBilgi(t);
      bilgi += t.sorun
        ? `<div class="ipucu dikkat">${ikon('uyari', 18)}<span>Sorun bildirdin: <b>${h(SORUN_AD[t.sorun.tur] || '')}</b>.${t.sorun.tur === 'ulasmadi' ? ' Kitap sonradan gelirse yine de “Teslim aldım”a bas.' : ''}</span></div>`
        : `<div class="ipucu dikkat">${ikon('uyari', 18)}<span>Kargocuya <b>yalnızca kargo ücretini</b> öde. Ek tahsilat (ürün bedeli) istenirse paketi teslim alma ve sorun bildir.</span></div>`;
      eylem = `${t.sorun ? '' : `<button class="dugme hayalet" data-e="sorun">${ikon('bildir', 16)}<span>Sorun bildir</span></button>`}<button class="dugme ana ${t.sorun ? 'genis' : ''}" data-e="teslim">${ikon('teslim', 18)}<span>Teslim aldım</span></button>`;
    } else if (t.durum === 'teslim') {
      const rafta = durum.kitaplar.some((k) => k.oncekiTalep === t.id);
      bilgi = `<div class="ipucu yesil">${ikon('kitap', 18)}<span>İyi okumalar! Bitirince rafına koy; kitabın yolculuğu sürsün, sen de puan kazan.</span></div>`;
      eylem = `${degerlendirilen.has(t.id) ? '' : `<button class="dugme ikincil" data-e="degerlendir">${ikon('yildiz', 16)}<span>Değerlendir</span></button>`}${rafta ? '' : `<button class="dugme ana" data-e="rafa">${ikon('raf', 16)}<span>Rafa koy</span></button>`}`;
    } else if (t.durum === 'iade') {
      bilgi = `<div class="ipucu dikkat">${ikon('iade', 18)}<span>Kargo teslim alınmadığı için geri döndü ve hesabına <b>1 ihtar</b> yazıldı. 2 ihtarda 30 gün kitap isteyemezsin.</span></div>`;
    }
  }

  return `<article class="talep-kart durum-${t.durum}" data-id="${h(t.id)}">
    <div class="talep-ust">
      <a class="talep-kapak" data-git="kitap/${h(t.kitapId)}">${kapak({ ad: t.kitapAd, yazar: t.kitapYazar, foto: t.kitapFoto }, 'mini')}</a>
      <div class="talep-bilgi">
        ${durumRozeti(t.durum)}
        <b>${h(t.kitapAd)}</b>
        <div class="talep-kisi" data-git="kisi/${h(gelen ? t.isteyenId : t.sahipId)}">${avatar(kisiAd, kisiFoto, 22)}<span>${gelen ? `<b>${h(kisiAd)}</b> istiyor` : `<b>${h(kisiAd)}</b> rafından`}${gelen && t.isteyenSehir ? ` · ${h(t.isteyenSehir)}` : ''}</span></div>
        <span class="talep-zaman">${zamanOnce(t.guncelleme)}</span>
      </div>
    </div>
    ${t.not && gelen ? `<p class="talep-not">“${h(t.not)}”</p>` : ''}
    ${ilerleme(t.durum)}
    ${bilgi}
    ${eylem ? `<div class="talep-eylem">${eylem}</div>` : ''}
  </article>`;
}

// ——— Güven kartı: kabul etmeden önce isteyenin geçmişi ———
const guvenOnbellek = new Map();
const uyelik = (ms) => {
  if (!ms) return '';
  const g = Math.max(0, Math.floor((Date.now() - ms) / GUN));
  if (g < 1) return 'Bugün üye oldu';
  if (g < 30) return `${g} gündür üye`;
  if (g < 365) return `${Math.floor(g / 30)} aydır üye`;
  return `${Math.floor(g / 365)} yıldır üye`;
};
function guvenHtml(b) {
  let rozet = ['okur', ikon('kitap', 14), 'Okur'];
  if (b.ihtar > 0) rozet = ['kirmizi', ikon('uyari', 14), `${b.ihtar} ihtarı var`];
  else if (b.aldi >= 3 && b.paylasti === 0) rozet = ['turuncu', ikon('uyari', 14), 'Hep alıyor, hiç paylaşmamış'];
  else if (b.paylasti >= 1) rozet = ['yesil', ikon('el', 14), 'Paylaşan okur'];
  else if (b.kayit && Date.now() - b.kayit < 14 * GUN) rozet = ['mavi', ikon('parilti', 14), 'Yeni üye'];
  return `<div class="guven-ust"><span class="guven-rozet ${rozet[0]}">${rozet[1]}${rozet[2]}</span><small>${uyelik(b.kayit)}</small></div>
    <div class="guven-sayilar">
      <span><b>${b.paylasti}</b>paylaştı</span><span><b>${b.aldi}</b>aldı</span><span><b>${b.puan}</b>puan</span>
      <span class="${b.ihtar ? 'kirmizi' : ''}"><b>${b.ihtar}</b>ihtar</span>
    </div>`;
}
function guvenKartlariniDoldur(kok) {
  kok.querySelectorAll('[data-guven]').forEach(async (el) => {
    const uid = el.dataset.guven;
    if (!guvenOnbellek.has(uid)) guvenOnbellek.set(uid, api.guvenBilgisi(uid).catch(() => null));
    const b = await guvenOnbellek.get(uid);
    if (!el.isConnected) return;
    if (!b) { el.remove(); return; }
    el.innerHTML = guvenHtml(b);
  });
}

function kargoBilgi(t) {
  if (!t.kargo) return '';
  return `<div class="kargo-kutu">
    <div>${ikon('kargo', 22)}</div>
    <div><span>${h(t.kargo.firma)}</span><b>${h(t.kargo.takipNo)}</b></div>
    <button class="yuvarlak kucuk" data-e="kopyala" aria-label="Takip numarasını kopyala">${ikon('kopya', 16)}</button>
  </div>`;
}

export function takasEkrani(kok, { sorgu }) {
  let sekme = sorgu.sekme === 'giden' ? 'giden' : (durum.gelen.some((t) => t.durum === 'bekliyor') || !durum.giden.length ? 'gelen' : 'giden');
  let arsiv = false;

  const ciz = () => {
    const liste = sekme === 'gelen' ? durum.gelen : durum.giden;
    const yeniBiten = (t) => t.durum === 'teslim' && Date.now() - t.guncelleme < 3 * GUN;
    const aktif = liste.filter((t) => (TALEP_DURUM[t.durum].adim && t.durum !== 'teslim') || yeniBiten(t));
    const biten = liste.filter((t) => !aktif.includes(t));
    const bekleyenGelen = durum.gelen.filter((t) => t.durum === 'bekliyor').length;
    const kargodaGiden = durum.giden.filter((t) => t.durum === 'kargoda').length;

    kok.innerHTML = `
      <header class="sayfa-bas"><h1>Takas</h1><p>Kitapların yolculuğunu buradan yönet.</p></header>
      <div class="sekme-anahtar" style="--i:${sekme === 'gelen' ? 0 : 1}">
        <i class="sekme-anahtar-kaydirici"></i>
        <button data-s="gelen" class="${sekme === 'gelen' ? 'secili' : ''}">${ikon('gelen', 18)}<span>Gelen</span>${bekleyenGelen ? `<em>${bekleyenGelen}</em>` : ''}</button>
        <button data-s="giden" class="${sekme === 'giden' ? 'secili' : ''}">${ikon('gonder', 18)}<span>İsteklerim</span>${kargodaGiden ? `<em>${kargodaGiden}</em>` : ''}</button>
      </div>
      <div class="talep-liste">
        ${aktif.length ? aktif.map((t) => kart(t, sekme)).join('') : sekme === 'gelen'
    ? bosDurum('gelen', 'Henüz talep yok', 'Rafına kitap ekledikçe okurlar seni bulacak. Ne kadar çok kitap, o kadar çok okur!', '<button class="dugme ana" data-git="ekle">Kitap ekle</button>')
    : bosDurum('kitap', 'Henüz bir kitap istemedin', 'Rafları gez, gözüne kestirdiğin kitabı iste. Kitap ücretsiz, kargo karşı ödemeli.', '<button class="dugme ana" data-git="kesfet">Keşfet</button>')}
      </div>
      ${biten.length ? `<button class="arsiv-dugme" id="t-arsiv">${arsiv ? 'Geçmişi gizle' : `Geçmiş takaslar (${biten.length})`} ${ikon('sag', 16)}</button>
        ${arsiv ? `<div class="talep-liste soluk">${biten.map((t) => kart(t, sekme)).join('')}</div>` : ''}` : ''}
    `;
    guvenKartlariniDoldur(kok);
  };

  kok.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-s]');
    if (s) {
      sekme = s.dataset.s;
      history.replaceState(null, '', `#/takas?sekme=${sekme}`);
      titret();
      return ciz();
    }
    if (e.target.closest('#t-arsiv')) { arsiv = !arsiv; return ciz(); }
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const t = [...durum.gelen, ...durum.giden].find((x) => x.id === id);
    if (t) eylemYap(b, b.dataset.e, t);
  });

  ciz();
  return { guncelle: (n) => { if (n === 'talepler') { const y = kok.scrollTop; ciz(); kok.scrollTop = y; } } };
}

async function eylemYap(b, eylem, t) {
  const calistir = async (is, basari, ses) => {
    yukleniyor(b, true);
    try {
      await is();
      if (ses) sesCal(ses);
      if (basari) toast(basari, 'basari');
      titret('orta');
      return true;
    } catch (err) {
      toast(hataMetni(err), 'hata');
      if (b.isConnected) yukleniyor(b, false);
      return false;
    }
  };
  switch (eylem) {
    case 'kabul': {
      const digerleri = durum.gelen.filter((x) => x.kitapId === t.kitapId && x.id !== t.id && x.durum === 'bekliyor');
      const ek = digerleri.length ? ` Bu kitap için gelen diğer ${digerleri.length} talep otomatik olarak reddedilecek.` : '';
      if (!(await onayla('Talebi kabul et', `"${t.kitapAd}" kitabını ${t.isteyenAd} adlı okura karşı ödemeli kargoyla göndereceksin.${ek}`, { evet: 'Kabul et' }))) return;
      if (await calistir(() => api.talepKabul(t, digerleri), 'Talep kabul edildi. Adres bilgisi açıldı.', 'kabul')) adresSayfasi(t);
      return;
    }
    case 'reddet':
      if (!(await onayla('Talep reddedilsin mi?', `${t.isteyenAd} adlı okurun talebi reddedilecek.`, { evet: 'Reddet', tehlike: true }))) return;
      return calistir(() => api.talepReddet(t), 'Talep reddedildi.', 'yumusak');
    case 'vazgec':
      if (!(await onayla('Takastan vazgeç', 'Kitap yeniden rafta herkese açık olacak ve talep reddedilmiş sayılacak.', { evet: 'Vazgeç', hayir: 'Kapat', tehlike: true }))) return;
      return calistir(() => api.talepGeriCek(t), 'Kitap yeniden rafta.', 'yumusak');
    case 'iptal':
      if (!(await onayla(t.durum === 'kabul' ? 'Talebinden vazgeçilsin mi?' : 'Talep geri çekilsin mi?', 'Kitabın sahibine talebinin iptal edildiği görünecek. Harcadığın 1 puan sana geri verilir.', { evet: t.durum === 'kabul' ? 'Vazgeç' : 'Geri çek', tehlike: true }))) return;
      return calistir(() => api.talepIptal(t), 'Talebin geri çekildi, puanın iade edildi.', 'yumusak');
    case 'iade':
      if (!(await onayla('Kargo geri mi döndü?', `${t.isteyenAd} kargoyu teslim almadıysa onayla. Okura 1 ihtar yazılır ve kitabın yeniden rafa çıkar. Yanlış bildirim yapanların hesabı kapatılır.`, { evet: 'Evet, iade döndü', tehlike: true }))) return;
      return calistir(() => api.iadeDondu(t), 'Kitabın yeniden rafında.', 'yumusak');
    case 'sorun':
      return sorunSayfasi(t);
    case 'degerlendir':
      return degerlendirmeSayfasi(t);
    case 'rafa':
      durum.eklemeTaslagi = { ad: t.kitapAd, yazar: t.kitapYazar || '', foto: t.kitapFoto || '', oncekiTalep: t.id, kitapId: t.kitapId };
      return git('ekle');
    case 'kargola':
      return kargoSayfasi(t);
    case 'teslim':
      if (!(await onayla('Kitabı teslim aldın mı?', 'Kargo ücretini ödeyip kitabı teslim aldıysan onayla.', { evet: 'Evet, aldım' }))) return;
      if (await calistir(() => api.teslimAldim(t), 'İyi okumalar! 📖', 'teslim')) {
        await degerlendirmeSayfasi(t);
        takasTamamlandi();
      }
      return;
    case 'kopyala':
      try { await navigator.clipboard.writeText(t.kargo.takipNo); toast('Takip numarası kopyalandı.', 'basari'); } catch { toast(t.kargo.takipNo); }
  }
}

async function adresGoster(t) {
  try {
    return await api.talepAdresi(t.id);
  } catch (e) {
    toast(hataMetni(e), 'hata');
    return null;
  }
}

function adresKutusu(a) {
  if (!a) return '<p class="sheet-metin">Adres bilgisi alınamadı.</p>';
  return `<div class="adres-kutu">
    <div class="adres-ust">${ikon('konum', 18)}<b>${h(a.adSoyad)}</b></div>
    <p>${h(a.acikAdres)}<br/>${h(a.ilce)} / ${h(a.il)}</p>
    <p class="adres-tel">${h(a.telefon)}</p>
    <button type="button" class="dugme ikincil kucuk" id="adres-kopya">${ikon('kopya', 16)}<span>Adresi kopyala</span></button>
  </div>`;
}
function adresKopyaBagla(kok, a) {
  $('#adres-kopya', kok)?.addEventListener('click', async () => {
    const metin = `${a.adSoyad}\n${a.acikAdres}\n${a.ilce} / ${a.il}\nTel: ${a.telefon}`;
    try { await navigator.clipboard.writeText(metin); toast('Adres kopyalandı.', 'basari'); } catch {}
  });
}

async function adresSayfasi(t) {
  const a = await adresGoster(t);
  const s = sayfaAc(`
    <h3 class="sheet-baslik">Gönderim adresi</h3>
    <p class="sheet-metin">"${h(t.kitapAd)}" kitabını bu adrese <b>karşı ödemeli</b> olarak gönder. Kargo ücretini alıcı öder.</p>
    ${adresKutusu(a)}
    <button class="dugme ana genis" data-kapat>Tamam</button>`);
  if (a) adresKopyaBagla(s.el, a);
}

async function kargoSayfasi(t) {
  const a = await adresGoster(t);
  const s = sayfaAc(`
    <h3 class="sheet-baslik">Kargoya verdim</h3>
    <p class="sheet-metin">Gönderiyi <b>karşı ödemeli</b> olarak oluşturduğundan emin ol. Takip numarası alıcıya iletilecek.</p>
    <div class="uyari-kutu dikkat">${ikon('uyari', 20)}<p>Kargoda <b>“ücreti alıcıdan”</b> seçeneğini kullan. Ürün bedeli <b>tahsilatlı gönderi yapma</b>: okur bunu bildirirse hesabın kapatılır.</p></div>
    ${adresKutusu(a)}
    <form class="form" id="k-form" novalidate>
      <label class="alan"><span>Kargo firması</span><select name="firma" required><option value="">Seç</option>${KARGO_FIRMALARI.map((k) => `<option>${k}</option>`).join('')}</select></label>
      <label class="alan"><span>Takip / gönderi numarası</span><input name="takip" inputmode="text" autocomplete="off" placeholder="Ör. 1234567890" required/></label>
      <button class="dugme ana genis buyuk" type="submit">${ikon('kargo', 20)}<span>Gönderildi olarak işaretle</span></button>
    </form>`, { sinif: 'uzun' });
  if (a) adresKopyaBagla(s.el, a);
  const f = $('#k-form', s.el);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firma = f.firma.value;
    const takip = f.takip.value.trim();
    if (!firma) return toast('Kargo firmasını seç.', 'hata');
    if (takip.length < 4) return toast('Takip numarasını yaz.', 'hata');
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      await api.kargola(t, firma, takip, durum.profil?.sehir || '');
      titret('guclu');
      sesCal('kargo');
      await s.kapat();
      toast('Kitap yola çıktı! 🚚', 'basari');
      gecisReklami();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}


// Talep eden: sorun bildirimi (kitap sahibine ihtar)
function sorunSayfasi(t) {
  const ulasmadiAcik = (Date.now() - (t.kargoTarihi || t.guncelleme)) / GUN >= 5;
  let tur = '';
  const s = sayfaAc(`
    <h3 class="sheet-baslik">Sorun bildir</h3>
    <p class="sheet-metin">Ne oldu? Bildirimin kitap sahibine <b>ihtar</b> olarak yazılır; yanlış bildirim yapanların hesabı kapatılır.</p>
    <div class="secenek-liste" id="so-tur">
      <button type="button" data-v="tahsilat">${h(SORUN_AD.tahsilat)}<i>${ikon('tik', 16, 2.6)}</i></button>
      <button type="button" data-v="bos">${h(SORUN_AD.bos)}<i>${ikon('tik', 16, 2.6)}</i></button>
      <button type="button" data-v="ulasmadi" ${ulasmadiAcik ? '' : 'disabled'}>${h(SORUN_AD.ulasmadi)}${ulasmadiAcik ? '' : '<small>Kargodan 5 gün sonra bildirilebilir</small>'}<i>${ikon('tik', 16, 2.6)}</i></button>
    </div>
    ${t.kargo ? `<p class="sheet-not">${ikon('bilgi', 14)}<span>Önce ${h(t.kargo.firma)} sayfasından <b>${h(t.kargo.takipNo)}</b> numarasını sorgulamanı öneririz.</span></p>` : ''}
    <button class="dugme tehlike genis" id="so-gonder" disabled>${ikon('bildir', 18)}<span>Bildir</span></button>`);
  s.el.querySelector('#so-tur').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b || b.disabled) return;
    tur = b.dataset.v;
    s.el.querySelectorAll('#so-tur button').forEach((x) => x.classList.toggle('secili', x === b));
    $('#so-gonder', s.el).disabled = false;
    titret();
  });
  $('#so-gonder', s.el).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    yukleniyor(b, true);
    try {
      await api.sorunBildir(t, tur);
      await s.kapat();
      sesCal('yumusak');
      toast('Bildirimin alındı. Kitap sahibine ihtar yazıldı.', 'basari');
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}

// Teslim sonrası değerlendirme: yıldız + "açıklamadaki gibi miydi?"
function degerlendirmeSayfasi(t) {
  let yildiz = 0;
  let uygun = null;
  const s = sayfaAc(`
    <div class="deg-sayfa">
      <h3 class="sheet-baslik">Kitap nasıl geldi?</h3>
      <p class="sheet-metin"><b>${h(t.sahipAd)}</b> ile takasını değerlendir. Puanın, diğer okurların güvenle kitap istemesine yardım eder.</p>
      <div class="deg-yildizlar" id="d-yildiz">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-y="${i}" aria-label="${i} yıldız">${ikon('yildiz', 34, 1.6)}</button>`).join('')}</div>
      <div class="deg-soru"><span>Kitap açıklamadaki gibi miydi?</span>
        <div class="segment" id="d-uygun"><button type="button" data-u="1">Evet</button><button type="button" data-u="0">Hayır</button></div>
      </div>
      <label class="alan"><span>Birkaç söz <em>(isteğe bağlı)</em></span><textarea id="d-yorum" rows="2" maxlength="200" placeholder="Özenle paketlenmişti, teşekkürler!"></textarea></label>
      <button class="dugme ana genis" id="d-gonder" disabled>Gönder</button>
      <button class="dugme hayalet genis" data-kapat>Şimdi değil</button>
    </div>`);
  const hazir = () => { $('#d-gonder', s.el).disabled = !(yildiz && uygun !== null); };
  $('#d-yildiz', s.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-y]');
    if (!b) return;
    yildiz = +b.dataset.y;
    s.el.querySelectorAll('#d-yildiz button').forEach((x) => x.classList.toggle('dolu', +x.dataset.y <= yildiz));
    titret();
    hazir();
  });
  $('#d-uygun', s.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-u]');
    if (!b) return;
    uygun = b.dataset.u === '1';
    s.el.querySelectorAll('#d-uygun button').forEach((x) => x.classList.toggle('secili', x === b));
    hazir();
  });
  $('#d-gonder', s.el).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    yukleniyor(b, true);
    try {
      await api.degerlendir(t, yildiz, uygun, $('#d-yorum', s.el).value.trim());
      degerlendirildi(t.id);
      await s.kapat();
      degisti('talepler');
      toast('Teşekkürler! Değerlendirmen kaydedildi.', 'basari');
    } catch (err) {
      if (err?.code === 'permission-denied') { degerlendirildi(t.id); await s.kapat(); toast('Bu takası zaten değerlendirmişsin.'); return; }
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
  return s.bitti;
}
