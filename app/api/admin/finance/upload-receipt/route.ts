import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { requireAdminModule } from "@/lib/adminAuth";
import { uploadPrivateFile } from "@/lib/storage";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/** Struk berisi data rekening dan nominal: disimpan privat dan hanya dibuka lewat `/api/admin/finance/expenses/[id]/receipt`. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File struk/nota wajib disertakan." }, { status: 400 });
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal adalah 5MB." }, { status: 400 });
    }

    // Tipe dan ekstensi ditentukan dari isi berkas, bukan dari nama atau tipe kiriman browser: berkas disajikan menurut
    // ekstensinya, dan .svg/.html dapat menjalankan skrip di sesi admin yang membukanya.
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
    const ref = await uploadPrivateFile(buffer, `receipts/${uniqueFileName}`, detected!.mime);

    return NextResponse.json({
      success: true,
      ref,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    return routeError("UploadReceipt", err, "Gagal mengunggah file struk");
  }
}
