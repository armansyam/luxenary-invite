import { prisma } from "@/lib/prisma";

export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const cleanSub = profile.sub.trim();
  const cleanEmail = profile.email.trim().toLowerCase();
  const cleanName = (profile.name || "").trim() || cleanEmail.split("@")[0] || "Pengguna";
  const { picture } = profile;

  // 1. Cek apakah user sudah terdaftar berdasarkan googleId
  let user = await prisma.user.findUnique({ where: { googleId: cleanSub } });
  if (user) {
    const emailChanged = user.email.toLowerCase() !== cleanEmail;
    const emailTaken = emailChanged
      ? await prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" }, NOT: { id: user.id } },
          select: { id: true },
        })
      : null;
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(emailTaken ? {} : { email: cleanEmail }),
        name: user.name || cleanName,
        avatarUrl: picture ?? user.avatarUrl,
      },
    });
  }

  // 2. Cek apakah user sudah terdaftar berdasarkan email (case-insensitive untuk akun lama)
  user = await prisma.user.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
  });
  if (user) {
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: cleanSub,
        email: cleanEmail,
        name: user.name || cleanName,
        avatarUrl: picture ?? user.avatarUrl,
      },
    });
  }

  // 3. Buat akun Klien baru jika belum ada sama sekali
  return await prisma.user.create({
    data: {
      googleId: cleanSub,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: picture,
      role: "CLIENT",
    },
  });
}