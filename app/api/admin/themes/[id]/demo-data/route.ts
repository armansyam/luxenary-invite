import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminModule } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { logger } from "@/lib/logger";
import { isSafePathSegment } from "@/lib/fsSafe";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const themeId = id.toLowerCase().trim();

    // Check custom settings in database first
    const settingKey = `theme_demo_${themeId}`;
    const setting = await prisma.adminSetting.findUnique({
      where: { key: settingKey },
    });

    const dbTheme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: { name: true, category: true, series: true, defaultMusicUrl: true },
    });

    const { getThemeBlueprint } = await import("@/lib/themeDefaults");
    const blueprint = getThemeBlueprint(themeId, {
      themeName: dbTheme?.name,
      series: dbTheme?.series || dbTheme?.category,
    });
    let resolvedData: any = null;
    let isCustom = false;

    if (setting && setting.value) {
      try {
        resolvedData = JSON.parse(setting.value);
        isCustom = true;
      } catch (err) {
        // Data kustom yang rusak tidak menggagalkan halaman: admin melihat bawaan tema dan dapat menyimpan ulang.
        logger.warn("ThemeDemoData", "Data demo kustom bukan JSON valid; memakai bawaan tema", { key: settingKey, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (!resolvedData) {
      const defaultData = DEMO_REGISTRY[themeId] || DEMO_REGISTRY["kalandra"];
      resolvedData = JSON.parse(JSON.stringify(defaultData));
      if (dbTheme?.name) resolvedData.themeName = dbTheme.name;
      resolvedData.themeId = themeId;
    }

    // Ensure customLabels has theme-specific blueprint fallbacks
    resolvedData.customLabels = {
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
      ...(resolvedData.customLabels || {}),
    };

    if (!resolvedData.openingQuote) resolvedData.openingQuote = blueprint.openingQuote;
    if (!resolvedData.openingQuoteRef) resolvedData.openingQuoteRef = blueprint.openingQuoteRef;
    if (!resolvedData.closingQuote) resolvedData.closingQuote = blueprint.closingQuote;
    if (!resolvedData.closingSub) resolvedData.closingSub = blueprint.closingSub;
    if (!resolvedData.audioUrl) {
      resolvedData.audioUrl = dbTheme?.defaultMusicUrl || blueprint.defaultMusicUrl || "";
    }

    return NextResponse.json({
      success: true,
      themeId,
      data: resolvedData,
      isCustom,
    });
  } catch (err) {
    return routeError("ThemeDemoData", err, "Gagal memuat data demo");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const themeId = id.toLowerCase().trim();
    // ID tema menjadi direktori tujuan demo statis (`public/demo/<id>/index.html`).
    if (!isSafePathSegment(themeId)) {
      return NextResponse.json({ error: "ID tema tidak valid" }, { status: 400 });
    }
    const body = await req.json();

    const settingKey = `theme_demo_${themeId}`;
    const updatedSetting = await prisma.adminSetting.upsert({
      where: { key: settingKey },
      create: {
        key: settingKey,
        value: JSON.stringify(body),
        label: `Demo Data Konfigurasi - ${themeId.toUpperCase()}`,
        group: "themes",
      },
      update: {
        value: JSON.stringify(body),
      },
    });

    const version = updatedSetting.updatedAt ? new Date(updatedSetting.updatedAt).getTime() : Date.now();
    // Invalidate in-memory template cache so fresh template is used
    const { masterTemplateCache } = await import("@/lib/cache");
    masterTemplateCache.clear();

    // Re-compile static demo HTML file instantly
    const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
    await compileAndSaveStaticDemo(themeId, body, version);

    // Invalidate Next.js cache & Cloudflare Edge Cache
    try {
      revalidatePath("/");
      revalidatePath("/demo");
      revalidatePath(`/demo/${themeId}`);
      revalidatePath("/api/public/themes");
      await purgeCloudflareCache({ purgeEverything: true });
    } catch (err) {
      logger.warn("ThemeDemoData", "Revalidasi atau purge cache Cloudflare gagal setelah menyimpan data demo", { themeId, error: err instanceof Error ? err.message : String(err) });
    }

    return NextResponse.json({
      success: true,
      message: `Data demo tema ${themeId} berhasil disimpan & file preview statis telah diperbarui`,
      themeId,
      data: body,
    });
  } catch (err) {
    return routeError("ThemeDemoData", err, "Gagal menyimpan data demo");
  }
}
