import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const BRAND_DIR = path.join(process.cwd(), "public", "assets", "brand");

// Pastikan folder brand selalu ada
async function ensureBrandDir() {
  try {
    await fs.promises.access(BRAND_DIR);
  } catch {
    await fs.promises.mkdir(BRAND_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    await ensureBrandDir();

    const formData = await req.formData();
    const type = formData.get("type") as string; // "logo" | "favicon"
    const file = formData.get("file") as File | null;

    if (!file || !type) {
      return NextResponse.json({ error: "File dan type wajib diisi" }, { status: 400 });
    }

    if (!["logo", "favicon"].includes(type)) {
      return NextResponse.json({ error: "Type harus logo atau favicon" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (type === "logo") {
      // Logo: konversi ke WebP, kompres kualitas 85, max 800px width
      const outputPath = path.join(BRAND_DIR, "logo.webp");
      await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outputPath);

      return NextResponse.json({
        success: true,
        type: "logo",
        url: `/assets/brand/logo.webp?t=${Date.now()}`,
        message: "Logo berhasil diupload dan dikompresi ke WebP",
      });
    }

    if (type === "favicon") {
      // Favicon: simpan sebagai PNG 64x64 (override favicon.png)
      const outputPng = path.join(BRAND_DIR, "favicon.png");
      await sharp(buffer)
        .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(outputPng);

      // Juga simpan ke public/favicon.ico (sebagai PNG rename — browser modern support)
      const favIconPath = path.join(process.cwd(), "public", "favicon.ico");
      await fs.promises.copyFile(outputPng, favIconPath);

      return NextResponse.json({
        success: true,
        type: "favicon",
        url: `/favicon.ico?t=${Date.now()}`,
        message: "Favicon berhasil diupload dan diperbarui di seluruh platform",
      });
    }

    return NextResponse.json({ error: "Tipe brand tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("[Upload Brand Error]", error);
    return NextResponse.json({ error: error.message || "Gagal mengupload file brand" }, { status: 500 });
  }
}
