import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { canPreviewInvitation } from "@/lib/previewAccess";
import { buildCalendarTitle } from "@/lib/invitationUtils";
import { participantNames } from "@/lib/participantUtils";
import { buildIcsCalendar, type CalendarEventInput } from "@/lib/calendarLinks";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } },
) {
  try {
    const { slug } = await Promise.resolve(params);
    if (!slug) {
      return NextResponse.json({ error: "Slug undangan wajib diisi." }, { status: 400 });
    }

    const inv = await prisma.invitation.findFirst({
      where: {
        OR: [{ invitationSlug: slug }, { id: slug }],
      },
      select: {
        id: true,
        userId: true,
        status: true,
        eventType: true,
        invitationSlug: true,
        participantsJson: true,
        eventData: true,
      },
    });

    if (!inv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    if (inv.status === "TAKEN_DOWN" || inv.status === "ARCHIVED") {
      return NextResponse.json({ error: "Undangan tidak lagi aktif." }, { status: 410 });
    }

    if (inv.status === "DRAFT") {
      const previewToken = req.nextUrl.searchParams.get("preview") || "true";
      const allowed = await canPreviewInvitation(inv, previewToken);
      if (!allowed) {
        return NextResponse.json({ error: "Undangan belum dipublikasikan." }, { status: 403 });
      }
    }

    const events: CalendarEventInput[] = Array.isArray(inv.eventData)
      ? (inv.eventData as CalendarEventInput[])
      : [];

    const sessionParam = req.nextUrl.searchParams.get("session");
    let targetEvents = events;
    if (sessionParam !== null && sessionParam !== "") {
      const idx = Number(sessionParam);
      if (!Number.isInteger(idx) || idx < 0 || idx >= events.length) {
        return NextResponse.json({ error: "Sesi acara tidak ditemukan." }, { status: 404 });
      }
      targetEvents = [events[idx]];
    }

    const names = participantNames(inv.eventType, inv.participantsJson);
    const title = buildCalendarTitle(inv.eventType || "WEDDING", {
      groomName: names.first,
      brideName: names.second,
      personName: names.first,
      childName: names.first,
      babyName: names.first,
      eventTitle: names.full || "Acara",
    });

    const ics = buildIcsCalendar(title, targetEvents, "WIB", inv.invitationSlug || inv.id);
    if (!ics) {
      return NextResponse.json({ error: "Tanggal acara belum ditentukan." }, { status: 404 });
    }

    const safeFileName = (inv.invitationSlug || "undangan").replace(/[^a-zA-Z0-9._-]/g, "-");
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFileName}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return routeError("PublicCalendarIcs", error, "Gagal membuat berkas kalender .ics");
  }
}
