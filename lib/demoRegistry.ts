// S-Invite — Comprehensive Demo Registry & Full Template Data Composer
// Maps each template theme to a distinct, beautiful couple persona and real WebP photo set,
// generating 100% of all sections (Journey of Love, Gallery, Gift, QR Pass, Dresscode, etc.).

import { COLOR_PALETTES } from "@/lib/themeEngine";

export interface DemoThemeData {
  themeId: string;
  themeName: string;
  series: string;
  category: "premium" | "modern" | "traditional";
  tagline: string;
  
  // Couple Profile
  groomName: string;
  brideName: string;
  groomDisplayName: string;
  brideDisplayName: string;
  groomRole: string;
  brideRole: string;
  groomParents: string;
  brideParents: string;
  groomInstagram: string;
  brideInstagram: string;
  monogramInitial: string;
  
  // Event & Date
  targetDate: string;
  weddingDateFormatted: string;
  weddingDateDay: string;
  weddingDateMonth: string;
  weddingDateYear: string;
  openingQuote: string;
  openingQuoteRef: string;
  city: string;
  
  // Curated WebP Photo Assets
  globalBgUrl: string;
  groomPhotoUrl: string;
  bridePhotoUrl: string;
  sidebarPhotoUrl: string;
  landingCoverUrl: string;
  galleryPhotos: string[];
  
  // Events
  events: Array<{
    badge: string;
    title: string;
    time: string;
    location: string;
    address: string;
    mapsUrl: string;
  }>;
  
  // Love Stories
  stories: Array<{
    chapter: string;
    title: string;
    content: string;
  }>;
  
  // Bank Accounts
  banks: Array<{
    bank: string;
    number: string;
    name: string;
  }>;
  
  dressCodeColors: string;
  dressCodeNote: string;
  turutMengundang: string[];
}

