import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { getAdminSetting } from "./settings";
import { composeTemplateData } from "./themeEngine";
import { renderTemplateFile } from "./renderTemplate";

/**
 * Memeriksa apakah fitur Cold Storage NAS diaktifkan (via DB Admin Setting atau .env)
 */
export async function isNasArchiveEnabled(): Promise<boolean> {
  try {
    const setting = await getAdminSetting("nas_archive_enabled", "");
    if (setting) {
      return setting.toLowerCase() === "true";
    }
  } catch {}
  return process.env.NAS_ARCHIVE_ENABLED === "true";
}

/**
 * Mengambil direktori path root arsip NAS (default: ./data/archives)
 */
export async function getNasArchivePath(): Promise<string> {
  let targetPath = "";
  try {
    targetPath = await getAdminSetting("nas_archive_path", "");
  } catch {}

  if (!targetPath) {
    targetPath = process.env.NAS_ARCHIVE_PATH || "./data/archives";
  }

  return path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
}

/**
 * Helper memeriksa keberadaan berkas
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sinkronisasi undangan ke Cold Storage NAS
 * Dijalankan secara non-blocking saat publish atau saat revisi disimpan.
 */
export async function syncInvitationToNasArchive(invitationId: string): Promise<{
  success: boolean;
  skipped?: boolean;
  slug?: string;
  error?: string;
}> {
  const isEnabled = await isNasArchiveEnabled();
  if (!isEnabled) {
    return { success: true, skipped: true };
  }

  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { media: true },
    });

    if (!inv || !inv.invitationSlug || !inv.themeId) {
      return { success: false, error: "Undangan tidak ditemukan atau belum memiliki slug/tema." };
    }

    const slug = inv.invitationSlug;
    const nasRoot = await getNasArchivePath();
    const clientArchiveDir = path.join(nasRoot, slug);
    const clientAssetsDir = path.join(clientArchiveDir, "assets");

    // Pastikan direktori arsip tersedia
    await fs.promises.mkdir(clientAssetsDir, { recursive: true });

    // 1. Render data HTML mandiri terbaru
    const data = await composeTemplateData(inv.id);
    if (!data) {
      return { success: false, error: "Gagal menyusun data template undangan." };
    }

    let standaloneHtml = await renderTemplateFile(inv.themeId, data, {
      editMode: false,
      invitationId: inv.id,
    });

    // 2. Kumpulkan seluruh URL media (foto & musik)
    const mediaUrlsToProcess = [
      inv.musicUrl,
      ...inv.media.map((m) => m.localPath),
    ].filter(Boolean) as string[];

    // 3. Salin berkas media ke NAS dan ubah URL pada HTML
    for (const rawUrl of mediaUrlsToProcess) {
      try {
        const cleanUrl = rawUrl.split("?")[0];
        let fileName = "";

        if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
          fileName = path.basename(new URL(cleanUrl).pathname);
        } else {
          fileName = path.basename(cleanUrl);
        }

        if (!fileName) continue;

        // Bersihkan nama file agar aman dari path traversal
        fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetAssetPath = path.join(clientAssetsDir, fileName);

        let buffer: Buffer | null = null;

        // Baca dari disk lokal jika file masih ada di VPS (DRAFT/lokal)
        if (cleanUrl.startsWith("/uploads/")) {
          const localSrc = path.join(process.cwd(), "public", cleanUrl);
          if (await fileExists(localSrc)) {
            buffer = await fs.promises.readFile(localSrc);
          }
        }

        // Jika tidak ada di lokal (sudah di R2), ambil via fetch
        if (!buffer && (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://"))) {
          const res = await fetch(cleanUrl);
          if (res.ok) {
            buffer = Buffer.from(await res.arrayBuffer());
          }
        }

        // Tulis berkas fisik ke folder NAS jika buffer tersedia
        if (buffer) {
          await fs.promises.writeFile(targetAssetPath, buffer);
        }

        // Ganti referensi URL lama di HTML menjadi URL stream arsip lokal
        const newAssetUrl = `/archives/${slug}/assets/${fileName}`;
        standaloneHtml = standaloneHtml.split(rawUrl).join(newAssetUrl);
        if (cleanUrl !== rawUrl) {
          standaloneHtml = standaloneHtml.split(cleanUrl).join(newAssetUrl);
        }
      } catch (mediaErr) {
        console.warn(`[NAS Archive] Gagal menyalin media (${rawUrl}):`, mediaErr);
      }
    }

    // 4. Simpan index.html mandiri di folder NAS
    const targetHtmlPath = path.join(clientArchiveDir, "index.html");
    await fs.promises.writeFile(targetHtmlPath, standaloneHtml, "utf-8");

    console.log(`[NAS Archive] Undangan [${slug}] berhasil diarsipkan di: ${clientArchiveDir}`);
    return { success: true, slug };
  } catch (err: any) {
    console.error("[NAS Archive Sync Error]", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Membaca HTML arsip dari NAS jika tersedia
 */
export async function readNasArchiveHtml(slug: string): Promise<string | null> {
  const isEnabled = await isNasArchiveEnabled();
  if (!isEnabled) return null;

  try {
    const nasRoot = await getNasArchivePath();
    const safeSlug = path.basename(slug);
    const htmlPath = path.join(nasRoot, safeSlug, "index.html");

    if (await fileExists(htmlPath)) {
      return await fs.promises.readFile(htmlPath, "utf-8");
    }
  } catch (err) {
    console.warn(`[NAS Archive] Gagal membaca arsip HTML (${slug}):`, err);
  }
  return null;
}

/**
 * Mengambil path fisik aset media di NAS untuk streaming
 */
export async function getNasArchiveAssetPath(slug: string, fileName: string): Promise<string | null> {
  const isEnabled = await isNasArchiveEnabled();
  if (!isEnabled) return null;

  try {
    const nasRoot = await getNasArchivePath();
    const safeSlug = path.basename(slug);
    const safeFile = path.basename(fileName);
    const assetPath = path.join(nasRoot, safeSlug, "assets", safeFile);

    if (await fileExists(assetPath)) {
      return assetPath;
    }
  } catch {}
  return null;
}

/**
 * Memverifikasi status arsip NAS (untuk dasbor admin)
 */
export async function verifyNasArchiveStatus(slug: string): Promise<{
  exists: boolean;
  htmlExists: boolean;
  assetCount: number;
  sizeBytes: number;
  path: string;
}> {
  try {
    const nasRoot = await getNasArchivePath();
    const safeSlug = path.basename(slug);
    const archiveDir = path.join(nasRoot, safeSlug);
    const htmlPath = path.join(archiveDir, "index.html");
    const assetsDir = path.join(archiveDir, "assets");

    const htmlOk = await fileExists(htmlPath);
    let assetCount = 0;
    let sizeBytes = 0;

    if (htmlOk) {
      const htmlStat = await fs.promises.stat(htmlPath);
      sizeBytes += htmlStat.size;
    }

    if (await fileExists(assetsDir)) {
      const files = await fs.promises.readdir(assetsDir);
      assetCount = files.length;
      for (const f of files) {
        try {
          const s = await fs.promises.stat(path.join(assetsDir, f));
          sizeBytes += s.size;
        } catch {}
      }
    }

    return {
      exists: htmlOk,
      htmlExists: htmlOk,
      assetCount,
      sizeBytes,
      path: archiveDir,
    };
  } catch {
    return {
      exists: false,
      htmlExists: false,
      assetCount: 0,
      sizeBytes: 0,
      path: "",
    };
  }
}

/**
 * Menghapus arsip di NAS jika undangan dihapus permanen oleh admin
 */
export async function purgeNasArchive(slug: string): Promise<boolean> {
  try {
    const nasRoot = await getNasArchivePath();
    const safeSlug = path.basename(slug);
    const archiveDir = path.join(nasRoot, safeSlug);

    if (await fileExists(archiveDir)) {
      await fs.promises.rm(archiveDir, { recursive: true, force: true });
      return true;
    }
  } catch (err) {
    console.error(`[NAS Archive] Gagal menghapus arsip (${slug}):`, err);
  }
  return false;
}
