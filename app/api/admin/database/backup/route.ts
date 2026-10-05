import { NextRequest, NextResponse } from "next/server";
import { createDatabaseSnapshot, listDatabaseSnapshots, deleteDatabaseSnapshot, inspectBackupPath, readBackupPathSetting } from "@/lib/databaseBackup";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

async function denyUnlessDatabaseAdmin() {
  const guard = await requireAdminModule("database");
  return guard.ok ? null : guard.response;
}

export async function GET() {
  try {
    const denied = await denyUnlessDatabaseAdmin();
    if (denied) return denied;

    const backupPathSetting = (await readBackupPathSetting()) ?? "./data/backups";

    const [snapshots, pathInfo] = await Promise.all([
      listDatabaseSnapshots(),
      inspectBackupPath(backupPathSetting),
    ]);

    return NextResponse.json({ success: true, snapshots, pathInfo });
  } catch (error) {
    return routeError("DatabaseBackup", error, "Gagal mengambil daftar snapshot");
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
  } catch (error) {
    return routeError("DatabaseBackup", error, "Gagal membuat snapshot database");
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
  } catch (error) {
    return routeError("DatabaseBackup", error, "Gagal menghapus snapshot");
  }
}
