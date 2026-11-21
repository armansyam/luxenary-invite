import { participantNames, safeParseParticipants } from "./participantUtils";

/** 3 kategori struktural abadi undangan — terisolasi ketat satu sama lain. */
export const EVENT_TYPES = ["WEDDING", "PERSONAL", "EVENT"] as const;
export type InvitationEventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Pernikahan",
  PERSONAL: "Personal & Keluarga",
  EVENT: "Acara & Event Umum",
};

export const DEFAULT_THEME_BY_EVENT: Record<string, string> = {
  WEDDING: "kalandra",
  PERSONAL: "festivo",
  EVENT: "sinergi",
};

export interface SubEventMeta {
  id: string;
  label: string;
  hint: string;
  roleLabel: string;
  personNameLabel: string;
  personNamePlaceholder: string;
  personNicknamePlaceholder: string;
  coverBadge: string;
  eventLabel: string;
  eventIntro: string;
  profileEyebrow: string;
  profileTitle: string;
  profileSub: string;
  agendaTitle: string;
  closingText: string;
  detailLabel: string;
  detailPlaceholder: string;
  slugSuffix: string;
  defaultQuote: string;
  defaultQuoteRef: string;
  demoFallbackThemeId: string;
}

const RESPECTFUL_CLOSING =
  "Merupakan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.";

