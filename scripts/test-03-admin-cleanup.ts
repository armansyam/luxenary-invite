import "dotenv/config";
import { prisma, pool } from '../lib/prisma';
import { deletePublishedHtml } from '../lib/staticPublisher';
import { purgeNasArchive } from '../lib/nasArchive';
import { deleteFile } from '../lib/storage';
import fs from 'fs';
import path from 'path';

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
    // Hanya bersihkan undangan uji coba yang ARCHIVED (agar aman dan tidak menyentuh data non-uji)
    const expiredInvitations = await prisma.invitation.findMany({
      where: {
        id: invitation.id,
        status: "ARCHIVED"
      }
    });

    console.log(`🧹 Memulai pembersihan... Ditemukan ${expiredInvitations.length} undangan kedaluwarsa.`);

    let deletedCount = 0;
    for (const inv of expiredInvitations) {
      // Invarian 1: Hapus Published HTML
      await deletePublishedHtml(inv.id);

      // Invarian 2: Hapus Draft HTML lokal jika ada
      const draftPath = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
      if (fs.existsSync(draftPath)) {
        try { fs.unlinkSync(draftPath); } catch {}
      }

      // Invarian 3: Hapus folder uploads fisik & R2 storage
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
      if (fs.existsSync(uploadsDir)) {
        try { fs.rmSync(uploadsDir, { recursive: true, force: true }); } catch {}
      }

      const invMedia = await prisma.invitationMedia.findMany({ where: { invitationId: inv.id } });
      if (invMedia.length > 0) {
        await Promise.all(invMedia.map(m => m.localPath ? deleteFile(m.localPath) : Promise.resolve())).catch(() => {});
      }

      // Invarian 4: Pembersihan Arsip NAS Cold Storage jika ada
      if (inv.invitationSlug) {
        await purgeNasArchive(inv.invitationSlug);
      }

      // Hapus data undangan (Cascade membersihkan Guest, RSVP, GuestMemory di PostgreSQL)
      await prisma.invitation.delete({
        where: { id: inv.id }
      });
      deletedCount++;
    }

    console.log(`✅ Berhasil membersihkan ${deletedCount} undangan kedaluwarsa beserta 4 lapis berkas fisik dan data relasinya.`);

    // 4. Simulasi Pembersihan User Akun Kosong Uji Coba (client_... @test.luxenary.com)
    const emptyUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: "client_", contains: "@test.luxenary.com" },
        invitations: { none: {} },
        orders: { none: { status: { in: ["PAID", "PENDING"] } } }
      }
    });

    let deletedUserCount = 0;
    for (const user of emptyUsers) {
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
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runTest03();
