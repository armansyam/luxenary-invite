import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes protection
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public routes - no auth needed
        if (path.startsWith("/api/auth") || path === "/login") return true;
        // Client dashboard needs auth
        if (path.startsWith("/dashboard")) return !!token;
        // Admin needs auth + admin role
        if (path.startsWith("/admin")) return !!token && token.role === "ADMIN";
        // Everything else public
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/((?!auth).)*",
  ],
};