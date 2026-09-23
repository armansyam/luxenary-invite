import "dotenv/config";
import { prisma, pool } from '../lib/prisma';
import { encryptPin } from '../lib/pinEncryption';
import { buildAndSavePublishedHtml } from '../lib/staticPublisher';
import { randomUUID } from 'crypto';

async function runTest02() {
  console.log("🚀 [TEST-02] Memulai simulasi: Setup Undangan -> Publish...");

  try {
    // 1. Ambil Undangan DRAFT terbaru
    const invitation = await prisma.invitation.findFirst({
      where: { status: "DRAFT" },
      orderBy: { createdAt: 'desc' }
    });

    if (!invitation) {
      throw new Error("Tidak ditemukan undangan berstatus DRAFT. Silakan jalankan test-01 terlebih dahulu.");
    }
    
    console.log(`✅ Ditemukan undangan DRAFT (ID: ${invitation.id}) milik User (ID: ${invitation.userId})`);

    // 2. Simulasi Klien Mengisi Data Acara (Event Data)
    const dummyEventData = JSON.stringify([
      {
        id: "event-akad-123",
        title: "Akad Nikah",
        date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 hari dari sekarang
        timeStart: "08:00",
        timeEnd: "10:00",
        locationName: "Masjid Agung",
        locationAddress: "Jl. Masjid Raya No. 1",
        mapsUrl: "https://maps.google.com/..."
      },
      {
        id: "event-resepsi-123",
        title: "Resepsi Pernikahan",
        date: new Date(Date.now() + 86400000 * 30).toISOString(),
        timeStart: "11:00",
        timeEnd: "14:00",
        locationName: "Ballroom Hotel",
        locationAddress: "Jl. Sudirman No. 123",
        mapsUrl: "https://maps.google.com/..."
      }
    ]);

    const dummyLoveStory = JSON.stringify([
      { title: "Awal Bertemu", year: "2020", description: "Kami bertemu di kampus..." },
      { title: "Lamaran", year: "2023", description: "Dia melamar saya di pantai..." }
    ]);

    // 3. Generate PIN Resepsionis (Enkripsi simetris dua arah AES-256-GCM)
    const rawPin = "123456";
    const encryptedPin = encryptPin(rawPin);

    // 4. Update data dan ubah status ke PUBLISHED
    const publishedInv = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        eventData: dummyEventData,
        loveStory: dummyLoveStory,
        staffPin: encryptedPin,
        status: "PUBLISHED",
        publishedAt: new Date(),
        // Setup expires at (Contoh: 1 tahun sejak publish)
        expiresAt: new Date(Date.now() + 86400000 * 365)
      }
    });

    // 4b. Bakar HTML Statis Kanonikal ke disk (Single Source of Truth)
    await buildAndSavePublishedHtml(publishedInv.id);

    console.log(`✅ Data Acara, Love Story, dan PIN (AES-256-GCM) berhasil disimpan.`);
    console.log(`✅ HTML Statis Kanonikal berhasil dibakar ke public/published/ids/${publishedInv.id}.html.`);
    console.log(`✅ Status Undangan berhasil diubah menjadi: ${publishedInv.status}`);
    console.log(`✅ Undangan berhasil diterbitkan! Slug: /${publishedInv.invitationSlug}`);
    
    // 5. Tambahkan 2 Tamu (Guest) dengan Token QR Unik (randomUUID)
    const guest1 = await prisma.guest.create({
      data: {
        invitationId: publishedInv.id,
        name: "Budi Santoso",
        slug: "budi-santoso",
        category: "VIP",
        guestQuota: 2,
        qrToken: randomUUID(),
        isTokenRedeemed: false
      }
    });
    
    const guest2 = await prisma.guest.create({
      data: {
        invitationId: publishedInv.id,
        name: "Siti Aminah",
        slug: "siti-aminah",
        category: "UMUM",
        guestQuota: 1,
        qrToken: randomUUID(),
        isTokenRedeemed: false
      }
    });

    console.log(`✅ 2 Tamu Dummy berhasil dibuat untuk pengujian Resepsionis.`);
    console.log("\n🎉 [TEST-02] SKENARIO BERHASIL SELESAI!");
    console.log("====================================================");
    console.log(`INVITATION URL : /${publishedInv.invitationSlug}`);
    console.log(`RECEPTIONIST   : /scanner/${publishedInv.id}`);
    console.log(`PIN PANITIA    : ${rawPin}`);
    console.log(`GUEST 1 TOKEN  : ${guest1.qrToken}`);
    console.log(`GUEST 2 TOKEN  : ${guest2.qrToken}`);

  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runTest02();
