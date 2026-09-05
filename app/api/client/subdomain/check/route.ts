import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isReservedSubdomain } from "@/lib/domainUtils";

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

    if (isReservedSubdomain(cleanSubdomain)) {
      return NextResponse.json({
        available: false,
        message: "Subdomain ini dilindungi oleh sistem (seperti CDN/Admin/System) dan tidak dapat digunakan.",
      });
    }

    // Check database if another invitation uses this subdomain
    const existing = await prisma.invitation.findFirst({
      where: {
        subdomain: cleanSubdomain,
        ...(invitationId ? { NOT: { id: invitationId } } : {}),
      },
      select: { id: true, eventData: true },
    });

    if (existing) {
      let eventDateToTest: string | null = null;
      try {
        if (existing.eventData) {
          const parsed = JSON.parse(existing.eventData);
          if (Array.isArray(parsed) && parsed[0]?.date) {
            eventDateToTest = parsed[0].date;
          }
        }
      } catch {}

      // If holding invitation has expired (> 7 days post event), it can be recycled!
      const isExpired = eventDateToTest ? (new Date(eventDateToTest).getTime() + 7 * 24 * 60 * 60 * 1000 < Date.now()) : false;

      if (!isExpired) {
        return NextResponse.json({
          available: false,
          message: "Subdomain sedang aktif digunakan oleh pasangan lain. Silakan gunakan kombinasi lain.",
        });
      }
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
