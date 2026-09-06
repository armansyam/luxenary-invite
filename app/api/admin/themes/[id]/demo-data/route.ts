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

    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return NextResponse.json({ success: true, themeId, data: parsed, isCustom: true });
      } catch {}
    }

    // Fallback to DEMO_REGISTRY
    const defaultData = DEMO_REGISTRY[themeId] || DEMO_REGISTRY["kalandra"];
    return NextResponse.json({
      success: true,
      themeId,
      data: defaultData,
      isCustom: false,
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
