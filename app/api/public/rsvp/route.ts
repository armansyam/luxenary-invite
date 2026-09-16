import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    // Rate limit: 30 req/menit untuk mencegah scraping massal data tamu
    if (!rateLimit(ip, 30, 60000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan coba lagi sebentar." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    if (invitationId.startsWith("demo-") || invitationId === "demo") {
      const sampleDemos = [
        {
          id: "demo-rsvp-1",
          guestName: "Budi Santoso",
          status: "hadir",
          guestCount: 2,
          message: "Selamat menempuh hidup baru! Semoga rukun dan bahagia selalu.",
          respondedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "demo-rsvp-2",
          guestName: "Sahabat SMA (Dimas)",
          status: "hadir",
          guestCount: 2,
          message: "Happy wedding brother! Lancar dan berkah acaranya sampai selesai 🎉",
          respondedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      return NextResponse.json({ success: true, rsvps: sampleDemos, isDemo: true });
    }

    const rsvps = await prisma.rsvp.findMany({
      where: { invitationId },
      orderBy: { respondedAt: "desc" },
      take: 50,
      select: {
        id: true,
        guestName: true,
        status: true,
        guestCount: true,
        message: true,
        respondedAt: true,
      },
    });

    return NextResponse.json({ success: true, rsvps });
  } catch (error: any) {
    const msg = process.env.NODE_ENV === "production" ? "Failed to fetch RSVPs" : (error.message || "Failed to fetch RSVPs");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    // Limit: 10 request RSVP per menit (60000ms) untuk mencegah spam buku tamu
    if (!rateLimit(ip, 10, 60000)) {
      return NextResponse.json({ error: "Terlalu banyak pengiriman RSVP. Silakan coba lagi sebentar." }, { status: 429 });
    }

    const body = await req.json();
    const { invitationId, guestName, status, guestCount, message, phone } = body;

    if (!invitationId || !guestName || !status) {
      return NextResponse.json(
        { error: "invitationId, guestName, and status (hadir/tidak) are required" },
        { status: 400 }
      );
    }

    // Demo mode: Return instant simulated success for showroom/sandbox invitations without DB entry
    if (invitationId.startsWith("demo-") || invitationId === "demo") {
      return NextResponse.json({
        success: true,
        isDemo: true,
        message: "Konfirmasi kehadiran & doa restu berhasil dikirim! (Mode Demo)",
        rsvp: {
          id: `demo-rsvp-${Date.now()}`,
          guestName,
          status,
          guestCount: Number(guestCount) || 1,
          message: message || "",
          respondedAt: new Date().toISOString(),
        },
      });
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status === "EVENT_FINISHED" || invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN") {
      return NextResponse.json({ error: "Masa pengisian buku tamu / RSVP untuk acara ini telah ditutup." }, { status: 410 });
    }

    const cleanGuestName = String(guestName).trim();

    // Find matching guest record if already invited, but DO NOT auto-create new guest
    const matchingGuest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: { equals: cleanGuestName, mode: "insensitive" },
      },
    });

    // Find existing RSVP or create new to prevent duplication
    const existingRsvp = matchingGuest
      ? await prisma.rsvp.findFirst({ where: { invitationId, guestId: matchingGuest.id } })
      : await prisma.rsvp.findFirst({ where: { invitationId, guestName: { equals: cleanGuestName, mode: "insensitive" } } });

    let rsvp;
    if (existingRsvp) {
      rsvp = await prisma.rsvp.update({
        where: { id: existingRsvp.id },
        data: {
          status,
          guestCount: Number(guestCount) || 1,
          message: message || null,
          respondedAt: new Date(),
        },
      });
    } else {
      rsvp = await prisma.rsvp.create({
        data: {
          invitationId,
          guestId: matchingGuest ? matchingGuest.id : null,
          guestName,
          status,
          guestCount: Number(guestCount) || 1,
          message: message || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "RSVP berhasil dikirim. Terima kasih atas konfirmasinya!",
      rsvp,
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal mengirim RSVP" : (error.message || "Gagal mengirim RSVP") }, { status: 500 });
  }
}
