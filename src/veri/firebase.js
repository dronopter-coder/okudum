// Firebase arka ucu: Authentication (Google + e-posta) ve Firestore (veri + küçültülmüş kitap fotoğrafları).
// Ücretsiz Spark paketinde kalmak için Cloud Storage kullanılmaz. Kurallar: ../../firebase/firestore.rules
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, getAuth, indexedDBLocalPersistence, onIdTokenChanged, GoogleAuthProvider,
  signInWithCredential, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, updateProfile, signOut, reload,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, getDocs, getCountFromServer,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { Capacitor } from '@capacitor/core';
import { MODELLER, SISTEM_ISTEMI, istem, ozetiTemizle, KAPAK_ISTEMI, kapakCevabi } from '../ozet.js';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

let app, auth, db, yz;

export function baslat(ayar) {
  app = initializeApp(ayar);
  auth = Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  auth.languageCode = 'tr'; // doğrulama ve şifre sıfırlama e-postaları Türkçe gelsin
}

// Google ile girenlerin e-postası Google tarafından doğrulanmıştır; e-posta ile kaydolanlar bağlantıya tıklamalıdır.
const kullaniciDonustur = (u) => u && {
  uid: u.uid, ad: u.displayName || '', eposta: u.email || '', foto: u.photoURL || '',
  dogrulandi: u.emailVerified || u.providerData.some((p) => p.providerId === 'google.com'),
};

export function oturumuDinle(cb) {
  // onIdTokenChanged: e-posta doğrulandıktan sonra jeton yenilenince de haber verir.
  return onIdTokenChanged(auth, (u) => cb(kullaniciDonustur(u)));
}

export async function googleIleGiris() {
  if (Capacitor.isNativePlatform()) {
    // Yerel Google hesap seçici → kimlik jetonu → web SDK oturumu
    // Klasik Google hesap seçici: telefondaki hesaplar listelenir, kullanıcı hangisiyle gireceğini seçer.
    await FirebaseAuthentication.signOut().catch(() => {});
    const s = await FirebaseAuthentication.signInWithGoogle({
      useCredentialManager: false,
      customParameters: [{ key: 'prompt', value: 'select_account' }],
    });
    const kimlik = GoogleAuthProvider.credential(s.credential?.idToken, s.credential?.accessToken);
    await signInWithCredential(auth, kimlik);
  } else {
    const saglayici = new GoogleAuthProvider();
    saglayici.setCustomParameters({ prompt: 'select_account' }); // her seferinde hesap seçtir
    await signInWithPopup(auth, saglayici);
  }
}

export async function epostaKayit(ad, eposta, sifre) {
  const s = await createUserWithEmailAndPassword(auth, eposta, sifre);
  await updateProfile(s.user, { displayName: ad });
  await sendEmailVerification(s.user);
  return kullaniciDonustur(s.user);
}
export const epostaGiris = (eposta, sifre) => signInWithEmailAndPassword(auth, eposta, sifre);
export const sifreSifirla = (eposta) => sendPasswordResetEmail(auth, eposta);
export const dogrulamaGonder = () => sendEmailVerification(auth.currentUser);

// Bağlantıya tıklanıp tıklanmadığını sunucudan sorar; doğrulandıysa jetonu yeniler (kurallar email_verified ister).
export async function dogrulamaKontrol() {
  const u = auth.currentUser;
  if (!u) return null;
  await reload(u);
  if (u.emailVerified) await u.getIdToken(true);
  return kullaniciDonustur(u);
}

export async function cikis() {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut().catch(() => {});
  await signOut(auth);
}

// ——— Profil ———
export async function profilGetir(uid) {
  const s = await getDoc(doc(db, 'kullanicilar', uid));
  return s.exists() ? s.data() : null;
}
// ——— Yapay zekâ özeti ———
// Özet bir kez üretilir ve kitap kaydına yazılır; okurlar hazır metni görür (her görüntülemede yeni çağrı yapılmaz).
export async function ozetHazirla(kitapId, ad, yazar) {
  yz ||= getAI(app, { backend: new GoogleAIBackend() });
  let sonHata;
  for (const model of MODELLER) {
    try {
      const m = getGenerativeModel(yz, { model, systemInstruction: SISTEM_ISTEMI, generationConfig: { temperature: 0.4 } });
      const cevap = await m.generateContent(istem(ad, yazar));
      const ozet = ozetiTemizle(cevap.response.text());
      if (!ozet) return null; // model kitabı tanımıyor: uydurma özet yazılmaz
      await updateDoc(kitapRef(kitapId), { ozet });
      return ozet;
    } catch (e) {
      sonHata = e; // model yok / kota doldu: sıradaki modeli dene
    }
  }
  throw sonHata;
}

