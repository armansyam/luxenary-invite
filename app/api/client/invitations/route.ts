import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession();
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
      themeId: true,
      status: true,
      subdomain: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}
