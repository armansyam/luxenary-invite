import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isReservedSubdomain } from "@/lib/domainUtils";
import { LOGIN_FAILURE_LIMIT, getClientIp, isRateLimitExhausted, loginRateLimitKey } from "@/lib/rateLimit";

const { auth } = NextAuth(authConfig);

interface CustomDomainResolution {
  subdomain: string | null; // Masih ada jika belum direcycle
  slug: string | null;      // Endpoint url asli (wajib)
  status?: string;
  expiry: number;
}

// Cache resolve custom domain (TTL 5 menit) — mengurangi amplifikasi self-fetch di middleware
const customDomainCache = new Map<string, CustomDomainResolution>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit

// Resolusi selalu ke proses ini sendiri. Basis URL dari header Host akan membuat server melakukan fetch ke host
// pilihan penyerang (SSRF) bila origin dijangkau langsung.
const INTERNAL_BASE_URL = `http://127.0.0.1:${process.env.PORT || "3000"}`;
const CACHE_MAX_ENTRIES = 2000;

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
  const now = Date.now();

  // Cek cache terlebih dahulu
  const cached = customDomainCache.get(host);
  if (cached && cached.expiry > now) {
    return cached;
  }

  // Cleanup cache yang expired (lazy cleanup), lalu batasi ukuran: Host acak tidak boleh menumbuhkan memori tanpa batas
  if (customDomainCache.size > 500) {
    for (const [key, val] of customDomainCache.entries()) {
      if (val.expiry <= now) customDomainCache.delete(key);
    }
  }
  while (customDomainCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = customDomainCache.keys().next().value;
    if (oldest === undefined) break;
    customDomainCache.delete(oldest);
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
        expiry: now + CACHE_TTL_MS,
      };
      // Simpan ke cache (termasuk hasil null agar tidak re-fetch domain yang tidak terdaftar)
      customDomainCache.set(host, res);
      return res;
    }
    // Domain tidak terdaftar — cache null agar tidak terus di-fetch
    const nullRes: CustomDomainResolution = { subdomain: null, slug: null, expiry: now + CACHE_TTL_MS };
    customDomainCache.set(host, nullRes);
    return null;
  } catch {
    return null;
  }
}


