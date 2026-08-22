import { prisma } from "@/lib/prisma";

export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const { sub, email, name, picture } = profile;
  return await prisma.user.upsert({
    where: { googleId: sub },
    update: { email, name, avatarUrl: picture },
    create: {
      googleId: sub,
      email,
      name,
      avatarUrl: picture,
      role: "CLIENT",
    },
  });
}