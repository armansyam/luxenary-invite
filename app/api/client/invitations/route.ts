import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let invitations = await prisma.invitation.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      invitationSlug: true,
      groomSlug: true,
      brideSlug: true,
      groomName: true,
      brideName: true,
      themeId: true,
      status: true,
      subdomain: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Auto-provision initial invitation if client doesn't have one yet
  if (invitations.length === 0) {
    const rawName = user.name || "Mempelai";
    const nameParts = rawName.split(/[&,+/]|\bdan\b/i).map((s) => s.trim()).filter(Boolean);
    const groom = nameParts[0] || "Didan";
    const bride = nameParts[1] || "Nasha";
    const groomSlug = groom.toLowerCase().replace(/[^a-z0-9]/g, "") || "didan";
    const brideSlug = bride.toLowerCase().replace(/[^a-z0-9]/g, "") || "nasha";
    const baseSubdomain = `${groomSlug}-${brideSlug}`;

    // Ensure unique subdomain
    let subdomain = baseSubdomain;
    const existingSub = await prisma.invitation.findUnique({ where: { subdomain } });
    if (existingSub) {
      subdomain = `${baseSubdomain}-${Date.now().toString().slice(-4)}`;
    }

    const newInv = await prisma.invitation.create({
      data: {
        userId: user.id,
        groomName: groom,
        brideName: bride,
        groomSlug,
        brideSlug,
        invitationSlug: "wedding",
        themeId: "kila",
        status: "DRAFT",
        subdomain,
      },
      select: {
        id: true,
        invitationSlug: true,
        groomSlug: true,
        brideSlug: true,
        groomName: true,
        brideName: true,
        themeId: true,
        status: true,
        subdomain: true,
        createdAt: true,
      },
    });

    invitations = [newInv];
  }

  return NextResponse.json(invitations);
}
