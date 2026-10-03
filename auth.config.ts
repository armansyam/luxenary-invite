import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  // Perlindungan rute (admin, dashboard klien) ada di proxy.ts. Callback `authorized` tidak dipasang di sini karena
  // proxy memakai handler kustom, dan Auth.js mengabaikan hasil boolean `authorized` bila handler kustom ada.
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        (token as any).role = (user as any).role || "CLIENT";
        (token as any).isAdmin = (user as any).isAdmin || false;
        (token as any).permissions = (user as any).permissions || [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = (token as any).role || "CLIENT";
        (session.user as any).isAdmin = (token as any).isAdmin || false;
        (session.user as any).permissions = (token as any).permissions || [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
