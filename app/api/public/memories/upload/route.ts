import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPlatformSettings, hasPlanCapability, getPlanMemoriesQuota } from "@/lib/settings";
import crypto from "crypto";
import { uploadFile, deleteFile } from "@/lib/storage";
import { rateLimitDb, getClientIp } from "@/lib/rateLimit";
import { sseEmitter } from "@/lib/sseEmitter";
import { getMemoriesActiveSchedule, calculateSessionCumulativeQuota } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

/**
 * Validasi MIME type berdasarkan magic bytes (4 byte pertama file buffer)
 * Tidak mempercayai mimeType yang dikirim client — ini sumber kebenaran.
 */
function detectMimeFromMagicBytes(buffer: Buffer): { mimeType: string; ext: string } | null {
  if (buffer.length < 4) return null;

  const hex = buffer.toString("hex", 0, 12).toUpperCase();

  // JPEG: FF D8 FF
  if (hex.startsWith("FFD8FF")) return { mimeType: "image/jpeg", ext: ".jpg" };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hex.startsWith("89504E47")) return { mimeType: "image/png", ext: ".png" };

  // WebP: RIFF????WEBP (bytes 0-3 = 52494646, bytes 8-11 = 57454250)
  if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
    return { mimeType: "image/webp", ext: ".webp" };
  }

  // GIF: GIF87a atau GIF89a
  if (hex.startsWith("474946383")) return { mimeType: "image/gif", ext: ".gif" };

  // Tipe lain tidak diizinkan
  return null;
}


