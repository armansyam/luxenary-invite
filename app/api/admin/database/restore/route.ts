import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getBackupDirectory, restoreDatabaseSnapshot, getActiveDbPath, createDatabaseSnapshot } from "@/lib/databaseBackup";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
  if (!session?.user || !isAdmin) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // ── Kasus A: Upload file .db baru lalu langsung restore ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File snapshot database (.db) wajib diunggah" }, { status: 400 });
      }

      if (!file.name.endsWith(".db") && !file.name.endsWith(".sqlite")) {
        return NextResponse.json({ error: "Format file harus .db atau .sqlite" }, { status: 400 });
      }

      let backupPathSetting: string | undefined;
      try {
        const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
        if (s?.value) backupPathSetting = s.value;
      } catch {}

      const backupDir = await getBackupDirectory(backupPathSetting);
      const uploadedFilename = `uploaded_${Date.now()}_${path.basename(file.name)}`;
      const uploadedPath = path.join(backupDir, uploadedFilename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(uploadedPath, buffer);

      // Jalankan restore dari file yang diupload (sudah termasuk automatic safety backup)
      const result = await restoreDatabaseSnapshot(uploadedFilename);

      return NextResponse.json({
        success: true,
        message: `Database berhasil direstore dari file upload: ${file.name}`,
        safetySnapshot: result.safetySnapshot,
        restoredFrom: uploadedFilename,
      });
    }

    // ── Kasus B: Restore dari snapshot lokal yang sudah ada di list ──
    const body = await req.json().catch(() => ({}));
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ error: "Parameter filename snapshot wajib diisi" }, { status: 400 });
    }

    const result = await restoreDatabaseSnapshot(filename);

    return NextResponse.json({
      success: true,
      message: `Database berhasil direstore ke snapshot: ${filename}`,
      safetySnapshot: result.safetySnapshot,
      restoredFrom: filename,
    });
  } catch (error: any) {
    console.error("[Database Restore Error]", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan restore database" },
      { status: 500 }
    );
  }
}