// Kitap fotoğrafından ad ve yazar (yalnızca forma öneri; hiçbir yere kaydedilmez)
export async function kapakOku(dataUrl) {
  yz ||= getAI(app, { backend: new GoogleAIBackend() });
  const [bas, veri] = String(dataUrl).split(',');
  const mimeType = (bas.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  let sonHata;
  for (const model of MODELLER) {
    try {
      const m = getGenerativeModel(yz, { model, generationConfig: { temperature: 0, responseMimeType: 'application/json' } });
      const cevap = await m.generateContent([KAPAK_ISTEMI, { inlineData: { data: veri, mimeType } }]);
      return kapakCevabi(cevap.response.text());
    } catch (e) {
      sonHata = e;
    }
  }
  throw sonHata;
}

// Herkese açık profiller (ad, şehir, fotoğraf): sıralama ve gönderim listeleri için
export async function profilleriGetir(uidler) {
  const sonuc = {};
  await Promise.all([...new Set(uidler)].map(async (uid) => {
    try {
      const p = await profilGetir(uid);
      if (p) sonuc[uid] = { ad: p.ad || '', sehir: p.sehir || '', foto: p.foto || '' };
    } catch { /* okunamayan profil atlanır */ }
  }));
  return sonuc;
}

// Ad, şehir ve fotoğraf kitap kayıtlarına da kopyalandığı için kullanıcının kitaplarında da güncellenir.
export async function profilKaydet(uid, veri, kitaplarim = []) {
  const b = writeBatch(db);
  b.set(doc(db, 'kullanicilar', uid), veri, { merge: true });
  for (const k of kitaplarim.slice(0, 400)) {
    b.update(kitapRef(k.id), { sahipAd: veri.ad ?? k.sahipAd, sehir: veri.sehir ?? k.sehir, sahipFoto: veri.foto ?? k.sahipFoto ?? '' });
  }
  await b.commit();
}

// Kayıtlı teslimat adresi yalnızca sahibinin okuyabildiği alt belgede durur.
export async function adresimiGetir(uid) {
  const s = await getDoc(doc(db, 'kullanicilar', uid, 'ozel', 'adres'));
  return s.exists() ? s.data() : null;
}
export const adresimiKaydet = (uid, adres) => setDoc(doc(db, 'kullanicilar', uid, 'ozel', 'adres'), adres);

// ——— Kitaplar ———
// Sunucu zaman damgaları (kabul, kargo, sorun) uygulamada milisaniye olarak kullanılır
const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v);
function belge(d) {
  const v = { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) };
  for (const a of ['kabulTarihi', 'kargoTarihi', 'kayit', 'sonIhtar', 'tarih']) if (v[a]) v[a] = ms(v[a]);
  if (v.sorun?.tarih) v.sorun = { ...v.sorun, tarih: ms(v.sorun.tarih) };
  return v;
}
const listele = (s) => s.docs.map(belge);

export function kitaplariDinle(cb, hata) {
  const q = query(collection(db, 'kitaplar'), orderBy('olusturma', 'desc'), limit(250));
  return onSnapshot(q, (s) => cb(listele(s)), hata);
}

export async function kitapEkle(kullanici, profil, veri, fotoDataUrl) {
  const kitapRef = doc(collection(db, 'kitaplar'));
  // Fotoğraf, ekleme ekranında ~560 px JPEG'e küçültülür (≈40-80 KB) ve doğrudan belgeye yazılır.
  await setDoc(kitapRef, {
    ...veri,
    foto: fotoDataUrl || '',
    sahipId: kullanici.uid,
    sahipAd: profil.ad,
    sahipFoto: profil.foto || '',
    sehir: profil.sehir,
    durum: 'musait',
    olusturma: Date.now(),
  });
  return kitapRef.id;
}

