import "next-auth";
import "next-auth/jwt";

/**
 * Augmentasi tipe NextAuth (satu-satunya sumber).
 * Field custom yang diisi di `auth.ts` dan `auth.config.ts`:
 * id, role, isAdmin, permissions (izin modul admin), originalRole (peran asli saat sesi remote admin).
 */
export type AppRole = "SUPER_ADMIN" | "ADMIN" | "FINANCE" | "SUPPORT" | "CLIENT";

declare module "next-auth" {
  interface User {
    id: string;
    isAdmin?: boolean;
    role?: AppRole;
    originalRole?: AppRole;
    permissions?: string[];
    phoneNumber?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      role: AppRole;
      originalRole?: AppRole;
      originalAdminId?: string;
      isRemote?: boolean;
      permissions?: string[];
      phoneNumber?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    role?: AppRole;
    originalRole?: AppRole;
    permissions?: string[];
    phoneNumber?: string | null;
  }
}
