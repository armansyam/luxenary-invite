import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getBackupDirectory, readBackupPathSetting } from "@/lib/databaseBackup";
import { requireAdminModule } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("database");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename wajib diisi" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    
    const backupDir = await getBackupDirectory(await readBackupPathSetting());
    const filePath = path.join(backupDir, safeFilename);

    // Path Traversal Protection: pastikan filePath berada di dalam backupDir
    const resolvedBackupDir = path.resolve(backupDir);
    const resolvedFilePath = path.resolve(filePath);
    if (!resolvedFilePath.startsWith(resolvedBackupDir + path.sep) && resolvedFilePath !== resolvedBackupDir) {
      return NextResponse.json({ error: "Akses file tidak diizinkan" }, { status: 403 });
    }

    try {
      await fs.promises.access(filePath);
    } catch {
      return NextResponse.json({ error: "File snapshot tidak ditemukan" }, { status: 404 });
    }


    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal mengunduh file snapshot" : (error.message || "Gagal mengunduh file snapshot") }, { status: 500 });
  }
}
