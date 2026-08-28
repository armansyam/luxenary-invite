/**
 * Google Drive Public Folder Photo Stream Extractor & Webhook Uploader
 */

interface CacheEntry {
  photos: string[];
  timestamp: number;
}

const driveFolderCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache



/**
 * Extracts raw Google Drive Folder ID from a URL or bare string.
 */
export function extractGoogleDriveFolderId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  if (trimmed.length >= 25 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  return null;
}




export async function getGoogleDriveFolderPhotos(folderUrlOrId: string): Promise<string[]> {
  if (!folderUrlOrId || typeof folderUrlOrId !== "string") return [];

  const trimmed = folderUrlOrId.trim();
  if (!trimmed) return [];

  // Check if user pasted a single file link instead of a folder link
  const singleFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,50})/);
  if (singleFileMatch && !trimmed.includes("folders/")) {
    const fileId = singleFileMatch[1];
    return [`/api/cdn/drive?id=${fileId}&w=1200`];
  }

  const folderId = extractGoogleDriveFolderId(trimmed);
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      console.warn(`[GoogleDriveHelper] Failed to fetch folder ${folderId}, status: ${res.status}`);
      return cached?.photos || [];
    }

    const html = await res.text();

    // Extract all file data-ids from the folder table/grid and scripts
    const matchedIds: string[] = [];
    
    // 1. data-id matches
    for (const m of html.matchAll(/data-id="([a-zA-Z0-9_-]{25,50})"/g)) {
      matchedIds.push(m[1]);
    }
    // 2. lh3.googleusercontent.com/d/ matches
    for (const m of html.matchAll(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{25,50})/g)) {
      matchedIds.push(m[1]);
    }
    // 3. /file/d/ matches
    for (const m of html.matchAll(/\/file\/d\/([a-zA-Z0-9_-]{25,50})/g)) {
      matchedIds.push(m[1]);
    }
    // 4. Standard 33-char drive IDs in JS arrays
    for (const m of html.matchAll(/\["([a-zA-Z0-9_-]{33})"/g)) {
      matchedIds.push(m[1]);
    }

    const validIds = [...new Set(matchedIds)].filter(
      (id) => id !== folderId && id.length >= 28 && !id.startsWith("AIza") && !id.startsWith("AA2Yr")
    );

    if (validIds.length > 0) {
      // Map to edge-cached CDN proxy endpoints
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
