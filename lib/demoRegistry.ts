// S-Invite — Comprehensive Demo Registry & Full Template Data Composer
// Maps each template theme to a distinct, beautiful couple persona and standardized WebP photo set:
// - /demo/[theme]/cover.webp
// - /demo/[theme]/hero.webp
// - /demo/[theme]/background.webp
// - /demo/[theme]/groom.webp
// - /demo/[theme]/bride.webp
// - /demo/[theme]/gallery_01.webp ... gallery_08.webp

import { COLOR_PALETTES } from "@/lib/colorPalettes";

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
  
  // Curated Standardized WebP Photo Assets
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
    series: "Premium",
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
    globalBgUrl: "/demo/kalandra/background.webp",
    groomPhotoUrl: "/demo/kalandra/groom.webp",
    bridePhotoUrl: "/demo/kalandra/bride.webp",
    sidebarPhotoUrl: "/demo/kalandra/hero.webp",
    landingCoverUrl: "/demo/kalandra/cover.webp",
    galleryPhotos: [
      "/demo/kalandra/gallery_01.webp",
      "/demo/kalandra/gallery_02.webp",
      "/demo/kalandra/gallery_03.webp",
      "/demo/kalandra/gallery_04.webp",
      "/demo/kalandra/gallery_05.webp",
      "/demo/kalandra/gallery_06.webp",
      "/demo/kalandra/gallery_07.webp",
      "/demo/kalandra/gallery_08.webp",
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
    ],
  },

  valente: {
    themeId: "valente",
    themeName: "Valente",
    series: "Premium",
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
    globalBgUrl: "/demo/valente/background.webp",
    groomPhotoUrl: "/demo/valente/groom.webp",
    bridePhotoUrl: "/demo/valente/bride.webp",
    sidebarPhotoUrl: "/demo/valente/hero.webp",
    landingCoverUrl: "/demo/valente/cover.webp",
    galleryPhotos: [
      "/demo/valente/gallery_01.webp",
      "/demo/valente/gallery_02.webp",
      "/demo/valente/gallery_03.webp",
      "/demo/valente/gallery_04.webp",
      "/demo/valente/gallery_05.webp",
      "/demo/valente/gallery_06.webp",
      "/demo/valente/gallery_07.webp",
      "/demo/valente/gallery_08.webp",
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
    series: "Premium",
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
    globalBgUrl: "/demo/aurelia/background.webp",
    groomPhotoUrl: "/demo/aurelia/groom.webp",
    bridePhotoUrl: "/demo/aurelia/bride.webp",
    sidebarPhotoUrl: "/demo/aurelia/hero.webp",
    landingCoverUrl: "/demo/aurelia/cover.webp",
    galleryPhotos: [
      "/demo/aurelia/gallery_01.webp",
      "/demo/aurelia/gallery_02.webp",
      "/demo/aurelia/gallery_03.webp",
      "/demo/aurelia/gallery_04.webp",
      "/demo/aurelia/gallery_05.webp",
      "/demo/aurelia/gallery_06.webp",
      "/demo/aurelia/gallery_07.webp",
      "/demo/aurelia/gallery_08.webp",
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

  prameswari: {
    themeId: "prameswari",
    themeName: "Prameswari",
    series: "Traditional",
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
    globalBgUrl: "/demo/prameswari/background.webp",
    groomPhotoUrl: "/demo/prameswari/groom.webp",
    bridePhotoUrl: "/demo/prameswari/bride.webp",
    sidebarPhotoUrl: "/demo/prameswari/hero.webp",
    landingCoverUrl: "/demo/prameswari/cover.webp",
    galleryPhotos: [
      "/demo/prameswari/gallery_01.webp",
      "/demo/prameswari/gallery_02.webp",
      "/demo/prameswari/gallery_03.webp",
      "/demo/prameswari/gallery_04.webp",
      "/demo/prameswari/gallery_05.webp",
      "/demo/prameswari/gallery_06.webp",
      "/demo/prameswari/gallery_07.webp",
      "/demo/prameswari/gallery_08.webp",
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

  wave: {
    themeId: "wave",
    themeName: "Wave",
    series: "Modern",
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
    globalBgUrl: "/demo/wave/background.webp",
    groomPhotoUrl: "/demo/wave/groom.webp",
    bridePhotoUrl: "/demo/wave/bride.webp",
    sidebarPhotoUrl: "/demo/wave/hero.webp",
    landingCoverUrl: "/demo/wave/cover.webp",
    galleryPhotos: [
      "/demo/wave/gallery_01.webp",
      "/demo/wave/gallery_02.webp",
      "/demo/wave/gallery_03.webp",
      "/demo/wave/gallery_04.webp",
      "/demo/wave/gallery_05.webp",
      "/demo/wave/gallery_06.webp",
      "/demo/wave/gallery_07.webp",
      "/demo/wave/gallery_08.webp",
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

  artisan: {
    themeId: "artisan",
    themeName: "Artisan",
    series: "Premium",
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
    globalBgUrl: "/demo/artisan/background.webp",
    groomPhotoUrl: "/demo/artisan/groom.webp",
    bridePhotoUrl: "/demo/artisan/bride.webp",
    sidebarPhotoUrl: "/demo/artisan/hero.webp",
    landingCoverUrl: "/demo/artisan/cover.webp",
    galleryPhotos: [
      "/demo/artisan/gallery_01.webp",
      "/demo/artisan/gallery_02.webp",
      "/demo/artisan/gallery_03.webp",
      "/demo/artisan/gallery_04.webp",
      "/demo/artisan/gallery_05.webp",
      "/demo/artisan/gallery_06.webp",
      "/demo/artisan/gallery_07.webp",
      "/demo/artisan/gallery_08.webp",
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

  papercut: {
    themeId: "papercut",
    themeName: "Papercut",
    series: "Modern",
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
    globalBgUrl: "/demo/papercut/background.webp",
    groomPhotoUrl: "/demo/papercut/groom.webp",
    bridePhotoUrl: "/demo/papercut/bride.webp",
    sidebarPhotoUrl: "/demo/papercut/hero.webp",
    landingCoverUrl: "/demo/papercut/cover.webp",
    galleryPhotos: [
      "/demo/papercut/gallery_01.webp",
      "/demo/papercut/gallery_02.webp",
      "/demo/papercut/gallery_03.webp",
      "/demo/papercut/gallery_04.webp",
      "/demo/papercut/gallery_05.webp",
      "/demo/papercut/gallery_06.webp",
      "/demo/papercut/gallery_07.webp",
      "/demo/papercut/gallery_08.webp",
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
    series: "Modern",
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
    globalBgUrl: "/demo/ameera/background.webp",
    groomPhotoUrl: "/demo/ameera/groom.webp",
    bridePhotoUrl: "/demo/ameera/bride.webp",
    sidebarPhotoUrl: "/demo/ameera/hero.webp",
    landingCoverUrl: "/demo/ameera/cover.webp",
    galleryPhotos: [
      "/demo/ameera/gallery_01.webp",
      "/demo/ameera/gallery_02.webp",
      "/demo/ameera/gallery_03.webp",
      "/demo/ameera/gallery_04.webp",
      "/demo/ameera/gallery_05.webp",
      "/demo/ameera/gallery_06.webp",
      "/demo/ameera/gallery_07.webp",
      "/demo/ameera/gallery_08.webp",
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

  dillalucky: {
    themeId: "dillalucky",
    themeName: "Dilla Lucky",
    series: "Traditional",
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
    globalBgUrl: "/demo/dillalucky/background.webp",
    groomPhotoUrl: "/demo/dillalucky/groom.webp",
    bridePhotoUrl: "/demo/dillalucky/bride.webp",
    sidebarPhotoUrl: "/demo/dillalucky/hero.webp",
    landingCoverUrl: "/demo/dillalucky/cover.webp",
    galleryPhotos: [
      "/demo/dillalucky/gallery_01.webp",
      "/demo/dillalucky/gallery_02.webp",
      "/demo/dillalucky/gallery_03.webp",
      "/demo/dillalucky/gallery_04.webp",
      "/demo/dillalucky/gallery_05.webp",
      "/demo/dillalucky/gallery_06.webp",
      "/demo/dillalucky/gallery_07.webp",
      "/demo/dillalucky/gallery_08.webp",
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

  badrika: {
    themeId: "badrika",
    themeName: "Badrika",
    series: "Traditional",
    category: "traditional",
    tagline: "WALIMATUL 'URS & SAORAJA ROYAL",
    groomName: "Syahril",
    brideName: "Elyana",
    groomDisplayName: "Andi Syahril Ramadhan, S.T.",
    brideDisplayName: "Andi Elyana Tenri, S.Ked.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Andi Ramadhan & Ibu Andi Rosmini",
    brideParents: "Putri dari Bpk. Andi Tenri Tatta & Ibu Andi Sitti Nur",
    groomInstagram: "syahril.tenri",
    brideInstagram: "elyana.andi",
    monogramInitial: "S & E",
    targetDate: "2026-12-31T09:00:00",
    weddingDateFormatted: "Kamis, 31 Desember 2026",
    weddingDateDay: "31",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.",
    openingQuoteRef: "QS. AR-RUM: 21",
    city: "Makassar",
    globalBgUrl: "/demo/badrika/background.webp",
    groomPhotoUrl: "/demo/badrika/groom.webp",
    bridePhotoUrl: "/demo/badrika/bride.webp",
    sidebarPhotoUrl: "/demo/badrika/hero.webp",
    landingCoverUrl: "/demo/badrika/cover.webp",
    galleryPhotos: [
      "/demo/badrika/gallery_01.webp",
      "/demo/badrika/gallery_02.webp",
      "/demo/badrika/gallery_03.webp",
      "/demo/badrika/gallery_04.webp",
      "/demo/badrika/gallery_05.webp",
      "/demo/badrika/gallery_06.webp",
      "/demo/badrika/gallery_07.webp",
      "/demo/badrika/gallery_08.webp",
    ],
    events: [
      {
        badge: "MAPACCI",
        title: "Mappacci / Korontigi Sakral",
        time: "19.00 WITA – Selesai",
        location: "Kediaman Mempelai Wanita",
        address: "Jl. Boulevard No. 88, Panakkukang, Makassar",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "AKAD & RESEPSI",
        title: "Akad & Resepsi Bugis Royal",
        time: "10.00 – 14.00 WITA",
        location: "Claro Hotel Makassar (Phinisi Ballroom)",
        address: "Jl. A. P. Pettarani No. 3, Mannuruki, Makassar",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Mappatabe",
        title: "Restu Orang Tua & Sesepuh",
        content: "Melangkah bersama dengan doa restu keluarga besar menuju mahligai rumah tangga yang sakinah.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238491", name: "Andi Syahril" },
      { bank: "Bank Mandiri", number: "1520098765432", name: "Andi Elyana" },
    ],
    dressCodeColors: "#0f2b23, #c5a059, #fbfaf7",
    dressCodeNote: "Busana Adat Bugis / Nuansa Emerald Hijau & Emas Saoraja",
    turutMengundang: ["Keluarga Besar Bpk. Andi Ramadhan", "Keluarga Besar Bpk. Andi Tenri Tatta"],
  },

  mayang: {
    themeId: "mayang",
    themeName: "Mayang",
    series: "Traditional",
    category: "traditional",
    tagline: "PAWIKAHAN AGENG KERATON",
    groomName: "Bagus",
    brideName: "Mayang",
    groomDisplayName: "Raden Bagus Wicaksono, M.M.",
    brideDisplayName: "Raden Ajeng Mayang Kusuma, S.Sn.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. K.R.T. Suryonegoro & Ibu Dra. Retno Palupi",
    brideParents: "Putri dari Bpk. Ir. H. Bambang Hartono & Ibu Hj. Endang Sulistyowati",
    groomInstagram: "bagus.wicaksono",
    brideInstagram: "mayangkusuma",
    monogramInitial: "B & M",
    targetDate: "2026-11-28T09:00:00",
    weddingDateFormatted: "Sabtu, 28 November 2026",
    weddingDateDay: "28",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Mugi Gusti Ingkang Maha Welas Asih tansah paring berkah, katentreman, lan karahayon dhumateng gesang bebrayan punika.",
    openingQuoteRef: "SERAT CENTHINI",
    city: "Yogyakarta",
    globalBgUrl: "/demo/mayang/background.webp",
    groomPhotoUrl: "/demo/mayang/groom.webp",
    bridePhotoUrl: "/demo/mayang/bride.webp",
    sidebarPhotoUrl: "/demo/mayang/hero.webp",
    landingCoverUrl: "/demo/mayang/cover.webp",
    galleryPhotos: [
      "/demo/mayang/gallery_01.webp",
      "/demo/mayang/gallery_02.webp",
      "/demo/mayang/gallery_03.webp",
      "/demo/mayang/gallery_04.webp",
      "/demo/mayang/gallery_05.webp",
      "/demo/mayang/gallery_06.webp",
      "/demo/mayang/gallery_07.webp",
      "/demo/mayang/gallery_08.webp",
    ],
    events: [
      {
        badge: "IJAB QOBUL",
        title: "Ijab Qobul / Akad Nikah",
        time: "08.00 – 10.00 WIB",
        location: "Ndalem Ngabean Heritage Yogyakarta",
        address: "Jl. Mayjend Sutoyo No. 53, Mantrijeron, Yogyakarta",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "PAHARGYAN",
        title: "Pahargyan Temanten Jawi",
        time: "11.00 – 14.00 WIB",
        location: "Pendopo Agung Royal Ambarrukmo",
        address: "Jl. Laksda Adisucipto No. 81, Caturtunggal, Sleman, DIY",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Midodareni",
        title: "Malam Widadari",
        content: "Untaian doa suci di malam midodareni menyambut hari bahagia pernikahan.",
      },
    ],
    banks: [
      { bank: "BCA", number: "0372918273", name: "Raden Bagus Wicaksono" },
      { bank: "Bank Mandiri", number: "1370019283748", name: "Raden Ajeng Mayang Kusuma" },
    ],
    dressCodeColors: "#b5833c, #261b11, #faf6f0",
    dressCodeNote: "Batik Tradisional / Nuansa Coklat Kayu & Emas",
    turutMengundang: ["Keluarga Besar Trah Suryonegoro", "Keluarga Besar Bpk. Ir. H. Bambang Hartono"],
  },

  candani: {
    themeId: "candani",
    themeName: "Candani",
    series: "Traditional",
    category: "traditional",
    tagline: "PESONA NUSANTARA FLORAL",
    groomName: "Rijal",
    brideName: "Mega",
    groomDisplayName: "Rijal Fauzi, S.Pd.",
    brideDisplayName: "Mega Puspita, S.I.Kom.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. H. Ahmad Fauzi & Ibu Hj. Aminah",
    brideParents: "Putri dari Bpk. Drs. H. Hendra Suwandi & Ibu Hj. Yuliana",
    groomInstagram: "rijal.fauzi",
    brideInstagram: "mega.puspita",
    monogramInitial: "R & M",
    targetDate: "2026-10-25T08:30:00",
    weddingDateFormatted: "Minggu, 25 Oktober 2026",
    weddingDateDay: "25",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "Dan di antara tanda-tanda kekuasaan-Nya diciptakan-Nya untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram di sampingnya.",
    openingQuoteRef: "QS. AR-RUM: 21",
    city: "Bandung",
    globalBgUrl: "/demo/candani/background.webp",
    groomPhotoUrl: "/demo/candani/groom.webp",
    bridePhotoUrl: "/demo/candani/bride.webp",
    sidebarPhotoUrl: "/demo/candani/hero.webp",
    landingCoverUrl: "/demo/candani/cover.webp",
    galleryPhotos: [
      "/demo/candani/gallery_01.webp",
      "/demo/candani/gallery_02.webp",
      "/demo/candani/gallery_03.webp",
      "/demo/candani/gallery_04.webp",
      "/demo/candani/gallery_05.webp",
      "/demo/candani/gallery_06.webp",
      "/demo/candani/gallery_07.webp",
      "/demo/candani/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah & Sungkeman",
        time: "08.30 – 10.30 WIB",
        location: "Gedong Putih Bandung",
        address: "Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI",
        title: "Resepsi Pernikahan",
        time: "11.00 – 14.30 WIB",
        location: "Grand Ballroom Gedong Putih",
        address: "Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pertemuan",
        title: "Langkah Awal",
        content: "Dua hati yang dipersatukan dalam keindahan takdir dan restu semesta.",
      },
    ],
    banks: [
      { bank: "BCA", number: "2389102837", name: "Rijal Fauzi" },
      { bank: "BSI", number: "7192837465", name: "Mega Puspita" },
    ],
    dressCodeColors: "#a85d42, #dfc9b8, #fbf7f4",
    dressCodeNote: "Busana Nuansa Terracotta, Sand & Earthy Tone",
    turutMengundang: ["Keluarga Besar Bpk. H. Ahmad Fauzi", "Keluarga Besar Bpk. Drs. H. Hendra Suwandi"],
  },

  lumina: {
    themeId: "lumina",
    themeName: "Lumina",
    series: "Modern",
    category: "modern",
    tagline: "MINIMALIST GLASS & CINEMA",
    groomName: "Bryan",
    brideName: "Celine",
    groomDisplayName: "Bryan Nicholas, B.Eng.",
    brideDisplayName: "Celine Anastasia, B.A.",
    groomRole: "The Groom",
    brideRole: "The Bride",
    groomParents: "Son of Mr. Robert Nicholas & Mrs. Diana Nicholas",
    brideParents: "Daughter of Mr. William Alexander & Mrs. Evelyn Alexander",
    groomInstagram: "bryan.nicholas",
    brideInstagram: "celine.anastasia",
    monogramInitial: "B & C",
    targetDate: "2026-12-12T16:00:00",
    weddingDateFormatted: "Saturday, 12 December 2026",
    weddingDateDay: "12",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Two souls with but a single thought, two hearts that beat as one. A modern journey of love, friendship, and eternal devotion.",
    openingQuoteRef: "JOHN KEATS",
    city: "Jakarta",
    globalBgUrl: "/demo/lumina/background.webp",
    groomPhotoUrl: "/demo/lumina/groom.webp",
    bridePhotoUrl: "/demo/lumina/bride.webp",
    sidebarPhotoUrl: "/demo/lumina/hero.webp",
    landingCoverUrl: "/demo/lumina/cover.webp",
    galleryPhotos: [
      "/demo/lumina/gallery_01.webp",
      "/demo/lumina/gallery_02.webp",
      "/demo/lumina/gallery_03.webp",
      "/demo/lumina/gallery_04.webp",
      "/demo/lumina/gallery_05.webp",
      "/demo/lumina/gallery_06.webp",
      "/demo/lumina/gallery_07.webp",
      "/demo/lumina/gallery_08.webp",
    ],
    events: [
      {
        badge: "MATRIMONY",
        title: "Holy Matrimony Ceremony",
        time: "16.00 – 17.30 WIB",
        location: "The Glass House Jakarta",
        address: "Jl. Senopati No. 71, Kebayoran Baru, Jakarta Selatan",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "DINNER",
        title: "Evening Wedding Dinner",
        time: "18.30 – 21.30 WIB",
        location: "Grand Ballroom The Langham Jakarta",
        address: "District 8, SCBD, Senayan, Jakarta Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Chapter 01",
        title: "The Encounter",
        content: "Where minimalist elegance meets lifelong devotion in the heart of the city.",
      },
    ],
    banks: [
      { bank: "BCA", number: "5019283741", name: "Bryan Nicholas" },
      { bank: "Bank Mandiri", number: "1020098761234", name: "Celine Anastasia" },
    ],
    dressCodeColors: "#09090b, #e5e7eb, #ffffff",
    dressCodeNote: "Black Tie / Modern Monochrome & Dark Charcoal Formal",
    turutMengundang: ["The Nicholas Family", "The Alexander Family"],
  },

  solaria: {
    themeId: "solaria",
    themeName: "Solaria",
    series: "Modern",
    category: "modern",
    tagline: "ROMANTIC SUNSET GLOW",
    groomName: "Damian",
    brideName: "Aurora",
    groomDisplayName: "Damian Alexander, M.Arch.",
    brideDisplayName: "Aurora Valerie, M.Ds.",
    groomRole: "The Groom",
    brideRole: "The Bride",
    groomParents: "Putra dari Bpk. Ir. Gunawan Alexander & Ibu Maria",
    brideParents: "Putri dari Bpk. Dr. Hartanto Suwandi & Ibu Sylvia",
    groomInstagram: "damian.alexander",
    brideInstagram: "aurora.valerie",
    monogramInitial: "D & A",
    targetDate: "2026-10-18T16:30:00",
    weddingDateFormatted: "Minggu, 18 Oktober 2026",
    weddingDateDay: "18",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    openingQuote: "Underneath the warm golden sunset, two hearts find their eternal home. We celebrate the start of our forever story.",
    openingQuoteRef: "A SUNSET VOW",
    city: "Bali",
    globalBgUrl: "/demo/solaria/background.webp",
    groomPhotoUrl: "/demo/solaria/groom.webp",
    bridePhotoUrl: "/demo/solaria/bride.webp",
    sidebarPhotoUrl: "/demo/solaria/hero.webp",
    landingCoverUrl: "/demo/solaria/cover.webp",
    galleryPhotos: [
      "/demo/solaria/gallery_01.webp",
      "/demo/solaria/gallery_02.webp",
      "/demo/solaria/gallery_03.webp",
      "/demo/solaria/gallery_04.webp",
      "/demo/solaria/gallery_05.webp",
      "/demo/solaria/gallery_06.webp",
      "/demo/solaria/gallery_07.webp",
      "/demo/solaria/gallery_08.webp",
    ],
    events: [
      {
        badge: "CEREMONY",
        title: "Sunset Wedding Vows",
        time: "16.30 – 18.00 WITA",
        location: "Tirtha Bridal Uluwatu",
        address: "Jl. Uluwatu, Banjar Dinas Karang Boma, Pecatu, Bali",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RECEPTION",
        title: "Twilight Sunset Dinner",
        time: "18.30 – 22.00 WITA",
        location: "The Lawn Canggu",
        address: "Jl. Pura Dalem, Canggu, Kuta Utara, Badung, Bali",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Chapter 01",
        title: "Golden Hour",
        content: "A sunset promise sealed forever amidst the waves and golden breeze.",
      },
    ],
    banks: [
      { bank: "BCA", number: "6049182739", name: "Damian Alexander" },
      { bank: "Bank Mandiri", number: "1420087654321", name: "Aurora Valerie" },
    ],
    dressCodeColors: "#a8583c, #d97736, #fbf7f4",
    dressCodeNote: "Sunset Warm Terracotta / Sand & Earthy Pastel",
    turutMengundang: ["Keluarga Besar Alexander", "Keluarga Besar Suwandi"],
  },

  chronicle: {
    themeId: "chronicle",
    themeName: "Chronicle",
    series: "Modern",
    category: "modern",
    tagline: "HIGH-FASHION VOGUE EDITORIAL",
    groomName: "Julian",
    brideName: "Valerie",
    groomDisplayName: "Julian Maverick, B.A.",
    brideDisplayName: "Valerie Clarissa, B.F.A.",
    groomRole: "The Groom",
    brideRole: "The Bride",
    groomParents: "Son of Mr. Arthur Maverick & Mrs. Helena Maverick",
    brideParents: "Daughter of Mr. Marcus Hartono & Mrs. Catherine Hartono",
    groomInstagram: "julian.maverick",
    brideInstagram: "valerie.clarissa",
    monogramInitial: "J & V",
    targetDate: "2026-11-20T17:00:00",
    weddingDateFormatted: "Friday, 20 November 2026",
    weddingDateDay: "20",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Fashion fades, but love remains timeless. An exclusive editorial celebration of our sacred union.",
    openingQuoteRef: "THE WEDDING CHRONICLE",
    city: "Surabaya",
    globalBgUrl: "/demo/chronicle/background.webp",
    groomPhotoUrl: "/demo/chronicle/groom.webp",
    bridePhotoUrl: "/demo/chronicle/bride.webp",
    sidebarPhotoUrl: "/demo/chronicle/hero.webp",
    landingCoverUrl: "/demo/chronicle/cover.webp",
    galleryPhotos: [
      "/demo/chronicle/gallery_01.webp",
      "/demo/chronicle/gallery_02.webp",
      "/demo/chronicle/gallery_03.webp",
      "/demo/chronicle/gallery_04.webp",
      "/demo/chronicle/gallery_05.webp",
      "/demo/chronicle/gallery_06.webp",
      "/demo/chronicle/gallery_07.webp",
      "/demo/chronicle/gallery_08.webp",
    ],
    events: [
      {
        badge: "CEREMONY",
        title: "Editorial Matrimony",
        time: "17.00 – 18.30 WIB",
        location: "The Glass House Surabaya",
        address: "Jl. Mayjen Sungkono No. 89, Dukuh Pakis, Surabaya",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "GALA DINNER",
        title: "Grand Fashion Gala Dinner",
        time: "19.00 – 22.00 WIB",
        location: "The Westin Surabaya Grand Ballroom",
        address: "Pakuwon Mall, Jl. Puncak Indah Lontar No. 2, Surabaya",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Issue No. 01",
        title: "Timeless Vogue",
        content: "Capturing the elegance of two souls in a bespoke high-fashion romance.",
      },
    ],
    banks: [
      { bank: "BCA", number: "8019283746", name: "Julian Maverick" },
      { bank: "Bank Mandiri", number: "1410098765432", name: "Valerie Clarissa" },
    ],
    dressCodeColors: "#0d0d0f, #d8cebe, #f4eee6",
    dressCodeNote: "High Fashion / Black Tie & Champagne Editorial",
    turutMengundang: ["The Maverick Family", "The Hartono Family"],
  },
};

export function getDemoThemeData(themeId: string): DemoThemeData {
  const normalized = (themeId || "kalandra").toLowerCase().trim();
  return DEMO_REGISTRY[normalized] || DEMO_REGISTRY.kalandra;
}

// Master composer to build ALL sections for the HTML templates
export function composeDemoTemplateData(
  themeId: string,
  paletteKey: string = "champagne",
  customData?: Partial<DemoThemeData>
) {
  const baseDemo = getDemoThemeData(themeId);
  const demo: DemoThemeData = customData ? { ...baseDemo, ...customData } : baseDemo;
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
          <svg viewBox="0 0 100 100" class="pass-qr-img" style="width:140px; height:140px; background:#ffffff; padding:10px; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.15);">
            <path d="M10,10 h30 v30 h-30 z M16,16 v18 h18 v-18 z M22,22 h6 v6 h-6 z M60,10 h30 v30 h-30 z M66,16 v18 h18 v-18 z M72,22 h6 v6 h-6 z M10,60 h30 v30 h-30 z M16,66 v18 h18 v-18 z M22,72 h6 v6 h-6 z M48,12 h8 v8 h-8 z M48,28 h8 v8 h-8 z M48,48 h16 v8 h-16 z M72,48 h16 v8 h-16 z M48,68 h8 v16 h-8 z M68,68 h20 v8 h-20 z M68,84 h20 v8 h-20 z" fill="#111111" />
          </svg>
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

  // 5b. QR Code Check-In Ticket for Modal
  const qrAccessCardHtml = `
    <div style="text-align:center; padding:1rem 0;">
      <span style="font-size:0.65rem; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.6); display:block; margin-bottom:0.4rem; font-weight:600;">Check-In Ticket</span>
      <h3 style="font-size:1.4rem; color:#fff; font-family:'Cormorant Garamond',serif; margin-bottom:0.2rem;" id="modalGuestName">Tamu Undangan</h3>
      <p style="font-size:0.75rem; color:rgba(255,255,255,0.65); margin-bottom:1.2rem;">Tunjukkan kode QR ini kepada penerima tamu di lokasi acara.</p>
      <div style="background:#ffffff; padding:14px; display:inline-block; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <img class="pass-qr-img" id="modalQrImg" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Tamu%20Undangan" alt="QR Check-In" style="width:160px; height:160px; display:block; margin:0 auto;">
      </div>
    </div>
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
  const qrCoverButtonHtml = `<button type="button" class="btn-open-qr-cover" onclick="luxOpenAccessModal()" style="display:inline-block; margin-top:20px; padding:10px 24px; background:#111; color:#fff; border:none; border-radius:30px; font-size:12px; font-weight:600; letter-spacing:1px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.2); transition:transform 0.2s ease;">Kartu Akses QR</button>`;
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

  // 11. Wedding Instagram Filter Section
  const weddingFilterHtml = `
    <section class="sec-flow" id="wedding-filter">
      <span class="sec-eyebrow">INSTAGRAM FILTER</span>
      <h2 class="sec-main-title serif">WEDDING FILTER</h2>
      <p class="sec-sub">Abadikan momen istimewa pernikahan kami menggunakan filter resmi Instagram kami:</p>
      <div style="display:flex; justify-content:center; margin-top:1.5rem;">
        <a href="https://instagram.com/ar/${demo.themeId}-wedding" target="_blank" class="btn-map-outline" style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          <span>BUKA INSTAGRAM FILTER ↗</span>
        </a>
      </div>
    </section>
  `;

  // 12. Guest Memories Live Upload Section (In-Page Upload + 5-Circle Marquee + Direct Galery)
  const sampleMemoriesPool = [
    { name: "Budi Santoso", img: `/demo/${demo.themeId}/memory_01.webp`, alt: `/demo/${demo.themeId}/gallery_01.webp` },
    { name: "Sahabat SMA", img: `/demo/${demo.themeId}/memory_02.webp`, alt: `/demo/${demo.themeId}/gallery_02.webp` },
    { name: "Rina & Teman", img: `/demo/${demo.themeId}/memory_03.webp`, alt: `/demo/${demo.themeId}/gallery_03.webp` },
    { name: "Tante Maya", img: `/demo/${demo.themeId}/memory_04.webp`, alt: `/demo/${demo.themeId}/gallery_04.webp` },
    { name: "Dimas Pratama", img: `/demo/${demo.themeId}/gallery_05.webp`, alt: `/demo/${demo.themeId}/cover.webp` },
    { name: "Keluarga Solo", img: `/demo/${demo.themeId}/gallery_06.webp`, alt: `/demo/${demo.themeId}/hero.webp` },
    { name: "Alumni Teknik", img: `/demo/${demo.themeId}/gallery_07.webp`, alt: `/demo/${demo.themeId}/groom.webp` },
    { name: "Eko & Nia", img: `/demo/${demo.themeId}/gallery_08.webp`, alt: `/demo/${demo.themeId}/bride.webp` },
  ];

  // Pick random sampled items up to 10
  const randomSampleMemories = [...sampleMemoriesPool].sort(() => 0.5 - Math.random()).slice(0, 10);
  const totalCount = randomSampleMemories.length;
  const isMarquee = totalCount > 5;

  const storyCirclesHtml = randomSampleMemories.map((sm) => `
    <div class="lux-story-circle-item" style="display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; flex-shrink: 0; width: 68px;" onclick="luxOpenMemoryZoom('${sm.img}', '${sm.name}')">
      <div style="width: 58px; height: 58px; border-radius: 9999px; padding: 2px; background: linear-gradient(135deg, #d4af37, #f59e0b, #eab308); box-shadow: 0 0 10px rgba(212,175,55,0.35);">
        <div style="width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; background: #1c1917; border: 2px solid #0c0a09; display: flex; align-items: center; justify-content: center;">
          <img src="${sm.img}" onerror="this.onerror=null;this.src='${sm.alt}';" alt="${sm.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
        </div>
      </div>
      <span style="font-size: 11px; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; opacity: 0.85; text-align: center;">
        ${sm.name.split(" ")[0]}
      </span>
    </div>
  `).join("");

  const memoriesSectionHtml = `
    <section class="sec-flow slide-section" id="section-memories" style="position: relative; padding: 3rem 1rem;">
      <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
        <span class="sec-eyebrow">AFTER-EVENT MEMORIES</span>
        <h2 class="sec-main-title serif">KENANGAN TAMU</h2>
        <p class="sec-sub" style="max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.82rem; line-height: 1.6; opacity: 0.8;">
          Punya foto candid atau video seru selama menghadiri pernikahan kami? Bagikan momen spesial Anda langsung di sini:
        </p>

        <!-- 1. TOMBOL UPLOAD MOMEN (DIRECT LINK) -->
        <a href="/demo/moment" style="display: block; width: 100%; max-width: 360px; margin: 0 auto 1.8rem auto; padding: 14px 20px; border-radius: 50px; background: #ffffff; color: #000000; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.05em; text-align: center; text-decoration: none; box-shadow: 0 4px 15px rgba(255,255,255,0.18); transition: transform 0.15s ease;">
          BAGIKAN FOTO MOMEN ANDA
        </a>

        <!-- 2. HIGHLIGHT LINGKARAN (5 LINGKARAN DI LAYAR, LOOPING MARQUEE JIKA > 5) -->
        <div class="memories-highlights-wrapper" style="width: 100%; max-width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 14px 10px; margin-bottom: 1.5rem; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 10px; font-weight: 700; opacity: 0.85; padding: 0 6px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 99px; background: #10b981; display: inline-block;"></span>
              KAMI SUDAH MEMBAGIKAN MOMEN
            </span>
            <span style="font-size: 9px; opacity: 0.5; font-family: monospace;">Acak (${totalCount} Foto)</span>
          </div>

          <!-- Story Circle Container -->
          <div class="story-circles-track-wrapper" style="overflow: hidden; width: 100%; position: relative; mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);">
            <div class="story-circles-track" style="display: flex; gap: 14px; width: max-content; margin: 0 auto; ${isMarquee ? 'animation: luxStoryLoop 24s linear infinite;' : 'justify-content: center;'}">
              ${storyCirclesHtml}
              ${isMarquee ? storyCirclesHtml : ''}
            </div>
          </div>
        </div>

        <!-- 3. TOMBOL DIRECT KE HALAMAN GALERI WEB (galery.js) -->
        <div style="text-align: center;">
          <a href="/demo/${demo.themeId}/galery" class="btn-outline-box" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; font-size: 12px; font-weight: 700; border-radius: 50px; text-decoration: none; border: 1px solid currentColor; color: inherit; transition: all 0.2s ease;">
            <span>✨ BUKA GALERI MOMEN LENGKAP</span>
            <span style="font-size: 14px;">↗</span>
          </a>
        </div>
      </div>
    </section>

    <!-- LIGHTBOX ZOOM MODAL FOR CIRCLE PREVIEW -->
    <div id="luxMemoryZoomModal" onclick="luxCloseMemoryZoom()" style="display: none; position: fixed; inset: 0; z-index: 999999; background: rgba(0,0,0,0.92); backdrop-filter: blur(12px); align-items: center; justify-content: center; flex-direction: column; padding: 1rem;">
      <button type="button" onclick="luxCloseMemoryZoom()" style="position: absolute; top: 18px; right: 18px; background: none; border: none; color: #fff; font-size: 26px; cursor: pointer;">✕</button>
      <img id="luxMemoryZoomImg" src="" alt="Zoom" style="max-width: 88vw; max-height: 75vh; border-radius: 16px; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8);" onclick="event.stopPropagation()" />
      <p id="luxMemoryZoomName" style="color: #fff; font-weight: 700; font-size: 0.95rem; margin-top: 12px;"></p>
    </div>

    <style>
      @keyframes luxStoryLoop {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .story-circles-track:hover {
        animation-play-state: paused !important;
      }
    </style>

    <script>
      window.luxOpenMemoryZoom = function(src, name) {
        const m = document.getElementById('luxMemoryZoomModal');
        const img = document.getElementById('luxMemoryZoomImg');
        const nm = document.getElementById('luxMemoryZoomName');
        if (m && img) {
          if (m.parentNode !== document.body) document.body.appendChild(m);
          img.src = src;
          if (nm) nm.textContent = 'Momen dari: ' + name;
          m.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
      };

      window.luxCloseMemoryZoom = function() {
        const m = document.getElementById('luxMemoryZoomModal');
        if (m) {
          m.style.display = 'none';
          document.body.style.overflow = '';
        }
      };

      window.luxHandleInPageMemorySubmit = function(e) {
        e.preventDefault();
        const btn = document.getElementById('inpageMemSubmitBtn');
        const alert = document.getElementById('inpageMemAlert');
        const nameInput = document.getElementById('inpageMemName');
        const fileInput = document.getElementById('inpageMemFile');
        if (btn) { btn.disabled = true; btn.textContent = 'Mengunggah ke Galeri...'; }
        setTimeout(() => {
          if (alert) alert.style.display = 'block';
          if (btn) { btn.disabled = false; btn.textContent = '📸  KIRIM FOTO MOMEN'; }
          if (nameInput) nameInput.value = '';
          if (fileInput) fileInput.value = '';
          setTimeout(() => {
            if (alert) alert.style.display = 'none';
          }, 3500);
        }, 1000);
      };
    </script>

    <!-- IN-PAGE MEMORIES UPLOAD MODAL -->
    <div id="luxMemoryUploadModal" class="gallery-modal-backdrop" onclick="luxCloseUploadMemoryModal(event)" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); align-items:center; justify-content:center; padding:1rem;">
      <div class="gallery-modal-container" onclick="event.stopPropagation()" style="max-width:440px; width:100%; text-align:left; padding:1.5rem; background:#121216; border:1px solid rgba(255,255,255,0.18); border-radius:20px; box-shadow:0 20px 50px rgba(0,0,0,0.8);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:0.8rem;">
          <h3 class="serif" style="margin:0; font-size:1.2rem; color:#fff;">Upload Momen Kondangan</h3>
          <button type="button" onclick="luxCloseUploadMemoryModal()" style="background:none; border:none; color:#aaa; font-size:1.4rem; cursor:pointer;">✕</button>
        </div>
        
        <form onsubmit="luxHandleDemoMemorySubmit(event)" style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:0.75rem; color:#ccc; margin-bottom:4px; font-weight:600;">NAMA ANDA</label>
            <input type="text" id="demoMemAuthor" placeholder="Nama Tamu Undangan" required style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.06); color:#fff; font-size:0.85rem;" />
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#ccc; margin-bottom:4px; font-weight:600;">PESAN / UCAPAN SINGKAT</label>
            <input type="text" id="demoMemCaption" placeholder="Tuliskan ucapan manis..." style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.06); color:#fff; font-size:0.85rem;" />
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#ccc; margin-bottom:4px; font-weight:600;">PILIH FOTO DARI HP / KAMERA</label>
            <input type="file" id="demoMemFile" accept="image/*" required style="width:100%; padding:8px 12px; border-radius:8px; border:1px dashed rgba(255,255,255,0.3); background:rgba(255,255,255,0.04); color:#fff; font-size:0.8rem;" />
          </div>
          <button type="submit" id="demoMemSubmitBtn" class="btn-outline-box" style="margin-top:8px; width:100%; padding:10px; background:#fff; color:#000; font-weight:700; border:none; border-radius:8px; cursor:pointer;">
            KIRIM FOTO MOMEN
          </button>
          <div id="demoMemSuccessAlert" style="display:none; color:#4ade80; font-size:0.8rem; text-align:center; margin-top:8px; font-weight:600;">
            ✓ Foto berhasil diunggah ke galeri momen pernikahan!
          </div>
        </form>
      </div>
    </div>

    <script>
      window.luxOpenUploadMemoryModal = function() {
        const m = document.getElementById('luxMemoryUploadModal');
        if (m) {
          if (m.parentNode !== document.body) document.body.appendChild(m);
          m.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
      };

      window.luxCloseUploadMemoryModal = function(e) {
        if (!e || e.target === document.getElementById('luxMemoryUploadModal') || e.target.tagName === 'BUTTON') {
          const m = document.getElementById('luxMemoryUploadModal');
          if (m) {
            m.style.display = 'none';
            document.body.style.overflow = '';
          }
        }
      };

      window.luxHandleDemoMemorySubmit = function(e) {
        e.preventDefault();
        const btn = document.getElementById('demoMemSubmitBtn');
        const alert = document.getElementById('demoMemSuccessAlert');
        if (btn) { btn.disabled = true; btn.textContent = 'Mengunggah...'; }
        setTimeout(() => {
          if (alert) alert.style.display = 'block';
          if (btn) { btn.disabled = false; btn.textContent = 'KIRIM FOTO MOMEN'; }
          setTimeout(() => {
            luxCloseUploadMemoryModal();
            if (alert) alert.style.display = 'none';
          }, 1800);
        }, 1000);
      };
    </script>
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
    
    // Exact Standardized Local Assets
    globalBgUrl: demo.globalBgUrl,
    homePhotoUrl: `/demo/${demo.themeId}/home.webp`,
    footerPhotoUrl: `/demo/${demo.themeId}/footer.webp`,
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
    qrAccessCardHtml,
    dressCodeHtml,
    liveStreamingHtml,
    weddingFilterHtml,
    memoriesSectionHtml,
    turutMengundangHtml,
    qrCoverButtonHtml,
    qrDockButtonHtml,
    wishesHtml,
    bankAccountsHtml: bankCardsHtml,
    shippingAddress: `Kediaman Mempelai, ${demo.city}, Indonesia`,
    
    googleCalendarUrl,
    waLink: `https://wa.me/6281234567890?text=Halo%20${encodeURIComponent(demo.groomName)}%20dan%20${encodeURIComponent(demo.brideName)}`,
    audioUrl: "/music/canon-in-d.ogg",
    
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,

    // Custom Labels (Zero-Hardcode Fallback for Demo)
    customLabels: {
      openBtn: "Buka Undangan",
      coverSubtitle: "Tanpa mengurangi rasa hormat, kami mengundang Anda untuk menghadiri acara pernikahan kami.",
      rsvpTitle: "Konfirmasi Kehadiran & Doa",
      ...((customData as any)?.customLabels || {}),
    },

    // Adaptive Full-Height Closing Section (Kanvas Kosong by default in demo, no dummy fallback)
    closingPhotoUrl: (customData as any)?.closingPhotoUrl || null,
    hasClosingPhoto: Boolean((customData as any)?.closingPhotoUrl),
    closingPhotoClass: (customData as any)?.closingPhotoUrl ? "has-closing-photo" : "no-closing-photo",
    closingBgStyle: (customData as any)?.closingPhotoUrl ? `background-image: url('${(customData as any).closingPhotoUrl}');` : "",
  };
}
