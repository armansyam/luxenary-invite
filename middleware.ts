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
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 3. Admin routes protection -> redirect to /admin/login
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // 4. Client dashboard routes protection -> redirect to /login
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
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
        return NextResponse.rewrite(new URL(`/s/${subdomain}`, req.url));
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