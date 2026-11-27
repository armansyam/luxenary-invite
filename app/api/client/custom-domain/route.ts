import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPlanCapability } from "@/lib/settings";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { routeError } from "@/lib/routeError";
import { invalidateInvitationLookup } from "@/lib/cache";
import { purgeInvitationEdgeCache } from "@/lib/cloudflare";
import { checkDomainPointsToPlatform } from "@/lib/customDomainDns";
import { normalizeCustomDomain } from "@/lib/domainUtils";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/custom-domain
 * Menyimpan atau memperbarui nama Custom Domain pribadi klien (Gratis / Termasuk dalam paket).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { invitationId, customDomain } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disertakan." }, { status: 400 });
    }

    // 1. Verifikasi kepemilikan undangan
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "custom_domains");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    // 2. Verifikasi status fitur master Custom Domain oleh Administrator
    const enabledSetting = await prisma.adminSetting.findUnique({
      where: { key: "custom_domain_enabled" },
    });
    const isCustomDomainEnabled = enabledSetting ? enabledSetting.value !== "false" : true;
    if (!isCustomDomainEnabled && !isAdmin) {
      return NextResponse.json(
        { error: "Layanan integrasi custom domain saat ini sedang dinonaktifkan oleh administrator." },
        { status: 403 }
      );
    }

    // 3. Verifikasi kapabilitas paket
    const canUseCustomDomain = await hasPlanCapability(invitation.order?.planType, "custom_domain");
    if (!canUseCustomDomain && !isAdmin) {
      return NextResponse.json(
        { error: "Fitur Custom Domain tidak termasuk dalam paket Anda. Silakan upgrade paket undangan Anda untuk menggunakan domain sendiri." },
        { status: 403 }
      );
    }

    // 4. Penanganan pelepasan domain (unlink) jika customDomain dikirim kosong/null
    if (!customDomain || typeof customDomain !== "string" || !customDomain.trim()) {
      const previousDomain = invitation.customDomain;
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { customDomain: null },
      });
      invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain, invitation.id, previousDomain);
      if (previousDomain) {
        await purgeInvitationEdgeCache({ ...invitation, customDomain: previousDomain });
      }
      return NextResponse.json({
        success: true,
        customDomain: null,
        message: "Custom domain berhasil dilepaskan dari undangan Anda.",
      });
    }

    if (!isAdmin && (invitation.status === "ARCHIVED" || invitation.status === "TAKEN_DOWN")) {
      return NextResponse.json(
        { error: "Undangan ini telah diarsipkan atau dinonaktifkan sehingga tidak dapat menautkan domain kustom baru." },
        { status: 403 }
      );
    }

    const cleanDomain = normalizeCustomDomain(customDomain);
    if (!cleanDomain) {
      return NextResponse.json({ error: "Format domain tidak valid. Contoh: namakamu.com" }, { status: 400 });
    }

    // Proteksi domain sistem
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").trim().toLowerCase();
    const reservedPlatformHosts = [rootDomain, "localhost", "127.0.0.1"].filter(Boolean);
    if (reservedPlatformHosts.some((h) => cleanDomain === h || cleanDomain.endsWith(`.${h}`))) {
      return NextResponse.json({ error: "Domain tersebut merupakan domain platform sistem dan tidak dapat digunakan." }, { status: 400 });
    }

    // 4. Cek keunikan domain
    const existingDomain = await prisma.invitation.findFirst({
      where: {
        customDomain: cleanDomain,
        id: { not: invitationId },
      },
      select: { id: true },
    });

    if (existingDomain) {
      return NextResponse.json({ error: "Domain tersebut sudah digunakan oleh undangan lain di sistem." }, { status: 400 });
    }

    // Bukti kepemilikan: hanya pemilik domain yang dapat mengarahkan DNS-nya ke server platform.
    if (!isAdmin) {
      const dnsCheck = await checkDomainPointsToPlatform(cleanDomain);
      if (!dnsCheck.pointsToUs) {
        const target = [dnsCheck.expectedCname && `CNAME ${dnsCheck.expectedCname}`, dnsCheck.expectedIp && `A ${dnsCheck.expectedIp}`]
          .filter(Boolean)
          .join(" atau ");
        return NextResponse.json(
          {
            error: `DNS ${cleanDomain} belum mengarah ke server kami${target ? ` (${target})` : ""}. Atur DNS di penyedia domain Anda, tunggu beberapa menit, lalu simpan lagi.`,
            detectedA: dnsCheck.detectedA,
            detectedCname: dnsCheck.detectedCname,
          },
          { status: 422 }
        );
      }
    }

    // 5. Simpan domain langsung ke undangan (Gratis tanpa invoice/pembayaran)
    const previousDomain = invitation.customDomain;
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { customDomain: cleanDomain },
    });
    if (previousDomain && previousDomain !== cleanDomain) {
      invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain, invitation.id, previousDomain);
    }
    invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain, invitation.id, cleanDomain);
    await purgeInvitationEdgeCache({ ...invitation, customDomain: cleanDomain });

    return NextResponse.json({
      success: true,
      customDomain: cleanDomain,
      message: "Custom domain berhasil disimpan dan ditautkan ke undangan Anda.",
    });
  } catch (error) {
    return routeError("ClientCustomDomain", error, "Gagal menyimpan custom domain");
  }
}