export const PERSONAL_SUB_EVENT_PRESETS: readonly SubEventMeta[] = [
  {
    id: "Ulang Tahun",
    label: "Ulang Tahun",
    hint: "Sweet 17, anak, dewasa",
    roleLabel: "Profil yang Berulang Tahun",
    personNameLabel: "Nama Lengkap",
    personNamePlaceholder: "Contoh: Nadia Putri Kirana",
    personNicknamePlaceholder: "Contoh: Nadia",
    coverBadge: "BIRTHDAY CELEBRATION",
    eventLabel: "Perayaan Ulang Tahun",
    eventIntro: "Syukur & Kebahagiaan",
    profileEyebrow: "Yang Berulang Tahun",
    profileTitle: "Selamat Ulang Tahun",
    profileSub: "Mari merayakan hari istimewa ini bersama keluarga dan sahabat terdekat.",
    agendaTitle: "Pesta Ulang Tahun",
    closingText: "Kehadiran dan doa Anda membuat perayaan ini semakin berarti.",
    detailLabel: "Usia / Keterangan (Opsional)",
    detailPlaceholder: "Contoh: Ulang Tahun ke-17 / Sweet Seventeen",
    slugSuffix: "ulang-tahun",
    defaultQuote: "Menghitung hari, merayakan setiap detik perjalanan hidup yang penuh warna dan harapan baru.",
    defaultQuoteRef: "Perayaan Ulang Tahun",
    demoFallbackThemeId: "festivo",
  },
  {
    id: "Khitanan",
    label: "Khitanan",
    hint: "Walimatul khitan / sunatan",
    roleLabel: "Profil Anak yang Dikhitan",
    personNameLabel: "Nama Lengkap Anak",
    personNamePlaceholder: "Contoh: Muhammad Fariz Al-Fatih",
    personNicknamePlaceholder: "Contoh: Fariz",
    coverBadge: "WALIMATUL KHITAN",
    eventLabel: "Walimatul Khitan",
    eventIntro: "Tasyakuran & Doa Bersama",
    profileEyebrow: "Putra Kami",
    profileTitle: "Walimatul Khitan",
    profileSub: "Dengan memohon rahmat Allah SWT, kami menyelenggarakan syukuran khitan putra kami.",
    agendaTitle: "Rangkaian Acara",
    closingText: RESPECTFUL_CLOSING,
    detailLabel: "Usia / Urutan Anak (Opsional)",
    detailPlaceholder: "Contoh: Putra Pertama • Usia 9 Tahun",
    slugSuffix: "khitanan",
    defaultQuote: "Semoga ananda tumbuh menjadi anak yang sholeh, berbakti kepada orang tua, dan bermanfaat bagi sesama.",
    defaultQuoteRef: "Doa Walimatul Khitan",
    demoFallbackThemeId: "al-fariz",
  },
  {
    id: "Aqiqah",
    label: "Aqiqah",
    hint: "Tasyakuran kelahiran bayi",
    roleLabel: "Profil Buah Hati",
    personNameLabel: "Nama Lengkap Bayi / Anak",
    personNamePlaceholder: "Contoh: Aisyah Humaira Azzahra",
    personNicknamePlaceholder: "Contoh: Aisyah",
    coverBadge: "TASYAKURAN AQIQAH",
    eventLabel: "Tasyakuran Aqiqah",
    eventIntro: "Tasyakuran & Doa Bersama",
    profileEyebrow: "Buah Hati Kami",
    profileTitle: "Alhamdulillah",
    profileSub: "Dengan penuh rasa syukur kami mengabarkan kelahiran buah hati kami tercinta.",
    agendaTitle: "Tasyakuran",
    closingText: RESPECTFUL_CLOSING,
    detailLabel: "Keterangan Kelahiran (Opsional)",
    detailPlaceholder: "Contoh: Lahir 15 September 2026 • 3,4 kg • 50 cm",
    slugSuffix: "aqiqah",
    defaultQuote: "Barakallahu laka fil mauhubi laka wa syakartal wahib.",
    defaultQuoteRef: "Doa Aqiqah",
    demoFallbackThemeId: "al-khalid",
  },
  {
    id: "Wisuda",
    label: "Wisuda",
    hint: "Syukuran kelulusan & gelar",
    roleLabel: "Profil Wisudawan / Wisudawati",
    personNameLabel: "Nama Lengkap & Gelar",
    personNamePlaceholder: "Contoh: Bima Prasetya, S.Kom.",
    personNicknamePlaceholder: "Contoh: Bima",
    coverBadge: "SYUKURAN KELULUSAN",
    eventLabel: "Syukuran Kelulusan",
    eventIntro: "Syukur & Kebanggaan",
    profileEyebrow: "Wisudawan",
    profileTitle: "Dengan Bangga",
    profileSub: "Mempersembahkan kelulusan sebagai wujud syukur dan bakti kepada keluarga.",
    agendaTitle: "Agenda Syukuran",
    closingText: "Kehadiran dan doa restu Anda adalah kebahagiaan bagi kami sekeluarga.",
    detailLabel: "Gelar & Instansi (Opsional)",
    detailPlaceholder: "Contoh: Sarjana Komputer (S.Kom.) • Universitas Hasanuddin",
    slugSuffix: "wisuda",
    defaultQuote: "Ilmu bukan untuk dipamerkan, melainkan untuk dipersembahkan bagi sesama.",
    defaultQuoteRef: "Syukuran Kelulusan",
    demoFallbackThemeId: "cendekia",
  },
  {
    id: "Khataman Al-Qur'an",
    label: "Khataman Al-Qur'an",
    hint: "Tamatan ngaji & khatam Qur'an",
    roleLabel: "Profil Peserta Khataman",
    personNameLabel: "Nama Lengkap",
    personNamePlaceholder: "Contoh: Ahmad Zidan Al-Hafidz",
    personNicknamePlaceholder: "Contoh: Zidan",
    coverBadge: "KHATAMAN AL-QUR'AN",
    eventLabel: "Khataman Al-Qur'an",
    eventIntro: "Tasyakuran & Doa Bersama",
    profileEyebrow: "Ananda Tercinta",
    profileTitle: "Tasyakuran Khataman",
    profileSub: "Dengan memohon rahmat dan ridho Allah SWT, kami menyelenggarakan tasyakuran khataman Al-Qur'an.",
    agendaTitle: "Rangkaian Tasyakuran",
    closingText: RESPECTFUL_CLOSING,
    detailLabel: "Keterangan (Opsional)",
    detailPlaceholder: "Contoh: Khatam 30 Juz • TPQ Al-Ikhlas",
    slugSuffix: "khataman",
    defaultQuote: "Sebaik-baik kalian adalah orang yang belajar Al-Qur'an dan mengajarkannya.",
    defaultQuoteRef: "HR. Bukhari",
    demoFallbackThemeId: "al-fariz",
  },
  {
    id: "Walimatul Safar",
    label: "Walimatul Safar",
    hint: "Doa keberangkatan Haji / Umrah",
    roleLabel: "Profil Jamaah / Tuan Rumah",
    personNameLabel: "Nama Lengkap",
    personNamePlaceholder: "Contoh: H. Ridwan Kamil & Keluarga",
    personNicknamePlaceholder: "Contoh: Ridwan",
    coverBadge: "WALIMATUL SAFAR",
    eventLabel: "Walimatul Safar",
    eventIntro: "Tasyakuran & Doa Keberangkatan",
    profileEyebrow: "Tuan Rumah",
    profileTitle: "Walimatul Safar",
    profileSub: "Dengan memohon rahmat Allah SWT, kami mengundang Bapak/Ibu/Saudara/i dalam doa bersama keberangkatan ibadah.",
    agendaTitle: "Agenda Doa Bersama",
    closingText: "Mohon doa restu agar perjalanan ibadah berjalan lancar, sehat, dan penuh keberkahan.",
    detailLabel: "Keterangan Ibadah (Opsional)",
    detailPlaceholder: "Contoh: Keberangkatan Umrah / Haji 2027",
    slugSuffix: "walimatul-safar",
    defaultQuote: "Ya Allah, mudahkanlah perjalanan kami dan limpahkanlah keberkahan serta keselamatan hingga kembali ke tanah air.",
    defaultQuoteRef: "Doa Walimatul Safar",
    demoFallbackThemeId: "al-fariz",
  },
];

