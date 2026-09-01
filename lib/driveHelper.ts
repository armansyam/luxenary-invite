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
    console.warn("[DriveHelper] Folder ID tidak dapat diekstrak dari:", trimmed);
    return [];
  }

  const cached = driveFolderCache.get(folderId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.photos;
  }

  // Gunakan API Key dari env
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("[DriveHelper] GOOGLE_API_KEY tidak dikonfigurasi. Fitur Drive dinonaktifkan.");
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
      console.warn(`[DriveHelper] Gagal mengambil data via API (${response.status}). Pastikan folder public dan API Key valid.`);
      return [];
    }

    const data = await response.json();
    const files = data.files || [];

    if (files.length === 0) {
      console.warn("[DriveHelper] Tidak ada file gambar ditemukan di folder.");
      return [];
    }

    // Build direct image URLs via Google's CDN thumbnail service
    const photoUrls = files.map(
      (file: any) => `https://lh3.googleusercontent.com/d/${file.id}=w1200`
    );

    driveFolderCache.set(folderId, { photos: photoUrls, timestamp: Date.now() });
    console.log(`[DriveHelper] ${photoUrls.length} foto ditemukan dari folder ${folderId} via API v3`);
    
    return photoUrls;
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.warn("[DriveHelper] Timeout saat mengakses Drive API.");
    } else {
      console.warn("[DriveHelper] Error:", err?.message || err);
    }
    return [];
  }
}
