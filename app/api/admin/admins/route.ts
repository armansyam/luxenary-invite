import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/adminCredentials";

export async function GET() {
  try {
    // Modul "team" hanya terbuka untuk Super Admin.
    const guard = await requireAdminModule("team");
    if (!guard.ok) return guard.response;

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ admins });
  } catch (error) {
    return routeError("AdminTeam", error, "Gagal mengambil data admin.");
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdminModule("team");
    if (!guard.ok) return guard.response;
    const { session } = guard;

    const body = await req.json();
    const { name, role: newRole, password, permissions } = body;
    // Login admin memangkas dan me-lowercase isian sebelum mencocokkan (auth.ts), jadi disimpan dalam bentuk yang sama.
    const username = String(body.username ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!username || !email || !name || !newRole || !password || !String(password).trim()) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }
    if (String(password).trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password minimal ${MIN_ADMIN_PASSWORD_LENGTH} karakter.` }, { status: 400 });
    }

    // Check if username or email already exists
    const existing = await prisma.admin.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Username atau Email sudah terdaftar." }, { status: 400 });
    }

    // Dipangkas seperti di halaman login admin (dan seed); spasi di ujung membuat password tidak pernah cocok.
    const passwordHash = await bcrypt.hash(String(password).trim(), 10);
    const { resolveAdminPermissions } = await import("@/lib/adminPermissions");
    const effectivePermissions = newRole === "SUPER_ADMIN" ? [] : resolveAdminPermissions(newRole, permissions);

    const [newAdmin] = await prisma.$transaction([
      prisma.admin.create({
        data: {
          username,
          email,
          name,
          role: newRole,
          permissions: effectivePermissions,
          passwordHash,
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
          createdAt: true,
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(session),
          action: "CREATE_ADMIN",
          details: `Created new admin: ${username} with role ${newRole}`,
        }
      }),
    ]);

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error) {
    return routeError("AdminTeam", error, "Gagal membuat admin baru.");
  }
}
