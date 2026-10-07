// Demo arka ucu: Firebase ayarı yokken uygulamanın tamamı bu cihazda (localStorage) çalışır.
// Firebase arka ucuyla aynı işlevleri sunar. Gerçekçi olsun diye talepler bir süre sonra
// "karşı taraf" tarafından otomatik onaylanıp kargolanır.
const ANAHTAR = 'okudum_demo_v4';

const gun = 86400000;
// Liderlik tablosunda daha çok kişi görünsün diye ek demo okurları
const EK_KISILER = {
  u6: { ad: 'Selin Çelik', sehir: 'Antalya' }, u7: { ad: 'Emre Korkmaz', sehir: 'Konya' }, u8: { ad: 'Deniz Aydın', sehir: 'Trabzon' },
  u9: { ad: 'Gül Arslan', sehir: 'Samsun' }, u10: { ad: 'Okan Yıldız', sehir: 'Kayseri' }, u11: { ad: 'Pınar Doğan', sehir: 'Adana' },
  u12: { ad: 'Berk Özkan', sehir: 'Mersin' },
};
const KISILER = {
  u1: { ad: 'Elif Yılmaz', sehir: 'İstanbul' },
  u2: { ad: 'Mert Kaya', sehir: 'Ankara' },
  u3: { ad: 'Zeynep Aksoy', sehir: 'İzmir' },
  u4: { ad: 'Can Demir', sehir: 'Eskişehir' },
  u5: { ad: 'Ayşe Polat', sehir: 'Bursa' },
};
const TOHUM = [
  ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'Türk Klasikleri', 'iyi', 'u1', 'Kenarlarında birkaç kurşun kalem notu var, sayfalar temiz. Hayatımda en çok etkilendiğim kitaplardan biri.'],
  ['Saatleri Ayarlama Enstitüsü', 'Ahmet Hamdi Tanpınar', 'Türk Klasikleri', 'yeni', 'u2', 'Bir kez okundu, neredeyse sıfır gibi.'],
  ['Suç ve Ceza', 'Fyodor Dostoyevski', 'Dünya Klasikleri', 'okunmus', 'u3', 'İş Bankası Hasan Âli Yücel Klasikler dizisi. Sırtında hafif kırık var.'],
  ['Tutunamayanlar', 'Oğuz Atay', 'Roman', 'iyi', 'u4', 'Kalın ama her sayfası ayrı bir dünya. Yeni okuruna şimdiden iyi yolculuklar.'],
  ['1984', 'George Orwell', 'Bilim Kurgu', 'yeni', 'u5', ''],
  ['Küçük Prens', 'Antoine de Saint-Exupéry', 'Çocuk', 'iyi', 'u1', 'Resimli baskı. Çocuğuma okumuştum, artık başka bir evde okunsun.'],
  ['Sapiens', 'Yuval Noah Harari', 'Tarih', 'okunmus', 'u2', 'Bazı satırların altı çizili.'],
  ['İnce Memed', 'Yaşar Kemal', 'Türk Klasikleri', 'yipranmis', 'u3', 'Eski bir baskı, kapağı yıpranmış ama içi okunaklı.'],
  ['Simyacı', 'Paulo Coelho', 'Roman', 'iyi', 'u4', ''],
  ['Çalıkuşu', 'Reşat Nuri Güntekin', 'Türk Klasikleri', 'iyi', 'u5', 'Lise yıllarımdan kalma, çok sevilerek okundu.'],
  ['Dune', 'Frank Herbert', 'Bilim Kurgu', 'yeni', 'u2', 'Filmden sonra aldım, bir solukta bitti.'],
  ['Masumiyet Müzesi', 'Orhan Pamuk', 'Roman', 'okunmus', 'u1', ''],
  ['Böyle Buyurdu Zerdüşt', 'Friedrich Nietzsche', 'Felsefe', 'iyi', 'u3', ''],
  ['Sefiller', 'Victor Hugo', 'Dünya Klasikleri', 'okunmus', 'u5', 'Kısaltılmamış tam metin.'],
];

let veri = yukle();
const dinleyiciler = { oturum: new Set(), kitap: new Set(), talep: new Set(), yolculuk: new Set(), hesap: new Set() };

