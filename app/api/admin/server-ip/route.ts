import { NextResponse } from "next/server";
import { routeError } from "@/lib/routeError";
import { requireAdminModule } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

async function denyUnlessAdmin() {
  const guard = await requireAdminModule("custom_domains");
  return guard.ok ? null : guard.response;
}

export async function GET() {
  try {
    const denied = await denyUnlessAdmin();
    if (denied) return denied;

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
  } catch (error) {
    return routeError("ServerIp", error);
  }
}
