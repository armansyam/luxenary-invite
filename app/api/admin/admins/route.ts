import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    // Hanya Super Admin yang boleh melihat daftar admin
    if (!session?.user || !(session.user as any).isAdmin || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Hanya Super Admin yang dapat mengakses data ini." }, { status: 403 });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ admins });
  } catch (error: any) {
    console.error("Error fetching admins:", error);
    return NextResponse.json({ error: "Gagal mengambil data admin." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    // Hanya Super Admin yang boleh menambah admin baru
    if (!session?.user || !(session.user as any).isAdmin || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Hanya Super Admin yang dapat menambah admin baru." }, { status: 403 });
    }

    const { username, email, name, role: newRole, password } = await req.json();

    if (!username || !email || !name || !newRole || !password) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
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

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        username,
        email,
        name,
        role: newRole,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    // Catat ke Audit Log
    await prisma.adminAuditLog.create({
      data: {
        adminId: (session.user as any).id as string,
        action: "CREATE_ADMIN",
        details: `Created new admin: ${username} with role ${newRole}`,
      }
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Gagal membuat admin baru." }, { status: 500 });
  }
}