function yukle() {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR));
    if (v?.kitaplar) return v;
  } catch {}
  return tohumla();
}
function tohumla() {
  const simdi = Date.now();
  const kitaplar = TOHUM.map(([ad, yazar, kategori, kondisyon, kisi, aciklama], i) => ({
    id: 'k' + i, ad, yazar, kategori, kondisyon, aciklama, foto: '', sahipId: kisi,
    sahipAd: KISILER[kisi].ad, sahipFoto: '', sehir: KISILER[kisi].sehir, durum: 'musait',
    olusturma: simdi - i * gun * 0.7 - 3600000,
  }));
  // Haritada daha çok şehir dolu görünsün diye ek demo kitapları ve geçen haftanın yolculukları
  const EK = [
    ['Beyaz Zambaklar Ülkesinde', 'Grigoriy Petrov', 'Antalya'], ['Martı', 'Richard Bach', 'Trabzon'], ['Yaban', 'Yakup Kadri Karaosmanoğlu', 'Konya'],
    ['Dönüşüm', 'Franz Kafka', 'Eskişehir'], ['Satranç', 'Stefan Zweig', 'Kayseri'], ['Fareler ve İnsanlar', 'John Steinbeck', 'Diyarbakır'],
    ['Kuyucaklı Yusuf', 'Sabahattin Ali', 'Aydın'], ['Huzur', 'Ahmet Hamdi Tanpınar', 'İstanbul'], ['Puslu Kıtalar Atlası', 'İhsan Oktay Anar', 'İzmir'],
    ['Şeker Portakalı', 'José Mauro de Vasconcelos', 'Samsun'], ['Uçurtma Avcısı', 'Khaled Hosseini', 'Van'], ['Kayıp Tanrılar Ülkesi', 'Ahmet Ümit', 'Gaziantep'],
    ['Hayvan Çiftliği', 'George Orwell', 'Ankara'], ['Bir İdam Mahkumunun Son Günü', 'Victor Hugo', 'Mersin'], ['Seksen Günde Devri Alem', 'Jules Verne', 'Erzurum'],
    ['Yeraltından Notlar', 'Fyodor Dostoyevski', 'İstanbul'], ['Kaşağı', 'Ömer Seyfettin', 'Balıkesir'], ['Sineklerin Tanrısı', 'William Golding', 'Malatya'],
  ];
  const ekKitaplar = EK.map(([ad, yazar, sehir], i) => ({
    id: 'e' + i, ad, yazar, kategori: 'Roman', kondisyon: ['iyi', 'yeni', 'okunmus'][i % 3], aciklama: '', foto: '',
    sahipId: 'u' + ((i % 5) + 1), sahipAd: Object.values(KISILER)[i % 5].ad, sahipFoto: '', sehir, durum: 'musait',
    olusturma: simdi - (i + 3) * gun * 0.9,
  }));
  // [kitap, yazar, nereden, nereye, kaç gün önce, teslim edildi mi, gönderen, alıcı]
  const YOL = [
    ['Tutunamayanlar', 'Oğuz Atay', 'İstanbul', 'Van', 0.3, false, 'u1', 'u8'], ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'İzmir', 'Erzurum', 0.6, false, 'u3', 'u10'],
    ['Saatleri Ayarlama Enstitüsü', 'Ahmet Hamdi Tanpınar', 'Ankara', 'Trabzon', 0.9, true, 'u2', 'u8'], ['Simyacı', 'Paulo Coelho', 'Antalya', 'Edirne', 1.0, true, 'u6', 'u2'],
    ['Küçük Prens', 'Antoine de Saint-Exupéry', 'Bursa', 'Diyarbakır', 1.1, true, 'u5', 'u3'], ['İnce Memed', 'Yaşar Kemal', 'Adana', 'İstanbul', 1.2, true, 'u11', 'u1'],
    ['Sefiller', 'Victor Hugo', 'Eskişehir', 'Hatay', 1.3, true, 'u4', 'u11'], ['Dune', 'Frank Herbert', 'Kocaeli', 'Konya', 1.35, true, 'u1', 'u7'],
    ['1984', 'George Orwell', 'Samsun', 'Muğla', 1.4, true, 'u9', 'u2'], ['Beyaz Diş', 'Jack London', 'İstanbul', 'Kayseri', 1.45, true, 'u1', 'u10'],
    ['Martı', 'Richard Bach', 'Konya', 'İzmir', 1.5, true, 'u7', 'u3'], ['Huzur', 'Ahmet Hamdi Tanpınar', 'İstanbul', 'Samsun', 0.2, false, 'u1', 'u9'],
    ['Çalıkuşu', 'Reşat Nuri Güntekin', 'Bursa', 'Antalya', 0.5, false, 'u5', 'u6'], ['Yaban', 'Yakup Kadri Karaosmanoğlu', 'İzmir', 'Ankara', 0.8, true, 'u3', 'u2'],
    ['Satranç', 'Stefan Zweig', 'Mersin', 'İstanbul', 12, true, 'u12', 'u1'], ['Dönüşüm', 'Franz Kafka', 'Ankara', 'Mersin', 15, true, 'u2', 'u12'],
    ['Suç ve Ceza', 'Fyodor Dostoyevski', 'İzmir', 'Konya', 20, true, 'u3', 'u7'], ['Aylak Adam', 'Yusuf Atılgan', 'Trabzon', 'Bursa', 25, true, 'u8', 'u5'],
    ['Masumiyet Müzesi', 'Orhan Pamuk', 'İstanbul', 'Adana', 28, true, 'u1', 'u11'], ['Kuyucaklı Yusuf', 'Sabahattin Ali', 'Kayseri', 'Samsun', 33, true, 'u10', 'u9'],
  ];
  const yolculuklar = YOL.map(([kitapAd, kitapYazar, nereden, nereye, gunOnce, teslim, sahipId, isteyenId], i) => ({
    id: 'y' + i, kitapId: '', kitapAd, kitapYazar, kitapFoto: '', nereden, nereye, sahipId, isteyenId, tarih: simdi - gunOnce * gun, teslim,
  }));
  return { oturum: null, hesaplar: {}, profiller: {}, adresler: {}, kitaplar: [...kitaplar, ...ekKitaplar], talepler: [], talepAdresleri: {}, yolculuklar };
}
function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { console.warn('Demo verisi kaydedilemedi', e); }
  yayinla();
}
function yayinla() {
  const kitaplar = [...veri.kitaplar].sort((a, b) => b.olusturma - a.olusturma);
  dinleyiciler.kitap.forEach((cb) => cb(kitaplar));
  dinleyiciler.yolculuk.forEach((cb) => cb([...veri.yolculuklar].sort((a, b) => b.tarih - a.tarih)));
  dinleyiciler.hesap.forEach(({ uid, cb }) => cb({ ...hesap(uid) }));
  dinleyiciler.talep.forEach(({ uid, cb }) => cb({
    gelen: veri.talepler.filter((t) => t.sahipId === uid),
    giden: veri.talepler.filter((t) => t.isteyenId === uid),
  }));
}
const bekle = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export function baslat() {}

