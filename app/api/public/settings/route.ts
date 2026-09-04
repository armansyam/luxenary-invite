import { NextResponse } from "next/server";
import { getPublicPlatformSettings } from "@/lib/settings";
import fs from "fs";
import path from "path";

export const revalidate = 3600; // Cache for 1 hour
export async function GET() {
  try {
    const settings = await getPublicPlatformSettings();

    const brandDir = path.join(process.cwd(), "public", "assets", "brand");
    const logoExists = fs.existsSync(path.join(brandDir, "logo.webp"));
    const faviconExists = fs.existsSync(path.join(brandDir, "favicon.png"));

    return NextResponse.json({
      success: true,
      ...settings,
      addon_custom_domain_price: settings.addonCustomDomainPrice,
      addon_subdomain_gallery_bundle_price: settings.addonSubdomainGalleryBundlePrice,
      gallery_extension_price_per_month: settings.galleryExtensionPricePerMonth,
      server_public_ip: settings.serverPublicIp,
      cname_target: settings.cnameTarget,
      logo: logoExists ? "/assets/brand/logo.webp" : null,
      favicon: faviconExists ? "/assets/brand/favicon.png" : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
