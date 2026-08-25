import { prisma } from "@/lib/prisma";

export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const { sub, email, name, picture } = profile;

  // 1. Cek apakah user sudah terdaftar berdasarkan googleId
  let user = await prisma.user.findUnique({ where: { googleId: sub } });
  if (user) {
    return await prisma.user.update({
      where: { id: user.id },
      data: { email, name, avatarUrl: picture },
    });
  }

  // 2. Cek apakah user sudah dibuat saat checkout awal berdasarkan email
  user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    return await prisma.user.update({
      where: { id: user.id },
      data: { googleId: sub, name: name || user.name, avatarUrl: picture },
    });
  }

  // 3. Buat akun Klien baru jika belum ada sama sekali
  return await prisma.user.create({
    data: {
      googleId: sub,
      email,
      name,
      avatarUrl: picture,
      role: "CLIENT",
    },
  });
}