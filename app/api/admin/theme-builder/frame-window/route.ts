import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { isAllowedOrnamentSrc } from "@/lib/themeBuilder/spec";
import { measureFrameWindow } from "@/lib/themeBuilder/frameWindow";
import { builtinOrnamentGroups, uploadedOrnaments } from "@/lib/themeBuilder/server";
import type { FrameFit } from "@/lib/themeBuilder/spec";

export const dynamic = "force-dynamic";

const MAX_SRCS = 80;
const CACHE_TTL_MS = 60_000;

interface FrameEntry {
  src: string;
  group: string;
  fit: FrameFit;
}

let cached: { at: number; signature: string; frames: FrameEntry[] } | null = null;

/**
 * Semua gambar pustaka (bawaan dan unggahan) yang punya jendela transparan. Daftar bingkai di builder hanya berisi
 * ini, jadi daun, garis, dan ornamen biasa tidak ikut. Tidak perlu folder khusus: bingkai di folder mana pun
 * dan unggahan terdeteksi otomatis dari alpha-nya, dan tiap bingkai tetap dikelompokkan menurut folder asalnya.
 */
async function libraryFrames(): Promise<FrameEntry[]> {
  const sources = [
    ...builtinOrnamentGroups().flatMap((g) => g.items.map((src) => ({ src, group: g.label, mtime: 0 }))),
    ...uploadedOrnaments().map((u) => ({ src: u.url, group: "Unggahan saya", mtime: u.uploadedAt })),
  ];
  const signature = sources.map((s) => `${s.src}:${s.mtime}`).join("|");
  if (cached && cached.signature === signature && Date.now() - cached.at < CACHE_TTL_MS) return cached.frames;

  const frames: FrameEntry[] = [];
  const queue = [...sources];
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const fit = await measureFrameWindow(s.src);
      if (fit) frames.push({ src: s.src, group: s.group, fit });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const order = new Map(sources.map((s, i) => [s.src, i]));
  frames.sort((a, b) => (order.get(a.src) ?? 0) - (order.get(b.src) ?? 0));
  cached = { at: Date.now(), signature, frames };
  return frames;
}

/** Daftar bingkai berjendela dari seluruh pustaka ornamen. */
export async function GET() {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    return NextResponse.json({ success: true, frames: await libraryFrames() });
  } catch (error) {
    return routeError("ThemeBuilderFrameWindow", error);
  }
}

/** Jendela transparan beberapa bingkai sekaligus; null berarti gambar itu tidak punya jendela (menutupi foto). */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const srcs = Array.isArray(body.srcs) ? body.srcs : [];
    if (!srcs.length || srcs.length > MAX_SRCS || !srcs.every((s) => isAllowedOrnamentSrc(s))) {
      return NextResponse.json({ error: `Kirim 1 sampai ${MAX_SRCS} gambar dari pustaka ornamen.` }, { status: 400 });
    }

    const fits: Record<string, unknown> = {};
    for (const src of srcs as string[]) fits[src] = await measureFrameWindow(src);
    return NextResponse.json({ success: true, fits });
  } catch (error) {
    return routeError("ThemeBuilderFrameWindow", error);
  }
}
