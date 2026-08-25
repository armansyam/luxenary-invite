import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "luxenary_super_secret_session_key_2026_dev_secure_ams",
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = (auth?.user as any)?.isAdmin === true || (auth?.user as any)?.role === "ADMIN" || (auth?.user as any)?.role === "SUPER_ADMIN";
      const pathname = nextUrl.pathname;

      // Allow public access to login pages
      if (pathname === "/admin/login" || pathname === "/login") {
        return true;
      }

      // Admin portal protection — HANYA role Admin / Super Admin
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn || !isAdmin) {
          return false;
        }
        return true;
      }

      // Client dashboard protection — HANYA role Client murni (Admin DILARANG masuk dashboard client)
      if (pathname.startsWith("/dashboard")) {
        const isClient = isLoggedIn && !isAdmin && (auth?.user as any)?.role === "CLIENT";
        if (!isClient) {
          return false;
        }
        return true;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        (token as any).role = (user as any).role || "CLIENT";
        (token as any).isAdmin = (user as any).isAdmin || false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = (token as any).role || "CLIENT";
        (session.user as any).isAdmin = (token as any).isAdmin || false;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
