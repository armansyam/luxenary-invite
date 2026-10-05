"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { adminActorId } from "@/lib/adminAuth";

/**
 * Memulai sesi Remote: Admin memasang "kacamata" Klien.
 * Berjalan murni di server → cookie ditulis sebelum redirect → middleware pasti membacanya.
 */
export async function startRemoteSession(clientId: string) {
  // Server action dapat dipanggil langsung tanpa melewati UI, jadi izin modul diperiksa di sini.
  // Titik masuk impersonasi ada di tab Klien (users) dan tab Projek Undangan (invitations).
  const session = await auth();
  const permitted =
    session?.user && (hasAdminPermission(session.user, "users") || hasAdminPermission(session.user, "invitations"));
  if (!session?.user || !permitted) {
    throw new Error("Unauthorized: Akun Anda tidak berhak memulai sesi remote.");
  }

  // Verifikasi klien benar-benar ada di database
  const clientUser = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true },
  });
  if (!clientUser) throw new Error("Klien tidak ditemukan di database.");

  // Selama sesi remote, session.user.id adalah ID klien; pelaku sebenarnya ada di originalAdminId.
  await prisma.adminAuditLog.create({
    data: {
      adminId: adminActorId(session),
      action: "REMOTE_SESSION_START",
      details: `Masuk ke dasbor klien ${clientUser.email} (${clientUser.id})`,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("lux_remote_client_id", clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 jam
  });

  redirect("/dashboard");
}

/**
 * Menghentikan sesi Remote: Hapus cookie dan pulangkan Admin.
 */
export async function stopRemoteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("lux_remote_client_id");
  redirect("/admin");
}
