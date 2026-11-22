"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

import { AdminTeamManagement } from "@/components/admin/AdminTeamManagement";
import { AdminCashflowTab as AdminFinanceTab } from "@/components/admin/AdminCashflowTab";
import { AdminMarketingTab } from "@/components/admin/AdminMarketingTab";
import { AdminPortfolioTab } from "@/components/admin/AdminPortfolioTab";
import AdminOverviewTab from "@/components/admin/AdminOverviewTab";
import AdminThemesTab from "@/components/admin/AdminThemesTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminClientsTab from "@/components/admin/AdminClientsTab";
import AdminInvitationsTab from "@/components/admin/AdminInvitationsTab";
import AdminCustomDomainsTab from "@/components/admin/AdminCustomDomainsTab";
import AdminMonitoringTab from "@/components/admin/AdminMonitoringTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminDatabaseTab from "@/components/admin/AdminDatabaseTab";
import AdminMcpTab from "@/components/admin/AdminMcpTab";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { useFeedback } from "@/components/ui/Feedback";

const tabs = [
  {
    id: "overview",
    label: "Ringkasan",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Transaksi",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Klien",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },

  {
    id: "invitations",
    label: "Invitation Projects",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "portfolio",
    label: "Portofolio",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "custom_domains",
    label: "Custom Domain",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    id: "themes",
    label: "Tema & Musik",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 5 5 0 014-5h10a4 4 0 014 4v1a4 4 0 01-4 4H7zM7 7h10M7 11h10" />
      </svg>
    ),
  },
  {
    id: "mcp",
    label: "MCP & AI",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Pengaturan",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "database",
    label: "Database & Backup",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    id: "logs",
    label: "Monitoring",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "team",
    label: "Tim & Akses",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: "marketing",
    label: "Pemasaran & Afiliasi",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: "finance",
    label: "Finance & Keuangan",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const VALID_ADMIN_TABS = [
  "overview",
  "orders",
  "users",
  "invitations",
  "portfolio",
  "custom_domains",
  "themes",
  "marketing",
  "mcp",
  "settings",
  "database",
  "logs",
  "team",
  "finance",
];

const VALID_SETTINGS_SUBS = [
  "akun",
  "keuangan",
  "paket",
  "integrasi",
  "operasional",
  "tentang",
  // Legacy aliases — redirect lama ke baru via URL restore logic
  "pembayaran",
  "gateway",
  "setup",
  "platform",
];

// Label yang dapat diubah klien di Studio undangan tetapi belum punya isian di sub-panel Narasi Studio Demo.
export default function AdminPage() {
  const feedback = useFeedback();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab && VALID_ADMIN_TABS.includes(urlTab)) return urlTab;
      const stored = localStorage.getItem("lux_admin_active_tab");
      if (stored && VALID_ADMIN_TABS.includes(stored)) return stored;
    }
    return "overview";
  });
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [adminToast, setAdminToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showAdminToast = (msg: string, ok: boolean = true) => {
    setAdminToast({ ok, msg });
    setTimeout(() => {
      setAdminToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4000);
  };

  const handleAdminLogout = async () => {
    // Bersihkan state tab dari localStorage agar tidak "bocor" ke sesi login berikutnya
    try {
      localStorage.removeItem("lux_admin_active_tab");
      localStorage.removeItem("lux_admin_settings_subtab");
    } catch {}
    signOut({ callbackUrl: "/admin/login" });
  };

  const rawRole = (session?.user as any)?.originalRole || (session?.user as any)?.role;
  const isUserAdmin = Boolean((session?.user as any)?.isAdmin);
  const userRole = rawRole === "CLIENT" && isUserAdmin ? "ADMIN" : (rawRole || "CLIENT");
  const userPermissionsKey = Array.isArray((session?.user as any)?.permissions)
    ? (session?.user as any).permissions.join(",")
    : "";
  const userPermissions = useMemo(() => {
    return userPermissionsKey ? userPermissionsKey.split(",") : [];
  }, [userPermissionsKey]);

  const filteredTabs = useMemo(() => {
    return tabs.filter(tab => {
      return hasAdminPermission(
        {
          role: userRole,
          isAdmin: isUserAdmin,
          permissions: userPermissions,
        },
        tab.id
      );
    });
  }, [userRole, userPermissions, isUserAdmin]);

  // Otomatis arahkan ke tab pertama yang sah jika tab aktif saat ini di luar izin role
  useEffect(() => {
    if (filteredTabs.length > 0 && !filteredTabs.some(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [filteredTabs, activeTab]);

  // Strict session enforcement
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
    } else if (status === "authenticated") {
      const isAdmin =
        (session?.user as any)?.isAdmin === true ||
        (session?.user as any)?.role === "ADMIN" ||
        (session?.user as any)?.role === "SUPER_ADMIN" ||
        (session?.user as any)?.role === "FINANCE" ||
        (session?.user as any)?.role === "SUPPORT";
      if (!isAdmin) {
        router.replace("/admin/login");
      }
    }
  }, [status, session, router]);

  // Data state
  const [stats, setStats] = useState<any>({ invitationCount: 0, orderCount: 0, guestCount: 0, userCount: 0, publishedInvitationCount: 0, draftInvitationCount: 0, rsvpCount: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [customDomainOrders, setCustomDomainOrders] = useState<any[]>([]);

  // Settings state
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");
  const [initialSettingsMap, setInitialSettingsMap] = useState<Record<string, string>>({});
  const [editSection, setEditSection] = useState<Record<string, boolean>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingAddons, setSavingAddons] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingPlatformCustom, setSavingPlatformCustom] = useState(false);
  const [savingServiceStatus, setSavingServiceStatus] = useState(false);
  const [savingSubdomainSettings, setSavingSubdomainSettings] = useState(false);

  const [savingActiveGateway, setSavingActiveGateway] = useState(false);
  const [savingMidtrans, setSavingMidtrans] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingDomainDns, setSavingDomainDns] = useState(false);
  const [savingMemoriesMilestones, setSavingMemoriesMilestones] = useState(false);
  const [detectingServerIp, setDetectingServerIp] = useState(false);
  const [detectIpResult, setDetectIpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"akun" | "keuangan" | "paket" | "integrasi" | "operasional" | "tentang">(() => {
    // Pemetaan alias lama ke ID tab baru (untuk backward-compat URL/localStorage)
    const LEGACY_SUB_MAP: Record<string, "akun" | "keuangan" | "paket" | "integrasi" | "operasional" | "tentang"> = {
      pembayaran: "keuangan",
      gateway: "keuangan",
      setup: "integrasi",
      platform: "operasional",
    };
    const normalize = (val: string): "akun" | "keuangan" | "paket" | "integrasi" | "operasional" | "tentang" | null => {
      const NEW_VALID = ["akun", "keuangan", "paket", "integrasi", "operasional", "tentang"] as const;
      if (NEW_VALID.includes(val as any)) return val as any;
      return LEGACY_SUB_MAP[val] ?? null;
    };
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSub = params.get("sub");
      if (urlSub) { const n = normalize(urlSub); if (n) return n; }
      const stored = localStorage.getItem("lux_admin_settings_subtab");
      if (stored) { const n = normalize(stored); if (n) return n; }
    }
    return "akun";
  });


  // Sinkronisasi Tab Utama & Sub-Tab Pengaturan ke URL (?tab=...&sub=...) dan localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem("lux_admin_active_tab", activeTab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);

      if (activeTab === "settings") {
        localStorage.setItem("lux_admin_settings_subtab", activeSettingsTab);
        params.set("sub", activeSettingsTab);
      } else {
        params.delete("sub");
      }

      const newSearch = `?${params.toString()}`;
      if (window.location.search !== newSearch) {
        const newUrl = `${window.location.pathname}${newSearch}`;
        window.history.replaceState(null, "", newUrl);
      }
    } catch {}
  }, [activeTab, activeSettingsTab]);

  // Dukungan tombol navigasi Back / Forward browser
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      const urlSub = params.get("sub");

      if (urlTab && VALID_ADMIN_TABS.includes(urlTab)) {
        setActiveTab(urlTab);
      }
      if (urlSub && VALID_SETTINGS_SUBS.includes(urlSub as any)) {
        setActiveSettingsTab(urlSub as any);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testSmtpEmail, setTestSmtpEmail] = useState("");
  const [testSmtpResult, setTestSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestSmtp = async () => {
    // Kosong = server mengirim ke email admin yang bertindak (session.user.email di mode remote milik klien).
    const target = testSmtpEmail.trim();
    if (target && !target.includes("@")) {
      setTestSmtpResult({ success: false, message: "Masukkan alamat email penerima yang valid." });
      return;
    }
    setTestingSmtp(true);
    setTestSmtpResult(null);
    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: target }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestSmtpResult({ success: true, message: data.message });
      } else {
        setTestSmtpResult({ success: false, message: data.error || "Gagal melakukan handshake SMTP." });
      }
    } catch (err: any) {
      setTestSmtpResult({ success: false, message: err.message || "Kesalahan jaringan saat menghubungi server." });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleDetectServerIp = async () => {
    setDetectingServerIp(true);
    setDetectIpResult(null);
    try {
      const res = await fetch("/api/admin/server-ip");
      const data = await res.json();
      if (data.success && data.ip) {
        setSetting("server_public_ip", data.ip);
        setDetectIpResult({ success: true, message: `IP Publik berhasil dideteksi: ${data.ip}` });
      } else {
        setDetectIpResult({ success: false, message: data.message || "Gagal mendeteksi IP server publik." });
      }
    } catch (err: any) {
      setDetectIpResult({ success: false, message: err?.message || "Koneksi ke detektor IP gagal." });
    } finally {
      setDetectingServerIp(false);
    }
  };

  const [recyclingSubdomains, setRecyclingSubdomains] = useState(false);
  const [recycleResult, setRecycleResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState<Record<string, boolean>>({});

  const handleManualRecycleSubdomains = async () => {
    setRecyclingSubdomains(true);
    setRecycleResult(null);
    try {
      const res = await fetch("/api/admin/subdomains/recycle", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRecycleResult({
          success: true,
          message: data.message || `Berhasil melepas ${data.releasedCount || 0} subdomain kedaluwarsa ke pool.`,
        });
      } else {
        throw new Error(data.error || "Gagal melakukan daur ulang.");
      }
    } catch (err: any) {
      setRecycleResult({
        success: false,
        message: err?.message || "Terjadi kesalahan saat mendaur ulang subdomain.",
      });
    } finally {
      setRecyclingSubdomains(false);
    }
  };

  // Branding Upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);         // URL tersimpan di server
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);   // URL tersimpan di server
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);   // File dipilih, belum disimpan
  const [pendingFavicon, setPendingFavicon] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null); // URL.createObjectURL untuk preview
  const [previewFavicon, setPreviewFavicon] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [brandUploadMsg, setBrandUploadMsg] = useState<{ type: "logo" | "favicon"; ok: boolean; msg: string } | null>(null);

  // Database Backup state
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState<string | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<string | null>(null);
  const [showUploadSnapshot, setShowUploadSnapshot] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [uploadingRestoreFile, setUploadingRestoreFile] = useState(false);
  const [savingBackupSettings, setSavingBackupSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [backupActionMsg, setBackupActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [backupPathInfo, setBackupPathInfo] = useState<{
    configuredPath: string;
    resolvedPath: string;
    isRelative: boolean;
    isValid: boolean;
    isWritable: boolean;
    isFallback: boolean;
    fallbackPath: string;
    error?: string;
    fixCommand?: string;
    locationType: "PROJECT_INTERNAL" | "EXTERNAL_MOUNT" | "CUSTOM_PATH";
  } | null>(null);
  const [testingBackupPath, setTestingBackupPath] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const testCurrentBackupPath = async (pathToTest?: string) => {
    setTestingBackupPath(true);
    try {
      const p = pathToTest !== undefined ? pathToTest : (settingsMap["backup_path"] || "./data/backups");
      const res = await fetch("/api/admin/database/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_path", testPath: p }),
      });
      const data = await res.json();
      if (data.pathInfo) {
        setBackupPathInfo(data.pathInfo);
      }
    } catch {
      // ignore
    } finally {
      setTestingBackupPath(false);
    }
  };

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/themes", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.themes)) {
        setThemes(data.themes);
      } else {
        console.error("[Admin Themes Error]:", data.error);
      }
    } catch (e: any) {
      console.error("[Admin Themes Fetch Failed]:", e);
    } finally {
      setInitialLoaded(true);
      // loadThemes adalah primary loader untuk tab themes — boleh set loading false
      setLoading(false);
    }
  }, []);

  const loadOverviewData = useCallback((isBackground = false) => {
    if (!isBackground) setLoading(true);
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          console.warn(`[Admin Overview ${res.status}]:`, data?.error || "Gagal memuat data overview");
          return null;
        }
        return data;
      })
      .then((data) => {
        if (data && data.success) {
          setStats(data.stats || {});
          setOrders(data.orders || []);
          setAllOrders(data.allOrders || []);
          setInvitations(data.invitations || []);
          if (Array.isArray(data.themes) && data.themes.length > 0) {
            setThemes(data.themes);
          } else {
            // Fallback: overview tidak mengembalikan themes (gagal partial)
            // Ambil dari endpoint khusus agar katalog tema tetap tampil
            fetch("/api/admin/themes", { cache: "no-store" })
              .then((r) => r.json())
              .then((td) => {
                if (td.success && Array.isArray(td.themes) && td.themes.length > 0) {
                  setThemes(td.themes);
                }
              })
              .catch(() => {}); // Non-fatal: fallback themes tidak kritikal
          }
          setLogs(data.logs || []);
          setCustomDomainOrders(data.customDomainOrders || []);
        }
        setInitialLoaded(true);
        if (!isBackground) setLoading(false);
      })
      .catch((err) => {
        console.warn("[Admin Overview Network Error]:", err);
        setInitialLoaded(true);
        if (!isBackground) setLoading(false);
      });
  }, []);

  const loadSettings = useCallback(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const map: Record<string, string> = {};
          (data.settings || []).forEach((s: any) => { map[s.key] = s.value; });
          setSettingsMap(map);
          setInitialSettingsMap(map);
        }
      })
      .catch((e) => {
        // Settings adalah data sekunder — error tidak boleh crash UI,
        // tapi HARUS dicatat agar admin tahu ada masalah koneksi DB/API
        console.error("[Admin Settings Error]:", e);
      })
      .finally(() => {
        // Settings adalah data background — tidak mengontrol loading state primer.
        // loading state dikontrol sepenuhnya oleh loadOverviewData / loadThemes.
        setSettingsLoaded(true);
      });
  }, []);

  const loadBrandAssets = useCallback(() => {
    fetch("/api/admin/upload-brand")
      .then((r) => r.json())
      .then((data) => {
        if (data.logo) setLogoUrl(data.logo + "?t=" + Date.now());
        if (data.favicon) setFaviconUrl(data.favicon + "?t=" + Date.now());
      })
      .catch(() => {});
  }, []);

  const uploadBrandAsset = async (type: "logo" | "favicon") => {
    const file = type === "logo" ? pendingLogo : pendingFavicon;
    if (!file) return;
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    setBrandUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-brand", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        if (type === "logo") {
          setLogoUrl(data.url);
          setPendingLogo(null);
          setPreviewLogo(null);
        } else {
          setFaviconUrl(data.url);
          setPendingFavicon(null);
          setPreviewFavicon(null);
        }
        setBrandUploadMsg({ type, ok: true, msg: data.message });
      } else {
        setBrandUploadMsg({ type, ok: false, msg: data.error || "Upload gagal" });
      }
    } catch (err: any) {
      setBrandUploadMsg({ type, ok: false, msg: err.message || "Upload gagal" });
    } finally {
      setUploading(false);
    }
  };

  const loadSnapshots = useCallback(() => {
    setLoadingSnapshots(true);
    fetch("/api/admin/database/backup")
      .then(async (r) => {
        const data = await r.json();
        if (data.success) {
          setSnapshots(data.snapshots || []);
          if (data.pathInfo) {
            setBackupPathInfo(data.pathInfo);
          }
        } else if (r.status !== 401 && r.status !== 403) {
          // 401/403 wajar untuk staf tanpa modul database; galat lain jangan tampil sebagai "belum ada backup".
          feedback.notify(data.error || "Gagal memuat daftar snapshot database", "error");
        }
      })
      .catch(() => feedback.notify("Gagal memuat daftar snapshot database", "error"))
      .finally(() => {
        setLoadingSnapshots(false);
        setInitialLoaded(true);
        setLoading(false);
      });
  }, [feedback]);

  const handleCreateSnapshot = async () => {
    setCreatingSnapshot(true);
    setBackupActionMsg(null);
    try {
      const res = await fetch("/api/admin/database/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "manual" }),
      });
      const data = await res.json();
      if (data.success) {
        setBackupActionMsg({ ok: true, msg: data.message });
        loadSnapshots();
      } else {
        setBackupActionMsg({ ok: false, msg: data.error || "Gagal membuat snapshot" });
      }
    } catch (err: any) {
      setBackupActionMsg({ ok: false, msg: err.message || "Gagal membuat snapshot" });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    setRestoringSnapshot(filename);
    setBackupActionMsg(null);
    try {
      const res = await fetch("/api/admin/database/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (data.success) {
        setBackupActionMsg({
          ok: true,
          msg: `${data.message} (Safety backup tersimpan: ${data.safetyBackup})`,
        });
        loadSnapshots();
        loadOverviewData();
      } else {
        setBackupActionMsg({ ok: false, msg: data.error || "Gagal restore database" });
      }
    } catch (err: any) {
      setBackupActionMsg({ ok: false, msg: err.message || "Gagal restore database" });
    } finally {
      setRestoringSnapshot(null);
    }
  };

  const handleUploadAndRestore = async () => {
    if (!pendingRestoreFile) return;
    setUploadingRestoreFile(true);
    setBackupActionMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", pendingRestoreFile);
      const res = await fetch("/api/admin/database/restore", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setBackupActionMsg({
          ok: true,
          msg: `${data.message} (Safety backup otomatis: ${data.safetyBackup})`,
        });
        setPendingRestoreFile(null);
        setShowUploadSnapshot(false);
        loadSnapshots();
        loadOverviewData();
      } else {
        setBackupActionMsg({ ok: false, msg: data.error || "Gagal restore file upload" });
      }
    } catch (err: any) {
      setBackupActionMsg({ ok: false, msg: err.message || "Gagal restore file upload" });
    } finally {
      setUploadingRestoreFile(false);
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    setDeletingSnapshot(filename);
    setBackupActionMsg(null);
    try {
      const res = await fetch(`/api/admin/database/backup?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setBackupActionMsg({ ok: true, msg: data.message });
        loadSnapshots();
      } else {
        setBackupActionMsg({ ok: false, msg: data.error || "Gagal menghapus snapshot" });
      }
    } catch (err: any) {
      setBackupActionMsg({ ok: false, msg: err.message || "Gagal menghapus snapshot" });
    } finally {
      setDeletingSnapshot(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const platformName = settingsMap["platform_name"];
  useEffect(() => {
    const brand = platformName || "Sistem Undangan";
    document.title = `${brand} Admin — Control Panel`;
  }, [platformName]);


  // Inisialisasi esensial: Pengaturan brand & logo (ringan, ~50ms)
  useEffect(() => {
    loadSettings();
    loadBrandAssets();
  }, [loadSettings, loadBrandAssets]);

  // Pemuatan On-Demand / Lazy Load per Tab:
  // Grup "overview" = tab yang bergantung pada data dari /api/admin/overview
  // Grup "themes"  = fetch mandiri ke /api/admin/themes
  // Tab orders, invitations, users = komponen self-contained (fetch mandiri mereka sendiri)
  // custom_domains & logs menggunakan state dari overview (customDomainOrders, logs),
  // sehingga tetap perlu trigger loadOverviewData saat tab aktif.
  useEffect(() => {
    if (
      activeTab === "overview" ||
      activeTab === "users" ||
      activeTab === "logs" ||
      activeTab === "custom_domains"
    ) {
      loadOverviewData();
    } else if (activeTab === "themes") {
      loadThemes();
    } else if (activeTab === "database") {
      loadSnapshots();
    } else {
      // Tab mandiri (settings, orders, invitations, portfolio, marketing, finance, team):
      // Lifecycle data dikelola mandiri oleh masing-masing tab, maka loading primer langsung selesai.
      setInitialLoaded(true);
      setLoading(false);
    }
  }, [activeTab, loadOverviewData, loadThemes, loadSnapshots]);


  const setSetting = (key: string, value: string) => {
    setSettingsMap((prev) => ({ ...prev, [key]: value }));
  };

  const getCaps = (key: string) => {
    try {
      return JSON.parse(settingsMap[key] || "[]");
    } catch {
      return [];
    }
  };

  const toggleCap = (key: string, capId: string) => {
    const current = getCaps(key);
    if (current.includes(capId)) {
      setSetting(key, JSON.stringify(current.filter((c: string) => c !== capId)));
    } else {
      setSetting(key, JSON.stringify([...current, capId]));
    }
  };


  const toggleEditSection = (section: string) => {
    setEditSection((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const cancelEdit = (section: string, keys: string[]) => {
    setSettingsMap((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = initialSettingsMap[k] !== undefined ? initialSettingsMap[k] : (prev[k] || "");
      });
      return next;
    });
    setEditSection((prev) => ({ ...prev, [section]: false }));
  };

  const isSectionDirty = (keys: string[]) => {
    return keys.some((k) => (settingsMap[k] || "") !== (initialSettingsMap[k] || ""));
  };

  const saveSettings = async (keys: string[], savingFn: (v: boolean) => void, group: string) => {
    savingFn(true);
    try {
      const updates = keys.map((key) => ({ key, value: settingsMap[key] || "", group }));
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setInitialSettingsMap((prev) => {
          const next = { ...prev };
          keys.forEach((k) => { next[k] = settingsMap[k] || ""; });
          return next;
        });
        setEditSection((prev) => ({ ...prev, [group]: false }));
        setSettingsSaved((p) => ({ ...p, [group]: true }));
        if (group === "backup") {
          loadSnapshots();
        }
        setTimeout(() => setSettingsSaved((p) => ({ ...p, [group]: false })), 4000);
      } else {
        const data = await res.json().catch(() => null);
        showAdminToast(data?.error || `Pengaturan gagal disimpan (HTTP ${res.status}).`, false);
      }
    } catch {
      showAdminToast("Koneksi terputus. Pengaturan belum tersimpan.", false);
    } finally {
      savingFn(false);
    }
  };

  if (
    status === "unauthenticated" ||
    (status === "authenticated" &&
      !(
        (session?.user as any)?.isAdmin === true ||
        (session?.user as any)?.role === "ADMIN" ||
        (session?.user as any)?.role === "SUPER_ADMIN"
      ))
  ) {
    return null;
  }

  if (status === "loading" || !settingsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-gray-500">Memuat Panel Administrasi...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Remote Mode Warning Banner for Admin */}
      {Boolean((session?.user as any)?.isRemote) && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-xs sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Mode Remote Sedang Aktif:</strong> Anda sedang mengemulasikan akun klien{" "}
              <strong>{(session?.user as any)?.name || "Klien"}</strong> ({(session?.user as any)?.email}). Fitur Administrator tetap terbuka penuh.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await fetch("/api/admin/remote-session", { method: "DELETE" });
              } catch (err) {
                console.warn("Gagal menghapus remote session:", err);
              }
              // SessionProvider di root layout menyimpan sesi lama; tanpa ini banner tetap tampil sampai halaman dimuat ulang.
              await updateSession();
              router.push("/admin");
              router.refresh();
            }}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition cursor-pointer shadow-2xs shrink-0"
          >
            Hentikan Sesi Remote
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile Toggle + Brand */}
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -ml-1.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
                aria-label="Toggle Menu Panel"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              <BrandLogo size="sm" lightBg brandName={settingsMap["platform_name"]} />
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-none truncate max-w-[160px] sm:max-w-none">
                  {settingsMap["platform_name"] ? `${settingsMap["platform_name"]} Admin` : "Admin"}
                </h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Control Panel</p>
              </div>
            </div>

            {/* Right Header Navigation & Logout */}
            <div className="flex items-center gap-3 sm:gap-4">
              <a href="/demo" target="_blank" className="text-xs font-medium text-amber-700 hover:underline hidden sm:inline-block">
                Lihat Demo
              </a>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer Sidebar & Backdrop Overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <aside className="relative z-50 w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrandLogo size="xs" lightBg brandName={settingsMap["platform_name"]} />
                  <span className="text-xs font-bold text-gray-900 truncate">Menu Navigasi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="py-3 px-3 space-y-1">
                {filteredTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-amber-50 text-amber-900 border border-amber-200/80 font-bold shadow-2xs"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="shrink-0">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile Footer Logout */}
            <div className="p-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 pb-2 border-b border-gray-100">
                <a href="/demo" target="_blank" className="hover:text-amber-700">Lihat Demo</a>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1 min-w-0 w-full">
        {/* Desktop Sidebar — Hidden di Mobile, Sticky & Fixed di Layar Besar */}
        <aside className="hidden md:flex w-60 bg-white border-r border-gray-200 shadow-2xs shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto">
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-amber-50 text-amber-900 border border-amber-200/80 font-bold shadow-2xs"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer Sidebar Logout */}
          <div className="p-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleAdminLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/70 transition cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full relative">
          {loading && initialLoaded && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 animate-pulse z-20 pointer-events-none" />
          )}
          {loading && !initialLoaded ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <>
              {/* ── Overview / Dashboard Utama ── */}
              {activeTab === "overview" && (
                <AdminOverviewTab
                  settingsMap={settingsMap}
                  stats={stats}
                  orders={orders}
                  allOrders={allOrders}
                  invitations={invitations}
                  themes={themes}
                  logs={logs}
                  snapshots={snapshots}
                  backupPathInfo={backupPathInfo}
                  loading={loading}
                  creatingSnapshot={creatingSnapshot}
                  onRefresh={() => loadOverviewData()}
                  onCreateSnapshot={handleCreateSnapshot}
                  onSelectTab={setActiveTab}
                />
              )}

              {/* ── Orders ── */}
              {activeTab === "orders" && (
                <AdminOrdersTab />
              )}

              {/* ── Users / Klien ── */}
              {activeTab === "users" && (
                <AdminClientsTab platformName={settingsMap["platform_name"]} />
              )}

              {/* ── Invitations / Projek Undangan ── */}
              {activeTab === "invitations" && (
                <AdminInvitationsTab />
              )}

              {/* ── Custom Domain Management ── */}
              {activeTab === "custom_domains" && (
                <AdminCustomDomainsTab
                  orders={customDomainOrders}
                  onRefresh={() => loadOverviewData()}
                  onNavigateToSetup={() => {
                    setActiveTab("settings");
                    setActiveSettingsTab("integrasi");
                  }}
                />
              )}

              {/* ── Themes Management ── */}
              {activeTab === "themes" && (
                <AdminThemesTab
                  themes={themes}
                  setThemes={setThemes}
                  platformName={settingsMap["platform_name"]}
                  showAdminToast={showAdminToast}
                  onSyncSuccess={() => loadOverviewData()}
                />
              )}

              {activeTab === "portfolio" && (
                <AdminPortfolioTab />
              )}

              {/* ── Team & Access ── */}
              {activeTab === "team" && (
                <div className="max-w-5xl w-full">
                  <AdminTeamManagement />
                </div>
              )}

              {/* ── Pemasaran & Afiliasi ── */}
              {activeTab === "marketing" && (
                <div className="w-full">
                  <AdminMarketingTab />
                </div>
              )}

              {/* ── Finance & Keuangan Terpusat ── */}
              {activeTab === "finance" && (
                <div className="w-full">
                  <AdminFinanceTab />
                </div>
              )}

              {/* ── Settings ── */}
              {activeTab === "settings" && (
                <AdminSettingsTab
                  session={session}
                  settingsMap={settingsMap}
                  editSection={editSection}
                  settingsSaved={settingsSaved}
                  activeSettingsTab={activeSettingsTab}
                  setActiveSettingsTab={setActiveSettingsTab}
                  currentOrigin={currentOrigin}
                  savingPricing={savingPricing}
                  setSavingPricing={setSavingPricing}
                  savingAddons={savingAddons}
                  setSavingAddons={setSavingAddons}
                  savingPlatform={savingPlatform}
                  setSavingPlatform={setSavingPlatform}
                  savingPlatformCustom={savingPlatformCustom}
                  setSavingPlatformCustom={setSavingPlatformCustom}
                  savingServiceStatus={savingServiceStatus}
                  setSavingServiceStatus={setSavingServiceStatus}
                  savingSubdomainSettings={savingSubdomainSettings}
                  setSavingSubdomainSettings={setSavingSubdomainSettings}
                  savingActiveGateway={savingActiveGateway}
                  setSavingActiveGateway={setSavingActiveGateway}
                  savingMidtrans={savingMidtrans}
                  setSavingMidtrans={setSavingMidtrans}
                  savingSmtp={savingSmtp}
                  setSavingSmtp={setSavingSmtp}
                  savingDomainDns={savingDomainDns}
                  setSavingDomainDns={setSavingDomainDns}
                  savingMemoriesMilestones={savingMemoriesMilestones}
                  setSavingMemoriesMilestones={setSavingMemoriesMilestones}
                  savingPaymentSettings={savingPaymentSettings}
                  setSavingPaymentSettings={setSavingPaymentSettings}
                  testingSmtp={testingSmtp}
                  testSmtpEmail={testSmtpEmail}
                  setTestSmtpEmail={setTestSmtpEmail}
                  testSmtpResult={testSmtpResult}
                  setTestSmtpResult={setTestSmtpResult}
                  detectingServerIp={detectingServerIp}
                  detectIpResult={detectIpResult}
                  recyclingSubdomains={recyclingSubdomains}
                  recycleResult={recycleResult}
                  logoUrl={logoUrl}
                  faviconUrl={faviconUrl}
                  pendingLogo={pendingLogo}
                  setPendingLogo={setPendingLogo}
                  pendingFavicon={pendingFavicon}
                  setPendingFavicon={setPendingFavicon}
                  previewLogo={previewLogo}
                  setPreviewLogo={setPreviewLogo}
                  previewFavicon={previewFavicon}
                  setPreviewFavicon={setPreviewFavicon}
                  uploadingLogo={uploadingLogo}
                  uploadingFavicon={uploadingFavicon}
                  brandUploadMsg={brandUploadMsg}
                  setBrandUploadMsg={setBrandUploadMsg}
                  setSetting={setSetting}
                  getCaps={getCaps}
                  toggleCap={toggleCap}
                  toggleEditSection={toggleEditSection}
                  cancelEdit={cancelEdit}
                  isSectionDirty={isSectionDirty}
                  saveSettings={saveSettings}
                  uploadBrandAsset={uploadBrandAsset}
                  handleTestSmtp={handleTestSmtp}
                  handleDetectServerIp={handleDetectServerIp}
                  handleManualRecycleSubdomains={handleManualRecycleSubdomains}
                />
              )}

              {/* ── Database & Backup ── */}
              {activeTab === "database" && (
                <AdminDatabaseTab
                  snapshots={snapshots}
                  loadingSnapshots={loadingSnapshots}
                  creatingSnapshot={creatingSnapshot}
                  restoringSnapshot={restoringSnapshot}
                  deletingSnapshot={deletingSnapshot}
                  showUploadSnapshot={showUploadSnapshot}
                  pendingRestoreFile={pendingRestoreFile}
                  uploadingRestoreFile={uploadingRestoreFile}
                  savingBackupSettings={savingBackupSettings}
                  backupActionMsg={backupActionMsg}
                  backupPathInfo={backupPathInfo}
                  testingBackupPath={testingBackupPath}
                  copiedCommand={copiedCommand}
                  settingsMap={settingsMap}
                  editSection={editSection}
                  settingsSaved={settingsSaved}
                  setShowUploadSnapshot={setShowUploadSnapshot}
                  setPendingRestoreFile={setPendingRestoreFile}
                  setCopiedCommand={setCopiedCommand}
                  setBackupActionMsg={setBackupActionMsg}
                  setSetting={setSetting}
                  handleCreateSnapshot={handleCreateSnapshot}
                  handleRestoreSnapshot={handleRestoreSnapshot}
                  handleUploadAndRestore={handleUploadAndRestore}
                  handleDeleteSnapshot={handleDeleteSnapshot}
                  loadSnapshots={loadSnapshots}
                  testCurrentBackupPath={testCurrentBackupPath}
                  toggleEditSection={toggleEditSection}
                  cancelEdit={cancelEdit}
                  isSectionDirty={isSectionDirty}
                  saveSettings={saveSettings}
                  setSavingBackupSettings={setSavingBackupSettings}
                />
              )}

              {/* ── Logs & Monitoring ── */}
              {activeTab === "logs" && (
                <AdminMonitoringTab />
              )}

              {/* ── Remote MCP Server & AI Access ── */}
              {activeTab === "mcp" && (
                <AdminMcpTab onToast={showAdminToast} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Admin Toast Notification */}
      {adminToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-md max-w-md animate-in slide-in-from-bottom-3 duration-200"
          style={{ borderColor: adminToast.ok ? "#a7f3d0" : "#fecdd3" }}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${adminToast.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span className="text-xs font-semibold text-stone-800 leading-snug">{adminToast.msg}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer shrink-0 ml-1"
            title="Tutup pesan"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
