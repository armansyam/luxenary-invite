import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readFormBody } from "@/lib/requestBody";
import {
  THEME_ASSET_DIR,
  THEME_ASSET_URL_PREFIX,
  assetUsage,
  builtinOrnamentGroups,
  recordBuilderAudit,
  uploadedAssets,
} from "@/lib/themeBuilder/server";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_EDGE = 1800;
const MAX_INPUT_PIXELS = 50_000_000;

export async function GET() {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    return NextResponse.json({ success: true, uploads: await uploadedAssets(), builtin: builtinOrnamentGroups() });
  } catch (error) {
    return routeError("ThemeBuilderAssets", error);
  }
}

/**
 * Unggah gambar ke pustaka bersama (ornamen, bingkai, tekstur latar, media bawaan). Jenis berkas ditentukan dari isinya (PNG atau WebP, tanpa SVG yang dapat membawa
 * skrip), diperkecil, dan disimpan sebagai WebP bernama hash isi di public/uploads/theme-assets/ (di luar git). Nama
 * hash membuat berkas tidak pernah ditimpa, karena undangan klien yang sudah terbit menautkan URL ini.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const form = await readFormBody(req);
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "Pilih berkas gambar ornamen." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Ukuran ornamen maksimal 6 MB." }, { status: 413 });

    const input = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(input);
    if (!detected || !["image/png", "image/webp", "image/jpeg"].includes(detected.mime)) {
      return NextResponse.json({ error: "Gambar harus PNG, WebP, atau JPEG." }, { status: 415 });
    }

    // PNG kecil bisa mengembang menjadi ratusan megapiksel saat didekode; di server 2 GB itu cukup untuk mematikan proses.
    let output: Buffer;
    try {
      output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer();
    } catch (err) {
      if (err instanceof Error && /pixel limit/i.test(err.message)) {
        return NextResponse.json({ error: "Resolusi gambar terlalu besar (maksimal 50 megapiksel, mis. 7000 x 7000)." }, { status: 413 });
      }
      throw err;
    }
    const name = `${crypto.createHash("sha256").update(output).digest("hex").slice(0, 24)}.webp`;

    await fs.promises.mkdir(THEME_ASSET_DIR, { recursive: true });
    const target = path.join(/*turbopackIgnore: true*/ THEME_ASSET_DIR, name);
    if (!fs.existsSync(target)) await fs.promises.writeFile(target, output);

    const opaque = !(await sharp(output).metadata()).hasAlpha;
    await recordBuilderAudit(req, guard.session, "THEME_ASSET_UPLOAD", `Mengunggah gambar pustaka builder ${name} (${output.length} byte)`);
    return NextResponse.json({ success: true, url: `${THEME_ASSET_URL_PREFIX}${name}`, size: output.length, opaque });
  } catch (error) {
    return routeError("ThemeBuilderAssets", error);
  }
}

/** Hapus ornamen unggahan hanya bila tidak ada tema, salinan undangan, HTML terbit, atau demo yang masih menautnya. */
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const url = new URL(req.url).searchParams.get("url") || "";
    const match = url.match(/^\/uploads\/theme-assets\/([a-f0-9]{24}\.(?:webp|png))$/);
    if (!match) return NextResponse.json({ error: "Hanya ornamen unggahan yang dapat dihapus." }, { status: 400 });

    const usage = await assetUsage(url);
    if (usage.length) {
      return NextResponse.json({ error: "Ornamen masih dipakai dan tidak dapat dihapus.", usage }, { status: 409 });
    }
    await fs.promises.rm(path.join(/*turbopackIgnore: true*/ THEME_ASSET_DIR, match[1]), { force: true });
    await recordBuilderAudit(req, guard.session, "THEME_ASSET_DELETE", `Menghapus gambar pustaka builder ${match[1]}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("ThemeBuilderAssets", error);
  }
}
