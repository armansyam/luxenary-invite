import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { MAX_BUNDLE_BYTES, readBundle, writeBundleAssets } from "@/lib/themeBuilder/bundle";
import { recordBuilderAudit, resolveThemeMusic } from "@/lib/themeBuilder/server";

export const dynamic = "force-dynamic";

/**
 * Membaca berkas ekspor tema builder. Tidak membuat tema: gambar yang lolos verifikasi hash ditulis ke pustaka, lalu
 * spesifikasi dan identitas dikembalikan agar editor memuatnya sebagai rancangan baru yang disimpan lewat alur biasa.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const length = Number(req.headers.get("content-length") ?? "0");
    if (length > MAX_BUNDLE_BYTES) return NextResponse.json({ error: "Berkas ekspor lebih dari 30 MB." }, { status: 413 });

    const result = await readBundle(await readJsonBody(req));
    if (!result.ok) return NextResponse.json({ error: "Berkas ekspor tidak dapat dipakai.", details: result.errors }, { status: 400 });

    const written = await writeBundleAssets(result.assets);
    const music = await resolveThemeMusic(result.theme.defaultMusicUrl);
    await recordBuilderAudit(req, guard.session, "THEME_BUILDER_IMPORT", `Mengimpor rancangan "${result.theme.name}" (${written.written} gambar baru, ${written.existing} sudah ada)`);

    return NextResponse.json({
      success: true,
      theme: { ...result.theme, defaultMusicUrl: music.ok ? music.url ?? "" : "" },
      spec: result.spec,
      assets: written,
      missingAssets: result.missing,
      musicDropped: !music.ok,
    });
  } catch (error) {
    return routeError("ThemeBuilderImport", error);
  }
}
