import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const PARTNER_COOKIE_NAME = "lux_partner_session";
export const PARTNER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface PartnerSessionPayload {
  partnerId: string;
  email: string;
  exp: number;
}

function getPartnerSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET tidak dikonfigurasi; sesi mitra tidak dapat ditandatangani.");
  }
  return secret;
}

function signHmac(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getPartnerSecret())
    .update(`partner-session:${payloadB64}`)
    .digest("base64url");
}

export function signPartnerSession(partnerId: string, email: string): string {
  const payload: PartnerSessionPayload = {
    partnerId,
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + PARTNER_SESSION_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = signHmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyPartnerSession(token: string | undefined | null): PartnerSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  try {
    const expected = signHmac(payloadB64);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    ) as Partial<PartnerSessionPayload>;

    if (
      typeof decoded.partnerId !== "string" ||
      !decoded.partnerId ||
      typeof decoded.email !== "string" ||
      !decoded.email ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }

    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      partnerId: decoded.partnerId,
      email: decoded.email,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export async function getPartnerSessionFromRequest(
  req?: NextRequest,
): Promise<PartnerSessionPayload | null> {
  if (req) {
    return verifyPartnerSession(req.cookies.get(PARTNER_COOKIE_NAME)?.value);
  }
  const store = await cookies();
  return verifyPartnerSession(store.get(PARTNER_COOKIE_NAME)?.value);
}
