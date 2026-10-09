/**
 * Uji injeksi XSS pada HTML undangan terbit (pipeline publish asli, DB luxenary_test).
 *
 * Setiap field yang dibaca themeEngine diisi payload bertanda unik (`tag`). Bila sebuah konstruksi
 * berbahaya muncul mentah di HTML, laporan menyebut tag-nya sehingga field yang bocor terlihat jelas.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma, pool } from "@/lib/prisma";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "@/lib/staticPublisher";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_xss_${Date.now()}`;

/** Payload teks: keluar dari atribut, membuka tag, menyisipkan event handler, dan menutup <script>. */
const xss = (tag: string) =>
  `"><script>window.__xss='${tag}'</script><img src=x onerror=alert('${tag}')> " onmouseover="alert('${tag}') </script><script>window.__xss='${tag}!'</script>`;
/** Payload URL: skema javascript: diikuti payload teks. */
const urlXss = (tag: string) => `javascript:alert('${tag}')${xss(tag)}`;

const DETECTORS: Array<{ name: string; regex: RegExp }> = [
  // Tanpa peka huruf: engine memanggil .toUpperCase() pada sebagian field, dan tag HTML tidak peka huruf.
  { name: "tag <script> mentah", regex: /<script>window\.__xss='([^']+)'/gi },
  { name: "tag <img onerror> mentah", regex: /<img src=x onerror=alert\('([^']+)'\)>/gi },
  { name: "atribut onmouseover mentah", regex: /" onmouseover="alert\('([^']+)'\)/gi },
  { name: "penutup </script> mentah", regex: /<\/script><script>window\.__xss='([^']+)'/gi },
  // Handler inline dengan string JS: browser men-decode &#039; menjadi ' sebelum JS berjalan,
  // sehingga escapeHtml saja tidak cukup; nilai harus lewat data-* atau JSON.
  { name: "handler inline: string JS dapat ditutup", regex: /\bon[a-z]+\s*=\s*"[^"]*?\(\s*'[^"]*?alert\(&#0?39;([^&\s]+?)&#0?39;\)/gi },
  { name: "skema javascript: di href/src", regex: /(?:href|src|action|formaction|data)\s*=\s*["']?\s*javascript:alert\('([^']+)'\)/gi },
];

const TEXT_KEYS = [
  "name", "nickname", "title", "text", "story", "description", "desc", "content", "caption", "year", "date",
  "bankName", "bank", "accountName", "holder", "accountNumber", "number", "label", "note", "age", "birthDate",
  "fatherName", "motherName", "instagram", "gender", "dayAge", "birthWeight", "birthLength", "degree", "major",
  "faculty", "university", "honors", "thesisTitle", "birthOrder", "organizer", "theme", "venue",
];
const URL_KEYS = ["url", "logoUrl", "photoUrl", "imageUrl", "qrisUrl", "link", "mapsUrl"];

const tagged = (prefix: string, keys: string[], make: (tag: string) => string) =>
  Object.fromEntries(keys.map((k) => [k, make(`${prefix}.${k}`)]));

const ids = { users: [] as string[], invitations: [] as string[] };

async function seedInvitation(themeId: string, eventType: string, index: number) {
  const user = await prisma.user.create({ data: { email: `${RUN}_${index}@t.local`, name: "Owner" } });
  ids.users.push(user.id);

  const events = [
    {
      ...tagged("event", ["title", "time", "startTime", "endTime", "timezone", "location", "address", "badge", "notes"], xss),
      date: "2026-12-12",
      mapsUrl: urlXss("event.mapsUrl"),
      isPrimary: true,
    },
  ];

  const participants = Object.fromEntries(
    ["person", "child", "parents", "baby", "event"].map((k) => [k, tagged(`participants.${k}`, TEXT_KEYS, xss)])
  );

  const featureSettings = {
    customLabels: tagged("customLabels", ["coupleSectionTitle", "eventsSectionTitle", "wishesSectionTitle", "storySectionTitle", "giftSectionTitle"], xss),
    dressCodeColors: xss("fs.dressCodeColors"),
    dressCodeNote: xss("fs.dressCodeNote"),
    quoteTitle: xss("fs.quoteTitle"),
    weddingTagline: xss("fs.weddingTagline"),
    turutMengundang: xss("fs.turutMengundang"),
    instagramFilterUrl: urlXss("fs.instagramFilterUrl"),
    liveStreamInstagramUrl: urlXss("fs.liveStreamInstagramUrl"),
    liveStreamYoutubeUrl: urlXss("fs.liveStreamYoutubeUrl"),
    liveStreamZoomUrl: urlXss("fs.liveStreamZoomUrl"),
    musicUrl: urlXss("fs.musicUrl"),
    qrisImageUrl: urlXss("fs.qrisImageUrl"),
    videoGalleryUrl: urlXss("fs.videoGalleryUrl"),
    galleryPhotosList: `${urlXss("fs.galleryPhotosList.0")}\n${urlXss("fs.galleryPhotosList.1")}`,
    vendors: [{ ...tagged("vendor", TEXT_KEYS, xss), ...tagged("vendor", URL_KEYS, urlXss) }],
    showGift: true,
    showGuestMemories: true,
    showLiveStream: true,
    showQrCheckin: true,
    showFilter: true,
    showGallery: true,
    showStory: true,
    showVendors: true,
    showDresscode: true,
    showTurutMengundang: true,
    showMusic: true,
  };

  const inv = await prisma.invitation.create({
    data: {
      userId: user.id,
      themeId,
      eventType: eventType as any,
      status: "PUBLISHED",
      invitationSlug: `${RUN}-${index}`,
      groomSlug: `${RUN}-g${index}`,
      brideSlug: `${RUN}-b${index}`,
      groomName: xss("inv.groomName"),
      brideName: xss("inv.brideName"),
      groomNickname: xss("inv.groomNickname"),
      brideNickname: xss("inv.brideNickname"),
      groomParents: xss("inv.groomParents"),
      groomFather: xss("inv.groomFather"),
      groomMother: xss("inv.groomMother"),
      brideParents: xss("inv.brideParents"),
      brideFather: xss("inv.brideFather"),
      brideMother: xss("inv.brideMother"),
      groomInstagram: xss("inv.groomInstagram"),
      brideInstagram: xss("inv.brideInstagram"),
      openingQuote: xss("inv.openingQuote"),
      openingQuoteRef: xss("inv.openingQuoteRef"),
      dresscode: xss("inv.dresscode"),
      shippingAddress: xss("inv.shippingAddress"),
      liveStreamUrl: urlXss("inv.liveStreamUrl"),
      musicUrl: urlXss("inv.musicUrl"),
      eventData: JSON.stringify(events),
      loveStory: JSON.stringify([
        tagged("loveStory.0", TEXT_KEYS, xss),
        { ...tagged("loveStory.1", TEXT_KEYS, xss), ...tagged("loveStory.1", URL_KEYS, urlXss) },
      ]),
      bankAccounts: JSON.stringify([{ ...tagged("bank", TEXT_KEYS, xss), ...tagged("bank", URL_KEYS, urlXss) }]),
      participantsJson: JSON.stringify(participants),
      featureSettings: JSON.stringify(featureSettings),
    },
  });
  ids.invitations.push(inv.id);

  await prisma.guestMemory.create({
    data: {
      invitationId: inv.id,
      senderName: xss("memory.senderName"),
      senderEmail: "x@t.local",
      message: xss("memory.message"),
      mediaUrl: urlXss("memory.mediaUrl"),
      thumbnailUrl: urlXss("memory.thumbnailUrl"),
    },
  });
  return inv.id;
}

describe.skipIf(!IS_TEST_DB)("XSS pada HTML undangan terbit", () => {
  let themes: Array<{ id: string; eventType: string }> = [];

  beforeAll(async () => {
    themes = await prisma.theme.findMany({ select: { id: true, eventType: true }, orderBy: { id: "asc" } });
  });

  afterAll(async () => {
    for (const id of ids.invitations) {
      await deletePublishedHtml(id);
      // renderTemplateFile dengan invitationId menulis data/drafts/<id>.html; hapus agar tidak menjadi berkas yatim.
      await fs.promises.rm(path.join(process.cwd(), "data", "drafts", `${id}.html`), { force: true });
    }
    await prisma.guestMemory.deleteMany({ where: { invitationId: { in: ids.invitations } } });
    await prisma.invitation.deleteMany({ where: { id: { in: ids.invitations } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it("seluruh 39 tema tersedia di database uji", () => {
    expect(themes.length).toBeGreaterThanOrEqual(39);
  });

  it("seluruh tema: tidak ada payload yang menjadi markup, atribut, atau skema JS yang dapat dieksekusi", async () => {
    // "detektor :: tag field" -> daftar tema yang bocor
    const leaks = new Map<string, Set<string>>();
    const contexts = new Map<string, string>();
    const renderFailures: string[] = [];

    for (let i = 0; i < themes.length; i++) {
      const { id: themeId, eventType } = themes[i];
      const invId = await seedInvitation(themeId, eventType, i);
      const outputs: Array<{ path: string; html: string | null }> = [];
      try {
        // Jalur 1: publikasi (meta tag ditimpa publisher)
        outputs.push({ path: "publish", html: await buildAndSavePublishedHtml(invId) });
        // Jalur 2: pratinjau/rute cadangan memakai meta tag hasil komposer tanpa ditimpa
        const data = await composeTemplateData(invId);
        outputs.push({ path: "preview", html: data ? await renderTemplateFile(themeId, data, { editMode: false, invitationId: invId }) : null });
      } catch (err: any) {
        renderFailures.push(`${themeId}: ${err?.message}`);
        continue;
      }
      for (const { path: renderPath, html } of outputs) {
        if (!html) {
          renderFailures.push(`${themeId} (${renderPath}): render mengembalikan null`);
          continue;
        }
        for (const { name, regex } of DETECTORS) {
          for (const match of html.matchAll(regex)) {
            const key = `${name} :: ${match[1].replace(/!$/, "")} (${renderPath})`;
            if (!leaks.has(key)) leaks.set(key, new Set());
            leaks.get(key)!.add(themeId);
            if (process.env.XSS_DEBUG && !contexts.has(key)) {
              const at = match.index ?? 0;
              contexts.set(key, `${themeId}: …${html.slice(Math.max(0, at - 110), at + 30).replace(/\s+/g, " ")}…`);
            }
          }
        }
      }
    }

    const report = [...leaks.entries()]
      .sort()
      .map(([key, set]) => `${key}  [${set.size} tema]${contexts.has(key) ? `\n      ${contexts.get(key)}` : ""}`);
    expect(renderFailures).toEqual([]);
    expect(report).toEqual([]);
  }, 300000);
});
