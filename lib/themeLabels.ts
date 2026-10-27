import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getThemeBlueprint, type ThemeBlueprint } from "@/lib/themeDefaults";
import { applyBuilderTexts, builderTextsOf } from "@/lib/themeBuilder/texts";

export interface ThemeLabelContext {
  customDemoData: any;
  themeMeta: { name: string; category: string; series: string | null; defaultMusicUrl?: string | null; defaultMedia?: unknown; builderSpec?: unknown } | null;
  blueprint: ThemeBlueprint;
  defaultCoverBadge: string;
  /** Label awal undangan pernikahan; kosong untuk jenis acara lain (label diambil dari master yang dirender). */
  initialCustomLabels: Record<string, string>;
}

/**
 * Bawaan sebuah tema untuk undangan baru: blueprint (dengan Studio Demo dan teks bawaan builder) dan label awal yang
 * disalin ke undangan. Dipakai saat membuat undangan dan saat klien mengganti tema, sehingga keduanya memakai bawaan
 * yang sama.
 */
export async function loadThemeLabelContext(themeId: string, eventType: string): Promise<ThemeLabelContext> {
  const key = themeId.toLowerCase();
  let customDemoData: any = null;
  try {
    const customSetting = await prisma.adminSetting.findUnique({ where: { key: `theme_demo_${key}` }, select: { value: true } });
    if (customSetting?.value) customDemoData = JSON.parse(customSetting.value);
  } catch (err) {
    logger.warn("ThemeLabels", "Data demo kustom tema tidak terbaca; undangan memakai bawaan tema", { theme: themeId, error: err instanceof Error ? err.message : String(err) });
  }

  let themeMeta: ThemeLabelContext["themeMeta"] = null;
  try {
    themeMeta = await prisma.theme.findUnique({
      where: { id: key },
      select: { name: true, category: true, series: true, defaultMusicUrl: true, defaultMedia: true, builderSpec: true },
    });
  } catch (err) {
    logger.warn("ThemeLabels", "Metadata tema tidak terbaca; undangan memakai bawaan", { theme: themeId, error: err instanceof Error ? err.message : String(err) });
  }

  // Teks bawaan yang diatur admin di Theme Builder menggantikan bawaan blueprint sebelum disalin ke label undangan.
  const builderTexts = builderTextsOf(themeMeta?.builderSpec);
  const { blueprint } = applyBuilderTexts(
    getThemeBlueprint(themeId, { ...(customDemoData || {}), themeName: themeMeta?.name, series: themeMeta?.series || themeMeta?.category }),
    builderTexts,
  );

  const isWeddingEvent = eventType === "WEDDING";
  const defaultCoverBadge = blueprint.coverBadge || (
    eventType === "BIRTHDAY"
      ? "BIRTHDAY CELEBRATION"
      : eventType === "KHITAN"
      ? "WALIMATUL KHITAN"
      : eventType === "AQIQAH"
      ? "WALIMATUL AQIQAH"
      : eventType === "WISUDA"
      ? "GRADUATION CELEBRATION"
      : eventType === "GATHERING"
      ? "SPECIAL GATHERING"
      : "THE WEDDING OF"
  );

  const defaultCustomLabels: Record<string, string> = {
    coverSubtitle: blueprint.coverSubtitle,
    coverBadge: defaultCoverBadge,
    coverGuestLabel: "Kepada Yth. Bapak/Ibu/Saudara/i",
    openingGreeting: blueprint.openingGreeting || "",
    openBtn: blueprint.openBtn,
    rsvpTitle: blueprint.rsvpTitle,
    rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
    quoteTitle: blueprint.quoteSectionTitle,
    quoteEyebrow: blueprint.quoteSectionEyebrow,
    coupleTitle: blueprint.coupleSectionTitle,
    coupleEyebrow: blueprint.coupleSectionEyebrow || (isWeddingEvent ? "THE COUPLE" : "EVENT PROFILE"),
    coupleSub: blueprint.coupleSectionSub,
    eventsTitle: blueprint.eventsSectionTitle,
    eventsEyebrow: blueprint.eventsSectionEyebrow || "AGENDA ACARA",
    eventsSub: blueprint.eventsSectionSub,
    storyTitle: blueprint.storySectionTitle,
    storyEyebrow: blueprint.storySectionEyebrow || (isWeddingEvent ? "OUR JOURNEY" : "HIGHLIGHTS"),
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
    giftEyebrow: blueprint.giftSectionEyebrow || (isWeddingEvent ? "WEDDING GIFT" : "TANDA KASIH"),
    giftDesc: blueprint.giftSectionDesc,
    turutMengundangTitle: blueprint.turutMengundangTitle || "Turut Mengundang",
    turutMengundangEyebrow: blueprint.turutMengundangEyebrow || "Keluarga Besar",
    turutMengundangSubtitle: blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:",
    wishesTitle: blueprint.wishesSectionTitle,
    wishesEyebrow: blueprint.wishesSectionEyebrow || (isWeddingEvent ? "WISHES & RSVP" : "GUEST WISHES"),
    wishesSub: blueprint.wishesSectionSub,
    closingQuote: blueprint.closingQuote,
    closingSub: blueprint.closingSub,
    rsvpNameLabel: "Nama Lengkap",
    rsvpStatusLabel: "Konfirmasi Kehadiran",
    rsvpCountLabel: "Jumlah Tamu",
    rsvpMessageLabel: "Ucapan & Doa Restu",
    vendorTitle: blueprint.vendorTitle || (isWeddingEvent ? "Mitra Vendor" : "Mitra Acara"),
    vendorEyebrow: blueprint.vendorEyebrow || (isWeddingEvent ? "WEDDING CREDITS" : "EVENT CREDITS"),
    vendorSubtitle: blueprint.vendorSubtitle || (isWeddingEvent ? "Rasa terima kasih dan penghargaan setulusnya kepada seluruh vendor yang telah membantu menyempurnakan hari bahagia kami." : "Rasa terima kasih dan penghargaan setulusnya kepada seluruh pihak dan mitra yang telah membantu menyempurnakan acara kami."),
  };

  // Blueprint tema satu nama berisi cadangan pernikahan ("THE COUPLE"), jadi label bawaan undangan non-pernikahan
  // tidak disalin dari blueprint melainkan dari teks master terpilih yang dirender untuk jenis acara ini, setelah
  // undangan tersimpan (seedRenderedLabels, lib/renderedLabels.ts). Teks bawaan admin ditumpuk di atas label awal,
  // termasuk label yang tidak punya kolom blueprint.
  const initialCustomLabels = isWeddingEvent ? { ...defaultCustomLabels, ...builderTexts } : {};

  return { customDemoData, themeMeta, blueprint, defaultCoverBadge, initialCustomLabels };
}

