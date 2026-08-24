import { NextRequest, NextResponse } from "next/server";
import { createDatabaseSnapshot, listDatabaseSnapshots, deleteDatabaseSnapshot } from "@/lib/databaseBackup";

export async function GET() {
  try {
    const snapshots = await listDatabaseSnapshots();
    return NextResponse.json({ success: true, snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengambil daftar snapshot" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const label = body.label ? String(body.label).replace(/[^a-zA-Z0-9_-]/g, "") : undefined;
    const result = await createDatabaseSnapshot(label);
    return NextResponse.json({
      success: true,
      message: `Snapshot database berhasil dibuat: ${result.filename}`,
      snapshot: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat snapshot database" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) {
      return NextResponse.json({ error: "Parameter filename wajib diisi" }, { status: 400 });
    }
    await deleteDatabaseSnapshot(filename);
    return NextResponse.json({ success: true, message: `Snapshot ${filename} berhasil dihapus` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menghapus snapshot" }, { status: 500 });
  }
}
