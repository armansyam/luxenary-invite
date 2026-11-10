import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { parseBuilderSpec } from "@/lib/themeBuilder/spec";
import { ensureSpecFonts } from "@/lib/themeBuilder/fonts";
import { fitSpecFrames } from "@/lib/themeBuilder/frameWindow";
import { renderBuilderPreview } from "@/lib/themeBuilder/server";
import { parseSimMedia } from "@/lib/themeBuilder/simSlots";

export const dynamic = "force-dynamic";

/** HTML undangan demo dari rancangan yang belum disimpan; tidak menulis apa pun ke disk maupun DB. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const parsed = parseBuilderSpec(body.spec);
    if (!parsed.ok) return NextResponse.json({ error: "Rancangan tema tidak valid.", details: parsed.errors }, { status: 400 });

    await ensureSpecFonts(parsed.spec);
    const spec = await fitSpecFrames(parsed.spec);
    const mode = body.mode === "client" || body.mode === "sim" ? body.mode : "demo";
    const { html, issues, labels } = await renderBuilderPreview(spec, undefined, mode, mode === "sim" ? parseSimMedia(body.sim) : undefined);
    return NextResponse.json({ success: true, html, issues, labels });
  } catch (error) {
    return routeError("ThemeBuilderPreview", error);
  }
}
