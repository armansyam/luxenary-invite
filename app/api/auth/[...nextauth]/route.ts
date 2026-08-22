import { getServerSession } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertGoogleUser } from "@/lib/auth";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!profile) return false;
      await upsertGoogleUser(profile);
      return true;
    },
    async session({ session }) {
      // attach role from DB (optional)
      return session;
    },
  },
};

export const { handlers, signIn, signOut } = NextAuth(authOptions);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  return Response.json({ session });
}
