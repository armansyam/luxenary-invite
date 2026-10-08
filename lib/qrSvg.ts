import qrcode from "qrcode-generator";
import { normalizeQrMark } from "./checkinQr";

const QUIET_ZONE = 4;
/** Garis tengah lingkaran inisial terhadap lebar simbol QR; cukup kecil agar koreksi kesalahan level H tetap berlebih. */
const MARK_DIAMETER_RATIO = 0.22;

// Bawaan pustaka bukan UTF-8; nama bertanda aksen (mis. "Syâmil") tidak terbaca benar tanpa ini.
// Build CJS dan ESM pustaka berbeda (hanya CJS membawa fungsi UTF-8), jadi encoder disediakan di sini.
qrcode.stringToBytes = (s: string) => Array.from(Buffer.from(s, "utf8"));

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * SVG QR hitam-putih (kontras mutlak diperlukan pemindai, bukan warna tema). Dengan `mark` (inisial 1-2 karakter)
 * koreksi kesalahan dinaikkan ke level H (±30%) dan lingkaran putih berisi inisial dipasang di tengah.
 */
export function buildQrSvg(data: string, size: number, rawMark = ""): string {
  const mark = normalizeQrMark(rawMark);

  const qr = qrcode(0, mark ? "H" : "M");
  qr.addData(data);
  qr.make();

  const modules = qr.getModuleCount();
  const total = modules + QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }

  let overlay = "";
  if (mark) {
    const center = total / 2;
    const diameter = Math.max(7, Math.round(modules * MARK_DIAMETER_RATIO));
    const fontSize = (mark.length === 1 ? diameter * 0.64 : diameter * 0.44).toFixed(2);
    overlay =
      `<circle cx="${center}" cy="${center}" r="${diameter / 2}" fill="#fff"/>` +
      `<text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${fontSize}" fill="#000">${escapeXml(mark)}</text>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/>${overlay}</svg>`
  );
}
