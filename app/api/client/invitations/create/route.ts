import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { groomName, brideName, invitationName, themeId, planType } = body;

  if (!groomName || !brideName) {
    return NextResponse.json({ error: "Missing groom or bride name" }, { status: 400 });
  }

  const groomSlug = slugify(groomName);
  const brideSlug = slugify(brideName);
  const invitationSlug = slugify(invitationName || "reception");

  // Check uniqueness
  const existing = await prisma.invitation.findUnique({
    where: { groomSlug_brideSlug_invitationSlug: { groomSlug, brideSlug, invitationSlug } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "URL undangan sudah ada. Gunakan nama undangan yang berbeda." },
      { status: 409 }
    );
  }

  const invitation = await prisma.invitation.create({
    data: {
      userId: user.id,
      groomName,
      brideName,
      groomSlug,
      brideSlug,
      invitationSlug,
      themeId: themeId || "moody-papercut",
      status: "DRAFT",
      subdomain: planType === "PREMIUM" ? `${groomSlug}-${brideSlug}` : null,
    },
  });

  return NextResponse.json({ invitationId: invitation.id });
}