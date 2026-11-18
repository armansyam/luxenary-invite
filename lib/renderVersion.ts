import fs from "fs";
import path from "path";
import { prisma } from "./prisma";

/**
 * HTML terbit dan demo disimpan sebagai cache di disk tiap server aplikasi. Setiap perubahan data menaikkan versi di DB;
 * berkas cache membawa versi saat dibangun, jadi server yang menyimpan versi lain tahu cache-nya basi dan membangun ulang.
 */
export const publishedVersionKey = (invitationId: string) => `published:${invitationId}`;
export const demoVersionKey = (themeId: string) => `demo:${themeId.toLowerCase()}`;

export async function bumpRenderVersion(key: string): Promise<number> {
  const [row] = await prisma.$queryRaw<{ version: number }[]>`
    INSERT INTO render_versions (key, version, updated_at) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET version = render_versions.version + 1, updated_at = now()
    RETURNING version`;
  return row.version;
}

/** 0 bila belum pernah dinaikkan (cache yang dibangun sebelum penanda versi ada juga dianggap basi sekali). */
export async function currentRenderVersion(key: string): Promise<number> {
  const row = await prisma.renderVersion.findUnique({ where: { key }, select: { version: true } });
  return row?.version ?? 0;
}

const MARKER = /\n<!-- lux-build:(\d+) -->$/;

export function withVersionMarker(html: string, version: number): string {
  return `${html}\n<!-- lux-build:${version} -->`;
}

export function splitVersionMarker(content: string): { html: string; version: number | null } {
  const match = content.match(MARKER);
  return match ? { html: content.slice(0, match.index), version: Number(match[1]) } : { html: content, version: null };
}

/** Tulis lalu ganti nama agar worker lain tidak membaca berkas yang baru setengah tertulis. */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(temp, content, "utf-8");
  await fs.promises.rename(temp, filePath);
}
