import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getBackupDirectory } from "@/lib/databaseBackup";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename wajib diisi" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    
    let backupPathSetting: string | undefined;
    try {
      const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
      if (s?.value) backupPathSetting = s.value;
    } catch {}

    const backupDir = getBackupDirectory(backupPathSetting);
    const filePath = path.join(backupDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File snapshot tidak ditemukan" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal download snapshot" }, { status: 500 });
  }
}
