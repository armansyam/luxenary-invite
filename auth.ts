import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { CredentialsSignin } from "next-auth";

class ImpersonateError extends CredentialsSignin {
  constructor(msg: string) {
    super();
    this.code = msg;
  }
}

// Google OAuth credentials dibaca dari .env (bukan dari database)
// Untuk mengubah credentials, update .env dan restart server.
const googleCreds = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
};

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

      // Mode Remote Admin: Override workspace ke target klien jika cookie lux_remote_client_id aktif
      if ((session?.user as any)?.isAdmin) {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const remoteClientId = cookieStore.get("lux_remote_client_id")?.value;
          if (remoteClientId) {
            const clientUser = await prisma.user.findUnique({
              where: { id: remoteClientId },
              select: { id: true, name: true, email: true, role: true },
            });
            if (clientUser && session.user) {
              (session.user as any).originalAdminId = token.id || token.sub;
              (session.user as any).isRemote = true;
              (session.user as any).id = clientUser.id;
              (session.user as any).email = clientUser.email;
              (session.user as any).name = clientUser.name;
              (session.user as any).role = clientUser.role || "CLIENT";
              (session.user as any).isAdmin = true;
            }
          }
        } catch {
          // Abaikan jika dipanggil di luar HTTP request context
        }
      }

      return session;
    },
  },
});
