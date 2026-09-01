import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
// @ts-ignore
import Database from "better-sqlite3";
import path from "path";

// Membaca Google OAuth Client ID & Secret langsung dari database (admin_settings)
function getDynamicGoogleCredentials(): { clientId: string; clientSecret: string } {
  try {
    const dbPath = path.join(process.cwd(), "dev.db");
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare("SELECT key, value FROM admin_settings WHERE key IN ('google_client_id', 'google_client_secret')")
      .all() as { key: string; value: string }[];
    db.close();

    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });

    return {
      clientId: map["google_client_id"] || process.env.GOOGLE_CLIENT_ID || "dummy_client_id",
      clientSecret: map["google_client_secret"] || process.env.GOOGLE_CLIENT_SECRET || "dummy_client_secret",
    };
  } catch (err) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy_client_secret",
    };
  }
}

const googleCreds = getDynamicGoogleCredentials();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email / Username", type: "text" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" }, // "ADMIN" or "CLIENT"
      },
      async authorize(credentials) {
        const portal = (credentials?.portal as string)?.toUpperCase() || "CLIENT";
        const emailOrUser = (credentials?.email as string)?.trim().toLowerCase() || "";
        const password = (credentials?.password as string) || "";

        // CredentialsProvider HANYA untuk Admin Portal (Verifikasi username/email & bcrypt hash)
        if (portal !== "ADMIN") {
          return null;
        }

        if (!emailOrUser || !password) return null;

        // Resolve admin strictly by email or username
        const admin = await prisma.admin.findFirst({
          where: {
            OR: [
              { email: emailOrUser },
              { username: emailOrUser },
            ],
          },
        });

        // Admin wajib terdaftar dan memiliki hash password yang valid
        if (!admin || !admin.passwordHash) {
          return null;
        }

        // Verifikasi murni dengan bcrypt — Tanpa bypass, tanpa fallback
        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) {
          return null;
        }

        await prisma.admin.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        await prisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: "ADMIN_LOGIN",
            details: `Login sukses via Admin Portal (${admin.email})`,
          },
        }).catch(() => {});

        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role || "SUPER_ADMIN",
          isAdmin: true,
        };
      },
    }),
    ...(googleCreds.clientId && googleCreds.clientSecret
      ? [
          GoogleProvider({
            clientId: googleCreds.clientId,
            clientSecret: googleCreds.clientSecret,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile) {
        try {
          const { upsertGoogleUser } = await import("@/lib/auth");
          await upsertGoogleUser({
            sub: profile.sub!,
            email: profile.email!,
            name: profile.name!,
            picture: (profile as any).picture,
          });
        } catch (err) {
          console.error("Error upserting Google user:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        (token as any).role = (user as any).role || "CLIENT";
        (token as any).isAdmin = (user as any).isAdmin || false;
      }
      if (account?.provider === "google" && profile?.sub) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const dbUser = await prisma.user.findUnique({ where: { googleId: profile.sub } });
          if (dbUser) {
            token.id = dbUser.id;
            (token as any).role = dbUser.role;
            (token as any).isAdmin = false;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = (token as any).role || "CLIENT";
        (session.user as any).isAdmin = (token as any).isAdmin || false;
      }
      return session;
    },
  },
});
