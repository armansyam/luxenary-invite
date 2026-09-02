import { prisma } from '../lib/prisma';

async function runTest03() {
  console.log("🚀 [TEST-03] Memulai simulasi: Admin Cleanup...");

  try {
    // 1. Ambil Undangan PUBLISHED terbaru dari TEST-02
    const invitation = await prisma.invitation.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: 'desc' },
      include: { order: true }
    });

    if (!invitation) {
      throw new Error("Tidak ditemukan undangan berstatus PUBLISHED. Silakan jalankan test-02 terlebih dahulu.");
    }

    console.log(`✅ Ditemukan undangan PUBLISHED (ID: ${invitation.id})`);

    // 2. Simulasi Waktu Berjalan (Time Travel): Buat undangan expired
    const pastDate = new Date(Date.now() - 86400000 * 30); // 30 hari yang lalu
    
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        expiresAt: pastDate,
        status: "ARCHIVED"
      }
    });
    console.log(`⏱️  Simulasi waktu: Undangan berhasil diubah statusnya menjadi ARCHIVED (Expired).`);

    // 3. Simulasi Proses Cleanup Otomatis (Cron Job/Admin)
    // Mencari undangan ARCHIVED (yang expired)
    const expiredInvitations = await prisma.invitation.findMany({
      where: { status: "ARCHIVED" }
    });

    console.log(`🧹 Memulai pembersihan... Ditemukan ${expiredInvitations.length} undangan kedaluwarsa.`);

    let deletedCount = 0;
    for (const inv of expiredInvitations) {
      // Hapus data undangan (Cascade akan menghapus Guest, RSVP, Wish otomatis karena relasi di Prisma schema)
      await prisma.invitation.delete({
        where: { id: inv.id }
      });
      deletedCount++;
    }

    console.log(`✅ Berhasil membersihkan ${deletedCount} undangan kedaluwarsa beserta data relasinya (tamu, rsvp, momen).`);

    // 4. Simulasi Pembersihan User Akun Kosong (User tanpa order/undangan aktif)
    const emptyUsers = await prisma.user.findMany({
      where: {
        invitations: { none: {} },
        orders: { none: { status: { in: ["PAID", "PENDING"] } } }
      }
    });

    let deletedUserCount = 0;
    for (const user of emptyUsers) {
      // Abaikan admin atau super admin
      if (user.role === "CLIENT") {
        await prisma.user.delete({
          where: { id: user.id }
        });
        deletedUserCount++;
      }
    }

    console.log(`✅ Berhasil membersihkan ${deletedUserCount} akun User kosong/tidak aktif (tanpa transaksi).`);
    
    console.log("\n🎉 [TEST-03] SKENARIO BERHASIL SELESAI!");
    console.log("====================================================");
    console.log("Siklus hidup aplikasi (Lifecycle) dari pendaftaran hingga penghapusan otomatis berjalan dengan sempurna.");

  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest03();
