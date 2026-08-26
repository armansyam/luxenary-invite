import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
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
  const rootDomains = ["luxenary.id", "invited.id", "localhost"];
  const isCustomDomain = !rootDomains.some((d) => cleanHost === d || cleanHost === `www.${d}`);

  if (isCustomDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    // Extract subdomain (e.g. 'didan-nasha' from 'didan-nasha.luxenary.id' or 'didan-nasha.localhost')
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
      if (pathname === "/booth") {
        const rewriteUrl = new URL(`/s/${subdomain}/booth`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/liveshow") {
        const rewriteUrl = new URL(`/s/${subdomain}/liveshow`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      if (pathname === "/remote") {
        const rewriteUrl = new URL(`/s/${subdomain}/remote`, req.url);
        rewriteUrl.search = req.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl);
      }
      
      // Dynamic Path Routing for Guest Invitation (e.g. /v=Budi or /Sutejo)
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        const guestParam = segments[0]; 
        const rewriteUrl = new URL(`/s/${subdomain}`, req.url);
        // Merge existing search params first
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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|music).*)",
  ],
};