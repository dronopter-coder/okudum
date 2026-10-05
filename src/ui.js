// Ortak arayüz yardımcıları: ikonlar, kapak üretici, toast, alt sayfa (sheet), onay penceresi.
import {
  House, Search, Plus, Play, Volume2, Share2, Flag as Bayrak2, Ban, RotateCcw, AlertTriangle, Coins, ArrowLeftRight, User, ArrowLeft, Camera, Image, MapPin, Truck, Check, X,
  Package, BookOpen, Heart, Trash2, LogOut, ChevronRight, Send, Inbox, Copy, Info, Pencil,
  ShieldCheck, Sparkles, Mail, Lock, Eye, EyeOff, PackageCheck, CircleHelp, HandHeart, Undo2,
  BookMarked, SlidersHorizontal, Clock, Library, Map as HaritaIkon, MapPinned, Route, LocateFixed, Minus, Flag, TrendingUp,
  Trophy, Crown, Star, Medal,
} from 'lucide';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { bannerBastir } from './reklam.js';

const IKONLAR = {
  oynat: Play, ses: Volume2, paylas: Share2, bildir: Bayrak2, engel: Ban, iade: RotateCcw, uyari: AlertTriangle, puan: Coins, ev: House, ara: Search, arti: Plus, takas: ArrowLeftRight, kisi: User, geri: ArrowLeft,
  kamera: Camera, resim: Image, konum: MapPin, kargo: Truck, tik: Check, x: X, paket: Package,
  kitap: BookOpen, kalp: Heart, cop: Trash2, cikis: LogOut, sag: ChevronRight, gonder: Send,
  gelen: Inbox, kopya: Copy, bilgi: Info, kalem: Pencil, kalkan: ShieldCheck, parilti: Sparkles,
  posta: Mail, kilit: Lock, goz: Eye, gozKapali: EyeOff, teslim: PackageCheck, soru: CircleHelp,
  el: HandHeart, geriAl: Undo2, raf: BookMarked, filtre: SlidersHorizontal, saat: Clock, kutuphane: Library,
  kupa: Trophy, tac: Crown, yildiz: Star, madalya: Medal,
  harita: HaritaIkon, pin: MapPinned, rota: Route, merkez: LocateFixed, eksi: Minus, bayrak: Flag, yukselis: TrendingUp,
};

