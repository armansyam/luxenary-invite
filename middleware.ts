import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

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

async function resolveCustomDomain(host: string, baseUrl: string): Promise<CustomDomainResolution | null> {
  const now = Date.now();

  // Cek cache terlebih dahulu
  const cached = customDomainCache.get(host);
  if (cached && cached.expiry > now) {
    return cached;
  }

  // Cleanup cache yang expired (lazy cleanup)
  if (customDomainCache.size > 500) {
    for (const [key, val] of customDomainCache.entries()) {
      if (val.expiry <= now) customDomainCache.delete(key);
    }
  }

  // Fetch ke API internal
  try {
    const resolveUrl = new URL(`/api/public/resolve-custom-domain?host=${encodeURIComponent(host)}`, baseUrl);
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


export default auth(async (req) => {
  const isLoggedIn = !!req.auth?.user;
  const isAdmin = (req.auth?.user as any)?.isAdmin === true || (req.auth?.user as any)?.role === "ADMIN" || (req.auth?.user as any)?.role === "SUPER_ADMIN";
  const { pathname } = req.nextUrl;

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
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
    if (!isLoggedIn || isAdmin) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // 5. Wildcard Subdomain Routing (e.g. didan-nasha.luxenary.id or didan-nasha.localhost:3000)
  const host = req.headers.get("host") || "";
  const cleanHost = host.split(":")[0]; // remove port
  // Root domain dibaca dari env — tidak hardcode agar bisa ganti domain tanpa ubah kode
  const envRootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").split(":")[0];
  const rootDomains = [envRootDomain, "localhost", "trycloudflare.com"].filter(Boolean);
  const isSubdomainOfOurs = rootDomains.some((d) => cleanHost.endsWith(`.${d}`));
  const isRootDomain = rootDomains.some((d) => cleanHost === d || cleanHost === `www.${d}`);
  const isCustomDomain = !isSubdomainOfOurs && !isRootDomain;

  // ── A. Subdomain milik kita (e.g. namapasangan.luxenary.id) ──
  if (isSubdomainOfOurs && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    const parts = cleanHost.split(".");
    if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "admin" && parts[0] !== "api") {
      const subdomain = parts[0];
      if (pathname === "/" || pathname === "") {
        const rewriteUrl = new URL(`/s/${subdomain}`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/memories") {
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
        const guestParam = segments[0];
        const rewriteUrl = new URL(`/s/${subdomain}`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        if (guestParam.startsWith('v=')) {
          rewriteUrl.searchParams.set('v', guestParam.slice(2));
        } else {
          rewriteUrl.searchParams.set('to', guestParam);
        }
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  // ── B. Custom Domain Klien (e.g. namapasangan.com) ──
  // Gunakan cache in-memory (TTL 5 menit) untuk menghindari amplifikasi self-fetch
  if (isCustomDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    try {
      const resolution = await resolveCustomDomain(cleanHost, req.url);
      const slug = resolution?.slug;

      if (slug) {
        const isFinished = resolution.status === "EVENT_FINISHED";

        if (pathname === "/" || pathname === "") {
          if (isFinished) {
            return NextResponse.rewrite(new URL(`/${slug}/memories${req.nextUrl.search}`, req.url));
          }
          const rewriteUrl = new URL(`/${slug}`, req.url);
          rewriteUrl.search = req.nextUrl.search;
          return NextResponse.rewrite(rewriteUrl);
        }
        if (pathname === "/memories") {
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
          if (isFinished) {
            return NextResponse.rewrite(new URL(`/${slug}/memories${req.nextUrl.search}`, req.url));
          }
          const rewriteUrl = new URL(`/${slug}`, req.url);
          rewriteUrl.searchParams.set('to', segments[0]);
          return NextResponse.rewrite(rewriteUrl);
        }
      }
    } catch {
      // Resolusi gagal — biarkan Next.js handle (404)
    }
  }

  // 6. Canonical Path Routing — Flat Slug (e.g. /namapasangan-030326 atau /namapasangan-030326/memories)
  // Hanya untuk root domain, bukan subdomain atau custom domain
  if (!isCustomDomain && !isSubdomainOfOurs && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static") && !pathname.startsWith("/admin") && !pathname.startsWith("/dashboard") && !pathname.startsWith("/login") && !pathname.startsWith("/onboarding") && !pathname.startsWith("/packages") && !pathname.startsWith("/checkout") && !pathname.startsWith("/demo") && !pathname.startsWith("/portfolio") && !pathname.startsWith("/privacy") && !pathname.startsWith("/terms") && !pathname.startsWith("/refund") && !pathname.startsWith("/s/")) {
    const segments = pathname.split("/").filter(Boolean);

    // Exclusion list — path-path sistem yang tidak boleh di-intercept
    const SYSTEM_PATHS = ["uploads", "css", "js", "fonts", "images", "music", "assets", "downloads", "published", "favicon.ico"];

    if (segments.length >= 1 && !SYSTEM_PATHS.includes(segments[0])) {
      let slug = segments[0]; // Default slug is the first segment

      // Sub-routes di bawah slug (memories, sharemoment, galery) ATAU SEO URL (couple-slug/invitation-slug)
      if (segments.length >= 2) {
        const subRoute = segments[1];
        const allowedSubRoutes = ["memories", "sharemoment", "galery"];
        if (allowedSubRoutes.includes(subRoute)) {
          // Biarkan Next.js routing menangani → app/(public)/[slug]/[subRoute]/page.tsx
          return NextResponse.next();
        } else {
          // Jika segment kedua BUKAN subRoute, berarti ini format SEO URL Portofolio: /groom-bride/invitation-slug
          // Maka slug aslinya adalah segment kedua
          slug = segments[1];
        }
      }

      // Root slug — serve static HTML jika ada, fallback ke Next.js page
      const rewriteUrl = new URL(`/${slug}`, req.url);
      rewriteUrl.search = req.nextUrl.search;
      return NextResponse.rewrite(rewriteUrl);
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|music|assets|downloads).*)",
  ],
};