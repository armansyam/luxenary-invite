"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { adminActorId } from "@/lib/adminAuth";
import { REMOTE_COOKIE_NAME, REMOTE_SESSION_TTL_SECONDS, createRemoteCookieValue } from "@/lib/remoteSession";

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
  cookieStore.set(REMOTE_COOKIE_NAME, createRemoteCookieValue(clientUser.id, adminActorId(session)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REMOTE_SESSION_TTL_SECONDS,
  });

  redirect("/dashboard");
}
