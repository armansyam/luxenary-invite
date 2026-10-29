import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { isSafePathSegment, removeIfExists } from "./fsSafe";

// Determine Storage Provider
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "local";

// Configure S3 Client if needed
export const s3Client = STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3"
  ? new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    })
  : null;

/** Basis URL publik berkas di R2/S3 tanpa garis miring akhir; kosong bila belum dikonfigurasi. */
export function storagePublicBaseUrl(): string {
  return (process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
}

/**
 * Path absolut berkas lokal untuk URL `/uploads/...`, atau null bila URL bukan unggahan lokal atau keluar dari
 * public/uploads (mis. `/uploads/../../.env`). URL media dapat berasal dari input klien, jadi setiap baca/hapus berkas
 * lokal wajib lewat sini.
 */
export function resolveLocalUploadPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/uploads/")) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.split("?")[0]);
  } catch {
    return null;
  }
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const absolute = path.resolve(uploadsRoot, "." + decoded.slice("/uploads".length));
  return absolute.startsWith(uploadsRoot + path.sep) ? absolute : null;
}

const GOOGLE_DRIVE_CDN_HOST = "lh3.googleusercontent.com";

/**
 * Isi media yang disalin server ke portofolio: berkas di public/uploads, atau HTTPS dari penyimpanan platform dan CDN
 * Google Drive saja. URL media berasal dari input klien; mengambil host lain dari server membuka akses ke layanan
 * internal (SSRF) dan hasilnya ikut diterbitkan di portofolio publik. Redirect ditolak karena dapat mengarah ke host
 * internal. Null bila sumber tidak diizinkan atau berkas lokal tidak ada.
 */
