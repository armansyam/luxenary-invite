import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, isRateLimitExhausted, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { normalizeOtpEmail } from "@/lib/emailOtp";
import {
  PARTNER_COOKIE_NAME,
  PARTNER_SESSION_TTL_SECONDS,
  signPartnerSession,
} from "@/lib/partnerAuth";

export const dynamic = "force-dynamic";

const PARTNER_LOGIN_FAIL_LIMIT = 10;
const PARTNER_LOGIN_FAIL_WINDOW_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const failKey = `partner_login_fail:${ip}`;
    if (await isRateLimitExhausted(failKey, PARTNER_LOGIN_FAIL_LIMIT)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan masuk yang gagal. Silakan tunggu 15 menit." },
        { status: 429 },
      );
    }

    const body = await readJsonBody<{ email?: string; password?: string }>(req);
    const cleanEmail = normalizeOtpEmail(body?.email || "");
    const password = typeof body?.password === "string" ? body.password : "";

    if (!cleanEmail || !password) {
      return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 });
    }

    const partner = await prisma.partnerAffiliate.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true, name: true, email: true, passwordHash: true, sessionVersion: true },
    });

    if (!partner) {
      await rateLimitDb(failKey, PARTNER_LOGIN_FAIL_LIMIT, PARTNER_LOGIN_FAIL_WINDOW_MS);
      return NextResponse.json({ error: "Email atau kata sandi mitra salah." }, { status: 401 });
    }

    if (!partner.passwordHash) {
      return NextResponse.json(
        {
          error: "Akun mitra belum diaktivasi. Klik tab Aktivasi Akun untuk verifikasi OTP dan membuat kata sandi pertama Anda.",
          code: "PASSWORD_NOT_SET",
        },
        { status: 403 },
      );
    }

    const isValid = await bcrypt.compare(password, partner.passwordHash);
    if (!isValid) {
      await rateLimitDb(failKey, PARTNER_LOGIN_FAIL_LIMIT, PARTNER_LOGIN_FAIL_WINDOW_MS);
      return NextResponse.json({ error: "Email atau kata sandi mitra salah." }, { status: 401 });
    }

    const token = signPartnerSession(partner.id, partner.email || cleanEmail, partner.sessionVersion);
    const res = NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email || cleanEmail,
      },
    });

    res.cookies.set(PARTNER_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PARTNER_SESSION_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (error) {
    return routeError("PartnerPasswordLogin", error, "Gagal masuk ke portal mitra.");
  }
}
