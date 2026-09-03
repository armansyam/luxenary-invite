import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { invitationId, guests } = body;

    if (!invitationId || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: "Data tamu tidak valid atau kosong" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = (session.user as any).role === "SUPER_ADMIN" || (session.user as any).isAdmin;
    if (invitation.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda bukan pemilik undangan ini." }, { status: 403 });
    }

    // Limit bulk insert to prevent abuse
    if (guests.length > 500) {
      return NextResponse.json({ error: "Maksimal import adalah 500 tamu sekaligus." }, { status: 400 });
    }

    const createData = guests.map((g: any) => {
      const cleanName = g.name?.trim() || "Tamu Undangan";
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
        "-" +
        crypto.randomBytes(3).toString("hex");

      const qrToken = crypto.randomBytes(8).toString("hex");

      return {
        invitationId,
        name: cleanName,
        slug,
        phone: g.phone || null,
        category: g.category || "UMUM",
        sessionInfo: g.sessionInfo || "Akad & Resepsi",
        guestQuota: Number(g.guestQuota) || 2,
        qrToken,
      };
    });

    // Execute bulk insert
    const result = await prisma.guest.createMany({
      data: createData,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengimpor ${result.count} tamu.` 
    });
  } catch (error: any) {
    console.error("[Guests Bulk POST Error]:", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : (error.message || "Internal server error") }, { status: 500 });
  }
}
