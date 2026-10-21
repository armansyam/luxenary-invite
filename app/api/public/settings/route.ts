import { NextResponse } from "next/server";
import { routeError } from "@/lib/routeError";
import { getPublicPlatformSettings } from "@/lib/settings";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const settings = await getPublicPlatformSettings();

    const brandDirs = [path.join(process.cwd(), "public", "uploads", "brand"), path.join(process.cwd(), "public", "assets", "brand")];
    const logoExists = brandDirs.some((dir) => fs.existsSync(path.join(dir, "logo.webp")));
    const faviconExists = brandDirs.some((dir) => fs.existsSync(path.join(dir, "favicon.png")));

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
      logo: logoExists ? "/brand/logo.webp" : null,
      favicon: faviconExists ? "/brand/favicon.png" : null,
    });
  } catch (error) {
    return routeError("PublicSettings", error, "Gagal memuat pengaturan platform");
  }
}
