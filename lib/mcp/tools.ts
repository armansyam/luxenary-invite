import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { Prisma, type EventType, type InvitationStatus, type PlanType, type WebhookLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSetting, getPublicPlatformSettings, invalidateSettingsCache } from "@/lib/settings";
import { MCP_COUPON_DESCRIPTION_PREFIX, computeCouponMargins, countActiveMcpCoupons, getMcpCouponLimits } from "@/lib/mcpCouponGuard";
import { checkDomainPointsToPlatform } from "@/lib/customDomainDns";
import { listDatabaseSnapshots } from "@/lib/databaseBackup";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { getActiveRateLimitDriver } from "@/lib/rateLimit";
import { THEME_EVENT_FOLDERS, THEME_STYLES, eventFolderOf, masterDir, masterPathOf } from "@/lib/themePaths";
import { isSafePathSegment } from "@/lib/fsSafe";
import { shareFile } from "@/lib/sharedFiles";
import { getCatalogMediaSlots } from "@/lib/themeMediaSlotsCatalog";
import { THEME_MAP } from "@/lib/renderTemplate";
import { wibMonthStart, wibParts } from "@/lib/financePeriods";
import { DAY_MS } from "@/lib/lifecycleDates";
import { invalidateInvitationLookup, masterTemplateCache } from "@/lib/cache";
import { MCP_SERVER_VERSION, type McpScope } from "./constants";

export interface McpToolDefinition {
  name: string;
  description: string;
  requiredScopes: McpScope[]; // Key hanya perlu memiliki SALAH SATU scope dalam daftar ini
  readOnly: boolean;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeEventFilter(raw: unknown): EventType | null {
  const val = String(raw ?? "").trim().toUpperCase();
  if (val === "WEDDING" || val === "PERSONAL" || val === "EVENT") return val;
  return null;
}

const VALID_INVITATION_STATUSES: readonly InvitationStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "EVENT_FINISHED",
  "TAKEN_DOWN",
  "ARCHIVED",
];

const VALID_WEBHOOK_STATUSES: readonly WebhookLogStatus[] = [
  "received",
  "processed",
  "amount_mismatch",
  "paid_on_closed_order",
  "stale_session",
];

async function scanDiskThemes(): Promise<
  Array<{
    id: string;
    name: string;
    eventType: EventType;
    category: "minimalist" | "modern" | "traditional";
    series: string;
    relativePath: string;
  }>
