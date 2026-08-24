import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDatabaseSnapshot } from "@/lib/databaseBackup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json({ error: error.message || "Gagal menjalankan auto-backup" }, { status: 500 });
  }
}