export function oturumuDinle(cb) {
  dinleyiciler.oturum.add(cb);
  setTimeout(() => cb(veri.oturum), 0);
  return () => dinleyiciler.oturum.delete(cb);
}
function oturumAc(k) {
  veri.oturum = k;
  // Yeni demo kullanıcının rafında bir kitap ve ona gelmiş bir talep olsun ki akış hemen görülsün.
  const kid = `kben-${k.uid}`;
  const tid = `t-hosgeldin-${k.uid}`;
  if (k.dogrulandi && !veri.kitaplar.some((x) => x.sahipId === k.uid)) {
    veri.kitaplar.push({
      id: kid, ad: 'Aylak Adam', yazar: 'Yusuf Atılgan', kategori: 'Türk Klasikleri', kondisyon: 'iyi',
      aciklama: 'Tek oturuşta okunacak bir kitap. Yeni okurunu bekliyor.', foto: '', sahipId: k.uid,
      sahipAd: k.ad, sahipFoto: '', sehir: '', durum: 'musait', olusturma: Date.now() - gun * 2,
    });
    veri.talepler.push({
      id: tid, kitapId: kid, kitapAd: 'Aylak Adam', kitapYazar: 'Yusuf Atılgan', kitapFoto: '',
      sahipId: k.uid, sahipAd: k.ad, sahipFoto: '', isteyenId: 'u3', isteyenAd: KISILER.u3.ad, isteyenFoto: '',
      isteyenSehir: KISILER.u3.sehir, not: 'Merhaba! Uzun zamandır okumak istiyordum, çok sevinirim 🙏',
      durum: 'bekliyor', kargo: null, olusturma: Date.now() - 3600000 * 5, guncelleme: Date.now() - 3600000 * 5,
    });
    veri.talepAdresleri[tid] = {
      adSoyad: 'Zeynep Aksoy', telefon: '0555 123 45 67', il: 'İzmir', ilce: 'Karşıyaka',
      acikAdres: 'Bostanlı Mah. Cemal Gürsel Cad. No: 12 D: 4',
    };
  }
  kaydet();
  dinleyiciler.oturum.forEach((cb) => cb(k));
}

