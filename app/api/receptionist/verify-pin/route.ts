import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { invitationId, pin } = await req.json();

    if (!invitationId || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { staffPin: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    if (invitation.staffPin !== pin) {
      return NextResponse.json({ error: "PIN tidak valid" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "PIN valid",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memverifikasi PIN" }, { status: 500 });
  }
}
