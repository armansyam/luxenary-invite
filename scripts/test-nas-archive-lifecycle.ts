import "dotenv/config";
import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import {
  isNasArchiveEnabled,
  getNasArchivePath,
  syncInvitationToNasArchive,
  readNasArchiveHtml,
  getNasArchiveAssetPath,
  verifyNasArchiveStatus,
  purgeNasArchive,
} from "../lib/nasArchive";

async function runTest() {
  console.log("================================================================================");
  console.log("🧪 TESTING: NAS COLD STORAGE ARCHIVE LIFECYCLE (END-TO-END)");
  console.log("================================================================================");

  const testSlug = `test-vault-${Date.now()}`;
  const nasPath = path.resolve(process.cwd(), "data", "test-archives");

  try {
    // 1. Setup Admin Setting for testing
    console.log("\n[Step 1] Mengonfigurasi AdminSetting untuk pengujian NAS Archive...");
    await prisma.adminSetting.upsert({
      where: { key: "nas_archive_enabled" },
      create: { key: "nas_archive_enabled", value: "true", group: "backup" },
      update: { value: "true" },
    });
    await prisma.adminSetting.upsert({
      where: { key: "nas_archive_path" },
      create: { key: "nas_archive_path", value: nasPath, group: "backup" },
      update: { value: nasPath },
    });

    const isEnabled = await isNasArchiveEnabled();
    const resolvedPath = await getNasArchivePath();
    console.log(`  - NAS Archive Enabled : ${isEnabled}`);
    console.log(`  - NAS Archive Path    : ${resolvedPath}`);

    if (!isEnabled || resolvedPath !== nasPath) {
      throw new Error("Gagal mengonfigurasi setting NAS archive.");
    }
    console.log("  ✅ Konfigurasi NAS berhasil aktif.");

    // 2. Cari atau buat dummy invitation dengan status PUBLISHED
    console.log("\n[Step 2] Menyiapkan data undangan uji coba...");
    let user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      throw new Error("Tidak ada user di database untuk pengujian.");
    }

    // Buat file dummy cover di public/uploads
    const dummyUploadDir = path.join(process.cwd(), "public", "uploads", "invitations", "test-vault-id");
    await fs.promises.mkdir(dummyUploadDir, { recursive: true });
    const dummyCoverFile = path.join(dummyUploadDir, "cover.webp");
    await fs.promises.writeFile(dummyCoverFile, Buffer.from("RIFF....WEBPVP8 ...DUMMY_IMAGE_DATA..."));

    const testInv = await prisma.invitation.create({
      data: {
        userId: user.id,
        invitationSlug: testSlug,
        groomSlug: "dimas",
        brideSlug: "clarissa",
        themeId: "candani",
        status: "PUBLISHED",
        groomName: "Raden Mas Dimas",
        brideName: "Raden Ajeng Clarissa",
        eventData: JSON.stringify([
          { title: "Akad", date: "2026-12-26" },
        ]),
        media: {
          create: [
            {
              mediaSlot: "LANDING_COVER",
              localPath: "/uploads/invitations/test-vault-id/cover.webp",
            },
          ],
        },
      },
    });

    console.log(`  - Undangan dibuat ID: ${testInv.id} | Slug: /${testInv.invitationSlug}`);

    // 3. Eksekusi Sinkronisasi ke NAS Archive
    console.log("\n[Step 3] Mengeksekusi syncInvitationToNasArchive()...");
    const syncRes = await syncInvitationToNasArchive(testInv.id);
    console.log("  - Hasil Sinkronisasi:", syncRes);

    if (!syncRes.success) {
      throw new Error(`Sync NAS gagal: ${syncRes.error}`);
    }

    // 4. Verifikasi Keberadaan Berkas Fisik di Disk
    console.log("\n[Step 4] Verifikasi berkas fisik pada folder NAS...");
    const clientArchiveDir = path.join(nasPath, testSlug);
    const htmlFile = path.join(clientArchiveDir, "index.html");
    const assetFile = path.join(clientArchiveDir, "assets", "cover.webp");

    const htmlExists = fs.existsSync(htmlFile);
    const assetExists = fs.existsSync(assetFile);

    console.log(`  - index.html exists : ${htmlExists} (${htmlExists ? fs.statSync(htmlFile).size + " bytes" : "0"})`);
    console.log(`  - cover.webp exists : ${assetExists} (${assetExists ? fs.statSync(assetFile).size + " bytes" : "0"})`);

    if (!htmlExists || !assetExists) {
      throw new Error("Berkas index.html atau assets di folder NAS tidak ditemukan!");
    }

    // Periksa apakah URL di HTML telah di-rewrite ke path /archives/[slug]/assets/
    const bakedHtml = await fs.promises.readFile(htmlFile, "utf-8");
    const expectedAssetUrl = `/archives/${testSlug}/assets/cover.webp`;
    const isUrlRewritten = bakedHtml.includes(expectedAssetUrl);
    console.log(`  - Asset URL Rewritten ke [${expectedAssetUrl}]: ${isUrlRewritten}`);

    if (!isUrlRewritten) {
      throw new Error("URL media di dalam index.html arsip NAS belum berhasil di-rewrite ke path relatif/arsip!");
    }
    console.log("  ✅ Berkas mandiri & rewrite URL terverifikasi 100% valid.");

    // 5. Uji Pembacaan Arsip melalui Helper Engine
    console.log("\n[Step 5] Menguji readNasArchiveHtml() dan getNasArchiveAssetPath()...");
    const readHtml = await readNasArchiveHtml(testSlug);
    const resolvedAssetPath = await getNasArchiveAssetPath(testSlug, "cover.webp");

    console.log(`  - readNasArchiveHtml() length : ${readHtml ? readHtml.length : 0} chars`);
    console.log(`  - getNasArchiveAssetPath()   : ${resolvedAssetPath}`);

    if (!readHtml || !resolvedAssetPath) {
      throw new Error("Helper readNasArchiveHtml atau getNasArchiveAssetPath mengembalikan null.");
    }
    console.log("  ✅ Pembacaan arsip dan aset media berhasil.");

    // 6. Uji verifyNasArchiveStatus (untuk Dasbor Admin)
    console.log("\n[Step 6] Menguji verifyNasArchiveStatus()...");
    const statusReport = await verifyNasArchiveStatus(testSlug);
    console.log("  - Status Report:", statusReport);

    if (!statusReport.exists || statusReport.assetCount < 1 || statusReport.sizeBytes === 0) {
      throw new Error("Status report arsip NAS tidak valid.");
    }
    console.log("  ✅ Status report admin terverifikasi.");

    // 7. Cleanup Data Uji Coba
    console.log("\n[Step 7] Membersihkan data uji coba...");
    await purgeNasArchive(testSlug);
    await prisma.invitation.delete({ where: { id: testInv.id } });
    if (fs.existsSync(dummyUploadDir)) {
      await fs.promises.rm(dummyUploadDir, { recursive: true, force: true });
    }
    if (fs.existsSync(nasPath)) {
      await fs.promises.rm(nasPath, { recursive: true, force: true });
    }

    // Kembalikan status setting ke default (dormant: false)
    await prisma.adminSetting.update({
      where: { key: "nas_archive_enabled" },
      data: { value: "false" },
    });
    await prisma.adminSetting.update({
      where: { key: "nas_archive_path" },
      data: { value: "./data/archives" },
    });

    console.log("  ✅ Pembersihan data uji selesai. Setting dikembalikan ke default dormant (false).");

    console.log("\n================================================================================");
    console.log("🎉 SEMUA PENGUJIAN NAS ARCHIVE LIFECYCLE BERHASIL LULUS 100% (PASS)");
    console.log("================================================================================");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    // Cleanup if failure
    try {
      await prisma.invitation.deleteMany({ where: { invitationSlug: testSlug } });
      if (fs.existsSync(nasPath)) await fs.promises.rm(nasPath, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
