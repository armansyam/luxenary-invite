import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
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
      select: { userId: true, eventData: true, eventType: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = hasAdminPermission(session.user, "invitations");
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
        logger.warn("ClientGuestsBulk", "eventData undangan tidak terbaca; sesi tamu tidak divalidasi", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Limit bulk insert to prevent abuse
    if (guests.length > 500) {
      return NextResponse.json({ error: "Maksimal import adalah 500 tamu sekaligus." }, { status: 400 });
    }

    // Nama dicocokkan tanpa membedakan huruf besar/kecil oleh QR, RSVP, dan resepsionis, jadi nama kembar
    // (di dalam berkas maupun yang sudah terdaftar) dilewati agar check-in tidak tertukar.
    const existing = await prisma.guest.findMany({ where: { invitationId }, select: { name: true } });
    const takenNames = new Set(existing.map((g) => g.name.trim().toLowerCase()));
    const skippedNames: string[] = [];
    const uniqueGuests = guests.filter((g: any) => {
      const key = (g.name?.trim() || "Tamu Undangan").toLowerCase();
      if (takenNames.has(key)) {
        skippedNames.push(g.name?.trim() || "Tamu Undangan");
        return false;
      }
      takenNames.add(key);
      return true;
    });
    const defaultSessionInfo = invitation.eventType === "WEDDING" ? "Akad & Resepsi" : null;

    const createData = uniqueGuests.map((g: any) => {
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
        sessionInfo: g.sessionInfo || defaultSessionInfo,
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
      skippedNames,
      message:
        `Berhasil mengimpor ${result.count} tamu.` +
        (skippedNames.length > 0 ? ` ${skippedNames.length} nama dilewati karena sudah ada di daftar.` : ""),
    });
  } catch (error) {
    return routeError("ClientGuestsBulk", error, "Gagal mengimpor tamu");
  }
}
