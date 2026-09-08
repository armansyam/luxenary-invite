import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { auth } from "@/auth";

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
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      role === "FINANCE";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator Finance." }, { status: 401 });
    }

    await ensureReceiptsDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File struk/nota wajib disertakan." }, { status: 400 });
    }

    // Validasi tipe file (gambar atau pdf)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah format JPG, PNG, WEBP, atau PDF." },
        { status: 400 }
      );
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal adalah 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "application/pdf" ? "pdf" : "jpg");
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
  } catch (err: any) {
    console.error("Upload receipt error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengunggah file struk" }, { status: 500 });
  }
}
