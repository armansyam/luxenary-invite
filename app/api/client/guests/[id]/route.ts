import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guests = await prisma.guest.findMany({
    where: { invitationId: id },
    include: { rsvp: true },
  });

  return NextResponse.json(guests);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const guest = await prisma.guest.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(guest);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.guest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}