> {
  const themesDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "themes");
  const styles = [
    { styleFolder: "minimalist", category: "minimalist" as const, series: "Minimalist" },
    { styleFolder: "modern", category: "modern" as const, series: "Modern" },
    { styleFolder: "traditional", category: "traditional" as const, series: "Traditional" },
  ];
  const discovered: Array<{
    id: string;
    name: string;
    eventType: EventType;
    category: "minimalist" | "modern" | "traditional";
    series: string;
    relativePath: string;
  }> = [];
  const seen = new Set<string>();

  for (const ef of THEME_EVENT_FOLDERS) {
    for (const sf of styles) {
      const targetDir = path.join(/*turbopackIgnore: true*/ themesDir, ef.eventFolder, sf.styleFolder);
      try {
        await fs.promises.access(targetDir);
      } catch {
        continue;
      }
      const files = await fs.promises.readdir(targetDir);
      for (const file of files) {
        if (!file.endsWith(".html") || file.startsWith("starter-blueprint") || file.startsWith("_")) {
          continue;
        }
        const id = file.replace(/\.html$/i, "").toLowerCase();
        if (seen.has(id)) continue;
        seen.add(id);
        const formattedName = id
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
        discovered.push({
          id,
          name: formattedName,
          eventType: ef.eventType as EventType,
          category: sf.category,
          series: sf.series,
          relativePath: `themes/${ef.eventFolder}/${sf.styleFolder}/${file}`,
        });
      }
    }
  }
  return discovered;
}

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: "luxvite_get_platform_health",
    description:
      "Read-only: Memeriksa kesehatan real-time server produksi (koneksi & latensi PostgreSQL, memori Node.js, uptime, driver rate limit, serta jumlah & tanggal backup database terbaru).",
    requiredScopes: ["ops:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const dbStart = Date.now();
      let dbOk = false;
      let dbLatencyMs = 0;
      let dbError: string | null = null;
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbOk = true;
        dbLatencyMs = Date.now() - dbStart;
      } catch (err) {
        dbError = err instanceof Error ? err.message : String(err);
      }

      let snapshotsCount = 0;
      let latestSnapshot: { filename: string; sizeFormatted: string; createdAt: string } | null = null;
      try {
        const snapshots = await listDatabaseSnapshots();
        snapshotsCount = snapshots.length;
        if (snapshots[0]) {
          latestSnapshot = {
            filename: snapshots[0].filename,
            sizeFormatted: snapshots[0].sizeFormatted,
            createdAt: snapshots[0].createdAt,
          };
        }
      } catch {
        // Direktori backup belum tersedia pada lingkungan dev/test
      }

      const mem = process.memoryUsage();
      return {
        status: dbOk ? "healthy" : "degraded",
        version: MCP_SERVER_VERSION,
        timestamp: new Date().toISOString(),
        uptimeSec: Math.round(process.uptime()),
        database: {
          connected: dbOk,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
        rateLimitDriver: getActiveRateLimitDriver(),
        memoryMb: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        backups: {
          count: snapshotsCount,
          latest: latestSnapshot,
        },
      };
    },
  },
  {
    name: "luxvite_get_business_kpi_report",
    description:
      "Read-only: Menghasilkan laporan KPI non-finansial & konversi (pengguna baru, status undangan, Draf Gratis vs berbayar, distribusi 3 mode acara WEDDING/PERSONAL/EVENT, top 10 tema terpopuler, tamu, RSVP, foto kenangan, dan custom domain aktif).",
    requiredScopes: ["ops:read", "finance:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Rentang hari pengamatan metrik pertumbuhan terbaru (1–365, bawaan 30).",
          minimum: 1,
          maximum: 365,
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const days = clampInt(args.days, 30, 1, 365);
      const since = new Date(Date.now() - days * DAY_MS);

      const [
        totalUsers,
        newUsersInPeriod,
        partnerProvisionedUsers,
        invByStatus,
        invByEventType,
        freeDraftCount,
        paidInvCount,
        activeCustomDomains,
        topThemesRaw,
        totalGuests,
        rsvpByStatus,
        totalMemories,
        totalActiveThemes,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.user.count({ where: { provisionedByPartnerId: { not: null } } }),
        prisma.invitation.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.invitation.groupBy({ by: ["eventType"], _count: { _all: true } }),
        prisma.invitation.count({ where: { isFreeDraft: true } }),
        prisma.invitation.count({ where: { isFreeDraft: false } }),
        prisma.invitation.count({ where: { customDomain: { not: null } } }),
        prisma.invitation.groupBy({
          by: ["themeId"],
          _count: { _all: true },
          orderBy: { _count: { themeId: "desc" } },
          take: 10,
        }),
        prisma.guest.count(),
        prisma.rsvp.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.guestMemory.count(),
        prisma.theme.count({ where: { isActive: true } }),
      ]);

      const invitationsByStatus: Record<string, number> = {};
      for (const row of invByStatus) invitationsByStatus[row.status] = row._count._all;

      const invitationsByMode: Record<string, number> = {};
      for (const row of invByEventType) invitationsByMode[row.eventType] = row._count._all;

      const rsvpsByStatus: Record<string, number> = {};
      for (const row of rsvpByStatus) rsvpsByStatus[row.status] = row._count._all;

      return {
        generatedAt: new Date().toISOString(),
        periodDays: days,
        periodSince: since.toISOString(),
        users: {
          total: totalUsers,
          newInPeriod: newUsersInPeriod,
          provisionedByPartners: partnerProvisionedUsers,
        },
        invitations: {
          total: freeDraftCount + paidInvCount,
          freeDraftActive: freeDraftCount,
          paidInvitations: paidInvCount,
          activeCustomDomains,
          byStatus: invitationsByStatus,
          byEventType: invitationsByMode,
        },
        engagement: {
          totalGuests,
          totalRsvps: Object.values(rsvpsByStatus).reduce((a, b) => a + b, 0),
          rsvpsByStatus,
          totalGuestMemories: totalMemories,
        },
        themes: {
          activeInCatalog: totalActiveThemes,
          topUsed: topThemesRaw.map((t) => ({ themeId: t.themeId, invitationCount: t._count._all })),
        },
      };
    },
  },
  {
    name: "luxvite_get_finance_report",
    description:
      "Read-only: Laporan keuangan lengkap untuk Tim Finance & COO (omzet bruto/bersih per bulan WIB beserta rincian harian per tanggal WIB, rincian OrderType & PlanType, metode bayar, antrean order PENDING butuh rekonsiliasi, OPEX, komitmen tagihan rutin, margin bersih & status Anti-Rugi, estimasi PPh Final 0,5%, tutup buku, kupon promo, dan ringkasan Mitra Reseller).",
    requiredScopes: ["finance:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          description: "Tahun laporan WIB (bawaan tahun berjalan, misal 2026).",
          minimum: 2024,
          maximum: 2100,
        },
        month: {
          type: "integer",
          description: "Bulan laporan 1–12 WIB (bawaan bulan berjalan).",
          minimum: 1,
          maximum: 12,
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const today = wibParts(new Date());
      const year = clampInt(args.year, today.year, 2024, 2100);
      const month = clampInt(args.month, today.monthIndex + 1, 1, 12);
      const monthStart = wibMonthStart(year, month - 1);
      const nextMonthStart = wibMonthStart(year, month);
      const yearStart = wibMonthStart(year, 0);
      const nextYearStart = wibMonthStart(year + 1, 0);

      const [
        paidOrdersMonth,
        ytdRevenueAgg,
        pendingOrders,
        expiredCountMonth,
        expensesMonth,
        recurringExpenses,
        closingRecord,
        activeCoupons,
        partners,
      ] = await Promise.all([
        prisma.order.findMany({
          where: { status: "PAID", paidAt: { gte: monthStart, lt: nextMonthStart } },
          select: {
            amount: true,
            chargedAmount: true,
            discountAmount: true,
            orderType: true,
            planType: true,
            paymentMethod: true,
            promoCodeApplied: true,
            paidAt: true,
          },
        }),
        prisma.order.aggregate({
          where: { status: "PAID", paidAt: { gte: yearStart, lt: nextYearStart } },
          _sum: { amount: true, discountAmount: true },
          _count: { _all: true },
        }),
        prisma.order.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            invoiceNumber: true,
            planType: true,
            orderType: true,
            amount: true,
            paymentMethod: true,
            proofImageUrl: true,
            createdAt: true,
            expiredAt: true,
          },
        }),
        prisma.order.count({
          where: { status: "EXPIRED", createdAt: { gte: monthStart, lt: nextMonthStart } },
        }),
        prisma.expense.findMany({
          where: { expenseDate: { gte: monthStart, lt: nextMonthStart } },
          select: { amount: true, category: true, isLocked: true, expenseDate: true },
        }),
        prisma.recurringExpense.findMany({
          where: { isActive: true },
          orderBy: { dueDayOfMonth: "asc" },
          select: {
            name: true,
            category: true,
            estimatedAmount: true,
            dueDayOfMonth: true,
            vendorName: true,
          },
        }),
        prisma.financialClosing.findUnique({
          where: { periodMonth_periodYear: { periodMonth: month, periodYear: year } },
          select: {
            grossRevenue: true,
            totalExpenses: true,
            netProfit: true,
            taxAmount: true,
            taxPaid: true,
            taxPaidAt: true,
            closedAt: true,
          },
        }),
        prisma.promoCoupon.findMany({
          where: { isActive: true },
          select: {
            code: true,
            discountType: true,
            discountValue: true,
            usageCount: true,
            quotaLimit: true,
            validUntil: true,
          },
          orderBy: { usageCount: "desc" },
          take: 20,
        }),
        prisma.partnerAffiliate.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            vendorCategory: true,
            commissionType: true,
            commissionValue: true,
            _count: { select: { provisionedClients: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ]);

      let grossRevenue = 0;
      let totalCharged = 0;
      let totalDiscount = 0;
      const byOrderType: Record<string, { count: number; amount: number }> = {};
      const byPlanType: Record<string, { count: number; amount: number }> = {};
      const byPaymentMethod: Record<string, { count: number; amount: number }> = {};

      for (const o of paidOrdersMonth) {
        const amt = Number(o.amount || 0);
        const charged = Number(o.chargedAmount ?? o.amount ?? 0);
        const disc = Number(o.discountAmount || 0);
        grossRevenue += amt;
        totalCharged += charged;
        totalDiscount += disc;

        byOrderType[o.orderType] = {
          count: (byOrderType[o.orderType]?.count || 0) + 1,
          amount: (byOrderType[o.orderType]?.amount || 0) + amt,
        };
        byPlanType[o.planType] = {
          count: (byPlanType[o.planType]?.count || 0) + 1,
          amount: (byPlanType[o.planType]?.amount || 0) + amt,
        };
        byPaymentMethod[o.paymentMethod] = {
          count: (byPaymentMethod[o.paymentMethod]?.count || 0) + 1,
          amount: (byPaymentMethod[o.paymentMethod]?.amount || 0) + amt,
        };
      }

      let totalExpenses = 0;
      const expensesByCategory: Record<string, number> = {};
      for (const e of expensesMonth) {
        const amt = Number(e.amount || 0);
        totalExpenses += amt;
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + amt;
      }

      // Rincian harian per tanggal WIB dari data yang sama dengan ringkasan bulanan (jumlah harian = total bulan).
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const daily = Array.from({ length: daysInMonth }, (_, i) => ({
        date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
        paidOrdersCount: 0,
        grossRevenue: 0,
        totalDiscount: 0,
        totalChargedToGateway: 0,
        totalExpenses: 0,
      }));
      for (const o of paidOrdersMonth) {
        if (!o.paidAt) continue;
        const row = daily[wibParts(o.paidAt).day - 1];
        row.paidOrdersCount += 1;
        row.grossRevenue += Number(o.amount || 0);
        row.totalDiscount += Number(o.discountAmount || 0);
        row.totalChargedToGateway += Number(o.chargedAmount ?? o.amount ?? 0);
      }
      for (const e of expensesMonth) {
        daily[wibParts(e.expenseDate).day - 1].totalExpenses += Number(e.amount || 0);
      }

      const estimatedPphFinal05 = Math.round(grossRevenue * 0.005);
      const netProfit = grossRevenue - totalExpenses;
      const netProfitAfterTax = netProfit - estimatedPphFinal05;
      const netMarginPercent =
        grossRevenue > 0 ? Number(((netProfitAfterTax / grossRevenue) * 100).toFixed(2)) : 0;
      const marginHealth =
        grossRevenue === 0
          ? "NO_REVENUE"
          : netMarginPercent >= 50
            ? "SEHAT"
            : netMarginPercent >= 20
              ? "WASPADA"
              : "BAHAYA_RUGI";

      const monthlyRecurringCommitment = recurringExpenses.reduce(
        (sum, r) => sum + Number(r.estimatedAmount || 0),
        0
      );

      return {
        period: {
          year,
          month,
          timezone: "Asia/Jakarta (WIB)",
          startIso: monthStart.toISOString(),
          endIso: nextMonthStart.toISOString(),
        },
        summary: {
          paidOrdersCount: paidOrdersMonth.length,
          expiredOrdersCount: expiredCountMonth,
          grossRevenue,
          totalChargedToGateway: totalCharged,
          totalPromoDiscount: totalDiscount,
          totalOpex: totalExpenses,
          netProfitBeforeTax: netProfit,
          estimatedPphFinal05,
          netProfitAfterTax,
          netMarginPercent,
          marginHealth,
        },
        yearToDate: {
          year,
          paidOrdersCount: ytdRevenueAgg._count._all,
          grossRevenue: Number(ytdRevenueAgg._sum.amount || 0),
          totalDiscount: Number(ytdRevenueAgg._sum.discountAmount || 0),
        },
        breakdown: {
          byOrderType,
          byPlanType,
          byPaymentMethod,
          expensesByCategory,
        },
        daily,
        pendingReconciliation: {
          count: pendingOrders.length,
          totalPendingAmount: pendingOrders.reduce((s, o) => s + Number(o.amount || 0), 0),
          items: pendingOrders.map((o) => ({
            id: o.id,
            invoiceNumber: o.invoiceNumber,
            planType: o.planType,
            orderType: o.orderType,
            amount: Number(o.amount || 0),
            paymentMethod: o.paymentMethod,
            hasTransferProof: Boolean(o.proofImageUrl),
            createdAt: o.createdAt.toISOString(),
            expiredAt: o.expiredAt?.toISOString() ?? null,
          })),
        },
        recurringCommitments: {
          activeCount: recurringExpenses.length,
          estimatedMonthlyTotal: monthlyRecurringCommitment,
          items: recurringExpenses.map((r) => ({
            name: r.name,
            category: r.category,
            estimatedAmount: Number(r.estimatedAmount || 0),
            dueDayOfMonth: r.dueDayOfMonth,
            vendorName: r.vendorName,
          })),
        },
        financialClosing: closingRecord
          ? {
              closed: true,
              grossRevenue: Number(closingRecord.grossRevenue),
              totalExpenses: Number(closingRecord.totalExpenses),
              netProfit: Number(closingRecord.netProfit),
              taxAmount: Number(closingRecord.taxAmount),
              taxPaid: closingRecord.taxPaid,
              taxPaidAt: closingRecord.taxPaidAt?.toISOString() ?? null,
              closedAt: closingRecord.closedAt.toISOString(),
            }
          : { closed: false },
        marketingSummary: {
          activeCouponsCount: activeCoupons.length,
          activeCoupons: activeCoupons.map((c) => ({
            code: c.code,
            discountType: c.discountType,
            discountValue: Number(c.discountValue),
            usageCount: c.usageCount,
            quotaLimit: c.quotaLimit,
            validUntil: c.validUntil?.toISOString() ?? null,
          })),
          activePartnersCount: partners.length,
          activePartners: partners.map((p) => ({
            id: p.id,
            name: p.name,
            vendorCategory: p.vendorCategory,
            discountType: p.commissionType,
            discountValue: Number(p.commissionValue),
            provisionedClientsCount: p._count.provisionedClients,
          })),
        },
      };
    },
  },
  {
    name: "luxvite_list_themes_catalog",
    description:
      "Read-only: Mengambil katalog tema aktif dari database sekaligus mengaudit sinkronisasi 1:1 terhadap berkas fisik themes/{wedding,personal,event}/ di disk.",
    requiredScopes: ["catalog:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        eventType: {
          type: "string",
          enum: ["ALL", "WEDDING", "PERSONAL", "EVENT"],
          description: "Filter mode acara (bawaan ALL).",
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const filterMode = normalizeEventFilter(args.eventType);
      const [dbThemes, diskThemes] = await Promise.all([
        prisma.theme.findMany({
          where: filterMode ? { eventType: filterMode } : undefined,
          orderBy: [{ eventType: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            eventType: true,
            subEvent: true,
            category: true,
            isActive: true,
            defaultMusicUrl: true,
            builderSpec: true,
          },
        }),
        scanDiskThemes(),
      ]);

      const filteredDisk = filterMode
        ? diskThemes.filter((d) => d.eventType === filterMode)
        : diskThemes;

      const dbIds = new Set(dbThemes.map((t) => t.id));
      const diskIds = new Set(filteredDisk.map((d) => d.id));
      const missingInDb = filteredDisk.filter((d) => !dbIds.has(d.id)).map((d) => d.id);
      const extraInDb = dbThemes.filter((t) => !diskIds.has(t.id)).map((t) => t.id);

      const countsByMode: Record<string, number> = { WEDDING: 0, PERSONAL: 0, EVENT: 0 };
      for (const t of dbThemes) {
        countsByMode[t.eventType] = (countsByMode[t.eventType] || 0) + 1;
      }

      return {
        filter: filterMode || "ALL",
        dbTotal: dbThemes.length,
        dbActive: dbThemes.filter((t) => t.isActive).length,
        diskTotal: filteredDisk.length,
        isSynced: missingInDb.length === 0 && extraInDb.length === 0,
        missingInDb,
        extraInDb,
        countsByMode,
        themes: dbThemes.map((t) => ({
          id: t.id,
          name: t.name,
          eventType: t.eventType,
          subEvent: t.subEvent,
          category: t.category,
          isActive: t.isActive,
          source: t.builderSpec ? "THEME_BUILDER" : "HANDCRAFTED",
          defaultMusicUrl: t.defaultMusicUrl,
        })),
      };
    },
  },
  {
    name: "luxvite_get_packages_and_settings",
    description:
      "Read-only: Membaca paket harga aktif (Serenade, Symphony, Eternity), add-on, paymentMode, batas Draf Gratis dinamis (retentionFreeDraftDays & freeDraftMaxPhotos), status layanan, dan jumlah musik preset (tanpa secret/kredensial).",
    requiredScopes: ["catalog:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const [settings, musicPresets] = await Promise.all([
        getPublicPlatformSettings(),
        prisma.musicPreset.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, composer: true, genre: true, durationSec: true },
        }),
      ]);

      return {
        platformName: settings.platformName,
        paymentMode: settings.paymentMode,
        serviceStatus: settings.serviceStatus,
        supportWhatsapp: settings.supportWhatsapp,
        supportEmail: settings.supportEmail,
        enabledEventTypes: settings.enabledEventTypes,
        promoEnabled: settings.promoEnabled,
        customDomainEnabled: settings.customDomainEnabled,
        cnameTarget: settings.cnameTarget,
        freeDraft: {
          retentionDays: settings.freeDraftRetentionDays,
          maxPhotos: settings.freeDraftMaxPhotos,
        },
        retention: {
          subdomainGraceDays: settings.subdomainGraceDays,
          galleryRetentionDays: settings.galleryRetentionDays,
          archiveRetentionDays: settings.archiveRetentionDays,
        },
        addons: {
          galleryExtensionPricePerMonth: settings.galleryExtensionPricePerMonth,
          memoriesTopupEnabled: settings.addonMemoriesTopupEnabled,
          memoriesTopupPhotos: settings.addonMemoriesTopupPhotos,
          memoriesTopupPrice: settings.addonMemoriesTopupPrice,
        },
        packages: settings.packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          capabilities: p.capabilities,
          badge: p.badge ?? null,
          isFeatured: Boolean(p.isFeatured),
        })),
        activeMusicPresetsCount: musicPresets.length,
        musicPresets,
      };
    },
  },
  {
    name: "luxvite_search_invitations",
    description:
      "Read-only: Mencari undangan klien berdasarkan slug, subdomain, custom domain, email klien, atau nama klien beserta status siklus hidup dan statistik ringkas (bebas kebocoran staffPin/passwordHash).",
    requiredScopes: ["support:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Kata kunci opsional (slug, subdomain, custom domain, email, atau nama klien).",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "PUBLISHED", "EVENT_FINISHED", "TAKEN_DOWN", "ARCHIVED"],
          description: "Filter status siklus hidup undangan.",
        },
        isFreeDraft: {
          type: "boolean",
          description: "Filter khusus Draf Gratis (true) atau undangan berbayar (false).",
        },
        limit: {
          type: "integer",
          description: "Jumlah maksimal hasil (1–25, bawaan 10).",
          minimum: 1,
          maximum: 25,
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const q = String(args.query ?? "").trim();
      const limit = clampInt(args.limit, 10, 1, 25);
      const rawStatus = String(args.status ?? "").trim().toUpperCase();
      const statusFilter = (VALID_INVITATION_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as InvitationStatus)
        : undefined;
      const isFreeDraftFilter =
        typeof args.isFreeDraft === "boolean" ? args.isFreeDraft : undefined;

      const where: Prisma.InvitationWhereInput = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(isFreeDraftFilter !== undefined ? { isFreeDraft: isFreeDraftFilter } : {}),
        ...(q
          ? {
              OR: [
                { invitationSlug: { contains: q, mode: "insensitive" } },
                { subdomain: { contains: q, mode: "insensitive" } },
                { customDomain: { contains: q, mode: "insensitive" } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      };

      const rows = await prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          invitationSlug: true,
          subdomain: true,
          customDomain: true,
          status: true,
          eventType: true,
          subEvent: true,
          themeId: true,
          isFreeDraft: true,
          publishedAt: true,
          galleryExpiresAt: true,
          adminUnlockedUntil: true,
          memoriesUploadLocked: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          order: { select: { invoiceNumber: true, planType: true, status: true } },
          _count: { select: { guests: true, rsvps: true, guestMemories: true } },
        },
      });

      return {
        count: rows.length,
        items: rows.map((r) => ({
          id: r.id,
          invitationSlug: r.invitationSlug,
          subdomain: r.subdomain,
          customDomain: r.customDomain,
          status: r.status,
          eventType: r.eventType,
          subEvent: r.subEvent,
          themeId: r.themeId,
          isFreeDraft: r.isFreeDraft,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          galleryExpiresAt: r.galleryExpiresAt?.toISOString() ?? null,
          emergencyUnlocked: Boolean(r.adminUnlockedUntil && r.adminUnlockedUntil.getTime() > Date.now()),
          memoriesUploadLocked: r.memoriesUploadLocked,
          createdAt: r.createdAt.toISOString(),
          client: r.user,
          order: r.order,
          counts: r._count,
        })),
      };
    },
  },
  {
    name: "luxvite_check_custom_domain_dns",
    description:
      "Read-only: Memeriksa propagasi DNS (A & CNAME record) domain kustom klien terhadap server Luxvite serta status keterdaftarannya di database undangan.",
    requiredScopes: ["support:read", "ops:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Nama domain kustom klien (contoh: andisiti.com).",
        },
      },
      required: ["domain"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const domain = String(args.domain ?? "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .trim();

      if (!domain || !domain.includes(".") || domain.length > 253) {
        throw new Error("Parameter 'domain' tidak valid (contoh: andisiti.com).");
      }

      const bareDomain = domain.replace(/^www\./, "");
      const [dnsResult, linkedInvitation] = await Promise.all([
        checkDomainPointsToPlatform(domain),
        prisma.invitation.findFirst({
          where: {
            OR: [
              { customDomain: { equals: domain, mode: "insensitive" } },
              { customDomain: { equals: bareDomain, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            invitationSlug: true,
            subdomain: true,
            customDomain: true,
            status: true,
          },
        }),
      ]);

      return {
        domain,
        dns: dnsResult,
        registeredInPlatform: Boolean(linkedInvitation),
        invitation: linkedInvitation,
      };
    },
  },
  {
    name: "luxvite_get_ops_logs",
    description:
      "Read-only: Mengambil log webhook pembayaran Midtrans terbaru (termasuk filter status anomali) dan log audit aktivitas admin/MCP terbaru.",
    requiredScopes: ["ops:read"],
    readOnly: true,
    inputSchema: {
      type: "object",
      properties: {
        webhookStatus: {
          type: "string",
          enum: ["ALL", "received", "processed", "amount_mismatch", "paid_on_closed_order", "stale_session"],
          description: "Filter status webhook log (bawaan ALL).",
        },
        limit: {
          type: "integer",
          description: "Jumlah log per jenis (1–50, bawaan 15).",
          minimum: 1,
          maximum: 50,
        },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const limit = clampInt(args.limit, 15, 1, 50);
      const rawWh = String(args.webhookStatus ?? "ALL").trim();
      const whFilter = (VALID_WEBHOOK_STATUSES as readonly string[]).includes(rawWh)
        ? (rawWh as WebhookLogStatus)
        : undefined;

      const [webhooks, auditLogs] = await Promise.all([
        prisma.webhookLog.findMany({
          where: whFilter ? { status: whFilter } : undefined,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            source: true,
            event: true,
            status: true,
            processedAt: true,
            createdAt: true,
          },
        }),
        prisma.adminAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            adminLabel: true,
            action: true,
            details: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        webhooks: webhooks.map((w) => ({
          id: w.id,
          source: w.source,
          event: w.event,
          status: w.status,
          processedAt: w.processedAt?.toISOString() ?? null,
          createdAt: w.createdAt.toISOString(),
        })),
        auditLogs: auditLogs.map((a) => ({
          id: a.id,
          actor: a.adminLabel || "ADMIN",
          action: a.action,
          details: a.details ? a.details.slice(0, 300) : null,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    },
  },
  {
    name: "luxvite_sync_themes",
    description:
      "Write non-finansial (ops:write): Menyinkronkan katalog tema fisik di disk themes/{wedding,personal,event}/ ke tabel PostgreSQL themes (upsert aman tanpa menghapus tema aktif yang dipakai undangan) dan menyegarkan cache /demo.",
    requiredScopes: ["ops:write"],
    readOnly: false,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const discovered = await scanDiskThemes();
      if (discovered.length === 0) {
        throw new Error("Tidak ada berkas tema fisik yang terdeteksi di direktori themes/. Sinkronisasi dibatalkan.");
      }

      const { DEMO_REGISTRY } = await import("@/lib/demoRegistry");
      let syncedCount = 0;

      for (let i = 0; i < discovered.length; i++) {
        const d = discovered[i];
        const existing = await prisma.theme.findUnique({ where: { id: d.id } });
        const demoData = (DEMO_REGISTRY as Record<string, any>)[d.id];
        const defaultDesc = demoData?.tagline || `${d.series} — ${d.name} Exclusive Design`;
        const catalogMediaSlots = getCatalogMediaSlots(d.id);
        const shouldSeedMediaSlots = Boolean(catalogMediaSlots && (!existing || existing.mediaSlots === null));
        const defaultSubEvent = THEME_MAP[d.id]?.subEvent ?? null;
        const shouldSeedSubEvent = Boolean(defaultSubEvent && (!existing || existing.subEvent === null));

        await prisma.theme.upsert({
          where: { id: d.id },
          update: {
            name: existing?.name || d.name,
            category: d.category,
            eventType: d.eventType,
            series: existing?.series === "DRAFT_REVIEW" ? "DRAFT_REVIEW" : d.series,
            sortOrder: existing?.sortOrder ?? i + 1,
            description: existing?.description || defaultDesc,
            thumbnail: existing?.thumbnail || demoData?.sidebarPhotoUrl || demoData?.landingCoverUrl || null,
            ...(existing ? {} : { isActive: true }),
            ...(shouldSeedSubEvent ? { subEvent: defaultSubEvent } : {}),
            ...(shouldSeedMediaSlots && catalogMediaSlots
              ? { mediaSlots: catalogMediaSlots as unknown as Prisma.InputJsonValue }
              : {}),
          },
          create: {
            id: d.id,
            name: d.name,
            category: d.category,
            eventType: d.eventType,
            ...(defaultSubEvent ? { subEvent: defaultSubEvent } : {}),
            series: existing?.series === "DRAFT_REVIEW" ? "DRAFT_REVIEW" : d.series,
            description: defaultDesc,
            thumbnail: demoData?.sidebarPhotoUrl || demoData?.landingCoverUrl || null,
            sortOrder: i + 1,
            isActive: true,
            ...(catalogMediaSlots
              ? { mediaSlots: catalogMediaSlots as unknown as Prisma.InputJsonValue }
              : {}),
          },
        });
        syncedCount++;
      }

      masterTemplateCache.clear();
      try {
        revalidatePath("/demo");
        revalidatePath("/api/public/themes");
      } catch {
        // revalidatePath hanya aktif dalam request runtime Next.js
      }

      const activeCount = await prisma.theme.count({ where: { isActive: true } });
      return {
        success: true,
        discoveredOnDisk: discovered.length,
        syncedCount,
        activeThemesInDb: activeCount,
      };
    },
  },
  {
    name: "luxvite_purge_cache",
    description:
      "Write non-finansial (ops:write): Membersihkan cache ISR Next.js, cache L1 pengaturan & template lintas worker PM2, serta cache edge Cloudflare (bila aktif).",
    requiredScopes: ["ops:write"],
    readOnly: false,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const paths = ["/", "/sitemap.xml", "/packages", "/demo", "/api/public/themes"];
      let nextjsOk = true;
      let nextjsError: string | null = null;
      try {
        for (const p of paths) revalidatePath(p);
      } catch (err) {
        nextjsOk = false;
        nextjsError = err instanceof Error ? err.message : String(err);
      }

      invalidateSettingsCache();
      masterTemplateCache.clear();
      invalidateInvitationLookup(null, null, null, null);
      const cloudflare = await purgeCloudflareCache({ purgeEverything: true });

      return {
        success: nextjsOk,
        nextjs: { ok: nextjsOk, paths, ...(nextjsError ? { error: nextjsError } : {}) },
        localCachesCleared: true,
        cloudflare,
      };
    },
  },
  {
    name: "luxvite_create_draft_theme",
    description:
      "Write non-finansial (ops:write): Membuat atau memperbarui tema DRAF BARU (isActive=false, series=DRAFT_REVIEW) dari Dept 2 AI / Theme Lab langsung ke disk VPS & PostgreSQL tanpa mengganggu katalog publik. Hanya slug baru atau draf MCP yang sudah ada dengan mode & gaya yang sama; tema bawaan, tema Theme Builder, dan tema non-draf ditolak. Mengembalikan URL preview khusus Admin (https://luxvite.id/demo/<slug>, disajikan dalam sandbox tanpa akses sesi admin).",
    requiredScopes: ["ops:write"],
    readOnly: false,
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "ID slug tema huruf kecil (mis: emerald-soiree). Maks 48 karakter." },
        name: { type: "string", description: "Nama tampilan tema (mis: Emerald Soiree)." },
        eventType: { type: "string", enum: ["WEDDING", "PERSONAL", "EVENT"], description: "Mode acara tema." },
        style: { type: "string", enum: ["minimalist", "modern", "traditional"], description: "Gaya desain tema." },
        description: { type: "string", description: "Deskripsi singkat atau catatan konsep tema." },
        subEvent: { type: "string", description: "Tag sub-acara opsional (mis: Ulang Tahun, Corporate)." },
        htmlContent: { type: "string", description: "Kode lengkap HTML master tema (wajib valid HTML dengan variabel CSS :root)." },
      },
      required: ["slug", "name", "eventType", "style", "htmlContent"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const slug = String(args.slug ?? "").trim().toLowerCase();
      const name = String(args.name ?? "").trim();
      const eventType = normalizeEventFilter(args.eventType) ?? "WEDDING";
      const rawStyle = String(args.style ?? "modern").trim().toLowerCase();
      const style = (THEME_STYLES as readonly string[]).includes(rawStyle)
        ? (rawStyle as (typeof THEME_STYLES)[number])
        : "modern";
      const description = String(args.description ?? "").trim() || `${name} — Draft Theme by AI Theme Lab`;
      const subEvent = args.subEvent ? String(args.subEvent).trim().slice(0, 60) : null;
      const htmlContent = String(args.htmlContent ?? "");

      if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(slug) || !isSafePathSegment(slug) || slug === "starter-blueprint") {
        throw new Error("Slug tema tidak valid. Gunakan huruf kecil, angka, dan tanda hubung (2-49 karakter).");
      }
      if (!name || name.length > 80) {
        throw new Error("Nama tema wajib diisi (maks 80 karakter).");
      }
      if (!htmlContent || htmlContent.length < 200 || htmlContent.length > 600_000) {
        throw new Error("htmlContent wajib berupa dokumen HTML valid (200 byte - 600 KB).");
      }
      if (!/<html[\s>]|<!doctype\s+html/i.test(htmlContent)) {
        throw new Error("htmlContent harus mengandung tag <!DOCTYPE html> atau <html>.");
      }

      // Kunci MCP hanya boleh membuat slug baru atau memperbarui draf MCP miliknya sendiri di folder yang sama.
      // Tema nonaktif lain (master tulisan tangan, draf Theme Builder yang berkasnya hanya ada di disk server) tidak boleh tertimpa.
      if (Object.prototype.hasOwnProperty.call(THEME_MAP, slug)) {
        throw new Error(`Slug '${slug}' dipakai tema bawaan. Gunakan slug baru.`);
      }
      const existing = await prisma.theme.findUnique({
        where: { id: slug },
        select: { isActive: true, series: true, eventType: true, category: true, builderSpec: true },
      });
      const isOwnDraft =
        existing !== null &&
        !existing.isActive &&
        existing.series === "DRAFT_REVIEW" &&
        existing.builderSpec === null &&
        existing.eventType === eventType &&
        existing.category === style;
      if (existing && !isOwnDraft) {
        throw new Error(
          `Tema '${slug}' sudah ada dan bukan draf MCP dengan mode & gaya yang sama. Gunakan slug baru agar tidak menimpa tema lain.`
        );
      }
      const filePath = masterPathOf(eventType, style, slug);
      for (const { eventType: ev } of THEME_EVENT_FOLDERS) {
        for (const st of THEME_STYLES) {
          const other = masterPathOf(ev, st, slug);
          if ((other !== filePath || !existing) && fs.existsSync(other)) {
            throw new Error(`Berkas master '${slug}' sudah ada di disk. Gunakan slug baru.`);
          }
        }
      }

      const targetDir = masterDir(eventType, style);
      await fs.promises.mkdir(targetDir, { recursive: true });
      await fs.promises.writeFile(filePath, htmlContent, "utf-8");
      await shareFile(filePath);

      const maxOrder = await prisma.theme.aggregate({ _max: { sortOrder: true } });
      const nextSortOrder = (maxOrder._max.sortOrder ?? 81) + 1;

      await prisma.theme.upsert({
        where: { id: slug },
        update: {
          name,
          description,
          category: style,
          eventType,
          subEvent,
          series: "DRAFT_REVIEW",
          isActive: false,
        },
        create: {
          id: slug,
          name,
          description,
          category: style,
          eventType,
          subEvent,
          series: "DRAFT_REVIEW",
          isActive: false,
          sortOrder: nextSortOrder,
        },
      });

      masterTemplateCache.clear();
      try {
        revalidatePath("/admin");
      } catch {
        // revalidatePath hanya aktif dalam request runtime Next.js
      }

      const relDiskPath = `themes/${eventFolderOf(eventType)}/${style}/${slug}.html`;
      return {
        success: true,
        id: slug,
        name,
        eventType,
        style,
        status: "DRAFT_REVIEW",
        isActive: false,
        diskPath: relDiskPath,
        previewUrl: `https://luxvite.id/demo/${slug}`,
        adminReviewUrl: "https://luxvite.id/admin?tab=themes",
        masterEditorUrl: `https://luxvite.id/admin/master-editor?id=${slug}`,
      };
    },
  },
  {
    name: "luxvite_get_coupon_rules",
    description:
      "Read-only: Batas kupon tim AI yang ditetapkan admin di tab Pemasaran (potongan maksimum %, kuota maksimum, masa berlaku maksimum, jumlah kupon tim AI aktif maksimum, margin bersih minimum per paket, fee gateway untuk hitung margin), jumlah kupon tim AI yang sedang aktif, status master promo, dan daftar kupon tim AI. Baca ini sebelum mengusulkan atau membuat kupon.",
    requiredScopes: ["marketing:write", "finance:read"],
    readOnly: true,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      const [limits, activeCount, promoEnabled, coupons] = await Promise.all([
        getMcpCouponLimits(),
        countActiveMcpCoupons(),
        getAdminSetting("promo_enabled", "false"),
        prisma.promoCoupon.findMany({
          where: { description: { startsWith: MCP_COUPON_DESCRIPTION_PREFIX } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { code: true, description: true, discountType: true, discountValue: true, quotaLimit: true, usageCount: true, applicablePlans: true, validUntil: true, isActive: true, createdAt: true },
        }),
      ]);
      return {
        limits,
        activeMcpCoupons: activeCount,
        remainingSlots: Math.max(0, limits.maxActive - activeCount),
        promoEnabled: promoEnabled === "true",
        coupons: coupons.map((c) => ({
          ...c,
          discountValue: Number(c.discountValue),
          validUntil: c.validUntil?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    },
  },
  {
    name: "luxvite_create_coupon",
    description:
      "Write (marketing:write): Membuat kupon PERSEN untuk kampanye tim pemasaran dalam batas admin (lihat luxvite_get_coupon_rules). Ditolak bila persen, kuota, masa berlaku, atau jumlah kupon aktif melewati batas, bila margin bersih paket mana pun (setelah potongan, fee gateway, dan PPh 0,5%) turun di bawah margin minimum, atau bila kode sudah dipakai. Kupon langsung aktif, berlaku sejak sekarang, maks. 1 kali per akun, dan bertanda [MCP] di daftar kupon admin.",
    requiredScopes: ["marketing:write"],
    readOnly: false,
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Kode kupon 4–20 karakter huruf besar/angka (mis: AKHIRTAHUN15)." },
        discountPercent: { type: "number", description: "Potongan dalam persen (mis: 15)." },
        quotaLimit: { type: "integer", description: "Jumlah pemakaian maksimum kupon ini." },
        validDays: { type: "integer", description: "Masa berlaku dalam hari sejak dibuat." },
        applicablePlans: {
          type: "array",
          items: { type: "string", enum: ["TIER_1", "TIER_2", "TIER_3"] },
          description: "Paket yang boleh memakai kupon; kosongkan untuk semua paket.",
        },
        purpose: { type: "string", description: "Tujuan kampanye & kanal pemakaian (mis: carousel IG akhir tahun 26 Nov), min. 10 karakter." },
      },
      required: ["code", "discountPercent", "quotaLimit", "validDays", "purpose"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const code = String(args.code ?? "").trim().toUpperCase();
      const purpose = String(args.purpose ?? "").trim();
      const pct = Number(args.discountPercent);
      const quota = Number(args.quotaLimit);
      const days = Number(args.validDays);
      const plans = Array.isArray(args.applicablePlans)
        ? Array.from(new Set(args.applicablePlans.map((p) => String(p).trim().toUpperCase()).filter((p): p is PlanType => p === "TIER_1" || p === "TIER_2" || p === "TIER_3")))
        : [];
      if (!/^[A-Z0-9]{4,20}$/.test(code)) throw new Error("Kode kupon harus 4–20 karakter huruf besar atau angka tanpa spasi.");
      if (purpose.length < 10) throw new Error("Isi purpose (tujuan kampanye & kanal) minimal 10 karakter.");

      const limits = await getMcpCouponLimits();
      const violations: string[] = [];
      if (!Number.isFinite(pct) || pct <= 0 || pct > limits.maxPercent) violations.push(`potongan ${args.discountPercent}% melewati batas ${limits.maxPercent}%`);
      if (!Number.isInteger(quota) || quota < 1 || quota > limits.maxQuota) violations.push(`kuota ${args.quotaLimit} di luar 1–${limits.maxQuota}`);
      if (!Number.isInteger(days) || days < 1 || days > limits.maxValidDays) violations.push(`masa berlaku ${args.validDays} hari di luar 1–${limits.maxValidDays}`);
      const active = await countActiveMcpCoupons();
      if (active >= limits.maxActive) violations.push(`sudah ada ${active} kupon tim AI aktif (batas ${limits.maxActive}); nonaktifkan yang selesai dulu`);
      const margins = Number.isFinite(pct) && pct > 0 ? await computeCouponMargins(pct, plans, limits.gatewayFeePercent) : [];
      const thin = margins.filter((m) => m.marginPercent < limits.minMarginPercent);
      if (thin.length) violations.push(`margin ${thin.map((m) => `${m.name} ${m.marginPercent}%`).join(", ")} di bawah minimum ${limits.minMarginPercent}%`);
      if (await prisma.promoCoupon.findUnique({ where: { code }, select: { id: true } })) violations.push(`kode ${code} sudah dipakai`);
      if (violations.length) throw new Error(`Kupon ditolak: ${violations.join("; ")}.`);

      const now = new Date();
      const created = await prisma.promoCoupon.create({
        data: {
          code,
          description: `${MCP_COUPON_DESCRIPTION_PREFIX} ${purpose.slice(0, 280)}`,
          discountType: "PERCENT",
          discountValue: new Prisma.Decimal(pct),
          quotaLimit: quota,
          perUserLimit: 1,
          applicablePlans: plans,
          validFrom: now,
          validUntil: new Date(now.getTime() + days * DAY_MS),
          isActive: true,
        },
        select: { id: true, code: true, discountValue: true, quotaLimit: true, applicablePlans: true, validFrom: true, validUntil: true },
      });
      const promoEnabled = (await getAdminSetting("promo_enabled", "false")) === "true";
      return {
        success: true,
        coupon: { ...created, discountValue: Number(created.discountValue), validFrom: created.validFrom?.toISOString(), validUntil: created.validUntil?.toISOString() },
        margins,
        promoEnabled,
        ...(promoEnabled ? {} : { warning: "Master promo (promo_enabled) sedang mati di Admin → Pemasaran; kupon belum bisa dipakai klien sampai admin menyalakannya." }),
      };
    },
  },
  {
    name: "luxvite_deactivate_coupon",
    description:
      "Write (marketing:write): Menonaktifkan kupon tim AI (bertanda [MCP]) setelah kampanye selesai atau kuota habis. Kupon buatan admin tidak bisa diubah lewat tool ini.",
    requiredScopes: ["marketing:write"],
    readOnly: false,
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", description: "Kode kupon tim AI yang akan dinonaktifkan." } },
      required: ["code"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const code = String(args.code ?? "").trim().toUpperCase();
      const coupon = await prisma.promoCoupon.findUnique({ where: { code }, select: { id: true, description: true, isActive: true } });
      if (!coupon) throw new Error(`Kupon ${code} tidak ditemukan.`);
      if (!String(coupon.description ?? "").startsWith(MCP_COUPON_DESCRIPTION_PREFIX)) {
        throw new Error(`Kupon ${code} dibuat admin, bukan tim AI; ubah lewat Admin → Pemasaran.`);
      }
      if (coupon.isActive) await prisma.promoCoupon.update({ where: { id: coupon.id }, data: { isActive: false } });
      return { success: true, code, isActive: false, wasActive: coupon.isActive };
    },
  },
];

const TOOL_BY_NAME = new Map<string, McpToolDefinition>(
  MCP_TOOLS.map((tool) => [tool.name, tool])
);

export function getMcpToolByName(name: string): McpToolDefinition | undefined {
  return TOOL_BY_NAME.get(name);
}

export function listToolsCatalogSummary() {
  return MCP_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    requiredScopes: t.requiredScopes,
    readOnly: t.readOnly,
  }));
}
