/**
 * Google Drive Public Folder Photo Extractor (API v3)
 *
 * Cara kerja:
 * 1. Client paste link folder Google Drive (yang sudah di-set "Anyone with the link - Viewer")
 * 2. Kita extract Folder ID dari URL
 * 3. Fetch daftar file menggunakan Google Drive API v3 (menggunakan Server API Key)
 * 4. Build direct image URL: https://lh3.googleusercontent.com/d/{fileId}=w1200
 *
 * Syarat dari sisi client:
 * - Folder Google Drive harus di-set "Anyone with the link can view" (Viewer)
 *
 * Syarat dari sisi Admin:
 * - Menyediakan GOOGLE_API_KEY di environment variables
 */

import { logger } from "./logger";

interface CacheEntry {
  photos: string[];
  timestamp: number;
}

const driveFolderCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit cache

export function extractGoogleDriveFolderId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  if (trimmed.length >= 25 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }

  return null;
}

export async function getGoogleDriveFolderPhotos(folderUrlOrId: string): Promise<string[]> {
  if (!folderUrlOrId || typeof folderUrlOrId !== "string") return [];

  const trimmed = folderUrlOrId.trim();
  if (!trimmed) return [];

  const folderId = extractGoogleDriveFolderId(trimmed);
  if (!folderId) {
    logger.warn("DriveHelper", "Folder ID tidak dapat diekstrak", { input: trimmed });
    return [];
  }

  const cached = driveFolderCache.get(folderId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.photos;
  }

  // Gunakan API Key dari env
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    logger.warn("DriveHelper", "GOOGLE_API_KEY tidak dikonfigurasi; fitur Drive dinonaktifkan");
    return [];
  }

  try {
    const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${apiKey}&fields=files(id)&pageSize=100`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn("DriveHelper", "Drive API menolak permintaan; pastikan folder publik dan API key valid", { folderId, status: response.status });
      return [];
    }

    const data = await response.json();
    let files = data.files || [];

    // Jika tidak ada foto langsung di root, otomatis telusuri subfolder (misal: "1. Galeri Sellected")
    if (files.length === 0) {
      try {
        const subQ = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed=false`;
        const subUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(subQ)}&key=${apiKey}&fields=files(id,name)&pageSize=20`;
        const subRes = await fetch(subUrl, {
          method: "GET",
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        });

        if (subRes.ok) {
          const subData = await subRes.json();
          const subfolders: Array<{ id: string; name: string }> = subData.files || [];
          if (subfolders.length > 0) {
            // Prioritaskan subfolder dengan kata kunci galeri / gallery / selected / sellected
            const targetFolder = subfolders.find((f) => /galeri|gallery|select/i.test(f.name)) || subfolders[0];
            if (targetFolder) {
              const subImgQ = `'${targetFolder.id}' in parents and mimeType contains 'image/' and trashed=false`;
              const subImgUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(subImgQ)}&key=${apiKey}&fields=files(id)&pageSize=100`;
              const subImgRes = await fetch(subImgUrl, {
                method: "GET",
                headers: { "Accept": "application/json" },
                signal: AbortSignal.timeout(10000),
              });
              if (subImgRes.ok) {
                const subImgData = await subImgRes.json();
                if (subImgData.files && subImgData.files.length > 0) {
                  files = subImgData.files;
                  logger.info("DriveHelper", "Foto diambil dari subfolder", { folderId, subfolder: targetFolder.name, count: files.length });
                }
              }
            }
          }
        }
      } catch (subErr) {
        logger.warn("DriveHelper", "Gagal menelusuri subfolder", { folderId, error: subErr instanceof Error ? subErr.message : String(subErr) });
      }
    }

    if (files.length === 0) {
      logger.warn("DriveHelper", "Tidak ada gambar di folder atau subfolder", { folderId });
      return [];
    }

    // Build direct image URLs via Google's CDN thumbnail service
    const photoUrls = files.map(
      (file: any) => `https://lh3.googleusercontent.com/d/${file.id}=w1200`
    );

    driveFolderCache.set(folderId, { photos: photoUrls, timestamp: Date.now() });
    logger.info("DriveHelper", "Foto ditemukan via Drive API v3", { folderId, count: photoUrls.length });
    
    return photoUrls;
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      logger.warn("DriveHelper", "Timeout saat mengakses Drive API", { folderId });
    } else {
      logger.warn("DriveHelper", "Gagal mengambil foto Drive", { folderId, error: err?.message || String(err) });
    }
    return [];
  }
}