// Demo hesapları cihazda tutulur: kayıtsız e-posta ya da yanlış şifreyle giriş yapılamaz.
const anahtar = (eposta) => eposta.trim().toLocaleLowerCase('tr');
const hesapKullanici = (eposta, h) => ({ uid: 'demo-' + anahtar(eposta), ad: h.ad, eposta: anahtar(eposta), foto: '', dogrulandi: h.dogrulandi });

export async function googleIleGiris() {
  await bekle(600);
  oturumAc({ uid: 'demo-google', ad: 'Kitapsever', eposta: 'demo@okudum.app', foto: '', dogrulandi: true });
}
export async function epostaKayit(ad, eposta, sifre) {
  if (sifre.length < 6) throw { code: 'auth/weak-password' };
  await bekle();
  veri.hesaplar ||= {};
  if (veri.hesaplar[anahtar(eposta)]) throw { code: 'auth/email-already-in-use' };
  const h = { ad, sifre, dogrulandi: false };
  veri.hesaplar[anahtar(eposta)] = h;
  const k = hesapKullanici(eposta, h);
  oturumAc(k);
  return k;
}
export async function epostaGiris(eposta, sifre) {
  if (!sifre) throw { code: 'auth/missing-password' };
  await bekle();
  const h = veri.hesaplar?.[anahtar(eposta)];
  if (!h || h.sifre !== sifre) throw { code: 'auth/invalid-credential' };
  oturumAc(hesapKullanici(eposta, h));
}
// Demo: gerçek e-posta gönderilmez; "Doğruladım" bağlantıya tıklanmış gibi davranır.
export async function dogrulamaGonder() { await bekle(); }
export async function dogrulamaKontrol() {
  await bekle();
  const k = veri.oturum;
  if (!k) return null;
  const h = veri.hesaplar?.[k.eposta];
  if (h) h.dogrulandi = true;
  const yeni = { ...k, dogrulandi: true };
  oturumAc(yeni);
  return yeni;
}
export async function sifreSifirla() { await bekle(); }
export async function cikis() {
  veri.oturum = null;
  kaydet();
  dinleyiciler.oturum.forEach((cb) => cb(null));
}

export async function profilGetir(uid) { return veri.profiller[uid] || null; }
export async function profilleriGetir(uidler) {
  const sonuc = {};
  for (const uid of new Set(uidler)) {
    const k = KISILER[uid] || EK_KISILER[uid] || veri.profiller[uid];
    if (k) sonuc[uid] = { ad: k.ad || '', sehir: k.sehir || '', foto: k.foto || '' };
  }
  return sonuc;
}
export async function profilKaydet(uid, p) {
  veri.profiller[uid] = { ...veri.profiller[uid], ...p };
  for (const k of veri.kitaplar) if (k.sahipId === uid) Object.assign(k, { sahipAd: p.ad ?? k.sahipAd, sehir: p.sehir ?? k.sehir, sahipFoto: p.foto ?? k.sahipFoto });
  kaydet();
}
export async function adresimiGetir(uid) { return veri.adresler[uid] || null; }
export async function adresimiKaydet(uid, a) { veri.adresler[uid] = a; kaydet(); }

