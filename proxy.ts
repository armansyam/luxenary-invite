import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isReservedSubdomain } from "@/lib/domainUtils";
import { safeInternalCallbackUrl } from "@/lib/safeUrl";
import { customDomainResolutionCache } from "@/lib/cache";
import { LOGIN_FAILURE_LIMIT, getClientIp, isRateLimitExhausted, loginRateLimitKey } from "@/lib/rateLimit";
import {
  buildEnforcedCsp,
  buildStrictAppCspReportOnly,
  generateCspNonce,
  isStrictNonceAppRoute,
} from "@/lib/csp";

function shouldApplyCsp(pathname: string): boolean {
  const isPreviewHtml = /^\/api\/client\/invitations\/[^/]+\/preview/.test(pathname);
  return !((pathname.startsWith("/api/") && !isPreviewHtml) || pathname.startsWith("/_next/") || pathname.startsWith("/static/"));
}

function applyCspHeaders(res: NextResponse, pathname: string, strictNonceCsp: string | null): NextResponse {
  if (!shouldApplyCsp(pathname)) {
    return res;
  }
  res.headers.set("Content-Security-Policy", strictNonceCsp || buildEnforcedCsp());
  return res;
}

const { auth } = NextAuth(authConfig);

interface CustomDomainResolution {
  subdomain: string | null; // Masih ada jika belum direcycle
  slug: string | null;      // Endpoint url asli (wajib)
  status?: string;
  canAccessMemories?: boolean;
}

const CACHE_TTL_MS = 60 * 1000; // 60 detik, terhubung ke invalidateInvitationLookup() di lib/cache.ts

// Resolusi selalu ke proses ini sendiri. Basis URL dari header Host akan membuat server melakukan fetch ke host
// pilihan penyerang (SSRF) bila origin dijangkau langsung.
const INTERNAL_BASE_URL = `http://${process.env.LUX_BIND_HOST || "127.0.0.1"}:${process.env.PORT || "3000"}`;

/**
 * Tautan tamu bentuk /Nama atau /v=Nama di subdomain atau custom domain: nama dipindah ke ?to= / ?v= di URL peramban.
 * Skrip runtime dan master tema membaca nama tamu dari location.search, jadi rewrite internal (URL peramban tetap
 * /Nama) membuat undangan tampil tanpa nama tamu.
 */
function guestPathRedirect(req: { nextUrl: URL }, host: string, segment: string) {
  let name = segment;
  try {
    name = decodeURIComponent(segment);
  } catch {
    // Persen-encoding rusak (mis. "50%"): segmen dipakai apa adanya sebagai nama.
  }
  const target = new URL("/", `${req.nextUrl.protocol}//${host}`);
  target.search = req.nextUrl.search;
  if (name.startsWith("v=")) target.searchParams.set("v", name.slice(2));
  else target.searchParams.set("to", name);
  return NextResponse.redirect(target, 307);
}

async function resolveCustomDomain(host: string): Promise<CustomDomainResolution | null> {
  // Cek cache L1 terlebih dahulu (terintegrasi dengan invalidateInvitationLookup)
  const cached = customDomainResolutionCache.get(host) as CustomDomainResolution | null;
  if (cached) {
    return cached.slug ? cached : null;
  }

  // Fetch ke API internal
  try {
    const resolveUrl = new URL(`/api/public/resolve-custom-domain?host=${encodeURIComponent(host)}`, INTERNAL_BASE_URL);
    const resolveRes = await fetch(resolveUrl.toString());
    if (resolveRes.ok) {
      const data = await resolveRes.json();
      const res: CustomDomainResolution = {
        subdomain: data.subdomain || null,
        status: data.status,
        slug: data.slug || null,
        canAccessMemories: data.canAccessMemories !== false,
      };
      // Simpan ke cache (termasuk hasil null agar tidak re-fetch domain yang tidak terdaftar)
      customDomainResolutionCache.set(host, res, CACHE_TTL_MS);
      return res;
    }
    // Domain tidak terdaftar — cache null agar tidak terus di-fetch
    const nullRes: CustomDomainResolution = { subdomain: null, slug: null };
    customDomainResolutionCache.set(host, nullRes, CACHE_TTL_MS);
    return null;
  } catch {
    return null;
  }
}


