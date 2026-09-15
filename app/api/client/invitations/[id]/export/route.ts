import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: invitationId } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "wishes"; // "wishes" | "guests"

    // Verifikasi kepemilikan undangan
    const currentUserId = (session.user as any).id;
    const currentUserEmail = session.user.email;

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        OR: [
          ...(currentUserId ? [{ userId: currentUserId }] : []),
          ...(currentUserEmail ? [{ user: { email: currentUserEmail } }] : []),
        ],
      },
      select: {
        id: true,
        groomNickname: true,
        brideNickname: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan atau akses ditolak" }, { status: 404 });
    }

    const couplePrefix = `${invitation.groomNickname || "Mempelai"}-${invitation.brideNickname || "Mempelai"}`;

    if (type === "wishes") {
      const rsvps = await prisma.rsvp.findMany({
        where: { invitationId },
        orderBy: { respondedAt: "desc" },
      });

      let csv = "No,Nama Tamu,Konfirmasi Kehadiran,Jumlah Pax,Ucapan & Doa Restu,Waktu Kirim\n";
      rsvps.forEach((r, idx) => {
        const cleanName = `"${(r.guestName || "").replace(/"/g, '""')}"`;
        const cleanStatus = `"${(r.status || "").replace(/"/g, '""')}"`;
        const pax = r.guestCount || 1;
        const cleanMessage = `"${(r.message || "").replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
        const dateStr = `"${new Date(r.respondedAt).toLocaleString("id-ID")}"`;
        csv += `${idx + 1},${cleanName},${cleanStatus},${pax},${cleanMessage},${dateStr}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Rekap-Doa-Tamu-${couplePrefix}.csv"`,
        },
      });
    }

    if (type === "guests") {
      const guests = await prisma.guest.findMany({
        where: { invitationId },
        orderBy: { name: "asc" },
      });

      let csv = "No,Nama Tamu,Kategori,Nomor WhatsApp,Meja,Status Check-in,Jumlah Kuota\n";
      guests.forEach((g, idx) => {
        const cleanName = `"${(g.name || "").replace(/"/g, '""')}"`;
        const cleanCategory = `"${(g.category || "-").replace(/"/g, '""')}"`;
        const phone = `"${(g.phone || "-").replace(/"/g, '""')}"`;
        const table = `"${(g.tableNumber || "-").replace(/"/g, '""')}"`;
        const checkinStatus = g.isTokenRedeemed ? "Hadir (Checked-In)" : "Belum Check-in";
        const quota = g.guestQuota || 1;
        csv += `${idx + 1},${cleanName},${cleanCategory},${phone},${table},"${checkinStatus}",${quota}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Rekap-Kehadiran-Tamu-${couplePrefix}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Tipe ekspor tidak valid" }, { status: 400 });
  } catch (error: any) {
    console.error("[Export Error]", error);
    return NextResponse.json({ error: "Gagal mengekspor data" }, { status: 500 });
  }
}
