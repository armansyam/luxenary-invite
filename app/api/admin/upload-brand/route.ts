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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let logo = null;
    let favicon = null;

    if (fs.existsSync(path.join(BRAND_DIR, "logo.webp"))) {
      logo = "/assets/brand/logo.webp";
    }

    if (fs.existsSync(path.join(process.cwd(), "public", "favicon.ico"))) {
      favicon = "/favicon.ico";
    }

    return NextResponse.json({ success: true, logo, favicon });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal memuat status brand" }, { status: 500 });
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

    // Batasi ukuran maksimal 5MB SEBELUM memproses dengan sharp (mencegah memory exhaustion)
    const MAX_BRAND_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.byteLength > MAX_BRAND_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 5MB untuk logo dan favicon." },
        { status: 400 }
      );
    }

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
      // Favicon Multi-Resolution: Otomatis generate seluruh paket resolusi Google Search Central (kelipatan 48px), Apple Touch, dan PWA
      const targets = [
        { dest: path.join(process.cwd(), "public", "favicon.ico"), size: 48 },
        { dest: path.join(BRAND_DIR, "favicon.png"), size: 96 },
        { dest: path.join(BRAND_DIR, "favicon-48x48.png"), size: 48 },
        { dest: path.join(BRAND_DIR, "favicon-96x96.png"), size: 96 },
        { dest: path.join(BRAND_DIR, "favicon-192x192.png"), size: 192 },
        { dest: path.join(BRAND_DIR, "favicon-512x512.png"), size: 512 },
        { dest: path.join(BRAND_DIR, "apple-touch-icon.png"), size: 180 },
        { dest: path.join(process.cwd(), "public", "assets", "brand", "apple-touch-icon.png"), size: 180 },
        { dest: path.join(process.cwd(), "app", "icon.png"), size: 96 },
        { dest: path.join(process.cwd(), "app", "apple-icon.png"), size: 180 },
      ];

      for (const t of targets) {
        try {
          await sharp(buffer)
            .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
            .toFile(t.dest);
        } catch (genErr) {
          console.error(`[Upload Favicon Variant Error] ${t.dest}:`, genErr);
        }
      }

      return NextResponse.json({
        success: true,
        type: "favicon",
        url: "/favicon.ico",
        message: "Favicon berhasil diupload dan otomatis di-generate ke seluruh ukuran standar Google Search (48px, 96px, 192px, 512px)",
      });
    }

    return NextResponse.json({ error: "Tipe brand tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("[Upload Brand Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal mengupload file brand" : (error.message || "Gagal mengupload file brand") }, { status: 500 });
  }
}
