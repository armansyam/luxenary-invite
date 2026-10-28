import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { exceedsDeclaredBodySize } from "@/lib/requestLimits";
import { RSVP_NAME_MAX } from "@/lib/rsvpStatus";

export const dynamic = "force-dynamic";

const VISITOR_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
// Undangan yang selesai acaranya tetap dibuka tamu (galeri, ucapan); draf dan arsip tidak dihitung.
const COUNTED_STATUSES = new Set(["PUBLISHED", "EVENT_FINISHED"]);

/**
 * POST /api/public/visit — dipanggil sekali per sesi peramban oleh runtime undangan terbit (lib/renderTemplate.ts).
 * HTML undangan di-cache edge, jadi kunjungan dicatat dari sisi peramban, bukan saat render.
 */
export async function POST(req: NextRequest) {
  try {
    if (exceedsDeclaredBodySize(req, 4 * 1024)) {
      return NextResponse.json({ error: "Ukuran permintaan terlalu besar." }, { status: 413 });
    }
    const body = await req.json().catch(() => null);
    const { invitationId, visitorId, guestName } = (body ?? {}) as Record<string, unknown>;
    if (typeof invitationId !== "string" || !invitationId || typeof visitorId !== "string" || !VISITOR_ID_RE.test(visitorId)) {
      return NextResponse.json({ error: "invitationId dan visitorId wajib valid." }, { status: 400 });
    }
    if (guestName != null && typeof guestName !== "string") {
      return NextResponse.json({ error: "guestName harus berupa teks." }, { status: 400 });
    }
    if (invitationId.startsWith("demo")) {
      return NextResponse.json({ counted: false });
    }

    // Seperti RSVP, tidak dibatasi per IP (tamu satu operator seluler berbagi IP); batas per undangan menahan banjir bot.
    if (!(await rateLimitDb(`visit:inv:${invitationId}`, 600, 60_000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId }, select: { status: true, userId: true } });
    if (!invitation || !COUNTED_STATUSES.has(invitation.status)) {
      return NextResponse.json({ counted: false });
    }

    // Pemilik yang memeriksa undangannya sendiri dan admin (termasuk mode remote) bukan tamu.
    const session = await auth();
    if (session?.user && (session.user.isAdmin || session.user.id === invitation.userId)) {
      return NextResponse.json({ counted: false });
    }

    const name = guestName?.trim().slice(0, RSVP_NAME_MAX) || null;
    await prisma.$executeRaw`
      INSERT INTO invitation_visits (id, invitation_id, visitor_id, guest_name)
      VALUES (${randomUUID()}, ${invitationId}, ${visitorId}, ${name})
      ON CONFLICT (invitation_id, visitor_id) DO UPDATE SET
        visit_count = invitation_visits.visit_count + 1,
        last_seen_at = CURRENT_TIMESTAMP,
        guest_name = COALESCE(EXCLUDED.guest_name, invitation_visits.guest_name)`;

    return NextResponse.json({ counted: true });
  } catch (error) {
    return routeError("PublicVisit", error, "Gagal mencatat kunjungan");
  }
}
