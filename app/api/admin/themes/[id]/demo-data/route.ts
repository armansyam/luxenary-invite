import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_REGISTRY } from "@/lib/demoRegistry";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const themeId = id.toLowerCase().trim();

    // Check custom settings in database first
    const settingKey = `theme_demo_${themeId}`;
    const setting = await prisma.adminSetting.findUnique({
      where: { key: settingKey },
    });

    const dbTheme = await prisma.theme.findUnique({
      where: { id: themeId },
      select: { name: true, category: true, series: true },
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
      } catch {}
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

    return NextResponse.json({
      success: true,
      themeId,
      data: resolvedData,
      isCustom,
    });
  } catch (err: any) {
    console.error("[DemoData-Get-Error]:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat data demo" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const themeId = id.toLowerCase().trim();
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
    // Re-compile static demo HTML file instantly
    const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
    await compileAndSaveStaticDemo(themeId, body, version);

    // Invalidate Next.js cache
    try {
      revalidatePath("/demo");
      revalidatePath(`/demo/${themeId}`);
      revalidatePath("/api/public/themes");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Data demo tema ${themeId} berhasil disimpan & file preview statis telah diperbarui`,
      themeId,
      data: body,
    });
  } catch (err: any) {
    console.error("[DemoData-Post-Error]:", err);
    return NextResponse.json(
      { error: err.message || "Gagal menyimpan data demo" },
      { status: 500 }
    );
  }
}
