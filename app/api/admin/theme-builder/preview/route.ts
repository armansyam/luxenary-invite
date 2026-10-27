import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { parseBuilderSpec } from "@/lib/themeBuilder/spec";
import { renderBuilderPreview } from "@/lib/themeBuilder/server";

export const dynamic = "force-dynamic";

/** HTML undangan demo dari rancangan yang belum disimpan; tidak menulis apa pun ke disk maupun DB. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const parsed = parseBuilderSpec(body.spec);
    if (!parsed.ok) return NextResponse.json({ error: "Rancangan tema tidak valid.", details: parsed.errors }, { status: 400 });

    const { html, issues } = await renderBuilderPreview(parsed.spec);
    return NextResponse.json({ success: true, html, issues });
  } catch (error) {
    return routeError("ThemeBuilderPreview", error);
  }
}