export function kitaplariDinle(cb) {
  dinleyiciler.kitap.add(cb);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.kitap.delete(cb);
}
export async function kitapEkle(kullanici, profil, v, foto) {
  await bekle(500);
  const id = 'k' + Date.now();
  veri.kitaplar.push({
    ...v, id, foto: foto || '', sahipId: kullanici.uid, sahipAd: profil.ad, sahipFoto: profil.foto || '',
    sehir: profil.sehir, durum: 'musait', olusturma: Date.now(),
  });
  kaydet();
  return id;
}
// Demo: gerçek yapay zekâ yok; örnek bir metin yazılır (gerçek Firebase bağlanınca Gemini üretir).
export async function ozetHazirla(kitapId, ad, yazar) {
  await bekle(2500);
  const k = kitapBul(kitapId);
  if (!k) return null;
  k.ozet = [
    `“${ad}”, ${yazar} imzasını taşıyan bir kitap.`,
    'Bu metin demo modunda örnek olarak yazıldı.',
    'Gerçek sürümde özeti yapay zekâ hazırlar.',
    'Kitabın konusu ve ana karakterleri burada anlatılır.',
    'Önce hikâyenin kurulduğu dünya tanıtılır.',
    'Sonra kahramanın karşılaştığı sorun belirir.',
    'Olaylar ilerledikçe kahraman kendi seçimleriyle yüzleşir.',
    'Yan karakterler hikâyeye derinlik katar.',
    'Kitabın ana temaları arasında insan ve zaman vardır.',
    'Anlatım sade ve akıcı bir dille ilerler.',
    'Sürprizleri açık etmemek için sonu anlatılmaz.',
    'Okurken sizi neyin beklediğini keşfetmek size kalıyor.',
  ].join('\n');
  kaydet();
  return k.ozet;
}

// Demo: kapak okuma taklidi (gerçek sürümde Gemini fotoğrafa bakar)
export async function kapakOku() {
  await bekle(1600);
  return { ad: 'Kürk Mantolu Madonna', yazar: 'Sabahattin Ali' };
}

export async function kitapSil(kitap) {
  veri.kitaplar = veri.kitaplar.filter((k) => k.id !== kitap.id);
  kaydet();
}

export function talepleriDinle(uid, cb) {
  const d = { uid, cb };
  dinleyiciler.talep.add(d);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.talep.delete(d);
}
const talepBul = (id) => veri.talepler.find((t) => t.id === id);
const kitapBul = (id) => veri.kitaplar.find((k) => k.id === id);
function guncelle(id, alanlar) {
  Object.assign(talepBul(id), alanlar, { guncelleme: Date.now() });
}

export async function talepOlustur(kullanici, profil, kitap, not, adres) {
  await bekle(500);
  const tel = telKimligi(adres.telefon);
  if (!tel) throw { code: 'okudum/telefon-gecersiz' };
  veri.telefonlar ||= {};
  if (veri.telefonlar[tel] && veri.telefonlar[tel] !== kullanici.uid) throw { code: 'okudum/telefon-baska-hesapta' };
  const hs = hesap(kullanici.uid);
  if (hs.puan < 1) throw { code: 'okudum/puan-yok' };
  veri.telefonlar[tel] = kullanici.uid;
  hs.puan -= 1;
  const id = 't' + Date.now();
  veri.talepler.push({
    id, kitapId: kitap.id, kitapAd: kitap.ad, kitapYazar: kitap.yazar, kitapFoto: kitap.foto || '',
    sahipId: kitap.sahipId, sahipAd: kitap.sahipAd, sahipFoto: kitap.sahipFoto || '',
    isteyenId: kullanici.uid, isteyenAd: profil.ad, isteyenFoto: profil.foto || '', isteyenSehir: profil.sehir || '',
    not: not || '', durum: 'bekliyor', kargo: null, olusturma: Date.now(), guncelleme: Date.now(),
  });
  veri.talepAdresleri[id] = adres;
  kaydet();
  // Karşı taraf (demo kişisi) önce kabul eder, sonra kargolar.
  setTimeout(() => {
    const t = talepBul(id);
    if (t?.durum !== 'bekliyor') return;
    guncelle(id, { durum: 'kabul', kabulTarihi: Date.now() });
    Object.assign(kitapBul(t.kitapId), { durum: 'rezerve', talepId: id });
    kaydet();
  }, 8000);
  setTimeout(() => {
    const t = talepBul(id);
    if (t?.durum !== 'kabul') return;
    guncelle(id, { durum: 'kargoda', kargoTarihi: Date.now(), kargo: { firma: 'Yurtiçi Kargo', takipNo: String(Math.floor(1e11 + Math.random() * 9e11)) } });
    kitapBul(t.kitapId).durum = 'verildi';
    kaydet();
  }, 20000);
  return id;
}
export async function talepAdresi(id) { return veri.talepAdresleri[id] || null; }

