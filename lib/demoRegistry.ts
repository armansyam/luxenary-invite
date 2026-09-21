// S-Invite — Comprehensive Demo Registry & Full Template Data Composer
// Maps each template theme to a distinct, beautiful couple persona and standardized WebP photo set:
// - /demo/[theme]/cover.webp
// - /demo/[theme]/hero.webp
// - /demo/[theme]/background.webp
// - /demo/[theme]/groom.webp
// - /demo/[theme]/bride.webp
// - /demo/[theme]/gallery_01.webp ... gallery_08.webp

import fs from "fs";
import path from "path";
import { COLOR_PALETTES } from "@/lib/colorPalettes";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { escapeHtml } from "@/lib/escapeHtml";

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
  groomFather?: string;
  groomMother?: string;
  brideParents: string;
  brideFather?: string;
  brideMother?: string;
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
  homePhotoUrl?: string;
  groomPhotoUrl: string;
  bridePhotoUrl: string;
  sidebarPhotoUrl: string;
  landingCoverUrl: string;
  landingCoverDesktopUrl?: string;
  closingPhotoUrl?: string;
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
  defaultPalette?: string;
  audioUrl?: string;
  defaultMusicUrl?: string;
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
    groomParents: "Putra dari Ir. Hendra Pratama & Ratna Dewi",
    groomFather: "Ir. Hendra Pratama",
    groomMother: "Ratna Dewi",
    brideParents: "Putri dari Dr. Faisal Basri & Soraya Latief",
    brideFather: "Dr. Faisal Basri",
    brideMother: "Soraya Latief",
    groomInstagram: "raditya.pratama",
    brideInstagram: "alana.khairunnisa",
    monogramInitial: "R & A",
    targetDate: "2026-11-14T08:00:00",
    weddingDateFormatted: "Sabtu, 14 November 2026",
    weddingDateDay: "14",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Two lives, two hearts, joined together in friendship, united forever in love.",
    openingQuoteRef: "THE WEDDING CELEBRATION",
    city: "Jakarta",
    globalBgUrl: "/demo/kalandra/background.webp",
    groomPhotoUrl: "/demo/kalandra/groom.webp",
    bridePhotoUrl: "/demo/kalandra/bride.webp",
    sidebarPhotoUrl: "/demo/kalandra/hero.webp",
    landingCoverUrl: "/demo/kalandra/cover.webp",
    galleryPhotos: [
      "/demo/kalandra/gallery_01.webp",
      "/demo/kalandra/gallery_02.webp",
      "/demo/kalandra/gallery_03_landscape.webp",
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
      "Keluarga Besar Ir. Hendra Pratama (Jakarta)",
      "Keluarga Besar Dr. Faisal Basri (Bandung)",
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
    groomFather: "Mr. Robert Alexander",
    groomMother: "Mrs. Shirley Wijaya",
    brideParents: "Daughter of Mr. David Santoso & Mrs. Linda Hartono",
    brideFather: "Mr. David Santoso",
    brideMother: "Mrs. Linda Hartono",
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
        badge: "CEREMONY",
        title: "Wedding Ceremony",
        time: "15.30 WITA",
        location: "Cliffside Glass Pavilion, The Mulia Resort",
        address: "Jl. Raya Nusa Dua Selatan, Sawangan, Nusa Dua, Bali",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RECEPTION",
        title: "Dinner Reception",
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
    groomParents: "Putra dari Ir. Gunawan Wibowo & Cynthia Wibowo",
    groomFather: "Ir. Gunawan Wibowo",
    groomMother: "Cynthia Wibowo",
    brideParents: "Putri dari Henry Geraldine & Melani Geraldine",
    brideFather: "Henry Geraldine",
    brideMother: "Melani Geraldine",
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
      "Keluarga Besar Ir. Gunawan Wibowo",
      "Keluarga Besar Henry Geraldine",
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
    groomParents: "Putra dari K.R.T. Joyodiningrat & R.Ay. Sri Handayani",
    groomFather: "K.R.T. Joyodiningrat",
    groomMother: "R.Ay. Sri Handayani",
    brideParents: "Putri dari K.P.H. Kusumaningrat & R.Ay. Endang Puspita",
    brideFather: "K.P.H. Kusumaningrat",
    brideMother: "R.Ay. Endang Puspita",
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
      "Keluarga Ageng K.R.T. Joyodiningrat",
      "Keluarga Ageng K.P.H. Kusumaningrat",
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
    groomParents: "Putra dari Surya Sanjaya & Meilani Sanjaya",
    groomFather: "Surya Sanjaya",
    groomMother: "Meilani Sanjaya",
    brideParents: "Putri dari Franky Tanuwidjaja & Evelyn Hartarto",
    brideFather: "Franky Tanuwidjaja",
    brideMother: "Evelyn Hartarto",
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
      "Keluarga Besar Surya Sanjaya",
      "Keluarga Besar Franky Tanuwidjaja",
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
    groomParents: "Putra dari Bambang Sutrisno & Endang Lestari",
    groomFather: "Bambang Sutrisno",
    groomMother: "Endang Lestari",
    brideParents: "Putri dari Agus Wicaksono & Rini Handayani",
    brideFather: "Agus Wicaksono",
    brideMother: "Rini Handayani",
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
      "Keluarga Besar Bambang Sutrisno",
      "Keluarga Besar Agus Wicaksono",
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
    groomParents: "Putra dari Ir. Rasyid Alamsyah & Nurul Hidayah",
    groomFather: "Ir. Rasyid Alamsyah",
    groomMother: "Nurul Hidayah",
    brideParents: "Putri dari Dedi Supriyadi & Maya Anggraeni",
    brideFather: "Dedi Supriyadi",
    brideMother: "Maya Anggraeni",
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
      "Keluarga Besar Ir. Rasyid Alamsyah",
      "Keluarga Besar Dedi Supriyadi",
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
    groomParents: "Putra dari H. Malik Ibrahim & Hj. Zahra Malik",
    groomFather: "H. Malik Ibrahim",
    groomMother: "Hj. Zahra Malik",
    brideParents: "Putri dari Ir. H. Firdaus & Hj. Aminah Firdaus",
    brideFather: "Ir. H. Firdaus",
    brideMother: "Hj. Aminah Firdaus",
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
      "Keluarga Besar H. Malik Ibrahim",
      "Keluarga Besar Ir. H. Firdaus",
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
    groomParents: "Putra dari Drs. H. Anugrah Mansyur & Hj. Siti Fatimah",
    groomFather: "Drs. H. Anugrah Mansyur",
    groomMother: "Hj. Siti Fatimah",
    brideParents: "Putri dari H. Lucky Basri & Hj. Mardiah Basri",
    brideFather: "H. Lucky Basri",
    brideMother: "Hj. Mardiah Basri",
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
      "Keluarga Besar Drs. H. Anugrah Mansyur",
      "Keluarga Besar H. Lucky Basri",
    ],
  },

  badrika: {
    themeId: "badrika",
    themeName: "Badrika",
    series: "Modern",
    category: "modern",
    defaultPalette: "emerald",
    tagline: "THE WEDDING CELEBRATION",
    groomName: "Syahril",
    brideName: "Elyana",
    groomDisplayName: "Andi Syahril Ramadhan, S.T.",
    brideDisplayName: "Andi Elyana Tenri, S.Ked.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Andi Ramadhan & Andi Rosmini",
    groomFather: "Andi Ramadhan",
    groomMother: "Andi Rosmini",
    brideParents: "Putri dari Andi Tenri Tatta & Andi Sitti Nur",
    brideFather: "Andi Tenri Tatta",
    brideMother: "Andi Sitti Nur",
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
        badge: "HOLY MATRIMONY / AKAD",
        title: "Akad Nikah",
        time: "08.00 – 10.00 WITA",
        location: "Grand Ballroom The Rinra Makassar",
        address: "Jl. Metro Tanjung Bunga No. 2, Makassar",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "WEDDING RECEPTION",
        title: "Resepsi Pernikahan",
        time: "11.30 – 14.30 WITA",
        location: "Nusantara Hall, The Rinra Makassar",
        address: "Jl. Metro Tanjung Bunga No. 2, Makassar",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Chapter 01",
        title: "A Beautiful Beginning",
        content: "Melangkah bersama dengan cinta dan komitmen untuk membangun masa depan yang penuh kebahagiaan.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238491", name: "Andi Syahril" },
      { bank: "Bank Mandiri", number: "1520098765432", name: "Andi Elyana" },
    ],
    dressCodeColors: "#0f2b23, #c5a059, #fbfaf7",
    dressCodeNote: "Formal Evening Attire / Nuansa Emerald & Champagne Gold",
    turutMengundang: ["Keluarga Besar Andi Ramadhan", "Keluarga Besar Andi Tenri Tatta"],
  },

  toraja: {
    themeId: "toraja",
    themeName: "Toraja",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "toraja",
    tagline: "RAMPUAN LOLO & KURRESUMANGA' ROYAL",
    groomName: "Arka",
    brideName: "Naya",
    groomDisplayName: "Arka Zayn Sambolinggi', S.T.",
    brideDisplayName: "Naya Kayla Salombe', B.Des.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Adi Suseno & Ibu Isnaniah",
    groomFather: "Adi Suseno",
    groomMother: "Isnaniah",
    brideParents: "Putri dari Bpk. Bambang Salombe' & Ibu Novi",
    brideFather: "Bambang Salombe'",
    brideMother: "Novi",
    groomInstagram: "arka.toraja",
    brideInstagram: "naya.salombe",
    monogramInitial: "A & N",
    targetDate: "2026-12-30T09:00:00",
    weddingDateFormatted: "Rabu, 30 Desember 2026",
    weddingDateDay: "30",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Misa' kada dipotuo, pantan kada dipomate. Keberkahan dan kedamaian senantiasa melingkupi dua insan yang dipersatukan dalam ikatan suci pernikahan adat Toraja.",
    openingQuoteRef: "KADA DIPOTUO TORAJA",
    city: "Tana Toraja",
    globalBgUrl: "/demo/toraja/background.webp",
    homePhotoUrl: "/demo/toraja/hero.webp",
    groomPhotoUrl: "/demo/toraja/groom.webp",
    bridePhotoUrl: "/demo/toraja/bride.webp",
    sidebarPhotoUrl: "/demo/toraja/hero.webp",
    landingCoverUrl: "/demo/toraja/cover.webp",
    landingCoverDesktopUrl: "/demo/toraja/cover_desktop.webp",
    galleryPhotos: [
      "/demo/toraja/gallery_01.webp",
      "/demo/toraja/gallery_02.webp",
      "/demo/toraja/gallery_03.webp",
      "/demo/toraja/gallery_04.webp",
      "/demo/toraja/gallery_05.webp",
      "/demo/toraja/gallery_06.webp",
      "/demo/toraja/gallery_07.webp",
      "/demo/toraja/gallery_08.webp",
    ],
    events: [
      {
        badge: "PEMBERKATAN / AKAD",
        title: "Ibadah Pemberkatan Nikah",
        time: "09.00 WITA – Selesai",
        location: "Gereja Toraja Jemaat Rantepao",
        address: "Jl. Sam Ratulangi No. 12, Rantepao, Tana Toraja",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Rampuan Lolo",
        time: "12.00 WITA – Selesai",
        location: "Tongkonan Buntu Pune",
        address: "Kete Kesu, Sanggalangi, Tana Toraja",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pertemuan",
        title: "Awal Mula Kisah Kasih",
        content: "Di bawah naungan bumi Lakipadada, dua langkah dipertemukan oleh takdir yang indah.",
      },
      {
        chapter: "Komitmen",
        title: "Mengikat Janji Suci",
        content: "Dengan restu kedua rumpun keluarga besar Tongkonan, kami bertekad melangkah bersama menuju mahligai rumah tangga.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238491", name: "Arka Zayn Sambolinggi'" },
      { bank: "Bank Mandiri", number: "1520098765432", name: "Naya Kayla Salombe'" },
    ],
    dressCodeColors: "#750b0a, #f1d17e, #1a0404, #ffffff",
    dressCodeNote: "Busana Adat Toraja / Nuansa Crimson Marun, Emas Bambu & Hitam Tongkonan",
    turutMengundang: ["Rumpun Keluarga Besar Sambolinggi'", "Rumpun Keluarga Besar Salombe'"],
  },

  rantepao: {
    themeId: "rantepao",
    themeName: "Rantepao",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "toraja",
    tagline: "RAMPUAN LOLO & KURRESUMANGA' RANTEPAO",
    groomName: "Arka",
    brideName: "Naya",
    groomDisplayName: "Arka Zayn Sambolinggi', S.T.",
    brideDisplayName: "Naya Kayla Salombe', B.Des.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Adi Suseno & Ibu Isnaniah",
    groomFather: "Adi Suseno",
    groomMother: "Isnaniah",
    brideParents: "Putri dari Bpk. Bambang Salombe' & Ibu Novi",
    brideFather: "Bambang Salombe'",
    brideMother: "Novi",
    groomInstagram: "arka.toraja",
    brideInstagram: "naya.salombe",
    monogramInitial: "A & N",
    targetDate: "2026-12-30T09:00:00",
    weddingDateFormatted: "Rabu, 30 Desember 2026",
    weddingDateDay: "30",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Misa' kada dipotuo, pantan kada dipomate. Bersatu kita teguh dalam janji suci, berpadu dua rumpun keluarga besar adat Toraja di bumi Rantepao.",
    openingQuoteRef: "PETUAH KELUARGA BESAR TORAJA",
    city: "Rantepao, Toraja Utara",
    globalBgUrl: "/demo/rantepao/background.webp",
    homePhotoUrl: "/demo/rantepao/home.webp",
    groomPhotoUrl: "/demo/rantepao/groom.webp",
    bridePhotoUrl: "/demo/rantepao/bride.webp",
    sidebarPhotoUrl: "/demo/rantepao/hero.webp",
    landingCoverUrl: "/demo/rantepao/cover.webp",
    landingCoverDesktopUrl: "/demo/rantepao/cover_desktop.webp",
    closingPhotoUrl: "/demo/rantepao/footer.webp",
    galleryPhotos: [
      "/demo/rantepao/gallery_01.webp",
      "/demo/rantepao/gallery_02.webp",
      "/demo/rantepao/gallery_03.webp",
      "/demo/rantepao/gallery_04.webp",
      "/demo/rantepao/gallery_05.webp",
      "/demo/rantepao/gallery_06.webp",
      "/demo/rantepao/gallery_07.webp",
      "/demo/rantepao/gallery_08.webp",
    ],
    events: [
      {
        badge: "PEMBERKATAN / AKAD",
        title: "Ibadah Pemberkatan Nikah",
        time: "09.00 WITA – Selesai",
        location: "Gereja Toraja Jemaat Rantepao",
        address: "Jl. Sam Ratulangi No. 12, Rantepao, Toraja Utara",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Rampuan Lolo",
        time: "12.00 WITA – Selesai",
        location: "Balai Kesenian Rantepao",
        address: "Rantepao, Kabupaten Toraja Utara, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pertemuan",
        title: "Awal Mula Kisah Kasih",
        content: "Di bawah naungan bumi Rantepao, dua langkah dipertemukan oleh takdir yang indah.",
      },
      {
        chapter: "Komitmen",
        title: "Mengikat Janji Suci",
        content: "Dengan restu kedua rumpun keluarga besar, kami bertekad melangkah bersama menuju mahligai rumah tangga yang kokoh.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238491", name: "Arka Zayn Sambolinggi'" },
      { bank: "Bank Mandiri", number: "1520098765432", name: "Naya Kayla Salombe'" },
    ],
    dressCodeColors: "#750b0a, #f1d17e, #1a0404, #ffffff",
    dressCodeNote: "Busana Adat Toraja / Nuansa Crimson Marun, Emas Bambu & Hitam Rantepao",
    turutMengundang: ["Rumpun Keluarga Besar Sambolinggi'", "Rumpun Keluarga Besar Salombe'"],
  },

  makale: {
    themeId: "makale",
    themeName: "Makale",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "toraja",
    tagline: "RAMPUAN LOLO & KURRESUMANGA' MAKALE",
    groomName: "Bryan",
    brideName: "Clarissa",
    groomDisplayName: "Bryan Lande' Sombolinggi, S.H.",
    brideDisplayName: "Clarissa Maya Parinding, M.M.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Ir. Markus Sombolinggi & Ibu Elsye",
    groomFather: "Markus Sombolinggi",
    groomMother: "Elsye",
    brideParents: "Putri dari Bpk. Drs. Daniel Parinding & Ibu Martha",
    brideFather: "Daniel Parinding",
    brideMother: "Martha",
    groomInstagram: "bryan.sombolinggi",
    brideInstagram: "clarissa.parinding",
    monogramInitial: "B & C",
    targetDate: "2026-11-28T09:00:00",
    weddingDateFormatted: "Sabtu, 28 November 2026",
    weddingDateDay: "28",
    weddingDateMonth: "11",
    weddingDateYear: "2026",
    openingQuote: "Misa' kada dipotuo, pantan kada dipomate. Di bawah naungan Buntu Burake dan bumi Makale Tana Toraja, dua rumpun keluarga berpadu dalam ikrar suci pernikahan yang kekal.",
    openingQuoteRef: "PETUAH ADAT TANA TORAJA",
    city: "Makale, Tana Toraja",
    globalBgUrl: "/demo/makale/background.webp",
    homePhotoUrl: "/demo/makale/home.webp",
    groomPhotoUrl: "/demo/makale/groom.webp",
    bridePhotoUrl: "/demo/makale/bride.webp",
    sidebarPhotoUrl: "/demo/makale/hero.webp",
    landingCoverUrl: "/demo/makale/cover.webp",
    landingCoverDesktopUrl: "/demo/makale/cover_desktop.webp",
    closingPhotoUrl: "/demo/makale/footer.webp",
    galleryPhotos: [
      "/demo/makale/gallery_01.webp",
      "/demo/makale/gallery_02.webp",
      "/demo/makale/gallery_03.webp",
      "/demo/makale/gallery_04.webp",
      "/demo/makale/gallery_05.webp",
      "/demo/makale/gallery_06.webp",
      "/demo/makale/gallery_07.webp",
      "/demo/makale/gallery_08.webp",
    ],
    events: [
      {
        badge: "PEMBERKATAN NIKAH",
        title: "Ibadah Pemberkatan Kudus",
        time: "09.00 WITA – Selesai",
        location: "Gereja Toraja Jemaat Sion Makale",
        address: "Jl. Nusantara No. 8, Makale, Tana Toraja",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Rampuan Lolo Makale",
        time: "12.00 WITA – Selesai",
        location: "Gedung Tammuan Mali' Makale",
        address: "Makale, Kabupaten Tana Toraja, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Awal Cerita",
        title: "Pertemuan di Bumi Lakipadada",
        content: "Di kota Makale yang sejuk dan bersejarah, takdir mempertemukan dua insan untuk melangkah bersama.",
      },
      {
        chapter: "Ikrar Hati",
        title: "Berpadu Dua Rumpun Keluarga",
        content: "Dengan doa restu keluarga besar adat Toraja, kami mantap mengikat janji suci mengarungi bahtera kehidupan.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847120", name: "Bryan Lande' Sombolinggi" },
      { bank: "Bank Mandiri", number: "1520084719203", name: "Clarissa Maya Parinding" },
    ],
    dressCodeColors: "#750b0a, #f1d17e, #1a0404, #ffffff",
    dressCodeNote: "Busana Adat Toraja / Nuansa Crimson Marun, Emas Tongkonan & Hitam Makale",
    turutMengundang: ["Rumpun Keluarga Besar Sombolinggi", "Rumpun Keluarga Besar Parinding"],
  },

  bugis: {
    themeId: "bugis",
    themeName: "Bugis",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "bugis",
    tagline: "SIPAKATAU & KURRU SUMANGA' ROYAL",
    groomName: "Fahri",
    brideName: "Tenri",
    groomDisplayName: "Andi Muhammad Fahri, S.T.",
    brideDisplayName: "Andi Tenri Olle, S.Farm.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Andi Mappanyukki & Andi Bau Cenning",
    groomFather: "Andi Mappanyukki",
    groomMother: "Andi Bau Cenning",
    brideParents: "Putri dari Andi Patunru & Andi Besse Kajuara",
    brideFather: "Andi Patunru",
    brideMother: "Andi Besse Kajuara",
    groomInstagram: "fahri.bugis",
    brideInstagram: "tenri.olle",
    monogramInitial: "F & T",
    targetDate: "2026-12-18T09:00:00",
    weddingDateFormatted: "Jumat, 18 Desember 2026",
    weddingDateDay: "18",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Sipakatau, sipakalebbi, sipakainge. Narekko purai sikaleng, tessisarakang lino ahera. Dengan memohon ridho dan rahmat Allah SWT, kami bermaksud melangsungkan ikatan suci pernikahan adat Bugis.",
    openingQuoteRef: "PAPPASENG TO RIOLO",
    city: "Bone",
    globalBgUrl: "/demo/bugis/background.webp",
    homePhotoUrl: "/demo/bugis/home.webp",
    groomPhotoUrl: "/demo/bugis/groom.webp",
    bridePhotoUrl: "/demo/bugis/bride.webp",
    sidebarPhotoUrl: "/demo/bugis/hero.webp",
    landingCoverUrl: "/demo/bugis/cover.webp",
    landingCoverDesktopUrl: "/demo/bugis/cover_desktop.webp",
    closingPhotoUrl: "/demo/bugis/footer.webp",
    galleryPhotos: [
      "/demo/bugis/gallery_01.webp",
      "/demo/bugis/gallery_02.webp",
      "/demo/bugis/gallery_03.webp",
      "/demo/bugis/gallery_04.webp",
      "/demo/bugis/gallery_05.webp",
      "/demo/bugis/gallery_06.webp",
      "/demo/bugis/gallery_07.webp",
      "/demo/bugis/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Bugis",
        time: "09.00 WITA – Selesai",
        location: "Saoraja Lamurukung",
        address: "Jl. Lapatau No. 45, Bone, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI PERNIKAHAN",
        title: "Mappakawing & Resepsi Agung",
        time: "19.00 WITA – Selesai",
        location: "Grand Saoraja Ballroom",
        address: "Jl. Merdeka No. 88, Bone, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Mappese-pese",
        title: "Awal Berkenalan",
        content: "Dipertemukan dalam harmoni tradisi dan restu keluarga yang tulus, dua hati saling menemukan ketenangan.",
      },
      {
        chapter: "Mappetuada",
        title: "Ikatan Pertunangan",
        content: "Dengan penyampaian sompa dan sesumpah adat, kami memantapkan langkah menuju pelaminan nan agung.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238492", name: "Andi Muhammad Fahri" },
      { bank: "Bank Mandiri", number: "1520098765433", name: "Andi Tenri Olle" },
    ],
    dressCodeColors: "#5a0b10, #dfb76c, #140204, #ffffff",
    dressCodeNote: "Busana Adat Bugis / Nuansa Maroon Emas Lipa' Sabbe",
    turutMengundang: ["Keluarga Besar Andi Mappanyukki", "Keluarga Besar Andi Patunru"],
  },

  makassar: {
    themeId: "makassar",
    themeName: "Makassar",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "makassar",
    tagline: "SIRI' NA PACCE & SOMBERE' ROYAL",
    groomName: "Daeng",
    brideName: "Cenning",
    groomDisplayName: "Muhammad Daeng Rewa, S.T.",
    brideDisplayName: "Nur Cenning Baji', S.I.Kom.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. H. Daeng Jarre & Ibu Hj. Sitti Halijah",
    groomFather: "H. Daeng Jarre",
    groomMother: "Hj. Sitti Halijah",
    brideParents: "Putri dari Bpk. Drs. H. Daeng Manaba & Ibu Hj. Indo' Ratu",
    brideFather: "Drs. H. Daeng Manaba",
    brideMother: "Hj. Indo' Ratu",
    groomInstagram: "daeng.rewa",
    brideInstagram: "cenning.baji",
    monogramInitial: "D & C",
    targetDate: "2026-12-24T09:00:00",
    weddingDateFormatted: "Kamis, 24 Desember 2026",
    weddingDateDay: "24",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Bajiki passiriki, sombere' na malabbiri. Siri' na pacce menjadi landasan teguh dua insan yang berpadu dalam ikatan suci pernikahan adat Makassar.",
    openingQuoteRef: "PASANG RI BURA'NE",
    city: "Makassar",
    globalBgUrl: "/demo/makassar/background.webp",
    homePhotoUrl: "/demo/makassar/home.webp",
    groomPhotoUrl: "/demo/makassar/groom.webp",
    bridePhotoUrl: "/demo/makassar/bride.webp",
    sidebarPhotoUrl: "/demo/makassar/hero.webp",
    landingCoverUrl: "/demo/makassar/cover.webp",
    landingCoverDesktopUrl: "/demo/makassar/cover_desktop.webp",
    closingPhotoUrl: "/demo/makassar/footer.webp",
    galleryPhotos: [
      "/demo/makassar/gallery_01.webp",
      "/demo/makassar/gallery_02.webp",
      "/demo/makassar/gallery_03.webp",
      "/demo/makassar/gallery_04.webp",
      "/demo/makassar/gallery_05.webp",
      "/demo/makassar/gallery_06.webp",
      "/demo/makassar/gallery_07.webp",
      "/demo/makassar/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Makassar",
        time: "09.00 WITA – Selesai",
        location: "Balla Lompoa Sungguminasa",
        address: "Jl. K.H. Wahid Hasyim, Sungguminasa, Gowa - Makassar",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI AGUNG",
        title: "Resepsi Malam & Sombere'",
        time: "19.00 WITA – Selesai",
        location: "Phinisi Ballroom Clarion",
        address: "Jl. A.P. Pettarani No. 3, Makassar",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "A'jangang-jangang",
        title: "Awal Langkah Silaturahmi",
        content: "Di tepian pantai Losari, dua langkah mengawali perjalanan cinta yang santun dan penuh kehormatan.",
      },
      {
        chapter: "A'mula Passuro",
        title: "Meminang dengan Kehormatan",
        content: "Dengan rasa hormat yang luhur (sombere' na malabbiri), keluarga menyatukan dua hati dalam janji suci berlayar bersama.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238493", name: "Muhammad Daeng Rewa" },
      { bank: "Bank Mandiri", number: "1520098765434", name: "Nur Cenning Baji'" },
    ],
    dressCodeColors: "#0a192f, #dfb76c, #030914, #ffffff",
    dressCodeNote: "Busana Adat Makassar / Nuansa Royal Navy Phinisi & Emas Kemuliaan",
    turutMengundang: ["Keluarga Besar Muh. Daeng Rewa", "Keluarga Besar Drs. H. Daeng Manaba"],
  },

  bone: {
    themeId: "bone",
    themeName: "Bone",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "bone",
    tagline: "SIPAKATAU & SAORAJA BONE ROYAL",
    groomName: "Fahri",
    brideName: "Tenri",
    groomDisplayName: "Andi Muhammad Fahri, S.T.",
    brideDisplayName: "Andi Tenri Olle, S.Farm.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Andi Mappanyukki & Andi Bau Cenning",
    groomFather: "Andi Mappanyukki",
    groomMother: "Andi Bau Cenning",
    brideParents: "Putri dari Andi Patunru & Andi Besse Kajuara",
    brideFather: "Andi Patunru",
    brideMother: "Andi Besse Kajuara",
    groomInstagram: "fahri.bone",
    brideInstagram: "tenri.olle",
    monogramInitial: "F & T",
    targetDate: "2026-12-18T09:00:00",
    weddingDateFormatted: "Jumat, 18 Desember 2026",
    weddingDateDay: "18",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Sipakatau, sipakalebbi, sipakainge. Di bumi Arung Palakka dan keagungan Saoraja Lamurukung, dua rumpun keluarga bangsawan Bone berpadu dalam ikrar suci.",
    openingQuoteRef: "PAPPASENG TO BONE",
    city: "Watampone, Bone",
    globalBgUrl: "/demo/bone/background.webp",
    homePhotoUrl: "/demo/bone/home.webp",
    groomPhotoUrl: "/demo/bone/groom.webp",
    bridePhotoUrl: "/demo/bone/bride.webp",
    sidebarPhotoUrl: "/demo/bone/hero.webp",
    landingCoverUrl: "/demo/bone/cover.webp",
    landingCoverDesktopUrl: "/demo/bone/cover_desktop.webp",
    closingPhotoUrl: "/demo/bone/footer.webp",
    galleryPhotos: [
      "/demo/bone/gallery_01.webp",
      "/demo/bone/gallery_02.webp",
      "/demo/bone/gallery_03.webp",
      "/demo/bone/gallery_04.webp",
      "/demo/bone/gallery_05.webp",
      "/demo/bone/gallery_06.webp",
      "/demo/bone/gallery_07.webp",
      "/demo/bone/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Bugis Bone",
        time: "09.00 WITA – Selesai",
        location: "Saoraja Lamurukung",
        address: "Jl. Lapatau No. 45, Bone, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Saoraja Bone",
        time: "19.00 WITA – Selesai",
        location: "Novena Hotel Watampone (Grand Ballroom)",
        address: "Jl. Jenderal Ahmad Yani No. 25, Bone",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Mappatabe",
        title: "Langkah Awal Pertemuan",
        content: "Di bawah keteduhan kota Watampone yang bersejarah, ikatan cinta bersemi dengan restu keluarga besar.",
      },
      {
        chapter: "Ikrar",
        title: "Menyatukan Dua Rumpun Keluarga",
        content: "Dengan memegang teguh filosofi sipakatau, kami bertekad melangkah bersama mengarungi bahtera rumah tangga.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901238491", name: "Andi Muhammad Fahri" },
      { bank: "Bank Mandiri", number: "1520098765432", name: "Andi Tenri Olle" },
    ],
    dressCodeColors: "#5a0b10, #dfb76c, #140204, #ffffff",
    dressCodeNote: "Busana Adat Bugis / Nuansa Maroon & Gold Saoraja Bone",
    turutMengundang: ["Keluarga Besar Andi Mappanyukki", "Keluarga Besar Andi Patunru"],
  },

  wajo: {
    themeId: "wajo",
    themeName: "Wajo",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "wajo",
    tagline: "TENUN SUTERA & SAORAJA BETTEMPOLA",
    groomName: "Fatur",
    brideName: "Sitti",
    groomDisplayName: "Andi Faturrahman, S.H.",
    brideDisplayName: "Andi Sitti Maryam, S.E.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Andi Baso Ranreng & Andi Sitti Dala",
    groomFather: "Andi Baso Ranreng",
    groomMother: "Andi Sitti Dala",
    brideParents: "Putri dari Andi Paduppai & Andi Nurhayati",
    brideFather: "Andi Paduppai",
    brideMother: "Andi Nurhayati",
    groomInstagram: "fatur.wajo",
    brideInstagram: "sitti.maryam",
    monogramInitial: "F & S",
    targetDate: "2026-12-20T09:00:00",
    weddingDateFormatted: "Minggu, 20 Desember 2026",
    weddingDateDay: "20",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Maradeka to Wajo-e, naia tompo' ri ade'na. Dalam ketulusan cinta dan keindahan sutera Sengkang, kami berpadu mengikat janji suci pernikahan.",
    openingQuoteRef: "PAPPASENG TO WAJO",
    city: "Sengkang, Wajo",
    globalBgUrl: "/demo/wajo/background.webp",
    homePhotoUrl: "/demo/wajo/home.webp",
    groomPhotoUrl: "/demo/wajo/groom.webp",
    bridePhotoUrl: "/demo/wajo/bride.webp",
    sidebarPhotoUrl: "/demo/wajo/hero.webp",
    landingCoverUrl: "/demo/wajo/cover.webp",
    landingCoverDesktopUrl: "/demo/wajo/cover_desktop.webp",
    closingPhotoUrl: "/demo/wajo/footer.webp",
    galleryPhotos: [
      "/demo/wajo/gallery_01.webp",
      "/demo/wajo/gallery_02.webp",
      "/demo/wajo/gallery_03.webp",
      "/demo/wajo/gallery_04.webp",
      "/demo/wajo/gallery_05.webp",
      "/demo/wajo/gallery_06.webp",
      "/demo/wajo/gallery_07.webp",
      "/demo/wajo/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Bugis Wajo",
        time: "09.00 WITA – Selesai",
        location: "Gedung Assa'adah Sengkang",
        address: "Jl. Andi Ninnong, Sengkang, Kabupaten Wajo",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Sutera Wajo",
        time: "19.00 WITA – Selesai",
        location: "Gedung PGRI Sengkang",
        address: "Sengkang, Kabupaten Wajo, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Awal Mula",
        title: "Kilau Sutera di Danau Tempe",
        content: "Pertemuan indah di kota sutera Sengkang mengawali jalinan kasih yang dirajut penuh ketulusan.",
      },
      {
        chapter: "Komitmen",
        title: "Menuju Mahligai Rumah Tangga",
        content: "Dengan ridho Ilahi dan restu orang tua, kami mantap menyatukan dua rumpun keluarga besar.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847291", name: "Andi Faturrahman" },
      { bank: "Bank Mandiri", number: "1520084719201", name: "Andi Sitti Maryam" },
    ],
    dressCodeColors: "#5a0b10, #dfb76c, #140204, #ffffff",
    dressCodeNote: "Busana Adat Sutera Sengkang / Maroon & Gold Wajo",
    turutMengundang: ["Keluarga Besar Andi Baso Ranreng", "Keluarga Besar Andi Paduppai"],
  },

  soppeng: {
    themeId: "soppeng",
    themeName: "Soppeng",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "soppeng",
    tagline: "BUMI LATEMMAMALA & ROYAL VILLA YULIANA",
    groomName: "Reza",
    brideName: "Dian",
    groomDisplayName: "Andi Reza Mahendra, S.Ked.",
    brideDisplayName: "Andi Dian Pratiwi, S.Farm.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Andi Mahendra & Andi Radiah",
    groomFather: "Andi Mahendra",
    groomMother: "Andi Radiah",
    brideParents: "Putri dari Andi Pallawarukka & Andi Tenri Sana",
    brideFather: "Andi Pallawarukka",
    brideMother: "Andi Tenri Sana",
    groomInstagram: "reza.soppeng",
    brideInstagram: "dian.pratiwi",
    monogramInitial: "R & D",
    targetDate: "2026-12-22T09:00:00",
    weddingDateFormatted: "Selasa, 22 Desember 2026",
    weddingDateDay: "22",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Tepu nalisu ada to riolo, mate ri tani-tani, malompo ri ada tongeng. Di bumi Latemmamala Soppeng, dua hati bersatu dalam naungan adat dan kehormatan.",
    openingQuoteRef: "PAPPASENG TO SOPPENG",
    city: "Watansoppeng, Soppeng",
    globalBgUrl: "/demo/soppeng/background.webp",
    homePhotoUrl: "/demo/soppeng/home.webp",
    groomPhotoUrl: "/demo/soppeng/groom.webp",
    bridePhotoUrl: "/demo/soppeng/bride.webp",
    sidebarPhotoUrl: "/demo/soppeng/hero.webp",
    landingCoverUrl: "/demo/soppeng/cover.webp",
    landingCoverDesktopUrl: "/demo/soppeng/cover_desktop.webp",
    closingPhotoUrl: "/demo/soppeng/footer.webp",
    galleryPhotos: [
      "/demo/soppeng/gallery_01.webp",
      "/demo/soppeng/gallery_02.webp",
      "/demo/soppeng/gallery_03.webp",
      "/demo/soppeng/gallery_04.webp",
      "/demo/soppeng/gallery_05.webp",
      "/demo/soppeng/gallery_06.webp",
      "/demo/soppeng/gallery_07.webp",
      "/demo/soppeng/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Bugis Soppeng",
        time: "09.00 WITA – Selesai",
        location: "Gedung Pertemuan Masyarakat Watansoppeng",
        address: "Jl. Kesatria, Watansoppeng, Kabupaten Soppeng",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Latemmamala",
        time: "19.00 WITA – Selesai",
        location: "Gedung Serbaguna Triple 8 Resort",
        address: "Watansoppeng, Kabupaten Soppeng, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pertemuan",
        title: "Di Bawah Naungan Villa Yuliana",
        content: "Suasana sejuk dan damai Watansoppeng mempertemukan dua insan dalam ikatan takdir yang suci.",
      },
      {
        chapter: "Penyatuan",
        title: "Mengikat Janji Suci Pernikahan",
        content: "Dengan doa restu keluarga besar adat Bugis Soppeng, kami melangkah menuju hari depan yang penuh berkah.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847392", name: "Andi Reza Mahendra" },
      { bank: "Bank Mandiri", number: "1520084719202", name: "Andi Dian Pratiwi" },
    ],
    dressCodeColors: "#5a0b10, #dfb76c, #140204, #ffffff",
    dressCodeNote: "Busana Adat Bugis / Nuansa Maroon & Gold Soppeng",
    turutMengundang: ["Keluarga Besar Andi Mahendra", "Keluarga Besar Andi Pallawarukka"],
  },

  gowa: {
    themeId: "gowa",
    themeName: "Gowa",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "gowa",
    tagline: "KEMEGAHAN ADAT SULTAN HASANUDDIN & BALLA LOMPOA",
    groomName: "Daeng Rewa",
    brideName: "Cenning",
    groomDisplayName: "Muh. Daeng Rewa Karaeng Tompo, S.T.",
    brideDisplayName: "St. Nur Cenning Baji Karaeng Ratu, S.Pd.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Daeng Bella & Ibu St. Halijah",
    groomFather: "Daeng Bella",
    groomMother: "St. Halijah",
    brideParents: "Putri dari Drs. H. Daeng Manaba & Hj. Indo' Ratu",
    brideFather: "Drs. H. Daeng Manaba",
    brideMother: "Hj. Indo' Ratu",
    groomInstagram: "daeng.rewa",
    brideInstagram: "cenning.baji",
    monogramInitial: "R & C",
    targetDate: "2026-12-24T09:00:00",
    weddingDateFormatted: "Kamis, 24 Desember 2026",
    weddingDateDay: "24",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Bajiki passiriki, sombere' na malabbiri. Di bumi bersejarah Somba Opu dan Balla Lompoa Gowa, dua insan berpadu dalam ikatan suci adat Makassar yang agung.",
    openingQuoteRef: "PASANG RI GOWA",
    city: "Sungguminasa, Gowa",
    globalBgUrl: "/demo/gowa/background.webp",
    homePhotoUrl: "/demo/gowa/home.webp",
    groomPhotoUrl: "/demo/gowa/groom.webp",
    bridePhotoUrl: "/demo/gowa/bride.webp",
    sidebarPhotoUrl: "/demo/gowa/hero.webp",
    landingCoverUrl: "/demo/gowa/cover.webp",
    landingCoverDesktopUrl: "/demo/gowa/cover_desktop.webp",
    closingPhotoUrl: "/demo/gowa/footer.webp",
    galleryPhotos: [
      "/demo/gowa/gallery_01.webp",
      "/demo/gowa/gallery_02.webp",
      "/demo/gowa/gallery_03.webp",
      "/demo/gowa/gallery_04.webp",
      "/demo/gowa/gallery_05.webp",
      "/demo/gowa/gallery_06.webp",
      "/demo/gowa/gallery_07.webp",
      "/demo/gowa/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Kesultanan Gowa",
        time: "09.00 WITA – Selesai",
        location: "Istana Balla Lompoa Sungguminasa",
        address: "Jl. K.H. Wahid Hasyim No. 39, Sungguminasa, Gowa",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Makassar Royal",
        time: "19.00 WITA – Selesai",
        location: "Gedung Haji Bate Sungguminasa",
        address: "Jl. Tumanurung, Sungguminasa, Kabupaten Gowa",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Mappasikarawa",
        title: "Sumpah Suci di Somba Opu",
        content: "Di tanah para pahlawan Gowa yang agung, dua hati berpadu membawa kehormatan dan restu leluhur.",
      },
      {
        chapter: "Langkah Pasti",
        title: "Mengukir Bahtera Kebahagiaan",
        content: "Dengan landasan siri' na pacce, kami meneguhkan komitmen untuk saling mendampingi seumur hidup.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847493", name: "Muh. Daeng Rewa" },
      { bank: "Bank Mandiri", number: "1520084719203", name: "St. Nur Cenning Baji" },
    ],
    dressCodeColors: "#0a192f, #dfb76c, #030914, #ffffff",
    dressCodeNote: "Busana Adat Makassar / Royal Navy & Gold Balla Lompoa",
    turutMengundang: ["Keluarga Besar Muh. Daeng Rewa", "Keluarga Besar Drs. H. Daeng Manaba"],
  },

  maros: {
    themeId: "maros",
    themeName: "Maros",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "maros",
    tagline: "BUTTA SALEWANGANG & PESONA RAMMANG-RAMMANG",
    groomName: "Haidir",
    brideName: "Rani",
    groomDisplayName: "Andi Haidir Daeng Situju, S.IP.",
    brideDisplayName: "Andi Maharani Karaeng Baji, S.Hum.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Daeng Marala & Ibu Indo' Te'ne",
    groomFather: "Daeng Marala",
    groomMother: "Indo' Te'ne",
    brideParents: "Putri dari Bpk. Daeng Kulle & Ibu St. Rawiah",
    brideFather: "Daeng Kulle",
    brideMother: "St. Rawiah",
    groomInstagram: "haidir.maros",
    brideInstagram: "maharani.baji",
    monogramInitial: "H & R",
    targetDate: "2026-12-26T09:00:00",
    weddingDateFormatted: "Sabtu, 26 Desember 2026",
    weddingDateDay: "26",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Kukalengngi atengku ri barakkana Butta Salewangang. Di bawah megahnya bukit karst Rammang-Rammang Maros, kami mengucap janji suci pernikahan yang kekal.",
    openingQuoteRef: "FILOSOFI BUTTA SALEWANGANG MAROS",
    city: "Maros",
    globalBgUrl: "/demo/maros/background.webp",
    homePhotoUrl: "/demo/maros/home.webp",
    groomPhotoUrl: "/demo/maros/groom.webp",
    bridePhotoUrl: "/demo/maros/bride.webp",
    sidebarPhotoUrl: "/demo/maros/hero.webp",
    landingCoverUrl: "/demo/maros/cover.webp",
    landingCoverDesktopUrl: "/demo/maros/cover_desktop.webp",
    closingPhotoUrl: "/demo/maros/footer.webp",
    galleryPhotos: [
      "/demo/maros/gallery_01.webp",
      "/demo/maros/gallery_02.webp",
      "/demo/maros/gallery_03.webp",
      "/demo/maros/gallery_04.webp",
      "/demo/maros/gallery_05.webp",
      "/demo/maros/gallery_06.webp",
      "/demo/maros/gallery_07.webp",
      "/demo/maros/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Butta Salewangang",
        time: "09.00 WITA – Selesai",
        location: "Masjid Agung Al-Markaz Al-Islami Maros",
        address: "Jl. Jenderal Sudirman, Pettuadae, Turikale, Maros",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Makassar Maros",
        time: "19.00 WITA – Selesai",
        location: "Grand Town Hotel Ballroom Mandai",
        address: "Jl. Poros Makassar - Maros KM 22, Mandai, Maros",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Awal Kasih",
        title: "Kisah di Butta Salewangang",
        content: "Kedamaian alam Maros menjadi saksi bertemunya dua insan yang dipersatukan oleh ketulusan doa.",
      },
      {
        chapter: "Janji Suci",
        title: "Melangkah Menuju Pelaminan",
        content: "Dengan restu kedua keluarga besar, kami bersiap membangun mahligai rumah tangga yang kokoh dan bahagia.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847594", name: "Andi Haidir Daeng Situju" },
      { bank: "Bank Mandiri", number: "1520084719204", name: "Andi Maharani Karaeng Baji" },
    ],
    dressCodeColors: "#0a192f, #dfb76c, #030914, #ffffff",
    dressCodeNote: "Busana Adat Makassar / Royal Navy & Gold Butta Salewangang",
    turutMengundang: ["Keluarga Besar Daeng Marala", "Keluarga Besar Daeng Kulle"],
  },

  takalar: {
    themeId: "takalar",
    themeName: "Takalar",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "takalar",
    tagline: "PANRANNUANGKU & SAORAJA SANROBONE",
    groomName: "Irfan",
    brideName: "Nurmala",
    groomDisplayName: "Muh. Irfan Daeng Mile, S.Pi.",
    brideDisplayName: "Nurmala Sari Karaeng Ke'nang, S.Kep.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Daeng Jarung & Ibu Indo' Puji",
    groomFather: "Daeng Jarung",
    groomMother: "Indo' Puji",
    brideParents: "Putri dari Bpk. Daeng Sila & Ibu St. Aminah",
    brideFather: "Daeng Sila",
    brideMother: "St. Aminah",
    groomInstagram: "irfan.takalar",
    brideInstagram: "nurmala.kenang",
    monogramInitial: "I & N",
    targetDate: "2026-12-28T09:00:00",
    weddingDateFormatted: "Senin, 28 Desember 2026",
    weddingDateDay: "28",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Ammempo ri panrannuangku, siri' na pacce nipakateteng. Dari bumi pesisir Sanrobone Takalar, dua hati berpadu mengarungi samudera kehidupan bersama.",
    openingQuoteRef: "PASANG RI BUTTA PANRANNUANGKU",
    city: "Pattallassang, Takalar",
    globalBgUrl: "/demo/takalar/background.webp",
    homePhotoUrl: "/demo/takalar/home.webp",
    groomPhotoUrl: "/demo/takalar/groom.webp",
    bridePhotoUrl: "/demo/takalar/bride.webp",
    sidebarPhotoUrl: "/demo/takalar/hero.webp",
    landingCoverUrl: "/demo/takalar/cover.webp",
    landingCoverDesktopUrl: "/demo/takalar/cover_desktop.webp",
    closingPhotoUrl: "/demo/takalar/footer.webp",
    galleryPhotos: [
      "/demo/takalar/gallery_01.webp",
      "/demo/takalar/gallery_02.webp",
      "/demo/takalar/gallery_03.webp",
      "/demo/takalar/gallery_04.webp",
      "/demo/takalar/gallery_05.webp",
      "/demo/takalar/gallery_06.webp",
      "/demo/takalar/gallery_07.webp",
      "/demo/takalar/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Sanrobone",
        time: "09.00 WITA – Selesai",
        location: "Kawasan Adat Balla Lompoa Sanrobone",
        address: "Sanrobone, Kabupaten Takalar, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Panrannuangku",
        time: "19.00 WITA – Selesai",
        location: "Gedung Islamic Center Takalar",
        address: "Pattallassang, Kabupaten Takalar, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Panrannuangku",
        title: "Harapan yang Bersemi",
        content: "Di tanah Takalar yang permai, takdir menautkan dua insan untuk berjanji sehidup semati.",
      },
      {
        chapter: "Janji Setia",
        title: "Melangkah Bersama Menuju Sakinah",
        content: "Dengan doa restu para tetua dan keluarga besar, kami bersiap membina keluarga yang harmonis.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847695", name: "Muh. Irfan Daeng Mile" },
      { bank: "Bank Mandiri", number: "1520084719205", name: "Nurmala Sari Karaeng Ke'nang" },
    ],
    dressCodeColors: "#0a192f, #dfb76c, #030914, #ffffff",
    dressCodeNote: "Busana Adat Makassar / Royal Navy & Gold Takalar",
    turutMengundang: ["Keluarga Besar Daeng Jarung", "Keluarga Besar Daeng Sila"],
  },

  bulukumba: {
    themeId: "bulukumba",
    themeName: "Bulukumba",
    series: "Traditional",
    category: "traditional",
    defaultPalette: "bulukumba",
    tagline: "BUTTA PANRITA LOPI & KEMEGAHAN PHINISI",
    groomName: "Ilham",
    brideName: "Fidya",
    groomDisplayName: "Capt. Ilham Daeng Mattiro, M.Mar.",
    brideDisplayName: "dr. Nurul Fidya Karaeng Rannu",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Bpk. Daeng Macora & Ibu Hj. Indo' Caddi",
    groomFather: "Daeng Macora",
    groomMother: "Hj. Indo' Caddi",
    brideParents: "Putri dari H. Daeng Pasau & Hj. St. Rohani",
    brideFather: "H. Daeng Pasau",
    brideMother: "Hj. St. Rohani",
    groomInstagram: "ilham.phinisi",
    brideInstagram: "fidya.rannu",
    monogramInitial: "I & F",
    targetDate: "2026-12-30T09:00:00",
    weddingDateFormatted: "Rabu, 30 Desember 2026",
    weddingDateDay: "30",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Tallang sipahua, manynyameng kininnawa. Di bumi Panrita Lopi Bulukumba, bahtera cinta kami berlayar menuju pelabuhan sakinah mawaddah warahmah.",
    openingQuoteRef: "FILOSOFI PANRITA LOPI BULUKUMBA",
    city: "Ujung Bulu, Bulukumba",
    globalBgUrl: "/demo/bulukumba/background.webp",
    homePhotoUrl: "/demo/bulukumba/home.webp",
    groomPhotoUrl: "/demo/bulukumba/groom.webp",
    bridePhotoUrl: "/demo/bulukumba/bride.webp",
    sidebarPhotoUrl: "/demo/bulukumba/hero.webp",
    landingCoverUrl: "/demo/bulukumba/cover.webp",
    landingCoverDesktopUrl: "/demo/bulukumba/cover_desktop.webp",
    closingPhotoUrl: "/demo/bulukumba/footer.webp",
    galleryPhotos: [
      "/demo/bulukumba/gallery_01.webp",
      "/demo/bulukumba/gallery_02.webp",
      "/demo/bulukumba/gallery_03.webp",
      "/demo/bulukumba/gallery_04.webp",
      "/demo/bulukumba/gallery_05.webp",
      "/demo/bulukumba/gallery_06.webp",
      "/demo/bulukumba/gallery_07.webp",
      "/demo/bulukumba/gallery_08.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah Adat Panrita Lopi",
        time: "09.00 WITA – Selesai",
        location: "Masjid Islamic Center Dato Tiro Bulukumba",
        address: "Jl. Sultan Hasanuddin, Ujung Bulu, Bulukumba",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Adat Phinisi Royal",
        time: "19.00 WITA – Selesai",
        location: "Gedung Masagena Bulukumba",
        address: "Ujung Bulu, Kabupaten Bulukumba, Sulawesi Selatan",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pelayaran",
        title: "Pertemuan di Bumi Panrita Lopi",
        content: "Laksana kokohnya lunas kapal Phinisi, cinta kami dibangun di atas keteguhan tekad dan niat yang tulus.",
      },
      {
        chapter: "Pelabuhan Hati",
        title: "Menuju Dermaga Bahagia",
        content: "Dengan doa restu keluarga besar adat Bulukumba, kami berlayar bersama mengarungi samudra kehidupan.",
      },
    ],
    banks: [
      { bank: "BCA", number: "7901847796", name: "Ilham Daeng Mattiro" },
      { bank: "Bank Mandiri", number: "1520084719206", name: "Nurul Fidya Karaeng Rannu" },
    ],
    dressCodeColors: "#0a192f, #dfb76c, #030914, #ffffff",
    dressCodeNote: "Busana Adat Makassar / Royal Navy & Gold Panrita Lopi",
    turutMengundang: ["Keluarga Besar Daeng Macora", "Keluarga Besar H. Daeng Pasau"],
  },

  mayang: {

    themeId: "mayang",
    themeName: "Mayang",
    series: "Modern",
    category: "modern",
    defaultPalette: "champagne",
    tagline: "THE WEDDING CELEBRATION",
    groomName: "Bagus",
    brideName: "Mayang",
    groomDisplayName: "Bagus Wicaksono, M.M.",
    brideDisplayName: "Mayang Kusuma, S.Sn.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Ir. Hendra Suryonegoro & Dra. Retno Palupi",
    groomFather: "Ir. Hendra Suryonegoro",
    groomMother: "Dra. Retno Palupi",
    brideParents: "Putri dari Ir. H. Bambang Hartono & Hj. Endang Sulistyowati",
    brideFather: "Ir. H. Bambang Hartono",
    brideMother: "Hj. Endang Sulistyowati",
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
    turutMengundang: ["Keluarga Besar Trah Suryonegoro", "Keluarga Besar Ir. H. Bambang Hartono"],
  },

  candani: {
    themeId: "candani",
    themeName: "Candani",
    series: "Modern",
    category: "modern",
    defaultPalette: "terracotta",
    tagline: "MODERN BOTANICAL FLORAL",
    groomName: "Rijal",
    brideName: "Mega",
    groomDisplayName: "Rijal Fauzi, S.Pd.",
    brideDisplayName: "Mega Puspita, S.I.Kom.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Ir. Irawan Sadjojo & Dra. Indriwati Parayana.ME",
    groomFather: "Ir. Irawan Sadjojo",
    groomMother: "Dra. Indriwati Parayana.ME",
    brideParents: "Putri dari Ir. Radja Rejaja & Dra. Riska Maryam.SE",
    brideFather: "Ir. Radja Rejaja",
    brideMother: "Dra. Riska Maryam.SE",
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
    turutMengundang: ["Keluarga Besar Ir. Irawan Sadjojo", "Keluarga Besar Ir. Radja Rejaja"],
  },

  lagaligo: {
    themeId: "lagaligo",
    themeName: "La Galigo",
    series: "Traditional",
    category: "traditional",
    tagline: "KEMEGAHAN ADAT SUTERA BUGIS",
    groomName: "Faisal",
    brideName: "Tenri",
    groomDisplayName: "Andi Faisal Wardhana, S.T.",
    brideDisplayName: "Andi Tenri Bau Sumpala, S.H.",
    groomRole: "Mempelai Pria",
    brideRole: "Mempelai Wanita",
    groomParents: "Putra dari Drs. H. Andi Wardhana & Hj. Andi Nurul Qalbi",
    groomFather: "Drs. H. Andi Wardhana",
    groomMother: "Hj. Andi Nurul Qalbi",
    brideParents: "Putri dari Ir. H. Andi Sumpala & Hj. Andi Besse Tenri",
    brideFather: "Ir. H. Andi Sumpala",
    brideMother: "Hj. Andi Besse Tenri",
    groomInstagram: "faisal.wardhana",
    brideInstagram: "tenri.sumpala",
    monogramInitial: "F & T",
    targetDate: "2026-12-12T09:00:00",
    weddingDateFormatted: "Sabtu, 12 Desember 2026",
    weddingDateDay: "12",
    weddingDateMonth: "12",
    weddingDateYear: "2026",
    openingQuote: "Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Perkenankanlah kami merangkai kasih sayang yang Kau ciptakan di antara putra-putri kami dalam ikatan suci pernikahan.",
    openingQuoteRef: "QS. AR-RUM: 21",
    city: "Makassar",
    globalBgUrl: "/uploads/dummy/AMS06365.webp",
    groomPhotoUrl: "/uploads/dummy/AMS06372.webp",
    bridePhotoUrl: "/uploads/dummy/AMS06381.webp",
    sidebarPhotoUrl: "/uploads/dummy/AMS06364.webp",
    landingCoverUrl: "/uploads/dummy/AMS06353.webp",
    galleryPhotos: [
      "/uploads/dummy/AMS06328.webp",
      "/uploads/dummy/AMS06353.webp",
      "/uploads/dummy/AMS06364.webp",
      "/uploads/dummy/AMS06365.webp",
      "/uploads/dummy/AMS06372.webp",
      "/uploads/dummy/AMS06388.webp",
      "/uploads/dummy/AMS06410.webp",
      "/uploads/dummy/AMS06430.webp",
    ],
    events: [
      {
        badge: "AKAD NIKAH",
        title: "Akad Nikah & Mappasikarawa",
        time: "09.00 – 11.30 WITA",
        location: "Sandeq Ballroom Hotel Claro Makassar",
        address: "Jl. A. P. Pettarani No. 03, Makassar",
        mapsUrl: "https://maps.google.com",
      },
      {
        badge: "RESEPSI ADAT",
        title: "Resepsi Pernikahan Adat Bugis",
        time: "19.00 – 22.00 WITA",
        location: "Grand Sandeq Ballroom Hotel Claro Makassar",
        address: "Jl. A. P. Pettarani No. 03, Makassar",
        mapsUrl: "https://maps.google.com",
      },
    ],
    stories: [
      {
        chapter: "Pertemuan",
        title: "Mappatabe",
        content: "Dua keluarga bangsawan yang dipersatukan dalam ikatan suci penuh berkah dan kehormatan.",
      },
    ],
    banks: [
      { bank: "BCA", number: "1982347610", name: "Andi Faisal Wardhana" },
      { bank: "BSI", number: "7109283745", name: "Andi Tenri Bau Sumpala" },
    ],
    dressCodeColors: "#003f30, #f9e7bc, #059669",
    dressCodeNote: "Baju Bodo / Busana Adat Nusantara / Formal Evening Attire",
    turutMengundang: ["Keluarga Besar Drs. H. Andi Wardhana", "Keluarga Besar Ir. H. Andi Sumpala"],
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
    groomFather: "Mr. Robert Nicholas",
    groomMother: "Mrs. Diana Nicholas",
    brideParents: "Daughter of Mr. William Alexander & Mrs. Evelyn Alexander",
    brideFather: "Mr. William Alexander",
    brideMother: "Mrs. Evelyn Alexander",
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
    groomParents: "Putra dari Ir. Gunawan Alexander & Maria",
    groomFather: "Ir. Gunawan Alexander",
    groomMother: "Maria",
    brideParents: "Putri dari Dr. Hartanto Suwandi & Sylvia",
    brideFather: "Dr. Hartanto Suwandi",
    brideMother: "Sylvia",
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
    groomFather: "Mr. Arthur Maverick",
    groomMother: "Mrs. Helena Maverick",
    brideParents: "Daughter of Mr. Marcus Hartono & Mrs. Catherine Hartono",
    brideFather: "Mr. Marcus Hartono",
    brideMother: "Mrs. Catherine Hartono",
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
    homePhotoUrl: "/demo/chronicle/hero.webp",
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
  const base = DEMO_REGISTRY[normalized] || DEMO_REGISTRY.kalandra;
  const demo: DemoThemeData = { ...base };
  if (!DEMO_REGISTRY[normalized]) {
    demo.themeId = normalized;
    demo.themeName = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Demo Theme";
  }

  try {
    const publicThemeDir = path.join(process.cwd(), "public", "demo", normalized);
    if (fs.existsSync(path.join(publicThemeDir, "cover.mp4"))) {
      demo.landingCoverUrl = `/demo/${normalized}/cover.mp4`;
    }
    if (fs.existsSync(path.join(publicThemeDir, "hero.mp4"))) {
      demo.sidebarPhotoUrl = `/demo/${normalized}/hero.mp4`;
    }
    if (fs.existsSync(path.join(publicThemeDir, "background.mp4"))) {
      demo.globalBgUrl = `/demo/${normalized}/background.mp4`;
    }
    if (fs.existsSync(path.join(publicThemeDir, "music.mp3"))) {
      (demo as any).audioUrl = `/demo/${normalized}/music.mp3`;
    } else if (fs.existsSync(path.join(publicThemeDir, "music.ogg"))) {
      (demo as any).audioUrl = `/demo/${normalized}/music.ogg`;
    }
  } catch {}

  return demo;
}

