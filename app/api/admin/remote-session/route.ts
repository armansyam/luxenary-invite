import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/remote-session
 * Mengembalikan status apakah Admin saat ini sedang dalam mode Remote Klien.
 * Dipakai oleh dashboard layout (client component) untuk menampilkan banner.
 */
export async function GET() {
  const session = await auth();

  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  if (!session?.user || !isAdmin) {
    return NextResponse.json({ isRemote: false });
  }

  const cookieStore = await cookies();
  const remoteClientId = cookieStore.get("lux_remote_client_id")?.value;

  if (!remoteClientId) {
    return NextResponse.json({ isRemote: false });
  }

  const clientUser = await prisma.user.findUnique({
    where: { id: remoteClientId },
    select: { name: true, email: true },
  });

  return NextResponse.json({
    isRemote: true,
    clientId: remoteClientId,
    clientName: clientUser?.name || "Klien",
    clientEmail: clientUser?.email || "",
  });
}

/**
 * DELETE /api/admin/remote-session
 * Menghapus cookie remote → Admin kembali ke mode normal.
 */
export async function DELETE() {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  if (!session?.user || !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("lux_remote_client_id");

  return NextResponse.json({ ok: true });
}
