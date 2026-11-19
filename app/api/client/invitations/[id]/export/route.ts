import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { routeError } from "@/lib/routeError";
import { csvCell } from "@/lib/csv";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";

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
    const currentUserId = session.user.id;
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
        invitationSlug: true,
        featureSettings: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan atau akses ditolak" }, { status: 404 });
    }

    const couplePrefix = invitation.invitationSlug;

    if (type === "wishes") {
      const rsvps = await prisma.rsvp.findMany({
        where: { invitationId },
        orderBy: { respondedAt: "desc" },
      });

      let csv = "No,Nama Tamu,Konfirmasi Kehadiran,Jumlah Pax,Ucapan & Doa Restu,Status Tampil,Balasan Tuan Rumah,Waktu Balas,Waktu Kirim\n";
      rsvps.forEach((r, idx) => {
        const pax = r.guestCount || 1;
        const message = (r.message || "").replace(/\r?\n/g, " ");
        const visibility = r.isHidden ? "Disembunyikan" : "Tampil";
        const reply = (r.replyMessage || "").replace(/\r?\n/g, " ");
        const replyDate = r.repliedAt ? new Date(r.repliedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-";
        const dateStr = new Date(r.respondedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        csv += `${idx + 1},${csvCell(r.guestName)},${csvCell(r.status)},${pax},${csvCell(message)},${csvCell(visibility)},${csvCell(reply || "-")},${csvCell(replyDate)},${csvCell(dateStr)}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Rekap-Doa-Tamu-${couplePrefix}.csv"`,
        },
      });
    }

    if (type === "guests") {
      const [guests, openedRows] = await Promise.all([
        prisma.guest.findMany({
          where: { invitationId },
          orderBy: { name: "asc" },
        }),
        prisma.$queryRaw<{ name: string; opened_at: Date }[]>`
          SELECT lower(trim(guest_name)) AS name, MIN(first_seen_at) AS opened_at FROM invitation_visits
          WHERE invitation_id = ${invitationId} AND guest_name IS NOT NULL GROUP BY 1`,
      ]);
      const openedAtMap = new Map(openedRows.map((r) => [r.name, r.opened_at]));

      let csv = "No,Nama Tamu,Kategori,Nomor WhatsApp,Meja,Status Dibuka,Status Check-in,Status Souvenir,Waktu Ambil Souvenir,Jumlah Kuota\n";
      guests.forEach((g, idx) => {
        const openedAt = openedAtMap.get(g.name.trim().toLowerCase());
        const openedStatus = openedAt
          ? `Dibuka (${new Date(openedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })})`
          : "Belum Dibuka";
        const checkinStatus = g.isTokenRedeemed ? "Hadir (Checked-In)" : "Belum Check-in";
        const souvenirStatus = g.souvenirClaimed ? "Sudah Diambil" : "Belum";
        const souvenirAt = g.souvenirClaimedAt
          ? new Date(g.souvenirClaimedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
          : "-";
        const quota = g.guestQuota || 1;
        csv += `${idx + 1},${csvCell(g.name)},${csvCell(g.category || "-")},${csvCell(g.phone || "-")},${csvCell(g.tableNumber || "-")},${csvCell(openedStatus)},${csvCell(checkinStatus)},${csvCell(souvenirStatus)},${csvCell(souvenirAt)},${quota}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Rekap-Kehadiran-Tamu-${couplePrefix}.csv"`,
        },
      });
    }

    if (type === "gifts") {
      const items = parseGiftRegistryFromSettings(invitation.featureSettings);
      const itemNameMap = new Map(items.map((item) => [item.id, item.name]));
      const claims = await prisma.giftClaim.findMany({
        where: { invitationId },
        orderBy: { claimedAt: "desc" },
      });

      let csv = "No,Nama Kado,Nama Pengirim,Jumlah,Catatan,Waktu Klaim\n";
      claims.forEach((c, idx) => {
        const itemName = itemNameMap.get(c.itemId) || c.itemId;
        const note = (c.note || "").replace(/\r?\n/g, " ");
        const claimedAt = new Date(c.claimedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        csv += `${idx + 1},${csvCell(itemName)},${csvCell(c.guestName)},${c.quantity || 1},${csvCell(note || "-")},${csvCell(claimedAt)}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Rekap-Klaim-Kado-${couplePrefix}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Tipe ekspor tidak valid" }, { status: 400 });
  } catch (error) {
    return routeError("ClientExport", error, "Gagal mengekspor data");
  }
}
