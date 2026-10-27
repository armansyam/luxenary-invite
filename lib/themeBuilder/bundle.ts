/**
 * Berkas ekspor tema builder: spesifikasi plus gambar unggahan yang dipakainya, dalam satu JSON.
 *
 * Tema yang dirancang di lokal tidak bisa dipindah ke server hanya dengan menyalin spesifikasi, karena gambar unggahan
 * (public/uploads/theme-assets, di luar git dan di luar backup DB) ikut hilang. Nama berkas gambar adalah hash isinya,
 * jadi saat diimpor nama itu diverifikasi ulang: gambar yang rusak atau diganti tidak lolos, dan URL di spesifikasi
 * tetap cocok di server tujuan.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { parseBuilderSpec, type BuilderSpec } from "@/lib/themeBuilder/spec";
import { BUILDER_CATEGORIES, THEME_ASSET_DIR, THEME_ASSET_URL_PREFIX, type BuilderCategory } from "@/lib/themeBuilder/server";

export const BUNDLE_FORMAT = "luxenary-builder-theme";
export const BUNDLE_VERSION = 1;
export const MAX_BUNDLE_BYTES = 30 * 1024 * 1024;
const MAX_ASSET_BYTES = 6 * 1024 * 1024;
const MAX_ASSET_COUNT = 80;
const MAX_ASSET_PIXELS = 50_000_000;
const ASSET_FILE_RE = /^[a-f0-9]{24}\.webp$/;

export interface BundleTheme {
  name: string;
  category: BuilderCategory;
  description: string;
  defaultMusicUrl: string;
}

export interface BuilderBundle {
  format: typeof BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  theme: BundleTheme;
  spec: BuilderSpec;
  /** Nama berkas di theme-assets menjadi kunci; isinya WebP dalam base64. */
  assets: Record<string, string>;
}

/** Nama berkas unggahan yang ditaut spesifikasi (tekstur, media bawaan, ornamen, dan ornamen bingkai). */
export function uploadedAssetFiles(spec: BuilderSpec): string[] {
  const urls = [spec.texture, ...Object.values(spec.defaultMedia), ...spec.ornaments.map((o) => o.src), ...Object.values(spec.frames).map((f) => f.ornament)];
  const files = new Set<string>();
  for (const url of urls) {
    if (typeof url === "string" && url.startsWith(THEME_ASSET_URL_PREFIX)) files.add(url.slice(THEME_ASSET_URL_PREFIX.length));
  }
  return [...files];
}

export function exportBundle(theme: BundleTheme, spec: BuilderSpec): { bundle: BuilderBundle; missing: string[] } {
  const assets: Record<string, string> = {};
  const missing: string[] = [];
  for (const file of uploadedAssetFiles(spec)) {
    const full = path.join(/*turbopackIgnore: true*/ THEME_ASSET_DIR, file);
    if (!ASSET_FILE_RE.test(file) || !fs.existsSync(full)) {
      missing.push(file);
      continue;
    }
    assets[file] = fs.readFileSync(full).toString("base64");
  }
  return { bundle: { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, exportedAt: new Date().toISOString(), theme, spec, assets }, missing };
}

export type BundleReadResult =
  | { ok: true; theme: BundleTheme; spec: BuilderSpec; assets: Map<string, Buffer>; missing: string[] }
  | { ok: false; errors: string[] };

/** Memeriksa seluruh berkas sebelum ada yang ditulis ke disk: bentuk, spesifikasi, dan hash serta keterbacaan tiap gambar. */
export async function readBundle(raw: unknown): Promise<BundleReadResult> {
  if (!raw || typeof raw !== "object" || (raw as { format?: unknown }).format !== BUNDLE_FORMAT) {
    return { ok: false, errors: ["Berkas bukan hasil ekspor Theme Builder."] };
  }
  const input = raw as Record<string, unknown>;
  if (input.version !== BUNDLE_VERSION) return { ok: false, errors: [`Versi berkas ekspor ${String(input.version)} tidak didukung (harus ${BUNDLE_VERSION}).`] };

  const parsed = parseBuilderSpec(input.spec);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const meta = (input.theme && typeof input.theme === "object" ? input.theme : {}) as Record<string, unknown>;
  const category = (BUILDER_CATEGORIES as string[]).includes(String(meta.category)) ? (meta.category as BuilderCategory) : "modern";
  const theme: BundleTheme = {
    name: typeof meta.name === "string" ? meta.name.trim().slice(0, 60) : "",
    category,
    description: typeof meta.description === "string" ? meta.description.trim().slice(0, 300) : "",
    defaultMusicUrl: typeof meta.defaultMusicUrl === "string" ? meta.defaultMusicUrl.slice(0, 300) : "",
  };

  const rawAssets = input.assets && typeof input.assets === "object" && !Array.isArray(input.assets) ? (input.assets as Record<string, unknown>) : {};
  const names = Object.keys(rawAssets);
  if (names.length > MAX_ASSET_COUNT) return { ok: false, errors: [`Berkas memuat ${names.length} gambar; batasnya ${MAX_ASSET_COUNT}.`] };

  const errors: string[] = [];
  const assets = new Map<string, Buffer>();
  for (const name of names) {
    const value = rawAssets[name];
    if (!ASSET_FILE_RE.test(name)) {
      errors.push(`Nama gambar "${name.slice(0, 40)}" tidak valid.`);
      continue;
    }
    if (typeof value !== "string" || value.length > Math.ceil((MAX_ASSET_BYTES * 4) / 3) + 8) {
      errors.push(`Gambar ${name} kosong atau lebih dari 6 MB.`);
      continue;
    }
    const bytes = Buffer.from(value, "base64");
    if (crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 24) !== name.slice(0, 24)) {
      errors.push(`Gambar ${name} tidak cocok dengan hash namanya; berkas rusak atau diubah.`);
      continue;
    }
    try {
      const info = await sharp(bytes, { limitInputPixels: MAX_ASSET_PIXELS }).metadata();
      if (info.format !== "webp") throw new Error("bukan WebP");
    } catch {
      errors.push(`Gambar ${name} tidak dapat dibaca sebagai WebP.`);
      continue;
    }
    assets.set(name, bytes);
  }
  if (errors.length) return { ok: false, errors };

  const missing = uploadedAssetFiles(parsed.spec).filter((file) => !assets.has(file) && !fs.existsSync(path.join(/*turbopackIgnore: true*/ THEME_ASSET_DIR, file)));
  return { ok: true, theme, spec: parsed.spec, assets, missing };
}

/** Menulis gambar hasil `readBundle` ke pustaka; berkas yang sudah ada (hash sama) tidak ditimpa. */
export async function writeBundleAssets(assets: Map<string, Buffer>): Promise<{ written: number; existing: number }> {
  await fs.promises.mkdir(THEME_ASSET_DIR, { recursive: true });
  let written = 0;
  let existing = 0;
  for (const [name, bytes] of assets) {
    const target = path.join(/*turbopackIgnore: true*/ THEME_ASSET_DIR, name);
    if (fs.existsSync(target)) {
      existing++;
      continue;
    }
    await fs.promises.writeFile(target, bytes);
    written++;
  }
  return { written, existing };
}
