import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { checkDomainPointsToPlatform } from "@/lib/customDomainDns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("custom_domains");
    if (!guard.ok) return guard.response;

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

    const { pointsToUs, detectedA, detectedCname, wwwDetectedA, wwwDetectedCname, expectedIp, expectedCname } =
      await checkDomainPointsToPlatform(domain);

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
  } catch (error) {
    return routeError("CheckDns", error, "Gagal melakukan resolusi DNS");
  }
}