export const EVENT_SUB_EVENT_PRESETS: readonly SubEventMeta[] = [
  {
    id: "Corporate",
    label: "Corporate",
    hint: "Rapat, gala dinner, forum resmi",
    roleLabel: "Identitas Acara Korporasi",
    personNameLabel: "Nama / Judul Acara",
    personNamePlaceholder: "Contoh: Nusantara Annual Summit 2027",
    personNicknamePlaceholder: "Contoh: PT Nusantara Karya",
    coverBadge: "CORPORATE INVITATION",
    eventLabel: "Undangan Korporasi",
    eventIntro: "Undangan & Sambutan",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Tentang Acara",
    profileSub: "Kami mengundang Bapak/Ibu/Mitra untuk hadir dan menjadi bagian dari agenda resmi ini.",
    agendaTitle: "Susunan Acara",
    closingText: "Atas perhatian dan kehadiran Bapak/Ibu/Mitra, kami ucapkan terima kasih.",
    detailLabel: "Sub-judul / Tema Acara (Opsional)",
    detailPlaceholder: "Contoh: Melangkah Bersama Menuju Masa Depan Digital",
    slugSuffix: "corporate",
    defaultQuote: "Kolaborasi yang kokoh adalah fondasi bagi pertumbuhan dan inovasi berkelanjutan.",
    defaultQuoteRef: "Panitia Penyelenggara",
    demoFallbackThemeId: "sinergi",
  },
  {
    id: "Grand Opening",
    label: "Grand Opening",
    hint: "Peresmian gedung, toko, cabang",
    roleLabel: "Identitas Peresmian",
    personNameLabel: "Nama Acara / Peresmian",
    personNamePlaceholder: "Contoh: Grand Opening Flagship Store Makassar",
    personNicknamePlaceholder: "Contoh: Manajemen & Tim",
    coverBadge: "GRAND OPENING",
    eventLabel: "Grand Opening",
    eventIntro: "Peresmian & Tasyakuran",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Peresmian & Pembukaan",
    profileSub: "Dengan bangga kami mengundang Bapak/Ibu/Rekan pada acara peresmian dan pembukaan perdana.",
    agendaTitle: "Rangkaian Peresmian",
    closingText: "Kehadiran dan dukungan Bapak/Ibu merupakan kehormatan besar bagi kami.",
    detailLabel: "Sub-judul / Tagline (Opsional)",
    detailPlaceholder: "Contoh: Pembukaan Cabang Baru & Ramah Tamah",
    slugSuffix: "grand-opening",
    defaultQuote: "Langkah pertama yang kuat membuka jalan menuju karya dan pelayanan yang lebih luas.",
    defaultQuoteRef: "Manajemen",
    demoFallbackThemeId: "sinergi",
  },
  {
    id: "Seminar & Workshop",
    label: "Seminar & Workshop",
    hint: "Konferensi, talkshow, pelatihan",
    roleLabel: "Identitas Seminar / Forum",
    personNameLabel: "Judul Seminar / Workshop",
    personNamePlaceholder: "Contoh: Forum Desain & Teknologi 2027",
    personNicknamePlaceholder: "Contoh: Komunitas Kreatif",
    coverBadge: "SEMINAR & WORKSHOP",
    eventLabel: "Seminar & Workshop",
    eventIntro: "Forum & Berbagi Gagasan",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Tentang Forum",
    profileSub: "Bergabunglah bersama praktisi dan pembicara untuk berdiskusi, belajar, dan membangun jejaring.",
    agendaTitle: "Jadwal Sesi",
    closingText: "Sampai jumpa di ruangan diskusi. Atas partisipasi Bapak/Ibu, kami ucapkan terima kasih.",
    detailLabel: "Topik Utama (Opsional)",
    detailPlaceholder: "Contoh: Inovasi Digital dan Strategi Bisnis 2027",
    slugSuffix: "seminar",
    defaultQuote: "Satu panggung, banyak gagasan, dan ruang untuk bertumbuh bersama.",
    defaultQuoteRef: "Panitia Seminar",
    demoFallbackThemeId: "panggung",
  },
  {
    id: "Gathering",
    label: "Gathering",
    hint: "Temu komunitas, outing, malam keakraban",
    roleLabel: "Identitas Gathering",
    personNameLabel: "Nama Acara Gathering",
    personNamePlaceholder: "Contoh: Malam Keakraban & Temu Komunitas",
    personNicknamePlaceholder: "Contoh: Panitia Gathering",
    coverBadge: "COMMUNITY GATHERING",
    eventLabel: "Gathering & Temu Komunitas",
    eventIntro: "Silaturahmi & Kebersamaan",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Tentang Gathering",
    profileSub: "Mari berkumpul, mempererat silaturahmi, dan berbagi cerita hangat bersama seluruh peserta.",
    agendaTitle: "Agenda Kegiatan",
    closingText: "Atas kehadiran dan kebersamaan rekan-rekan sekalian, kami ucapkan terima kasih.",
    detailLabel: "Sub-judul / Tema (Opsional)",
    detailPlaceholder: "Contoh: Satu Sore untuk Berbagi Karya dan Kolaborasi",
    slugSuffix: "gathering",
    defaultQuote: "Kebersamaan yang hangat melahirkan energi baru bagi setiap langkah ke depan.",
    defaultQuoteRef: "Panitia Gathering",
    demoFallbackThemeId: "biasan",
  },
  {
    id: "Product Launch",
    label: "Product Launch",
    hint: "Peluncuran produk, pameran, showcase",
    roleLabel: "Identitas Peluncuran",
    personNameLabel: "Nama Acara Peluncuran",
    personNamePlaceholder: "Contoh: Peluncuran Koleksi Musim Baru",
    personNicknamePlaceholder: "Contoh: Brand & Tim Produk",
    coverBadge: "PRODUCT LAUNCH",
    eventLabel: "Peluncuran Produk",
    eventIntro: "Inovasi & Perkenalan Perdana",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Tentang Peluncuran",
    profileSub: "Saksikan perkenalan perdana inovasi terbaru kami bersama mitra, media, dan komunitas.",
    agendaTitle: "Susunan Peluncuran",
    closingText: "Terima kasih atas perhatian dan dukungan Bapak/Ibu pada momen peluncuran ini.",
    detailLabel: "Sub-judul / Tagline Produk (Opsional)",
    detailPlaceholder: "Contoh: Memperkenalkan Generasi Baru Layanan Digital",
    slugSuffix: "launch",
    defaultQuote: "Satu gagasan yang dilihat dari berbagai sudut akan memancarkan banyak kemungkinan.",
    defaultQuoteRef: "Tim Produk",
    demoFallbackThemeId: "prisma",
  },
  {
    id: "Reuni",
    label: "Reuni",
    hint: "Temu alumni lintas angkatan",
    roleLabel: "Identitas Reuni",
    personNameLabel: "Nama Acara Reuni",
    personNamePlaceholder: "Contoh: Reuni Akbar Dua Dekade",
    personNicknamePlaceholder: "Contoh: Ikatan Alumni",
    coverBadge: "REUNI AKBAR",
    eventLabel: "Reuni & Temu Kangen",
    eventIntro: "Kenangan & Silaturahmi",
    profileEyebrow: "Panitia Reuni",
    profileTitle: "Tentang Reuni",
    profileSub: "Saatnya kembali berkumpul, menyapa kawan lama, dan merangkai cerita baru bersama.",
    agendaTitle: "Agenda Reuni",
    closingText: "Kehadiran sahabat sekalian menjadikan temu kangen ini semakin hangat dan berkesan.",
    detailLabel: "Sub-judul / Angkatan (Opsional)",
    detailPlaceholder: "Contoh: Temu Kangen Alumni Angkatan 2010",
    slugSuffix: "reuni",
    defaultQuote: "Kita mungkin sudah berpencar, tapi cerita kita tetap hangat di tempat yang sama.",
    defaultQuoteRef: "Panitia Reuni",
    demoFallbackThemeId: "temu",
  },
  {
    id: "Halal Bihalal",
    label: "Halal Bihalal",
    hint: "Silaturahmi Syawal & keluarga besar",
    roleLabel: "Identitas Halal Bihalal",
    personNameLabel: "Nama Acara Halal Bihalal",
    personNamePlaceholder: "Contoh: Halal Bihalal & Silaturahmi Syawal 1448 H",
    personNicknamePlaceholder: "Contoh: Panitia Pelaksana",
    coverBadge: "HALAL BIHALAL",
    eventLabel: "Halal Bihalal",
    eventIntro: "Silaturahmi & Saling Memaafkan",
    profileEyebrow: "Penyelenggara",
    profileTitle: "Halal Bihalal",
    profileSub: "Dengan kerendahan hati kami mengundang Bapak/Ibu/Saudara/i untuk bersilaturahmi dan saling memaafkan.",
    agendaTitle: "Susunan Acara",
    closingText: "Atas kehadiran dan silaturahmi Bapak/Ibu/Saudara/i, kami ucapkan terima kasih.",
    detailLabel: "Sub-judul / Tema (Opsional)",
    detailPlaceholder: "Contoh: Mempererat Tali Silaturahmi & Kebersamaan",
    slugSuffix: "halal-bihalal",
    defaultQuote: "Hati yang lapang dan waktu untuk bersilaturahmi memperindah setiap persaudaraan.",
    defaultQuoteRef: "Panitia Halal Bihalal",
    demoFallbackThemeId: "lapang",
  },
  {
    id: "Syukuran",
    label: "Syukuran",
    hint: "Buka puasa bersama, rumah baru, jamuan",
    roleLabel: "Identitas Syukuran / Jamuan",
    personNameLabel: "Nama Acara Syukuran",
    personNamePlaceholder: "Contoh: Jamuan Syukuran & Silaturahmi",
    personNicknamePlaceholder: "Contoh: Tuan Rumah / Penyelenggara",
    coverBadge: "UNDANGAN SYUKURAN",
    eventLabel: "Tasyakuran & Jamuan",
    eventIntro: "Rasa Syukur & Silaturahmi",
    profileEyebrow: "Tuan Rumah",
    profileTitle: "Tentang Acara",
    profileSub: "Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri jamuan syukuran ini.",
    agendaTitle: "Susunan Acara",
    closingText: "Kehadiran dan doa Bapak/Ibu/Saudara/i merupakan kebahagiaan bagi kami.",
    detailLabel: "Sub-judul / Keterangan (Opsional)",
    detailPlaceholder: "Contoh: Buka Puasa Bersama & Doa Syukuran",
    slugSuffix: "syukuran",
    defaultQuote: "Rasa syukur yang dibagikan bersama membawa ketenangan dan keberkahan.",
    defaultQuoteRef: "Tuan Rumah",
    demoFallbackThemeId: "jamuan",
  },
];