export async function kitapSil(kitap) {
  await deleteDoc(doc(db, 'kitaplar', kitap.id));
}

// ——— Talepler ———
export function talepleriDinle(uid, cb, hata) {
  let gelen = [];
  let giden = [];
  let g1 = false;
  let g2 = false;
  // İki liste de ilk kez gelmeden yayımlanmaz (bildirimler yarım listeyle karşılaştırma yapmasın)
  const yay = () => { if (g1 && g2) cb({ gelen, giden }); };
  const c = collection(db, 'talepler');
  const k1 = onSnapshot(query(c, where('sahipId', '==', uid)), (s) => { gelen = listele(s); g1 = true; yay(); }, hata);
  const k2 = onSnapshot(query(c, where('isteyenId', '==', uid)), (s) => { giden = listele(s); g2 = true; yay(); }, hata);
  return () => { k1(); k2(); };
}

// ——— Hesap: puan (ver-al dengesi) ve ihtarlar ———
const hesapRef = (uid) => doc(db, 'hesaplar', uid);
const BASLANGIC = { puan: 2, ihtar: 0 };

// Oturum açılınca: hesap yoksa 2 puanla açılır
export async function hesapHazirla(uid) {
  const s = await getDoc(hesapRef(uid));
  if (s.exists()) return belge(s);
  await setDoc(hesapRef(uid), { ...BASLANGIC, kayit: serverTimestamp(), son: '' });
  return { ...BASLANGIC, kayit: Date.now() };
}
export function hesabiDinle(uid, cb) {
  return onSnapshot(hesapRef(uid), (s) => s.exists() && cb(belge(s)), () => {});
}
export async function hesapGetir(uid) {
  const s = await getDoc(hesapRef(uid));
  return s.exists() ? belge(s) : { ...BASLANGIC };
}
// İşlemle birlikte hesaba puan/ihtar değişikliği yazar (kurallar bu eşleşmeyi zorunlu tutar)
async function hesabaYaz(b, uid, son, { puan = 0, ihtar = 0 } = {}) {
  const s = await getDoc(hesapRef(uid));
  const o = s.exists() ? s.data() : BASLANGIC;
  const v = { puan: o.puan + puan, ihtar: o.ihtar + ihtar, son };
  if (ihtar > 0) v.sonIhtar = serverTimestamp();
  if (s.exists()) b.update(hesapRef(uid), v);
  else b.set(hesapRef(uid), v);
}

// Cep telefonu → 5xxxxxxxxx (bir numara yalnızca bir hesapta kullanılabilir)
export function telKimligi(tel) {
  const r = String(tel || '').replace(/\D/g, '').replace(/^(90|0)/, '');
  return /^5\d{9}$/.test(r) ? r : '';
}

export async function talepOlustur(kullanici, profil, kitap, not, adres) {
  const telKimlik = telKimligi(adres.telefon);
  if (!telKimlik) throw { code: 'okudum/telefon-gecersiz' };
  try {
    await getDoc(doc(db, 'telefonlar', telKimlik));
  } catch {
    throw { code: 'okudum/telefon-baska-hesapta' };
  }
  const hesap = await getDoc(hesapRef(kullanici.uid));
  if (!hesap.exists()) await hesapHazirla(kullanici.uid);
  const puan = hesap.exists() ? hesap.data().puan : BASLANGIC.puan;
  if (puan < 1) throw { code: 'okudum/puan-yok' };

  const talepRef = doc(collection(db, 'talepler'));
  const b = writeBatch(db);
  b.set(talepRef, {
    kitapId: kitap.id,
    kitapAd: kitap.ad,
    kitapYazar: kitap.yazar,
    kitapFoto: kitap.foto || '',
    sahipId: kitap.sahipId,
    sahipAd: kitap.sahipAd,
    sahipFoto: kitap.sahipFoto || '',
    isteyenId: kullanici.uid,
    isteyenAd: profil.ad,
    isteyenFoto: profil.foto || '',
    isteyenSehir: profil.sehir || '',
    not: not || '',
    durum: 'bekliyor',
    kargo: null,
    olusturma: Date.now(),
    guncelleme: Date.now(),
  });
  // Adres ayrı belgede: kitap sahibi bunu yalnızca talebi kabul ettikten sonra okuyabilir.
  b.set(doc(db, 'talepler', talepRef.id, 'gizli', 'adres'), { ...adres, telKimlik });
  b.set(doc(db, 'telefonlar', telKimlik), { uid: kullanici.uid });
  b.update(hesapRef(kullanici.uid), { puan: puan - 1, son: talepRef.id });
  await b.commit();
  return talepRef.id;
}

