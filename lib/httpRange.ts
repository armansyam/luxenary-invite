export type ByteRange = { start: number; end: number };

/**
 * Membaca header `Range: bytes=...` satu rentang untuk berkas berukuran `size`.
 * - `null`: tanpa header atau bentuk yang tidak didukung (mis. beberapa rentang); sajikan seluruh berkas.
 * - `"unsatisfiable"`: rentang di luar berkas; jawab 416.
 * - rentang akhir yang melewati ujung berkas dipotong ke ujungnya, dan `bytes=-N` berarti N byte terakhir (RFC 9110).
 */
export function parseByteRange(header: string | null, size: number): ByteRange | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;

  let start: number;
  let end: number;
  if (match[1] === "") {
    const last = Number(match[2]);
    if (!(last > 0)) return "unsatisfiable";
    start = Math.max(0, size - last);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
