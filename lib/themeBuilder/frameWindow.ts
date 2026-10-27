import fs from "fs";
import path from "path";
import sharp from "sharp";
import { isAllowedOrnamentSrc, type BuilderSpec, type FrameFit } from "@/lib/themeBuilder/spec";

const PUBLIC_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public");
const SAMPLE = 256;
/** Piksel dengan alpha di bawah ini dianggap bolong (jendela bingkai). */
const OPEN_ALPHA = 40;
/** Jendela yang lebih sempit dari ini (pecahan lebar atau tinggi gambar) dianggap bukan jendela foto. */
const MIN_WINDOW = 0.08;

const memo = new Map<string, FrameFit | null>();

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Jendela transparan sebuah bingkai: area bolong yang tersambung dengan titik tengah gambar, dihitung dari kanal alpha.
 * Hasilnya kotak pembatas jendela (pecahan lebar/tinggi gambar) dan perbandingan lebar:tinggi jendela dalam piksel asli.
 * Null bila tengah gambar opak, jendelanya menyentuh tepi gambar (bukan jendela tertutup), atau terlalu sempit.
 */
export async function measureFrameWindow(src: string, publicDir = PUBLIC_DIR): Promise<FrameFit | null> {
  if (!isAllowedOrnamentSrc(src)) return null;
  const file = path.join(publicDir, src);
  if (!file.startsWith(publicDir + path.sep) || !fs.existsSync(/*turbopackIgnore: true*/ file)) return null;

  const key = `${file}:${fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs}`;
  if (memo.has(key)) return memo.get(key) ?? null;

  const image = sharp(file).ensureAlpha();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) return null;
  const scale = Math.min(1, SAMPLE / Math.max(meta.width, meta.height));
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const { data } = await image.resize(w, h, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });

  const open = (x: number, y: number) => data[(y * w + x) * 4 + 3] < OPEN_ALPHA;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  let fit: FrameFit | null = null;

  if (open(cx, cy)) {
    const seen = new Uint8Array(w * h);
    const stack = [cy * w + cx];
    seen[stack[0]] = 1;
    let l = w, t = h, r = 0, b = 0;
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % w;
      const y = (p / w) | 0;
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (seen[q] || !open(nx, ny)) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    const enclosed = l > 0 && t > 0 && r < w - 1 && b < h - 1;
    const wl = l / w, wt = t / h, wr = (r + 1) / w, wb = (b + 1) / h;
    if (enclosed && wr - wl >= MIN_WINDOW && wb - wt >= MIN_WINDOW) {
      fit = { l: round3(wl), t: round3(wt), r: round3(wr), b: round3(wb), aspect: round3(((wr - wl) * meta.width) / ((wb - wt) * meta.height)) };
    }
  }

  memo.set(key, fit);
  return fit;
}

/**
 * Isi `fit` setiap bingkai berornamen dari gambar aslinya. Nilai dari klien tidak dipercaya: jendela selalu dihitung
 * ulang di server (hasilnya di-memo per berkas), sehingga bingkai yang diganti tidak membawa jendela bingkai lama.
 */
export async function fitSpecFrames(spec: BuilderSpec, publicDir = PUBLIC_DIR): Promise<BuilderSpec> {
  const frames = { ...spec.frames };
  for (const [id, frame] of Object.entries(frames) as Array<[keyof typeof frames, NonNullable<(typeof frames)[keyof typeof frames]>]>) {
    frames[id] = { ...frame, fit: frame.ornament ? await measureFrameWindow(frame.ornament, publicDir) : null };
  }
  return { ...spec, frames };
}