export const DEMO_REGISTRY: Record<string, DemoThemeData> = {
  kalandra: {
    themeId: "kalandra",
    themeName: "Kalandra",
    series: "Premium Series",
    category: "premium",
    tagline: "THE WEDDING OF",
    groomName: "Raditya",
    brideName: "Alana",
    groomDisplayName: "Raditya Pratama, S.T.",
    brideDisplayName: "Alana Khairunnisa, B.Des.",
    groomRole: "The Groom",
    brideRole: "The Bride",
    groomParents: "Putra Kedua dari Bpk. Ir. Hendra Pratama & Ibu Ratna Dewi",
    brideParents: "Putri Pertama dari Bpk. Dr. Faisal Basri & Ibu Soraya Latief",
    groomInstagram: "raditya.pratama",
    brideInstagram: "alana.khairunnisa",
    monogramInitial: "R & A",
    targetDate: "2026-11-14T08:00:00",
    weddingDateFormatted: "Sabtu, 14 November 2026",
    weddingDateDay: "14",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.",
    openingQuoteRef: "QS. AR-RUM : 21",
    city: "Jakarta",
    globalBgUrl: "/example/pio08917.webp",
    groomPhotoUrl: "/example/pio08903.webp",
    bridePhotoUrl: "/example/pio08907.webp",
    sidebarPhotoUrl: "/example/pio08913.webp",
    landingCoverUrl: "/example/pio08919.webp",
    galleryPhotos: [
      "/example/pio08921.webp",
      "/example/pio08926.webp",
      "/example/pio08927.webp",
      "/example/pio08931.webp",
      "/example/pio08933.webp",
      "/example/pio08935.webp",
      "/example/pio08947.webp",
      "/example/pio08952.webp",
    ],
    events: [
      {
        badge: "SAKRAMEN / AKAD",
        title: "Akad Nikah",
        time: "08.00 – 10.00 WIB",
        location: "The Glass House, Plataran Dharmawangsa",
        address: "Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI GLAMOUR",
        title: "Resepsi Pernikahan",
        time: "11.30 – 14.30 WIB",
        location: "Grand Pavilion Plataran Dharmawangsa",
        address: "Jl. Dharmawangsa Raya No. 6, Kebayoran Baru, Jakarta Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Chapter 01",
        title: "Pertemuan Tak Terduga",
        content: "Bertemu pertama kali di sebuah studio arsitektur di bilangan Senopati tahun 2021.",
      },
      {
        chapter: "Chapter 02",
        title: "Bertumbuh Bersama",
        content: "Melewati ratusan cangkir kopi dan diskusi panjang, kami menyadari arah hati yang sama.",
      },
      {
        chapter: "Chapter 03",
        title: "Janji Setia",
        content: "Di bawah langit senja Jakarta, kami berjanji untuk melangkah bersama selamanya.",
      },
    ],
    banks: [
      { bank: "BCA", number: "8801294812", name: "Alana Khairunnisa" },
      { bank: "Bank Mandiri", number: "1370019284710", name: "Raditya Pratama" },
    ],
    dressCodeColors: "#1a1a1a, #8c7355, #f5f0ea",
    dressCodeNote: "Formal Monochrome / Editorial Chic (Hitam, Nuansa Earth Tone & Champagne)",
    turutMengundang: [
      "Keluarga Besar Bpk. Ir. Hendra Pratama (Jakarta)",
      "Keluarga Besar Bpk. Dr. Faisal Basri (Bandung)",
      "Keluarga Besar Alumni Arsitektur ITB 2017",
    ],
  },

  valente: {
    themeId: "valente",
    themeName: "Valente",
    series: "Premium Series",
    category: "premium",
    tagline: "A CELEBRATION OF LOVE",
    groomName: "Julian",
    brideName: "Valerie",
    groomDisplayName: "Julian Alexander, B.A.",
    brideDisplayName: "Valerie Santoso, M.M.",
    groomRole: "Groom",
    brideRole: "Bride",
    groomParents: "Son of Mr. Robert Alexander & Mrs. Shirley Wijaya",
    brideParents: "Daughter of Mr. David Santoso & Mrs. Linda Hartono",
    groomInstagram: "julian.alex",
    brideInstagram: "valeriesantoso",
    monogramInitial: "J & V",
    targetDate: "2026-12-05T16:00:00",
    weddingDateFormatted: "Sabtu, 05 Desember 2026",
    weddingDateDay: "05",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Two souls with but a single thought, two hearts that beat as one.",
    openingQuoteRef: "JOHN KEATS",
    city: "Bali",
    globalBgUrl: "/example/pio08947.webp",
    groomPhotoUrl: "/example/pio08943.webp",
    bridePhotoUrl: "/example/pio08952.webp",
    sidebarPhotoUrl: "/example/pio08954.webp",
    landingCoverUrl: "/example/pio08957.webp",
    galleryPhotos: [
      "/example/pio08962.webp",
      "/example/pio08967.webp",
      "/example/pio08980.webp",
      "/example/pio08982.webp",
      "/example/pio08985.webp",
      "/example/pio08987.webp",
    ],
    events: [
      {
        badge: "HOLY MATRIMONY",
        title: "Holy Matrimony",
        time: "15.30 WITA",
        location: "Cliffside Chapel, The Mulia Resort",
        address: "Jl. Raya Nusa Dua Selatan, Sawangan, Nusa Dua, Bali",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "SUNSET RECEPTION",
        title: "Sunset Dinner & After Party",
        time: "18.30 WITA",
        location: "Beachfront Ocean Lawn, The Mulia Resort",
        address: "Jl. Raya Nusa Dua Selatan, Nusa Dua, Bali",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Chapter 01",
        title: "The First Glimpse",
        content: "We crossed paths on a summer sunset in Uluwatu back in 2020.",
      },
      {
        chapter: "Chapter 02",
        title: "Adventures Together",
        content: "From spontaneous road trips to climbing mountain ridges together.",
      },
      {
        chapter: "Chapter 03",
        title: "Forever & Always",
        content: "Under the stars of Labuan Bajo, he knelt down and asked the question of a lifetime.",
      },
    ],
    banks: [
      { bank: "BCA", number: "5271890234", name: "Valerie Santoso" },
    ],
    dressCodeColors: "#a85d42, #d4a373, #fefae0",
    dressCodeNote: "Sunset Warm Terracotta & Champagne Beach Chic",
    turutMengundang: [
      "The Alexander Family (Singapore)",
      "The Santoso Family (Surabaya)",
    ],
  },

  aurelia: {
    themeId: "aurelia",
    themeName: "Aurelia",
    series: "Premium Series",
    category: "premium",
    tagline: "ROYAL LUXURY CELEBRATION",
    groomName: "Arjuna",
    brideName: "Aurelia",
    groomDisplayName: "Arjuna Wibowo, S.E., M.B.A.",
    brideDisplayName: "Aurelia Geraldine, S.Sn.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra Sulung dari Bpk. Ir. Gunawan Wibowo & Ibu Cynthia Wibowo",
    brideParents: "Putri Bungsu dari Bpk. Henry Geraldine & Ibu Melani Geraldine",
    groomInstagram: "arjuna.wibowo",
    brideInstagram: "aureliageraldine",
    monogramInitial: "A & A",
    targetDate: "2026-10-25T10:00:00",
    weddingDateFormatted: "Minggu, 25 Oktober 2026",
    weddingDateDay: "25",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "Di mana cinta sejati bersemi, di sanalah berkah dan keabadian Tuhan menyinari setiap langkah.",
    openingQuoteRef: "LUXURY WEDDING ANTHOLOGY",
    city: "Jakarta",
    globalBgUrl: "/example/pio08995.webp",
    groomPhotoUrl: "/example/pio08991.webp",
    bridePhotoUrl: "/example/pio08992.webp",
    sidebarPhotoUrl: "/example/pio08999.webp",
    landingCoverUrl: "/example/pio09000.webp",
    galleryPhotos: [
      "/example/pio09003.webp",
      "/example/pio09008.webp",
      "/example/pio09012.webp",
      "/example/pio09020.webp",
      "/example/pio09025.webp",
      "/example/pio09026.webp",
    ],
    events: [
      {
        badge: "PEMBERKATAN",
        title: "Pemberkatan Pernikahan",
        time: "10.00 – 11.30 WIB",
        location: "Katedral St. Maria Diangkat ke Surga",
        address: "Jl. Katedral No. 7B, Pasar Baru, Jakarta Pusat",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "GRAND RECEPTION",
        title: "Grand Ballroom Reception",
        time: "19.00 – 22.00 WIB",
        location: "Grand Ballroom The Ritz-Carlton",
        address: "Mega Kuningan Barat No. 1, Jakarta Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Momen 01",
        title: "Awal Kisah",
        content: "Pertemuan manis dalam sebuah pameran seni rupa klasik di Vienna tahun 2022.",
      },
      {
        chapter: "Momen 02",
        title: "Dua Hati Menyatu",
        content: "Menyatukan dua impian besar dalam harmoni rasa saling menghargai dan menyayangi.",
      },
    ],
    banks: [
      { bank: "BCA Prioritas", number: "0081293847", name: "Arjuna Wibowo" },
    ],
    dressCodeColors: "#bfa15f, #1a1a1a, #ffffff",
    dressCodeNote: "Black Tie & Classic Luxury Gold / Evening Gown",
    turutMengundang: [
      "Keluarga Besar Bpk. Ir. Gunawan Wibowo",
      "Keluarga Besar Bpk. Henry Geraldine",
    ],
  },

  artisan: {
    themeId: "artisan",
    themeName: "Artisan",
    series: "Premium Series",
    category: "premium",
    tagline: "HANDCRAFTED IN LOVE",
    groomName: "Dimas",
    brideName: "Kiara",
    groomDisplayName: "Dimas Anggara, S.Ars.",
    brideDisplayName: "Kiara Anindita, S.I.Kom.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Bambang Sutrisno & Ibu Endang Lestari",
    brideParents: "Putri dari Bpk. Agus Wicaksono & Ibu Rini Handayani",
    groomInstagram: "dimas.anggara",
    brideInstagram: "kiaraanindita",
    monogramInitial: "D & K",
    targetDate: "2026-11-28T09:00:00",
    weddingDateFormatted: "Sabtu, 28 November 2026",
    weddingDateDay: "28",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Cinta sederhana yang tulus adalah karya seni paling indah yang pernah diciptakan.",
    openingQuoteRef: "ARTISAN WEDDING CHRONICLE",
    city: "Bandung",
    globalBgUrl: "/example/pio09055.webp",
    groomPhotoUrl: "/example/pio09044.webp",
    bridePhotoUrl: "/example/pio09046.webp",
    sidebarPhotoUrl: "/example/pio09048.webp",
    landingCoverUrl: "/example/pio09053.webp",
    galleryPhotos: [
      "/example/pio09058.webp",
      "/example/pio09064.webp",
      "/example/pio09070.webp",
      "/example/pio09076.webp",
      "/example/pio09083.webp",
      "/example/pio09091.webp",
    ],
    events: [
      {
        badge: "CEREMONY",
        title: "Intimate Ceremony",
        time: "09.00 – 11.00 WIB",
        location: "Pine Hill Forest",
        address: "Jl. Maribaya Timur, Cibodas, Lembang, Bandung",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI RUSTIC",
        title: "Rustic Garden Reception",
        time: "14.00 – 17.00 WIB",
        location: "Glass Pavilion Pine Hill",
        address: "Lembang, Bandung Barat",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Awal Cerita",
        title: "Secangkir Kopi Pagi",
        content: "Bertemu di sebuah kedai kopi vintage di Braga, berbicara tentang desain dan buku.",
      },
    ],
    banks: [
      { bank: "Bank Mandiri", number: "1300019284712", name: "Dimas Anggara" },
    ],
    dressCodeColors: "#736b5e, #c2b69d, #faf8f5",
    dressCodeNote: "Earthy Botanical & Warm Linen Tones",
    turutMengundang: [
      "Keluarga Besar Bpk. Bambang Sutrisno",
      "Keluarga Besar Bpk. Agus Wicaksono",
    ],
  },

  wave: {
    themeId: "wave",
    themeName: "Wave",
    series: "Modern Series",
    category: "modern",
    tagline: "MODERN LIQUID CINEMA",
    groomName: "Kevin",
    brideName: "Clarissa",
    groomDisplayName: "Kevin Sanjaya, B.Sc.",
    brideDisplayName: "Clarissa Tanuwidjaja, B.A.",
    groomRole: "The Groom",
    brideRole: "The Bride",
    groomParents: "Putra dari Bpk. Surya Sanjaya & Ibu Meilani Sanjaya",
    brideParents: "Putri dari Bpk. Franky Tanuwidjaja & Ibu Evelyn Hartarto",
    groomInstagram: "kevinsanjaya",
    brideInstagram: "clarissatan",
    monogramInitial: "K & C",
    targetDate: "2026-10-18T17:00:00",
    weddingDateFormatted: "Minggu, 18 Oktober 2026",
    weddingDateDay: "18",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "In the depth of the ocean of life, we found the rhythm of our destiny together.",
    openingQuoteRef: "THE WAVE JOURNAL",
    city: "Surabaya",
    globalBgUrl: "/example/pio09126.webp",
    groomPhotoUrl: "/example/pio09112.webp",
    bridePhotoUrl: "/example/pio09115.webp",
    sidebarPhotoUrl: "/example/pio09130.webp",
    landingCoverUrl: "/example/pio09137.webp",
    galleryPhotos: [
      "/example/pio09154.webp",
      "/example/pio09166.webp",
      "/example/pio09173.webp",
      "/example/pio09183.webp",
      "/example/pio09191.webp",
      "/example/pio09192.webp",
    ],
    events: [
      {
        badge: "PEMBERKATAN",
        title: "Sunset Holy Matrimony",
        time: "16.30 WIB",
        location: "Sky Lounge Ballroom, Pakuwon Tower",
        address: "Jl. Mayjen Yono Suwoyo No. 2, Surabaya",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "NIGHT RECEPTION",
        title: "Night Wave Reception",
        time: "19.00 WIB",
        location: "Grand Ballroom Pakuwon City",
        address: "Surabaya, Jawa Timur",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Wave 01",
        title: "First Harmony",
        content: "First met under the neon lights of Melbourne during our graduate years.",
      },
    ],
    banks: [
      { bank: "BCA", number: "6281092847", name: "Clarissa Tanuwidjaja" },
    ],
    dressCodeColors: "#2c3e50, #7f8c8d, #ecf0f1",
    dressCodeNote: "Moody Slate, Deep Navy & Silver Glam",
    turutMengundang: [
      "Keluarga Besar Bpk. Surya Sanjaya",
      "Keluarga Besar Bpk. Franky Tanuwidjaja",
    ],
  },

  papercut: {
    themeId: "papercut",
    themeName: "Papercut",
    series: "Modern Series",
    category: "modern",
    tagline: "SCRAPBOOK MEMORIES & POLAROIDS",
    groomName: "Rafi",
    brideName: "Maudy",
    groomDisplayName: "Rafi Alamsyah, S.Sn.",
    brideDisplayName: "Maudy Ayunda Putri, S.Pd.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Ir. Rasyid Alamsyah & Ibu Nurul Hidayah",
    brideParents: "Putri dari Bpk. Dedi Supriyadi & Ibu Maya Anggraeni",
    groomInstagram: "rafi.alamsyah",
    brideInstagram: "maudy.putri",
    monogramInitial: "R & M",
    targetDate: "2026-09-19T09:00:00",
    weddingDateFormatted: "Sabtu, 19 September 2026",
    weddingDateDay: "19",
    weddingDateMonth: "09",
    weddingDateYear: "2026",
    openingQuote: "Setiap potongan kisah kita terukir indah, tersusun manis menjadi perjalanan hidup yang abadi.",
    openingQuoteRef: "CATATAN CINTA KITA",
    city: "Yogyakarta",
    globalBgUrl: "/example/pio09271.webp",
    groomPhotoUrl: "/example/pio09197.webp",
    bridePhotoUrl: "/example/pio09200.webp",
    sidebarPhotoUrl: "/example/pio09210.webp",
    landingCoverUrl: "/example/pio09217.webp",
    galleryPhotos: [
      "/example/pio09228.webp",
      "/example/pio09252.webp",
      "/example/pio09261.webp",
      "/example/pio09264.webp",
      "/example/pio09280.webp",
      "/example/pio09292.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Santai",
        time: "09.00 – 11.00 WIB",
        location: "Omah Pakem",
        address: "Jl. Cangkringan KM 1.8, Pakem, Kaliurang, Sleman, Yogyakarta",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "GARDEN PARTY",
        title: "Pesta Kebun Senja",
        time: "15.30 – 19.30 WIB",
        location: "Amphitheater Omah Pakem",
        address: "Kaliurang, Sleman, D.I. Yogyakarta",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Memori 01",
        title: "Kamera Analog",
        content: "Satu rol film kamera analog yang merekam senyum pertamamu di Kaliurang.",
      },
    ],
    banks: [
      { bank: "BCA", number: "8465029182", name: "Maudy Ayunda" },
    ],
    dressCodeColors: "#6e5849, #b08968, #ede0d4",
    dressCodeNote: "Vintage Earthy, Pastel Cream & Warm Brown",
    turutMengundang: [
      "Keluarga Besar Bpk. Ir. Rasyid Alamsyah",
      "Keluarga Besar Bpk. Dedi Supriyadi",
    ],
  },

  ameera: {
    themeId: "ameera",
    themeName: "Ameera",
    series: "Modern Series",
    category: "modern",
    tagline: "CONTEMPORARY HERITAGE",
    groomName: "Farhan",
    brideName: "Ameera",
    groomDisplayName: "Farhan Malik, S.Kom.",
    brideDisplayName: "Ameera Zhafira, S.E.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. H. Malik Ibrahim & Ibu Hj. Zahra Malik",
    brideParents: "Putri dari Bpk. Ir. H. Firdaus & Ibu Hj. Aminah Firdaus",
    groomInstagram: "farhan.malik",
    brideInstagram: "ameera.zhafira",
    monogramInitial: "F & A",
    targetDate: "2026-10-10T08:00:00",
    weddingDateFormatted: "Sabtu, 10 Oktober 2026",
    weddingDateDay: "10",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "Menjalin dua keturunan mulia dalam naungan cinta, ridho, dan doa kebaikan yang tulus.",
    openingQuoteRef: "THE HERITAGE OF AMEERA",
    city: "Surakarta",
    globalBgUrl: "/example/pio09310.webp",
    groomPhotoUrl: "/example/pio09294.webp",
    bridePhotoUrl: "/example/pio09304.webp",
    sidebarPhotoUrl: "/example/pio09315.webp",
    landingCoverUrl: "/example/pio09338.webp",
    galleryPhotos: [
      "/example/pio09335.webp",
      "/example/pio09351.webp",
      "/example/pio09367.webp",
      "/example/pio09370.webp",
      "/example/pio09380.webp",
      "/example/pio09381.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Khidmat",
        time: "08.00 – 10.00 WIB",
        location: "Masjid Raya Sheikh Zayed",
        address: "Jl. Ahmad Yani No. 128, Gilingan, Banjarsari, Surakarta",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI HERITAGE",
        title: "Resepsi Kontemporer",
        time: "11.30 – 14.00 WIB",
        location: "Convention Hall De Tjolomadoe",
        address: "Jl. Adi Sucipto No. 1, Karanganyar, Surakarta",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Kisah 01",
        title: "Ta'aruf & Doa",
        content: "Diawali dengan niat suci dan silaturahmi kedua keluarga yang penuh restu.",
      },
    ],
    banks: [
      { bank: "BSI (Bank Syariah)", number: "7192847102", name: "Ameera Zhafira" },
    ],
    dressCodeColors: "#3d342d, #8d7b68, #f5efe6",
    dressCodeNote: "Contemporary Modest & Modern Tenun/Batik",
    turutMengundang: [
      "Keluarga Besar Bpk. H. Malik Ibrahim",
      "Keluarga Besar Bpk. Ir. H. Firdaus",
    ],
  },

  prameswari: {
    themeId: "prameswari",
    themeName: "Prameswari",
    series: "Traditional Series",
    category: "traditional",
    tagline: "PAWIKAHAN AGUNG NUSANTARA",
    groomName: "Danang",
    brideName: "Prameswari",
    groomDisplayName: "Raden Mas Danang Joyodiningrat, S.T.",
    brideDisplayName: "Raden Ajeng Prameswari Kusumaningrum, S.H.",
    groomRole: "Penganten Kakung",
    brideRole: "Penganten Putri",
    groomParents: "Putra saking Bpk. K.R.T. Joyodiningrat & Ibu R.Ay. Sri Handayani",
    brideParents: "Putri saking Bpk. K.P.H. Kusumaningrat & Ibu R.Ay. Endang Puspita",
    groomInstagram: "danang.joyo",
    brideInstagram: "prameswari.kusuma",
    monogramInitial: "D & P",
    targetDate: "2026-11-08T08:30:00",
    weddingDateFormatted: "Minggu, 08 November 2026",
    weddingDateDay: "08",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Mugi Gusti Kang Maha Agung tansah paring berkah, katentreman, saha kasembadan anggenipun mbangun bale wisma.",
    openingQuoteRef: "SERAT CANDRA SENGKALA",
    city: "Surakarta",
    globalBgUrl: "/example/pio09365.webp",
    groomPhotoUrl: "/example/pio09392.webp",
    bridePhotoUrl: "/example/pio09401.webp",
    sidebarPhotoUrl: "/example/pio09406.webp",
    landingCoverUrl: "/example/pio09417.webp",
    galleryPhotos: [
      "/example/pio09423.webp",
      "/example/pio09479.webp",
      "/example/pio09494.webp",
      "/example/pio09504.webp",
      "/example/pio09507.webp",
      "/example/pio09519.webp",
    ],
    events: [
      {
        badge: "IJAB QOBUL",
        title: "Ijab Qobul & Panggih Adat",
        time: "08.30 – 10.30 WIB",
        location: "Pendopo Agung Sasana Handrawina",
        address: "Kompleks Keraton Kasunanan Surakarta",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "PAHARGYAN AGUNG",
        title: "Pahargyan Agung Resepsi",
        time: "11.30 – 14.30 WIB",
        location: "Kusuma Sahid Prince Hotel Grand Ballroom",
        address: "Jl. Sugiyopranoto No. 20, Surakarta",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Serat 01",
        title: "Jodoh Pinasti",
        content: "Katresnan sejati ingkang tinemu lumantar restu para sesepuh lan panyuwunan tulus.",
      },
    ],
    banks: [
      { bank: "BCA", number: "0159283741", name: "Prameswari Kusumaningrum" },
    ],
    dressCodeColors: "#8b6f38, #2a2012, #f5ebd9",
    dressCodeNote: "Busana Adat Jawa / Batik Klasik Gagrak Surakarta",
    turutMengundang: [
      "Keluarga Ageng Bpk. K.R.T. Joyodiningrat",
      "Keluarga Ageng Bpk. K.P.H. Kusumaningrat",
    ],
  },

  dillalucky: {
    themeId: "dillalucky",
    themeName: "Dilla Lucky",
    series: "Traditional Series",
    category: "traditional",
    tagline: "WALIMATUL 'URS SAKRAL",
    groomName: "Fadil",
    brideName: "Nurfadillah",
    groomDisplayName: "Muhammad Fadil Anugrah, S.Farm.",
    brideDisplayName: "Nurfadillah Lucky, S.Ked.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Drs. H. Anugrah Mansyur & Ibu Hj. Siti Fatimah",
    brideParents: "Putri dari Bpk. H. Lucky Basri & Ibu Hj. Mardiah Basri",
    groomInstagram: "fadil.anugrah",
    brideInstagram: "dillaluckyy",
    monogramInitial: "F & D",
    targetDate: "2026-10-11T09:00:00",
    weddingDateFormatted: "Minggu, 11 Oktober 2026",
    weddingDateDay: "11",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "Barakallahu laka wa baraka 'alaika wa jama'a bainakuma fii khair (Semoga Allah memberkahi engkau dalam segala hal dan mempersatukan kalian berdua dalam kebaikan).",
    openingQuoteRef: "HR. ABU DAUD & TIRMIDZI",
    city: "Makassar",
    globalBgUrl: "/example/pio09564.webp",
    groomPhotoUrl: "/example/pio09557.webp",
    bridePhotoUrl: "/example/pio09560.webp",
    sidebarPhotoUrl: "/example/pio09565.webp",
    landingCoverUrl: "/example/pio09584.webp",
    galleryPhotos: [
      "/example/pio09597.webp",
      "/example/pio09599.webp",
      "/example/pio09609.webp",
      "/example/pio09623.webp",
      "/example/pio09645.webp",
      "/example/pio09648.webp",
    ],
    events: [
      {
        badge: "AKAD SAKRAL",
        title: "Akad Nikah Sakral",
        time: "09.00 – 11.00 WITA",
        location: "Masjid Kubah 99 Asmaul Husna",
        address: "Kawasan CPI (Center Point of Indonesia), Makassar",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Bugis-Makassar",
        time: "19.00 – 22.00 WITA",
        location: "Grand Ballroom Four Points by Sheraton",
        address: "Jl. Andi Djemma No. 130, Banta-Bantaeng, Makassar",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Mappasikarawa",
        title: "Izin & Doa Orang Tua",
        content: "Menyatukan dua rumpun keluarga besar dalam keberkahan syariat dan adat budaya luhur.",
      },
    ],
    banks: [
      { bank: "Bank Mandiri", number: "1520019284729", name: "Nurfadillah Lucky" },
      { bank: "BCA", number: "7890192837", name: "Muhammad Fadil" },
    ],
    dressCodeColors: "#4a5d4e, #d4af37, #fdfbf7",
    dressCodeNote: "Busana Adat Baju Bodo Modern / Muslimah Formal (Sage Green & Emas)",
    turutMengundang: [
      "Keluarga Besar Bpk. Drs. H. Anugrah Mansyur",
      "Keluarga Besar Bpk. H. Lucky Basri",
    ],
  },
};

