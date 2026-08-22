import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    select: {
      id: true,
      groomName: true,
      brideName: true,
      groomNickname: true,
      brideNickname: true,
      groomParents: true,
      brideParents: true,
      groomInstagram: true,
      brideInstagram: true,
      openingQuote: true,
      openingQuoteRef: true,
      themeId: true,
      status: true,
      featureSettings: true,
      subdomain: true,
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(invitation);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.invitation.update({
    where: { id },
    data: {
      groomNickname: body.groomNickname,
      brideNickname: body.brideNickname,
      groomParents: body.groomParents,
      brideParents: body.brideParents,
      groomInstagram: body.groomInstagram,
      brideInstagram: body.brideInstagram,
      openingQuote: body.openingQuote,
      openingQuoteRef: body.openingQuoteRef,
      featureSettings: body.featureSettings,
    },
  });

  return NextResponse.json(updated);
}