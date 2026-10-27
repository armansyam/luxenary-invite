import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public");

/**
 * Kandidat URL pertama yang benar-benar tersedia, atau null. URL lokal ("/demo/...", "/uploads/...") diperiksa ke folder
 * public; URL http(s) tidak bisa diperiksa dari server dan dianggap tersedia. Dipakai katalog agar tema tanpa thumbnail
 * tampil sebagai kartu nama, bukan gambar rusak.
 */
export function firstExistingPublicAsset(candidates: Array<string | null | undefined>, publicDir = PUBLIC_DIR): string | null {
  for (const url of candidates) {
    if (!url) continue;
    if (/^https?:\/\//i.test(url)) return url;
    if (!url.startsWith("/") || url.startsWith("//")) continue;
    const pathname = url.split(/[?#]/)[0];
    if (pathname.split("/").includes("..")) continue;
    const full = path.join(publicDir, pathname);
    if (full.startsWith(publicDir + path.sep) && fs.existsSync(full) && fs.statSync(full).isFile()) return url;
  }
  return null;
}