const DEFAULT_PERSONAL_META: SubEventMeta = {
  id: "Acara Personal",
  label: "Acara Personal",
  hint: "Acara personal & keluarga",
  roleLabel: "Profil Tokoh Utama",
  personNameLabel: "Nama Lengkap",
  personNamePlaceholder: "Contoh: Nama lengkap tokoh utama",
  personNicknamePlaceholder: "Contoh: Nama panggilan",
  coverBadge: "UNDANGAN PERSONAL",
  eventLabel: "Undangan Personal & Keluarga",
  eventIntro: "Tasyakuran & Kebersamaan",
  profileEyebrow: "Profil Utama",
  profileTitle: "Dengan Penuh Syukur",
  profileSub: "Dengan penuh rasa syukur, kami mengundang keluarga, kerabat, dan sahabat untuk menghadiri hari istimewa ini.",
  agendaTitle: "Rangkaian Acara",
  closingText: RESPECTFUL_CLOSING,
  detailLabel: "Keterangan Singkat (Opsional)",
  detailPlaceholder: "Contoh: Usia, gelar, atau keterangan singkat acara",
  slugSuffix: "acara",
  defaultQuote: "Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami mengundang Anda berbagi kebahagiaan bersama kami.",
  defaultQuoteRef: "Keluarga Berbahagia",
  demoFallbackThemeId: "festivo",
};

