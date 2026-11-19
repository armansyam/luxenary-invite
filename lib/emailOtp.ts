import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

function otpSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET tidak dikonfigurasi; kode OTP tidak dapat ditandatangani.");
  }
  return secret;
}

export function normalizeOtpEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtpCode(email: string, purpose: string, code: string): string {
  const cleanEmail = normalizeOtpEmail(email);
  const cleanPurpose = String(purpose || "CLIENT_LOGIN").trim().toUpperCase();
  const cleanCode = String(code || "").trim();
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`otp:${cleanPurpose}:${cleanEmail}:${cleanCode}`)
    .digest("hex");
}

export async function createAndStoreOtp(
  email: string,
  purpose: "CLIENT_LOGIN" | "PARTNER_LOGIN" = "CLIENT_LOGIN",
): Promise<{ id: string; code: string; expiresAt: Date }> {
  const cleanEmail = normalizeOtpEmail(email);
  const code = generateOtpCode();
  const codeHash = hashOtpCode(cleanEmail, purpose, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailOtpToken.deleteMany({
      where: {
        email: cleanEmail,
        purpose,
        consumedAt: null,
      },
    });
    await tx.emailOtpToken.create({
      data: {
        email: cleanEmail,
        purpose,
        codeHash,
        expiresAt,
      },
    });
  });

  const latest = await prisma.emailOtpToken.findFirst({
    where: { email: cleanEmail, purpose, codeHash },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return { id: latest?.id || "", code, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "INVALID_CODE" | "ALREADY_USED" };

export async function verifyAndConsumeOtp(
  email: string,
  purpose: "CLIENT_LOGIN" | "PARTNER_LOGIN",
  rawCode: string,
): Promise<VerifyOtpResult> {
  const cleanEmail = normalizeOtpEmail(email);
  const cleanCode = String(rawCode || "").trim();
  if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) {
    return { ok: false, reason: "INVALID_CODE" };
  }

  const expectedHash = hashOtpCode(cleanEmail, purpose, cleanCode);

  return await prisma.$transaction(async (tx) => {
    const lockKey = `otp:${purpose}:${cleanEmail}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const token = await tx.emailOtpToken.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    if (token.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: "EXPIRED" };
    }
    if (token.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
    }

    const a = Buffer.from(token.codeHash);
    const b = Buffer.from(expectedHash);
    const matched = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!matched) {
      await tx.emailOtpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false, reason: "INVALID_CODE" };
    }

    const consumed = await tx.emailOtpToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      return { ok: false, reason: "ALREADY_USED" };
    }

    return { ok: true };
  });
}
