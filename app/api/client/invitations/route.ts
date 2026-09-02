import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      invitationSlug: true,
      groomSlug: true,
      brideSlug: true,
      groomName: true,
      brideName: true,
      groomNickname: true,
      brideNickname: true,
      themeId: true,
      status: true,
      subdomain: true,
      eventData: true,
      // staffPin: SENGAJA tidak dimasukkan di list API — gunakan GET /api/client/invitations/[id] untuk akses PIN
      customDomain: true,
      createdAt: true,
      order: {
        select: { planType: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });


  return NextResponse.json(invitations);
}