export function getDemoThemeData(themeId: string): DemoThemeData {
  const normalized = (themeId || "kalandra").toLowerCase().trim();
  return DEMO_REGISTRY[normalized] || DEMO_REGISTRY.kalandra;
}

// Master composer to build ALL sections for the HTML templates
export function composeDemoTemplateData(themeId: string, paletteKey: string = "champagne") {
  const demo = getDemoThemeData(themeId);
  const palette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.champagne;

  // 1. Events HTML (Deduplicated Unified Card)
  const sessionsListHtml = demo.events.map((ev) => `
    <div class="event-block-item unified-session">
      <span class="ev-cat">${ev.badge}</span>
      <h3 class="ev-name serif">${ev.title.toUpperCase()}</h3>
      <p class="ev-time">${ev.time}</p>
    </div>
  `).join("");

  const eventDataHtml = `
    <div class="events-unified-container">
      <div class="events-sessions-stack">
        ${sessionsListHtml}
      </div>
      <div class="event-unified-venue-card">
        <span class="venue-card-lbl">LOKASI ACARA</span>
        <h4 class="ev-venue-unified serif">${demo.events[0]?.location || "Grand Ballroom"}</h4>
        <p class="ev-address-unified">${demo.events[0]?.address || ""}</p>
        <a href="${demo.events[0]?.mapsUrl || "https://maps.google.com"}" target="_blank" class="btn-map-outline">
          BUKA GOOGLE MAPS ↗
        </a>
      </div>
    </div>
  `;

  // 2. Love Story Section HTML
  const storyItemsHtml = demo.stories.map((s) => `
    <div class="story-chapter-block">
      <span class="sc-label">${s.chapter.toUpperCase()}</span>
      <h3 class="sc-title serif">${s.title}</h3>
      <p class="sc-desc">${s.content}</p>
    </div>
  `).join("");

  const storySectionHtml = `
    <section class="sec-flow" id="story">
      <span class="sec-eyebrow">OUR JOURNEY</span>
      <h2 class="sec-main-title serif">LOVE STORY</h2>
      <div class="journey-card-container">
        <div class="journey-chapters">
          ${storyItemsHtml}
        </div>
        <div class="journey-footer">
          <div class="jf-line"></div>
          <span class="jf-signature serif">${demo.groomName} &amp; ${demo.brideName}</span>
        </div>
      </div>
    </section>
  `;

  // 3. Gallery Section HTML with Smart Auto-Packing Grid and Zoom Lightbox
  const photosFeedHtml = demo.galleryPhotos.map((imgUrl, i) => `
    <div class="moment-photo-item" data-idx="${i}" onclick="luxOpenZoom(${i})">
      <img src="${imgUrl}" alt="Our Moment ${i + 1}" loading="lazy" decoding="async">
    </div>
  `).join("");

  const allPhotosGridHtml = demo.galleryPhotos.map((imgUrl, i) => `
    <div class="full-gallery-item" onclick="luxOpenZoom(${i})">
      <img src="${imgUrl}" alt="Photo ${i + 1}" loading="lazy" decoding="async">
    </div>
  `).join("");

  const gallerySectionHtml = `
    <section class="sec-flow" id="moments">
      <span class="sec-eyebrow">GALLERY</span>
      <h2 class="sec-main-title serif">OUR MOMENT</h2>
      <p class="moment-quote serif">
        “And I’d choose you; in a hundred lifetimes, in a hundred worlds, in any version of reality, I’d find you and I’d choose you.”
      </p>

      <div class="moments-grid-10">
        ${photosFeedHtml}
      </div>

      <button type="button" class="btn-outline-box btn-show-gallery" onclick="luxOpenFullGallery()">
        LIHAT SEMUA FOTO (${demo.galleryPhotos.length} FOTO)
      </button>
    </section>

    <!-- FULL GALLERY LIGHTBOX MODAL -->
    <div class="gallery-modal-backdrop" id="luxFullGalleryModal" onclick="luxCloseFullGallery(event)">
      <div class="gallery-modal-container" onclick="event.stopPropagation()">
        <div class="gallery-modal-header">
          <h3 class="serif modal-gallery-title">OUR MOMENTS</h3>
          <button class="gallery-modal-close" onclick="luxCloseFullGallery()">✕</button>
        </div>
        <div class="gallery-modal-grid">
          ${allPhotosGridHtml}
        </div>
      </div>
    </div>

    <!-- IMAGE ZOOM LIGHTBOX -->
    <div class="lux-zoom-backdrop" id="luxZoomModal" onclick="luxCloseZoom(event)">
      <button class="lux-zoom-close" onclick="luxCloseZoom()">✕</button>
      <button class="lux-zoom-nav prev" onclick="luxPrevZoom(event)">‹</button>
      <div class="lux-zoom-img-box" onclick="event.stopPropagation()">
        <img id="luxZoomActiveImg" src="${demo.galleryPhotos[0] || ''}" alt="Zoom View">
        <div class="lux-zoom-counter" id="luxZoomCounter">1 / ${demo.galleryPhotos.length}</div>
      </div>
      <button class="lux-zoom-nav next" onclick="luxNextZoom(event)">›</button>
    </div>

    <script>
      window.LUX_ALL_PHOTOS = ${JSON.stringify(demo.galleryPhotos)};
      window.luxActivePhotoIdx = 0;

      function ensureModalsOnBody() {
        const m1 = document.getElementById('luxFullGalleryModal');
        if (m1 && m1.parentNode !== document.body) document.body.appendChild(m1);
        const m2 = document.getElementById('luxZoomModal');
        if (m2 && m2.parentNode !== document.body) document.body.appendChild(m2);
      }
      document.addEventListener('DOMContentLoaded', ensureModalsOnBody);

      window.luxOpenFullGallery = function() {
        ensureModalsOnBody();
        const m = document.getElementById('luxFullGalleryModal');
        if (m) {
          m.classList.add('open');
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';
        }
      };

      window.luxCloseFullGallery = function(e) {
        if (!e || e.target === document.getElementById('luxFullGalleryModal') || e.target.classList.contains('gallery-modal-close')) {
          const m = document.getElementById('luxFullGalleryModal');
          if (m) {
            m.classList.remove('open');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
          }
        }
      };

      window.luxOpenZoom = function(idx) {
        ensureModalsOnBody();
        window.luxActivePhotoIdx = idx >= 0 && idx < window.LUX_ALL_PHOTOS.length ? idx : 0;
        const zoom = document.getElementById('luxZoomModal');
        const img = document.getElementById('luxZoomActiveImg');
        const counter = document.getElementById('luxZoomCounter');
        if (img && window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx]) {
          img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
        }
        if (counter) {
          counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
        }
        if (zoom) {
          zoom.classList.add('open');
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';
        }
      };

      window.luxCloseZoom = function(e) {
        if (!e || e.target === document.getElementById('luxZoomModal') || e.target.classList.contains('lux-zoom-close')) {
          const zoom = document.getElementById('luxZoomModal');
          if (zoom) {
            zoom.classList.remove('open');
            const fg = document.getElementById('luxFullGalleryModal');
            if (!fg || !fg.classList.contains('open')) {
              document.body.style.overflow = '';
              document.documentElement.style.overflow = '';
            }
          }
        }
      };

      window.luxNextZoom = function(e) {
        if (e) e.stopPropagation();
        window.luxActivePhotoIdx = (window.luxActivePhotoIdx + 1) % window.LUX_ALL_PHOTOS.length;
        const img = document.getElementById('luxZoomActiveImg');
        const counter = document.getElementById('luxZoomCounter');
        if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
        if (counter) counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
      };

      window.luxPrevZoom = function(e) {
        if (e) e.stopPropagation();
        window.luxActivePhotoIdx = (window.luxActivePhotoIdx - 1 + window.LUX_ALL_PHOTOS.length) % window.LUX_ALL_PHOTOS.length;
        const img = document.getElementById('luxZoomActiveImg');
        const counter = document.getElementById('luxZoomCounter');
        if (img) img.src = window.LUX_ALL_PHOTOS[window.luxActivePhotoIdx];
        if (counter) counter.textContent = (window.luxActivePhotoIdx + 1) + " / " + window.LUX_ALL_PHOTOS.length;
      };
    </script>
  `;

  // 4. Gift Section HTML (Bank Accounts & Address)
  const bankCardsHtml = demo.banks.map((b) => `
    <div class="bank-card">
      <span class="bank-label">${b.bank}</span>
      <span class="bank-owner">a.n ${b.name}</span>
      <div class="bank-row">
        <span class="bank-number">${b.number}</span>
        <button class="btn-copy" onclick="copyText('${b.number}')">Salin</button>
      </div>
    </div>
  `).join("");

  const giftSectionHtml = `
    <section class="sec-flow" id="gift">
      <span class="sec-eyebrow">WEDDING GIFT</span>
      <h2 class="sec-main-title serif">TANDA KASIH</h2>
      <p class="sec-sub">
        Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Bagi Anda yang ingin memberikan tanda kasih:
      </p>

      <div class="gift-tabs">
        <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
        <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
      </div>

      <div id="giftTabAmplop">
        ${bankCardsHtml}
      </div>

      <div id="giftTabKado" style="display:none;" class="bank-card">
        <span class="bank-label">Alamat Pengiriman Kado</span>
        <p style="font-size:0.8rem; color:rgba(255,255,255,0.7); line-height:1.5; margin:0.4rem 0 0.8rem;">
          Kediaman Mempelai, ${demo.city}, Indonesia
        </p>
        <button class="btn-copy" onclick="copyText('Kediaman Mempelai, ${demo.city}, Indonesia')">Salin Alamat</button>
      </div>
    </section>
  `;

  // 5. QR Code Check-In Access Section
  const qrAccessSectionHtml = `
    <section class="sec-flow" id="checkin">
      <span class="sec-eyebrow">QR CODE CHECK-IN</span>
      <h2 class="sec-main-title serif">KARTU AKSES MASUK</h2>
      <p class="sec-sub">Silakan tunjukkan QR Code ini kepada penerima tamu undangan di lokasi acara.</p>
      
      <div class="access-pass-card">
        <span class="pass-tagline">${demo.tagline}</span>
        <h3 class="pass-names serif">${demo.groomName} <em>&amp;</em> ${demo.brideName}</h3>
        <p class="pass-date">${demo.weddingDateFormatted}</p>
        
        <div class="pass-qr-wrapper">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUX-DEMO-${demo.themeId.toUpperCase()}" alt="QR Check-In" class="pass-qr-img">
        </div>

        <div class="pass-guest-box">
          <span class="pass-guest-lbl">KEPADA YTH.</span>
          <h4 class="pass-guest-name serif" id="passGuestName">Tamu Undangan</h4>
        </div>

        <div class="pass-meta-grid">
          <div class="pass-meta-item">
            <span class="pass-meta-lbl">SESI</span>
            <span class="pass-meta-val">Sesi 1 (Akad &amp; Resepsi)</span>
          </div>
          <div class="pass-meta-item">
            <span class="pass-meta-lbl">LIMIT</span>
            <span class="pass-meta-val">1 - 2 Orang</span>
          </div>
        </div>

        <div class="pass-souvenir-bar">
          <span class="souvenir-lbl">VOUCHER SOUVENIR:</span>
          <span class="souvenir-code">SOUVENIR-${demo.themeId.toUpperCase()}</span>
        </div>
      </div>
    </section>
  `;

  // 6. Dresscode Section
  const colorBadges = demo.dressCodeColors.split(",").map((c) => `
    <span style="width:28px; height:28px; border-radius:50%; background:${c.trim()}; display:inline-block; border:2px solid rgba(255,255,255,0.7); box-shadow:0 4px 10px rgba(0,0,0,0.35);"></span>
  `).join("");

  const dressCodeHtml = `
    <section class="sec-flow" id="dresscode">
      <span class="sec-eyebrow">A GUIDE TO</span>
      <h2 class="sec-main-title serif">DRESS CODES</h2>
      <p class="sec-sub">Kami mengundang tamu undangan untuk mengenakan palet warna berikut:</p>
      <div style="display:flex; justify-content:center; gap:12px; margin: 1.5rem 0;">${colorBadges}</div>
      <p style="margin:0; font-size:0.8rem; color:rgba(255,255,255,0.75); line-height:1.5;">${demo.dressCodeNote}</p>
    </section>
  `;

  // 7. Live Streaming Section
  const liveStreamingHtml = `
    <section class="sec-flow" id="live">
      <span class="sec-eyebrow">VIRTUAL CEREMONY</span>
      <h2 class="sec-main-title serif">LIVE STREAMING</h2>
      <p class="sec-sub">${demo.weddingDateFormatted} • 08.00 – Selesai</p>
      <p class="sec-sub" style="margin-top:0.4rem;">Bagi keluarga &amp; sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:</p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.8rem; margin-top:1.5rem;">
        <a href="https://instagram.com/${demo.brideInstagram}" target="_blank" class="btn-map-outline">INSTAGRAM LIVE ↗</a>
        <a href="https://youtube.com" target="_blank" class="btn-map-outline">YOUTUBE LIVE ↗</a>
      </div>
    </section>
  `;

  // 8. Turut Mengundang Section
  const turutMengundangHtml = `
    <section class="sec-flow" id="turut-mengundang">
      <span class="sec-eyebrow">KELUARGA BESAR</span>
      <h2 class="sec-main-title serif">TURUT MENGUNDANG</h2>
      <p class="sec-sub">Keluarga Besar &amp; Kerabat yang turut berbahagia:</p>
      <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1.5rem; font-size:0.88rem; color:rgba(255,255,255,0.85);">
        ${demo.turutMengundang.map((line) => `<p style="margin:0; padding:0.4rem 0; border-bottom:1px dashed rgba(255,255,255,0.12);">${line}</p>`).join("")}
      </div>
    </section>
  `;

  // 9. QR Buttons for Cover & Dock
  const qrCoverButtonHtml = `<button type="button" class="btn-open-qr-cover" onclick="luxOpenAccessModal()">Kartu Akses QR</button>`;
  const qrDockButtonHtml = `
    <button class="nav-item qr-btn" onclick="luxOpenAccessModal()" title="Buka QR Pass">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"/></svg>
      <span>QR TAMU</span>
    </button>
  `;

  // 10. Wishes Sample
  const wishesHtml = `
    <div class="wish-item">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
        <span class="wish-name">Budi Santoso &amp; Rekan Kerja</span>
        <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(74,222,128,0.15); color:#4ade80; font-weight:600;">Hadir (2 Orang)</span>
      </div>
      <p class="wish-msg">“Selamat berbahagia untuk ${demo.groomName} &amp; ${demo.brideName}! Semoga menjadi keluarga yang senantiasa dipenuhi rahmat dan cinta abadi.”</p>
    </div>
    <div class="wish-item">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
        <span class="wish-name">Sahabat Terbaik</span>
        <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(74,222,128,0.15); color:#4ade80; font-weight:600;">Hadir (1 Orang)</span>
      </div>
      <p class="wish-msg">“Lancar sampai hari H yaa! Cantik dan gagah banget, can't wait to celebrate your special day!”</p>
    </div>
  `;

  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`The Wedding of ${demo.groomName} & ${demo.brideName}`)}&dates=${demo.weddingDateYear}${demo.weddingDateMonth}${demo.weddingDateDay}T010000Z/${demo.weddingDateYear}${demo.weddingDateMonth}${demo.weddingDateDay}T140000Z&location=${encodeURIComponent(demo.events[0]?.location || demo.city)}`;

  return {
    invitationId: `demo-${demo.themeId}`,
    themeId: demo.themeId,
    weddingTagline: demo.tagline,
    coupleMonogram: demo.monogramInitial,
    monogramInitial: demo.monogramInitial,
    targetDate: demo.targetDate,
    weddingDateDay: demo.weddingDateDay,
    weddingDateMonth: demo.weddingDateMonth,
    weddingDateYear: demo.weddingDateYear,
    weddingDate: demo.weddingDateFormatted,
    
    firstName: demo.groomName,
    secondName: demo.brideName,
    groomName: demo.groomName,
    brideName: demo.brideName,
    firstFullName: demo.groomDisplayName,
    secondFullName: demo.brideDisplayName,
    firstDisplayName: demo.groomDisplayName,
    secondDisplayName: demo.brideDisplayName,
    groomDisplayName: demo.groomDisplayName,
    brideDisplayName: demo.brideDisplayName,
    
    firstRole: demo.groomRole,
    secondRole: demo.brideRole,
    firstRoleLabel: demo.groomRole,
    secondRoleLabel: demo.brideRole,
    firstParentLabel: "Putra Dari",
    secondParentLabel: "Putri Dari",
    groomParents: demo.groomParents,
    brideParents: demo.brideParents,
    firstParents: demo.groomParents,
    secondParents: demo.brideParents,
    groomInstagram: demo.groomInstagram,
    brideInstagram: demo.brideInstagram,
    firstInstagram: demo.groomInstagram,
    secondInstagram: demo.brideInstagram,
    
    globalBgUrl: demo.globalBgUrl,
    groomPhotoUrl: demo.groomPhotoUrl,
    bridePhotoUrl: demo.bridePhotoUrl,
    firstPhotoUrl: demo.groomPhotoUrl,
    secondPhotoUrl: demo.bridePhotoUrl,
    sidebarPhotoUrl: demo.sidebarPhotoUrl,
    landingCoverUrl: demo.landingCoverUrl,
    coverHeroUrl: demo.landingCoverUrl,
    galleryPhoto1: demo.galleryPhotos[0] || demo.landingCoverUrl,
    galleryPhoto2: demo.galleryPhotos[1] || demo.landingCoverUrl,
    galleryPhoto3: demo.galleryPhotos[2] || demo.landingCoverUrl,
    galleryPhoto4: demo.galleryPhotos[3] || demo.landingCoverUrl,
    galleryPhoto5: demo.galleryPhotos[4] || demo.landingCoverUrl,
    galleryPhoto6: demo.galleryPhotos[5] || demo.landingCoverUrl,
    
    openingQuote: demo.openingQuote,
    openingQuoteRef: demo.openingQuoteRef,
    
    // Complete Composed Section Blocks
    eventDataHtml,
    storySectionHtml,
    gallerySectionHtml,
    giftSectionHtml,
    qrAccessSectionHtml,
    dressCodeHtml,
    liveStreamingHtml,
    weddingFilterHtml: "",
    turutMengundangHtml,
    qrCoverButtonHtml,
    qrDockButtonHtml,
    wishesHtml,
    bankAccountsHtml: bankCardsHtml,
    shippingAddress: `Kediaman Mempelai, ${demo.city}, Indonesia`,
    
    googleCalendarUrl,
    waLink: `https://wa.me/6281234567890?text=Halo%20${encodeURIComponent(demo.groomName)}%20dan%20${encodeURIComponent(demo.brideName)}`,
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-113528.mp3",
    
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
  };
}
