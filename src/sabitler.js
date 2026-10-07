// İlk üç tür sabit; gerisi Türkçe alfabeye göre ("Diğer" en sonda)
const ONCE = ['Türk Klasikleri', 'Dünya Klasikleri', 'Roman'];
const DIGERLERI = [
  'Akademik', 'Bilgisayar', 'Bilim', 'Bilim Kurgu', 'Biyografi', 'Çocuk', 'Ders & Sınav', 'Din', 'Ekonomi',
  'Felsefe', 'Gençlik', 'Kişisel Gelişim', 'Polisiye', 'Psikoloji', 'Sağlık', 'Seyahatname', 'Siyaset',
  'Sosyoloji', 'Şehir Kitapları', 'Şiir', 'Tarih',
].sort((a, b) => a.localeCompare(b, 'tr'));
export const KATEGORILER = [...ONCE, ...DIGERLERI, 'Diğer'];

export const KONDISYONLAR = [
  { id: 'yeni', ad: 'Yeni gibi', renk: '#3F6B57' },
  { id: 'iyi', ad: 'İyi', renk: '#4E7FB0' },
  { id: 'okunmus', ad: 'Okunmuş', renk: '#C9902A' },
  { id: 'yipranmis', ad: 'Yıpranmış', renk: '#B5523A' },
];
export const kondisyon = (id) => KONDISYONLAR.find((k) => k.id === id) || KONDISYONLAR[1];

// Talep akışı: bekliyor → kabul → kargoda → teslim  (yan yollar: red, iptal)
export const TALEP_DURUM = {
  bekliyor: { ad: 'Onay bekliyor', renk: '#C9902A', adim: 1 },
  kabul: { ad: 'Kabul edildi', renk: '#4E7FB0', adim: 2 },
  kargoda: { ad: 'Kargoda', renk: '#8A6BD0', adim: 3 },
  teslim: { ad: 'Teslim alındı', renk: '#3F6B57', adim: 4 },
  red: { ad: 'Reddedildi', renk: '#9A8F80', adim: 0 },
  iptal: { ad: 'İptal edildi', renk: '#9A8F80', adim: 0 },
  iade: { ad: 'Kargo iade döndü', renk: '#B5423A', adim: 0 },
};
export const AKTIF_TALEP = ['bekliyor', 'kabul', 'kargoda'];

export const KITAP_DURUM = {
  musait: 'Müsait',
  rezerve: 'Ayrıldı',
  verildi: 'Yeni okuruna gitti',
};

export const KARGO_FIRMALARI = [
  'Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo',
  'HepsiJET', 'Kolay Gelsin', 'Trendyol Express', 'DHL eCommerce', 'Diğer',
];

export const ILLER = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan',
  'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne',
  'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay',
  'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu',
  'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya',
  'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize',
  'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon',
  'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];
