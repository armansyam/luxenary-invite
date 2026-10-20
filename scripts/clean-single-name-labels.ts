/**
 * Mengganti label blueprint yang tersalin ke undangan non-pernikahan dengan label bawaan yang benar, dan membersihkan
 * data Studio Demo tema satu nama.
 *
 * Sampai 20 Okt 2026 rute pembuatan undangan menyalin ±45 label blueprint ke `featureSettings.customLabels`, dan
 * Studio Demo menyimpan cadangan blueprint ke `theme_demo_<id>`. Blueprint tema satu nama berisi cadangan pernikahan
 * ("THE COUPLE", "WISHES & RSVP"), sedangkan label tersimpan menimpa token jenis acara di master. Skrip ini menghapus
 * label yang nilainya persis sama dengan nilai salinan itu (suntingan klien dipertahankan), lalu mengisi ulang label
 * bawaan dari master undangan yang dirender untuk jenis acaranya (`seedRenderedLabels`). Undangan non-pernikahan yang
 * labelnya kosong (dibuat saat 624d17f) ikut diisi. Data demo tema satu nama hanya dibersihkan, karena label demo
 * berlaku sebagai lapisan di atas teks master.
 *
 *   npx tsx scripts/clean-single-name-labels.ts           # dry run
 *   npx tsx scripts/clean-single-name-labels.ts --apply   # simpan, isi ulang label, bangun ulang HTML undangan terbit
 */
import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import {
  THEME_BLUEPRINTS,
  DEFAULT_MINIMALIST_BLUEPRINT,
  DEFAULT_MODERN_BLUEPRINT,
  DEFAULT_TRADITIONAL_BLUEPRINT,
  getThemeBlueprint,
  type ThemeBlueprint,
} from "../lib/themeDefaults";
import { buildAndSavePublishedHtml, waitForPendingArchiveSyncs } from "../lib/staticPublisher";
import { parseFeatureSettings } from "../lib/featureSettings";
import { seedRenderedLabels } from "../lib/renderedLabels";

const apply = process.argv.includes("--apply");

// Kunci label -> bidang blueprint dan cadangan tetap, sama dengan yang dipakai rute pembuatan undangan dan Studio Demo lama.
const LABEL_SOURCES: Record<string, { field?: keyof ThemeBlueprint; fixed?: string[] }> = {
  coverSubtitle: { field: "coverSubtitle" },
  coverBadge: { field: "coverBadge", fixed: ["BIRTHDAY CELEBRATION", "WALIMATUL KHITAN", "WALIMATUL AQIQAH", "GRADUATION CELEBRATION", "SPECIAL GATHERING", "THE WEDDING OF"] },
  coverGuestLabel: { fixed: ["Kepada Yth. Bapak/Ibu/Saudara/i"] },
  openingGreeting: { field: "openingGreeting", fixed: [""] },
  openBtn: { field: "openBtn" },
  rsvpTitle: { field: "rsvpTitle" },
  rsvpBtnText: { field: "rsvpBtnText", fixed: ["Kirim Konfirmasi & Doa"] },
  quoteTitle: { field: "quoteSectionTitle" },
  quoteEyebrow: { field: "quoteSectionEyebrow" },
  coupleTitle: { field: "coupleSectionTitle" },
  coupleEyebrow: { field: "coupleSectionEyebrow", fixed: ["THE COUPLE", "EVENT PROFILE"] },
  coupleSub: { field: "coupleSectionSub" },
  eventsTitle: { field: "eventsSectionTitle" },
  eventsEyebrow: { field: "eventsSectionEyebrow", fixed: ["AGENDA ACARA"] },
  eventsSub: { field: "eventsSectionSub" },
  storyTitle: { field: "storySectionTitle" },
  storyEyebrow: { field: "storySectionEyebrow", fixed: ["OUR JOURNEY", "HIGHLIGHTS"] },
  galleryTitle: { field: "gallerySectionTitle" },
  galleryEyebrow: { field: "gallerySectionEyebrow" },
  galleryQuote: { field: "galleryQuote" },
  dressCodeTitle: { field: "dressCodeTitle", fixed: ["Dress Code"] },
  dressCodeEyebrow: { field: "dressCodeEyebrow", fixed: ["A Guide To"] },
  dressCodeSubtitle: { field: "dressCodeSubtitle", fixed: ["Kami mengundang tamu undangan untuk mengenakan palet warna berikut:"] },
  streamingTitle: { field: "streamingTitle", fixed: ["Live Streaming"] },
  streamingEyebrow: { field: "streamingEyebrow", fixed: ["Virtual Ceremony"] },
  streamingSubtitle: { field: "streamingSubtitle", fixed: ["Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:"] },
  giftTitle: { field: "giftSectionTitle" },
  giftEyebrow: { field: "giftSectionEyebrow", fixed: ["WEDDING GIFT", "TANDA KASIH"] },
  giftDesc: { field: "giftSectionDesc" },
  turutMengundangTitle: { field: "turutMengundangTitle", fixed: ["Turut Mengundang"] },
  turutMengundangEyebrow: { field: "turutMengundangEyebrow", fixed: ["Keluarga Besar"] },
  turutMengundangSubtitle: { field: "turutMengundangSubtitle", fixed: ["Keluarga Besar & Kerabat yang turut berbahagia:"] },
  wishesTitle: { field: "wishesSectionTitle" },
  wishesEyebrow: { field: "wishesSectionEyebrow", fixed: ["WISHES & RSVP", "GUEST WISHES"] },
  wishesSub: { field: "wishesSectionSub" },
  closingQuote: { field: "closingQuote" },
  closingSub: { field: "closingSub" },
  rsvpNameLabel: { fixed: ["Nama Lengkap"] },
  rsvpStatusLabel: { fixed: ["Konfirmasi Kehadiran"] },
  rsvpCountLabel: { fixed: ["Jumlah Tamu"] },
  rsvpMessageLabel: { fixed: ["Ucapan & Doa Restu"] },
  vendorTitle: { field: "vendorTitle", fixed: ["Mitra Vendor", "Mitra Acara"] },
  vendorEyebrow: { field: "vendorEyebrow", fixed: ["WEDDING CREDITS", "EVENT CREDITS"] },
  vendorSubtitle: {
    field: "vendorSubtitle",
    fixed: [
      "Rasa terima kasih dan penghargaan setulusnya kepada seluruh vendor yang telah membantu menyempurnakan hari bahagia kami.",
      "Rasa terima kasih dan penghargaan setulusnya kepada seluruh pihak dan mitra yang telah membantu menyempurnakan acara kami.",
    ],
  },
};

