import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.adminSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const brandDir = path.join(process.cwd(), "public", "assets", "brand");
    const logoExists = fs.existsSync(path.join(brandDir, "logo.webp"));
    const faviconExists = fs.existsSync(path.join(brandDir, "favicon.png"));

    return NextResponse.json(
      {
        success: true,
        platform_name: map["platform_name"] || "Luxenary Invite",
        support_email: map["support_email"] || "support@luxenary.id",
        support_whatsapp: map["support_whatsapp"] || "6281234567890",
        hero_tagline: map["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
        hero_subtitle:
          map["hero_subtitle"] ||
          "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
        logo: logoExists ? "/assets/brand/logo.webp" : null,
        favicon: faviconExists ? "/assets/brand/favicon.png" : null,
        pricing: {
          traditional: {
            name: map["name_traditional"] || "Traditional Series",
            price: Number(map["price_traditional"] || 299000),
            desc: map["desc_traditional"] || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional",
          },
          modern: {
            name: map["name_modern"] || "Modern Series",
            price: Number(map["price_modern"] || 499000),
            desc: map["desc_modern"] || "Tema Modern — Minimalis, Kontemporer & Sinematik",
          },
          premium: {
            name: map["name_premium"] || "Premium Series",
            price: Number(map["price_premium"] || 699000),
            desc: map["desc_premium"] || "Tema Premium — Editorial, Full-Text & Luxury Visual Motion",
          },
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
