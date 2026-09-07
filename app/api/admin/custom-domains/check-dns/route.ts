import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import dns from "dns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "SUPER_ADMIN" ||
      (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let domain = (body.domain || "").trim().toLowerCase();

    // Normalisasi domain: buang http://, https://, path trailing slash
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

    if (!domain || !domain.includes(".")) {
      return NextResponse.json(
        { error: "Nama domain tidak valid. Masukkan domain lengkap (misal: wedding-andi.com atau www.wedding-andi.com)." },
        { status: 400 }
      );
    }

    // Ambil konfigurasi target DNS server dari AdminSetting
    const [ipSetting, cnameSetting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: "server_public_ip" } }),
      prisma.adminSetting.findUnique({ where: { key: "cname_target" } }),
    ]);

    const expectedIp = (ipSetting?.value || process.env.SERVER_PUBLIC_IP || "").trim();
    const expectedCname = (cnameSetting?.value || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "luxenary.com").trim().toLowerCase();

    let detectedA: string[] = [];
    let detectedCname: string[] = [];

    // 1. Resolve A Record
    try {
      detectedA = await dns.promises.resolve4(domain);
    } catch (e: any) {
      // Tidak ada A record atau domain belum aktif
    }

    // 2. Resolve CNAME Record
    try {
      detectedCname = await dns.promises.resolveCname(domain);
    } catch (e: any) {
      // Tidak ada CNAME record
    }

    // Cek apakah CNAME www jika input adalah root, atau sebaliknya
    let wwwDetectedA: string[] = [];
    let wwwDetectedCname: string[] = [];
    if (!domain.startsWith("www.")) {
      try {
        wwwDetectedA = await dns.promises.resolve4(`www.${domain}`);
      } catch {}
      try {
        wwwDetectedCname = await dns.promises.resolveCname(`www.${domain}`);
      } catch {}
    }

    const matchesA = expectedIp ? detectedA.includes(expectedIp) : false;
    const matchesCname = expectedCname
      ? detectedCname.some((c) => c.toLowerCase().includes(expectedCname) || expectedCname.includes(c.toLowerCase()))
      : false;
    const wwwMatchesCname = expectedCname
      ? wwwDetectedCname.some((c) => c.toLowerCase().includes(expectedCname) || expectedCname.includes(c.toLowerCase()))
      : false;

    const pointsToUs = matchesA || matchesCname || wwwMatchesCname;

    let message = "";
    if (pointsToUs) {
      message = "DNS telah terpropagasi dan berhasil mengarah ke server platform.";
    } else {
      message = `DNS belum mengarah ke platform. Terdeteksi A: [${detectedA.join(", ") || "tidak ada"}], CNAME: [${detectedCname.join(", ") || "tidak ada"}]. Harapkan IP: ${expectedIp || "belum disetel"} atau CNAME: ${expectedCname}.`;
    }

    return NextResponse.json({
      success: true,
      domain,
      pointsToUs,
      detectedA,
      detectedCname,
      wwwDetectedA,
      wwwDetectedCname,
      expectedIp,
      expectedCname,
      message,
    });
  } catch (error: any) {
    console.error("POST /api/admin/custom-domains/check-dns error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan resolusi DNS" },
      { status: 500 }
    );
  }
}