export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl;

  // HTML terbit tersimpan di public/published hanya untuk dibaca rute slug/subdomain, yang memeriksa status undangan.
  // Next melayani isi public/ yang ada saat build apa adanya, sehingga undangan yang diturunkan tetap terbuka di sini.
  if (pathname.startsWith("/published/")) {
    return new NextResponse("Not Found", { status: 404 });
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

  const host = req.headers.get("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase(); // remove port & normalize
  const envRootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").split(":")[0].toLowerCase();
  
  const rootDomains = [envRootDomain, "localhost", "127.0.0.1"].filter(Boolean);

  const isRootDomain = rootDomains.some((d) => cleanHost === d || cleanHost === `www.${d}`);
  const isSubdomainOfOurs = rootDomains.some((d) => cleanHost.endsWith(`.${d}`) && cleanHost !== d && cleanHost !== `www.${d}`);
  const isCustomDomain = !isSubdomainOfOurs && !isRootDomain;

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
      return NextResponse.redirect(`${protocol}//${apexHost}/`, 301);
    }

    // 2. Subdomain 'demo' dialihkan ke katalog tema resmi di apex domain
    if (subdomain === "demo") {
      let targetPath = "/demo";
      if (pathname !== "/" && pathname !== "") {
        targetPath = pathname.startsWith("/demo") ? pathname : `/demo${pathname}`;
      }
      const redirectUrl = new URL(targetPath, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return NextResponse.redirect(redirectUrl, 307);
    }

    // 3. Subdomain sistem umum (www, app, auth, login, dashboard, dll) dialihkan langsung ke apex
    if (isReservedSubdomain(subdomain)) {
      const redirectUrl = new URL(pathname, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return NextResponse.redirect(redirectUrl, 307);
    }

    // 4. Seluruh halaman platform resmi DILARANG dibuka dari subdomain klien apapun
    const PLATFORM_PATHS = [
      "/admin", "/login", "/packages", "/checkout", "/onboarding",
      "/dashboard", "/contact", "/how-it-works", "/privacy", "/terms",
      "/refund", "/portfolio", "/demo"
    ];
    if (PLATFORM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const redirectUrl = new URL(pathname, `${protocol}//${apexHost}`);
      redirectUrl.search = req.nextUrl.search;
      return NextResponse.redirect(redirectUrl, 307);
    }
  }

  // 1. Admin login page
  if (pathname === "/admin/login") {
    if (isLoggedIn && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // 2. Client login page
  if (pathname === "/login") {
    if (isLoggedIn && !isAdmin) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.next();
  }

  // 3. Admin routes protection -> HANYA Admin yang diizinkan
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // 4. Client dashboard, packages, and checkout routes protection -> HANYA Client murni yang diizinkan (Admin diblokir)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/packages") || pathname.startsWith("/checkout")) {
    // PENGECUALIAN: Admin dengan cookie remote yang valid diizinkan masuk ke /dashboard
    const remoteClientId = req.cookies.get("lux_remote_client_id")?.value;
    if (isAdmin && remoteClientId) {
      return NextResponse.next();
    }

    if (!isLoggedIn || isAdmin) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // 5. Wildcard Subdomain Routing (e.g. didan-nasha.luxenary.id or didan-nasha.localhost:3000)

  // ── A. Subdomain milik kita (e.g. namapasangan.luxenary.id) ──
  if (isSubdomainOfOurs && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    const parts = cleanHost.split(".");
    if (parts.length > 1) {
      const subdomain = parts[0];

      // Hanya rute undangan klien yang dilayani di sini
      if (pathname === "/" || pathname === "") {
        const rewriteUrl = new URL(`/s/${subdomain}`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/memories" || pathname === "/galery" || pathname === "/gallery") {
        const rewriteUrl = new URL(`/s/${subdomain}/memories`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/receptionist") {
        const rewriteUrl = new URL(`/s/${subdomain}/receptionist`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/sharemoment") {
        const rewriteUrl = new URL(`/s/${subdomain}/sharemoment`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
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
        if (rest === "" || ["memories", "sharemoment", "receptionist", "galery", "gallery"].includes(rest)) {
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
      return NextResponse.redirect(redirectUrl, 307);
    }
  }

  // ── B. Custom Domain Klien (e.g. namapasangan.com) ──
  // Gunakan cache in-memory (TTL 5 menit) untuk menghindari amplifikasi self-fetch
  if (isCustomDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    try {
      const resolution = await resolveCustomDomain(cleanHost);
      const slug = resolution?.slug;

      if (slug) {
        const isFinished = resolution.status === "EVENT_FINISHED";
        const isArchived = resolution.status === "ARCHIVED";
        const viewInvitation = req.nextUrl.searchParams.get("view") === "invitation";

        if (pathname === "/" || pathname === "") {
          if (isFinished && !viewInvitation) {
            return NextResponse.rewrite(new URL(`/${slug}/memories${req.nextUrl.search}`, req.url));
          }
          const rewriteUrl = new URL(`/${slug}`, req.url);
          rewriteUrl.search = req.nextUrl.search;
          return NextResponse.rewrite(rewriteUrl);
        }
        if (pathname === "/memories" || pathname === "/galery" || pathname === "/gallery") {
          if (isArchived) {
            return NextResponse.rewrite(new URL(`/${slug}${req.nextUrl.search}`, req.url));
          }
          return NextResponse.rewrite(new URL(`/${slug}/memories${req.nextUrl.search}`, req.url));
        }
        if (pathname === "/receptionist") {
          return NextResponse.rewrite(new URL(`/${slug}/receptionist${req.nextUrl.search}`, req.url));
        }
        if (pathname === "/sharemoment") {
          return NextResponse.rewrite(new URL(`/${slug}/sharemoment${req.nextUrl.search}`, req.url));
        }
        // Guest param routing
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 1) {
          if (isFinished && !viewInvitation) {
            return NextResponse.rewrite(new URL(`/${slug}/memories${req.nextUrl.search}`, req.url));
          }
          return guestPathRedirect(req, host, segments[0]);
        }
      }
    } catch {
      // Resolusi gagal — biarkan Next.js handle (404)
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
        const allowedSubRoutes = ["memories", "sharemoment", "galery", "gallery", "receptionist"];
        if (allowedSubRoutes.includes(subRoute)) {
          // Normalisasi rute /gallery (2 'l') ke /galery jika diakses pada kanonikal
          if (subRoute === "gallery") {
            const rewriteUrl = new URL(`/${slug}/galery`, req.url);
            rewriteUrl.search = req.nextUrl.search;
            return NextResponse.rewrite(rewriteUrl);
          }
          // Biarkan Next.js routing menangani → app/(public)/[slug]/[subRoute]/page.tsx
          return NextResponse.next();
        } else {
          // Jika segment kedua BUKAN subRoute, berarti ini format SEO URL Portofolio: /groom-bride/invitation-slug
          // Maka slug aslinya adalah segment kedua
          slug = segments[1];
          const rewriteUrl = new URL(`/${slug}`, req.url);
          rewriteUrl.search = req.nextUrl.search;
          return NextResponse.rewrite(rewriteUrl);
        }
      }

      // Root slug — jika URL sudah persis /${slug}, biarkan Next.js route handler app/(public)/[slug]/route.ts menangani langsung tanpa rewrite loop
      return NextResponse.next();
    }
  }

  // 7. Isolated Portfolio Routing
  if (pathname.startsWith("/portfolio/") && !pathname.startsWith("/portfolio/assets/")) {
    const clientName = pathname.replace("/portfolio/", "");
    if (clientName && !clientName.includes("/")) {
      const rewriteUrl = new URL(`/portfolio/${clientName}.html`, req.url);
      rewriteUrl.search = req.nextUrl.search;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|music|assets|downloads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|mov|m4v|mp3|ogg|wav|m4a|flac|aac|css|js|woff2?|ttf|eot|otf|map|webmanifest)$).*)",
  ],
};