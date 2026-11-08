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
/**
 * Luas jendela minimum (pecahan luas gambar). Rongga tertutup di dalam ilustrasi, misalnya layar kapal-phinisi (5%)
 * atau celah kelopak buket couple-frame (1,4%), lolos cek lebar/tinggi tetapi bukan tempat foto; jendela bingkai
 * pustaka terkecil (pavillion-bamboo) 16%.
 */
const MIN_WINDOW_AREA = 0.12;

const memo = new Map<string, FrameFit | null>();

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Jendela transparan sebuah bingkai: area bolong yang tersambung dengan titik tengah gambar, dihitung dari kanal alpha.
 * Hasilnya kotak pembatas jendela (pecahan lebar/tinggi gambar) dan perbandingan lebar:tinggi jendela dalam piksel asli.
 * Null bila tengah gambar opak, jendelanya menyentuh tepi gambar (bukan jendela tertutup), atau terlalu sempit/kecil.
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
    // Tandai piksel transparan di luar bingkai yang tersambung ke tepi kanvas gambar (exterior).
    const exterior = new Uint8Array(w * h);
    const extStack: number[] = [];
    const pushExt = (x: number, y: number) => {
      const idx = y * w + x;
      if (!exterior[idx] && open(x, y)) {
        exterior[idx] = 1;
        extStack.push(idx);
      }
    };
    for (let x = 0; x < w; x++) {
      pushExt(x, 0);
      pushExt(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      pushExt(0, y);
      pushExt(w - 1, y);
    }
    while (extStack.length) {
      const p = extStack.pop() as number;
      const x = p % w;
      const y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) pushExt(nx, ny);
      }
    }

    const seen = new Uint8Array(w * h);
    const rowMinX = new Int32Array(h).fill(w);
    const rowMaxX = new Int32Array(h).fill(-1);
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
      if (x < rowMinX[y]) rowMinX[y] = x;
      if (x > rowMaxX[y]) rowMaxX[y] = x;
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
    const enclosed = l > 0 && t > 0 && r < w - 1 && b < h - 1 && !exterior[cy * w + cx];
    if (enclosed) {
      // Lebarkan kotak jendela 1 piksel ke dalam tepi opak bingkai (selama tidak menyentuh exterior) agar anti-aliasing tepi dalam tertutup rapat.
      const canBleedRow = (y: number, x0: number, x1: number) => {
        if (y < 0 || y >= h) return false;
        for (let x = x0; x <= x1; x++) if (exterior[y * w + x]) return false;
        return true;
      };
      const canBleedCol = (x: number, y0: number, y1: number) => {
        if (x < 0 || x >= w) return false;
        for (let y = y0; y <= y1; y++) if (exterior[y * w + x]) return false;
        return true;
      };
      const bl = canBleedCol(l - 1, t, b) ? l - 1 : l;
      const br = canBleedCol(r + 1, t, b) ? r + 1 : r;
      const bt = canBleedRow(t - 1, bl, br) ? t - 1 : t;
      const bb = canBleedRow(b + 1, bl, br) ? b + 1 : b;

      const wl = bl / w, wt = bt / h, wr = (br + 1) / w, wb = (bb + 1) / h;
      if (wr - wl >= MIN_WINDOW && wb - wt >= MIN_WINDOW && (wr - wl) * (wb - wt) >= MIN_WINDOW_AREA) {
        // Periksa apakah ada piksel transparan luar (exterior) di dalam kotak pembatas jendela (mis. bingkai lengkung, oval, atau atap Tongkonan).
        let hasExteriorInBox = false;
        for (let y = bt; y <= bb && !hasExteriorInBox; y++) {
          for (let x = bl; x <= br; x++) {
            if (exterior[y * w + x]) {
              hasExteriorInBox = true;
              break;
            }
          }
        }

        let clip: string | undefined;
        if (hasExteriorInBox) {
          const spanW = Math.max(1, br - bl + 1);
          const spanH = Math.max(1, bb - bt + 1);
          const slices = Math.min(24, spanH);
          const leftPts: string[] = [];
          const rightPts: string[] = [];
          const pct1 = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;

          for (let i = 0; i <= slices; i++) {
            const y = Math.min(bb, Math.max(bt, Math.round(bt + (i / slices) * (bb - bt))));
            // Cari baris terdekat yang memiliki piksel lubang (seen) bila baris bt/bb merupakan baris bleed.
            let refY = y;
            if (rowMaxX[refY] < rowMinX[refY]) {
              refY = y < cy ? Math.min(b, y + 1) : Math.max(t, y - 1);
            }
            const hMin = rowMinX[refY] <= rowMaxX[refY] ? rowMinX[refY] : cx;
            const hMax = rowMinX[refY] <= rowMaxX[refY] ? rowMaxX[refY] : cx;

            // Jalan ke kiri dari tepi lubang menembus bodi bingkai yang opak; berhenti tepat sebelum menembus exterior.
            let lx = hMin;
            while (lx > bl && !exterior[y * w + (lx - 1)]) lx--;
            if (lx > bl && lx < hMin) lx = Math.min(hMin, lx + 1);

            // Jalan ke kanan dari tepi lubang menembus bodi bingkai yang opak; berhenti tepat sebelum menembus exterior.
            let rx = hMax;
            while (rx < br && !exterior[y * w + (rx + 1)]) rx++;
            if (rx < br && rx > hMax) rx = Math.max(hMax, rx - 1);

            const yPct = pct1(((y - bt + (i === slices ? 1 : 0)) / spanH) * 100);
            const lPct = pct1(((lx - bl) / spanW) * 100);
            const rPct = pct1(((rx + 1 - bl) / spanW) * 100);
            leftPts.push(`${lPct}% ${yPct}%`);
            rightPts.push(`${rPct}% ${yPct}%`);
          }
          clip = `polygon(${[...leftPts, ...rightPts.reverse()].join(", ")})`;
        }

        fit = {
          l: round3(wl),
          t: round3(wt),
          r: round3(wr),
          b: round3(wb),
          aspect: round3(((wr - wl) * meta.width) / ((wb - wt) * meta.height)),
          ...(clip ? { clip } : {}),
        };
      }
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
  const ornaments = await Promise.all(
    spec.ornaments.map(async (o) => {
      if (!o.slot || !o.src) {
        const { fit: _fit, ...rest } = o;
        return rest;
      }
      return { ...o, fit: await measureFrameWindow(o.src, publicDir) };
    }),
  );
  return { ...spec, frames, ornaments };
}
