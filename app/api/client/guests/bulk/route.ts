import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { getPrimaryEventDate } from "@/lib/lifecycleDates";
import { cleanGuestName, cleanGuestTextFields, guestQuotaFrom } from "@/lib/guestInput";
import { HttpError, routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { withGuestNameLock } from "@/lib/guestNameLock";
import { rateLimitDb } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MAX_GUESTS_PER_INVITATION = 5000;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonBody(req);
    const { invitationId, guests } = body ?? {};

    if (!invitationId || !Array.isArray(guests) || guests.length === 0) {
      return NextResponse.json({ error: "Data tamu tidak valid atau kosong" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true, status: true, eventData: true, eventType: true, isFreeDraft: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = hasAdminPermission(session.user, "invitations");
    if (invitation.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda bukan pemilik undangan ini." }, { status: 403 });
    }

    if (!isAdmin && (invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN")) {
      return NextResponse.json(
        { error: "Undangan ini telah diarsipkan atau dinonaktifkan sehingga daftar tamu tidak dapat diimpor." },
        { status: 403 }
      );
    }

    if (invitation.isFreeDraft && !isAdmin) {
      return NextResponse.json(
        {
          error: "Impor daftar tamu hanya tersedia setelah paket diaktifkan. Silakan pilih paket terlebih dahulu.",
          code: "FREE_DRAFT_GUESTS_BLOCKED",
        },
        { status: 403 }
      );
    }

    if (!isAdmin && !(await rateLimitDb(`guest_bulk:${invitationId}`, 15, 10 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan impor tamu. Silakan tunggu beberapa menit." },
        { status: 429 }
      );
    }

    // Mulai hari terima tamu (pada zona waktu acara) tamu baru hanya dicatat Resepsionis di lokasi.
    const guestDay = getPrimaryEventDate(invitation.eventData);
    if (guestDay && Date.now() >= guestDay.getTime()) {
      return NextResponse.json(
        { error: "Daftar tamu sudah dikunci karena acara sedang/telah berlangsung. Tamu tambahan hanya dapat diinput oleh Resepsionis di lokasi." },
        { status: 403 }
      );
    }

    // Limit bulk insert to prevent abuse
    if (guests.length > 500) {
      return NextResponse.json({ error: "Maksimal import adalah 500 tamu sekaligus." }, { status: 400 });
    }

    // Nama dicocokkan tanpa membedakan huruf besar/kecil oleh QR, RSVP, dan resepsionis, jadi nama kembar
    // (di dalam berkas maupun yang sudah terdaftar) dilewati agar check-in tidak tertukar.
    // Baris bukan objek, atau nama bukan teks / lebih dari batas, ditolak sebelum menyentuh DB (bukan 500 dari Prisma).
    const invalidRow = guests.findIndex(
      (g: any) => !g || typeof g !== "object" || (g.name !== undefined && g.name !== null && g.name !== "" && !cleanGuestName(g.name))
    );
    if (invalidRow !== -1) {
      return NextResponse.json({ error: `Baris ke-${invalidRow + 1} tidak valid: nama harus teks maksimal 100 karakter.` }, { status: 400 });
    }

    const defaultSessionInfo = invitation.eventType === "WEDDING" ? "Akad & Resepsi" : null;

    const rows = guests.map((g: any) => {
      const cleanName = cleanGuestName(g.name) || "Tamu Undangan";
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
        "-" +
        crypto.randomBytes(3).toString("hex");

      const qrToken = crypto.randomBytes(8).toString("hex");
      const fields = cleanGuestTextFields(g);

      return {
        invitationId,
        name: cleanName,
        slug,
        phone: fields.phone,
        category: fields.category || "UMUM",
        sessionInfo: fields.sessionInfo || defaultSessionInfo,
        guestQuota: guestQuotaFrom(g.guestQuota, 2),
        tableNumber: fields.tableNumber,
        qrToken,
      };
    });

    const skippedNames: string[] = [];
    const result = await withGuestNameLock(invitationId, async (tx) => {
      const existing = await tx.guest.findMany({ where: { invitationId }, select: { name: true } });
      const takenNames = new Set(existing.map((g) => g.name.trim().toLowerCase()));
      const uniqueRows = rows.filter((row) => {
        const key = row.name.toLowerCase();
        if (takenNames.has(key)) {
          skippedNames.push(row.name);
          return false;
        }
        takenNames.add(key);
        return true;
      });
      if (existing.length + uniqueRows.length > MAX_GUESTS_PER_INVITATION) {
        const remaining = Math.max(0, MAX_GUESTS_PER_INVITATION - existing.length);
        throw new HttpError(
          400,
          `Total tamu melebihi batas maksimal ${MAX_GUESTS_PER_INVITATION.toLocaleString("id-ID")} tamu per undangan (sisa kuota: ${remaining} tamu).`,
        );
      }
      return tx.guest.createMany({ data: uniqueRows });
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
