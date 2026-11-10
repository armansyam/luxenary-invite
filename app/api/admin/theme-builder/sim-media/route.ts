import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readFormBody } from "@/lib/requestBody";
import { SIM_MEDIA_URL_PREFIX } from "@/lib/themeBuilder/simSlots";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2000;
const MAX_INPUT_PIXELS = 50_000_000;
const SIM_MEDIA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "builder-sim");

/**
 * Foto simulasi pratinjau builder (lib/themeBuilder/simSlots.ts). Jenis berkas ditentukan dari isinya, gambar diperkecil
 * ke WebP bernama hash isinya. Berkas sementara: tidak dirujuk tema mana pun dan dihapus cron pembersihan.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const form = await readFormBody(req);
    const file = form.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "Pilih foto simulasi." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Ukuran foto maksimal 12 MB." }, { status: 413 });

    const input = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(input);
    if (!detected || !["image/png", "image/webp", "image/jpeg"].includes(detected.mime)) {
      return NextResponse.json({ error: "Foto harus PNG, WebP, atau JPEG." }, { status: 415 });
    }

    let output: Buffer;
    try {
      output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (err) {
      if (err instanceof Error && /pixel limit/i.test(err.message)) {
        return NextResponse.json({ error: "Resolusi foto terlalu besar (maksimal 50 megapiksel)." }, { status: 413 });
      }
      throw err;
    }
    const name = `${crypto.createHash("sha256").update(output).digest("hex").slice(0, 24)}.webp`;
    await fs.promises.mkdir(SIM_MEDIA_DIR, { recursive: true });
    const target = path.join(/*turbopackIgnore: true*/ SIM_MEDIA_DIR, name);
    // Unggah ulang foto yang sama memperbarui umurnya sehingga tidak terhapus cron saat masih dipakai.
    if (fs.existsSync(target)) await fs.promises.utimes(target, new Date(), new Date());
    else await fs.promises.writeFile(target, output);
    const meta = await sharp(output).metadata();
    return NextResponse.json({ success: true, url: `${SIM_MEDIA_URL_PREFIX}${name}`, width: meta.width, height: meta.height });
  } catch (error) {
    return routeError("ThemeBuilderSimMedia", error);
  }
}