const PLATFORM_PATHS = [
  "/admin", "/login", "/partner", "/packages", "/checkout", "/payment", "/onboarding",
  "/dashboard", "/contact", "/how-it-works", "/privacy", "/terms",
  "/refund", "/portfolio", "/demo", "/archives",
];

/**
 * Redirect lintas host (subdomain -> apex): Auth.js mengganti origin req.nextUrl dengan NEXTAUTH_URL (apex),
 * sehingga NextResponse.redirect() menganggap target apex berada pada origin yang sama dan memotongnya menjadi
 * Location relatif (memicu redirect loop di host subdomain). Header Location absolut mencegah pemotongan tersebut.
 */
function absoluteRedirect(url: URL | string, status: 301 | 307 = 307): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { Location: typeof url === "string" ? url : url.toString() },
  });
}

function crawlerSpecialResponse(pathname: string): NextResponse | null {
  if (pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
  if (pathname === "/sitemap.xml") {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return null;
}

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;

  const host = req.headers.get("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase(); // remove port & normalize
  const envRootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").split(":")[0].toLowerCase();
  const rootDomains = [envRootDomain, "localhost", "127.0.0.1"].filter(Boolean);

  const isRootDomain = rootDomains.some((d) => cleanHost === d || cleanHost === `www.${d}`);
  const isSubdomainOfOurs = rootDomains.some((d) => cleanHost.endsWith(`.${d}`) && cleanHost !== d && cleanHost !== `www.${d}`);
  const isCustomDomain = !isSubdomainOfOurs && !isRootDomain;

  const nonce = generateCspNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Simpan host asli sebelum rewrite (Auth.js mengubah origin req.url menjadi NEXTAUTH_URL sehingga rewrite lintas-origin menimpa header Host).
  requestHeaders.set("x-lux-host", cleanHost);
  // Strict nonce CSP hanya untuk halaman aplikasi platform di domain utama (apex).
  // Host subdomain/custom domain merender undangan terbit yang memerlukan inline script tema.
  const strictNonceCsp =
    isRootDomain && shouldApplyCsp(pathname) && isStrictNonceAppRoute(pathname)
      ? buildStrictAppCspReportOnly(nonce)
      : null;
  if (strictNonceCsp) {
    // Next.js 16 membaca nonce dari header Content-Security-Policy pada requestHeaders untuk
    // menyematkan atribut nonce otomatis pada seluruh skrip hidrasi RSC & chunk Turbopack.
    requestHeaders.set("Content-Security-Policy", strictNonceCsp);
  }

  const passNext = () =>
    applyCspHeaders(NextResponse.next({ request: { headers: requestHeaders } }), pathname, strictNonceCsp);
  const passRewrite = (url: URL | string) =>
    applyCspHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), pathname, strictNonceCsp);
  // Rewrite internal harus memakai origin Host asli (bukan req.url yang telah diubah Auth.js ke NEXTAUTH_URL),
  // agar Next.js melakukan internal App Router rewrite (0 external loopback) dan mempertahankan Host + x-lux-host.
  const internalRewriteUrl = (targetPath: string, search = req.nextUrl.search) => {
    const base = host ? `${req.nextUrl.protocol}//${host}` : req.url;
    const url = new URL(targetPath, base);
    if (!url.search && search) url.search = search;
    return url;
  };

  // HTML terbit tersimpan di public/published hanya untuk dibaca rute slug/subdomain, yang memeriksa status undangan.
  // Next melayani isi public/ yang ada saat build apa adanya, sehingga undangan yang diturunkan tetap terbuka di sini.
  if (pathname.startsWith("/published/")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Unggahan dan suntingan admin ditulis ke disk server yang melayaninya dan hanya server utama yang menyalinnya ke
  // replika (lib/sharedFiles.ts); load balancer wajib mengarahkan panel admin ke server utama.
  if (process.env.LUX_SERVER_ROLE === "replica" && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    return new NextResponse("Panel admin hanya dilayani server utama.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // ── Guard Brute-Force Login: 5 percobaan GAGAL per IP per 15 menit ──
  // Hitungan ditambah di authorize (auth.ts) hanya saat login gagal; dulu setiap POST dihitung, sehingga login sukses
  // ke-6 dalam 15 menit (beberapa admin di balik satu IP kantor) ditolak. Hitungan di PostgreSQL, berlaku lintas worker.
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    if (await isRateLimitExhausted(loginRateLimitKey(getClientIp(req)), LOGIN_FAILURE_LIMIT)) {
      return new Response(
        JSON.stringify({ error: "Terlalu banyak percobaan login. Silakan tunggu 15 menit." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const isLoggedIn = !!req.auth?.user;
  const isAdmin = (req.auth?.user as any)?.isAdmin === true || (req.auth?.user as any)?.role === "ADMIN" || (req.auth?.user as any)?.role === "SUPER_ADMIN";

  // C. Isolasi Subdomain: Cegah Halaman Platform & Subdomain Sistem Dibuka di Bawah Subdomain
  if (isSubdomainOfOurs && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    const parts = cleanHost.split(".");
    const subdomain = parts[0];
    const protocol = req.nextUrl.protocol;
    const portSuffix = host.includes(":") ? `:${host.split(":")[1]}` : "";
    const matchedRoot = rootDomains.find((d) => cleanHost.endsWith(`.${d}`)) || "localhost";
    const apexHost = `${matchedRoot}${portSuffix}`;

    // 1. Mencegah akses langsung ke CNAME Target (Anti Kloning)
    if (["cname", "host", "alias", "invite"].includes(subdomain)) {
      return absoluteRedirect(`${protocol}//${apexHost}/`, 301);
    }

    // 2. Subdomain 'demo' dialihkan ke katalog tema resmi di apex domain
    if (subdomain === "demo") {
      let targetPath = "/demo";
      if (pathname !== "/" && pathname !== "") {
        targetPath = pathname.startsWith("/demo") ? pathname : `/demo${pathname}`;
      }
      const redirectUrl = new URL(targetPath, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return absoluteRedirect(redirectUrl, 307);
    }

    // 3. Subdomain sistem umum (www, app, auth, login, dashboard, partner, dll) dialihkan langsung ke apex
    if (isReservedSubdomain(subdomain)) {
      const redirectUrl = new URL(pathname, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return absoluteRedirect(redirectUrl, 307);
    }

    // 4. Seluruh halaman platform resmi DILARANG dibuka dari subdomain klien apapun
    if (PLATFORM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const redirectUrl = new URL(pathname, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return absoluteRedirect(redirectUrl, 307);
    }

    // 5. File crawler standar (robots.txt / sitemap.xml) dijawab langsung agar tidak dianggap nama tamu
    const crawlerRes = crawlerSpecialResponse(pathname);
    if (crawlerRes) return crawlerRes;
  }

  // D. Isolasi & Routing Custom Domain Klien (e.g. namapasangan.com)
  // Dijalankan SEBELUM guard rute platform agar domain klien tidak pernah menayangkan /admin, /login, /dashboard, atau landing platform.
  if (isCustomDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    const crawlerRes = crawlerSpecialResponse(pathname);
    if (crawlerRes) return crawlerRes;

    if (PLATFORM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return new NextResponse("Not Found", { status: 404 });
    }

    try {
      const resolution = await resolveCustomDomain(cleanHost);
      const slug = resolution?.slug;

      if (slug) {
        const isFinished = resolution.status === "EVENT_FINISHED" && resolution.canAccessMemories !== false;
        const isArchived = resolution.status === "ARCHIVED";
        const viewInvitation = req.nextUrl.searchParams.get("view") === "invitation";

        if (pathname === "/" || pathname === "") {
          if (isFinished && !viewInvitation) {
            return passRewrite(internalRewriteUrl(`/${slug}/memories`));
          }
          return passRewrite(internalRewriteUrl(`/${slug}`));
        }
        if (pathname === "/memories" || pathname === "/galery" || pathname === "/gallery") {
          if (isArchived) {
            return passRewrite(internalRewriteUrl(`/${slug}`));
          }
          return passRewrite(internalRewriteUrl(`/${slug}/memories`));
        }
        if (pathname === "/receptionist") {
          return passRewrite(internalRewriteUrl(`/${slug}/receptionist`));
        }
        if (pathname === "/welcome") {
          return passRewrite(internalRewriteUrl(`/${slug}/welcome`));
        }
        if (pathname === "/sharemoment") {
          return passRewrite(internalRewriteUrl(`/${slug}/sharemoment`));
        }
        // Guest param routing
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 1) {
          if (isFinished && !viewInvitation) {
            return passRewrite(internalRewriteUrl(`/${slug}/memories`));
          }
          return guestPathRedirect(req, host, segments[0]);
        }
      }
    } catch {
      // Resolusi gagal — jawab 404 agar tidak jatuh ke rute platform
    }

    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Admin login page
  if (pathname === "/admin/login") {
    if (isLoggedIn && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return passNext();
  }

  // 2. Client login page
  if (pathname === "/login") {
    if (isLoggedIn && !isAdmin) {
      const safeCb = safeInternalCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"), "/onboarding");
      return NextResponse.redirect(new URL(safeCb, req.url));
    }
    return passNext();
  }

  // 3. Admin routes protection -> HANYA Admin yang diizinkan
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return passNext();
  }

  // 4. Client dashboard, packages, and checkout routes protection -> HANYA Client murni yang diizinkan (Admin diblokir)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/packages") || pathname.startsWith("/checkout")) {
    // PENGECUALIAN: Admin dengan cookie remote yang valid diizinkan masuk ke /dashboard
    const remoteClientId = req.cookies.get("lux_remote_client_id")?.value;
    if (isAdmin && remoteClientId) {
      return passNext();
    }

    if (!isLoggedIn || isAdmin) {
      const loginUrl = new URL("/login", req.url);
      if (!isLoggedIn && req.nextUrl.search) {
        loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
      }
      return NextResponse.redirect(loginUrl);
    }
    return passNext();
  }

  // 5. Wildcard Subdomain Routing (e.g. didan-nasha.luxenary.id or didan-nasha.localhost:3000)

  // ── A. Subdomain milik kita (e.g. namapasangan.luxenary.id) ──
  if (isSubdomainOfOurs && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    const parts = cleanHost.split(".");
    if (parts.length > 1) {
      const subdomain = parts[0];

      // Hanya rute undangan klien yang dilayani di sini
      if (pathname === "/" || pathname === "") {
        return passRewrite(internalRewriteUrl(`/s/${subdomain}`));
      }
      if (pathname === "/memories" || pathname === "/galery" || pathname === "/gallery") {
        return passRewrite(internalRewriteUrl(`/s/${subdomain}/memories`));
      }
      if (pathname === "/receptionist") {
        return passRewrite(internalRewriteUrl(`/s/${subdomain}/receptionist`));
      }
      if (pathname === "/welcome") {
        return passRewrite(internalRewriteUrl(`/s/${subdomain}/welcome`));
      }
      if (pathname === "/sharemoment") {
        return passRewrite(internalRewriteUrl(`/s/${subdomain}/sharemoment`));
      }
      // Dynamic Path Routing for Guest Invitation (e.g. /v=Budi or /Sutejo)
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        return guestPathRedirect(req, host, segments[0]);
      }

      // HTML terbit dan halaman /s/<sub> menautkan ke /s/<sub>/..., bentuk yang sah di apex. Di host subdomain undangan
      // itu sendiri, kembalikan ke bentuk pendek agar tamu tidak keluar dari subdomain. Tujuan dibangun dari header
      // Host: req.url sudah diganti Auth.js dengan NEXTAUTH_URL (apex).
      if (segments[0] === "s" && segments[1]?.toLowerCase() === subdomain) {
        const rest = segments.slice(2).join("/");
        if (rest === "" || ["memories", "sharemoment", "receptionist", "welcome", "galery", "gallery"].includes(rest)) {
          const shortUrl = new URL(`/${rest}`, `${req.nextUrl.protocol}//${host}`);
          shortUrl.search = req.nextUrl.search;
          return NextResponse.redirect(shortUrl, 307);
        }
      }

      // Rute lain yang tidak dikenali di subdomain klien dialihkan ke apex domain
      const protocol = req.nextUrl.protocol;
      const portSuffix = host.includes(":") ? `:${host.split(":")[1]}` : "";
      const matchedRoot = rootDomains.find((d) => cleanHost.endsWith(`.${d}`)) || "localhost";
      const apexHost = `${matchedRoot}${portSuffix}`;
      const redirectUrl = new URL(pathname, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return absoluteRedirect(redirectUrl, 307);
    }
  }

  // 6. Canonical Path Routing — Flat Slug (e.g. /namapasangan-030326 atau /namapasangan-030326/memories)
  // Hanya untuk root domain, bukan subdomain atau custom domain
  const PLATFORM_EXCLUSIONS = [
    "/api",
    "/_next",
    "/static",
    "/admin",
    "/dashboard",
    "/login",
    "/partner",
    "/onboarding",
    "/packages",
    "/checkout",
    "/payment",
    "/demo",
    "/portfolio",
    "/contact",
    "/privacy",
    "/terms",
    "/refund",
    "/how-it-works",
    "/sharemoment",
    "/memories",
    "/archives",
    "/s/",
  ];

  if (!isCustomDomain && !isSubdomainOfOurs && !PLATFORM_EXCLUSIONS.some((prefix) => pathname.startsWith(prefix))) {
    const segments = pathname.split("/").filter(Boolean);

    // Exclusion list — path-path sistem yang tidak boleh di-intercept
    const SYSTEM_PATHS = ["uploads", "archives", "css", "js", "fonts", "images", "music", "assets", "downloads", "published", "favicon.ico"];

    if (segments.length >= 1 && !SYSTEM_PATHS.includes(segments[0])) {
      let slug = segments[0]; // Default slug is the first segment

      // Sub-routes di bawah slug (memories, sharemoment, galery) ATAU SEO URL (couple-slug/invitation-slug)
      if (segments.length >= 2) {
        const subRoute = segments[1];
        const allowedSubRoutes = ["memories", "sharemoment", "galery", "gallery", "receptionist", "welcome"];
        if (allowedSubRoutes.includes(subRoute)) {
          // Normalisasi rute /gallery (2 'l') ke /galery jika diakses pada kanonikal
          if (subRoute === "gallery") {
            const rewriteUrl = new URL(`/${slug}/galery`, req.url);
            rewriteUrl.search = req.nextUrl.search;
            return passRewrite(rewriteUrl);
          }
          // Biarkan Next.js routing menangani → app/(public)/[slug]/[subRoute]/page.tsx
          return passNext();
        } else {
          // Jika segment kedua BUKAN subRoute, berarti ini format SEO URL Portofolio: /groom-bride/invitation-slug
          // Maka slug aslinya adalah segment kedua
          slug = segments[1];
          const rewriteUrl = new URL(`/${slug}`, req.url);
          rewriteUrl.search = req.nextUrl.search;
          return passRewrite(rewriteUrl);
        }
      }

      // Root slug — jika URL sudah persis /${slug}, biarkan Next.js route handler app/(public)/[slug]/route.ts menangani langsung tanpa rewrite loop
      return passNext();
    }
  }

  // 7. Isolated Portfolio Routing
  // /portfolio/{slug} langsung ditangani route handler app/portfolio/[slug]/route.ts (R2/S3 + L1 cache / disk lokal).
  // Jangan rewrite ke .html karena isSafePathSegment menolak segmen bertitik dan memutus R2 maupun runtime lokal.

  return passNext();
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|music|assets|downloads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|mov|m4v|mp3|ogg|wav|m4a|flac|aac|css|js|woff2?|ttf|eot|otf|map|webmanifest)$).*)",
  ],
};