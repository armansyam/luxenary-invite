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
      select: { userId: true, eventData: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = (session.user as any).role === "SUPER_ADMIN" || (session.user as any).isAdmin || (session.user as any).role === "ADMIN";
    if (invitation.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda bukan pemilik undangan ini." }, { status: 403 });
    }

    // D-Day Lock Backend Validation berdasarkan Sesi Acara Utama
    if (invitation.eventData) {
      try {
        const ev = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        if (ev && ev.length > 0) {
          const primaryEv = ev.find((e: any) => e.isPrimary) || ev[0];
          const eventDateStr = primaryEv?.date;
          if (eventDateStr) {
            const eventDate = new Date(eventDateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            if (today >= eventDate) {
              return NextResponse.json(
                { error: "Daftar tamu sudah dikunci karena acara sedang/telah berlangsung. Tamu tambahan hanya dapat diinput oleh Resepsionis di lokasi." },
                { status: 403 }
              );
            }
          }
        }
      } catch (e) {
        console.error("[guests bulk POST] Error parsing eventData:", e);
      }
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
        tableNumber: g.tableNumber ? String(g.tableNumber).trim() : null,
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
