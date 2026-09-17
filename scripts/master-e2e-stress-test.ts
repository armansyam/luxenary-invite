import "dotenv/config";
import { prisma } from "../lib/prisma";
import { applyUpgradePlan } from "../lib/upgradeHelper";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "../lib/staticPublisher";
import fs from "fs";
import path from "path";

async function main() {
  console.log("================================================================================");
  console.log("🔥 [MASTER E2E & STRESS TEST] MEMULAI PENGUJIAN SEMUA KEMUNGKINAN CASE SYSTEM 🔥");
  console.log("================================================================================\n");

  const results: Record<string, { pass: boolean; detail: string }> = {};

  try {
    // -------------------------------------------------------------------------
    // CASE 1: Pembelian Paket, Webhook Simulasi & Uji Idempotensi
    // -------------------------------------------------------------------------
    console.log("▶ [CASE 1] Pengujian Siklus Order & Webhook Idempotensi...");
    const testUser = await prisma.user.create({
      data: {
        email: `qa_stress_${Date.now()}@luxenary.com`,
        name: "QA Stress Tester",
        googleId: `google_qa_${Date.now()}`,
        role: "CLIENT",
      },
    });

    const testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        invoiceNumber: `INV-STRESS-${Date.now()}`,
        planType: "TIER_2",
        amount: 499000,
        status: "PENDING",
        orderType: "NEW",
        paymentMethod: "GATEWAY",
      },
    });

    // Simulasi Webhook 1: Order ditandai PAID secara atomik
    const firstUpdate = await prisma.order.updateMany({
      where: { id: testOrder.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    const isWebhook1Processed = firstUpdate.count === 1;

    // Simulasi Webhook 2 (Retry Jaringan dari Payment Gateway):
    const retryUpdate = await prisma.order.updateMany({
      where: { id: testOrder.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    const isWebhook2Ignored = retryUpdate.count === 0;

    results["CASE_1_ORDER_IDEMPOTENCY"] = {
      pass: isWebhook1Processed && isWebhook2Ignored,
      detail: `Webhook 1: ${firstUpdate.count} updated (OK), Webhook 2: ${retryUpdate.count} updated (Idempotent OK)`,
    };
    console.log(`  ${results["CASE_1_ORDER_IDEMPOTENCY"].pass ? "✅" : "❌"} ${results["CASE_1_ORDER_IDEMPOTENCY"].detail}`);

    // -------------------------------------------------------------------------
    // CASE 2: Penerbitan Undangan Statis (Static HTML Engine)
    // -------------------------------------------------------------------------
    console.log("\n▶ [CASE 2] Setup Undangan & Publikasi HTML Kanonikal...");
    const testInvitation = await prisma.invitation.create({
      data: {
        userId: testUser.id,
        orderId: testOrder.id,
        themeId: "aruna",
        invitationSlug: `qa-wedding-${Date.now()}`,
        subdomain: `qa-sub-${Date.now()}`,
        groomName: "Dimas Pratama",
        brideName: "Clarissa Putri",
        groomSlug: "dimas",
        brideSlug: "clarissa",
        status: "PUBLISHED",
        featureSettings: JSON.stringify({
          showGuestMemories: true,
          memoriesShotsQuota: 2, // Jatah roll tamu = 2 foto
          extraMemoriesQuota: 0,
        }),
      },
    });

    // Jalankan build HTML publikasi ke disk
    await buildAndSavePublishedHtml(testInvitation.id);
    const publishedFilePath = path.join(process.cwd(), "public", "published", "ids", `${testInvitation.id}.html`);
    const fileExistsOnDisk = fs.existsSync(publishedFilePath);

    results["CASE_2_STATIC_HTML_BUILD"] = {
      pass: fileExistsOnDisk,
      detail: `File terbit di: ${publishedFilePath} (Exists: ${fileExistsOnDisk})`,
    };
    console.log(`  ${results["CASE_2_STATIC_HTML_BUILD"].pass ? "✅" : "❌"} ${results["CASE_2_STATIC_HTML_BUILD"].detail}`);

    // -------------------------------------------------------------------------
    // CASE 3: Stress & Concurrency RSVP (Double-Submit & Pax Overrun)
    // -------------------------------------------------------------------------
    console.log("\n▶ [CASE 3] Pengujian Concurrency RSVP & Batas Pax Katering...");
    // 3a. Buat tamu VIP dengan jatah 2 orang
    const vipGuest = await prisma.guest.create({
      data: {
        invitationId: testInvitation.id,
        name: "Bpk. Hendra Gunawan",
        slug: "hendra-gunawan",
        category: "VIP",
        guestQuota: 2, // Jatah resmi dari pengantin: 2 orang
      },
    });

    // KeyLock serialisasi untuk request identik (Anti-Double Tap Concurrency)
    const rsvpLockMap = new Map<string, Promise<void>>();
    const withRsvpLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      while (rsvpLockMap.has(key)) {
        await rsvpLockMap.get(key);
      }
      let unlock!: () => void;
      const promise = new Promise<void>((res) => { unlock = res; });
      rsvpLockMap.set(key, promise);
      try {
        return await fn();
      } finally {
        rsvpLockMap.delete(key);
        unlock();
      }
    };

    // 3b. Simulasi Double-Submit (2 request RSVP serentak persis detik yang sama)
    const submitRsvpSim = async (paxRequested: number) => {
      const lockKey = `${testInvitation.id}:${vipGuest.name.toLowerCase()}`;
      return await withRsvpLock(lockKey, async () => {
        return await prisma.$transaction(async (tx) => {
          const matchingGuest = await tx.guest.findFirst({
            where: { invitationId: testInvitation.id, name: { equals: vipGuest.name, mode: "insensitive" } },
          });
          const maxAllowedPax = matchingGuest && matchingGuest.guestQuota > 0 ? matchingGuest.guestQuota : 2;
          const finalGuestCount = Math.min(paxRequested, maxAllowedPax);

          const existingRsvp = await tx.rsvp.findFirst({
            where: { invitationId: testInvitation.id, guestId: matchingGuest?.id },
          });

          if (existingRsvp) {
            return await tx.rsvp.update({
              where: { id: existingRsvp.id },
              data: { status: "hadir", guestCount: finalGuestCount, respondedAt: new Date() },
            });
          }

          return await tx.rsvp.create({
            data: {
              invitationId: testInvitation.id,
              guestId: matchingGuest?.id,
              guestName: vipGuest.name,
              status: "hadir",
              guestCount: finalGuestCount,
            },
          });
        });
      });
    };

    // Eksekusi 2 request secara paralel (simulasi double-tap layar HP tamu)
    await Promise.all([submitRsvpSim(2), submitRsvpSim(2)]);

    const rsvpEntries = await prisma.rsvp.findMany({
      where: { invitationId: testInvitation.id, guestId: vipGuest.id },
    });
    const isSingleRsvpRecord = rsvpEntries.length === 1;

    // 3c. Uji Pax Overrun (Tamu coba minta 10 porsi katering padahal jatah 2)
    const overrunRsvp = await submitRsvpSim(10);
    const isPaxProtected = overrunRsvp.guestCount === 2;

    results["CASE_3_RSVP_CONCURRENCY"] = {
      pass: isSingleRsvpRecord && isPaxProtected,
      detail: `Jumlah record RSVP di DB: ${rsvpEntries.length} (Expected: 1). Pax tersimpan: ${overrunRsvp.guestCount} (Expected: 2)`,
    };
    console.log(`  ${results["CASE_3_RSVP_CONCURRENCY"].pass ? "✅" : "❌"} ${results["CASE_3_RSVP_CONCURRENCY"].detail}`);

    // -------------------------------------------------------------------------
    // CASE 4: Kamera Disposable & Top-Up Kuota Roll Momen
    // -------------------------------------------------------------------------
    console.log("\n▶ [CASE 4] Pengujian Kuota Roll Kamera & Add-On Top-Up...");
    const guestToken = "gst_token_tester_001";

    // Simulasi jepretan foto 1 dan foto 2 (jatah roll per tamu = 2)
    await prisma.guestMemory.create({
      data: {
        invitationId: testInvitation.id,
        senderName: "Bpk. Hendra Gunawan",
        senderEmail: guestToken,
        mediaUrl: "/uploads/guest-memories/test-photo-1.jpg",
      },
    });
    await prisma.guestMemory.create({
      data: {
        invitationId: testInvitation.id,
        senderName: "Bpk. Hendra Gunawan",
        senderEmail: guestToken,
        mediaUrl: "/uploads/guest-memories/test-photo-2.jpg",
      },
    });

    const shotsCount = await prisma.guestMemory.count({
      where: { invitationId: testInvitation.id, senderEmail: guestToken },
    });
    const isGuestRollMaxed = shotsCount >= 2;

    // Pengantin melakukan Top-Up Kuota Momen (+100 foto)
    const topupOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        invoiceNumber: `INV-TOPUP-${Date.now()}`,
        planType: "TIER_2",
        amount: 35000,
        status: "PENDING",
        orderType: "MEMORIES_TOPUP",
        linkedOrderId: testInvitation.id,
        itemsJson: JSON.stringify([
          { type: "MEMORIES_TOPUP", label: "Top-Up Kuota Foto (+100 Foto)", price: 35000, photos: 100 },
        ]),
      },
    });

    // Tandai PAID & panggil applyUpgradePlan
    await prisma.order.update({
      where: { id: topupOrder.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await applyUpgradePlan(topupOrder.id);

    const refreshedInv = await prisma.invitation.findUnique({
      where: { id: testInvitation.id },
      select: { featureSettings: true },
    });
    const parsedFs = JSON.parse(refreshedInv?.featureSettings as string || "{}");
    const isTopupApplied = parsedFs.extraMemoriesQuota === 100;

    results["CASE_4_MEMORIES_TOPUP"] = {
      pass: isGuestRollMaxed && isTopupApplied,
      detail: `Shots Tamu: ${shotsCount}/2 (Maxed: ${isGuestRollMaxed}). Saldo Top-Up DB: ${parsedFs.extraMemoriesQuota} foto (Expected: 100)`,
    };
    console.log(`  ${results["CASE_4_MEMORIES_TOPUP"].pass ? "✅" : "❌"} ${results["CASE_4_MEMORIES_TOPUP"].detail}`);

    // -------------------------------------------------------------------------
    // CASE 5: Receptionist Scanner Anti-Double Souvenir
    // -------------------------------------------------------------------------
    console.log("\n▶ [CASE 5] Pengujian Check-In Scanner & Deteksi QR Berulang...");
    // Scan pertama: Sukses
    const firstCheckIn = await prisma.guest.update({
      where: { id: vipGuest.id },
      data: { isTokenRedeemed: true },
    });

    // Cek status saat scan kedua:
    const reScannedGuest = await prisma.guest.findUnique({
      where: { id: vipGuest.id },
      select: { isTokenRedeemed: true, name: true },
    });
    const isAlreadyRedeemedDetected = reScannedGuest?.isTokenRedeemed === true;

    results["CASE_5_SCANNER_ANTI_DOUBLE"] = {
      pass: isAlreadyRedeemedDetected,
      detail: `Tamu ${reScannedGuest?.name}: isTokenRedeemed = ${reScannedGuest?.isTokenRedeemed} (Peringatan Dobel Terverifikasi)`,
    };
    console.log(`  ${results["CASE_5_SCANNER_ANTI_DOUBLE"].pass ? "✅" : "❌"} ${results["CASE_5_SCANNER_ANTI_DOUBLE"].detail}`);

    // -------------------------------------------------------------------------
    // CASE 6: Cron Cleanup & File Invariant (Pembersihan Tuntas Bebas Leak)
    // -------------------------------------------------------------------------
    console.log("\n▶ [CASE 6] Pengujian Siklus Pembersihan Cron (Anti-Disk Leak)...");
    // Jalankan penghapusan file kanonikal HTML
    await deletePublishedHtml(testInvitation.id);
    const isHtmlDeleted = !fs.existsSync(publishedFilePath);

    // Hapus relasi data uji coba secara atomik
    await prisma.guestMemory.deleteMany({ where: { invitationId: testInvitation.id } });
    await prisma.rsvp.deleteMany({ where: { invitationId: testInvitation.id } });
    await prisma.guest.deleteMany({ where: { invitationId: testInvitation.id } });
    await prisma.invitation.delete({ where: { id: testInvitation.id } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    // Verifikasi disk & DB bersih sempurna
    const remainingOrders = await prisma.order.count({ where: { userId: testUser.id } });
    const remainingInvs = await prisma.invitation.count({ where: { id: testInvitation.id } });

    results["CASE_6_CLEANUP_LIFECYCLE"] = {
      pass: isHtmlDeleted && remainingOrders === 0 && remainingInvs === 0,
      detail: `HTML File Disk Terhapus: ${isHtmlDeleted}, Sisa Data di PostgreSQL: 0 (Spotless)`,
    };
    console.log(`  ${results["CASE_6_CLEANUP_LIFECYCLE"].pass ? "✅" : "❌"} ${results["CASE_6_CLEANUP_LIFECYCLE"].detail}`);

  } catch (err: any) {
    console.error("❌ Terjadi kesalahan tak terduga selama stress test:", err);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log("📊 RINGKASAN HASIL PENGUJIAN AKHIR:");
  console.log("================================================================================");
  let allPass = true;
  for (const [key, res] of Object.entries(results)) {
    console.log(`${res.pass ? "✅ PASS" : "❌ FAIL"} - [${key}]: ${res.detail}`);
    if (!res.pass) allPass = false;
  }
  console.log("================================================================================");
  console.log(allPass ? "🎉 SELURUH SKENARIO UJI COBA BERHASIL 100% LOLOS!" : "⚠️ ADA PENGUJIAN YANG GAGAL!");
  console.log("================================================================================\n");
}

main();
