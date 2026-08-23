import { NextRequest, NextResponse } from "next/server";

/**
 * High-Performance Cloudflare Edge Cache Proxy for Google Drive CDN Images
 * Caches image at Cloudflare edge for 30 days, bypassing Google Drive quota rate limits.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const width = searchParams.get("w") || "1200";

    if (!id) {
      return NextResponse.json({ error: "Google Drive File ID is required" }, { status: 400 });
    }

    // Google UserContent High-Speed Thumbnail CDN Endpoint
    const googleCdnUrl = `https://lh3.googleusercontent.com/d/${id}=w${width}`;

    const upstreamRes = await fetch(googleCdnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!upstreamRes.ok) {
      // Fallback to uc?export=view
      const fallbackUrl = `https://drive.google.com/uc?export=view&id=${id}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) {
        return NextResponse.json({ error: "Gagal mengambil foto dari Google Drive" }, { status: 404 });
      }

      const contentType = fallbackRes.headers.get("content-type") || "image/jpeg";
      const buffer = await fallbackRes.arrayBuffer();

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable",
          "CDN-Cache-Control": "max-age=2592000",
          "Cloudflare-CDN-Cache-Control": "max-age=2592000",
        },
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    const buffer = await upstreamRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable",
        "CDN-Cache-Control": "max-age=2592000",
        "Cloudflare-CDN-Cache-Control": "max-age=2592000",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to proxy image" }, { status: 500 });
  }
}
