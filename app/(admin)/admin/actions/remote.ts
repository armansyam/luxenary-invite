"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Memulai sesi Remote: Admin memasang "kacamata" Klien.
 * Berjalan murni di server → cookie ditulis sebelum redirect → middleware pasti membacanya.
 */
export async function startRemoteSession(clientId: string) {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "SUPER_ADMIN";

  if (!session?.user || !isAdmin) {
    throw new Error("Unauthorized: Hanya Admin yang bisa memulai sesi remote.");
  }

  // Verifikasi klien benar-benar ada di database
  const clientUser = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true },
  });
  if (!clientUser) throw new Error("Klien tidak ditemukan di database.");

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
