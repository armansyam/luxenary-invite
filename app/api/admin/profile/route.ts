import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAnyAdmin } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import bcrypt from "bcryptjs";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/adminCredentials";

export async function PUT(req: Request) {
  try {
    // Setiap admin yang login boleh mengubah profil mereka sendiri
    const guard = await requireAnyAdmin();
    if (!guard.ok) return guard.response;

    const adminId = adminActorId(guard.session);
    const { name, email, username, currentPassword, newPassword } = (await readJsonBody(req)) ?? {};

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: "Akun admin tidak ditemukan." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    // Login admin memangkas dan me-lowercase isian sebelum mencocokkan (auth.ts), jadi disimpan dalam bentuk yang sama.
    if (email && String(email).trim()) updateData.email = String(email).trim().toLowerCase();
    if (username && String(username).trim()) updateData.username = String(username).trim().toLowerCase();

    // Jika ingin mengganti password, butuh validasi password lama
    if (newPassword) {
      if (String(newPassword).trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
        return NextResponse.json({ error: `Password minimal ${MIN_ADMIN_PASSWORD_LENGTH} karakter.` }, { status: 400 });
      }
      if (!currentPassword) {
        return NextResponse.json({ error: "Password saat ini wajib diisi untuk mengganti password." }, { status: 400 });
      }

      if (admin.passwordHash) {
        const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
        }
      } else {
        // Akun tanpa password aktif (dinonaktifkan seed karena password bawaan) tidak dapat memverifikasi password lama.
        return NextResponse.json(
          { error: "Akun ini tidak memiliki password aktif. Atur ulang lewat skrip set-admin-password di server." },
          { status: 409 }
        );
      }

      // Dipangkas seperti di halaman login admin; spasi di ujung membuat password tidak pernah cocok.
      updateData.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
      // Mencabut semua JWT akun ini, termasuk sesi yang sedang dipakai untuk mengganti password.
      updateData.sessionVersion = { increment: 1 };
    }

    const updated = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: "UPDATE_PROFILE",
        details: `Admin updated their own profile ${newPassword ? '(with password change)' : ''}`,
      }
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error) {
    return routeError("AdminProfile", error, "Gagal memperbarui profil.");
  }
}
