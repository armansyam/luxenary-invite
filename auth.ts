import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertGoogleUser } from "@/lib/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!profile) return false;
      await upsertGoogleUser({
        sub: profile.sub!,
        email: profile.email!,
        name: profile.name!,
        picture: (profile as any).picture,
      });
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
});
