import { prisma } from "./prisma";
import { getDynamicServerRootDomain } from "./serverDomainUtils";

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

export type ServiceStatusMode = "OPEN" | "CLOSED_ORDER" | "MAINTENANCE" | "COMING_SOON";

export interface ServiceStatusSettings {
  mode: ServiceStatusMode;
  isOpen: boolean;
  title: string;
  message: string;
  reopenDate?: string;
  contactWa?: string;
}

export interface PublicPlatformSettings {
  platformName: string;
  heroTagline: string;
  heroSubtitle: string;
  supportEmail: string;
  supportWhatsapp: string;
  packages: PricingPackageItem[];
  paymentMode: "GATEWAY" | "MANUAL";
  promoEnabled: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankInstructions: string;
  retentionInvitationDays: number;
  retentionInvitationGraceDays: number;
  retentionGalleryDefaultDays: number;
  retentionCleanupDays: number;
  retentionCustomDomainDays: number;
  galleryExtensionPricePerMonth: number;
  addonCustomDomainEnabled: boolean;
  addonMemoriesTopupEnabled: boolean;
  addonMemoriesTopupPhotos: number;
  addonMemoriesTopupPrice: number;
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
  serviceStatus: ServiceStatusSettings;
}

export async function getAdminSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key } });
    return setting?.value || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function getServiceAvailability(): Promise<ServiceStatusSettings> {
  const mode = ((await getAdminSetting("service_status_mode", "OPEN")) as ServiceStatusMode) || "OPEN";
  const isOpen = mode === "OPEN";
  const rawTitle = await getAdminSetting("service_status_title", "");
  const rawMsg = await getAdminSetting("service_status_message", "");
  const reopenDate = await getAdminSetting("service_status_reopen_date", "");
  const contactWa = await getAdminSetting("service_status_contact_wa", "");

  const fallbackTitles: Record<ServiceStatusMode, string> = {
    OPEN: "Layanan Beroperasi Normal",
    CLOSED_ORDER: "Pemesanan Ditutup Sementara",
    MAINTENANCE: "Sistem Dalam Pemeliharaan",
    COMING_SOON: "Segera Hadir",
  };

  const fallbackMessages: Record<ServiceStatusMode, string> = {
    OPEN: "Pendaftaran akun baru dan pembuatan pesanan undangan dibuka normal.",
    CLOSED_ORDER: "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa.",
    MAINTENANCE: "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara.",
    COMING_SOON: "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami.",
  };

  return {
    mode,
    isOpen,
    title: rawTitle.trim() || fallbackTitles[mode] || fallbackTitles.OPEN,
    message: rawMsg.trim() || fallbackMessages[mode] || fallbackMessages.OPEN,
    reopenDate: reopenDate.trim() || undefined,
    contactWa: contactWa.trim() || undefined,
  };
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

  const activeDomain = await getDynamicServerRootDomain();

  const parseFeatures = (key: string, defaultFirstLine: string, caps: string[], planId: string) => {
    let rawList: string[];
    if (map[key]) {
      rawList = map[key].split("\n").map(s => s.trim()).filter(s => s.length > 0);
    } else {
      rawList = [
        defaultFirstLine,
        "Pengiriman undangan & buku tamu WhatsApp tanpa batas",
        "Formulir konfirmasi kehadiran (RSVP) & ucapan doa",
        "Galeri foto, cerita cinta & pemutar musik latar",
        `Alamat tautan khusus (namakamu.${activeDomain})`,
      ];
      if (caps.includes("qr_checkin")) {
        rawList.push("Sistem Resepsionis & Check-In Tamu dengan QR Code");
      }
      if (caps.includes("guest_memories")) {
        const totalQ = Number(map[`memories_total_quota_${planId}`]);
        const defaultTotal = planId === "premium" ? 1000 : (planId === "modern" ? 250 : 100);
        const totalPhotos = !isNaN(totalQ) && totalQ > 0 ? totalQ : defaultTotal;
        rawList.push(`Kamera Digital Tamu bergaya analog (Kapasitas Total ${totalPhotos} Foto)`);
      }
      if (caps.includes("custom_domain")) {
        rawList.push("Dukungan integrasi domain website pribadi (.com / .id)");
      }
    }

    const hasGalleryItem = rawList.some(item => /galeri\s+kenangan|guest\s+memories|guest\s*gal|disposable\s*camera|kamera/i.test(item));
    if (caps.includes("guest_memories") && !hasGalleryItem) {
      const totalQ = Number(map[`memories_total_quota_${planId}`]);
      const defaultTotal = planId === "premium" ? 1000 : (planId === "modern" ? 250 : 100);
      const totalPhotos = !isNaN(totalQ) && totalQ > 0 ? totalQ : defaultTotal;
      rawList.push(`Kamera Digital Tamu bergaya analog (Kapasitas Total ${totalPhotos} Foto — Aktif ${galleryDurationLabel} setelah acara)`);
    }

    return rawList.map(item => {
      let resolvedItem = item;
      if (activeDomain !== "luxvite.id" && resolvedItem.includes(".luxvite.id")) {
        resolvedItem = resolvedItem.replace(/\.luxvite\.id/g, `.${activeDomain}`);
      }
      return resolvedItem;
    });
  };

  const capsTraditional: string[] = map["capabilities_traditional"] ? JSON.parse(map["capabilities_traditional"]) : ["music", "gallery"];
  const capsModern: string[] = map["capabilities_modern"] ? JSON.parse(map["capabilities_modern"]) : ["music", "gallery", "qr_checkin", "guest_memories"];
  const capsPremium: string[] = map["capabilities_premium"] ? JSON.parse(map["capabilities_premium"]) : ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"];

  const allActiveThemeNames = themes.map(t => t.name);

  return {
    platformName: map["platform_name"] || "Luxenary",
    heroTagline: map["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas",
    heroSubtitle:
      map["hero_subtitle"] ||
      "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.",
    supportEmail: map["support_email"] || "",
    supportWhatsapp: map["support_whatsapp"] || "",
    paymentMode: ((map["payment_mode"] === "MANUAL" ? "MANUAL" : "GATEWAY") as "GATEWAY" | "MANUAL"),
    promoEnabled: map["promo_enabled"] === "true",
    bankName: map["bank_name"] || "",
    // JANGAN hardcode nomor rekening — jika kosong, UI wajib tampilkan pesan konfigurasi belum lengkap
    bankAccountNumber: map["bank_account_number"] || "",
    bankAccountHolder: map["bank_account_holder"] || "",
    bankInstructions:
      map["bank_instructions"] ||
      "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.",
    retentionInvitationDays: Number(map["retention_invitation_days"] || 30),
    retentionInvitationGraceDays: Number(map["retention_invitation_grace_days"] || 7),
    retentionGalleryDefaultDays: Number(map["retention_cleanup_days"] || galleryRetentionDays || 14),
    retentionCleanupDays: Number(map["retention_cleanup_days"] || 14),
    retentionCustomDomainDays: Number(map["retention_custom_domain_days"] || 30),
    galleryExtensionPricePerMonth: Number(map["gallery_extension_price_per_month"] || 50000),
    addonCustomDomainEnabled: map["addon_custom_domain_enabled"] !== "false",
    addonMemoriesTopupEnabled: map["addon_memories_topup_enabled"] !== "false",
    addonMemoriesTopupPhotos: Number(map["addon_memories_topup_photos"] || 100),
    addonMemoriesTopupPrice: Number(map["addon_memories_topup_price"] || 35000),
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
    landingFeature3Desc: map["landing_feature_3_desc"] || "Manajemen check-in tamu VIP secara real-time di resepsionis menggunakan scanner QR Code pintar.",
    packages: [
      {
        id: "TRADITIONAL",
        name: map["name_traditional"] || "Serenade",
        price: Number(map["price_traditional"] || 0),
        desc: map["desc_traditional"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
        themes: allActiveThemeNames,
        features: parseFeatures("features_traditional", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsTraditional, "traditional"),
        capabilities: capsTraditional,
        color: "amber",
        isFeatured: false,
      },
      {
        id: "MODERN",
        name: map["name_modern"] || "Symphony",
        price: Number(map["price_modern"] || 0),
        desc: map["desc_modern"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
        themes: allActiveThemeNames,
        features: parseFeatures("features_modern", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsModern, "modern"),
        capabilities: capsModern,
        color: "slate",
        isFeatured: false,
      },
      {
        id: "PREMIUM",
        name: map["name_premium"] || "Eternity",
        price: Number(map["price_premium"] || 0),
        desc: map["desc_premium"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi & Kuota Maksimal",
        themes: allActiveThemeNames,
        features: parseFeatures("features_premium", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsPremium, "premium"),
        capabilities: capsPremium,
        badge: "Terpopuler",
        color: "purple",
        isFeatured: true,
      },
    ],
    serviceStatus: {
      mode: ((map["service_status_mode"] as ServiceStatusMode) || "OPEN"),
      isOpen: !map["service_status_mode"] || map["service_status_mode"] === "OPEN",
      title: (map["service_status_title"] || "").trim() || (
        map["service_status_mode"] === "CLOSED_ORDER" ? "Pemesanan Ditutup Sementara" :
        map["service_status_mode"] === "MAINTENANCE" ? "Sistem Dalam Pemeliharaan" :
        map["service_status_mode"] === "COMING_SOON" ? "Segera Hadir" : "Layanan Beroperasi Normal"
      ),
      message: (map["service_status_message"] || "").trim() || (
        map["service_status_mode"] === "CLOSED_ORDER" ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa." :
        map["service_status_mode"] === "MAINTENANCE" ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara." :
        map["service_status_mode"] === "COMING_SOON" ? "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami." : "Pendaftaran akun baru dan pembuatan pesanan undangan dibuka normal."
      ),
      reopenDate: (map["service_status_reopen_date"] || "").trim() || undefined,
      contactWa: (map["service_status_contact_wa"] || "").trim() || undefined,
    },
  };
}

/**
 * Checks whether a given planType has a specific capability.
 * Reads dynamically from AdminSetting DB with sensible fallbacks.
 */
export async function hasPlanCapability(planType: string | null | undefined, capability: string): Promise<boolean> {
  const normPlan = (planType || "TRADITIONAL").toUpperCase();
  try {
    const settingKey = `capabilities_${normPlan.toLowerCase()}`;
    const setting = await prisma.adminSetting.findUnique({ where: { key: settingKey } });
    if (setting?.value) {
      const caps = JSON.parse(setting.value);
      if (Array.isArray(caps)) {
        return caps.includes(capability);
      }
    }
  } catch {}

  // Default fallback if not set in DB
  const defaultCaps: Record<string, string[]> = {
    TRADITIONAL: ["music", "gallery"],
    MODERN: ["music", "gallery"],
    PREMIUM: ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"],
  };
  return (defaultCaps[normPlan] || []).includes(capability);
}

export interface PlanMemoriesQuota {
  totalQuota: number;
  maxContributors: number;
  shotsQuota: number;
  hasAccess: boolean;
}

/**
 * Mengambil total kuota foto kamera tamu per paket secara dinamis dari database admin_settings.
 * Single Source of Truth untuk pembatasan resource server & quota tier.
 */
export async function getPlanMemoriesQuota(planType: string | null | undefined): Promise<PlanMemoriesQuota> {
  const normPlan = (planType || "TRADITIONAL").toUpperCase();
  const hasAccess = await hasPlanCapability(normPlan, "guest_memories");
  if (!hasAccess) {
    return { totalQuota: 0, maxContributors: 0, shotsQuota: 0, hasAccess: false };
  }

  try {
    const planKey = normPlan.toLowerCase();
    const [totalQuotaSetting, maxContribSetting, shotsQuotaSetting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: `memories_total_quota_${planKey}` } }),
      prisma.adminSetting.findUnique({ where: { key: `memories_max_contributors_${planKey}` } }),
      prisma.adminSetting.findUnique({ where: { key: `memories_shots_quota_${planKey}` } }),
    ]);

    const defaultQuotas: Record<string, { totalQuota: number; maxContributors: number; shotsQuota: number }> = {
      TRADITIONAL: { totalQuota: 0, maxContributors: 0, shotsQuota: 0 },
      MODERN: { totalQuota: 250, maxContributors: 50, shotsQuota: 5 },
      PREMIUM: { totalQuota: 1000, maxContributors: 200, shotsQuota: 5 },
    };

    const fallback = defaultQuotas[normPlan] || { totalQuota: 250, maxContributors: 50, shotsQuota: 5 };

    const shotsQuota = shotsQuotaSetting?.value
      ? Math.max(1, parseInt(shotsQuotaSetting.value, 10) || fallback.shotsQuota)
      : fallback.shotsQuota;

    const maxContributors = maxContribSetting?.value
      ? Math.max(1, parseInt(maxContribSetting.value, 10) || fallback.maxContributors)
      : fallback.maxContributors;

    // Prioritaskan memories_total_quota jika ada; jika tidak, gunakan perkalian maxContributors * shotsQuota
    let totalQuota = fallback.totalQuota;
    if (totalQuotaSetting?.value && !isNaN(Number(totalQuotaSetting.value))) {
      totalQuota = Math.max(0, parseInt(totalQuotaSetting.value, 10));
    } else if (maxContributors > 0 && shotsQuota > 0) {
      totalQuota = maxContributors * shotsQuota;
    }

    return { totalQuota, maxContributors, shotsQuota, hasAccess: true };
  } catch {
    return { totalQuota: 250, maxContributors: 50, shotsQuota: 5, hasAccess: true };
  }
}

