import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    if (!session?.user || !(session.user as any).isAdmin || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "ID wajib disertakan." }, { status: 400 });

    const { name, email, username, role: newRole, password } = await req.json();

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
    }

    // Prevent modifying the main super admin if it's the last one or something (optional guard)
    // For now, just allow Super Admins to edit any admin.

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (newRole) updateData.role = newRole;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.admin.update({
      where: { id },
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
        adminId: (session.user as any).id as string,
        action: "UPDATE_ADMIN",
        details: `Updated admin ${updated.username}${password ? ' (with password reset)' : ''}`,
      }
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error: any) {
    console.error("Error updating admin:", error);
    return NextResponse.json({ error: "Gagal memperbarui admin." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    if (!session?.user || !(session.user as any).isAdmin || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "ID wajib disertakan." }, { status: 400 });

    // Prevent deleting yourself
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminId: (session.user as any).id as string,
        action: "DELETE_ADMIN",
        details: `Deleted admin ${admin.username}`,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting admin:", error);
    return NextResponse.json({ error: "Gagal menghapus admin." }, { status: 500 });
  }
}
