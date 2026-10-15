import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

const RECEIPTS_DIR = path.join(process.cwd(), "public", "uploads", "finance", "receipts");

async function ensureReceiptsDir() {
  try {
    await fs.promises.access(RECEIPTS_DIR);
  } catch {
    await fs.promises.mkdir(RECEIPTS_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    await ensureReceiptsDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File struk/nota wajib disertakan." }, { status: 400 });
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal adalah 5MB." }, { status: 400 });
    }

    // Tipe dan ekstensi ditentukan dari isi berkas, bukan dari nama atau tipe kiriman browser: berkas disajikan dari
    // domain utama menurut ekstensinya, dan .svg/.html di sana dapat menjalankan skrip di sesi admin yang membukanya.
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);
    const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
    const ext = detected ? allowedTypes[detected.mime] : undefined;
    if (!ext) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah format JPG, PNG, WEBP, atau PDF." },
        { status: 400 }
      );
    }
    const uniqueFileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(RECEIPTS_DIR, uniqueFileName);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/finance/receipts/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    return routeError("UploadReceipt", err, "Gagal mengunggah file struk");
  }
}
