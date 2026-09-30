import { NextRequest, NextResponse } from "next/server";
import { createDatabaseSnapshot, listDatabaseSnapshots, deleteDatabaseSnapshot, inspectBackupPath } from "@/lib/databaseBackup";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

async function denyUnlessDatabaseAdmin() {
  const guard = await requireAdminModule("database");
  return guard.ok ? null : guard.response;
}

export async function GET() {
  try {
    const denied = await denyUnlessDatabaseAdmin();
    if (denied) return denied;

    let backupPathSetting = "./data/backups";
    try {
      const s = await prisma.adminSetting.findUnique({ where: { key: "backup_path" } });
      if (s?.value) backupPathSetting = s.value;
    } catch {}

    const [snapshots, pathInfo] = await Promise.all([
      listDatabaseSnapshots(),
      inspectBackupPath(backupPathSetting),
    ]);

    return NextResponse.json({ success: true, snapshots, pathInfo });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal mengambil daftar snapshot" : (error.message || "Gagal mengambil daftar snapshot") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await denyUnlessDatabaseAdmin();
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));

    // Uji izin akses direktori kustom secara real-time
    if (body.action === "test_path" || body.testPath !== undefined) {
      const pathInfo = await inspectBackupPath(body.testPath);
      return NextResponse.json({ success: true, pathInfo });
    }

    const label = body.label ? String(body.label).replace(/[^a-zA-Z0-9_-]/g, "") : undefined;
    const result = await createDatabaseSnapshot(label);
    return NextResponse.json({
      success: true,
      message: `Snapshot database berhasil dibuat: ${result.filename}`,
      snapshot: result,
    });
  } catch (error: any) {
    console.error("[Database Backup Error]", error);
    return NextResponse.json({ error: error.message || "Gagal membuat snapshot database" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const denied = await denyUnlessDatabaseAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) {
      return NextResponse.json({ error: "Parameter filename wajib diisi" }, { status: 400 });
    }
    await deleteDatabaseSnapshot(filename);
    return NextResponse.json({ success: true, message: `Snapshot ${filename} berhasil dihapus` });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal menghapus snapshot" : (error.message || "Gagal menghapus snapshot") }, { status: 500 });
  }
}
