/**
 * Setiap tema di THEME_MAP dirender lewat jalur klien sungguhan (composeTemplateData -> renderTemplateFile) dengan
 * undangan berisi lengkap. Token {{kunci}} yang dibaca template tetapi tidak ada di data dirender kosong tanpa
 * peringatan oleh renderer, sehingga harus tertangkap di sini (contoh: Kalandra memakai {{eventCardsHtml}} yang tidak
 * pernah diisi, rangkaian acara tidak tampil). Renderer hanya mengenal {{#if}}, {{#unless}}, dan {{kunci}}.
 * (hanya berjalan di database `luxenary_test`)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma, pool } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile, THEME_MAP } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_tpl_${Date.now()}`;
const ids = { users: [] as string[], orders: [] as string[], invitations: [] as string[] };

const EVENT_TYPE_OF: Record<string, "WEDDING" | "BIRTHDAY" | "KHITAN" | "AQIQAH" | "WISUDA" | "GATHERING"> = {
  wedding: "WEDDING",
  birthday: "BIRTHDAY",
  khitan: "KHITAN",
  aqiqah: "AQIQAH",
  wisuda: "WISUDA",
  gathering: "GATHERING",
};

// Bentuk participantsJson persis seperti yang ditulis wizard (setup/page.tsx) dan editor studio, bukan bentuk karangan tes.
const PARTICIPANTS: Record<string, unknown> = {
  BIRTHDAY: { person: { name: "Nadia Putri", nickname: "Nadia", age: 17, fatherName: "Bpk. Rahman", motherName: "Ibu Sari", instagram: "nadia" } },
  KHITAN: { child: { name: "Muhammad Fatih", nickname: "Fatih", age: 7 }, parents: { father: "Bpk. Hasan", mother: "Ibu Aminah" } },
  AQIQAH: { baby: { name: "Aisyah Zahra", nickname: "Aisyah" }, parents: { father: "Bpk. Ilham", mother: "Ibu Rina" } },
  WISUDA: { person: { name: "Rizky Pratama, S.T.", nickname: "Rizky", degree: "S.T.", major: "Teknik Informatika", institution: "Universitas Negeri Makassar" } },
  GATHERING: { event: { title: "Reuni Akbar Angkatan 2010", subtitle: "Temu Kangen Alumni", organizer: "Panitia Reuni" } },
};

/** Data peserta yang wajib tampil di undangan terbit; dibaca dari participantsJson karena kolom groom* dikosongkan. */
const PARTICIPANT_TEXT: Record<string, string[]> = {
  BIRTHDAY: ["Nadia"],
  KHITAN: ["Fatih", "Bpk. Hasan", "Ibu Aminah"],
  AQIQAH: ["Aisyah", "Bpk. Ilham", "Ibu Rina"],
  WISUDA: ["Rizky", "Teknik Informatika", "Universitas Negeri Makassar"],
  GATHERING: ["Reuni Akbar Angkatan 2010", "Temu Kangen Alumni", "Panitia Reuni"],
};

const SLOTS = ["LANDING_COVER", "LANDING_COVER_DESKTOP", "HOME_PHOTO", "DESKTOP_SIDEBAR", "CLOSING_COVER", "GLOBAL_FIXED_BG", "GROOM_PHOTO", "BRIDE_PHOTO"] as const;
const slotUrl = (slot: string) => `/uploads/vitest/${slot.toLowerCase()}.webp`;
const GALLERY_URLS = [1, 2, 3].map((n) => `https://example.test/galeri-${n}.jpg`);
// Nilai contoh yang dulu tercetak sebagai fakta di undangan klien yang datanya kosong.
const FAKE_FACTS = ["Cum Laude", "Universitas Hasanuddin", "Sarjana Komputer", "3.4 kg", "50 cm", "15 September 2026", "Kediaman Mempelai", "Ballroom Kampus", "Auditorium / Gedung Pertemuan", "Batik Modern", "Panitia Penyelenggara", "Lokasi Acara", "2026-12-31", "2026-10-05"];

