/**
 * Batas ukuran body untuk endpoint tanpa login. `proxyClientMaxBodySize` (100 MB) berlaku global demi unggahan video
 * klien, sehingga endpoint publik harus menolak body besar sebelum membacanya ke memori.
 * Hanya memeriksa Content-Length yang dideklarasikan; klien yang memakai chunked encoding tidak tercakup.
 */
export function exceedsDeclaredBodySize(req: Request, maxBytes: number): boolean {
  const declared = Number(req.headers.get("content-length"));
  return Number.isFinite(declared) && declared > maxBytes;
}
