import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/adminCredentials";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const guard = await requireAdminModule("team");
    if (!guard.ok) return guard.response;
    const { session } = guard;
    const actorId = adminActorId(session);

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "ID wajib disertakan." }, { status: 400 });

    const { name, email, username, role: newRole, password, permissions } = (await readJsonBody(req)) ?? {};

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
    }

    // Cegah Super Admin men-downgrade akunnya sendiri agar tidak terkunci
    if (existing.role === "SUPER_ADMIN" && newRole && newRole !== "SUPER_ADMIN" && existing.id === actorId) {
      return NextResponse.json({ error: "Anda tidak dapat menurunkan hak akses Super Admin pada akun Anda sendiri." }, { status: 400 });
    }

    const { resolveAdminPermissions } = await import("@/lib/adminPermissions");

    const updateData: any = {};
    if (name) updateData.name = name;
    // Login admin memangkas dan me-lowercase isian sebelum mencocokkan (auth.ts), jadi disimpan dalam bentuk yang sama.
    if (email && String(email).trim()) updateData.email = String(email).trim().toLowerCase();
    if (username && String(username).trim()) updateData.username = String(username).trim().toLowerCase();
    if (newRole) updateData.role = newRole;
    
    const targetRole = newRole || existing.role;
    if (targetRole === "SUPER_ADMIN") {
      updateData.permissions = [];
    } else if (Array.isArray(permissions)) {
      updateData.permissions = resolveAdminPermissions(targetRole, permissions);
    }

    // Dipangkas seperti di halaman login admin; spasi di ujung membuat password tidak pernah cocok.
    if (password && String(password).trim()) {
      if (String(password).trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
        return NextResponse.json({ error: `Password minimal ${MIN_ADMIN_PASSWORD_LENGTH} karakter.` }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    // Password, peran, atau izin yang berubah mencabut JWT lama akun ini; izin disimpan di token saat login.
    const sortedJson = (list: string[]) => JSON.stringify([...list].sort());
    const permissionsChanged = updateData.permissions !== undefined && sortedJson(updateData.permissions) !== sortedJson(existing.permissions);
    const roleChanged = Boolean(newRole) && newRole !== existing.role;
    if (updateData.passwordHash || roleChanged || permissionsChanged) {
      updateData.sessionVersion = { increment: 1 };
    }

    const [updated] = await prisma.$transaction([
      prisma.admin.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "UPDATE_ADMIN",
          details: `Updated admin ${username || existing.username}${password ? ' (with password reset)' : ''}`,
        }
      }),
    ]);

    return NextResponse.json({ success: true, admin: updated });
  } catch (error) {
    return routeError("AdminTeam", error, "Gagal memperbarui admin.");
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const guard = await requireAdminModule("team");
    if (!guard.ok) return guard.response;
    const { session } = guard;
    // Saat sesi remote `session.user.id` adalah ID klien, jadi perbandingan diri sendiri memakai pelaku asli.
    const actorId = adminActorId(session);

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: "ID wajib disertakan." }, { status: 400 });

    if (id === actorId) {
      return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
    }

    // Catatan audit milik admin ini bertahan (adminId menjadi null); nama pelaku disimpan agar jejaknya tetap terbaca.
    await prisma.$transaction([
      prisma.adminAuditLog.updateMany({ where: { adminId: id }, data: { adminLabel: `${admin.name} (${admin.username})` } }),
      prisma.admin.delete({ where: { id } }),
      prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "DELETE_ADMIN",
          details: `Deleted admin ${admin.username}`,
        }
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("AdminTeam", error, "Gagal menghapus admin.");
  }
}
