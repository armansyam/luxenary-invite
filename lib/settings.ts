import { prisma } from "./prisma";

export interface PricingPackageItem {
  id: "TRADITIONAL" | "MODERN" | "PREMIUM";
  name: string;
  price: number;
  desc: string;
  features: string[];
  capabilities: string[];
  themes: string[];
  badge?: string;
  color: string;
  isFeatured?: boolean;
}

export interface PublicPlatformSettings {
  platformName: string;
  heroTagline: string;
  heroSubtitle: string;
  supportEmail: string;
  supportWhatsapp: string;
  packages: PricingPackageItem[];
  paymentMode: "BOTH" | "GATEWAY" | "MANUAL";
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankInstructions: string;
  retentionInvitationDays: number;
  retentionInvitationGraceDays: number;
  retentionGalleryDefaultDays: number;
  galleryExtensionPricePerMonth: number;
  addonSubdomainGalleryBundlePrice: number;
  addonCustomDomainPrice: number;
  addonCustomDomainEnabled: boolean;
  paymentGatewayFeePercent: number;
  paymentGatewayFeePayer: "BUYER" | "MERCHANT";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  smtpFromEmail: string;
  smtpFromName: string;
  waTemplateMessage: string;
  maxUploadMb: number;
  cnameTarget: string;
  serverPublicIp: string;
  landingFeature1Title: string;
  landingFeature1Desc: string;
  landingFeature2Title: string;
  landingFeature2Desc: string;
  landingFeature3Title: string;
  landingFeature3Desc: string;
}

export async function getAdminSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key } });
    return setting?.value || defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Single Source of Truth for Platform & Pricing Settings
 * Directly queried from SQLite admin_settings table.
 */
