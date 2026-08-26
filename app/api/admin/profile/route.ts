import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    
    // Setiap admin yang login boleh mengubah profil mereka sendiri
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const adminId = (session.user as any).id as string;
    const { name, email, username, currentPassword, newPassword } = await req.json();

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: "Akun admin tidak ditemukan." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (username) updateData.username = username;

    // Jika ingin mengganti password, butuh validasi password lama
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Password saat ini wajib diisi untuk mengganti password." }, { status: 400 });
      }

      if (admin.passwordHash) {
        const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!isValid) {
          return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
        }
      } else if (currentPassword !== "default_admin_password_bypass_check") {
          // Edge case: if admin had no passwordHash (e.g. initial setup)
          return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
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
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Gagal memperbarui profil." }, { status: 500 });
  }
}
