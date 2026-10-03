import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import dns from "node:dns";

// Ensure IPv4 first to prevent IPv6 route-to-host timeouts (EHOSTUNREACH) on outbound OAuth discovery
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Runtime tanpa dukungan setDefaultResultOrder: urutan DNS bawaan dipakai; hanya optimasi, bukan syarat fungsi.
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
        portal: { label: "Portal", type: "text" }, // "ADMIN"
      },
      async authorize(credentials) {
        const portal = (credentials?.portal as string)?.toUpperCase() || "ADMIN";
        const emailOrUser = (credentials?.email as string)?.trim().toLowerCase() || "";
        const password = (credentials?.password as string) || "";

        // PORTAL ADMIN (Verifikasi username/email & bcrypt hash)
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
          permissions: admin.permissions || [],
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
          // Verifikasi ketersediaan layanan (Buka Normal / Tutup Order / Maintenance / Coming Soon)
          const { getServiceAvailability } = await import("@/lib/settings");
          const availability = await getServiceAvailability();

          if (!availability.isOpen) {
            const { prisma } = await import("@/lib/prisma");
            const cleanEmail = profile.email ? profile.email.toLowerCase().trim() : "";
            const existingUser = await prisma.user.findFirst({
              where: {
                OR: [
                  ...(profile.sub ? [{ googleId: profile.sub }] : []),
                  ...(cleanEmail ? [{ email: cleanEmail }] : []),
                ],
              },
              select: { id: true },
            });

            // Calon klien baru ditolak jika registrasi/order sedang ditutup
            if (!existingUser) {
              return `/login?error=RegistrationClosed&mode=${encodeURIComponent(availability.mode)}`;
            }
          }

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
      // Akun admin yang sudah dihapus: mengembalikan null mengakhiri sesi. Tanpa ini JWT lama (default 30 hari)
      // tetap membawa isAdmin dan role dari saat login.
      if (!user && (token as any).isAdmin && token.id) {
        const admin = await prisma.admin.findUnique({ where: { id: token.id as string }, select: { id: true } });
        if (!admin) return null;
      }
      if (user) {
        token.id = user.id;
        (token as any).role = (user as any).role || "CLIENT";
        (token as any).isAdmin = (user as any).isAdmin || false;
        (token as any).permissions = (user as any).permissions || [];
      }
      if (account?.provider === "google" && profile?.sub) {
        // Kegagalan DB di sini sengaja tidak ditelan: token dengan id/role bawaan Google akan tidak cocok dengan data pengguna.
        const { prisma } = await import("@/lib/prisma");
        const dbUser = await prisma.user.findUnique({ where: { googleId: profile.sub } });
        if (dbUser) {
          token.id = dbUser.id;
          (token as any).role = dbUser.role;
          (token as any).isAdmin = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = (token as any).role || "CLIENT";
        (session.user as any).isAdmin = (token as any).isAdmin || false;
        (session.user as any).permissions = (token as any).permissions || [];

        // Untuk akun Admin: Sinkronkan role dan permissions terbaru dari database agar perubahan instan
        if ((token as any).isAdmin && (token.id || (session.user as any).id)) {
          try {
            const { prisma } = await import("@/lib/prisma");
            const adminId = (token.id || (session.user as any).id) as string;
            const dbAdmin = await prisma.admin.findUnique({
              where: { id: adminId },
              select: { role: true, permissions: true },
            });
            if (dbAdmin) {
              (session.user as any).role = dbAdmin.role;
              (session.user as any).permissions = dbAdmin.permissions || [];
            }
          } catch (err) {
            console.error("Gagal sinkronisasi admin permissions:", err);
          }
        }

        // Untuk akun klien: Pastikan session.user.id selalu tersinkronisasi faktual dengan tabel User di database
        if (!(token as any).isAdmin && session.user.email) {
          try {
            const { prisma } = await import("@/lib/prisma");
            const cleanEmail = session.user.email.toLowerCase().trim();
            let dbUser = await prisma.user.findFirst({
              where: {
                OR: [
                  ...(token.id ? [{ id: token.id as string }] : []),
                  { email: cleanEmail },
                ],
              },
              select: { id: true, role: true, email: true },
            });

            if (!dbUser) {
              const { getServiceAvailability } = await import("@/lib/settings");
              const availability = await getServiceAvailability();
              if (!availability.isOpen) {
                // Batalkan pembuatan user otomatis jika status pendaftaran sedang ditutup
                return session;
              }

              dbUser = await prisma.user.create({
                data: {
                  email: cleanEmail,
                  name: session.user.name || "Mempelai",
                  avatarUrl: session.user.image || null,
                  role: "CLIENT",
                },
                select: { id: true, role: true, email: true },
              });
            }

            if (dbUser) {
              (session.user as any).id = dbUser.id;
              (session.user as any).role = dbUser.role || "CLIENT";
            }
          } catch (err) {
            console.error("Gagal sinkronisasi session user dengan database:", err);
          }
        }
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
              (session.user as any).originalRole = (token as any).role || "ADMIN";
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
