import fs from "fs";
import path from "path";
import { getDemoThemeData, type DemoThemeData } from "@/lib/demoRegistry";

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

const SAMPLE_WISHES: Record<string, Array<{ guestName: string; guestCount: number; message: string }>> = {
  WEDDING: [
    { guestName: "Budi Santoso & Rekan Kerja", guestCount: 2, message: "Selamat berbahagia! Semoga menjadi keluarga yang senantiasa dipenuhi rahmat dan cinta." },
    { guestName: "Sahabat Terbaik", guestCount: 1, message: "Lancar sampai hari H, tidak sabar merayakan hari istimewa kalian!" },
    { guestName: "Keluarga Besar", guestCount: 4, message: "Barakallahu lakuma wa baraka alaikuma wa jama'a bainakuma fii khair." },
  ],
  BIRTHDAY: [
    { guestName: "Sahabat Dekat", guestCount: 2, message: "Selamat ulang tahun! Semoga di usia baru ini makin bersinar dan sehat selalu." },
    { guestName: "Keluarga Besar", guestCount: 4, message: "Barakallahu fii umrik. Semoga senantiasa dalam lindungan-Nya." },
  ],
  KHITAN: [
    { guestName: "Paman & Bibi", guestCount: 2, message: "Selamat atas khitanan ananda. Semoga lekas pulih dan menjadi anak yang sholeh." },
    { guestName: "Sahabat Keluarga", guestCount: 3, message: "Turut bersyukur atas terlaksananya walimatul khitan dengan lancar." },
  ],
  AQIQAH: [
    { guestName: "Kakek & Nenek", guestCount: 2, message: "Semoga ananda tumbuh sehat, cerdas, dan menjadi penyejuk hati keluarga." },
    { guestName: "Kerabat & Sahabat", guestCount: 2, message: "Barakallahu laka fil mauhubi laka wa syakartal wahib." },
  ],
  WISUDA: [
    { guestName: "Rekan Seangkatan", guestCount: 2, message: "Selamat atas gelar barunya, sukses selalu untuk karier ke depan!" },
    { guestName: "Dosen Pembimbing", guestCount: 1, message: "Jadikan ilmu yang diperoleh sebagai berkah bagi masyarakat luas." },
  ],
  GATHERING: [
    { guestName: "Mitra Strategis", guestCount: 2, message: "Selamat dan sukses atas penyelenggaraan acara ini. Semoga kolaborasi makin kokoh." },
    { guestName: "Asosiasi Industri", guestCount: 3, message: "Apresiasi untuk seluruh jajaran atas pencapaian penting ini." },
  ],
};

const SAMPLE_VENDORS = [
  { name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
  { name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
  { name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
];

const publicFileExists = (url: string) => !url || url.startsWith("http") || fs.existsSync(path.join(process.cwd(), "public", url.replace(/^\//, "").split("?")[0]));

function participantsFor(demo: DemoThemeData) {
  const d = demo as any;
  const parents = d.groomFather || d.groomMother ? { father: d.groomFather || "", mother: d.groomMother || "" } : splitParents(d.groomParents);
  switch (demo.eventType || "WEDDING") {
    case "BIRTHDAY":
      return { person: { name: d.personName, nickname: d.personNickname, age: d.personAge, instagram: d.personInstagram || d.groomInstagram, fatherName: parents.father, motherName: parents.mother } };
    case "KHITAN":
      return { child: { name: d.childName, nickname: d.childNickname, age: d.childAge, birthOrder: d.childBirthOrder }, parents };
    case "AQIQAH":
      return { baby: { name: d.babyName, nickname: d.babyNickname, birthDate: toIsoDate(d.birthDate || d.birthDateFormatted), birthWeight: d.birthWeight, birthLength: d.birthLength }, parents };
    case "WISUDA":
      return { person: { name: d.graduateName, nickname: d.graduateNickname, degree: d.graduateDegree, major: d.graduateMajor, faculty: d.graduateFaculty, institution: d.universityName, honors: d.honors }, parents };
    case "GATHERING":
      return { event: { title: d.eventTitle, subtitle: d.eventSubtitle, organizer: d.organizerName, hostName: d.hostName, dresscode: d.dresscode } };
    default:
      return {
        groom: { name: d.groomDisplayName || d.groomName, nickname: d.groomName, father: d.groomFather || splitParents(d.groomParents).father, mother: d.groomMother || splitParents(d.groomParents).mother, instagram: d.groomInstagram },
        bride: { name: d.brideDisplayName || d.brideName, nickname: d.brideName, father: d.brideFather || splitParents(d.brideParents).father, mother: d.brideMother || splitParents(d.brideParents).mother, instagram: d.brideInstagram },
      };
  }
}

export function buildDemoInvitation(themeId: string, customData?: Record<string, any>) {
  const base = getDemoThemeData(themeId);
  const custom = customData || {};
  const demo = { ...base, ...custom } as DemoThemeData & Record<string, any>;
  const eventType = demo.eventType || "WEDDING";
  const date = toIsoDate(demo.targetDate);

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
  const singlePhoto = demo.personPhotoUrl || demo.childPhotoUrl || demo.babyPhotoUrl || demo.graduatePhotoUrl || demo.eventPhotoUrl;
  const media = [
    ...slot("LANDING_COVER", demo.landingCoverUrl),
    ...slot("LANDING_COVER_DESKTOP", demo.landingCoverDesktopUrl),
    ...slot("DESKTOP_SIDEBAR", demo.sidebarPhotoUrl),
    ...slot("GLOBAL_FIXED_BG", demo.globalBgUrl),
    ...slot("HOME_PHOTO", demo.homePhotoUrl),
    ...slot("CLOSING_COVER", demo.closingPhotoUrl || demo.footerPhotoUrl),
    // Tema satu nama membaca foto tokoh utama dari slot GROOM_PHOTO.
    ...slot("GROOM_PHOTO", eventType === "WEDDING" ? demo.groomPhotoUrl : singlePhoto || demo.groomPhotoUrl),
    ...(eventType === "WEDDING" ? slot("BRIDE_PHOTO", demo.bridePhotoUrl) : []),
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
    status: "PUBLISHED",
    invitationSlug: null,
    subdomain: null,
    customDomain: null,
    participantsJson: participantsFor(demo),
    eventData: events,
    loveStory: (demo.stories || []).map((s) => ({ title: s.title, content: s.content })),
    bankAccounts: (demo.banks || []).map((b) => ({ bank: b.bank, number: b.number, name: b.name })),
    featureSettings,
    media,
    musicUrl: demo.audioUrl || demo.defaultMusicUrl || null,
    openingQuote: demo.openingQuote,
    openingQuoteRef: demo.openingQuoteRef,
    // Demo menampilkan seluruh fitur paket tertinggi.
    order: { planType: "TIER_3" },
    rsvps: (SAMPLE_WISHES[eventType] || SAMPLE_WISHES.WEDDING).map((w) => ({ ...w, status: "hadir", respondedAt: new Date() })),
    guestMemories: memoryPhotos.map((url, i) => ({ id: `demo-memory-${i}`, senderName: memoryNames[i % memoryNames.length], message: "", mediaUrl: url, thumbnailUrl: url })),
  };
}