const DEFAULT_EVENT_META: SubEventMeta = {
  id: "Acara Umum",
  label: "Acara Umum",
  hint: "Acara organisasi, komunitas, atau instansi",
  roleLabel: "Identitas Acara & Penyelenggara",
  personNameLabel: "Nama / Judul Acara",
  personNamePlaceholder: "Contoh: Nama acara resmi",
  personNicknamePlaceholder: "Contoh: Nama penyelenggara",
  coverBadge: "OFFICIAL INVITATION",
  eventLabel: "Undangan Resmi",
  eventIntro: "Undangan & Sambutan",
  profileEyebrow: "Penyelenggara",
  profileTitle: "Tentang Acara",
  profileSub: "Kami mengundang Bapak/Ibu/Rekan untuk hadir dan menjadi bagian dari acara ini.",
  agendaTitle: "Susunan Acara",
  closingText: "Atas perhatian dan kehadiran Bapak/Ibu/Rekan, kami ucapkan terima kasih.",
  detailLabel: "Sub-judul / Tema Acara (Opsional)",
  detailPlaceholder: "Contoh: Tema singkat atau deskripsi acara",
  slugSuffix: "acara",
  defaultQuote: "Bersama kita merangkai momentum berharga dan kolaborasi yang bermakna.",
  defaultQuoteRef: "Panitia Penyelenggara",
  demoFallbackThemeId: "sinergi",
};

