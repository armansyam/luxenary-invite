/**
 * Google Drive Public Folder Photo Stream Extractor with In-Memory Caching
 */

interface CacheEntry {
  photos: string[];
  timestamp: number;
}

const driveFolderCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function getGoogleDriveFolderPhotos(folderUrlOrId: string): Promise<string[]> {
  if (!folderUrlOrId || typeof folderUrlOrId !== "string") return [];

  const trimmed = folderUrlOrId.trim();
  let folderId = trimmed;

  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) {
    folderId = match[1];
  }

  if (!folderId || folderId.length < 15) return [];

  // Check in-memory cache
  const cached = driveFolderCache.get(folderId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.photos.length > 0) {
    return cached.photos;
  }

  try {
    const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      console.warn(`[GoogleDriveHelper] Failed to fetch folder ${folderId}, status: ${res.status}`);
      return cached?.photos || [];
    }

    const html = await res.text();

    // Extract all file data-ids from the folder table/grid
    const dataIdMatches = [...html.matchAll(/data-id="([a-zA-Z0-9_-]{25,50})"/g)].map((m) => m[1]);
    const validIds = [...new Set(dataIdMatches)].filter(
      (id) => id !== folderId && id.length >= 28 && !id.startsWith("AIza") && !id.startsWith("AA2Yr")
    );

    if (validIds.length > 0) {
      // Map to edge-cached CDN proxy endpoints or Google CDN thumbnail endpoints
      const photoUrls = validIds.map((id) => `/api/cdn/drive?id=${id}&w=1200`);
      driveFolderCache.set(folderId, {
        photos: photoUrls,
        timestamp: Date.now(),
      });
      return photoUrls;
    }

    return cached?.photos || [];
  } catch (err: any) {
    console.error(`[GoogleDriveHelper] Error extracting photos from folder ${folderId}:`, err?.message || err);
    return cached?.photos || [];
  }
}
