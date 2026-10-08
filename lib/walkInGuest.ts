import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/routeError";

/** Bentuk tamu yang dikembalikan rute scan: tamu beserta data mempelai untuk tampilan hasil check-in. */
const guestWithInvitation = {
  invitation: { select: { id: true, groomName: true, brideName: true } },
} satisfies Prisma.GuestInclude;

function findGuestByName(invitationId: string, name: string) {
  return prisma.guest.findFirst({
    where: { invitationId, name: { equals: name, mode: "insensitive" } },
    include: guestWithInvitation,
  });
}

function slugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Tamu yang namanya tidak ada di daftar klien (mis. tautan dibuat manual lewat ?to=Nama) dicatat sebagai tamu umum.
 * Kategori selalu "UMUM": kategori dari QR tidak dipercaya karena QR dapat dibuat siapa pun yang tahu formatnya.
 * Aman dari balapan: dua perangkat yang memindai nama baru yang sama memakai satu baris yang sama.
 */
export async function findOrCreateWalkInGuest(invitationId: string, name: string) {
  const existing = await findGuestByName(invitationId, name);
  if (existing) return existing;

  const baseSlug = slugFromName(name) || "tamu";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    try {
      return await prisma.guest.create({
        data: {
          invitationId,
          name,
          slug,
          category: "UMUM",
          isTokenRedeemed: false,
          qrToken: `OTS-${invitationId}-${Date.now()}-${randomBytes(3).toString("hex")}`,
        },
        include: guestWithInvitation,
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
      // Bentrok slug atau balapan dengan perangkat lain: bila nama itu sudah dibuat, pakai yang ada.
      const created = await findGuestByName(invitationId, name);
      if (created) return created;
    }
  }
  throw new HttpError(409, "Tamu umum belum dapat dicatat. Coba pindai ulang.");
}

export { guestWithInvitation };
