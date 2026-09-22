import { prisma } from "./prisma";
import { getDynamicServerRootDomain } from "./serverDomainUtils";
import { normalizePlanType } from "./planUtils";

export interface PricingPackageItem {
  id: "TIER_1" | "TIER_2" | "TIER_3";
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
  customDomainEnabled: boolean;
  addonMemoriesTopupEnabled: boolean;
  addonMemoriesTopupPhotos: number;
  addonMemoriesTopupPrice: number;
  memoriesNotifyMilestones: number[];
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
  maxVideoUploadMb: number;
  maxPhotoUploadMb: number;
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

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry<string>>();
let allSettingsCache: CacheEntry<Record<string, string>> | null = null;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60-second TTL

export function invalidateSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
  allSettingsCache = null;
}

export async function getAdminSetting(key: string, defaultValue = ""): Promise<string> {
  const now = Date.now();
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key } });
    const val = setting?.value ?? defaultValue;
    settingsCache.set(key, { value: val, expiresAt: now + SETTINGS_CACHE_TTL_MS });
    return val;
  } catch (err) {
    console.warn(`[getAdminSetting] Gagal membaca setting key "${key}":`, err);
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
  const now = Date.now();
  let map: Record<string, string> = {};
  let themes: any[] = [];
  try {
    if (allSettingsCache && allSettingsCache.expiresAt > now) {
      map = { ...allSettingsCache.value };
    } else {
      const all = await prisma.adminSetting.findMany();
      all.forEach((s) => {
        map[s.key] = s.value;
      });
      allSettingsCache = { value: map, expiresAt: now + SETTINGS_CACHE_TTL_MS };
    }
    
    themes = await prisma.theme.findMany({
      where: { isActive: true },
      select: { name: true, isPremium: true, series: true }
    });
  } catch (e) {
    console.warn("[getPublicPlatformSettings error]", e);
  }



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
        const defaultTotal = planId === "TIER_3" ? 1000 : (planId === "TIER_2" ? 250 : 100);
        const totalPhotos = !isNaN(totalQ) && totalQ > 0 ? totalQ : defaultTotal;
        rawList.push(`Kamera Digital Tamu bergaya analog (Kapasitas Total ${totalPhotos} Foto)`);
      }
      if (caps.includes("custom_domain")) {
        rawList.push("Dukungan integrasi domain website pribadi (.com / .id)");
      }
    }

    const hasGalleryItem = rawList.some(item => /galeri\s+kenangan|guest\s+memories|guest\s*gal|guest\s*camera|disposable\s*camera|kamera/i.test(item));
    if (caps.includes("guest_memories") && !hasGalleryItem) {
      const totalQ = Number(map[`memories_total_quota_${planId}`]);
      const defaultTotal = planId === "TIER_3" ? 1000 : (planId === "TIER_2" ? 250 : 100);
      const totalPhotos = !isNaN(totalQ) && totalQ > 0 ? totalQ : defaultTotal;
      rawList.push(`Guest Camera — Kamera Saku Tamu (Kapasitas Total ${totalPhotos} Foto — Aktif 1 bulan setelah acara)`);
    }

    const isLocalDevDomain = !activeDomain || activeDomain.includes("localhost") || activeDomain.includes("127.0.0.1") || activeDomain.includes("192.168.") || activeDomain.includes(":");
    const targetDomain = isLocalDevDomain ? "domainanda.id" : activeDomain;
    const nameTier1 = map["name_tier1"] || "Serenade";
    const nameTier2 = map["name_tier2"] || "Symphony";

    return rawList.map(item => {
      let resolvedItem = item;
      if (resolvedItem.includes(".luxvite.id")) {
        resolvedItem = resolvedItem.replace(/\.luxvite\.id/g, `.${targetDomain}`);
      }
      if (resolvedItem.includes(".domain.id")) {
        resolvedItem = resolvedItem.replace(/\.domain\.id/g, `.${targetDomain}`);
      }
      // Dynamic cross-tier naming
      if (resolvedItem.includes("Paket Serenade") && nameTier1 !== "Serenade") {
        resolvedItem = resolvedItem.replace(/Paket Serenade/g, `Paket ${nameTier1}`);
      }
      if (resolvedItem.includes("Paket Symphony") && nameTier2 !== "Symphony") {
        resolvedItem = resolvedItem.replace(/Paket Symphony/g, `Paket ${nameTier2}`);
      }
      return resolvedItem;
    });
  };

  const capsTier1: string[] = map["capabilities_tier1"] ? JSON.parse(map["capabilities_tier1"]) : ["music", "gallery"];
  const capsTier2: string[] = map["capabilities_tier2"] ? JSON.parse(map["capabilities_tier2"]) : ["music", "gallery", "qr_checkin", "guest_memories"];
  const capsTier3: string[] = map["capabilities_tier3"] ? JSON.parse(map["capabilities_tier3"]) : ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"];

  const allActiveThemeNames = themes.map(t => t.name);

  return {
    platformName: map["platform_name"] || "Sistem Undangan",
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
    retentionInvitationDays: Number(map["retention_cleanup_days"] || 14),
    retentionInvitationGraceDays: Number(map["retention_invitation_grace_days"] || 7),
    retentionGalleryDefaultDays: Number(map["retention_cleanup_days"] || galleryRetentionDays || 14),
    retentionCleanupDays: Number(map["retention_cleanup_days"] || 14),
    retentionCustomDomainDays: Number(map["retention_custom_domain_days"] || 30),
    galleryExtensionPricePerMonth: Number(map["gallery_extension_price_per_month"] || 50000),
    customDomainEnabled: map["custom_domain_enabled"] !== "false",
    addonMemoriesTopupEnabled: map["addon_memories_topup_enabled"] !== "false",
    addonMemoriesTopupPhotos: Number(map["addon_memories_topup_photos"] || 100),
    addonMemoriesTopupPrice: Number(map["addon_memories_topup_price"] || 35000),
    memoriesNotifyMilestones: (map["memories_notify_milestones"] || "50,80,100")
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= 100)
      .sort((a, b) => a - b),
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
    maxVideoUploadMb: Number(map["max_video_upload_mb"] || 50),
    maxPhotoUploadMb: Number(map["max_photo_upload_mb"] || 15),
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
        id: "TIER_1",
        name: map["name_tier1"] || "Serenade",
        price: Number(map["price_tier1"] || 0),
        desc: map["desc_tier1"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online",
        themes: allActiveThemeNames,
        features: parseFeatures("features_tier1", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsTier1, "tier1"),
        capabilities: capsTier1,
        color: "amber",
        isFeatured: false,
      },
      {
        id: "TIER_2",
        name: map["name_tier2"] || "Symphony",
        price: Number(map["price_tier2"] || 0),
        desc: map["desc_tier2"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu",
        themes: allActiveThemeNames,
        features: parseFeatures("features_tier2", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsTier2, "tier2"),
        capabilities: capsTier2,
        color: "slate",
        isFeatured: false,
      },
      {
        id: "TIER_3",
        name: map["name_tier3"] || "Eternity",
        price: Number(map["price_tier3"] || 0),
        desc: map["desc_tier3"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal",
        themes: allActiveThemeNames,
        features: parseFeatures("features_tier3", `Bebas pilih seluruh koleksi tema desain (${allActiveThemeNames.length} Tema)`, capsTier3, "tier3"),
        capabilities: capsTier3,
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
  const canonical = normalizePlanType(planType);
  const tierKey = canonical.toLowerCase().replace("_", ""); // "tier1", "tier2", "tier3"
  try {
    const setting = await prisma.adminSetting.findFirst({
      where: {
        key: {
          in: [
            `capabilities_${tierKey}`,
            `capabilities_${canonical.toLowerCase()}`,
          ]
        }
      }
    });
    if (setting?.value) {
      const caps = JSON.parse(setting.value);
      if (Array.isArray(caps)) {
        return caps.includes(capability);
      }
    }
  } catch {}

  // Default fallback if not set in DB
  const defaultCaps: Record<string, string[]> = {
    TIER_1: ["music", "gallery"],
    TIER_2: ["music", "gallery", "qr_checkin", "guest_memories"],
    TIER_3: ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"],
  };
  return (defaultCaps[canonical] || []).includes(capability);
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
  const canonical = normalizePlanType(planType);
  const hasAccess = await hasPlanCapability(canonical, "guest_memories");
  if (!hasAccess) {
    return { totalQuota: 0, maxContributors: 0, shotsQuota: 0, hasAccess: false };
  }

  try {
    const tierKey = canonical.toLowerCase().replace("_", ""); // "tier1", "tier2", "tier3"
    const [totalQuotaSetting, maxContribSetting, shotsQuotaSetting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: `memories_total_quota_${tierKey}` } }),
      prisma.adminSetting.findUnique({ where: { key: `memories_max_contributors_${tierKey}` } }),
      prisma.adminSetting.findUnique({ where: { key: `memories_shots_quota_${tierKey}` } }),
    ]);

    const defaultQuotas: Record<string, { totalQuota: number; maxContributors: number; shotsQuota: number }> = {
      TIER_1: { totalQuota: 0, maxContributors: 0, shotsQuota: 0 },
      TIER_2: { totalQuota: 200, maxContributors: 50, shotsQuota: 5 },
      TIER_3: { totalQuota: 500, maxContributors: 200, shotsQuota: 15 },
    };

    const fallback = defaultQuotas[canonical] || { totalQuota: 200, maxContributors: 50, shotsQuota: 5 };

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

