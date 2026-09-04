import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.role === "ADMIN";
  return Boolean(session?.user && isAdmin);
}

export async function GET() {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    let detectedIp = "";

    // 1. Coba deteksi via api.ipify.org
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.ip) detectedIp = data.ip.trim();
      }
    } catch {
      // Fallback ke provider berikutnya
    }

    // 2. Fallback via icanhazip.com jika ipify gagal/timeout
    if (!detectedIp) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("https://icanhazip.com", {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          if (text) detectedIp = text.trim();
        }
      } catch {
        // Abaikan
      }
    }

    // Sanitasi dan validasi format IP (IPv4 / IPv6) agar aman dari respon error HTML
    detectedIp = detectedIp.trim();
    const isValidIp = /^[0-9a-fA-F:.]+$/.test(detectedIp) && detectedIp.length >= 7 && detectedIp.length <= 45;
    if (!isValidIp) {
      detectedIp = "";
    }

    if (!detectedIp) {
      return NextResponse.json({
        success: false,
        message: "Tidak dapat mendeteksi IP publik secara otomatis (mungkin server offline / di localhost tanpa koneksi luar). Silakan isi manual.",
      });
    }

    return NextResponse.json({
      success: true,
      ip: detectedIp,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
