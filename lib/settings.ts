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
  waTemplateMessage: string;
  maxUploadMb: number;
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
  try {
    const all = await prisma.adminSetting.findMany();
    all.forEach((s) => {
      map[s.key] = s.value;
    });
  } catch (e) {
    console.error("[getPublicPlatformSettings error]", e);
  }

  const commonFeatures = [
    "Tautan link personal per nama tamu",
    "Tamu undangan tanpa batas",
    "Manajemen RSVP & ucapan doa",
    "Fitur Eksklusif: Video Guest Moment",
    "Fitur Eksklusif: Galeri Kenangan Tamu",
    "Buku tamu & link WA 1-klik",
    "Galeri foto & musik latar",
    "Amplop digital QRIS & transfer bank",
  ];

  return {
    platformName: map["platform_name"] || "Luxenary Invite",
    heroTagline: map["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
    heroSubtitle:
      map["hero_subtitle"] ||
      "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
    supportEmail: map["support_email"] || "support@luxenary.id",
    supportWhatsapp: map["support_whatsapp"] || "6281234567890",
    paymentMode: (map["payment_mode"] as any) || "BOTH",
    bankName: map["bank_name"] || "BCA (Bank Central Asia)",
    bankAccountNumber: map["bank_account_number"] || "8735098123",
    bankAccountHolder: map["bank_account_holder"] || "PT Luxenary Karya Digital",
    bankInstructions:
      map["bank_instructions"] ||
      "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
    retentionInvitationDays: Number(map["retention_invitation_days"] || 30),
    waTemplateMessage: map["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{GROOM_NAME}} & {{BRIDE_NAME}}",
    maxUploadMb: Number(map["max_upload_mb"] || 5),
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
        price: Number(map["price_traditional"] || 50000),
        desc: map["desc_traditional"] || "Tema Standart — Elegan, Sakral & Bernuansa Tradisional",
        themes: ["Prameswari", "Badrika", "Candani", "Dillalucky", "Mayang"],
        features: [
          "Pilihan 5 tema Standart Traditional",
          ...commonFeatures,
        ],
        capabilities: map["capabilities_traditional"] ? JSON.parse(map["capabilities_traditional"]) : [],
        color: "amber",
        isFeatured: false,
      },
      {
        id: "MODERN",
        name: map["name_modern"] || "Modern",
        price: Number(map["price_modern"] || 100000),
        desc: map["desc_modern"] || "Tema Premium — Sinematik, Editorial & Kontemporer",
        themes: ["Wave", "Papercut", "Ameera", "Chronicle", "Lumina", "Solaria"],
        features: [
          "Akses 6 tema Modern + Semua tema Traditional (11 Tema)",
          ...commonFeatures,
        ],
        capabilities: map["capabilities_modern"] ? JSON.parse(map["capabilities_modern"]) : [],
        color: "slate",
        isFeatured: false,
      },
      {
        id: "PREMIUM",
        name: map["name_premium"] || "Premium",
        price: Number(map["price_premium"] || 120000),
        desc: map["desc_premium"] || "Tema Luxury — Editorial, Full-Text & Luxury Visual Motion",
        themes: ["Kalandra", "Valente", "Aurelia", "Artisan"],
        features: [
          "All-Access 15 Tema Lengkap (Traditional + Modern + Luxury Premium)",
          ...commonFeatures,
        ],
        capabilities: map["capabilities_premium"] ? JSON.parse(map["capabilities_premium"]) : [],
        badge: "Terpopuler",
        color: "purple",
        isFeatured: true,
      },
    ],
  };
}
