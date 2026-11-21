import fs from "fs";
import path from "path";
import { getDemoThemeData, type DemoThemeData } from "@/lib/demoRegistry";
import { DAY_MS } from "@/lib/lifecycleDates";

/**
 * Undangan virtual untuk demo tema: data demo (DEMO_REGISTRY + isian Studio Demo admin) diubah ke bentuk baris
 * undangan (participantsJson, eventData, media, featureSettings, rsvps) lalu dirender oleh engine yang sama dengan
 * undangan klien (`composeInvitationData`). Dengan begitu demo menampilkan persis apa yang akan diterima klien.
 */

const MONTHS_ID = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];

/** "15 September 2026" -> "2026-09-15"; tanggal ISO dikembalikan apa adanya. */
function toIsoDate(value: unknown): string {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const m = text.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!m) return "";
  const month = MONTHS_ID.indexOf(m[2]) + 1;
  return month ? `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}

const DEMO_DATE_MIN_LEAD_DAYS = 21;
const DEMO_DATE_ROLL_LEAD_DAYS = 60;

/**
 * Tanggal acara demo. Data demo menyimpan tanggal tetap, padahal demo statis dibaca calon klien kapan saja; tanpa ini
 * hitung mundur demo menjadi 00 begitu tanggalnya lewat. Tanggal yang masih cukup jauh dipakai apa adanya (pilihan admin
 * di Studio Demo); selain itu digeser ke hari yang sama dalam pekan, sekitar 60 hari setelah `now`.
 */
export function demoEventDate(storedIso: string, now: Date): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(storedIso);
  if (!m) return storedIso;
  const stored = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (stored >= today + DEMO_DATE_MIN_LEAD_DAYS * DAY_MS) return storedIso;
  const start = today + DEMO_DATE_ROLL_LEAD_DAYS * DAY_MS;
  const shift = (new Date(stored).getUTCDay() - new Date(start).getUTCDay() + 7) % 7;
  return new Date(start + shift * DAY_MS).toISOString().slice(0, 10);
}

/** "08.00 – 10.00 WIB" -> jam mulai/selesai berformat HH:MM dan zona waktu, sama dengan isian Studio klien. */
function parseTimeRange(time: string): { startTime: string; endTime: string; timezone: string } {
  const times = [...String(time || "").matchAll(/(\d{1,2})[.:](\d{2})/g)].map((m) => `${m[1].padStart(2, "0")}:${m[2]}`);
  const timezone = (String(time || "").match(/\b(WIB|WITA|WIT)\b/) || [])[1] || "WIB";
  return { startTime: times[0] || "", endTime: times[1] || "", timezone };
}

/** "Bpk. A & Ibu B" -> ayah dan ibu. */
function splitParents(value: unknown): { father: string; mother: string } {
  const [father = "", mother = ""] = String(value || "").replace(/^(Putra|Putri)(\/Putri)? dari\s+/i, "").split(/\s+&\s+/);
  return { father: father.trim(), mother: mother.trim() };
}

export const SAMPLE_WISHES: Record<string, Array<{ guestName: string; guestCount: number; message: string }>> = {
  WEDDING: [
    { guestName: "Budi Santoso & Rekan Kerja", guestCount: 2, message: "Selamat berbahagia! Semoga menjadi keluarga yang senantiasa dipenuhi rahmat dan cinta." },
    { guestName: "Sahabat Terbaik", guestCount: 1, message: "Lancar sampai hari H, tidak sabar merayakan hari istimewa kalian!" },
    { guestName: "Keluarga Besar", guestCount: 4, message: "Barakallahu lakuma wa baraka alaikuma wa jama'a bainakuma fii khair." },
  ],
  PERSONAL: [
    { guestName: "Keluarga Besar", guestCount: 4, message: "Selamat dan turut berbahagia atas momen istimewa ini. Semoga senantiasa diberi keberkahan." },
    { guestName: "Sahabat & Kerabat", guestCount: 2, message: "Semoga acara berjalan lancar, penuh kebahagiaan, dan membawa berkah bagi seluruh keluarga." },
  ],
  "Ulang Tahun": [
    { guestName: "Sahabat Dekat", guestCount: 2, message: "Selamat ulang tahun! Semoga di usia baru ini makin bersinar dan sehat selalu." },
    { guestName: "Keluarga Besar", guestCount: 4, message: "Barakallahu fii umrik. Semoga senantiasa dalam lindungan-Nya." },
  ],
  Khitanan: [
    { guestName: "Paman & Bibi", guestCount: 2, message: "Selamat atas khitanan ananda. Semoga lekas pulih dan menjadi anak yang sholeh." },
    { guestName: "Sahabat Keluarga", guestCount: 3, message: "Turut bersyukur atas terlaksananya walimatul khitan dengan lancar." },
  ],
  Aqiqah: [
    { guestName: "Kakek & Nenek", guestCount: 2, message: "Semoga ananda tumbuh sehat, cerdas, dan menjadi penyejuk hati keluarga." },
    { guestName: "Kerabat & Sahabat", guestCount: 2, message: "Barakallahu laka fil mauhubi laka wa syakartal wahib." },
  ],
  Wisuda: [
    { guestName: "Rekan Seangkatan", guestCount: 2, message: "Selamat atas gelar barunya, sukses selalu untuk karier ke depan!" },
    { guestName: "Dosen Pembimbing", guestCount: 1, message: "Jadikan ilmu yang diperoleh sebagai berkah bagi masyarakat luas." },
  ],
  EVENT: [
    { guestName: "Mitra Strategis", guestCount: 2, message: "Selamat dan sukses atas penyelenggaraan acara ini. Semoga kolaborasi makin kokoh." },
    { guestName: "Asosiasi Industri", guestCount: 3, message: "Apresiasi untuk seluruh jajaran atas pencapaian penting ini." },
  ],
};

export function sampleWishesFor(eventType?: string | null, subEvent?: string | null) {
  const ev = (eventType || "WEDDING").toUpperCase();
  if (ev === "PERSONAL" && subEvent) {
    const matchedKey = Object.keys(SAMPLE_WISHES).find((k) => k.toLowerCase() === subEvent.trim().toLowerCase());
    if (matchedKey) return SAMPLE_WISHES[matchedKey];
  }
  return SAMPLE_WISHES[ev] || SAMPLE_WISHES.WEDDING;
}

const SAMPLE_STORIES: Record<string, Array<{ chapter: string; title: string; content: string }>> = {
  PERSONAL: [
    { chapter: "AWAL LANGKAH", title: "Tumbuh Bersama Doa Keluarga", content: "Setiap langkah kecil yang ditempuh selalu dikelilingi hangatnya kasih sayang dan doa tulus dari keluarga tercinta." },
    { chapter: "HARI INI", title: "Merayakan Momen Penuh Syukur", content: "Kini tiba saatnya berbagi kebahagiaan dan rasa syukur bersama orang-orang tersayang di hari yang istimewa ini." },
  ],
  Wisuda: [
    { chapter: "TAHUN PERTAMA", title: "Memulai Perjalanan Akademik", content: "Melangkah memasuki bangku perkuliahan dengan tekad, rasa ingin tahu, dan harapan besar untuk masa depan." },
    { chapter: "PROSES & DEDIKASI", title: "Menuntaskan Tugas Akhir", content: "Berbagai tantangan, diskusi, dan begadang bersama rekan seperjuangan menjadi bagian tak terlupakan menuju kelulusan." },
    { chapter: "WISUDA", title: "Awal Babak Baru", content: "Gelar ini dipersembahkan untuk kedua orang tua, dosen, dan sahabat yang senantiasa mendoakan." },
  ],
  "Ulang Tahun": [
    { chapter: "KENANGAN", title: "Perjalanan Penuh Warna", content: "Setiap tahun yang berlalu menghadirkan pelajaran berharga, tawa hangat, dan kisah persahabatan yang tak ternilai." },
    { chapter: "USIA BARU", title: "Harapan & Langkah Baru", content: "Dengan penuh rasa syukur, kami mengundang keluarga dan sahabat merayakan babak baru yang penuh berkah." },
  ],
  Khitanan: [
    { chapter: "TUMBUH KEMBANG", title: "Anugerah Terindah Keluarga", content: "Sejak kehadiran ananda, rumah selalu dipenuhi keceriaan dan doa agar kelak tumbuh menjadi anak yang sholeh dan berbakti." },
    { chapter: "WALIMATUL KHITAN", title: "Langkah Menuju Kedewasaan", content: "Momentum khitanan menjadi tonggak awal ananda menapaki masa baligh dengan penuh keberanian dan iman." },
  ],
  Aqiqah: [
    { chapter: "KELAHIRAN", title: "Hadirnya Buah Hati", content: "Alhamdulillah, telah lahir ke dunia buah hati kami dengan selamat, membawa kebahagiaan yang tak terhingga bagi keluarga." },
    { chapter: "TASYAKURAN AQIQAH", title: "Doa & Harapan", content: "Kami memohon doa restu agar ananda senantiasa sehat, cerdas, dan menjadi penyejuk mata bagi orang tua." },
  ],
  EVENT: [
    { chapter: "LATAR BELAKANG", title: "Gagasan & Inisiatif Bersama", content: "Acara ini lahir dari semangat kolaborasi untuk mempertemukan para pelaku, mitra, dan komunitas dalam satu ruang inspiratif." },
    { chapter: "TONGGAK CAPAIAN", title: "Bertumbuh & Berdampak", content: "Melalui kerja sama berkelanjutan, berbagai pencapaian penting berhasil diraih bersama seluruh jajaran dan mitra strategis." },
  ],
};

export function sampleStoriesFor(eventType?: string | null, subEvent?: string | null) {
  const ev = (eventType || "WEDDING").toUpperCase();
  if (ev === "WEDDING") return [];
  if (ev === "PERSONAL" && subEvent) {
    const matchedKey = Object.keys(SAMPLE_STORIES).find((k) => k.toLowerCase() === subEvent.trim().toLowerCase());
    if (matchedKey) return SAMPLE_STORIES[matchedKey];
  }
  return SAMPLE_STORIES[ev] || SAMPLE_STORIES.PERSONAL;
}

const SAMPLE_VENDORS = [
  { name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
  { name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
  { name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
];

const publicFileExists = (url: string) => !url || url.startsWith("http") || fs.existsSync(path.join(process.cwd(), "public", url.replace(/^\//, "").split("?")[0]));

function participantsFor(demo: DemoThemeData) {
  const d = demo as any;
  const ev = (demo.eventType || "WEDDING").toUpperCase();
  if (ev === "EVENT") {
    return { event: { title: d.eventTitle, subtitle: d.eventSubtitle, organizer: d.organizerName, hostName: d.hostName, dresscode: d.dresscode } };
  }
  if (ev === "PERSONAL") {
    const parents = splitParents(d.parentName);
    const name = d.personName || "";
    const nickname = d.personNickname || name;
    return {
      person: {
        name,
        nickname,
        ...(d.personAge !== undefined && d.personAge !== "" ? { age: d.personAge } : {}),
        ...(d.personBirthOrder ? { birthOrder: d.personBirthOrder } : {}),
        ...(d.birthDate || d.birthDateFormatted ? { birthDate: toIsoDate(d.birthDate || d.birthDateFormatted) } : {}),
        ...(d.birthWeight ? { birthWeight: d.birthWeight } : {}),
        ...(d.birthLength ? { birthLength: d.birthLength } : {}),
        ...(d.degree ? { degree: d.degree } : {}),
        ...(d.major ? { major: d.major } : {}),
        ...(d.faculty ? { faculty: d.faculty } : {}),
        ...(d.institution ? { institution: d.institution } : {}),
        ...(d.honors ? { honors: d.honors } : {}),
        ...(d.personInstagram ? { instagram: d.personInstagram } : {}),
        ...(parents.father ? { fatherName: parents.father } : {}),
        ...(parents.mother ? { motherName: parents.mother } : {}),
      },
      parents,
    };
  }
  const groomParents = d.groomFather || d.groomMother ? { father: d.groomFather || "", mother: d.groomMother || "" } : splitParents(d.groomParents);
  const brideParents = d.brideFather || d.brideMother ? { father: d.brideFather || "", mother: d.brideMother || "" } : splitParents(d.brideParents);
  return {
    groom: { name: d.groomDisplayName || d.groomName, nickname: d.groomName, father: groomParents.father, mother: groomParents.mother, instagram: d.groomInstagram },
    bride: { name: d.brideDisplayName || d.brideName, nickname: d.brideName, father: brideParents.father, mother: brideParents.mother, instagram: d.brideInstagram },
  };
}

export function buildDemoInvitation(
  themeId: string,
  customData?: Record<string, any>,
  themeEventType?: string | null,
  themeSubEvent?: string | null,
) {
  const base = getDemoThemeData(themeId, themeEventType, themeSubEvent);
  const custom = customData || {};
  const demo = { ...base, ...custom } as DemoThemeData & Record<string, any>;
  const eventType = (themeEventType || demo.eventType || "WEDDING").toUpperCase();
  const subEvent = eventType === "WEDDING" ? null : (themeSubEvent ?? demo.subEvent ?? null);
  const date = demoEventDate(toIsoDate(demo.targetDate), new Date());

  const events = (demo.events || []).map((ev, idx, list) => ({
    title: ev.title,
    badge: ev.badge,
    time: ev.time,
    ...parseTimeRange(ev.time),
    date,
    location: ev.location,
    address: ev.address,
    mapsUrl: ev.mapsUrl,
    // Sesi terakhir (resepsi/acara utama) adalah hari tamu datang, sama dengan kebiasaan isian klien.
    isPrimary: idx === list.length - 1,
  }));

  const slot = (mediaSlot: string, url: unknown) => (typeof url === "string" && url && publicFileExists(url) ? [{ mediaSlot, localPath: url }] : []);
  const media = [
    ...slot("LANDING_COVER", demo.landingCoverUrl),
    ...slot("LANDING_COVER_DESKTOP", demo.landingCoverDesktopUrl),
    ...slot("DESKTOP_SIDEBAR", demo.sidebarPhotoUrl),
    ...slot("GLOBAL_FIXED_BG", demo.globalBgUrl),
    ...slot("HOME_PHOTO", demo.homePhotoUrl),
    ...slot("CLOSING_COVER", demo.closingPhotoUrl || demo.footerPhotoUrl),
    ...(eventType === "WEDDING"
      ? [
          ...slot("GROOM_PHOTO", demo.groomPhotoUrl),
          ...slot("BRIDE_PHOTO", demo.bridePhotoUrl),
        ]
      : eventType === "EVENT"
      ? slot("EVENT_PHOTO", demo.eventPhotoUrl)
      : slot("PROFILE_PHOTO", demo.personPhotoUrl)),
  ];

  const gallery = (Array.isArray(demo.galleryPhotos) ? demo.galleryPhotos : []).filter((p): p is string => typeof p === "string" && p.trim() !== "");
  const customFeature = (custom.featureSettings || {}) as Record<string, any>;
  const customLabels = { ...(custom.customLabels || {}), ...(customFeature.customLabels || {}) };

  const featureSettings = {
    showStory: true,
    showGallery: true,
    showGift: true,
    showDresscode: true,
    showLiveStream: true,
    showTurutMengundang: true,
    showVendors: true,
    showFilter: eventType === "WEDDING",
    showMusic: true,
    showQrCheckin: true,
    showGuestMemories: true,
    weddingTagline: demo.tagline,
    galleryPhotosList: gallery.join("\n"),
    dressCodeColors: demo.dressCodeColors,
    dressCodeNote: demo.dressCodeNote,
    turutMengundang: (demo.turutMengundang || []).join("\n"),
    liveStreamInstagramUrl: "https://instagram.com",
    liveStreamYoutubeUrl: "https://youtube.com",
    instagramFilterUrl: "https://instagram.com",
    vendors: custom.vendors || SAMPLE_VENDORS,
    ...customFeature,
    customLabels,
  };

  const memoryFiles = [1, 2, 3, 4].map((n) => `/demo/${demo.themeId}/memory_0${n}.webp`).filter((url) => publicFileExists(url));
  const memoryPhotos = memoryFiles.length > 0 ? memoryFiles : gallery.slice(0, 6);
  const memoryNames = ["Budi", "Rina", "Dimas", "Tante Maya", "Eko", "Nia"];

  return {
    id: `demo-${demo.themeId}`,
    themeId: demo.themeId,
    eventType,
    subEvent,
    status: "PUBLISHED",
    invitationSlug: null,
    subdomain: null,
    customDomain: null,
    participantsJson: participantsFor({ ...demo, eventType: eventType as any }),
    eventData: events,
    loveStory: (Array.isArray(demo.stories) && demo.stories.length > 0 ? demo.stories : sampleStoriesFor(eventType, subEvent)).map((s) => ({
      date: s.chapter || "",
      title: s.title,
      content: s.content,
    })),
    bankAccounts: (demo.banks || []).map((b) => ({ bank: b.bank, number: b.number, name: b.name })),
    featureSettings,
    media,
    musicUrl: demo.audioUrl || demo.defaultMusicUrl || null,
    openingQuote: demo.openingQuote,
    openingQuoteRef: demo.openingQuoteRef,
    // Demo menampilkan seluruh fitur paket tertinggi.
    order: { planType: "TIER_3" },
    rsvps: sampleWishesFor(eventType, subEvent).map((w) => ({ ...w, status: "hadir", respondedAt: new Date() })),
    guestMemories: memoryPhotos.map((url, i) => ({ id: `demo-memory-${i}`, senderName: memoryNames[i % memoryNames.length], message: "", mediaUrl: url, thumbnailUrl: url })),
  };
}