function featureSettings() {
  return JSON.stringify({
    musicUrl: "/music/canon-in-d.ogg",
    showGift: true,
    showMusic: true,
    showStory: true,
    showGallery: true,
    showDresscode: true,
    showLiveStream: true,
    showTurutMengundang: true,
    showGuestMemories: true,
    showVendors: true,
    qrisImageUrl: "/uploads/vitest/qris.webp",
    dressCodeNote: "Busana bernuansa coklat tanah atau krem.",
    turutMengundang: "Bpk. H. Andi Mappasessu & Ibu Hj. Andi Tenri\nKeluarga Besar Bone",
    galleryPhotosList: GALLERY_URLS.join("\n"),
    vendorsList: [{ category: "Dekorasi", name: "Sanggar Bunga" }],
  });
}

/** Seluruh token {{kunci}} di template (tanpa #if/#unless/penutup), termasuk {{else}} yang tidak didukung renderer. */
function templateTokens(themeId: string): Set<string> {
  const info = THEME_MAP[themeId];
  const folder = info.eventType === "gathering" ? "general" : info.eventType;
  let file = path.join(process.cwd(), "themes", folder, info.style, info.file);
  if (!fs.existsSync(file)) file = path.join(process.cwd(), "themes", "gathering", info.style, info.file);
  const html = fs.readFileSync(file, "utf8");
  const tokens = new Set<string>();
  for (const m of html.matchAll(/\{[\s\n]*\{[\s\n]*([\w.]+)[\s\n]*\}[\s\n]*\}/g)) tokens.add(m[1].split(".")[0]);
  return tokens;
}

async function makeInvitation(eventType: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${eventType}@test.local`, name: eventType } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${eventType}`, planType: "TIER_3", amount: 200000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const isWedding = eventType === "WEDDING";
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      eventType: eventType as never,
      status: "PUBLISHED",
      subdomain: `${RUN}-${eventType}`.toLowerCase().replace(/_/g, "-"),
      invitationSlug: `${RUN}-${eventType}`,
      groomSlug: `${RUN}-g-${eventType}`,
      brideSlug: `${RUN}-b-${eventType}`,
      groomName: isWedding ? "Andi Mappatunru, S.T." : null,
      brideName: isWedding ? "Besse Tenri Ajeng, S.Psi." : null,
      groomNickname: isWedding ? "Andi" : null,
      brideNickname: isWedding ? "Besse" : null,
      groomFather: isWedding ? "Bpk. H. Mappatunru" : null,
      groomMother: isWedding ? "Ibu Hj. Nurhayati" : null,
      brideFather: "Bpk. H. Tenri",
      brideMother: "Ibu Hj. Ajeng",
      groomInstagram: "andi",
      brideInstagram: "besse",
      openingQuote: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan.",
      openingQuoteRef: "QS. Ar-Rum: 21",
      musicUrl: "/music/canon-in-d.ogg",
      dresscode: "Earth Tone",
      liveStreamUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      participantsJson: PARTICIPANTS[eventType] ? JSON.stringify(PARTICIPANTS[eventType]) : null,
      loveStory: JSON.stringify([{ title: "Pertama Bertemu", date: "2019", content: "Bertemu di kampus." }, { title: "Lamaran", date: "2025", content: "Keluarga datang melamar." }]),
      bankAccounts: JSON.stringify([{ bank: "BCA", number: "7890123456", name: "Andi" }]),
      featureSettings: featureSettings(),
      eventData: JSON.stringify([
        { title: "Akad Nikah", date: "2099-12-12", time: "08:00 - 10:00 WITA", startTime: "08:00", endTime: "10:00", timezone: "WITA", location: "Masjid Raya", address: "Jl. Masjid Raya 1", mapsUrl: "https://maps.google.com/?q=masjid", badge: "Sakral", isPrimary: false },
        { title: "Resepsi", date: "2099-12-12", time: "11:00 - 14:00 WITA", startTime: "11:00", endTime: "14:00", timezone: "WITA", location: "Gedung Mulo", address: "Jl. Sudirman 25", mapsUrl: "https://maps.google.com/?q=mulo", badge: "Umum", isPrimary: true },
      ]),
      media: { create: SLOTS.map((slot) => ({ mediaSlot: slot, localPath: slotUrl(slot) })) },
    },
  });
  ids.invitations.push(inv.id);
  return inv.id;
}

