/**
 * NextAuth v5 Type Augmentation
 * Memperluas interface User & Session agar field custom (id, role, isAdmin)
 * tersedia secara type-safe tanpa perlu (session.user as any) di seluruh kodebase.
 */

import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string; // "CLIENT" | "ADMIN" | "SUPER_ADMIN" | "FINANCE" | "SUPPORT"
    isAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      isAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isAdmin: boolean;
  }
}
