import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

        // ─── 1. ADMIN PORTAL ────────────────────────────────────────────────────
        if (portal === "ADMIN") {
          if (!emailOrUser || !password) return null;

          // Resolve admin by email or username
          const admin = await prisma.admin.findFirst({
            where: {
              OR: [
                { email: emailOrUser },
                { username: emailOrUser },
                { username: emailOrUser.replace("@luxenary.id", "") },
              ],
            },
          });

          if (!admin) {
            // Auto-bootstrap first admin if no admin exists in DB at all
            const adminCount = await prisma.admin.count();
            if (adminCount === 0) {
              const defaultPass = process.env.ADMIN_PASSWORD || "luxenary-admin-2026";
              const isDefaultPass = password === defaultPass;
              if (!isDefaultPass) return null;

              const hash = await bcrypt.hash(password, 12);
              const newAdmin = await prisma.admin.create({
                data: {
                  username: "admin",
                  email: "admin@luxenary.id",
                  name: "Super Administrator Luxenary",
                  role: "SUPER_ADMIN",
                  passwordHash: hash,
                  lastLoginAt: new Date(),
                },
              });

              await prisma.adminAuditLog.create({
                data: {
                  adminId: newAdmin.id,
                  action: "ADMIN_FIRST_SETUP",
                  details: "Admin pertama berhasil dibuat dan login.",
                },
              }).catch(() => {});

              return {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: "SUPER_ADMIN",
                isAdmin: true,
              };
            }
            return null; // Admin not found
          }

          // Verify password
          if (admin.passwordHash) {
            const isValid = await bcrypt.compare(password, admin.passwordHash);
            if (!isValid) return null;
          } else {
            // No hash set yet — allow login with env default password and set hash
            const defaultPass = process.env.ADMIN_PASSWORD || "luxenary-admin-2026";
            if (password !== defaultPass) return null;

            // Upgrade: store hash
            const hash = await bcrypt.hash(password, 12);
            await prisma.admin.update({
              where: { id: admin.id },
              data: { passwordHash: hash },
            });
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
            role: "SUPER_ADMIN",
            isAdmin: true,
          };
        }

        // ─── 2. CLIENT PORTAL ───────────────────────────────────────────────────
        if (!emailOrUser || !emailOrUser.includes("@")) return null;

        const user = await prisma.user.findUnique({
          where: { email: emailOrUser },
        });

        // Only allow existing users (registered via Google OAuth or admin-created)
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "CLIENT",
          isAdmin: false,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
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
        }
      }
      return true;
    },
  },
});