/**
 * featureSettings undangan setelah tema diganti: label yang belum pernah diubah klien dan tagline cover mengikuti tema
 * baru, label hasil edit klien dipertahankan. Snapshot label awal tema lama ada di `labelDefaults`; undangan pernikahan
 * lama yang belum punya snapshot memakai bawaan tema lama yang dihitung ulang, sedangkan undangan non-pernikahan tanpa
 * snapshot semua labelnya dianggap hasil edit klien (bawaan mereka berasal dari render master dan tidak dapat dihitung
 * ulang tanpa merender tema lama).
 */
export async function featureSettingsForThemeChange(
  fs: Record<string, any>,
  oldThemeId: string | null | undefined,
  newThemeId: string,
  eventType: string,
): Promise<Record<string, any>> {
  const [next, prev] = await Promise.all([
    loadThemeLabelContext(newThemeId, eventType),
    oldThemeId ? loadThemeLabelContext(oldThemeId, eventType) : Promise.resolve(null),
  ]);
  const stored = fs.labelDefaults && typeof fs.labelDefaults === "object" && !Array.isArray(fs.labelDefaults) ? (fs.labelDefaults as Record<string, string>) : undefined;
  const snapshot = stored ?? (eventType === "WEDDING" ? prev?.initialCustomLabels : undefined);
  const { customLabels, labelDefaults } = reconcileLabelsOnThemeChange(fs.customLabels, snapshot, next.initialCustomLabels);
  const taglineUntouched = !fs.weddingTagline || fs.weddingTagline === prev?.defaultCoverBadge;
  return { ...fs, customLabels, labelDefaults, weddingTagline: taglineUntouched ? next.defaultCoverBadge : fs.weddingTagline };
}

/**
 * Label undangan saat klien mengganti tema. `snapshot` adalah label awal tema lama yang dibekukan saat undangan dibuat
 * atau tema terakhir diganti; label klien yang masih sama dengan snapshot belum pernah diubah klien, jadi mengikuti tema
 * baru, sedangkan yang berbeda (diedit klien) dipertahankan. Tanpa snapshot (undangan lama) semua label dianggap diedit.
 */
export function reconcileLabelsOnThemeChange(
  clientLabels: Record<string, string> | undefined,
  snapshot: Record<string, string> | undefined,
  newDefaults: Record<string, string>,
): { customLabels: Record<string, string>; labelDefaults: Record<string, string> } {
  const current = clientLabels ?? {};
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    const untouched = snapshot !== undefined && key in snapshot && snapshot[key] === value;
    if (!untouched) kept[key] = value;
  }
  return { customLabels: { ...newDefaults, ...kept }, labelDefaults: { ...newDefaults } };
}
