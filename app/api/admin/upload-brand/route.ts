import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const BRAND_DIR = path.join(process.cwd(), "public", "assets", "brand");

// Pastikan folder brand selalu ada
function ensureBrandDir() {
  if (!fs.existsSync(BRAND_DIR)) {
    fs.mkdirSync(BRAND_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBrandDir();

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
      fs.copyFileSync(outputPng, favIconPath);

      return NextResponse.json({
        success: true,
        type: "favicon",
        url: `/assets/brand/favicon.png?t=${Date.now()}`,
        message: "Favicon berhasil diupload, dikompres ke 64×64 PNG, dan disalin ke /favicon.ico",
      });
    }

    return NextResponse.json({ error: "Type tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("[upload-brand] Error:", error);
    return NextResponse.json({ error: error.message || "Upload gagal" }, { status: 500 });
  }
}

export async function GET() {
  ensureBrandDir();

  const logoPath = path.join(BRAND_DIR, "logo.webp");
  const faviconPath = path.join(BRAND_DIR, "favicon.png");

  return NextResponse.json({
    logo: fs.existsSync(logoPath) ? `/assets/brand/logo.webp` : null,
    favicon: fs.existsSync(faviconPath) ? `/assets/brand/favicon.png` : null,
  });
}