// Helper to ensure clean canonical local demo asset URLs
function appendDemoAssetVersion(url?: string | null, v?: number | string): string {
  if (!url) return "";
  return url;
}

// Master composer to build ALL sections for the HTML templates
export function composeDemoTemplateData(
  themeId: string,
  paletteKey?: string,
  customData?: Partial<DemoThemeData>,
  cacheVersion?: number | string
) {
  const baseDemo = getDemoThemeData(themeId);
  const demo: DemoThemeData = customData ? { ...baseDemo, ...customData } : baseDemo;
  const blueprint = getThemeBlueprint(themeId, customData);
  const resolvedPalette = paletteKey || customData?.defaultPalette || (customData as any)?.colorPalette || blueprint.defaultPalette || demo.defaultPalette || "champagne";
  const palette = COLOR_PALETTES[resolvedPalette] || COLOR_PALETTES.champagne;

  const v = cacheVersion || (customData as any)?.cacheVersion || undefined;
  const withV = (url?: string | null) => appendDemoAssetVersion(url, v);

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
          BUKA GOOGLE MAPS
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
    <section class="sec-flow sec-journey" id="story">
      <span class="sec-eyebrow reveal" data-lux-field="customLabels.storyEyebrow">${blueprint.storySectionEyebrow || "OUR JOURNEY"}</span>
      <h2 class="sec-main-title journey-title serif reveal delay-1" data-lux-field="customLabels.storyTitle">${blueprint.storySectionTitle || "Love Story"}</h2>
      <div class="journey-timeline journey-chapters reveal-up delay-2">
        ${storyItemsHtml}
      </div>
      <div class="journey-footer reveal-fade delay-3">
        <div class="jf-line"></div>
        <span class="jf-signature serif">${demo.groomName} <em>&amp;</em> ${demo.brideName}</span>
      </div>
    </section>
  `;

  // 3. Gallery Section HTML with Smart Auto-Packing Grid and Zoom Lightbox
  const rawGallery = Array.isArray(customData?.galleryPhotos) ? customData.galleryPhotos : demo.galleryPhotos || [];
  const activeGallery = rawGallery.filter((p) => Boolean(p && typeof p === "string" && p.trim()));

  const photosFeedHtml = activeGallery.map((imgUrl, i) => `
    <div class="moment-photo-item" data-idx="${i}" onclick="luxOpenZoom(${i})">
      <img src="${withV(imgUrl)}" alt="Our Moment ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
    </div>
  `).join("");

  const allPhotosGridHtml = activeGallery.map((imgUrl, i) => `
    <div class="full-gallery-item" onclick="luxOpenZoom(${i})">
      <img src="${withV(imgUrl)}" alt="Photo ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
    </div>
  `).join("");

  const gallerySectionHtml = `
    <section class="sec-flow" id="moments">
      <span class="sec-eyebrow" data-lux-field="customLabels.galleryEyebrow">${blueprint.gallerySectionEyebrow || "GALLERY"}</span>
      <h2 class="sec-main-title serif" data-lux-field="customLabels.galleryTitle">${blueprint.gallerySectionTitle || "Our Moments"}</h2>
      <p class="moment-quote serif" data-lux-field="customLabels.galleryQuote">
        “${blueprint.galleryQuote || "And I’d choose you; in a hundred lifetimes, in a hundred worlds, in any version of reality, I’d find you and I’d choose you."}”
      </p>

      <div class="moments-grid-10">
        ${photosFeedHtml}
      </div>

      <button type="button" class="btn-outline-box btn-show-gallery" onclick="luxOpenFullGallery()">
        LIHAT SEMUA FOTO (${activeGallery.length} FOTO)
      </button>

      <style>
        .moments-grid-10 {
          display: grid !important; grid-template-columns: repeat(4, 1fr) !important; grid-auto-flow: dense !important;
          gap: 5px !important; margin-bottom: 2.2rem !important; width: 100% !important;
        }
        .moment-photo-item {
          position: relative !important; overflow: hidden !important; border-radius: 6px !important; cursor: pointer !important;
          border: 1px solid rgba(255,255,255,0.12) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
          transition: border-color 0.25s ease, filter 0.25s ease !important; aspect-ratio: 3/4 !important;
        }
        .moment-photo-item.is-landscape { grid-column: span 2 !important; aspect-ratio: 3/2 !important; }
        .moment-photo-item:hover { border-color: rgba(255,255,255,0.35) !important; filter: brightness(1.08) !important; }
        .moment-photo-item img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
        .btn-show-gallery { display: inline-block !important; margin-bottom: 0 !important; }
      </style>
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
        <img id="luxZoomActiveImg" src="${withV(activeGallery[0] || '')}" alt="Zoom View" referrerpolicy="no-referrer">
        <div class="lux-zoom-counter" id="luxZoomCounter">1 / ${activeGallery.length || 1}</div>
      </div>
      <button class="lux-zoom-nav next" onclick="luxNextZoom(event)">›</button>
    </div>

    <script>
      window.LUX_ALL_PHOTOS = ${JSON.stringify(activeGallery.map((p) => withV(p)))};
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

      // Smart Puzzle Grid Auto-Packing (100% flush rectangular frame, no holes)
      function initSmartPuzzleGallery() {
        const grid = document.querySelector('.moments-grid-10');
        if (!grid) return;
        const items = Array.from(grid.querySelectorAll('.moment-photo-item'));
        if (!items.length) return;

        let loadedCount = 0;
        items.forEach((item) => {
          const img = item.querySelector('img');
          if (!img) return;

          function applyOrientation(w, h) {
            if (w && h) {
              if (w > h * 1.12) {
                item.classList.add('is-landscape');
              } else {
                item.classList.remove('is-landscape');
              }
            }
            loadedCount++;
            if (loadedCount >= items.length) {
              packPuzzleSlots(items);
            }
          }

          if (img.complete && img.naturalWidth > 0) {
            applyOrientation(img.naturalWidth, img.naturalHeight);
          } else {
            const probe = new Image();
            probe.referrerPolicy = 'no-referrer';
            probe.onload = function() {
              applyOrientation(probe.naturalWidth, probe.naturalHeight);
            };
            probe.onerror = function() {
              loadedCount++;
            };
            probe.src = img.src;
          }
        });

        setTimeout(() => { packPuzzleSlots(items); }, 500);
      }

      function packPuzzleSlots(items) {
        let totalSlots = 0;
        const targetMaxPhotos = 12;
        const targetMaxSlots = 12;
        let bestCutoff = Math.min(items.length, 8);

        for (let i = 0; i < items.length; i++) {
          if (i >= targetMaxPhotos) break;
          const slotCost = items[i].classList.contains('is-landscape') ? 2 : 1;
          if (totalSlots + slotCost > targetMaxSlots) break;
          totalSlots += slotCost;
          if (totalSlots % 4 === 0) {
            bestCutoff = i + 1;
          }
        }

        items.forEach((item, idx) => {
          item.style.display = idx < bestCutoff ? 'block' : 'none';
        });
      }
      document.addEventListener('DOMContentLoaded', initSmartPuzzleGallery);
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
      <span class="sec-eyebrow" data-lux-field="customLabels.giftEyebrow">${blueprint.giftSectionEyebrow || "WEDDING GIFT"}</span>
      <h2 class="sec-main-title serif" data-lux-field="customLabels.giftTitle">${blueprint.giftSectionTitle || "Tanda Kasih"}</h2>
      <p class="sec-sub" data-lux-field="customLabels.giftDesc">
        ${blueprint.giftSectionDesc || "Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Bagi Anda yang ingin memberikan tanda kasih:"}
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


        <div class="pass-souvenir-bar">
          <span class="souvenir-lbl">VOUCHER SOUVENIR:</span>
          <span class="souvenir-code">SOUVENIR-${demo.themeId.toUpperCase()}</span>
        </div>

        <div style="text-align: center; margin-top: 1.25rem;">
          <a href="/demo/receptionist" class="btn-map-outline" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 22px; font-size: 11px; font-weight: 700; border-radius: 50px; text-decoration: none; border: 1px solid currentColor; letter-spacing: 0.06em; transition: all 0.2s ease;">
            <span>UJI SCAN DI RESEPSIONIS DEMO</span>
            <span>&rarr;</span>
          </a>
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
      <span class="sec-eyebrow" data-lux-field="customLabels.dressCodeEyebrow">${blueprint.dressCodeEyebrow || "A GUIDE TO"}</span>
      <h2 class="sec-main-title serif" data-lux-field="customLabels.dressCodeTitle">${blueprint.dressCodeTitle || "Dress Code"}</h2>
      <p class="sec-sub" data-lux-field="customLabels.dressCodeSubtitle">${blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:"}</p>
      <div style="display:flex; justify-content:center; gap:12px; margin: 1.5rem 0;">${colorBadges}</div>
      <p style="margin:0; font-size:0.8rem; color:rgba(255,255,255,0.75); line-height:1.5;">${demo.dressCodeNote}</p>
    </section>
  `;

  // 7. Live Streaming Section
  const liveStreamingHtml = `
    <section class="sec-flow" id="live">
      <span class="sec-eyebrow" data-lux-field="customLabels.streamingEyebrow">${blueprint.streamingEyebrow || "VIRTUAL CEREMONY"}</span>
      <h2 class="sec-main-title serif" data-lux-field="customLabels.streamingTitle">${blueprint.streamingTitle || "Live Streaming"}</h2>
      <p class="sec-sub">${demo.weddingDateFormatted} • 08.00 – Selesai</p>
      <p class="sec-sub" style="margin-top:0.4rem;" data-lux-field="customLabels.streamingSubtitle">${blueprint.streamingSubtitle || "Bagi keluarga &amp; sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:"}</p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:0.8rem; margin-top:1.5rem;">
        <a href="https://instagram.com/${demo.brideInstagram}" target="_blank" class="btn-map-outline">INSTAGRAM LIVE</a>
        <a href="https://youtube.com" target="_blank" class="btn-map-outline">YOUTUBE LIVE</a>
      </div>
    </section>
  `;

  // 8. Turut Mengundang Section
  const turutMengundangHtml = `
    <section class="sec-flow" id="turut-mengundang">
      <span class="sec-eyebrow" data-lux-field="customLabels.turutMengundangEyebrow">${blueprint.turutMengundangEyebrow || "KELUARGA BESAR"}</span>
      <h2 class="sec-main-title serif" data-lux-field="customLabels.turutMengundangTitle">${blueprint.turutMengundangTitle || "Turut Mengundang"}</h2>
      <p class="sec-sub" data-lux-field="customLabels.turutMengundangSubtitle">${blueprint.turutMengundangSubtitle || "Keluarga Besar &amp; Kerabat yang turut berbahagia:"}</p>
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
    <div class="wish-item">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
        <span class="wish-name">Keluarga Besar Makassar</span>
        <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(74,222,128,0.15); color:#4ade80; font-weight:600;">Hadir (4 Orang)</span>
      </div>
      <p class="wish-msg">“Barakallahu lakuma wa baraka alaikuma wa jama'a bainakuma fii khair. Turut berbahagia untuk kedua mempelai tercinta.”</p>
    </div>
    <div class="wish-item">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
        <span class="wish-name">Alumni Kampus</span>
        <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(74,222,128,0.15); color:#4ade80; font-weight:600;">Hadir (2 Orang)</span>
      </div>
      <p class="wish-msg">“Selamat menempuh hidup baru sahabatku! Bahagia selalu sampai kakek nenek.”</p>
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
          <span>BUKA INSTAGRAM FILTER</span>
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

  const storyCirclesHtml = randomSampleMemories.map((sm) => {
    const vImg = withV(sm.img);
    const vAlt = withV(sm.alt);
    return `
    <div class="lux-story-circle-item" style="display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; flex-shrink: 0; width: 68px;" onclick="luxOpenMemoryZoom('${vImg}', '${sm.name}')">
      <div style="width: 58px; height: 58px; border-radius: 9999px; padding: 2px; background: linear-gradient(135deg, #d4af37, #f59e0b, #eab308); box-shadow: 0 0 10px rgba(212,175,55,0.35);">
        <div style="width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; background: #1c1917; border: 2px solid #0c0a09; display: flex; align-items: center; justify-content: center;">
          <img src="${vImg}" onerror="this.onerror=null;this.src='${vAlt}';" alt="${sm.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
        </div>
      </div>
      <span style="font-size: 11px; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; opacity: 0.85; text-align: center;">
        ${sm.name.split(" ")[0]}
      </span>
    </div>
  `;
  }).join("");

  const memoriesSectionHtml = `
    <section class="sec-flow slide-section" id="section-memories" style="position: relative; padding: 3rem 1rem;">
      <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
        <span class="sec-eyebrow">AFTER-EVENT MEMORIES</span>
        <h2 class="sec-main-title serif">KENANGAN TAMU</h2>
        <p class="sec-sub" style="max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.82rem; line-height: 1.6; opacity: 0.8;">
          Buka kamera dan jepret momen candid seru Anda selama menghadiri pernikahan kami langsung ke album kenangan bersama:
        </p>

        <!-- 1. TOMBOL BUKA KAMERA KENANGAN -->
        <a href="/demo/sharemoment?theme=${demo.themeId}" style="display: block; width: 100%; max-width: 360px; margin: 0 auto 1.8rem auto; padding: 14px 20px; border-radius: 50px; background: #ffffff; color: #000000; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.05em; text-align: center; text-decoration: none; box-shadow: 0 4px 15px rgba(255,255,255,0.18); transition: transform 0.15s ease;">
          BUKA KAMERA KENANGAN
        </a>

        <!-- 2. HIGHLIGHT LINGKARAN (5 LINGKARAN DI LAYAR, LOOPING MARQUEE JIKA > 5) -->
        <div class="memories-highlights-wrapper" style="width: 100%; max-width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 14px 10px; margin-bottom: 1.5rem; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 10px; font-weight: 700; opacity: 0.85; padding: 0 6px;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 99px; background: #10b981; display: inline-block;"></span>
              FOTO DARI PARA TAMU
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

        <!-- 3. TOMBOL DIRECT KE HALAMAN GALERI WEB (memories) -->
        <div style="text-align: center;">
          <a href="/demo/memories?theme=${demo.themeId}" class="btn-outline-box btn-memories-gallery" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 28px; font-size: 12px; font-weight: 700; border-radius: 50px; text-decoration: none; border: 1px solid currentColor; letter-spacing: 0.08em; transition: all 0.25s ease;">
            <span>BUKA GALERI MOMEN LENGKAP</span>
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
      .btn-memories-gallery {
        color: inherit;
      }
      .btn-memories-gallery:hover {
        background: #ffffff !important;
        color: #070709 !important;
        border-color: #ffffff !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
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

  const primaryDemoEvent = demo.events.find((e) => (e as any).isPrimary) || demo.events[0];
  const calendarLocation = primaryDemoEvent?.location || primaryDemoEvent?.address || demo.events[0]?.location || demo.city || "Makassar";
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`The Wedding of ${demo.groomName} & ${demo.brideName}`)}&dates=${demo.weddingDateYear}${demo.weddingDateMonth}${demo.weddingDateDay}T010000Z/${demo.weddingDateYear}${demo.weddingDateMonth}${demo.weddingDateDay}T140000Z&location=${encodeURIComponent(calendarLocation)}`;

  const demoDir = path.join(process.cwd(), "public", "demo", demo.themeId);
  const localHomeExists = fs.existsSync(path.join(demoDir, "home.webp"));
  const localFooterExists = fs.existsSync(path.join(demoDir, "footer.webp"));

  // Closing / Footer Photo
  const customClosing = (customData as any)?.closingPhotoUrl !== undefined 
    ? (customData as any)?.closingPhotoUrl 
    : (customData as any)?.footerPhotoUrl;
  const rawClosing = customClosing !== undefined 
    ? customClosing 
    : (localFooterExists ? `/demo/${demo.themeId}/footer.webp` : "");

  // Home Photo: Prioritaskan foto spesifik tema atau kustom studio. Jika kosong, biarkan kosong tanpa fallback ke global background.
  const customHome = (customData as any)?.homePhotoUrl;
  const specificHomePhoto = customHome !== undefined 
    ? (customHome || "") 
    : (localHomeExists ? `/demo/${demo.themeId}/home.webp` : (demo.homePhotoUrl || ""));
  const effectiveHomePhoto = specificHomePhoto || demo.globalBgUrl;
  const homeCssPhoto = specificHomePhoto ? withV(specificHomePhoto) : "";

  const defaultCanonExists = fs.existsSync(path.join(process.cwd(), "public", "music", "canon-in-d.ogg"));
  const fallbackSong = defaultCanonExists ? "/music/canon-in-d.ogg" : (fs.existsSync(path.join(process.cwd(), "public", "music", "bermuara.mp3")) ? "/music/bermuara.mp3" : "");
  const effectiveAudioUrl = withV((customData as any)?.audioUrl !== undefined ? (customData as any)?.audioUrl : ((demo as any)?.audioUrl || (customData as any)?.defaultMusicUrl || blueprint.defaultMusicUrl || fallbackSong));

  const effectiveLandingCover = withV((customData as any)?.landingCoverUrl !== undefined ? (customData as any)?.landingCoverUrl : demo.landingCoverUrl);
  const effectiveLandingCoverDesktop = withV((customData as any)?.landingCoverDesktopUrl !== undefined ? (customData as any)?.landingCoverDesktopUrl : (demo.landingCoverDesktopUrl || ""));
  const effectiveSidebarPhoto = withV((customData as any)?.sidebarPhotoUrl !== undefined ? (customData as any)?.sidebarPhotoUrl : demo.sidebarPhotoUrl);
  const effectiveGlobalBg = withV((customData as any)?.globalBgUrl !== undefined ? (customData as any)?.globalBgUrl : demo.globalBgUrl);
  const effectiveHome = withV(effectiveHomePhoto);
  const effectiveFooter = rawClosing ? withV(rawClosing) : "";
  const effectiveGroom = withV((customData as any)?.groomPhotoUrl !== undefined ? (customData as any)?.groomPhotoUrl : demo.groomPhotoUrl);
  const effectiveBride = withV((customData as any)?.bridePhotoUrl !== undefined ? (customData as any)?.bridePhotoUrl : demo.bridePhotoUrl);
  const versionedGallery = activeGallery.map((p) => withV(p));

  // 13. Wedding Vendors Section Demo (Clean, borderless, no-card-wrap minimalist logo grid)
  const demoVendorsList = [
    { name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
    { name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
    { name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
    { name: "Royal Wedding Car", logoUrl: "/uploads/logo_dummy/logo_4.png", url: "https://instagram.com" },
  ];

  const customVendors = (customData as any)?.featureSettings?.vendors || (customData as any)?.vendors;
  const effectiveVendors = Array.isArray(customVendors) && customVendors.length > 0 ? customVendors : demoVendorsList;
  const isVendorsEnabled = (customData as any)?.featureSettings?.showVendors !== undefined 
    ? Boolean((customData as any).featureSettings.showVendors) 
    : ((customData as any)?.showVendors !== undefined ? Boolean((customData as any).showVendors) : true);

  const vendorTitle = (customData as any)?.customLabels?.vendorTitle || (customData as any)?.vendorTitle || blueprint.vendorTitle || "Vendor";
  const vendorEyebrow = (customData as any)?.customLabels?.vendorEyebrow || (customData as any)?.vendorEyebrow || blueprint.vendorEyebrow || "SPECIAL THANKS";
  const vendorSubtitle = (customData as any)?.customLabels?.vendorSubtitle || (customData as any)?.vendorSubtitle || blueprint.vendorSubtitle || "";

  let vendorsSectionHtml = "";
  if (isVendorsEnabled && effectiveVendors.length > 0) {
    const vendorCardsHtml = effectiveVendors.map((v: any) => {
      const name = (v.name || "").trim();
      const logo = (v.logoUrl || "").trim();
      let rawUrl = (v.url || "").trim();
      let finalUrl = "";
      if (rawUrl) {
        if (rawUrl.startsWith("@")) finalUrl = `https://instagram.com/${rawUrl.slice(1).trim()}`;
        else if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("//")) finalUrl = rawUrl;
        else finalUrl = `https://${rawUrl}`;
      }

      const logoHtml = logo
        ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name || "Vendor")}" class="lux-vendor-logo-img" loading="lazy" style="max-height: 48px; max-width: 140px; width: auto; height: auto; object-fit: contain; opacity: 0.95; transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.06)';" onmouseout="this.style.opacity='0.95'; this.style.transform='scale(1)';" />`
        : "";

      const nameHtml = name
        ? `<span class="lux-vendor-text-name ${logo ? "" : "serif"}" style="${logo ? "font-size: 0.82rem; font-weight: 500; letter-spacing: 0.03em;" : "font-size: 1.05rem; font-weight: 600; letter-spacing: 0.04em;"} color: var(--text-main, #ffffff) !important; opacity: 0.92; text-align: center; line-height: 1.35; background: transparent !important; border: none !important; text-decoration: none !important;">${escapeHtml(name)}</span>`
        : "";

      const itemContent = `
        <div class="lux-vendor-item" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important;">
          ${logoHtml}
          ${nameHtml}
        </div>
      `.trim();

      if (finalUrl) {
        return `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name || "Kunjungi Profil Vendor")}" class="lux-vendor-link" style="display: flex; align-items: center; justify-content: center; text-decoration: none !important; color: var(--accent) !important; padding: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important; transition: transform 0.2s ease;">${itemContent}</a>`;
      }
      return `<div class="lux-vendor-link" style="display: flex; align-items: center; justify-content: center; text-decoration: none !important; color: var(--accent) !important; padding: 0.5rem; background: transparent !important; border: none !important; box-shadow: none !important;">${itemContent}</div>`;
    }).join("");

    vendorsSectionHtml = `
      <section class="sec-flow slide-section" id="section-vendors" data-section-alias="vendors" style="position: relative; padding: 4.5rem 1.5rem; text-align: center;">
        <style>
          .lux-vendors-grid a.lux-vendor-link, .lux-vendors-grid a.lux-vendor-link:visited, .lux-vendors-grid a.lux-vendor-link:hover, .lux-vendors-grid a.lux-vendor-link:active { color: var(--accent) !important; text-decoration: none !important; }
          .lux-vendors-grid a.lux-vendor-link:hover .lux-vendor-text-name { opacity: 1 !important; text-decoration: underline !important; }
        </style>
        <a id="vendors" style="display:none;"></a>
        <div class="sec-content-box reveal-on-scroll" style="max-width: 580px; margin: 0 auto; text-align: center;">
          ${vendorEyebrow ? `<span class="sec-eyebrow" data-lux-field="customLabels.vendorEyebrow" style="display: block; font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); opacity: 0.85; margin-bottom: 0.5rem;">${escapeHtml(vendorEyebrow)}</span>` : ""}
          <h2 class="sec-main-title serif" data-lux-field="customLabels.vendorTitle" style="font-size: 2.3rem; margin-bottom: ${vendorSubtitle ? '0.6rem' : '2.8rem'}; color: var(--accent); letter-spacing: 0.02em;">${escapeHtml(vendorTitle)}</h2>
          ${vendorSubtitle ? `<p class="sec-sub" data-lux-field="customLabels.vendorSubtitle" style="max-width: 480px; margin: 0 auto 2.5rem auto; font-size: 0.84rem; line-height: 1.6; opacity: 0.8;">${escapeHtml(vendorSubtitle)}</p>` : ""}

          <div class="lux-vendors-grid" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2.2rem 2.8rem; max-width: 540px; margin: 0 auto;">
            ${vendorCardsHtml}
          </div>
        </div>
      </section>
    `;
  }

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
    firstInitial: (demo.groomName || "G").trim().charAt(0).toUpperCase(),
    secondInitial: (demo.brideName || "B").trim().charAt(0).toUpperCase(),
    firstNickname: demo.groomName,
    secondNickname: demo.brideName,
    firstName: demo.groomName,
    secondName: demo.brideName,
    groomNickname: demo.groomName,
    brideNickname: demo.brideName,
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
    firstParentPrefix: "Putra dari",
    secondParentPrefix: "Putri dari",
    groomParents: demo.groomParents,
    brideParents: demo.brideParents,
    groomFather: demo.groomFather || "",
    groomMother: demo.groomMother || "",
    brideFather: demo.brideFather || "",
    brideMother: demo.brideMother || "",
    firstFather: demo.groomFather || "",
    firstMother: demo.groomMother || "",
    secondFather: demo.brideFather || "",
    secondMother: demo.brideMother || "",
    firstParents: demo.groomParents,
    secondParents: demo.brideParents,
    groomInstagram: demo.groomInstagram,
    brideInstagram: demo.brideInstagram,
    firstInstagram: demo.groomInstagram,
    secondInstagram: demo.brideInstagram,
    
    // Exact Standardized Local Assets
    globalBgUrl: effectiveGlobalBg,
    homePhotoUrl: effectiveHome,
    homePhotoCssUrl: homeCssPhoto,
    hasCustomHomePhoto: Boolean(specificHomePhoto),
    footerPhotoUrl: effectiveFooter,
    groomPhotoUrl: effectiveGroom,
    bridePhotoUrl: effectiveBride,
    firstPhotoUrl: effectiveGroom,
    secondPhotoUrl: effectiveBride,
    sidebarPhotoUrl: effectiveSidebarPhoto,
    landingCoverUrl: effectiveLandingCover,
    landingCoverDesktopUrl: effectiveLandingCoverDesktop || effectiveLandingCover,
    hasCustomCoverDesktop: Boolean(effectiveLandingCoverDesktop),
    coverHeroUrl: effectiveLandingCover,
    galleryPhoto1: versionedGallery[0] || effectiveLandingCover,
    galleryPhoto2: versionedGallery[1] || effectiveLandingCover,
    galleryPhoto3: versionedGallery[2] || effectiveLandingCover,
    galleryPhoto4: versionedGallery[3] || effectiveLandingCover,
    galleryPhoto5: versionedGallery[4] || effectiveLandingCover,
    galleryPhoto6: versionedGallery[5] || effectiveLandingCover,
    
    openingQuote: (customData as any)?.openingQuote || blueprint.openingQuote || demo.openingQuote,
    openingQuoteRef: (customData as any)?.openingQuoteRef || blueprint.openingQuoteRef || demo.openingQuoteRef,
    openingGreeting: (customData as any)?.featureSettings?.customLabels?.openingGreeting !== undefined
      ? (customData as any)?.featureSettings?.customLabels?.openingGreeting
      : (blueprint.openingGreeting || ""),
    coverBadge: (customData as any)?.featureSettings?.customLabels?.coverBadge !== undefined
      ? (customData as any)?.featureSettings?.customLabels?.coverBadge
      : (blueprint.coverBadge || (customData as any)?.featureSettings?.weddingTagline || "THE WEDDING OF"),
    openBtn: (customData as any)?.customLabels?.openBtn || blueprint.openBtn || "Buka Undangan",
    coverSubtitle: (customData as any)?.customLabels?.coverSubtitle || blueprint.coverSubtitle || "",
    coverGuestLabel: (customData as any)?.customLabels?.coverGuestLabel || "Kepada Yth. Bapak/Ibu/Saudara/i",
    quoteSectionTitle: blueprint.quoteSectionTitle,
    quoteSectionEyebrow: blueprint.quoteSectionEyebrow,
    quoteTitle: blueprint.quoteSectionTitle,
    quoteEyebrow: blueprint.quoteSectionEyebrow,
    coupleSectionEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
    coupleSectionTitle: blueprint.coupleSectionTitle || "Mempelai",
    coupleSectionSub: blueprint.coupleSectionSub || "Dengan penuh rasa syukur dan sukacita, kami mengundang Anda untuk merayakan persatuan cinta kami dalam ikatan suci pernikahan.",
    coupleTitle: blueprint.coupleSectionTitle || "Mempelai",
    coupleEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
    eventsSectionTitle: blueprint.eventsSectionTitle || "Rangkaian Acara",
    eventsSectionSub: blueprint.eventsSectionSub || "",
    eventsSectionEyebrow: blueprint.eventsSectionEyebrow || "AGENDA ACARA",
    eventsTitle: blueprint.eventsSectionTitle || "Rangkaian Acara",
    eventsEyebrow: blueprint.eventsSectionEyebrow || "AGENDA ACARA",
    storySectionTitle: blueprint.storySectionTitle || "Kisah Cinta Kami",
    storySectionEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
    storyTitle: blueprint.storySectionTitle || "Kisah Cinta Kami",
    storyEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
    wishesSectionTitle: blueprint.wishesSectionTitle || "Doa & Ucapan",
    wishesSectionSub: blueprint.wishesSectionSub || "",
    wishesSectionEyebrow: "WISHES & RSVP",
    wishesTitle: blueprint.wishesSectionTitle || "Doa & Ucapan",
    wishesEyebrow: "WISHES & RSVP",
    rsvpTitle: blueprint.rsvpTitle || "Konfirmasi Kehadiran",
    rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
    closingQuote: (customData as any)?.closingQuote || blueprint.closingQuote,
    closingSub: (customData as any)?.closingSub || blueprint.closingSub,
    
    // Complete Composed Section Blocks
    eventDataHtml,
    storySectionHtml,
    storyItemsHtml,
    showStory: (customData as any)?.featureSettings?.showStory !== undefined ? Boolean((customData as any).featureSettings.showStory) : true,
    showGallery: true,
    showGift: true,
    showDressCode: true,
    showStreaming: true,
    showWeddingFilter: true,
    showTurutMengundang: true,
    gallerySectionHtml,
    giftSectionHtml,
    qrAccessSectionHtml,
    qrAccessCardHtml,
    dressCodeHtml,
    liveStreamingHtml,
    weddingFilterHtml,
    memoriesSectionHtml,
    turutMengundangHtml,
    vendorsSectionHtml,
    qrCoverButtonHtml,
    qrDockButtonHtml,
    wishesHtml,
    bankAccountsHtml: bankCardsHtml,
    shippingAddress: `Kediaman Mempelai, ${demo.city}, Indonesia`,
    showVendors: isVendorsEnabled,
    vendorTitle,
    vendorEyebrow,
    vendorSubtitle,
    
    googleCalendarUrl,
    waLink: `https://wa.me/6281234567890?text=Halo%20${encodeURIComponent(demo.groomName)}%20dan%20${encodeURIComponent(demo.brideName)}`,
    audioUrl: effectiveAudioUrl,
    musicPlayerHtml: `
    ${effectiveAudioUrl ? `
    <!-- UNIVERSAL MUSIC PLAYER INJECTED BY DEMO ENGINE -->
    <audio id="luxAudioPlayer" loop preload="auto">
      <source src="${effectiveAudioUrl}" type="audio/ogg" />
      <source src="${effectiveAudioUrl}" type="audio/mpeg" />
    </audio>
    ` : ""}
    <script>
      (function() {
        var a = document.getElementById('luxAudioPlayer');
        if (a) {
          window.bgAudio = a;
          window.weddingAudio = a;
        }
        window.__LUX_INVITATION_ID__ = "demo";
      })();

      // Universal RSVP Handler for Static Demos
      if (typeof window.luxSubmitRsvp !== 'function') {
        window.luxSubmitRsvp = function(e) {
          if (typeof submitRsvp === 'function') {
            return submitRsvp(e);
          }
          e.preventDefault();
          var btn = document.getElementById('btnSubmit') || (e.target ? e.target.querySelector('button[type="submit"]') : null);
          var nameInput = document.getElementById('rsvpName');
          var statusSelect = document.getElementById('rsvpStatus');
          var countInput = document.getElementById('rsvpCount');
          var messageInput = document.getElementById('rsvpMessage');
          var name = nameInput ? nameInput.value.trim() : '';
          var status = statusSelect ? statusSelect.value : 'hadir';
          var count = countInput ? (parseInt(countInput.value, 10) || 1) : 1;
          var message = messageInput ? messageInput.value.trim() : '';

          if (!name) {
            if (typeof showToast === 'function') { showToast('Silakan isi nama Anda', 'error'); }
            else { alert('Silakan isi nama Anda'); }
            return;
          }

          if (btn) {
            btn.disabled = true;
            btn.textContent = 'MENGIRIM DOA...';
          }

          setTimeout(function() {
            if (typeof showToast === 'function') {
              showToast('Konfirmasi kehadiran & doa restu berhasil dikirim!');
            }
            var wishesList = document.getElementById('wishesList') || document.getElementById('wishesFeed');
            if (wishesList && message) {
              var emptyPlaceholder = wishesList.querySelector('p');
              if (emptyPlaceholder && emptyPlaceholder.textContent.includes('Jadilah yang pertama')) {
                emptyPlaceholder.remove();
              }
              var newCard = document.createElement('div');
              newCard.className = 'wish-item';
              var isHadir = status === 'hadir';
              var badgeText = isHadir ? 'Hadir (' + count + ' Tamu)' : 'Berhalangan';
              var badgeBg = isHadir ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)';
              var badgeColor = isHadir ? '#4ade80' : '#f87171';
              var safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              var safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              newCard.innerHTML = 
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">' +
                  '<span class="wish-name" style="font-weight:600;">' + safeName + '</span>' +
                  '<span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:' + badgeBg + '; color:' + badgeColor + '; font-weight:600;">' + badgeText + '</span>' +
                '</div>' +
                '<p class="wish-msg" style="margin:0.3rem 0 0; opacity:0.85; font-size:0.82rem; line-height:1.5;">“' + safeMsg + '”</p>';
              wishesList.insertBefore(newCard, wishesList.firstChild);
              wishesList.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (messageInput) messageInput.value = '';
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Kirim Konfirmasi & Doa';
            }
          }, 400);
        };
      }
    </script>
    `,
    
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
    colorTextDark: palette.textDark || "#1a1a1a",

    // Custom Labels (Theme-Specific Blueprint Defaults)
    customLabels: {
      openBtn: blueprint.openBtn,
      coverSubtitle: blueprint.coverSubtitle,
      rsvpTitle: blueprint.rsvpTitle,
      rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
      quoteTitle: blueprint.quoteSectionTitle,
      quoteEyebrow: blueprint.quoteSectionEyebrow,
      coupleTitle: blueprint.coupleSectionTitle,
      coupleEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
      coupleSub: blueprint.coupleSectionSub,
      eventsTitle: blueprint.eventsSectionTitle,
      eventsSub: blueprint.eventsSectionSub,
      storyTitle: blueprint.storySectionTitle,
      storyEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
      galleryTitle: blueprint.gallerySectionTitle,
      galleryEyebrow: blueprint.gallerySectionEyebrow,
      galleryQuote: blueprint.galleryQuote,
      dressCodeTitle: blueprint.dressCodeTitle || "Dress Code",
      dressCodeEyebrow: blueprint.dressCodeEyebrow || "A Guide To",
      dressCodeSubtitle: blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:",
      streamingTitle: blueprint.streamingTitle || "Live Streaming",
      streamingEyebrow: blueprint.streamingEyebrow || "Virtual Ceremony",
      streamingSubtitle: blueprint.streamingSubtitle || "Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:",
      giftTitle: blueprint.giftSectionTitle,
      giftEyebrow: blueprint.giftSectionEyebrow,
      giftDesc: blueprint.giftSectionDesc,
      turutMengundangTitle: blueprint.turutMengundangTitle || "Turut Mengundang",
      turutMengundangEyebrow: blueprint.turutMengundangEyebrow || "Keluarga Besar",
      turutMengundangSubtitle: blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:",
      wishesTitle: blueprint.wishesSectionTitle,
      wishesSub: blueprint.wishesSectionSub,
      ...((customData as any)?.customLabels || {}),
    },

    // Adaptive Full-Height Closing Section (Supports closingPhotoUrl and footerPhotoUrl)
    closingPhotoUrl: effectiveFooter,
    hasClosingPhoto: Boolean(rawClosing),
    closingPhotoClass: rawClosing ? "has-closing-photo" : "no-closing-photo",
    closingBgStyle: effectiveFooter ? `background-image: url('${effectiveFooter}');` : "",

    // Feature settings
    featureSettings: (customData as any)?.featureSettings || {},
  };
}
