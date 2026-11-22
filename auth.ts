import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { REMOTE_COOKIE_NAME, readRemoteClientId } from "@/lib/remoteSession";
import { LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_MS, getClientIp, loginRateLimitKey, rateLimitDb } from "@/lib/rateLimit";
import dns from "node:dns";

// Prioritaskan IPv4 untuk mencegah timeout EHOSTUNREACH pada koneksi keluar server (SMTP/gateway)
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Runtime tanpa dukungan setDefaultResultOrder: urutan DNS bawaan dipakai; hanya optimasi, bukan syarat fungsi.
}

function clientPasswordTag(passwordHash: string | null | undefined): string {
  return passwordHash ? passwordHash.slice(-12) : "";
}

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
      async authorize(credentials, request) {
        const portal = (credentials?.portal as string)?.toUpperCase() || "ADMIN";
        const emailOrUser = (credentials?.email as string)?.trim().toLowerCase() || "";
        const password = (credentials?.password as string) || "";
        const failed = async () => {
          await rateLimitDb(loginRateLimitKey(getClientIp(request)), LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_MS);
          return null;
        };

        // PORTAL KLIEN EMAIL & KATA SANDI (Verifikasi bcrypt hash; OTP hanya dipakai untuk pendaftaran & reset kata sandi)
        if (portal === "CLIENT_PASSWORD") {
          if (!emailOrUser || !password) return failed();

          const client = await prisma.user.findUnique({ where: { email: emailOrUser } });
          if (!client || !client.passwordHash) {
            return failed();
          }

          const isValid = await bcrypt.compare(password, client.passwordHash);
          if (!isValid) {
            return failed();
          }

          return {
            id: client.id,
            name: client.name,
            email: client.email,
            role: client.role || "CLIENT",
            permissions: [],
            isAdmin: false,
            pwdTag: clientPasswordTag(client.passwordHash),
          };
        }

        // PORTAL ADMIN (Verifikasi username/email & bcrypt hash)
        if (portal !== "ADMIN") {
          return failed();
        }

        if (!emailOrUser || !password) return failed();

        // Tidak peka huruf besar: akun yang dibuat sebelum rute admin menyimpan username/email dalam huruf kecil
        // (19 Okt 2026) masih memakai huruf besar dan tidak pernah cocok dengan isian yang sudah di-lowercase.
        const admin = await prisma.admin.findFirst({
          where: {
            OR: [
              { email: { equals: emailOrUser, mode: "insensitive" } },
              { username: { equals: emailOrUser, mode: "insensitive" } },
            ],
          },
        });

        // Admin wajib terdaftar dan memiliki hash password yang valid
        if (!admin || !admin.passwordHash) {
          return failed();
        }

        // Verifikasi murni dengan bcrypt — Tanpa bypass, tanpa fallback
        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) {
          return failed();
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
          sessionVersion: admin.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Akun admin yang sudah dihapus, atau yang password/peran/izinnya berubah sesudah token terbit: mengembalikan
      // null mengakhiri sesi. Tanpa ini JWT lama (default 30 hari) tetap membawa isAdmin dan role dari saat login.
      // Token tanpa `sv` (terbit sebelum kolom ada) tidak cocok dan berakhir sekali.
      if (!user && (token as any).isAdmin && token.id) {
        const admin = await prisma.admin.findUnique({
          where: { id: token.id as string },
          select: { id: true, sessionVersion: true, role: true, permissions: true },
        });
        if (!admin || admin.sessionVersion !== token.sv) return null;
        // Sinkronkan role dan permissions terbaru di sini agar callback session() tidak perlu query DB kedua.
        (token as any).role = admin.role;
        (token as any).permissions = admin.permissions || [];
      }
      // Klien yang dihapus admin atau yang kata sandinya telah diatur ulang diakhiri sesinya pada perangkat lama.
      if (!user && !(token as any).isAdmin && (token.id || token.email)) {
        const client = await prisma.user.findFirst({
          where: {
            OR: [
              ...(token.id ? [{ id: token.id as string }] : []),
              ...(token.email ? [{ email: token.email.toLowerCase().trim() }] : []),
            ],
          },
          select: { id: true, role: true, passwordHash: true },
        });
        if (!client) return null;
        const currentPwdTag = clientPasswordTag(client.passwordHash);
        if ((token as any).pwdTag !== undefined && (token as any).pwdTag !== currentPwdTag) {
          return null;
        }
        token.id = client.id;
        (token as any).role = client.role || "CLIENT";
        (token as any).pwdTag = currentPwdTag;
      }
      if (user) {
        token.id = user.id;
        (token as any).role = (user as any).role || "CLIENT";
        (token as any).isAdmin = (user as any).isAdmin || false;
        (token as any).permissions = (user as any).permissions || [];
        if ((user as any).isAdmin) token.sv = (user as any).sessionVersion ?? 0;
        else if ((user as any).pwdTag !== undefined) (token as any).pwdTag = (user as any).pwdTag;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // role, permissions, dan id sudah disinkronkan dari DB di callback jwt() pada request yang sama.
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = (token as any).role || "CLIENT";
        (session.user as any).isAdmin = (token as any).isAdmin || false;
        (session.user as any).permissions = (token as any).permissions || [];
      }

      // Mode Remote Admin: workspace diganti ke klien hanya bila cookie bertanda tangan milik admin ini dan admin masih
      // berizin modul Klien atau Projek Undangan (izin dibaca ulang dari DB di atas).
      const sessionUser = session?.user as any;
      if (sessionUser?.isAdmin && (hasAdminPermission(sessionUser, "users") || hasAdminPermission(sessionUser, "invitations"))) {
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const remoteClientId = readRemoteClientId(cookieStore.get(REMOTE_COOKIE_NAME)?.value, String(token.id || token.sub || ""));
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
  // Sesi remote memakai cookie tersendiri (terikat admin, berlaku 1 jam) yang tidak ikut terhapus oleh logout NextAuth.
  // Tanpa ini admin yang logout lalu masuk lagi dalam jam itu kembali mengemulasikan klien tanpa sengaja, dan sebagian
  // aksi admin terblokir selama mode remote.
  events: {
    async signIn() {
      await clearRemoteSessionCookie();
    },
    async signOut() {
      await clearRemoteSessionCookie();
    },
  },
});

async function clearRemoteSessionCookie() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete(REMOTE_COOKIE_NAME);
}
