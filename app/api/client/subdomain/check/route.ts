import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "dashboard",
  "demo",
  "login",
  "booth",
  "checkout",
  "pay",
  "app",
  "www",
  "mail",
  "support",
  "dev",
  "staging",
  "cdn",
  "auth",
  "order",
  "orders",
]);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSubdomain = searchParams.get("subdomain") || "";
    const invitationId = searchParams.get("invitationId") || "";

    const cleanSubdomain = rawSubdomain
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");

    if (!cleanSubdomain) {
      return NextResponse.json({
        available: false,
        message: "Nama subdomain tidak boleh kosong.",
      });
    }

    if (cleanSubdomain.length < 3) {
      return NextResponse.json({
        available: false,
        message: "Subdomain minimal terdiri dari 3 karakter.",
      });
    }

    if (cleanSubdomain.length > 35) {
      return NextResponse.json({
        available: false,
        message: "Subdomain maksimal terdiri dari 35 karakter.",
      });
    }

    if (RESERVED_SUBDOMAINS.has(cleanSubdomain)) {
      return NextResponse.json({
        available: false,
        message: "Subdomain ini dilindungi oleh sistem dan tidak dapat digunakan.",
      });
    }

    // Check database if another invitation uses this subdomain
    const existing = await prisma.invitation.findFirst({
      where: {
        subdomain: cleanSubdomain,
        ...(invitationId ? { NOT: { id: invitationId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        available: false,
        message: "Subdomain sudah digunakan oleh pasangan lain. Silakan gunakan kombinasi lain.",
      });
    }

    return NextResponse.json({
      available: true,
      cleanSubdomain,
      message: "Subdomain tersedia dan siap digunakan!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { available: false, message: "Gagal memeriksa subdomain." },
      { status: 500 }
    );
  }
}