export async function talepAdresi(talepId) {
  const s = await getDoc(doc(db, 'talepler', talepId, 'gizli', 'adres'));
  return s.exists() ? s.data() : null;
}

const talepRef = (id) => doc(db, 'talepler', id);
const kitapRef = (id) => doc(db, 'kitaplar', id);

// Kabul edilir; aynı kitabın diğer bekleyen talepleri tek tek reddedilir (puanları iade edilir).
export async function talepKabul(talep, digerBekleyenler) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'kabul', kabulTarihi: serverTimestamp(), guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'rezerve', talepId: talep.id });
  await b.commit();
  for (const t of digerBekleyenler) await talepReddet(t).catch(() => {});
}
// Reddet / iptal: talep edenin harcadığı puan geri verilir.
async function puanIadeli(talep, durumu, ek = () => {}) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: durumu, guncelleme: Date.now() });
  await hesabaYaz(b, talep.isteyenId, talep.id, { puan: 1 });
  ek(b);
  await b.commit();
}
export const talepReddet = (talep) => puanIadeli(talep, 'red');
// Bekleyen talebi geri çekme ya da 7 gün kargolanmayan kabulden vazgeçme
export const talepIptal = (talep) => puanIadeli(talep, 'iptal', (b) => {
  if (talep.durum === 'kabul' && talep.kabulTarihi) b.update(kitapRef(talep.kitapId), { durum: 'musait' });
});
export const talepGeriCek = (talep) => puanIadeli(talep, 'red', (b) => b.update(kitapRef(talep.kitapId), { durum: 'musait' }));

// nereden: kitap sahibinin şehri. Kargoya verilince herkese açık, kişi bilgisi içermeyen bir "yolculuk" kaydı açılır
// (Haftanın yolculukları bölümü bunları gösterir).
export async function kargola(talep, firma, takipNo, nereden) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'kargoda', kargo: { firma, takipNo }, kargoTarihi: serverTimestamp(), guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'verildi' });
  if (nereden && talep.isteyenSehir) {
    b.set(doc(db, 'yolculuklar', talep.id), {
      kitapId: talep.kitapId, kitapAd: talep.kitapAd, kitapYazar: talep.kitapYazar || '', kitapFoto: talep.kitapFoto || '',
      nereden, nereye: talep.isteyenSehir, sahipId: talep.sahipId, isteyenId: talep.isteyenId,
      tarih: Date.now(), teslim: false,
    });
  }
  await b.commit();
}
// Teslim aldım: gönderene 1 puan. Daha önce "ulaşmadı" bildirildiyse o ihtar geri alınır.
export async function teslimAldim(talep) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'teslim', guncelleme: Date.now() });
  const geriAl = talep.sorun?.tur === 'ulasmadi';
  if (geriAl) b.delete(doc(db, 'ihtarlar', `${talep.id}_s`));
  await hesabaYaz(b, talep.sahipId, talep.id, { puan: 1, ihtar: geriAl ? -1 : 0 });
  await b.commit();
  // Eski talepler için yolculuk kaydı olmayabilir; yoksa sessizce geç.
  await updateDoc(doc(db, 'yolculuklar', talep.id), { teslim: true, teslimTarih: Date.now() }).catch(() => {});
}
// Kargodan 14 gün sonra itirazsız kalan gönderi: kitap sahibi tarafında teslim edilmiş sayılır.
export async function otomatikTeslim(talep) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'teslim', guncelleme: Date.now() });
  await hesabaYaz(b, talep.sahipId, talep.id, { puan: 1 });
  await b.commit();
  await updateDoc(doc(db, 'yolculuklar', talep.id), { teslim: true, teslimTarih: Date.now() }).catch(() => {});
}
// Kitap sahibi: kargo teslim alınmadan geri döndü → talep edene ihtar; kitap yeniden rafa
export async function iadeDondu(talep) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'iade', guncelleme: Date.now() });
  b.set(doc(db, 'ihtarlar', `${talep.id}_i`), { talepId: talep.id, verenId: talep.sahipId, hedefId: talep.isteyenId, tur: 'iade', tarih: serverTimestamp() });
  await hesabaYaz(b, talep.isteyenId, talep.id, { ihtar: 1 });
  await b.commit();
  await updateDoc(kitapRef(talep.kitapId), { durum: 'musait' }).catch(() => {});
}
// Talep eden: sorun bildirimi → kitap sahibine ihtar. tur: ulasmadi | tahsilat | bos
export async function sorunBildir(talep, tur) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { sorun: { tur, tarih: serverTimestamp() }, guncelleme: Date.now() });
  b.set(doc(db, 'ihtarlar', `${talep.id}_s`), { talepId: talep.id, verenId: talep.isteyenId, hedefId: talep.sahipId, tur, tarih: serverTimestamp() });
  await hesabaYaz(b, talep.sahipId, talep.id, { ihtar: 1 });
  await b.commit();
}

