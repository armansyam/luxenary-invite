import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getBackupDirectory, readBackupPathSetting, restoreDatabaseSnapshot, isSnapshotFile } from "@/lib/databaseBackup";

import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

async function denyUnlessDatabaseAdmin() {
  const guard = await requireAdminModule("database");
  return guard.ok ? null : guard.response;
}

export async function POST(req: NextRequest) {
  try {
    const denied = await denyUnlessDatabaseAdmin();
    if (denied) return denied;

    const contentType = req.headers.get("content-type") || "";

    // ── Kasus A: Upload file .db baru lalu langsung restore ──
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File backup PostgreSQL (.dump, .sql, atau .backup) wajib diunggah" }, { status: 400 });
      }

      if (!isSnapshotFile(file.name)) {
        return NextResponse.json({ error: "Format file harus .dump, .sql, atau .backup" }, { status: 400 });
      }

      const backupDir = await getBackupDirectory(await readBackupPathSetting());
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
  } catch (error) {
    return routeError("DatabaseRestore", error, "Gagal melakukan restore database");
  }
}