export async function getPublicPlatformSettings(): Promise<PublicPlatformSettings> {
  let map: Record<string, string> = {};
  let themes: any[] = [];
  try {
    const all = await prisma.adminSetting.findMany();
    all.forEach((s) => {
      map[s.key] = s.value;
    });
    
    themes = await prisma.theme.findMany({
      where: { isActive: true },
      select: { name: true, isPremium: true, series: true }
    });
  } catch (e) {
    console.error("[getPublicPlatformSettings error]", e);
  }

  const traditionalThemes = themes.filter(t => !t.isPremium && ["traditional", "heritage", "moody"].includes(t.series.toLowerCase())).map(t => t.name);
  const modernThemes = themes.filter(t => !t.isPremium && t.series.toLowerCase() === "modern").map(t => t.name);
  const premiumThemes = themes.filter(t => t.isPremium).map(t => t.name);
  const totalThemesCount = traditionalThemes.length + modernThemes.length + premiumThemes.length;

  const galleryRetentionDays = Number(map["retention_gallery_default_days"] || 30);
  const galleryDurationLabel = galleryRetentionDays >= 30 && galleryRetentionDays % 30 === 0
    ? `${galleryRetentionDays / 30} bulan`
    : `${galleryRetentionDays} hari`;

  const parseFeatures = (key: string, defaultFirstLine: string, caps: string[]) => {
    let rawList: string[];
    if (map[key]) {
      rawList = map[key].split("\n").map(s => s.trim()).filter(s => s.length > 0);
    } else {
      rawList = [
        defaultFirstLine,
        "Tamu undangan tanpa batas",
        "Manajemen RSVP & ucapan doa",
        "Galeri foto & musik latar",
        "url : namakamu.luxvite.id",
      ];
      if (caps.includes("qr_checkin")) {
        rawList.push("QR Code Check-in Tamu");
        rawList.push("Resepsionis");
      }
      if (caps.includes("guest_memories")) {
        rawList.push(`Galeri Kenangan Tamu (/memories — Aktif ${galleryDurationLabel} pasca-acara)`);
      }
    }

    const hasGalleryItem = rawList.some(item => /galeri\s+kenangan|guest\s+memories|guest\s*gal/i.test(item));
    if (caps.includes("guest_memories") && !hasGalleryItem) {
      rawList.push(`Galeri Kenangan Tamu (/memories — Aktif ${galleryDurationLabel} pasca-acara)`);
    }

    return rawList.map(item => {
      if (/galeri\s+kenangan|guest\s+memories|guest\s*gal/i.test(item)) {
        if (!/aktif|\d+\s*(hari|bulan)/i.test(item)) {
          return `${item} (/memories — Aktif ${galleryDurationLabel} pasca-acara)`;
        }
      }
      return item;
    });
  };

  const capsTraditional: string[] = map["capabilities_traditional"] ? JSON.parse(map["capabilities_traditional"]) : ["music", "gallery"];
  const capsModern: string[] = map["capabilities_modern"] ? JSON.parse(map["capabilities_modern"]) : ["music", "gallery"];
  const capsPremium: string[] = map["capabilities_premium"] ? JSON.parse(map["capabilities_premium"]) : ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"];

  return {
    platformName: map["platform_name"] || "Luxenary",
    heroTagline: map["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
    heroSubtitle:
      map["hero_subtitle"] ||
      "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
    supportEmail: map["support_email"] || "",
    supportWhatsapp: map["support_whatsapp"] || "",
    paymentMode: (map["payment_mode"] as any) || "BOTH",
    bankName: map["bank_name"] || "",
    // JANGAN hardcode nomor rekening — jika kosong, UI wajib tampilkan pesan konfigurasi belum lengkap
    bankAccountNumber: map["bank_account_number"] || "",
    bankAccountHolder: map["bank_account_holder"] || "",
    bankInstructions:
      map["bank_instructions"] ||
      "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
    retentionInvitationDays: Number(map["retention_invitation_days"] || 30),
    retentionInvitationGraceDays: Number(map["retention_invitation_grace_days"] || 7),
    retentionGalleryDefaultDays: galleryRetentionDays,
    galleryExtensionPricePerMonth: Number(map["gallery_extension_price_per_month"] || 50000),
    addonSubdomainGalleryBundlePrice: Number(map["addon_subdomain_gallery_bundle_price"] || 175000),
    addonCustomDomainPrice: Number(map["addon_custom_domain_price"] || 150000),
    addonCustomDomainEnabled: map["addon_custom_domain_enabled"] !== "false",
    paymentGatewayFeePercent: Number(map["payment_gateway_fee_percent"] || (map["payment_fee_rate"] ? Number(map["payment_fee_rate"]) * 100 : 0.7)),
    paymentGatewayFeePayer: ((map["payment_fee_payer"] || map["payment_gateway_fee_payer"] || "MERCHANT") === "BUYER" ? "BUYER" : "MERCHANT"),
    smtpHost: map["smtp_host"] || "",
    smtpPort: Number(map["smtp_port"] || 587),
    smtpUser: map["smtp_user"] || "",
    smtpPassword: map["smtp_password"] || "",
    smtpFromEmail: map["smtp_from_email"] || "",
    smtpFromName: map["smtp_from_name"] || map["platform_name"] || "Billing",
    waTemplateMessage: map["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{GROOM_NAME}} & {{BRIDE_NAME}}",
    maxUploadMb: Number(map["max_upload_mb"] || 5),
    cnameTarget: map["cname_target"] || "",
    serverPublicIp: map["server_public_ip"] || "",
    landingFeature1Title: map["landing_feature_1_title"] || "Desain Kalandra, Aurelia & Prameswari",
    landingFeature1Desc: map["landing_feature_1_desc"] || "Estetika natural dengan split view desktop, transisi foto section overlap, audio player autoplay, dan CSS scroll snap mulus.",
    landingFeature2Title: map["landing_feature_2_title"] || "Manajemen Tamu & WhatsApp",
    landingFeature2Desc: map["landing_feature_2_desc"] || "Generator link pintar per tamu, form RSVP dengan QR Code terintegrasi, dan auto-redirect kirim undangan via WhatsApp.",
    landingFeature3Title: map["landing_feature_3_title"] || "Buku Tamu Digital (QR Code)",
    landingFeature3Desc: map["landing_feature_3_desc"] || "Manajemen check-in tamu VIP secara real-time di meja resepsionis menggunakan scanner QR Code pintar.",
    packages: [
      {
        id: "TRADITIONAL",
        name: map["name_traditional"] || "Traditional",
        price: Number(map["price_traditional"] || 0),
        desc: map["desc_traditional"] || "Tema Standart — Elegan, Sakral & Bernuansa Tradisional",
        themes: traditionalThemes,
        features: parseFeatures("features_traditional", `Pilihan ${traditionalThemes.length} tema Standart Traditional`, capsTraditional),
        capabilities: capsTraditional,
        color: "amber",
        isFeatured: false,
      },
      {
        id: "MODERN",
        name: map["name_modern"] || "Modern",
        price: Number(map["price_modern"] || 0),
        desc: map["desc_modern"] || "Tema Premium — Sinematik, Editorial & Kontemporer",
        themes: modernThemes,
        features: parseFeatures("features_modern", `Akses ${modernThemes.length} tema Modern + Semua tema Traditional (${traditionalThemes.length + modernThemes.length} Tema)`, capsModern),
        capabilities: capsModern,
        color: "slate",
        isFeatured: false,
      },
      {
        id: "PREMIUM",
        name: map["name_premium"] || "Premium",
        price: Number(map["price_premium"] || 0),
        desc: map["desc_premium"] || "Tema Luxury — Editorial, Full-Text & Luxury Visual Motion",
        themes: premiumThemes,
        features: parseFeatures("features_premium", `All-Access ${totalThemesCount} Tema Lengkap (Traditional + Modern + Luxury Premium)`, capsPremium),
        capabilities: capsPremium,
        badge: "Terpopuler",
        color: "purple",
        isFeatured: true,
      },
    ],
  };
}
