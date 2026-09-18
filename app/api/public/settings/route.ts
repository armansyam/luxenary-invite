import { NextResponse } from "next/server";
import { getPublicPlatformSettings } from "@/lib/settings";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const settings = await getPublicPlatformSettings();

    const brandDir = path.join(process.cwd(), "public", "assets", "brand");
    const logoExists = fs.existsSync(path.join(brandDir, "logo.webp"));
    const faviconExists = fs.existsSync(path.join(brandDir, "favicon.png"));

    return NextResponse.json({
      success: true,
      ...settings,
      pricing: {
        price_tier1: settings.packages?.find((p) => p.id === "TIER_1")?.price ?? 0,
        price_tier2: settings.packages?.find((p) => p.id === "TIER_2")?.price ?? 0,
        price_tier3: settings.packages?.find((p) => p.id === "TIER_3")?.price ?? 0,
      },
      custom_domain_enabled: settings.customDomainEnabled,
      gallery_extension_price_per_month: settings.galleryExtensionPricePerMonth,
      server_public_ip: settings.serverPublicIp,
      cname_target: settings.cnameTarget,
      max_video_upload_mb: settings.maxVideoUploadMb,
      max_photo_upload_mb: settings.maxPhotoUploadMb,
      max_upload_mb: settings.maxUploadMb,
      logo: logoExists ? "/assets/brand/logo.webp" : null,
      favicon: faviconExists ? "/assets/brand/favicon.png" : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