export function sanitizeSubEvent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[<>]/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || null;
}

function slugifySubEvent(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/**
 * Resolusi teks, label, dan metadata dinamis untuk kategori `PERSONAL` dan `EVENT`.
 * Cocok dengan preset bawaan bila namanya sama (case-insensitive), atau otomatis membentuk
 * metadata presisi untuk nama sub-acara kustom apa pun (mis. "Tamatan Ngaji", "Tedak Siten", "Rakernas").
 */
export function resolveSubEventMeta(eventType?: string | null, subEvent?: string | null): SubEventMeta {
  const ev = (eventType || "WEDDING").toUpperCase();
  const clean = sanitizeSubEvent(subEvent);
  const presets = ev === "EVENT" ? EVENT_SUB_EVENT_PRESETS : PERSONAL_SUB_EVENT_PRESETS;
  const fallback = ev === "EVENT" ? DEFAULT_EVENT_META : DEFAULT_PERSONAL_META;

  if (!clean) return fallback;

  const lower = clean.toLowerCase();
  const matched = presets.find((p) => p.label.toLowerCase() === lower || p.id.toLowerCase() === lower);
  if (matched) return matched;

  const slug = slugifySubEvent(clean) || fallback.slugSuffix;
  if (ev === "EVENT") {
    return {
      ...DEFAULT_EVENT_META,
      id: clean,
      label: clean,
      hint: clean,
      roleLabel: `Identitas Acara (${clean})`,
      personNameLabel: "Nama / Judul Acara",
      personNamePlaceholder: `Contoh: ${clean} 2027`,
      personNicknamePlaceholder: "Contoh: Panitia Penyelenggara",
      coverBadge: clean.toUpperCase(),
      eventLabel: clean,
      profileTitle: clean,
      agendaTitle: `Agenda ${clean}`,
      slugSuffix: slug,
    };
  }
  return {
    ...DEFAULT_PERSONAL_META,
    id: clean,
    label: clean,
    hint: clean,
    roleLabel: `Profil Utama (${clean})`,
    personNameLabel: "Nama Lengkap",
    personNamePlaceholder: "Contoh: Nama lengkap tokoh utama",
    personNicknamePlaceholder: "Contoh: Nama panggilan",
    coverBadge: clean.toUpperCase(),
    eventLabel: clean,
    profileTitle: clean,
    agendaTitle: `Rangkaian ${clean}`,
    slugSuffix: slug,
  };
}

/** Daftar sub-acara unik (deduplikasi case-insensitive) dari kumpulan tema untuk tombol filter dinamis. */
export function extractSubEventOptions(
  themes: ReadonlyArray<{ eventType?: string | null; subEvent?: string | null }>,
  eventType?: string | null,
): string[] {
  const targetEv = eventType ? eventType.toUpperCase() : null;
  const seen = new Map<string, string>();
  for (const t of themes) {
    if (targetEv && t.eventType && t.eventType.toUpperCase() !== targetEv) continue;
    const clean = sanitizeSubEvent(t.subEvent);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) seen.set(key, clean);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Isolasi 3 mode acara secara tegas (tidak ada cross-mode):
 * - WEDDING (Pernikahan — 2 profil + kisah cinta) hanya memakai tema WEDDING.
 * - PERSONAL (Personal & Keluarga — 1 profil + orang tua opsional + subEvent dinamis) hanya memakai tema PERSONAL.
 * - EVENT (Acara & Event Umum — non-personal tanpa orang tua + subEvent dinamis) hanya memakai tema EVENT.
 */
export function isThemeInMode(themeEventType?: string | null, invitationEventType?: string | null): boolean {
  return (themeEventType || "WEDDING").toUpperCase() === (invitationEventType || "WEDDING").toUpperCase();
}

/**
 * Jenis acara yang menerima undangan baru, dari pengaturan admin `enabled_event_types` (dipisah koma). Kunci yang belum
 * ada atau kosong berarti semua: platform yang belum pernah menyimpan pengaturan ini tetap menerima semua jenis acara.
 */
export function parseEnabledEventTypes(raw: string | null | undefined): string[] {
  const picked = (raw || "").split(",").map((s) => s.trim().toUpperCase());
  const enabled = EVENT_TYPES.filter((t) => picked.includes(t));
  return enabled.length ? enabled : [...EVENT_TYPES];
}

/** Jenis acara yang bisa dipilih klien: diaktifkan admin dan punya minimal satu tema aktif dalam mode yang sama. */
export function selectableEventTypes(enabled: readonly string[], activeThemeEventTypes: ReadonlyArray<string | null | undefined>): string[] {
  return enabled.filter((ev) => activeThemeEventTypes.some((t) => isThemeInMode(t, ev)));
}

/**
 * Urutan tema dalam satu kategori (sort stabil):
 * bila sub-acara diisi, tema yang ditandai untuk sub-acara tersebut tampil lebih dulu, diikuti tema lain dalam kategori sama.
 */
export function sortThemesForEvent<T extends { id?: string | null; eventType?: string | null; subEvent?: string | null }>(
  themes: T[],
  invitationEventType?: string | null,
  subEvent?: string | null,
): T[] {
  const ev = (invitationEventType || "WEDDING").toUpperCase();
  const targetSub = sanitizeSubEvent(subEvent)?.toLowerCase() || "";
  const rank = (t: T) => {
    const sameCat = (t.eventType || "WEDDING").toUpperCase() === ev ? 2 : 0;
    const sameSub = targetSub && sanitizeSubEvent(t.subEvent)?.toLowerCase() === targetSub ? 1 : 0;
    return sameCat + sameSub;
  };
  return [...themes].sort((a, b) => rank(b) - rank(a));
}

/** Kata benda jenis acara untuk teks antarmuka, mis. "undangan pernikahan Anda" atau "undangan Tamatan Ngaji Anda". */
export function eventNoun(eventType?: string | null, subEvent?: string | null): string {
  const ev = (eventType || "WEDDING").toUpperCase();
  if (ev === "WEDDING") return "pernikahan";
  const cleanSub = sanitizeSubEvent(subEvent);
  if (cleanSub) return cleanSub.toLowerCase();
  return ev === "PERSONAL" ? "personal & keluarga" : "acara";
}

export function resolveInvitationDisplayName(inv: {
  eventType?: string | null;
  subEvent?: string | null;
  participantsJson?: unknown;
  invitationSlug?: string | null;
}): string {
  const ev = (inv.eventType || "WEDDING").toUpperCase();
  if (ev === "WEDDING") {
    return participantNames("WEDDING", inv.participantsJson).short || inv.invitationSlug || "Undangan";
  }
  const p = safeParseParticipants(inv.participantsJson);
  const cleanSub = sanitizeSubEvent(inv.subEvent);
  if (ev === "EVENT") {
    const title = String(p.event?.title || "").trim();
    if (title) return title;
    return cleanSub || "Acara & Event Umum";
  }
  const src = p.person || {};
  const baseLabel = cleanSub || "Acara Personal";
  const rawAge = src.age !== undefined && src.age !== null ? String(src.age).trim() : "";
  const isBirthdaySub = /ulang\s*tahun|birthday/i.test(baseLabel) && !/\bke-\d/i.test(baseLabel);
  const label = rawAge && isBirthdaySub ? `${baseLabel} ke-${rawAge}` : baseLabel;
  const displayPerson = String(src.nickname || src.name || "").trim() || "—";
  return `${displayPerson} — ${label}`;
}

export function buildCalendarTitle(eventType: string, participants: any, subEvent?: string | null): string {
  const ev = (eventType || "WEDDING").toUpperCase();
  if (ev === "WEDDING") {
    return `The Wedding of ${participants.groomName || "Mempelai Pria"} & ${participants.brideName || "Mempelai Wanita"}`;
  }
  if (ev === "EVENT") {
    return participants.eventTitle || sanitizeSubEvent(subEvent) || "Undangan Acara";
  }
  const meta = resolveSubEventMeta("PERSONAL", subEvent);
  const name = participants.personName || participants.mainName || "Tuan Rumah";
  return `${meta.label} ${name}`.trim();
}

const TIMEZONE_OFFSET_HOURS: Record<string, number> = { WIB: 7, WITA: 8, WIT: 9 };
const CALENDAR_DEFAULT_HOURS = 3;

/**
 * Tautan "Simpan ke Google Calendar" untuk satu sesi acara. Jam lokal sesi (WIB/WITA/WIT, dari `timezone` atau teks
 * `time`) diubah ke UTC; tanpa jam selesai acara dianggap berlangsung 3 jam, tanpa jam mulai menjadi acara sehari
 * penuh. Dulu jam ditulis mati 08.00-21.00 WIB, sehingga resepsi 19.00 WITA tercatat 09.00 di kalender tamu.
 * Kosong bila tanggal tidak sah.
 */
export function buildGoogleCalendarUrl(
  event: { date?: string; startTime?: string; endTime?: string; time?: string; timezone?: string },
  title: string,
  location: string
): string {
  const date = String(event.date || "").split("T")[0];
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return "";
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];

  const hhmm = (value?: string): [number, number] | null => {
    const m = String(value || "").match(/(\d{1,2})[.:](\d{2})/);
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? [Number(m[1]), Number(m[2])] : null;
  };
  const [timeFrom, timeTo] = String(event.time || "").split(/\s*[-–]\s*/);
  const start = hhmm(event.startTime) ?? hhmm(timeFrom);
  const end = hhmm(event.endTime) ?? hhmm(timeTo);
  const zone = (`${event.timezone || ""} ${event.time || ""}`.toUpperCase().match(/\b(WITA|WIT|WIB)\b/) || [, "WIB"])[1] as string;
  const offset = TIMEZONE_OFFSET_HOURS[zone];

  let dates: string;
  if (start) {
    const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const startMs = Date.UTC(year, month - 1, day, start[0] - offset, start[1]);
    let endMs = end ? Date.UTC(year, month - 1, day, end[0] - offset, end[1]) : startMs + CALENDAR_DEFAULT_HOURS * 3_600_000;
    if (endMs <= startMs) endMs += 24 * 3_600_000;
    dates = `${stamp(startMs)}/${stamp(endMs)}`;
  } else {
    const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    dates = `${ymd(new Date(Date.UTC(year, month - 1, day)))}/${ymd(new Date(Date.UTC(year, month - 1, day + 1)))}`;
  }
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&location=${encodeURIComponent(location)}`;
}

export function getMediaSlotLabel(slot: string, eventType?: string | null, subEvent?: string | null): string {
  const sub = sanitizeSubEvent(subEvent);
  if (slot === "PROFILE_PHOTO") {
    return sub ? `Foto Profil (${sub})` : "Foto Profil Utama";
  }
  if (slot === "EVENT_PHOTO") {
    return sub ? `Foto / Visual Acara (${sub})` : "Foto / Visual Utama Acara";
  }
  if (!eventType || eventType === "WEDDING") {
    return slot === "GROOM_PHOTO" ? "Foto Mempelai Pria"
         : slot === "BRIDE_PHOTO" ? "Foto Mempelai Wanita" : slot;
  }
  return slot;
}

export function buildZipFileName(inv: { invitationSlug: string }): string {
  return `Guest_Memories_${inv.invitationSlug}.zip`;
}

export const STAFF_PIN_PATTERN = /^[A-Za-z0-9]{4,10}$/;
