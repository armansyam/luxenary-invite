import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession, requireAnyAdmin } from "@/lib/adminAuth";
import { cookies } from "next/headers";
import { REMOTE_COOKIE_NAME } from "@/lib/remoteSession";

/**
 * GET /api/admin/remote-session
 * Mengembalikan status apakah Admin saat ini sedang dalam mode Remote Klien.
 * Dipakai oleh dashboard layout (client component) untuk menampilkan banner.
 */
export async function GET() {
  const session = await auth();

  // Sesi remote ditetapkan callback session (auth.ts) setelah cookie diverifikasi; di sini cukup dibaca hasilnya.
  if (!session?.user || !isAdminSession(session) || session.user.isRemote !== true) {
    return NextResponse.json({ isRemote: false });
  }

  return NextResponse.json({
    isRemote: true,
    clientId: session.user.id,
    clientName: session.user.name || "Klien",
    clientEmail: session.user.email || "",
  });
}

/**
 * DELETE /api/admin/remote-session
 * Menghapus cookie remote → Admin kembali ke mode normal.
 */
export async function DELETE() {
  const guard = await requireAnyAdmin();
  if (!guard.ok) return guard.response;

  const cookieStore = await cookies();
  cookieStore.delete(REMOTE_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