export async function talepKabul(talep, digerleri) {
  await bekle();
  guncelle(talep.id, { durum: 'kabul', kabulTarihi: Date.now() });
  for (const t of digerleri) { guncelle(t.id, { durum: 'red' }); hesap(t.isteyenId).puan += 1; }
  Object.assign(kitapBul(talep.kitapId), { durum: 'rezerve', talepId: talep.id });
  kaydet();
}
export async function talepReddet(talep) { await bekle(); guncelle(talep.id, { durum: 'red' }); hesap(talep.isteyenId).puan += 1; kaydet(); }
export async function talepIptal(talep) {
  await bekle();
  if (talep.durum === 'kabul') kitapBul(talep.kitapId).durum = 'musait';
  guncelle(talep.id, { durum: 'iptal' });
  hesap(talep.isteyenId).puan += 1;
  kaydet();
}
export async function talepGeriCek(talep) {
  await bekle();
  guncelle(talep.id, { durum: 'red' });
  hesap(talep.isteyenId).puan += 1;
  kitapBul(talep.kitapId).durum = 'musait';
  kaydet();
}
export async function kargola(talep, firma, takipNo, nereden) {
  await bekle();
  guncelle(talep.id, { durum: 'kargoda', kargo: { firma, takipNo }, kargoTarihi: Date.now() });
  kitapBul(talep.kitapId).durum = 'verildi';
  if (nereden && talep.isteyenSehir) {
    veri.yolculuklar.unshift({
      id: talep.id, kitapId: talep.kitapId, kitapAd: talep.kitapAd, kitapYazar: talep.kitapYazar, kitapFoto: talep.kitapFoto || '',
      nereden, nereye: talep.isteyenSehir, sahipId: talep.sahipId, isteyenId: talep.isteyenId, tarih: Date.now(), teslim: false,
    });
  }
  kaydet();
  // Demo: alıcı birkaç saniye sonra teslim aldığını bildirir.
  setTimeout(() => {
    if (talepBul(talep.id)?.durum === 'kargoda') { guncelle(talep.id, { durum: 'teslim' }); hesap(talep.sahipId).puan += 1; kaydet(); }
  }, 15000);
}
function teslimEt(talep) {
  guncelle(talep.id, { durum: 'teslim' });
  hesap(talep.sahipId).puan += 1;
  if (talep.sorun?.tur === 'ulasmadi') hesap(talep.sahipId).ihtar -= 1;
  const y = veri.yolculuklar.find((x) => x.id === talep.id);
  if (y) Object.assign(y, { teslim: true, teslimTarih: Date.now() });
  kaydet();
}
export async function teslimAldim(talep) { await bekle(); teslimEt(talep); }
export async function otomatikTeslim(talep) { await bekle(); teslimEt(talep); }
export async function iadeDondu(talep) {
  await bekle();
  guncelle(talep.id, { durum: 'iade' });
  Object.assign(hesap(talep.isteyenId), { ihtar: hesap(talep.isteyenId).ihtar + 1, sonIhtar: Date.now() });
  kitapBul(talep.kitapId).durum = 'musait';
  kaydet();
}
export async function sorunBildir(talep, tur) {
  await bekle();
  guncelle(talep.id, { sorun: { tur, tarih: Date.now() } });
  Object.assign(hesap(talep.sahipId), { ihtar: hesap(talep.sahipId).ihtar + 1, sonIhtar: Date.now() });
  kaydet();
}

// ——— Hesap: puan ve ihtar ———
function hesap(uid) {
  veri.puanlar ||= {};
  return (veri.puanlar[uid] ||= { puan: 2, ihtar: 0, kayit: Date.now() });
}
export async function hesapHazirla(uid) { const h = hesap(uid); kaydet(); return { ...h }; }
export async function hesapGetir(uid) { return { ...hesap(uid) }; }
export function hesabiDinle(uid, cb) {
  const d = { uid, cb };
  dinleyiciler.hesap.add(d);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.hesap.delete(d);
}
export function telKimligi(tel) {
  const r = String(tel || '').replace(/\D/g, '').replace(/^(90|0)/, '');
  return /^5\d{9}$/.test(r) ? r : '';
}

