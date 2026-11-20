import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { validateAccountPassword } from "@/lib/emailOtp";

export const dynamic = "force-dynamic";

function resolveClientSession(session: any): { ok: true; userId: string } | { ok: false; status: number; error: string } {
  const user = session?.user as { id?: string; isAdmin?: boolean; isRemote?: boolean } | undefined;
  if (!user?.id) {
    return { ok: false, status: 401, error: "Sesi tidak valid. Silakan masuk kembali." };
  }
  if (user.isAdmin || user.isRemote) {
    return { ok: false, status: 403, error: "Pengaturan kata sandi hanya dapat diakses langsung oleh pemilik akun." };
  }
  return { ok: true, userId: user.id };
}

export async function GET() {
  try {
    const session = await auth();
    const guard = resolveClientSession(session);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const user = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { email: true, passwordHash: true, googleId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      hasPassword: Boolean(user.passwordHash),
      hasGoogle: Boolean(user.googleId),
    });
  } catch (error) {
    return routeError("ClientAccountPasswordGet", error, "Gagal memuat status keamanan akun.");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const guard = resolveClientSession(session);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (!(await rateLimitDb(`client_pw_change:${guard.userId}`, 8, 15 * 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan perubahan kata sandi. Silakan coba lagi beberapa menit lagi." },
        { status: 429 },
      );
    }

    const body = await readJsonBody<{ currentPassword?: string; newPassword?: string }>(req);
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    const passwordErr = validateAccountPassword(newPassword);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Kata sandi saat ini wajib diisi." }, { status: 400 });
      }
      const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validCurrent) {
        return NextResponse.json({ error: "Kata sandi saat ini tidak sesuai." }, { status: 401 });
      }
      if (currentPassword === newPassword) {
        return NextResponse.json({ error: "Kata sandi baru harus berbeda dari kata sandi saat ini." }, { status: 400 });
      }
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextHash },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      hasPassword: true,
      message: user.passwordHash
        ? "Kata sandi berhasil diperbarui. Sesi pada perangkat lain telah diakhiri."
        : "Kata sandi berhasil dibuat. Anda kini dapat masuk menggunakan email dan kata sandi.",
    });
  } catch (error) {
    return routeError("ClientAccountPasswordPut", error, "Gagal menyimpan kata sandi.");
  }
}
