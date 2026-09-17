import "next-auth";
import "next-auth/jwt";

/**
 * TypeScript Module Augmentation untuk NextAuth.
 *
 * Menambah field custom (id, isAdmin, role) ke interface bawaan NextAuth
 * agar akses session.user.isAdmin dan session.user.role bisa type-safe
 * tanpa perlu (session.user as any).isAdmin di setiap API route.
 *
 * Sebelum file ini ada: 208x `as any` cast tersebar di app/api/**
 * Setelah file ini ada: gunakan session.user.isAdmin / session.user.role langsung.
 */
declare module "next-auth" {
  interface User {
    id: string;
    isAdmin?: boolean;
    role?: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
    phoneNumber?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      role: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
      phoneNumber?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    role?: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
    phoneNumber?: string | null;
  }
}
