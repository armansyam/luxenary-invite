import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";
import { createDatabaseSnapshot } from "@/lib/databaseBackup";

export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Menggunakan timingSafeEqual untuk mencegah timing attack dari internet
  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`;
    const isTimingSafe =
      authHeader.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
    if (isTimingSafe) return true;
  }
  
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  return isAdmin;
}

export async function GET(req: NextRequest) {
  return handleBackupRequest(req);
}

export async function POST(req: NextRequest) {
  return handleBackupRequest(req);
}

async function handleBackupRequest(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET / Admin session" }, { status: 401 });
    }

    // 1. Cek apakah fitur auto-backup diaktifkan
    const autoSetting = await prisma.adminSetting.findUnique({ where: { key: "backup_auto_enabled" } });
    const isEnabled = autoSetting?.value === "true";

    if (!isEnabled) {
      return NextResponse.json({ success: false, message: "Auto-backup sedang dinonaktifkan di pengaturan." });
    }

    // 2. Buat snapshot terjadwal
    const result = await createDatabaseSnapshot("auto_daily");

    return NextResponse.json({
      success: true,
      message: "Auto-backup berhasil dijalankan.",
      snapshot: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal menjalankan auto-backup" : (error.message || "Gagal menjalankan auto-backup") }, { status: 500 });
  }
}