// ——— Değerlendirme ———
export const degerlendir = (talep, yildiz, uygun, yorum) => setDoc(doc(db, 'degerlendirmeler', talep.id), {
  sahipId: talep.sahipId, isteyenId: talep.isteyenId, yildiz, uygun, yorum: yorum || '', tarih: serverTimestamp(),
});
export async function degerlendirildiMi(talepId) {
  const s = await getDoc(doc(db, 'degerlendirmeler', talepId)).catch(() => null);
  return !!s?.exists();
}
// Gönderenin ortalama puanı
export async function sahipPuani(uid) {
  const s = await getDocs(query(collection(db, 'degerlendirmeler'), where('sahipId', '==', uid), limit(200)));
  const l = s.docs.map((d) => d.data());
  if (!l.length) return { ort: 0, adet: 0, uygun: 0 };
  return { ort: l.reduce((t, d) => t + d.yildiz, 0) / l.length, adet: l.length, uygun: l.filter((d) => d.uygun).length / l.length };
}

// ——— Güven kartı: talep edenin geçmişi ———
export async function guvenBilgisi(uid) {
  const y = collection(db, 'yolculuklar');
  const say = (alan) => getCountFromServer(query(y, where(alan, '==', uid), where('teslim', '==', true))).then((r) => r.data().count).catch(() => 0);
  const [hesap, profil, paylasti, aldi] = await Promise.all([hesapGetir(uid).catch(() => ({ ...BASLANGIC })), profilGetir(uid).catch(() => null), say('sahipId'), say('isteyenId')]);
  return { puan: hesap.puan, ihtar: hesap.ihtar, kayit: hesap.kayit || profil?.olusturma || 0, paylasti, aldi };
}

// ——— Engel ve şikâyet ———
const engelRef = (uid) => doc(db, 'kullanicilar', uid, 'ozel', 'engel');
export async function engelleriGetir(uid) {
  const s = await getDoc(engelRef(uid)).catch(() => null);
  return s?.exists() ? s.data().uidler || [] : [];
}
export const engelle = (uid, hedef, ekle) => setDoc(engelRef(uid), { uidler: ekle ? arrayUnion(hedef) : arrayRemove(hedef) }, { merge: true });
export const sikayetEt = (verenId, hedefTur, hedefId, sebep, aciklama) => setDoc(doc(collection(db, 'sikayetler')), {
  verenId, hedefTur, hedefId, sebep, aciklama: aciklama || '', tarih: serverTimestamp(),
});

export function yolculuklariDinle(cb, hata) {
  const q = query(collection(db, 'yolculuklar'), orderBy('tarih', 'desc'), limit(500));
  return onSnapshot(q, (s) => cb(listele(s)), hata);
}
