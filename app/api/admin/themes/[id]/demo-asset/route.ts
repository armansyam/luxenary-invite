import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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

    const formData = await req.formData();
    const slot = formData.get("slot") as string; // cover, hero, background, groom, bride, gallery_01..08, music
    const file = formData.get("file") as File | null;

    if (!slot || !file) {
      return NextResponse.json({ error: "Slot dan file harus disertakan" }, { status: 400 });
    }

    const targetDir = path.join(process.cwd(), "public", "demo", themeId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine extension
    let extension = "webp";
    if (slot === "music" || file.type.startsWith("audio/")) {
      extension = "mp3";
    }

    const fileName = `${slot}.${extension}`;
    const targetFilePath = path.join(targetDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetFilePath, buffer);

    // Re-compile static demo HTML file with new visual asset
    try {
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      const { prisma } = await import("@/lib/prisma");
      const setting = await prisma.adminSetting.findUnique({
        where: { key: `theme_demo_${themeId}` },
      });
      const customData = setting?.value ? JSON.parse(setting.value) : undefined;
      compileAndSaveStaticDemo(themeId, customData);
    } catch {}

    const publicUrl = `/demo/${themeId}/${fileName}?t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: `Aset ${slot} berhasil diperbarui & file preview statis telah dikompilasi ulang`,
      url: publicUrl,
      fileName,
      themeId,
    });
  } catch (err: any) {
    console.error("[DemoAsset-Upload-Error]:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengunggah aset demo" },
      { status: 500 }
    );
  }
}