function copiedValues(): Map<string, Set<string>> {
  const blueprints: ThemeBlueprint[] = [
    ...Object.keys(THEME_BLUEPRINTS).map((id) => getThemeBlueprint(id)),
    DEFAULT_MINIMALIST_BLUEPRINT,
    DEFAULT_MODERN_BLUEPRINT,
    DEFAULT_TRADITIONAL_BLUEPRINT,
  ];
  const map = new Map<string, Set<string>>();
  for (const [key, src] of Object.entries(LABEL_SOURCES)) {
    const set = new Set<string>(src.fixed || []);
    if (src.field) for (const bp of blueprints) {
      const v = bp[src.field];
      if (typeof v === "string") set.add(v);
    }
    map.set(key, set);
  }
  return map;
}

function strip(labels: Record<string, unknown>, copied: Map<string, Set<string>>) {
  const kept: Record<string, unknown> = {};
  const removed: string[] = [];
  for (const [k, v] of Object.entries(labels)) {
    if (typeof v === "string" && copied.get(k)?.has(v)) removed.push(k);
    else kept[k] = v;
  }
  return { kept, removed };
}

async function main() {
  const copied = copiedValues();

  const invitations = await prisma.invitation.findMany({
    where: { eventType: { not: "WEDDING" } },
    select: { id: true, eventType: true, themeId: true, status: true, featureSettings: true },
  });
  let changedInv = 0;
  for (const inv of invitations) {
    const fs = parseFeatureSettings(inv.featureSettings);
    const labels = (fs.customLabels || {}) as Record<string, unknown>;
    // Salinan lama selalu menulis cadangan pernikahan untuk eyebrow profil dan ucapan; label hasil render master tidak
    // pernah berisi nilai itu, sehingga undangan yang sudah diisi ulang tidak diproses lagi.
    const isOldBulkCopy = ["THE COUPLE", "EVENT PROFILE"].includes(String(labels.coupleEyebrow)) || ["WISHES & RSVP", "GUEST WISHES"].includes(String(labels.wishesEyebrow));
    if (!isOldBulkCopy && Object.keys(labels).length > 0) continue;
    const { kept, removed } = strip(labels, copied);
    changedInv++;
    console.log(`undangan ${inv.id} (${inv.eventType}/${inv.themeId}, ${inv.status}): hapus ${removed.length}, suntingan klien ${Object.keys(kept).length} [${Object.keys(kept).join(", ")}]`);
    if (!apply) continue;
    await prisma.invitation.update({ where: { id: inv.id }, data: { featureSettings: { ...fs, customLabels: kept } as never } });
    const seeded = await seedRenderedLabels(inv.id);
    console.log(`  label bawaan terisi: ${Object.keys(seeded).length}`);
    if (inv.status === "PUBLISHED") await buildAndSavePublishedHtml(inv.id);
  }

  const singleThemes = await prisma.theme.findMany({ where: { eventType: { not: "WEDDING" } }, select: { id: true } });
  const settings = await prisma.adminSetting.findMany({ where: { key: { in: singleThemes.map((t) => `theme_demo_${t.id}`) } } });
  let changedDemo = 0;
  for (const s of settings) {
    const data = JSON.parse(s.value);
    const { kept, removed } = strip(data.customLabels || {}, copied);
    if (removed.length === 0) continue;
    changedDemo++;
    console.log(`${s.key}: hapus ${removed.length}, sisa ${Object.keys(kept).length} [${Object.keys(kept).join(", ")}]`);
    if (apply) await prisma.adminSetting.update({ where: { key: s.key }, data: { value: JSON.stringify({ ...data, customLabels: kept }) } });
  }

  if (apply) await waitForPendingArchiveSyncs();
  console.log(`${apply ? "Diterapkan" : "Dry run"}: ${changedInv} dari ${invitations.length} undangan non-pernikahan, ${changedDemo} dari ${settings.length} data demo tema satu nama.`);
  if (apply && changedDemo > 0) console.log("Bangun ulang demo statis tema yang berubah lewat Studio Demo atau compileAndSaveStaticDemo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