// ——— Değerlendirme ———
export async function degerlendir(talep, yildiz, uygun, yorum) {
  await bekle();
  veri.degerlendirmeler ||= {};
  veri.degerlendirmeler[talep.id] = { sahipId: talep.sahipId, isteyenId: talep.isteyenId, yildiz, uygun, yorum, tarih: Date.now() };
  kaydet();
}
export async function degerlendirildiMi(talepId) { return !!veri.degerlendirmeler?.[talepId]; }
export async function sahipPuani(uid) {
  const l = Object.values(veri.degerlendirmeler || {}).filter((d) => d.sahipId === uid);
  // Demo kişilerinin örnek puanları
  if (!l.length && (KISILER[uid] || EK_KISILER[uid])) return { ort: 4.6 + (uid.length % 3) / 10, adet: 3 + (uid.charCodeAt(1) % 9), uygun: 1 };
  if (!l.length) return { ort: 0, adet: 0, uygun: 0 };
  return { ort: l.reduce((t, d) => t + d.yildiz, 0) / l.length, adet: l.length, uygun: l.filter((d) => d.uygun).length / l.length };
}
export async function guvenBilgisi(uid) {
  await bekle(250);
  const h = hesap(uid);
  const y = veri.yolculuklar.filter((x) => x.teslim);
  return {
    puan: h.puan, ihtar: h.ihtar, kayit: KISILER[uid] ? Date.now() - 140 * gun : h.kayit,
    paylasti: y.filter((x) => x.sahipId === uid).length, aldi: y.filter((x) => x.isteyenId === uid).length,
  };
}

// ——— Yönetici (demo: Google ile giren demo kullanıcısı yöneticidir) ———
export const YONETICI_EPOSTA = 'demo@okudum.app';
export const yoneticiMi = (k) => !!k && k.eposta === YONETICI_EPOSTA;
export function sikayetleriDinle(cb) {
  const d = () => cb([...(veri.sikayetler || [])].sort((a, b) => b.tarih - a.tarih));
  dinleyiciler.sikayet ||= new Set();
  dinleyiciler.sikayet.add(d);
  setTimeout(d, 0);
  return () => dinleyiciler.sikayet.delete(d);
}
const sikayetYayinla = () => dinleyiciler.sikayet?.forEach((d) => d());
export async function sikayetIsaretle(id, incelendi) {
  const x = (veri.sikayetler || []).find((y) => y.id === id);
  if (x) x.incelendi = incelendi;
  kaydet(); sikayetYayinla();
}
export async function kitapKaldir(kitapId) { await bekle(); veri.kitaplar = veri.kitaplar.filter((k) => k.id !== kitapId); kaydet(); }
export async function askiyaAl(uid, askida) { await bekle(); Object.assign(hesap(uid), { askida, askiTarih: Date.now() }); kaydet(); }
export async function askidakileriGetir() { return Object.entries(veri.puanlar || {}).filter(([, h]) => h.askida).map(([u]) => u); }
export async function kitapGetir(id) { return kitapBul(id) || null; }

// ——— Engel ve şikâyet ———
export async function engelleriGetir(uid) { return veri.engeller?.[uid] || []; }
export async function engelle(uid, hedef, ekle) {
  veri.engeller ||= {};
  const l = new Set(veri.engeller[uid] || []);
  if (ekle) l.add(hedef); else l.delete(hedef);
  veri.engeller[uid] = [...l];
  kaydet();
}
export async function sikayetEt(verenId, hedefTur, hedefId, sebep, aciklama) {
  await bekle();
  (veri.sikayetler ||= []).push({ id: 's' + Date.now(), verenId, hedefTur, hedefId, sebep, aciklama, tarih: Date.now() });
  kaydet(); sikayetYayinla();
}

export function yolculuklariDinle(cb) {
  dinleyiciler.yolculuk.add(cb);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.yolculuk.delete(cb);
}

export function demoyuSifirla() {
  localStorage.removeItem(ANAHTAR);
  veri = tohumla();
}
