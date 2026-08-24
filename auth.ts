import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";

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
        const emailOrUser = (credentials?.email as string)?.trim().toLowerCase() || (portal === "ADMIN" ? "admin@luxenary.id" : "client@luxenary.id");

        // 1. ADMIN PORTAL LOGIN -> ISOLATED 'admins' TABLE
        if (portal === "ADMIN" || emailOrUser.includes("admin")) {
          let admin = await prisma.admin.findFirst({
            where: {
              OR: [
                { email: emailOrUser },
                { username: emailOrUser.replace("@luxenary.id", "") },
              ],
            },
          });

          if (!admin) {
            admin = await prisma.admin.create({
              data: {
                username: "admin",
                email: "admin@luxenary.id",
                name: "Super Administrator Luxenary",
                role: "SUPER_ADMIN",
                lastLoginAt: new Date(),
              },
            });
          } else {
            admin = await prisma.admin.update({
              where: { id: admin.id },
              data: { lastLoginAt: new Date() },
            });
          }

          // Record Security Audit Log
          try {
            await prisma.adminAuditLog.create({
              data: {
                adminId: admin.id,
                action: "ADMIN_LOGIN",
                details: `Login sukses via Admin Portal (${admin.email})`,
              },
            });
          } catch (e) {
            console.error("Audit log error:", e);
          }

          return {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: "SUPER_ADMIN",
            isAdmin: true,
          };
        }

        // 2. CLIENT PORTAL LOGIN -> ISOLATED 'users' TABLE
        const clientEmail = emailOrUser.includes("@") ? emailOrUser : `${emailOrUser}@luxenary.id`;
        let user = await prisma.user.findUnique({
          where: { email: clientEmail },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              email: clientEmail,
              name: clientEmail.split("@")[0] || "Mempelai",
              role: "CLIENT",
            },
          });
        }

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