export async function readPortfolioMediaSource(url: string): Promise<Buffer | null> {
  const localPath = resolveLocalUploadPath(url);
  if (localPath) return fs.existsSync(/*turbopackIgnore: true*/ localPath) ? fs.promises.readFile(/*turbopackIgnore: true*/ localPath) : null;

  let parsed: URL;
  let storageHost = "";
  try {
    parsed = new URL(url);
    if (storagePublicBaseUrl()) storageHost = new URL(storagePublicBaseUrl()).host;
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || (parsed.host !== storageHost && parsed.host !== GOOGLE_DRIVE_CDN_HOST)) return null;

  const res = await fetch(parsed, { redirect: "error" });
  if (!res.ok) throw new Error(`Gagal fetch: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Apakah URL media adalah berkas unggahan milik undangan ini (lokal atau R2), sehingga boleh dihapus atas namanya. */
export function isInvitationOwnedUpload(url: string | null | undefined, invitationId: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0];
  const local = resolveLocalUploadPath(clean);
  if (local) {
    return local.startsWith(path.join(process.cwd(), "public", "uploads", "invitations", invitationId) + path.sep);
  }
  const base = storagePublicBaseUrl();
  return Boolean(base) && clean.startsWith(`${base}/invitations/${invitationId}/`) && !clean.includes("/../");
}

/**
 * Unified Upload Handler (VPS vs R2)
 * @param buffer - File Buffer
 * @param relativePath - e.g. "invitations/klien/cover.webp"
 * @param mimeType - e.g. "image/webp"
 * @param forceLocal - If true, bypasses R2 and forces save to local disk
 * @returns Public URL string
 */
export async function uploadFile(buffer: Buffer, relativePath: string, mimeType: string, forceLocal: boolean = false): Promise<string> {
  if (!forceLocal && (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3")) {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) {
      throw new Error("S3 Credentials not configured properly in .env");
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: relativePath,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await s3Client.send(command);

    return `${storagePublicBaseUrl()}/${relativePath}`;
  }

  else {
    // Local Upload (Default)
    const absolutePath = path.join(process.cwd(), "public", "uploads", relativePath);
    const directory = path.dirname(absolutePath);

    try {
      await fs.promises.access(directory);
    } catch {
      await fs.promises.mkdir(directory, { recursive: true });
    }

    await fs.promises.writeFile(absolutePath, buffer);
    return `/uploads/${relativePath}`;
  }
}

// Akses publik R2 (custom domain / r2.dev) berlaku untuk seluruh isi bucket, jadi prefix apa pun di bucket media tetap
// terbuka bagi siapa saja yang memegang URL-nya. Berkas privat (bukti transfer: rekening dan nominal) disimpan di bucket
// privat S3_BACKUP_BUCKET_NAME di bawah prefix private/, atau di data/private/ pada disk server bila bucket itu tidak
// tersedia. DB menyimpan referensi berskema, bukan URL; isinya hanya dibuka lewat tautan bertanda tangan.
const PRIVATE_BUCKET_SCHEME = "private-bucket:";
const PRIVATE_DISK_SCHEME = "private-disk:";

function privateBucketName(): string | null {
  if (STORAGE_PROVIDER !== "r2" && STORAGE_PROVIDER !== "s3") return null;
  const bucket = process.env.S3_BACKUP_BUCKET_NAME?.trim();
  if (!bucket || bucket === process.env.S3_BUCKET_NAME?.trim()) return null;
  return bucket;
}

export type PrivateFileRef = `${typeof PRIVATE_BUCKET_SCHEME}${string}` | `${typeof PRIVATE_DISK_SCHEME}${string}`;

export function isPrivateFileRef(ref: string | null | undefined): ref is PrivateFileRef {
  return Boolean(ref && (ref.startsWith(PRIVATE_BUCKET_SCHEME) || ref.startsWith(PRIVATE_DISK_SCHEME)));
}

function parsePrivateFileRef(ref: string): { location: "bucket" | "disk"; key: string } | null {
  const location = ref.startsWith(PRIVATE_BUCKET_SCHEME) ? "bucket" : ref.startsWith(PRIVATE_DISK_SCHEME) ? "disk" : null;
  if (!location) return null;
  const key = ref.slice((location === "bucket" ? PRIVATE_BUCKET_SCHEME : PRIVATE_DISK_SCHEME).length);
  if (!key || key.includes("\\") || key.split("/").some((seg) => !seg || seg === "." || seg === "..")) return null;
  return { location, key };
}

function privateDiskPath(key: string): string {
  return path.join(process.cwd(), "data", "private", key);
}

function requirePrivateBucket(): string {
  const bucket = privateBucketName();
  if (!bucket || !s3Client) throw new Error("Bucket privat (S3_BACKUP_BUCKET_NAME) tidak dikonfigurasi; berkas privat di bucket tidak dapat diakses.");
  return bucket;
}

/** Simpan berkas yang tidak boleh dapat dibuka publik. Mengembalikan referensi untuk DB, bukan URL. */
export async function uploadPrivateFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  const bucket = privateBucketName();
  const ref = (bucket && s3Client ? PRIVATE_BUCKET_SCHEME : PRIVATE_DISK_SCHEME) + key;
  if (!parsePrivateFileRef(ref)) throw new Error(`Kunci berkas privat tidak valid: ${JSON.stringify(key)}`);

  if (bucket && s3Client) {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `private/${key}`,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "private, no-store",
    }));
    return ref;
  }

  const absolutePath = privateDiskPath(key);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, buffer);
  return ref;
}

/** Isi berkas privat, atau null bila referensinya tidak valid atau berkasnya tidak ada. */
export async function readPrivateFile(ref: string): Promise<Buffer | null> {
  const parsed = parsePrivateFileRef(ref);
  if (!parsed) return null;

  if (parsed.location === "bucket") {
    try {
      const data = await s3Client!.send(new GetObjectCommand({ Bucket: requirePrivateBucket(), Key: `private/${parsed.key}` }));
      return data.Body ? Buffer.from(await data.Body.transformToByteArray()) : null;
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  try {
    return await fs.promises.readFile(privateDiskPath(parsed.key));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function deletePrivateFile(ref: string): Promise<boolean> {
  const parsed = parsePrivateFileRef(ref);
  if (!parsed) return false;
  if (parsed.location === "bucket") {
    await s3Client!.send(new DeleteObjectCommand({ Bucket: requirePrivateBucket(), Key: `private/${parsed.key}` }));
    return true;
  }
  const absolutePath = privateDiskPath(parsed.key);
  if (!fs.existsSync(absolutePath)) return false;
  await fs.promises.unlink(absolutePath);
  return true;
}

/**
 * Unified Delete Handler (VPS vs R2)
 * @param publicUrl - The full public URL stored in DB (e.g. https://pub-xxx.r2.dev/folder/file.png)
 * @returns boolean indicating success
 */
export async function deleteFile(publicUrl: string | null): Promise<boolean> {
  if (!publicUrl) return false;

  try {
    if (isPrivateFileRef(publicUrl)) return await deletePrivateFile(publicUrl);

    if (publicUrl.startsWith("http") && (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3")) {
      const bucketName = process.env.S3_BUCKET_NAME;
      if (!bucketName || !s3Client) return false;

      // Hanya objek di bawah basis URL bucket sendiri; URL eksternal (Google Drive, dsb.) bukan milik kita.
      const base = storagePublicBaseUrl();
      const cleanUrl = publicUrl.split("?")[0];
      if (!base || !cleanUrl.startsWith(`${base}/`)) return false;
      const relativePath = decodeURIComponent(cleanUrl.slice(base.length + 1));
      if (!relativePath || relativePath.split("/").includes("..")) return false;

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: relativePath,
      });

      await s3Client.send(command);
      return true;
    } 
    
    // Local File Deletion
    const absolutePath = resolveLocalUploadPath(publicUrl);
    if (absolutePath) {
      if (fs.existsSync(/*turbopackIgnore: true*/ absolutePath)) {
        await fs.promises.unlink(absolutePath);
        return true;
      }
    }
  } catch (error) {
    logger.error("Storage", "Gagal menghapus berkas", error, { publicUrl });
  }
  
  return false;
}

/**
 * Background job to sync local drafts to R2 upon publishing.
 * It scans the invitation's media and music URLs. If any URL is local, it uploads to R2 and updates DB.
 */
export async function syncDraftToR2(invitationId: string): Promise<void> {
  if (STORAGE_PROVIDER !== "r2" && STORAGE_PROVIDER !== "s3") return;
  
  const bucketName = process.env.S3_BUCKET_NAME;
  const customDomain = storagePublicBaseUrl();
  if (!bucketName || !customDomain || !s3Client) return;

  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { media: true }
    });
    if (!inv) return;

    // Sinkronisasi ganda non-blocking ke NAS Cold Storage selagi berkas fisik masih ada di disk lokal VPS
    import("./nasArchive").then(({ syncInvitationToNasArchive }) => {
      syncInvitationToNasArchive(invitationId).catch((err) => {
        logger.warn("SyncDraftToR2", "Sinkronisasi arsip NAS gagal", { invitationId, error: err instanceof Error ? err.message : String(err) });
      });
    }).catch((err) => logger.error("SyncDraftToR2", "Modul arsip NAS gagal dimuat", err));

    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
    };

    // URL media diisi klien; tanpa cek kepemilikan, path unggahan undangan lain ikut dipindah ke R2 lalu dihapus dari disk.
    const syncSingleUrl = async (url: string | null): Promise<string | null> => {
      const localFilePath = resolveLocalUploadPath(url);
      if (!url || !localFilePath || !isInvitationOwnedUpload(url, invitationId)) return url;

      const cleanUrl = url.split("?")[0];
      try {
        const buffer = await fs.promises.readFile(/*turbopackIgnore: true*/ localFilePath);
        const ext = path.extname(cleanUrl).toLowerCase();
        const mime = mimeTypes[ext] || "application/octet-stream";
        // Remove leading "/uploads/" to get relative path for R2
        const relativePath = cleanUrl.substring(9); 
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: relativePath,
          Body: buffer,
          ContentType: mime,
          CacheControl: "public, max-age=31536000, immutable"
        });
        await s3Client.send(command);
        
        // Salinan lokal tidak lagi dipakai setelah terunggah ke R2; dihapus tanpa menunggu.
        void removeIfExists(localFilePath);
        
        return `${customDomain}/${relativePath}`;
      } catch (err) {
        logger.error("SyncDraftToR2", "Gagal mengunggah berkas ke R2; URL lokal dipertahankan", err, { url });
        return url;
      }
    };

    // Sync Music
    if (inv.musicUrl && inv.musicUrl.startsWith("/uploads/")) {
      const newMusicUrl = await syncSingleUrl(inv.musicUrl);
      if (newMusicUrl !== inv.musicUrl) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { musicUrl: newMusicUrl }
        });
      }
    }

    // Sync Media (Cover, Gallery, etc)
    for (const m of inv.media) {
      if (m.localPath && m.localPath.startsWith("/uploads/")) {
        const newLocalPath = await syncSingleUrl(m.localPath);
        if (newLocalPath !== m.localPath) {
          await prisma.invitationMedia.update({
            where: { id: m.id },
            data: { localPath: newLocalPath }
          });
        }
      }
    }

    // Unggahan yang URL-nya disimpan di featureSettings (gambar QRIS amplop, logo vendor) ikut dipindah; tanpa ini
    // berkas itu tinggal di disk VPS walau R2 aktif dan hilang bila server diganti. syncSingleUrl hanya memindah
    // berkas milik undangan ini, nilai lain dikembalikan apa adanya.
    const syncJson = async (value: unknown): Promise<unknown> => {
      if (typeof value === "string") return value.startsWith("/uploads/") ? syncSingleUrl(value) : value;
      if (Array.isArray(value)) return Promise.all(value.map((item) => syncJson(item)));
      if (value && typeof value === "object") {
        const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await syncJson(item)] as const));
        return Object.fromEntries(entries);
      }
      return value;
    };
    if (inv.featureSettings) {
      const syncedSettings = await syncJson(inv.featureSettings);
      if (JSON.stringify(syncedSettings) !== JSON.stringify(inv.featureSettings)) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { featureSettings: syncedSettings as Prisma.InputJsonValue },
        });
      }
    }

    // [CRITICAL FIX] Race Condition Prevention:
    // After R2 sync completes, the local files are deleted.
    // If staticPublisher ran BEFORE this finished, it baked the old local URLs into HTML.
    // We MUST re-bake the HTML here to inject the new R2 URLs!
    try {
      const { buildAndSavePublishedHtml } = await import("./staticPublisher");
      await buildAndSavePublishedHtml(invitationId);
    } catch (publishErr) {
      logger.error("SyncDraftToR2", "Gagal membangun ulang HTML statis setelah sinkronisasi R2", publishErr, { invitationId });
    }

  } catch (err) {
    logger.error("SyncDraftToR2", "Sinkronisasi draf ke R2 gagal", err, { invitationId });
  }
}

/**
 * Sync Database Retention Settings to Cloudflare R2 Lifecycle Rules
 * @param days - Number of days to retain objects
 */
export async function syncR2LifecycleRule(days: number): Promise<boolean> {
  if (STORAGE_PROVIDER !== "r2" && STORAGE_PROVIDER !== "s3") return false;
  if (!s3Client || !process.env.S3_BUCKET_NAME) return false;

  try {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "Auto-Cleanup-Rule",
            Status: "Enabled",
            Filter: {
              Prefix: "guest-memories/", // Terisolasi aman: hanya menghapus foto kenangan tamu sementara, tidak menyentuh cover/portofolio
            },
            Expiration: {
              Days: days,
            },
          },
        ],
      },
    });

    await s3Client.send(command);
    logger.info("R2Lifecycle", "Aturan lifecycle R2 diperbarui", { days });
    return true;
  } catch (err) {
    logger.error("R2Lifecycle", "Gagal memperbarui aturan lifecycle R2", err, { days });
    return false;
  }
}

/**
 * Upload Portfolio File (HTML or Asset) with Hybrid Storage Support
 */
export async function uploadPortfolioFile(buffer: Buffer, relativePath: string, mimeType: string): Promise<string> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) throw new Error("S3 Credentials not configured");

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `portfolio/${relativePath}`,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable"
    });

    await s3Client.send(command);
    const publicUrl = (process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL)?.replace(/\/$/, "");
    return `${publicUrl}/portfolio/${relativePath}`;
  } else {
    // Local
    const absolutePath = path.join(process.cwd(), "public", "portfolio", relativePath);
    const directory = path.dirname(absolutePath);
    try {
      await fs.promises.access(directory);
    } catch {
      await fs.promises.mkdir(directory, { recursive: true });
    }
    await fs.promises.writeFile(absolutePath, buffer);
    return `/portfolio/${relativePath}`;
  }
}

/**
 * List all Portfolio Slugs
 */
export async function listPortfolioSlugs(): Promise<string[]> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return [];
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "portfolio/",
        Delimiter: "/",
      });
      const data = await s3Client.send(command);
      if (!data.Contents) return [];
      return data.Contents
        .filter(obj => obj.Key && obj.Key.endsWith(".html"))
        .map(obj => path.basename(obj.Key!).replace(".html", ""));
    } catch (err) {
      logger.error("PortfolioList", "Gagal membaca daftar portofolio dari R2", err);
      throw err;
    }
  } else {
    const portfolioDir = path.join(process.cwd(), "public", "portfolio");
    try {
      const files = await fs.promises.readdir(portfolioDir);
      return files.filter(f => f.endsWith(".html")).map(f => f.replace(".html", ""));
    } catch (err) {
      // Folder portofolio belum ada sampai portofolio pertama dibuat.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }
}

/**
 * Delete Portfolio and its Assets
 */
export async function deletePortfolio(slug: string): Promise<void> {
  // Slug menjadi path yang dihapus rekursif (`public/portfolio/assets/<slug>/`).
  if (!isSafePathSegment(slug)) {
    throw new Error(`Slug portofolio tidak valid: ${JSON.stringify(slug)}`);
  }
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return;

    // Delete HTML
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: `portfolio/${slug}.html`,
      }));
    } catch (e) { logger.error("DeletePortfolio", "Gagal menghapus HTML portofolio di R2", e, { slug }); }

    // Delete Assets
    try {
      const prefix = `portfolio/assets/${slug}/`;
      const listCmd = new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix });
      const listed = await s3Client.send(listCmd);
      if (listed.Contents && listed.Contents.length > 0) {
        for (const obj of listed.Contents) {
          if (obj.Key) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key }));
          }
        }
      }
    } catch (e) { logger.error("DeletePortfolio", "Gagal menghapus aset portofolio di R2", e, { slug }); }
  } else {
    const htmlPath = path.join(process.cwd(), "public", "portfolio", `${slug}.html`);
    const assetDir = path.join(process.cwd(), "public", "portfolio", "assets", slug);
    try {
      if (fs.existsSync(htmlPath)) await fs.promises.unlink(htmlPath);
      if (fs.existsSync(assetDir)) await fs.promises.rm(assetDir, { recursive: true, force: true });
    } catch (e) { logger.error("DeletePortfolio", "Gagal menghapus portofolio lokal", e, { slug }); }
  }
}

/**
 * Get Portfolio Metadata (Decoupled from DB)
 */
export async function getPortfolioMetadata(slug: string): Promise<any | null> {
  if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName || !s3Client) return null;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: `portfolio/assets/${slug}/metadata.json`,
      });
      const data = await s3Client.send(command);
      if (!data.Body) return null;
      const bodyString = await data.Body.transformToString();
      return JSON.parse(bodyString);
    } catch {
      return null;
    }
  } else {
    const metadataPath = path.join(process.cwd(), "public", "portfolio", "assets", slug, "metadata.json");
    try {
      const content = await fs.promises.readFile(metadataPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
