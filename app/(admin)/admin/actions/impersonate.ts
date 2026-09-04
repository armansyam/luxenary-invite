"use server";

import { auth } from "@/auth";
import crypto from "crypto";

export async function getImpersonationToken(clientId: string) {
  const session = await auth();
  
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    throw new Error("Unauthorized. Hanya Admin yang dapat melakukan impersonation.");
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  // Token expires in 60 seconds
  const expiresAt = Date.now() + 60000;
  
  // Data to sign
  const payload = `${clientId}:${expiresAt}`;
  
  // Create HMAC
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  
  // Return formatted token: "clientId:expiresAt:signature"
  return `${payload}:${signature}`;
}