export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Limit: 15 request per menit (60000ms) untuk mengakomodasi jaringan WiFi yang sama (cross-process PM2 safe)
    if (!(await rateLimitDb(`memories_upload:${ip}`, 15, 60000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan unggahan. Silakan coba lagi sebentar." }, { status: 429 });
    }

    let invitationId = "";
    let senderName = "Guest";
    let senderEmail = "guest@system";
    let caption = "";
    let buffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      invitationId = (formData.get("invitationId") as string) || "";
      senderName = (formData.get("senderName") as string) || "Guest";
      senderEmail = (formData.get("senderEmail") as string) || "guest@system";
      caption = ((formData.get("message") || formData.get("caption") || "") as string);

      const file = formData.get("file") as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const data = await req.json();
      invitationId = data.invitationId || "";
      senderName = data.senderName || "Guest";
      senderEmail = data.senderEmail || "guest@system";
      caption = data.caption || data.message || "";
      if (data.base64File) {
        const base64Data = data.base64File.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!invitationId || !buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Data tidak lengkap atau foto belum dipilih." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        status: true,
        memoriesUploadLocked: true,
        invitationSlug: true,
        featureSettings: true,
        eventData: true,
        groomNickname: true,
        groomName: true,
        brideNickname: true,
        brideName: true,
        user: { select: { email: true, name: true } },
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const canUploadMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
    if (!canUploadMemories) {
      return NextResponse.json(
        { error: "Fitur unggah momen kenangan tamu tidak termasuk dalam kapabilitas paket Anda." },
        { status: 403 }
      );
    }

    // Cek apakah status undangan sudah EVENT_FINISHED, ARCHIVED, atau upload dikunci oleh klien
    if (invitation.memoriesUploadLocked || invitation.status === "EVENT_FINISHED" || invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN") {
      const galleryUrl = `/${invitation.invitationSlug}/memories`;
      return NextResponse.json(
        { locked: true, galleryUrl, message: "Rangkaian acara telah selesai dan periode pengiriman momen telah ditutup oleh penyelenggara." },
        { status: 423 } // 423 Locked — HTTP status yang tepat untuk resource terkunci
      );
    }

    // ── VALIDASI KONFIGURASI DINAMIS (featureSettings) ──
    const fs = (() => {
      try {
        return typeof invitation.featureSettings === "object"
          ? invitation.featureSettings
          : JSON.parse(invitation.featureSettings || "{}");
      } catch {
        return {};
      }
    })();

    // Cek apakah fitur memori tamu dinonaktifkan di level undangan
    if (fs.showGuestMemories === false) {
      return NextResponse.json(
        { error: "Pengiriman momen sedang dinonaktifkan oleh penyelenggara." },
        { status: 403 }
      );
    }

    // ── VALIDASI JADWAL WAKTU & MULTI-SESSION AKTIF ──
    const now = new Date();
    const schedule = getMemoriesActiveSchedule(invitation.featureSettings, invitation.eventData);

    if (schedule.isAllFinished) {
      return NextResponse.json(
        {
          expired: true,
          endTime: schedule.endTime ? schedule.endTime.toISOString() : undefined,
          message: "Seluruh rangkaian acara telah selesai. Pengiriman momen telah ditutup.",
        },
        { status: 423 }
      );
    }

    if (!schedule.isSessionActive) {
      if (schedule.nextSession) {
        return NextResponse.json(
          {
            notStarted: true,
            sessionName: schedule.nextSession.name,
            startTime: `${schedule.nextSession.date}T${schedule.nextSession.startTime}:00`,
            message: `Kamera momen sedang ditutup sementara. Sesi ${schedule.nextSession.name} akan dibuka pada ${schedule.nextSession.date} pukul ${schedule.nextSession.startTime} WIB.`,
          },
          { status: 403 }
        );
      }

      if (schedule.startTime && now < schedule.startTime) {
        return NextResponse.json(
          {
            notStarted: true,
            startTime: schedule.startTime.toISOString(),
            message: "Kamera momen belum dibuka. Silakan kembali saat acara dimulai.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          expired: true,
          message: "Waktu pengiriman momen untuk sesi ini telah berakhir.",
        },
        { status: 423 }
      );
    }

    // ── VALIDASI KUOTA TAMU PENGUNGGAH & PLAFON PAKET ADMIN ──
    const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);
    if (!planQuota.hasAccess) {
      return NextResponse.json(
        { error: "Fitur kamera kenangan tamu tidak termasuk dalam kapabilitas paket Anda." },
        { status: 403 }
      );
    }

    // ── 1. VALIDASI TOTAL KUOTA FOTO ACARA (Total Event Capacity) ──
    const extraPhotos = typeof fs.extraMemoriesQuota === "number" ? Math.max(0, fs.extraMemoriesQuota) : 0;
    const baseEventQuota = planQuota.totalQuota > 0 ? planQuota.totalQuota : (planQuota.maxContributors * planQuota.shotsQuota);
    const totalEventQuota = baseEventQuota + extraPhotos;
    const currentTotalPhotos = await prisma.guestMemory.count({
      where: { invitationId },
    });

    if (totalEventQuota > 0 && currentTotalPhotos >= totalEventQuota) {
      return NextResponse.json(
        {
          quotaExceeded: true,
          totalQuota: totalEventQuota,
          currentTotalPhotos,
          message: "Terima kasih banyak atas momen indahnya! Roll kamera kenangan untuk acara ini telah terisi penuh dengan cinta. Semua foto sedang kami proses dan simpan dengan aman ke dalam album kenangan pengantin ✨",
        },
        { status: 403 }
      );
    }

    // ── 1.b VALIDASI ALOKASI KUOTA SESI (dengan Smart Rollover) ──
    if (schedule.currentSession && schedule.currentSession.allocatedQuota && schedule.currentSession.allocatedQuota > 0) {
      const sessionStartDate = new Date(`${schedule.currentSession.date}T${schedule.currentSession.startTime || "00:00"}:00`);
      const photosBeforeThisSession = await prisma.guestMemory.count({
        where: {
          invitationId,
          createdAt: { lt: sessionStartDate },
        },
      });

      const allowedCumulativeQuota = calculateSessionCumulativeQuota(
        schedule.sessions,
        schedule.activeSessionIndex,
        totalEventQuota,
        photosBeforeThisSession
      );

      if (currentTotalPhotos >= allowedCumulativeQuota) {
        return NextResponse.json(
          {
            quotaExceeded: true,
            sessionName: schedule.currentSession.name,
            sessionQuota: schedule.currentSession.allocatedQuota,
            message: `Kuota foto untuk ${schedule.currentSession.name} telah terisi penuh (${schedule.currentSession.allocatedQuota} foto). Kamera akan dibuka kembali pada sesi berikutnya!`,
          },
          { status: 403 }
        );
      }
    }

    // ── 2. VALIDASI JATAH ROLL PER TAMU (Guest Roll Limit) ──
    // Klien (pengantin) bebas mengatur berapa roll per tamu di pengaturan undangannya
    const clientShotsQuota = typeof fs.memoriesShotsQuota === "number" ? fs.memoriesShotsQuota : planQuota.shotsQuota;
    const shotsQuota = clientShotsQuota > 0 ? clientShotsQuota : (planQuota.shotsQuota || 5);

    let guestUploadedCount = 0;
    if (senderEmail) {
      guestUploadedCount = await prisma.guestMemory.count({
        where: {
          invitationId,
          senderEmail,
        },
      });

      if (shotsQuota > 0 && guestUploadedCount >= shotsQuota) {
        return NextResponse.json(
          {
            quotaExceeded: true,
            shotsQuota,
            guestUploadedCount,
            message: "Seluruh jepretan roll kamera Anda telah terpakai. Terima kasih telah mengabadikan momen berharga ini bersama kedua mempelai!",
          },
          { status: 403 }
        );
      }
    }


    // ── VALIDASI MAGIC BYTES (server-side MIME detection) ──
    // Tidak mempercayai mimeType dari client — periksa konten aktual file
    const detected = detectMimeFromMagicBytes(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Hanya gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan." },
        { status: 400 }
      );
    }

    // ── HARD SECURITY BARRIER (Anti-DoS & Payload Protection) ──
    // Seluruh foto dari Virtual Disposable Camera terkompresi otomatis di sisi browser (~300-500 KB).
    // Batas 5 MB ini adalah batas pengaman server internal mutlak untuk menangkis eksploitasi payload mentah / DoS.
    const MAX_MEMORY_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB Hard Ceiling
    if (buffer.byteLength > MAX_MEMORY_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Ukuran berkas melebihi batas pengaman server (maksimal 5 MB)." },
        { status: 400 }
      );
    }

    // Gunakan extension dari magic bytes (bukan dari client)
    const safeBaseName = `momen_${Date.now()}`;
    const finalFileName = `${crypto.randomBytes(4).toString("hex")}_${safeBaseName}${detected.ext}`;
    // Pemisahan folder agar Cloudflare R2 bisa melakukan Auto-Delete 60 hari khusus untuk folder tamu ini
    const relativePath = `guest-memories/${invitationId}/${finalFileName}`;

    const mediaUrl = await uploadFile(buffer, relativePath, detected.mimeType);


    // Save to Database secara atomik dengan PostgreSQL Advisory Lock untuk menjamin totalEventQuota & jatah roll tamu tidak pernah bocor saat upload paralel
    let memory;
    let newTotalPhotos = currentTotalPhotos + 1;
    try {
      const lockKey = `memories_quota:${invitationId}`;
      const saveResult = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const atomicTotal = await tx.guestMemory.count({ where: { invitationId } });
        if (totalEventQuota > 0 && atomicTotal >= totalEventQuota) {
          throw new Error("ERR_TOTAL_QUOTA_EXCEEDED");
        }

        if (senderEmail && shotsQuota > 0) {
          const atomicGuestCount = await tx.guestMemory.count({
            where: { invitationId, senderEmail },
          });
          if (atomicGuestCount >= shotsQuota) {
            throw new Error("ERR_GUEST_ROLL_EXCEEDED");
          }
        }

        const created = await tx.guestMemory.create({
          data: {
            invitationId,
            senderName: senderName || "Guest",
            senderEmail: senderEmail || "guest@system",
            mediaUrl,
            mediaType: "IMAGE", // Compressed JPEG from Canvas
            thumbnailUrl: mediaUrl,
            message: caption || "",
          },
        });

        return { created, newCount: atomicTotal + 1 };
      });

      memory = saveResult.created;
      newTotalPhotos = saveResult.newCount;
    } catch (saveErr: any) {
      // Jika kuota penuh saat race condition, bersihkan file yang baru diunggah ke R2
      deleteFile(relativePath).catch(() => {});

      if (saveErr.message === "ERR_TOTAL_QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            quotaExceeded: true,
            totalQuota: totalEventQuota,
            message: "Terima kasih banyak atas momen indahnya! Roll kamera kenangan untuk acara ini telah terisi penuh dengan cinta. Semua foto sedang kami proses dan simpan dengan aman ke dalam album kenangan pengantin ✨",
          },
          { status: 403 }
        );
      }

      if (saveErr.message === "ERR_GUEST_ROLL_EXCEEDED") {
        return NextResponse.json(
          {
            quotaExceeded: true,
            shotsQuota,
            message: "Seluruh jepretan roll kamera Anda telah terpakai. Terima kasih telah mengabadikan momen berharga ini bersama kedua mempelai!",
          },
          { status: 403 }
        );
      }

      throw saveErr;
    }

    // Pancarkan event real-time ke SSE stream galeri tamu
    try {
      sseEmitter.emit("new_memory", memory);
    } catch (sseErr) {
      console.error("[SSE Emitter Error]", sseErr);
    }

    // ── TRIGGER NOTIFIKASI AMBANG BATAS ROLL DINAMIS (NON-BLOCKING BACKGROUND) ──
    const settings = await getPublicPlatformSettings();
    const configuredMilestones: number[] = (settings.memoriesNotifyMilestones && settings.memoriesNotifyMilestones.length > 0)
      ? settings.memoriesNotifyMilestones
      : [50, 80, 100];

    const alreadyNotified: number[] = Array.isArray(fs.memoriesNotifiedMilestones)
      ? fs.memoriesNotifiedMilestones
      : (fs.memoriesNotified80 ? [80] : []);

    // Temukan milestone yang telah tercapai oleh akumulasi foto saat ini dan belum pernah ternotifikasi
    const newlyReachedMilestones = configuredMilestones.filter((m) => {
      if (alreadyNotified.includes(m)) return false;
      const threshold = Math.floor(totalEventQuota * (m / 100));
      return newTotalPhotos >= threshold && threshold > 0;
    });

    if (
      totalEventQuota >= 5 &&
      newlyReachedMilestones.length > 0 &&
      invitation.user?.email
    ) {
      // Ambil milestone tertinggi yang tercapai dalam batch upload ini
      const targetMilestone = newlyReachedMilestones[newlyReachedMilestones.length - 1];
      const updatedMilestones = Array.from(new Set([...alreadyNotified, ...newlyReachedMilestones]));
      const updatedFs = {
        ...fs,
        memoriesNotifiedMilestones: updatedMilestones,
        memoriesNotified80: updatedMilestones.includes(80),
      };

      // Tandai milestone di DB agar notifikasi hanya dikirim 1 kali per ambang batas
      prisma.invitation
        .update({
          where: { id: invitationId },
          data: { featureSettings: JSON.stringify(updatedFs) },
        })
        .catch((e) => console.error("[Memories Upload] Gagal menyimpan flag milestone notifikasi:", e));

      // Kirim email notifikasi secara asynchronous (tidak memperlambat response upload tamu)
      const groomFirst = (invitation.groomNickname || invitation.groomName || "Mempelai").trim();
      const brideFirst = (invitation.brideNickname || invitation.brideName || "").trim();
      const coupleNames = brideFirst ? `${groomFirst} & ${brideFirst}` : groomFirst;
      const remainingPhotos = Math.max(0, totalEventQuota - newTotalPhotos);

      import("@/lib/mailer")
        .then(({ sendMemoriesQuotaAlertEmail }) => {
          sendMemoriesQuotaAlertEmail({
            invitationId,
            invitationSlug: invitation.invitationSlug,
            coupleNames,
            usedPhotos: newTotalPhotos,
            totalQuota: totalEventQuota,
            remainingPhotos,
            recipientEmail: invitation.user.email,
            recipientName: invitation.user.name || coupleNames,
            milestonePercent: targetMilestone,
          }).catch((err) => console.error("[Memories Upload] Gagal kirim email alert kuota roll:", err));
        })
        .catch(() => {});
    }

    const remainingShots = shotsQuota > 0 ? Math.max(0, shotsQuota - (guestUploadedCount + 1)) : 999;

    return NextResponse.json({ 
      success: true, 
      memory,
      viewUrl: mediaUrl,
      shotsTaken: guestUploadedCount + 1,
      shotsQuota,
      remainingShots,
    });

  } catch (error: any) {
    console.error("[Memories Upload Error]", error);
    const msg = process.env.NODE_ENV === "production" ? "Terjadi kesalahan server saat upload" : (error.message || "Terjadi kesalahan server saat upload");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
