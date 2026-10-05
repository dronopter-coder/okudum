// AdMob reklamları: alt banner + ara sıra geçiş (interstitial) reklamı.
// Reklam birimleri aşağıdaki REKLAM bloğunda; Android uygulama kimliği (ca-app-pub-…~…)
// derleme iş akışında (.github/workflows/apk.yml) manifest'e yazılır.
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, RewardInterstitialAdPluginEvents } from '@capacitor-community/admob';

const PLATFORM = Capacitor.getPlatform();

// Android: gerçek AdMob birimleri. iOS: AdMob'da ayrı iOS uygulaması açılana kadar Google'ın test birimleri.
const REKLAM = PLATFORM === 'ios' ? {
  test: true,
  banner: 'ca-app-pub-3940256099942544/2934735716',
  gecis: 'ca-app-pub-3940256099942544/4411468910',
  odullu: 'ca-app-pub-3940256099942544/6978759866',
} : {
  test: false,
  banner: 'ca-app-pub-3204109869365538/8087489488',
  gecis: 'ca-app-pub-3204109869365538/9839554854',
  odullu: 'ca-app-pub-3204109869365538/3414651264', // ödüllü geçiş: haftanın 2. kitap talebi
};

const ETKIN = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AdMob');
let hazir = false;
let bannerAcik = false;
let bannerIstenen = false;
let sonGecis = Date.now(); // açılıştan hemen sonra geçiş reklamı gösterme
let eylemSayaci = 0;

const yukseklikAyarla = (px) => document.documentElement.style.setProperty('--reklam-h', `${px}px`);

export async function reklamlariBaslat() {
  if (!ETKIN || hazir) return;
  try {
    if (PLATFORM === 'ios') {
      try {
        const t = await AdMob.trackingAuthorizationStatus();
        if (t?.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      } catch {}
    }
    // AB/BK kullanıcıları için Google UMP onay penceresi (mesaj AdMob > Gizlilik ve mesajlaşma'dan tanımlanır)
    try {
      let bilgi = await AdMob.requestConsentInfo();
      if (bilgi?.status === 'REQUIRED' && bilgi.isConsentFormAvailable) bilgi = await AdMob.showConsentForm();
      if (bilgi?.canRequestAds === false) return;
    } catch {}
    await AdMob.initialize({ initializeForTesting: REKLAM.test });
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (b) => { sonYukseklik = b?.height || 0; if (bannerAcik && !bastirma) yukseklikAyarla(sonYukseklik); });
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => yukseklikAyarla(0));
    hazir = true;
    if (bannerIstenen) bannerGoster(true);
  } catch (e) {
    console.warn('AdMob başlatılamadı', e);
  }
}

// Banner yalnızca sekmeli ana ekranlarda görünür; giriş, form ve detay ekranlarında gizlenir.
export async function bannerGoster(goster) {
  bannerIstenen = goster;
  if (!hazir || goster === bannerAcik) return;
  bannerAcik = goster;
  try {
    if (goster) {
      await AdMob.showBanner({
        adId: REKLAM.banner, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0, isTesting: REKLAM.test,
      });
      if (bastirma > 0) { yukseklikAyarla(0); await AdMob.hideBanner(); }
    } else {
      yukseklikAyarla(0);
      await AdMob.removeBanner();
    }
  } catch {
    bannerAcik = false;
    yukseklikAyarla(0);
  }
}

// Alt pencere (sheet) açıkken banner gizlenir: reklam düğmelerin üzerine binmesin.
let bastirma = 0;
let sonYukseklik = 0;
export async function bannerBastir(acik) {
  bastirma = Math.max(0, bastirma + (acik ? 1 : -1));
  if (!hazir || !bannerAcik) return;
  try {
    if (bastirma > 0) {
      yukseklikAyarla(0);
      await AdMob.hideBanner();
    } else {
      await AdMob.resumeBanner();
      yukseklikAyarla(sonYukseklik);
    }
  } catch {}
}

// Kullanıcıyı yormamak için: her 3. önemli işlemde ve en az 3 dakikada bir.
export async function gecisReklami() {
  if (!hazir) return;
  eylemSayaci++;
  if (eylemSayaci % 3 !== 0 || Date.now() - sonGecis < 3 * 60 * 1000) return;
  sonGecis = Date.now();
  try {
    await AdMob.prepareInterstitial({ adId: REKLAM.gecis, isTesting: REKLAM.test });
    await AdMob.showInterstitial();
  } catch {}
}

// Ödüllü geçiş reklamı. Sonuç: 'odul' (izlendi), 'yok' (reklam yüklenemedi), 'kapatildi' (ödülden önce kapatıldı).
// Reklam sistemi hiç yoksa (web/demo) 'yok' döner; çağıran taraf buna göre karar verir.
export async function odulluReklam() {
  if (!ETKIN) return 'yok';
  if (!hazir) await reklamlariBaslat();
  if (!hazir) return 'yok';
  let odul = false;
  let gosterilemedi = false;
  const dinleyiciler = [];
  try {
    dinleyiciler.push(await AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, () => { odul = true; }));
    await AdMob.prepareRewardInterstitialAd({ adId: REKLAM.odullu, isTesting: REKLAM.test });
  } catch {
    dinleyiciler.forEach((d) => d.remove?.());
    return 'yok';
  }
  try {
    // Gösterim sözü yalnızca ödül kazanılınca çözülür; erken kapatmada çözülmez. Bu yüzden kapanma olayı beklenir.
    let bitir;
    const kapandi = new Promise((r) => { bitir = r; });
    dinleyiciler.push(await AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => bitir()));
    dinleyiciler.push(await AdMob.addListener(RewardInterstitialAdPluginEvents.FailedToShow, () => { gosterilemedi = true; bitir(); }));
    AdMob.showRewardInterstitialAd().then(() => { odul = true; }, () => { gosterilemedi = true; bitir(); });
    await kapandi;
    sonGecis = Date.now(); // hemen ardından bir de geçiş reklamı çıkmasın
    return odul ? 'odul' : gosterilemedi ? 'yok' : 'kapatildi';
  } catch {
    return odul ? 'odul' : 'yok';
  } finally {
    dinleyiciler.forEach((d) => d.remove?.());
  }
}