export function ikon(ad, boyut = 22, kalinlik = 2) {
  const dugum = IKONLAR[ad];
  if (!dugum) return '';
  const ic = dugum
    .map(([etiket, oz]) => `<${etiket} ${Object.entries(oz).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg class="ikon" width="${boyut}" height="${boyut}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${kalinlik}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic}</svg>`;
}

export const GOOGLE_LOGO = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

// HTML kaçışı — kullanıcı girdisi her zaman bundan geçer.
export function h(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const $ = (sec, kok = document) => kok.querySelector(sec);
export const $$ = (sec, kok = document) => [...kok.querySelectorAll(sec)];

export function titret(guc = 'hafif') {
  if (!Capacitor.isNativePlatform()) return;
  const stil = { hafif: ImpactStyle.Light, orta: ImpactStyle.Medium, guclu: ImpactStyle.Heavy }[guc];
  Haptics.impact({ style: stil }).catch(() => {});
}

// ——— Kapak üretici: fotoğrafı olmayan kitaplar için zarif, kitaba özgü bir kapak ———
const PALETLER = [
  ['#1E2235', '#F3E9D7', '#E8643A'],
  ['#3F6B57', '#F6EFE2', '#F0B43C'],
  ['#E8643A', '#FFF6EA', '#1E2235'],
  ['#F0B43C', '#2A2118', '#B5523A'],
  ['#6D5BB8', '#F5F0FF', '#F0B43C'],
  ['#B5523A', '#FBEFE6', '#F3D9A4'],
  ['#2F5D7C', '#EEF4F8', '#F08A5D'],
  ['#EADFCB', '#1E2235', '#3F6B57'],
  ['#7A2E3A', '#F7E8E2', '#E9B872'],
  ['#20363A', '#E9F0EA', '#8FBF9F'],
];
function ozet(s) {
  let x = 2166136261;
  for (const c of String(s)) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return Math.abs(x);
}
export function kapakRengi(kitap) {
  return PALETLER[ozet(kitap.ad + kitap.yazar) % PALETLER.length][0];
}
export function kapak(kitap, sinif = '') {
  if (kitap.foto) {
    return `<div class="kapak foto ${sinif}"><img src="${h(kitap.foto)}" alt="${h(kitap.ad)}" loading="lazy"/></div>`;
  }
  const n = ozet(kitap.ad + kitap.yazar);
  const [bg, fg, vurgu] = PALETLER[n % PALETLER.length];
  const desen = ['bant', 'daire', 'serit', 'cerceve'][(n >> 4) % 4];
  return `<div class="kapak uretilen desen-${desen} ${sinif}" style="--k-bg:${bg};--k-fg:${fg};--k-vurgu:${vurgu}">
    <span class="k-sus"></span>
    <span class="k-ad">${h(kitap.ad)}</span>
    <span class="k-yazar">${h(kitap.yazar)}</span>
  </div>`;
}

export function avatar(ad, foto, boyut = 40) {
  if (foto) return `<img class="avatar" style="width:${boyut}px;height:${boyut}px" src="${h(foto)}" alt="" referrerpolicy="no-referrer"/>`;
  const harf = (ad || '?').trim().charAt(0).toLocaleUpperCase('tr');
  const renk = PALETLER[ozet(ad || '?') % PALETLER.length];
  return `<span class="avatar harf" style="width:${boyut}px;height:${boyut}px;background:${renk[0]};color:${renk[1]};font-size:${boyut * 0.42}px">${h(harf)}</span>`;
}

export function zamanOnce(ms) {
  const fark = (Date.now() - ms) / 1000;
  if (fark < 60) return 'az önce';
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`;
  if (fark < 86400 * 7) return `${Math.floor(fark / 86400)} gün önce`;
  return new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

// ——— Toast ———
let toastZaman;
export function toast(mesaj, tur = 'bilgi') {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  clearTimeout(toastZaman);
  el.hidden = false;
  el.className = `toast t-${tur}`;
  el.innerHTML = `${ikon(tur === 'hata' ? 'x' : tur === 'basari' ? 'tik' : 'bilgi', 18, 2.5)}<span>${h(mesaj)}</span>`;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('acik')));
  toastZaman = setTimeout(() => {
    el.classList.remove('acik');
    // Kayma animasyonu bitince tamamen kaldır: bazı telefonlarda ekranın üstünde yarım kalmasın.
    toastZaman = setTimeout(() => { el.hidden = true; }, 450);
  }, 2800);
}

// ——— Alt sayfa (bottom sheet) ———
// Açık alt sayfalar (en üstteki sonda). Telefonun geri tuşu önce bunları kapatır.
const acikSayfalar = [];
export function ustSayfayiKapat() {
  const ust = acikSayfalar[acikSayfalar.length - 1];
  if (!ust) return false;
  ust.kapat();
  return true;
}

export function sayfaAc(icerik, { sinif = '' } = {}) {
  const kap = document.createElement('div');
  kap.className = 'sheet-kap';
  kap.innerHTML = `<div class="sheet-perde"></div><div class="sheet ${sinif}"><div class="sheet-tutamak"></div>${icerik}</div>`;
  document.body.appendChild(kap);
  bannerBastir(true);
  requestAnimationFrame(() => requestAnimationFrame(() => kap.classList.add('acik')));
  let kapandi = false;
  let cozucu;
  const kayit = { kapat: () => kapatVeGeri() };
  acikSayfalar.push(kayit);
  const bitti = new Promise((r) => { cozucu = r; });
  const kapat = () => {
    if (kapandi) return;
    kapandi = true;
    acikSayfalar.splice(acikSayfalar.indexOf(kayit), 1);
    kap.classList.remove('acik');
    bannerBastir(false);
    window.removeEventListener('popstate', geriTusu);
    setTimeout(() => { kap.remove(); cozucu(); }, 300);
  };
  // Android geri tuşu sayfayı kapatsın: açılırken bir geçmiş kaydı eklenir.
  const geriTusu = () => kapat();
  history.pushState({ sheet: true }, '');
  window.addEventListener('popstate', geriTusu);
  // kapat(): geçmiş kaydını geri alır ve sayfa tamamen kapanınca çözülür (ardından gezinmek güvenli).
  const kapatVeGeri = () => {
    if (!kapandi) {
      if (history.state?.sheet) history.back();
      else kapat();
    }
    return bitti;
  };
  $('.sheet-perde', kap).addEventListener('click', kapatVeGeri);
  $$('[data-kapat]', kap).forEach((b) => b.addEventListener('click', kapatVeGeri));
  return { el: $('.sheet', kap), kapat: kapatVeGeri, bitti };
}

export function onayla(baslik, metin, { evet = 'Evet', hayir = 'Vazgeç', tehlike = false } = {}) {
  return new Promise((coz) => {
    let sonuc = false;
    const s = sayfaAc(`
      <h3 class="sheet-baslik">${h(baslik)}</h3>
      <p class="sheet-metin">${h(metin)}</p>
      <div class="dugme-satir">
        <button class="dugme ikincil" data-kapat>${h(hayir)}</button>
        <button class="dugme ${tehlike ? 'tehlike' : 'ana'}" data-evet>${h(evet)}</button>
      </div>`);
    $('[data-evet]', s.el).addEventListener('click', () => { sonuc = true; s.kapat(); });
    s.bitti.then(() => coz(sonuc));
  });
}

export function yukleniyor(dugme, durum) {
  if (durum) {
    dugme.dataset.metin = dugme.innerHTML;
    dugme.innerHTML = '<span class="donen"></span>';
    dugme.disabled = true;
  } else if (dugme.dataset.metin) {
    dugme.innerHTML = dugme.dataset.metin;
    dugme.disabled = false;
  }
}

// Fotoğrafı küçült ve JPEG'e çevir (yükleme boyutu ve depolama için)
export async function fotoKucult(kaynak, enFazla = 1200, kalite = 0.82) {
  const img = new window.Image();
  img.src = kaynak;
  await img.decode();
  const oran = Math.min(1, enFazla / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * oran);
  c.height = Math.round(img.naturalHeight * oran);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', kalite);
}

// Ortadan kare kırp ve küçük JPEG'e çevir (profil fotoğrafı: ~4-6 KB, kitap/talep kayıtlarına da yazılabilsin)
export async function fotoKare(kaynak, boyut = 144, kalite = 0.75) {
  const img = new window.Image();
  img.src = kaynak;
  await img.decode();
  const kenar = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = boyut;
  c.height = boyut;
  c.getContext('2d').drawImage(img, (img.naturalWidth - kenar) / 2, (img.naturalHeight - kenar) / 2, kenar, kenar, 0, 0, boyut, boyut);
  return c.toDataURL('image/jpeg', kalite);
}

export function hataMetni(e) {
  const k = e?.code || '';
  const tablo = {
    'auth/invalid-email': 'E-posta adresi geçersiz.',
    'auth/missing-password': 'Şifre girmelisin.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.',
    'auth/invalid-credential': 'E-posta ya da şifre hatalı.',
    'auth/wrong-password': 'E-posta ya da şifre hatalı.',
    'auth/user-not-found': 'Bu e-postayla kayıtlı hesap bulunamadı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'auth/network-request-failed': 'İnternet bağlantısı yok gibi görünüyor.',
    'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
    'permission-denied': 'Bu işlem için yetkin yok.',
    'okudum/telefon-gecersiz': 'Cep telefonu numaranı 05xx xxx xx xx biçiminde yaz.',
    'okudum/telefon-baska-hesapta': 'Bu telefon numarası başka bir Okudum hesabında kayıtlı. Her numara yalnızca bir hesapta kullanılabilir.',
    'okudum/puan-yok': 'Puanın kalmadı. Bir kitap paylaşınca yeniden kitap isteyebilirsin.',
    unavailable: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.',
  };
  if (tablo[k]) return tablo[k];
  if (/cancel/i.test(e?.message || '')) return 'Giriş iptal edildi.';
  return e?.message || 'Bir şeyler ters gitti.';
}