/** Draf hasil wizard yang hanya memilih jenis acara: tanpa foto, tanggal, tempat, maupun data peserta. */
async function makeEmptyInvitation(eventType: string) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${eventType}_empty@test.local`, name: eventType } });
  ids.users.push(user.id);
  const order = await prisma.order.create({
    data: { userId: user.id, invoiceNumber: `${RUN}-${eventType}-empty`, planType: "TIER_3", amount: 200000, status: "PAID", orderType: "NEW", paidAt: new Date() },
  });
  ids.orders.push(order.id);
  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: order.id,
      eventType: eventType as never,
      invitationSlug: `${RUN}-${eventType}-empty`,
      groomSlug: `${RUN}-g-${eventType}-empty`,
      brideSlug: `${RUN}-b-${eventType}-empty`,
      featureSettings: JSON.stringify({ showGallery: true, showGift: true, showStory: true }),
      eventData: JSON.stringify([{ title: "Acara", date: "", time: "", location: "", isPrimary: true }]),
    },
  });
  ids.invitations.push(inv.id);
  return inv.id;
}

const findings: Record<string, string[]> = {};

describe.skipIf(!IS_TEST_DB)("token template tema terisi oleh mesin", () => {
  const invitationByType: Record<string, string> = {};
  const emptyInvitationByType: Record<string, string> = {};

  beforeAll(async () => {
    for (const eventType of new Set(Object.values(THEME_MAP).map((t) => EVENT_TYPE_OF[t.eventType]))) {
      invitationByType[eventType] = await makeInvitation(eventType);
      emptyInvitationByType[eventType] = await makeEmptyInvitation(eventType);
    }
  }, 60000);

  for (const [themeId, info] of Object.entries(THEME_MAP)) {
    it(`${themeId}: semua token template ada di data`, async () => {
      const eventType = EVENT_TYPE_OF[info.eventType];
      const invitationId = invitationByType[eventType];
      await prisma.invitation.update({ where: { id: invitationId }, data: { themeId } });

      const data = (await composeTemplateData(invitationId)) as Record<string, unknown>;
      const missingReads = new Set<string>();
      const recorder = new Proxy(data, {
        get(target, key, receiver) {
          if (typeof key === "string" && !(key in target)) missingReads.add(key);
          return Reflect.get(target, key, receiver);
        },
      });
      const html = await renderTemplateFile(themeId, recorder, { eventType });

      const tokens = templateTokens(themeId);
      const missing = [...tokens].filter((t) => missingReads.has(t) || t === "else").sort();
      const leftover = html.match(/\{\{[^}]*\}\}/g) ?? [];
      findings[themeId] = [...missing, ...leftover.map((l) => `sisa:${l}`)];
      expect(findings[themeId]).toEqual([]);

      // Data klien benar-benar tampil: foto utama, galeri, dan tempat jadwal terima tamu.
      expect(html).toContain(slotUrl("GROOM_PHOTO"));
      expect(html).toContain(GALLERY_URLS[0]);
      expect(html).toContain("Gedung Mulo");
      expect((PARTICIPANT_TEXT[eventType] ?? []).filter((text) => !html.includes(text))).toEqual([]);
    });
  }

  for (const [themeId, info] of Object.entries(THEME_MAP)) {
    it(`${themeId}: undangan tanpa data tidak memuat foto demo maupun fakta contoh`, async () => {
      const eventType = EVENT_TYPE_OF[info.eventType];
      const invitationId = emptyInvitationByType[eventType];
      await prisma.invitation.update({ where: { id: invitationId }, data: { themeId } });
      const html = await renderTemplateFile(themeId, (await composeTemplateData(invitationId)) as Record<string, unknown>, { eventType });

      expect(html.match(/["'(]\/demo\/[^"')]+/g) ?? []).toEqual([]);
      expect(FAKE_FACTS.filter((fact) => html.includes(fact))).toEqual([]);
    });
  }

  afterAll(() => {
    const bad = Object.entries(findings).filter(([, v]) => v.length);
    if (bad.length) console.log("[themePlaceholders] token tidak terisi:\n" + bad.map(([k, v]) => `  ${k}: ${v.join(", ")}`).join("\n"));
  });
});

afterAll(async () => {
  await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
  await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
  await pool.end();
});
