"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getApexRootDomain, getInvitationPublicUrl } from "@/lib/domainUtils";
import { BrandLogo } from "@/components/BrandLogo";

import { AdminProfileSettings } from "@/components/admin/AdminProfileSettings";
import { AdminTeamManagement } from "@/components/admin/AdminTeamManagement";
import { AdminCashflowTab as AdminFinanceTab } from "@/components/admin/AdminCashflowTab";
import { AdminMarketingTab } from "@/components/admin/AdminMarketingTab";
import { AdminPortfolioTab } from "@/components/admin/AdminPortfolioTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminClientsTab from "@/components/admin/AdminClientsTab";
import AdminInvitationsTab from "@/components/admin/AdminInvitationsTab";
import AdminCustomDomainsTab from "@/components/admin/AdminCustomDomainsTab";
import AdminMonitoringTab from "@/components/admin/AdminMonitoringTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminDatabaseTab from "@/components/admin/AdminDatabaseTab";
import { startRemoteSession } from "./actions/remote";
import { compressImageToWebP } from "@/lib/clientImageCompressor";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { resolveInvitationDisplayName, buildCanonicalPath } from "@/lib/invitationUtils";
import { hasAdminPermission } from "@/lib/adminPermissions";

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

const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    FAILED: "bg-rose-50 text-rose-700 border border-rose-200",
    EXPIRED: "bg-gray-100 text-gray-600 border border-gray-200",
    PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    EVENT_FINISHED: "bg-purple-50 text-purple-700 border border-purple-200",
    DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
    TAKEN_DOWN: "bg-rose-50 text-rose-700 border border-rose-200",
    ARCHIVED: "bg-stone-100 text-stone-600 border border-stone-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "EVENT_FINISHED" ? "Galeri Momen" : status}
    </span>
  );
};

function getInvitationEventDate(eventData: any): Date | null {
  try {
    const events = typeof eventData === "string" ? JSON.parse(eventData) : eventData || [];
    if (!Array.isArray(events)) return null;
    let latest: Date | null = null;
    for (const ev of events) {
      if (ev?.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          if (!latest || d > latest) latest = d;
        }
      }
    }
    return latest;
  } catch {
    return null;
  }
}



const VALID_ADMIN_TABS = [
  "overview",
  "orders",
  "users",
  "invitations",
  "portfolio",
  "custom_domains",
  "themes",
  "marketing",
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
  // Legacy aliases — redirect lama ke baru via URL restore logic
  "pembayaran",
  "gateway",
  "setup",
  "platform",
];

export default function AdminPage() {
  const { data: session, status } = useSession();
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
  const [manageClient, setManageClient] = useState<any | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [clientActionMsg, setClientActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [impersonatingClient, setImpersonatingClient] = useState(false);
  const [adminToast, setAdminToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showAdminToast = (msg: string, ok: boolean = true) => {
    setAdminToast({ ok, msg });
    setTimeout(() => {
      setAdminToast((prev) => (prev?.msg === msg ? null : prev));
    }, 4000);
  };

  const handleImpersonateClient = async (clientId: string, clientEmail: string, clientName: string) => {
    try {
      setImpersonatingClient(true);
      setClientActionMsg(null);
      // Server Action: menetapkan cookie httpOnly lalu redirect ke /dashboard
      // Ini berjalan di server → cookie ditulis sebelum redirect → middleware pasti membacanya
      await startRemoteSession(clientId);
    } catch (err: any) {
      console.error(err);
      setClientActionMsg({ ok: false, msg: err.message || "Gagal memulai sesi remote klien" });
      setImpersonatingClient(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/remote-session", { method: "DELETE" });
    } catch {}
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
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationFilter, setInvitationFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "EVENT_FINISHED" | "ARCHIVED">("ALL");

  const draftInvitationCount = useMemo(() => invitations.filter((i) => i.status === "DRAFT").length, [invitations]);
  const publishedInvitationCount = useMemo(() => invitations.filter((i) => i.status === "PUBLISHED").length, [invitations]);
  const eventFinishedInvitationCount = useMemo(() => invitations.filter((i) => i.status === "EVENT_FINISHED").length, [invitations]);
  const archivedInvitationCount = useMemo(() => invitations.filter((i) => i.status === "ARCHIVED" || i.status === "TAKEN_DOWN").length, [invitations]);

  const filteredInvitations = useMemo(() => {
    if (invitationFilter === "ALL") return invitations;
    if (invitationFilter === "DRAFT") return invitations.filter((i) => i.status === "DRAFT");
    if (invitationFilter === "PUBLISHED") return invitations.filter((i) => i.status === "PUBLISHED");
    if (invitationFilter === "EVENT_FINISHED") return invitations.filter((i) => i.status === "EVENT_FINISHED");
    if (invitationFilter === "ARCHIVED") return invitations.filter((i) => i.status === "ARCHIVED" || i.status === "TAKEN_DOWN");
    return invitations;
  }, [invitations, invitationFilter]);
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
  const [savingXendit, setSavingXendit] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingDomainDns, setSavingDomainDns] = useState(false);
  const [savingMemoriesMilestones, setSavingMemoriesMilestones] = useState(false);
  const [detectingServerIp, setDetectingServerIp] = useState(false);
  const [detectIpResult, setDetectIpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"akun" | "keuangan" | "paket" | "integrasi" | "operasional">(() => {
    // Pemetaan alias lama ke ID tab baru (untuk backward-compat URL/localStorage)
    const LEGACY_SUB_MAP: Record<string, "akun" | "keuangan" | "paket" | "integrasi" | "operasional"> = {
      pembayaran: "keuangan",
      gateway: "keuangan",
      setup: "integrasi",
      platform: "operasional",
    };
    const normalize = (val: string): "akun" | "keuangan" | "paket" | "integrasi" | "operasional" | null => {
      const NEW_VALID = ["akun", "keuangan", "paket", "integrasi", "operasional"] as const;
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
  const [selectedGatewayVendor, setSelectedGatewayVendor] = useState<"midtrans" | "xendit">("midtrans");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testSmtpEmail, setTestSmtpEmail] = useState("");
  const [testSmtpResult, setTestSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestSmtp = async () => {
    const target = testSmtpEmail.trim() || session?.user?.email || "";
    if (!target || !target.includes("@")) {
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

  // Order Proof Verification & Reject Modal State
  const [previewProofOrder, setPreviewProofOrder] = useState<any | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<any | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>("");
  const [processingOrderAction, setProcessingOrderAction] = useState(false);
  const [confirmApproveOrderId, setConfirmApproveOrderId] = useState<string | null>(null);
  const [orderActionFeedback, setOrderActionFeedback] = useState<{ id: string; type: "success" | "error"; msg: string } | null>(null);

  // Auto-revert inline confirmation jika tidak diklik dalam 5 detik
  useEffect(() => {
    if (!confirmApproveOrderId) return;
    const t = setTimeout(() => {
      setConfirmApproveOrderId(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [confirmApproveOrderId]);

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme Management Modal / Form State
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any | null>(null);
  const [themeForm, setThemeForm] = useState({
    id: "",
    name: "",
    eventType: "WEDDING",
    category: "minimalist",
    series: "Minimalist",
    description: "",
    sortOrder: 1,
    isActive: true,
    isPremium: true,
    defaultMusicUrl: "",
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSyncing, setThemeSyncing] = useState(false);
  const [themeSyncResult, setThemeSyncResult] = useState<any>(null);

  // Auto-dismiss banner sinkronisasi tema setelah 4.5 detik
  useEffect(() => {
    if (!themeSyncResult) return;
    const timer = setTimeout(() => {
      setThemeSyncResult(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [themeSyncResult]);

  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>("all");
  const [themeEventTypeFilter, setThemeEventTypeFilter] = useState<string>("all");
  const [themeSearch, setThemeSearch] = useState<string>("");
  const [themeFile, setThemeFile] = useState<File | null>(null);

  // Theme Demo Studio State
  const [showDemoStudioModal, setShowDemoStudioModal] = useState(false);
  const [demoStudioTheme, setDemoStudioTheme] = useState<any | null>(null);
  const [demoStudioTab, setDemoStudioTab] = useState<"visual" | "profile" | "stories" | "narratives" | "vendors">("visual");
  const [demoStudioData, setDemoStudioData] = useState<any>({});
  const [initialDemoStudioData, setInitialDemoStudioData] = useState<any>({});
  const [stagedDemoFiles, setStagedDemoFiles] = useState<Record<string, File>>({});
  const [stagedDeletedSlots, setStagedDeletedSlots] = useState<Record<string, boolean>>({});
  const [demoStudioLoading, setDemoStudioLoading] = useState(false);
  const [demoStudioSaving, setDemoStudioSaving] = useState(false);
  const [demoStudioUploadSuccess, setDemoStudioUploadSuccess] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [updatedDemoSlots, setUpdatedDemoSlots] = useState<Record<string, number>>({});
  const [demoStudioSessionTime, setDemoStudioSessionTime] = useState<number>(Date.now());
  const currentDemoBlueprint = useMemo(() => {
    return demoStudioTheme ? getThemeBlueprint(demoStudioTheme.id, demoStudioData) : null;
  }, [demoStudioTheme, demoStudioData]);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  // System Music Library State
  const [themeSubTab, setThemeSubTab] = useState<"themes" | "music">("themes");
  const [systemMusics, setSystemMusics] = useState<any[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [editingMusic, setEditingMusic] = useState<any | null>(null);
  const [musicForm, setMusicForm] = useState({
    title: "",
    composer: "",
    genre: "",
  });
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const [musicAudioInstance, setMusicAudioInstance] = useState<HTMLAudioElement | null>(null);

  const isDemoStudioDirty = useMemo(() => {
    const hasStagedFiles = Object.keys(stagedDemoFiles).length > 0;
    const hasDeletedSlots = Object.keys(stagedDeletedSlots).length > 0;
    const hasDataChanges = JSON.stringify(demoStudioData) !== JSON.stringify(initialDemoStudioData);
    return hasStagedFiles || hasDeletedSlots || hasDataChanges;
  }, [stagedDemoFiles, stagedDeletedSlots, demoStudioData, initialDemoStudioData]);

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
          setUsers(data.users || []);
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

  const handleDeleteClient = async (id: string) => {
    setDeletingClient(true);
    setClientActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setClientActionMsg({ ok: true, msg: data.message });
        setManageClient(null);
        loadOverviewData();
      } else {
        setClientActionMsg({ ok: false, msg: data.error || "Gagal menghapus klien." });
      }
    } catch (e: any) {
      setClientActionMsg({ ok: false, msg: e.message || "Gagal menghapus klien." });
    } finally {
      setDeletingClient(false);
    }
  };

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
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSnapshots(data.snapshots || []);
          if (data.pathInfo) {
            setBackupPathInfo(data.pathInfo);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingSnapshots(false);
        setInitialLoaded(true);
        setLoading(false);
      });
  }, []);

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

  const fetchSystemMusics = useCallback(async () => {
    setMusicLoading(true);
    try {
      const res = await fetch("/api/admin/music", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.music)) {
        setSystemMusics(data.music);
      }
    } catch (err) {
      console.error("Gagal mengambil data musik:", err);
    } finally {
      setMusicLoading(false);
    }
  }, []);

  const handleToggleMusicActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/music/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setSystemMusics((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: !currentActive } : m))
        );
        showAdminToast(currentActive ? "Musik dinonaktifkan" : "Musik diaktifkan", true);
      } else {
        showAdminToast(data.error || "Gagal mengubah status musik", false);
      }
    } catch (err) {
      showAdminToast("Terjadi kesalahan jaringan saat mengubah status musik.", false);
    }
  };

  const handleDeleteMusic = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (playingMusicId === id && musicAudioInstance) {
          musicAudioInstance.pause();
          setPlayingMusicId(null);
        }
        setSystemMusics((prev) => prev.filter((m) => m.id !== id));
        showAdminToast(`Lagu "${title}" berhasil dihapus`, true);
      } else {
        showAdminToast(data.error || "Gagal menghapus musik", false);
      }
    } catch (err) {
      showAdminToast("Terjadi kesalahan saat menghapus lagu.", false);
    }
  };

  const handlePlayPreviewMusic = (music: any) => {
    if (playingMusicId === music.id) {
      musicAudioInstance?.pause();
      setPlayingMusicId(null);
      return;
    }

    if (musicAudioInstance) {
      musicAudioInstance.pause();
    }

    const audio = new Audio(music.url);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingMusicId(null);
    setMusicAudioInstance(audio);
    setPlayingMusicId(music.id);
  };

  const handleOpenAddMusicModal = () => {
    setEditingMusic(null);
    setMusicForm({
      title: "",
      composer: "",
      genre: "ROMANTIC",
    });
    setSelectedMusicFile(null);
    setShowMusicModal(true);
  };

  const handleOpenEditMusic = (music: any) => {
    setEditingMusic(music);
    setMusicForm({
      title: music.title || "",
      composer: music.composer || "",
      genre: music.genre || "",
    });
    setSelectedMusicFile(null);
    setShowMusicModal(true);
  };

  const handleSaveMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicForm.title.trim()) {
      showAdminToast("Judul lagu wajib diisi.", false);
      return;
    }

    setMusicUploading(true);
    try {
      if (editingMusic) {
        const res = await fetch(`/api/admin/music/${editingMusic.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: musicForm.title.trim(),
            composer: musicForm.composer.trim() || null,
            genre: musicForm.genre.trim() || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSystemMusics((prev) =>
            prev.map((m) => (m.id === editingMusic.id ? data.music : m))
          );
          setShowMusicModal(false);
          showAdminToast("Data musik berhasil diperbarui!", true);
        } else {
          showAdminToast(data.error || "Gagal memperbarui data musik", false);
        }
      } else {
        if (!selectedMusicFile) {
          showAdminToast("Pilih file audio terlebih dahulu.", false);
          setMusicUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedMusicFile);
        formData.append("title", musicForm.title.trim());
        if (musicForm.composer.trim()) formData.append("composer", musicForm.composer.trim());
        if (musicForm.genre.trim()) formData.append("genre", musicForm.genre.trim());

        const res = await fetch("/api/admin/music", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setSystemMusics((prev) => [data.music, ...prev]);
          setShowMusicModal(false);
          showAdminToast("Musik baru berhasil diunggah!", true);
        } else {
          showAdminToast(data.error || "Gagal mengunggah musik baru", false);
        }
      }
    } catch (err: any) {
      showAdminToast(err.message || "Terjadi kesalahan saat menyimpan musik", false);
    } finally {
      setMusicUploading(false);
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
      }
    } finally {
      savingFn(false);
    }
  };

  // Theme actions
  const handleOpenNewTheme = () => {
    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }
    setEditingTheme(null);
    setThemeFile(null);
    setThemeForm({
      id: "",
      name: "",
      eventType: "WEDDING",
      category: "minimalist",
      series: "Minimalist",
      description: "",
      sortOrder: (themes.length + 1),
      isActive: true,
      isPremium: true,
      defaultMusicUrl: "",
    });
    setThemeError(null);
    setShowThemeModal(true);
  };

  const handleOpenEditTheme = (th: any) => {
    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }
    setEditingTheme(th);
    setThemeFile(null);
    setThemeForm({
      id: th.id,
      name: th.name,
      eventType: th.eventType || "WEDDING",
      category: th.category || "minimalist",
      series: th.series || (th.category === "traditional" ? "Traditional" : th.category === "modern" ? "Modern" : "Minimalist"),
      description: th.description || "",
      sortOrder: th.sortOrder || 1,
      isActive: th.isActive !== false,
      isPremium: Boolean(th.isPremium),
      defaultMusicUrl: th.defaultMusicUrl || "",
    });
    setThemeError(null);
    setShowThemeModal(true);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeForm.id || !themeForm.name) {
      setThemeError("ID Tema dan Nama Tema wajib diisi");
      return;
    }
    if (!editingTheme && !themeFile) {
      setThemeError("File master template (.html) wajib diunggah untuk tema baru.");
      return;
    }
    if (themeFile && !themeFile.name.toLowerCase().endsWith(".html")) {
      setThemeError("File master wajib berformat .html");
      return;
    }

    setThemeSaving(true);
    setThemeError(null);
    try {
      const url = "/api/admin/themes";
      const method = editingTheme ? "PUT" : "POST";
      const formData = new FormData();
      formData.append("id", themeForm.id);
      formData.append("name", themeForm.name);
      formData.append("eventType", themeForm.eventType || "WEDDING");
      formData.append("category", themeForm.category);
      formData.append("series", themeForm.series);
      formData.append("description", themeForm.description);
      formData.append("sortOrder", String(themeForm.sortOrder));
      formData.append("isActive", String(themeForm.isActive));
      formData.append("isPremium", String(themeForm.isPremium));
      formData.append("defaultMusicUrl", themeForm.defaultMusicUrl || "");
      if (themeFile) {
        formData.append("file", themeFile);
      }

      const res = await fetch(url, {
        method,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan tema");
      }
      setShowThemeModal(false);
      setThemeFile(null);
      if (editingTheme && data.theme) {
        setThemes((prev) => prev.map((t) => (t.id === data.theme.id ? { ...t, ...data.theme } : t)));
        showAdminToast(`Tema "${data.theme.name}" berhasil diperbarui`, true);
      } else if (data.theme) {
        setThemes((prev) => [...prev, data.theme]);
        showAdminToast(`Tema baru "${data.theme.name}" berhasil ditambahkan`, true);
      } else {
        // Fallback jika response tidak menyertakan payload tema
        fetch("/api/admin/themes").then((r) => r.json()).then((d) => {
          if (d.success && Array.isArray(d.themes)) setThemes(d.themes);
        }).catch(() => {});
      }
    } catch (err: any) {
      setThemeError(err.message);
    } finally {
      setThemeSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    try {
      const res = await fetch(`/api/admin/themes?id=${themeId}`, { method: "DELETE" });
      if (res.ok) {
        setThemes((prev) => prev.filter((t) => t.id !== themeId));
        showAdminToast(`Tema "${themeName}" berhasil dihapus`, true);
      } else {
        const d = await res.json();
        showAdminToast("Error: " + d.error, false);
      }
    } catch (err: any) {
      showAdminToast("Gagal: " + err.message, false);
    }
  };

  const handleToggleThemeStatus = async (th: any) => {
    const newActive = th.isActive === false ? true : false;
    // Optimistic update instan tanpa beban reload overview
    setThemes((prev) =>
      prev.map((t) => (t.id === th.id ? { ...t, isActive: newActive } : t))
    );
    try {
      const res = await fetch("/api/admin/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: th.id, isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status tema");
      }
      showAdminToast(`Status tema "${th.name}" diubah ke ${newActive ? "Aktif" : "Nonaktif"}`, true);
    } catch (err: any) {
      // Revert status jika gagal
      setThemes((prev) =>
        prev.map((t) => (t.id === th.id ? { ...t, isActive: !newActive } : t))
      );
      showAdminToast("Gagal: " + err.message, false);
    }
  };

  const handleSyncThemes = async () => {
    try {
      setThemeSyncing(true);
      setThemeSyncResult(null);
      const res = await fetch("/api/admin/themes/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setThemeSyncResult(data);
        showAdminToast("Sinkronisasi tema berhasil!", true);
        loadOverviewData();
      } else {
        showAdminToast(data.error || "Gagal menyinkronkan tema", false);
      }
    } catch (err: any) {
      showAdminToast("Gagal: " + err.message, false);
    } finally {
      setThemeSyncing(false);
    }
  };

  // Demo Studio Action Handlers
  const handleOpenDemoStudio = async (theme: any) => {
    setDemoStudioTheme(theme);
    setDemoStudioLoading(true);
    setDemoStudioTab("visual");
    setDemoStudioUploadSuccess(null);
    setDemoStudioSessionTime(Date.now());
    setUpdatedDemoSlots({});
    setLocalPreviews({});
    setStagedDemoFiles({});
    setStagedDeletedSlots({});
    setShowDemoStudioModal(true);

    if (systemMusics.length === 0) {
      fetchSystemMusics();
    }

    try {
      const res = await fetch(`/api/admin/themes/${theme.id}/demo-data`);
      const json = await res.json();
      if (json.success && json.data) {
        setDemoStudioData(json.data);
        setInitialDemoStudioData(JSON.parse(JSON.stringify(json.data)));
      } else {
        setDemoStudioData({});
        setInitialDemoStudioData({});
      }
    } catch {
      setDemoStudioData({});
      setInitialDemoStudioData({});
    } finally {
      setDemoStudioLoading(false);
    }
  };

  const handleStageDemoAsset = async (slot: string, file: File) => {
    try {
      // Otomatis kompresi gambar di browser (Client-Side) ke format WebP ringan
      let processedFile = file;
      if (file.type.startsWith("image/")) {
        processedFile = await compressImageToWebP(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.82,
        });
      }
      const localUrl = URL.createObjectURL(processedFile);
      setLocalPreviews((prev) => ({ ...prev, [slot]: localUrl }));
      setStagedDemoFiles((prev) => ({ ...prev, [slot]: processedFile }));
      setStagedDeletedSlots((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setDemoStudioUploadSuccess(null);
    } catch (err: any) {
      showAdminToast("Gagal memuat file gambar: " + err.message, false);
    }
  };

  const handleDiscardStagedAsset = (slot: string) => {
    if (localPreviews[slot]?.startsWith("blob:")) {
      try { URL.revokeObjectURL(localPreviews[slot]); } catch {}
    }
    setStagedDemoFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setLocalPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleStageDeleteAsset = (slot: string) => {
    if (localPreviews[slot]?.startsWith("blob:")) {
      try { URL.revokeObjectURL(localPreviews[slot]); } catch {}
    }
    setLocalPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setStagedDemoFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setStagedDeletedSlots((prev) => ({ ...prev, [slot]: true }));
    setDemoStudioData((prev: any) => {
      const next = { ...prev };
      if (slot === "cover") next.landingCoverUrl = "";
      else if (slot === "cover_desktop") next.landingCoverDesktopUrl = "";
      else if (slot === "hero") next.sidebarPhotoUrl = "";
      else if (slot === "background") next.globalBgUrl = "";
      else if (slot === "home") next.homePhotoUrl = "";
      else if (slot === "footer") {
        next.footerPhotoUrl = "";
        next.closingPhotoUrl = "";
      }
      else if (slot === "groom") next.groomPhotoUrl = "";
      else if (slot === "bride") next.bridePhotoUrl = "";
      else if (slot === "thumbnail_mobile") next.thumbnailMobileUrl = "";
      else if (slot === "thumbnail_desktop") next.thumbnailDesktopUrl = "";
      else if (slot === "music") next.audioUrl = "";
      else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (Array.isArray(next.galleryPhotos)) {
          next.galleryPhotos = [...next.galleryPhotos];
          next.galleryPhotos[idx] = "";
        }
      }
      return next;
    });
  };

  const handleRestoreDeletedAsset = (slot: string) => {
    setStagedDeletedSlots((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setDemoStudioData((prev: any) => {
      const next = { ...prev };
      if (slot === "cover") next.landingCoverUrl = initialDemoStudioData.landingCoverUrl;
      else if (slot === "cover_desktop") next.landingCoverDesktopUrl = initialDemoStudioData.landingCoverDesktopUrl;
      else if (slot === "hero") next.sidebarPhotoUrl = initialDemoStudioData.sidebarPhotoUrl;
      else if (slot === "background") next.globalBgUrl = initialDemoStudioData.globalBgUrl;
      else if (slot === "home") next.homePhotoUrl = initialDemoStudioData.homePhotoUrl;
      else if (slot === "footer") {
        next.footerPhotoUrl = initialDemoStudioData.footerPhotoUrl;
        next.closingPhotoUrl = initialDemoStudioData.closingPhotoUrl;
      }
      else if (slot === "groom") next.groomPhotoUrl = initialDemoStudioData.groomPhotoUrl;
      else if (slot === "bride") next.bridePhotoUrl = initialDemoStudioData.bridePhotoUrl;
      else if (slot === "thumbnail_mobile") next.thumbnailMobileUrl = initialDemoStudioData.thumbnailMobileUrl;
      else if (slot === "thumbnail_desktop") next.thumbnailDesktopUrl = initialDemoStudioData.thumbnailDesktopUrl;
      else if (slot === "music") next.audioUrl = initialDemoStudioData.audioUrl;
      else if (slot.startsWith("gallery_")) {
        const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
        if (Array.isArray(initialDemoStudioData.galleryPhotos)) {
          next.galleryPhotos = [...(next.galleryPhotos || [])];
          next.galleryPhotos[idx] = initialDemoStudioData.galleryPhotos[idx];
        }
      }
      return next;
    });
  };

  const handleSaveAllDemoChanges = async () => {
    if (!demoStudioTheme || !isDemoStudioDirty) return;
    setDemoStudioSaving(true);
    setDemoStudioUploadSuccess(null);

    try {
      // 1. Process deletions
      const delSlots = Object.keys(stagedDeletedSlots);
      if (delSlots.length > 0) {
        for (const slot of delSlots) {
          setUploadingSlot(slot);
          const delRes = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset?slot=${slot}`, {
            method: "DELETE",
          });
          const delData = await delRes.json();
          if (!delData.success) {
            throw new Error(`Gagal menghapus slot ${slot}: ${delData.error || "Gagal delete"}`);
          }
        }
      }

      // 2. Upload all staged files to server
      const slots = Object.keys(stagedDemoFiles);
      const nextDemoData = { ...demoStudioData };

      delSlots.forEach((slot) => {
        if (slot === "cover") nextDemoData.landingCoverUrl = "";
        else if (slot === "cover_desktop") nextDemoData.landingCoverDesktopUrl = "";
        else if (slot === "hero") nextDemoData.sidebarPhotoUrl = "";
        else if (slot === "background") nextDemoData.globalBgUrl = "";
        else if (slot === "home") nextDemoData.homePhotoUrl = "";
        else if (slot === "footer") {
          nextDemoData.footerPhotoUrl = "";
          nextDemoData.closingPhotoUrl = "";
        }
        else if (slot === "groom") nextDemoData.groomPhotoUrl = "";
        else if (slot === "bride") nextDemoData.bridePhotoUrl = "";
        else if (slot === "thumbnail_mobile") nextDemoData.thumbnailMobileUrl = "";
        else if (slot === "thumbnail_desktop") nextDemoData.thumbnailDesktopUrl = "";
        else if (slot === "music") nextDemoData.audioUrl = "";
        else if (slot.startsWith("gallery_")) {
          const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
          if (Array.isArray(nextDemoData.galleryPhotos)) {
            nextDemoData.galleryPhotos[idx] = "";
          }
        }
      });

      if (slots.length > 0) {
        for (const slot of slots) {
          setUploadingSlot(slot);
          const file = stagedDemoFiles[slot];
          const fd = new FormData();
          fd.append("slot", slot);
          fd.append("file", file);

          const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset`, {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(`Gagal mengunggah slot ${slot}: ${data.error || "Gagal upload"}`);
          }

          // Synchronize URL in nextDemoData so step 3 preserves the updated media/video/audio URLs
          const targetUrl = data.rawUrl || `/demo/${demoStudioTheme.id}/${data.fileName}`;
          if (slot === "cover") nextDemoData.landingCoverUrl = targetUrl;
          else if (slot === "cover_desktop") nextDemoData.landingCoverDesktopUrl = targetUrl;
          else if (slot === "hero") nextDemoData.sidebarPhotoUrl = targetUrl;
          else if (slot === "background") nextDemoData.globalBgUrl = targetUrl;
          else if (slot === "home") nextDemoData.homePhotoUrl = targetUrl;
          else if (slot === "footer") nextDemoData.footerPhotoUrl = targetUrl;
          else if (slot === "groom") nextDemoData.groomPhotoUrl = targetUrl;
          else if (slot === "bride") nextDemoData.bridePhotoUrl = targetUrl;
          else if (slot === "thumbnail_mobile") nextDemoData.thumbnailMobileUrl = targetUrl;
          else if (slot === "thumbnail_desktop") nextDemoData.thumbnailDesktopUrl = targetUrl;
          else if (slot === "music") nextDemoData.audioUrl = targetUrl;
          else if (slot.startsWith("gallery_")) {
            const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
            if (!Array.isArray(nextDemoData.galleryPhotos)) {
              nextDemoData.galleryPhotos = [];
            }
            nextDemoData.galleryPhotos[idx] = targetUrl;
          }
        }
        setDemoStudioData(nextDemoData);
      }

      // 3. Save text profile & story demo data
      const dataRes = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDemoData),
      });
      const dataJson = await dataRes.json();
      if (!dataJson.success) {
        throw new Error(dataJson.error || "Gagal menyimpan data demo");
      }

      // 4. Mark successfully saved
      const now = Date.now();
      const newUpdatedSlots: Record<string, number> = { ...updatedDemoSlots };
      slots.forEach((s) => {
        newUpdatedSlots[s] = now;
      });
      delSlots.forEach((s) => {
        newUpdatedSlots[s] = now;
      });
      setUpdatedDemoSlots(newUpdatedSlots);
      setDemoStudioSessionTime(now);
      setInitialDemoStudioData(JSON.parse(JSON.stringify(nextDemoData)));
      setStagedDemoFiles({});
      setStagedDeletedSlots({});
      fetch("/api/admin/themes").then((r) => r.json()).then((d) => {
        if (d.success && Array.isArray(d.themes)) setThemes(d.themes);
      }).catch(() => {});
      setDemoStudioUploadSuccess(`✓ Semua perubahan demo tema ${demoStudioTheme.name} berhasil disimpan permanen!`);
      setTimeout(() => setDemoStudioUploadSuccess(null), 4000);
    } catch (err: any) {
      showAdminToast("Error: " + err.message, false);
    } finally {
      setUploadingSlot(null);
      setDemoStudioSaving(false);
    }
  };

  const handleCloseDemoStudio = () => {
    setShowDemoStudioModal(false);
    setStagedDemoFiles({});
    setStagedDeletedSlots({});
    setLocalPreviews({});
  };


  const handleToggleEmergencyUnlock = async (inv: any) => {
    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationHours: 24,
          lockImmediately: inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast(data.message, true);
        loadOverviewData();
      } else {
        showAdminToast(data.error || "Gagal mengubah status kunci", false);
      }
    } catch (e: any) {
      showAdminToast("Error: " + e.message, false);
    }
  };

  const handleCloseToGallery = async (inv: any) => {
    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE_TO_GALLERY" }),
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast(data.message, true);
        loadOverviewData();
      } else {
        showAdminToast(data.error || "Gagal menutup undangan", false);
      }
    } catch (e: any) {
      showAdminToast("Error: " + e.message, false);
    }
  };

  const handleExtendGallery = async (inv: any) => {
    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXTEND_GALLERY", days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast(data.message, true);
        loadOverviewData();
      } else {
        showAdminToast(data.error || "Gagal memperpanjang masa aktif", false);
      }
    } catch (e: any) {
      showAdminToast("Error: " + e.message, false);
    }
  };

  const handleSwitchTheme = async (invId: string, newTheme: string) => {
    try {
      const res = await fetch(`/api/client/invitations/${invId}`);
      const invData = await res.json();
      await fetch(`/api/client/invitations/${invId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invData, themeId: newTheme }),
      });
      showAdminToast("Tema berhasil dialihkan", true);
      loadOverviewData();
    } catch (err: any) { showAdminToast("Gagal: " + err.message, false); }
  };

  const handleApproveOrder = async (orderId: string) => {
    setProcessingOrderAction(true);
    setOrderActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
      if (res.ok) {
        setConfirmApproveOrderId(null);
        setPreviewProofOrder(null);
        loadOverviewData(true);
      } else {
        const d = await res.json();
        setOrderActionFeedback({ id: orderId, type: "error", msg: d.error || "Gagal menyetujui transaksi." });
      }
    } catch (err: any) {
      setOrderActionFeedback({ id: orderId, type: "error", msg: err.message || "Gagal menyetujui transaksi." });
    } finally {
      setProcessingOrderAction(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModalOrder) return;
    setProcessingOrderAction(true);
    try {
      const res = await fetch(`/api/admin/orders/${rejectModalOrder.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReasonInput || "Bukti transfer tidak valid atau dana belum masuk." }),
      });
      if (res.ok) {
        setRejectModalOrder(null);
        setPreviewProofOrder(null);
        setRejectReasonInput("");
        setConfirmApproveOrderId(null);
        showAdminToast("Transaksi berhasil ditolak", true);
        loadOverviewData(true);
      } else {
        const d = await res.json();
        showAdminToast("Error: " + d.error, false);
      }
    } catch (err: any) {
      showAdminToast("Gagal: " + err.message, false);
    } finally {
      setProcessingOrderAction(false);
    }
  };

  // Google Drive integration telah dihapus — tidak diperlukan lagi

  // Overview computed metrics & analytics
  const orderList = allOrders.length > 0 ? allOrders : orders;
  const totalRevenue = orderList.filter((o) => o.status === "PAID").reduce((sum, o) => sum + Number(o.amount), 0);
  const totalPending = orderList.filter((o) => o.status === "PENDING").reduce((sum, o) => sum + Number(o.amount), 0);
  const paidCount = orderList.filter((o) => o.status === "PAID").length;
  const pendingCount = orderList.filter((o) => o.status === "PENDING").length;
  const totalOrdersCount = orderList.length;
  const conversionRate = totalOrdersCount > 0 ? Math.round((paidCount / totalOrdersCount) * 100) : 0;

  // Plan Sales Breakdown
  const tier1Orders = orderList.filter((o) => o.planType === "TIER_1" && o.status === "PAID");
  const tier2Orders = orderList.filter((o) => o.planType === "TIER_2" && o.status === "PAID");
  const tier3Orders = orderList.filter((o) => o.planType === "TIER_3" && o.status === "PAID");

  const tier1Rev = tier1Orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const tier2Rev = tier2Orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const tier3Rev = tier3Orders.reduce((sum, o) => sum + Number(o.amount), 0);

  // Top themes calculation
  const themeUsageMap: Record<string, number> = {};
  invitations.forEach((inv) => {
    const t = inv.themeId || "kalandra";
    themeUsageMap[t] = (themeUsageMap[t] || 0) + 1;
  });
  const sortedThemeUsage = Object.entries(themeUsageMap)
    .map(([themeId, count]) => {
      const match = themes.find((th) => th.id === themeId);
      return {
        themeId,
        name: match?.name || themeId,
        category: match?.category || "modern",
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

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
                <div className="space-y-6">
                  {/* Top Bar: Title & Quick Shortcuts */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        <span>Pusat Kendali Administrator</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {settingsMap["platform_name"] ? `${settingsMap["platform_name"]} Executive Dashboard` : "Executive Dashboard"}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Ringkasan performa finansial, analitik paket, aktivitas mempelai &amp; status operasional sistem.
                      </p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadOverviewData()}
                        disabled={loading}
                        className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Segarkan data ringkasan"
                      >
                        <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{loading ? "Menyegarkan..." : "Segarkan Data"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateSnapshot}
                        disabled={creatingSnapshot}
                        className="px-3.5 py-2 bg-gray-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        <span>{creatingSnapshot ? "Snapshotting..." : "+ Snapshot DB"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("themes")}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Kelola Tema</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("settings")}
                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Pengaturan</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Unified KPI + Operational Panel — Responsive Dual Layout ── */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">

                    {/* ── DESKTOP (lg+): Horizontal 4-col dengan divider ── */}
                    <div className="hidden lg:grid grid-cols-4 divide-x divide-gray-100">

                      {/* Desktop Col 1: Revenue Hero */}
                      <div className="px-6 py-5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pendapatan Bersih</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(stats.conversionRate ?? conversionRate) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                            {stats.conversionRate ?? conversionRate}% konversi
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 tracking-tight">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                        <p className="text-[11px] text-gray-400">{paidCount} lunas · {stats.pendingOrderCount ?? pendingCount} pending</p>
                      </div>

                      {/* Desktop Col 2: Pending */}
                      <div className="px-5 py-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Menunggu Bayar</p>
                          <p className="text-lg font-bold text-amber-700 tracking-tight">Rp {totalPending.toLocaleString("id-ID")}</p>
                          <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice aktif</p>
                        </div>
                      </div>

                      {/* Desktop Col 3: Klien */}
                      <div className="px-5 py-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Klien</p>
                          <p className="text-lg font-bold text-sky-700 tracking-tight">
                            {stats.paidUserCount ?? 0}<span className="text-[11px] font-normal text-gray-400 ml-1">bayar</span>
                            <span className="text-gray-300 mx-1.5">/</span>
                            <span className="text-gray-500 text-base">{stats.userCount || 0}</span><span className="text-[11px] font-normal text-gray-400 ml-1">total</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar
                            {(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1.5 text-emerald-600 font-semibold">+{stats.newRegistrationsToday} hari ini</span>}
                          </p>
                        </div>
                      </div>

                      {/* Desktop Col 4: Tamu & RSVP */}
                      <div className="px-5 py-5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Tamu Terdaftar</p>
                          <p className="text-lg font-bold text-blue-700 tracking-tight">{stats.guestCount || 0}<span className="text-[11px] font-normal text-gray-400 ml-1">tamu</span></p>
                          <p className="text-[10px] text-gray-400">
                            {stats.rsvpCount || 0} RSVP · <span className={stats.guestCount > 0 ? "text-blue-600 font-semibold" : ""}>{stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── TABLET (md–lg): 2×2 compact grid ── */}
                    <div className="hidden md:grid lg:hidden grid-cols-2 divide-x divide-y divide-gray-100">
                      <div className="px-5 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">Rp</div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Pendapatan · <span className={`font-bold ${(stats.conversionRate ?? conversionRate) > 0 ? "text-emerald-600" : "text-gray-400"}`}>{stats.conversionRate ?? conversionRate}% konversi</span></p>
                          <p className="text-lg font-bold text-emerald-700 truncate">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                          <p className="text-[10px] text-gray-400">{paidCount} lunas · {stats.pendingOrderCount ?? pendingCount} pending</p>
                        </div>
                      </div>
                      <div className="px-5 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Menunggu Bayar</p>
                          <p className="text-lg font-bold text-amber-700 truncate">Rp {totalPending.toLocaleString("id-ID")}</p>
                          <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice</p>
                        </div>
                      </div>
                      <div className="px-5 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Klien</p>
                          <p className="text-lg font-bold text-sky-700">{stats.paidUserCount ?? 0}<span className="text-gray-300 mx-1">/</span><span className="text-gray-500">{stats.userCount || 0}</span></p>
                          <p className="text-[10px] text-gray-400">{(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar{(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1 text-emerald-600 font-semibold">+{stats.newRegistrationsToday}</span>}</p>
                        </div>
                      </div>
                      <div className="px-5 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 font-medium">Tamu</p>
                          <p className="text-lg font-bold text-blue-700">{stats.guestCount || 0}<span className="text-[11px] font-normal text-gray-400 ml-1">tamu</span></p>
                          <p className="text-[10px] text-gray-400">{stats.rsvpCount || 0} RSVP · <span className={stats.guestCount > 0 ? "text-blue-600 font-semibold" : ""}>{stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</span></p>
                        </div>
                      </div>
                    </div>

                    {/* ── MOBILE (<md): List-row — label kiri, value kanan, zero wrapping ── */}
                    <div className="block md:hidden divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">Rp</div>
                          <span className="text-xs text-gray-600 font-medium">Pendapatan</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-700">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                          <p className="text-[10px] text-gray-400">{paidCount} lunas · {stats.conversionRate ?? conversionRate}% konversi</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Menunggu Bayar</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-700">Rp {totalPending.toLocaleString("id-ID")}</p>
                          <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Klien</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-sky-700">{stats.paidUserCount ?? 0}<span className="text-gray-400 font-normal text-xs"> / {stats.userCount || 0} total</span></p>
                          <p className="text-[10px] text-gray-400">{(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar{(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1 text-emerald-600 font-semibold">+{stats.newRegistrationsToday}</span>}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Tamu</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-700">{stats.guestCount || 0} tamu</p>
                          <p className="text-[10px] text-gray-400">{stats.rsvpCount || 0} RSVP · {stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Operational Pulse Strip — responsif per breakpoint ── */}
                    <div className="border-t border-gray-100 bg-gray-50/60">
                      {/* sm+: 3-col inline */}
                      <div className="hidden sm:grid grid-cols-3 divide-x divide-gray-200">
                        <div className="flex items-start gap-2.5 px-5 py-3">
                          <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500 font-medium">Undangan <span className="text-gray-400">({stats.invitationCount || 0})</span></p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{stats.publishedInvitationCount || 0} Live</span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{stats.draftInvitationCount || 0} Draft</span>
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">{stats.eventFinishedCount ?? 0} Selesai</span>
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{stats.archivedCount ?? 0} Arsip</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 px-5 py-3">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${(stats.eventTodayCount ?? 0) > 0 ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <span className="text-[11px] text-gray-500 font-medium">
                            Hari-H: <span className={`font-bold ${(stats.eventTodayCount ?? 0) > 0 ? "text-rose-600" : "text-gray-400"}`}>{stats.eventTodayCount ?? 0} hari ini</span>
                            <span className="text-gray-400 font-normal"> · {stats.eventThisWeekCount ?? 0} minggu · {stats.eventThisMonthCount ?? 0} bln</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 px-5 py-3">
                          <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          </div>
                          <span className="text-[11px] text-gray-500 font-medium">
                            Klien baru: <span className="font-bold text-teal-700">{stats.newRegistrationsToday ?? 0}</span> hari ini
                            <button className="ml-2 text-teal-700 font-semibold hover:underline cursor-pointer" onClick={() => setActiveTab("users")}>Lihat →</button>
                          </span>
                        </div>
                      </div>
                      {/* Mobile: stacked list rows */}
                      <div className="block sm:hidden divide-y divide-gray-100">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[11px] text-gray-500 font-medium">Undangan</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{stats.publishedInvitationCount || 0} Live</span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{stats.draftInvitationCount || 0} Draft</span>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{(stats.eventFinishedCount ?? 0) + (stats.archivedCount ?? 0)} lainnya</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[11px] text-gray-500 font-medium">Hari-H Acara</span>
                          <span className={`text-[11px] font-bold ${(stats.eventTodayCount ?? 0) > 0 ? "text-rose-600" : "text-gray-400"}`}>
                            {stats.eventTodayCount ?? 0} hari ini · {stats.eventThisWeekCount ?? 0} minggu
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[11px] text-gray-500 font-medium">Klien Baru</span>
                          <span className="text-[11px] font-bold text-teal-700">{stats.newRegistrationsToday ?? 0} hari ini</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Analytics Visual Grid (2 Cards: Package Sales Breakdown & Theme Popularity) ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Widget 1: Penjualan per Kategori Paket */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">Distribusi Penjualan per Paket</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Pendapatan dan volume transaksi lunas berdasarkan tier paket</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("orders")}
                          className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </div>

                      <div className="space-y-4 pt-1">
                        {/* Tier 1 */}
                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-900 uppercase tracking-wide">
                              Tier 1 • {settingsMap["name_tier1"] || "Serenade"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {tier1Rev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (tier1Orders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{tier1Orders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((tier1Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
                          </div>
                        </div>

                        {/* Tier 2 */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 uppercase tracking-wide">
                              Tier 2 • {settingsMap["name_tier2"] || "Symphony"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {tier2Rev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (tier2Orders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{tier2Orders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((tier2Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
                          </div>
                        </div>

                        {/* Tier 3 */}
                        <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-purple-900 uppercase tracking-wide">
                              Tier 3 • {settingsMap["name_tier3"] || "Eternity"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {tier3Rev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (tier3Orders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{tier3Orders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((tier3Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Widget 2: Popularitas Tema Terpilih Mempelai */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">Popularitas Tema Pilihan Mempelai</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Ranking tema yang paling diminati oleh pasangan pengantin</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("themes")}
                          className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Katalog Tema
                        </button>
                      </div>

                      {sortedThemeUsage.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic text-xs">
                          Belum ada data penggunaan tema oleh mempelai.
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {sortedThemeUsage.slice(0, 4).map((item, idx) => {
                            const pct = invitations.length > 0 ? Math.round((item.count / invitations.length) * 100) : 0;
                            return (
                              <div key={item.themeId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-bold text-gray-900 text-xs">{item.name}</span>
                                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600">
                                      {item.category}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900 font-mono">
                                    {item.count} Undangan ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-600 h-full rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Recent Live Activity (2 Cards: Recent Invitations & Recent Orders) ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Widget 3: Undangan Mempelai Terbaru */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                          <h3 className="font-bold text-gray-900 text-base">Undangan Mempelai Terkini</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("invitations")}
                          className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Lihat Semua ({invitations.length})
                        </button>
                      </div>

                      {invitations.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-6 text-center">Belum ada undangan dibuat</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {invitations.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">
                                  {resolveInvitationDisplayName(inv)}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    {buildCanonicalPath(inv)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 uppercase">
                                    {inv.themeId}
                                  </span>
                                  {inv.eventType && inv.eventType !== "WEDDING" && (
                                    <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                                      {inv.eventType}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge status={inv.status} />
                                <a
                                  href={getInvitationPublicUrl(inv.subdomain || inv.invitationSlug || "wedding")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-amber-800 hover:bg-gray-100 rounded-lg transition"
                                  title="Pratinjau Undangan Langsung"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Widget 4: Transaksi Terkini */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <h3 className="font-bold text-gray-900 text-base">Aktivitas Transaksi Pembayaran</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("orders")}
                          className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Lihat Semua ({orderList.length})
                        </button>
                      </div>

                      {orderList.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-6 text-center">Belum ada transaksi terekam</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {orderList.slice(0, 5).map((ord) => (
                            <div key={ord.id} className="py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-bold text-gray-800 truncate">{ord.invoiceNumber}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{ord.user?.name || ord.user?.email || "Klien"}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-sm text-gray-900 font-mono">
                                  Rp {Number(ord.amount).toLocaleString("id-ID")}
                                </p>
                                <div className="mt-0.5">
                                  <Badge status={ord.status} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── System Status & Shortcuts (3 Mini Cards) ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Database & Snapshot */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900">Database &amp; Snapshot</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-xs text-gray-500">
                        {snapshots.length} snapshot tersimpan di <code>{backupPathInfo?.resolvedPath || settingsMap["backup_path"] || "./data/backups"}</code>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("database")}
                        className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Kelola Database &amp; Snapshot</span>
                        
                      </button>
                    </div>

                    {/* Webhook & Monitoring */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900">Monitoring Webhook</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {logs.length} Log
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Status webhook payment gateway &amp; event listener aktif.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("logs")}
                        className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Lihat Log Monitoring</span>
                        
                      </button>
                    </div>

                    {/* Tema Katalog */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-900">Koleksi Desain Tema</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                          {themes.filter((t) => t.isActive).length} Aktif
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Katalog tema Traditional, Modern, dan Premium siap pakai.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("themes")}
                        className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Atur Katalog &amp; Sinkronisasi</span>
                        
                      </button>
                    </div>
                  </div>
                </div>
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
                <AdminInvitationsTab onNavigateToThemes={() => setActiveTab("themes")} />
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
                <div className="space-y-6">
                  {/* Sub-Tab Navigation: Katalog Tema vs Pustaka Musik */}
                  <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                    <button
                      type="button"
                      onClick={() => setThemeSubTab("themes")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        themeSubTab === "themes"
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>Katalog Tema ({themes.filter((t) => t.id !== "starter-blueprint").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setThemeSubTab("music");
                        fetchSystemMusics();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        themeSubTab === "music"
                          ? "bg-amber-800 text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>Pustaka Musik Sistem ({systemMusics.length})</span>
                    </button>
                  </div>

                  {themeSubTab === "themes" ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Katalog &amp; Manajemen Tema</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Kelola daftar tema per kategori (Modern &amp; Traditional), status aktif, dan urutan</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSyncThemes}
                        disabled={themeSyncing}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Scan ulang folder themes/, daftarkan tema baru, dan bersihkan cache demo"
                      >
                        <svg className={`w-3.5 h-3.5 ${themeSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{themeSyncing ? "Menyinkronkan..." : "Sinkronisasi Tema & Cache"}</span>
                      </button>
                      <a
                        href="/downloads/starter-blueprint.html"
                        download="starter-blueprint.html"
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-stone-300 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Blueprint</span>
                      </a>
                      <button
                        onClick={handleOpenNewTheme}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>+</span>
                        <span>Tambah Tema Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Result Banner */}
                  {themeSyncResult && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h4 className="text-xs font-bold text-emerald-900">
                            {themeSyncResult.message} ({themeSyncResult.syncedCount} Tema Terdeteksi)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setThemeSyncResult(null)}
                          className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                        {themeSyncResult.discoveredThemes?.map((th: any) => (
                          <div key={th.id} className="text-[11px] bg-white/80 border border-emerald-100 p-2 rounded-lg flex items-center justify-between">
                            <span className="font-semibold text-stone-800">{th.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${th.isHealthValid ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-amber-100 text-amber-800 font-bold'}`}>
                              {th.isHealthValid ? "Tersinkron" : "Cek Token"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EventType + Category Filter (Unified SaaS Control Bar) */}
                  {(() => {
                    const validThemes = themes.filter((t) => t.id !== "starter-blueprint");

                    const countWedding   = validThemes.filter((t) => !t.eventType || t.eventType === "WEDDING").length;
                    const countBirthday  = validThemes.filter((t) => t.eventType === "BIRTHDAY").length;
                    const countKhitan    = validThemes.filter((t) => t.eventType === "KHITAN").length;
                    const countAqiqah    = validThemes.filter((t) => t.eventType === "AQIQAH").length;
                    const countWisuda    = validThemes.filter((t) => t.eventType === "WISUDA").length;
                    const countGathering = validThemes.filter((t) => t.eventType === "GATHERING").length;

                    const eventTypeFilteredThemes = themeEventTypeFilter === "all"
                      ? validThemes
                      : validThemes.filter((t) =>
                          themeEventTypeFilter === "wedding"
                            ? (!t.eventType || t.eventType === "WEDDING")
                            : t.eventType === themeEventTypeFilter.toUpperCase()
                        );

                    const countMinimalist  = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "minimalist" || (t.category || "").toLowerCase() === "premium").length;
                    const countModern      = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "modern").length;
                    const countTraditional = eventTypeFilteredThemes.filter((t) => (t.category || "").toLowerCase() === "traditional").length;

                    const categoryTabs = [
                      countMinimalist  > 0 ? { id: "minimalist",  label: `Minimalis (${countMinimalist})` }  : null,
                      countModern      > 0 ? { id: "modern",      label: `Modern (${countModern})` }          : null,
                      countTraditional > 0 ? { id: "traditional", label: `Tradisional (${countTraditional})` } : null,
                    ].filter(Boolean) as { id: string; label: string }[];

                    const categoryFilteredThemes = themeCategoryFilter === "all"
                      ? eventTypeFilteredThemes
                      : eventTypeFilteredThemes.filter((t) => {
                          const cat = (t.category || "").toLowerCase();
                          if (themeCategoryFilter === "minimalist") return cat === "minimalist" || cat === "premium";
                          return cat === themeCategoryFilter;
                        });

                    const displayedThemes = themeSearch.trim()
                      ? categoryFilteredThemes.filter((t) =>
                          t.name.toLowerCase().includes(themeSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(themeSearch.toLowerCase())
                        )
                      : categoryFilteredThemes;

                    return (
                      <div className="space-y-4">
                        {/* 1. Master Segmented Event Bar */}
                        <div className="bg-stone-100/90 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar border border-stone-200/80">
                          {[
                            { id: "all",       label: "Semua",         count: validThemes.length },
                            { id: "wedding",   label: "Wedding",       count: countWedding },
                            { id: "birthday",  label: "Birthday",      count: countBirthday },
                            { id: "khitan",    label: "Khitan",        count: countKhitan },
                            { id: "aqiqah",    label: "Aqiqah",        count: countAqiqah },
                            { id: "wisuda",    label: "Wisuda",        count: countWisuda },
                            { id: "gathering", label: "Umum / Acara",  count: countGathering },
                          ].map((tab) => {
                            const isActive = themeEventTypeFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                  setThemeEventTypeFilter(tab.id);
                                  setThemeCategoryFilter("all");
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                                  isActive
                                    ? "bg-white text-stone-900 shadow-xs font-bold"
                                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                                }`}
                              >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                  isActive
                                    ? "bg-stone-900 text-white font-bold"
                                    : "bg-stone-200 text-stone-600 font-medium"
                                }`}>
                                  {tab.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* 2. Sub-Filter Toolbar: Search + Style Category Chips + Counter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative w-full sm:w-64">
                              <input
                                type="text"
                                value={themeSearch}
                                onChange={(e) => setThemeSearch(e.target.value)}
                                placeholder="Cari nama atau slug tema..."
                                className="w-full pl-8 pr-7 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                              />
                              <svg className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              {themeSearch && (
                                <button
                                  type="button"
                                  onClick={() => setThemeSearch("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {categoryTabs.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                {[
                                  { id: "all", label: `Semua Gaya (${eventTypeFilteredThemes.length})` },
                                  ...categoryTabs,
                                ].map((cat) => {
                                  const isCatActive = themeCategoryFilter === cat.id;
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => setThemeCategoryFilter(cat.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                                        isCatActive
                                          ? "bg-stone-800 text-white font-semibold shadow-2xs"
                                          : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                                      }`}
                                    >
                                      {cat.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="text-right text-[11px] text-stone-500 font-medium shrink-0">
                            Menampilkan <span className="font-bold text-stone-800">{displayedThemes.length}</span> dari {validThemes.length} tema
                          </div>
                        </div>

                        {displayedThemes.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200 text-stone-500">
                            <p className="text-sm font-semibold">Tidak ada tema yang cocok dengan filter aktif</p>
                            <p className="text-xs text-stone-400 mt-1">Coba ganti kategori atau kosongkan pencarian</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {displayedThemes.map((theme) => {
                            const cat = (theme.category || "modern").toLowerCase();
                            return (
                              <div
                                key={theme.id}
                                className={`group bg-white rounded-2xl border flex flex-col justify-between transition-all duration-300 shadow-2xs hover:shadow-md ${
                                  theme.isActive === false
                                    ? "opacity-65 border-dashed border-stone-300"
                                    : "border-stone-200 hover:border-stone-300"
                                }`}
                              >
                                <div>
                                  {/* 1. Visual Showcase: Device Pair Mockup */}
                                  <div className="p-3 pb-1">
                                    <div className="stp-scene">
                                      {/* Tablet frame */}
                                      <div className="stp-tablet">
                                        <div className="stp-tablet-bar">
                                          <div className="stp-tablet-dots"><span/><span/><span/></div>
                                          <div className="stp-tablet-url">luxenary.id/{theme.id}</div>
                                          <div style={{ width: "18px" }}/>
                                        </div>
                                        <div className="stp-tablet-screen">
                                          <img
                                            src={theme.thumbnailDesktop || `/demo/${theme.id}/thumbnail_desktop.webp`}
                                            alt={`${theme.name} Desktop`}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover object-top"
                                          />
                                          <div className="stp-glare"/>
                                        </div>

                                      {/* Hover Quick Action — Lihat Live */}
                                      <a
                                        href={`/demo/${theme.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-black/30 backdrop-blur-[1px]"
                                        title={`Buka Demo ${theme.name}`}
                                      >
                                        <span className="px-3.5 py-1.5 bg-stone-900/90 hover:bg-black text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform group-hover:scale-105">
                                          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Lihat Live
                                        </span>
                                      </a>
                                    </div>

                                    {/* Phone frame — overlapping bottom-left */}
                                    <div className="stp-phone">
                                      <div className="stp-phone-notch"/>
                                      <div className="stp-phone-screen">
                                        <img
                                          src={theme.thumbnailMobile || `/demo/${theme.id}/thumbnail_mobile.webp`}
                                          alt={`${theme.name} Mobile`}
                                          loading="lazy"
                                          decoding="async"
                                        />
                                        <div className="stp-glare"/>
                                      </div>
                                    </div>

                                    {/* Floating Category Badge */}
                                    <div className="absolute top-5 right-5 z-20 pointer-events-none">
                                      <span
                                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-xs backdrop-blur-md ${
                                          cat === "traditional"
                                            ? "bg-amber-950/85 text-amber-200 border-amber-600/40"
                                            : cat === "modern"
                                            ? "bg-slate-950/85 text-slate-200 border-slate-600/40"
                                            : "bg-stone-950/85 text-amber-100 border-stone-600/40"
                                        }`}
                                      >
                                        {cat === "traditional" ? "Tradisional" : cat === "modern" ? "Modern" : "Minimalis"}
                                      </span>
                                    </div>

                                    {/* Floating Active Status Indicator */}
                                    <div className="absolute top-5 left-5 z-20 pointer-events-none">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-xs backdrop-blur-md border ${
                                          theme.isActive !== false
                                            ? "bg-emerald-950/85 text-emerald-300 border-emerald-600/50"
                                            : "bg-stone-950/85 text-stone-400 border-stone-700/50"
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            theme.isActive !== false
                                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                              : "bg-stone-500"
                                          }`}
                                        />
                                        <span>{theme.isActive !== false ? "Aktif" : "Nonaktif"}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>


                                  {/* 2. Theme Identity & Description (Hirarki Tengah) */}
                                  <div className="p-4 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h3 className="font-bold text-gray-900 text-base group-hover:text-amber-900 transition">{theme.name}</h3>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                            (!theme.eventType || theme.eventType === "WEDDING")
                                              ? "bg-amber-50 text-amber-800 border-amber-200"
                                              : theme.eventType === "BIRTHDAY"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : theme.eventType === "KHITAN"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : theme.eventType === "AQIQAH"
                                              ? "bg-sky-50 text-sky-700 border-sky-200"
                                              : theme.eventType === "WISUDA"
                                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                              : "bg-teal-50 text-teal-700 border-teal-200"
                                          }`}>
                                            {theme.eventType || "WEDDING"}
                                          </span>
                                        </div>
                                        <span className="text-[11px] font-mono text-gray-400">/{theme.id}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                      {theme.description || (settingsMap["platform_name"] ? `Desain eksklusif ${settingsMap["platform_name"]}` : "Desain eksklusif")}
                                    </p>
                                  </div>
                                </div>

                                {/* 3. Bottom Action Row (Hirarki Bawah) */}
                                <div className="px-4 pb-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 bg-stone-50/50">
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={`/demo/${theme.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <span>Preview</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDemoStudio(theme)}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                                      title="Kelola foto, musik & data cerita demo tema ini"
                                    >
                                      <span>Studio</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {/* Toggle Aktif / Nonaktif — tombol luar pengganti tombol hapus */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleThemeStatus(theme);
                                      }}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                        theme.isActive !== false
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                          : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                                      }`}
                                      title={theme.isActive !== false ? "Tema Aktif — Klik untuk nonaktifkan" : "Tema Nonaktif — Klik untuk aktifkan"}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          theme.isActive !== false
                                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                            : "bg-stone-400"
                                        }`}
                                      />
                                      <span>{theme.isActive !== false ? "Aktif" : "Nonaktif"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditTheme(theme)}
                                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                                      title="Edit Metadata Tema"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                  })()}
                </div>
              ) : (
                /* ── Sub-Tab: Pustaka Musik Sistem ── */
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Pustaka Musik Sistem</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Kelola koleksi lagu pernikahan yang tersedia untuk dipilih klien pada editor undangan
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchSystemMusics}
                        disabled={musicLoading}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className={`w-3.5 h-3.5 ${musicLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Segarkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddMusicModal}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah Lagu Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Music Grid */}
                  {musicLoading && systemMusics.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-stone-300 border-t-amber-800 mb-3" />
                      <p className="text-sm font-medium text-stone-500">Memuat pustaka musik sistem...</p>
                    </div>
                  ) : systemMusics.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-stone-800 mb-1">Belum Ada Lagu di Pustaka</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                        Tambahkan file lagu latar (MP3 / OGG / WAV / M4A) untuk dijadikan pilihan bagi klien.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddMusicModal}
                        className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
                      >
                        + Tambah Lagu Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemMusics.map((music) => {
                        const isPlaying = playingMusicId === music.id;
                        return (
                          <div
                            key={music.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              music.isActive
                                ? "bg-white border-stone-200 shadow-xs hover:border-amber-300"
                                : "bg-stone-50/80 border-stone-200 opacity-60"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handlePlayPreviewMusic(music)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                                  isPlaying
                                    ? "bg-amber-800 text-white shadow-sm ring-2 ring-amber-400/50"
                                    : "bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-900"
                                }`}
                                title={isPlaying ? "Jeda Preview" : "Putar Preview"}
                              >
                                {isPlaying ? (
                                  <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  </svg>
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-sm font-bold text-stone-900 truncate" title={music.title}>
                                    {music.title}
                                  </h4>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      music.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-stone-200 text-stone-600"
                                    }`}
                                  >
                                    {music.isActive ? "Aktif" : "Nonaktif"}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-500 truncate mt-0.5">
                                  {music.composer || "Pencipta Anonim"}
                                </p>
                                {music.genre && (
                                  <span className="inline-block mt-1 text-[10px] font-medium text-amber-900/80 bg-amber-50 px-2 py-0.5 rounded-md">
                                    {music.genre}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={music.isActive}
                                    onChange={() => handleToggleMusicActive(music.id, music.isActive)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                                <span className="text-[11px] text-stone-500">
                                  {music.isActive ? "Tampil di Klien" : "Disembunyikan"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMusic(music)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                                  title="Edit Metadata"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMusic(music.id, music.title)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Hapus Lagu"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

              {activeTab === "portfolio" && (
                <AdminPortfolioTab invitations={invitations} />
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
                  savingXendit={savingXendit}
                  setSavingXendit={setSavingXendit}
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
                  selectedGatewayVendor={selectedGatewayVendor}
                  setSelectedGatewayVendor={setSelectedGatewayVendor}
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
            </>
          )}
        </main>
      </div>

      {/* ── Add / Edit Theme Modal ── */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-lg">
                {editingTheme ? `Edit Tema: ${editingTheme.name}` : "Tambah Tema Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                title="Tutup"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {themeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{themeError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTheme} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">ID Tema (Nama file HTML)</label>
                <input
                  type="text"
                  value={themeForm.id}
                  onChange={(e) => setThemeForm({ ...themeForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="contoh: kalandra, jawa, sunda"
                  disabled={Boolean(editingTheme)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-60 focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  File HTML disimpan di <code className="font-mono text-gray-700 font-semibold">themes/{themeForm.eventType === "GATHERING" ? "general" : (themeForm.eventType || "wedding").toLowerCase()}/{themeForm.category}/{themeForm.id || "id"}.html</code>.{" "}
                  <a
                    href={`/downloads/starter-blueprint-${themeForm.eventType === "GATHERING" ? "general" : (themeForm.eventType || "wedding").toLowerCase()}.html`}
                    download={`starter-blueprint-${themeForm.eventType === "GATHERING" ? "general" : (themeForm.eventType || "wedding").toLowerCase()}.html`}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    Unduh Starter Blueprint HTML ({themeForm.eventType || "WEDDING"})
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Nama Tema</label>
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  placeholder="contoh: Kalandra"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Tipe Acara</label>
                  <select
                    value={themeForm.eventType || "WEDDING"}
                    onChange={(e) => setThemeForm({ ...themeForm, eventType: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="WEDDING">Wedding</option>
                    <option value="BIRTHDAY">Birthday</option>
                    <option value="KHITAN">Khitan</option>
                    <option value="AQIQAH">Aqiqah</option>
                    <option value="WISUDA">Wisuda</option>
                    <option value="GATHERING">Gathering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Kategori</label>
                  <select
                    value={themeForm.category}
                    onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value, series: e.target.value === "traditional" ? "Traditional" : e.target.value === "modern" ? "Modern" : "Minimalist" })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="minimalist">Minimalis</option>
                    <option value="modern">Modern</option>
                    <option value="traditional">Traditional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Urutan (Sort)</label>
                  <input
                    type="number"
                    value={themeForm.sortOrder}
                    onChange={(e) => setThemeForm({ ...themeForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={themeForm.description}
                  onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })}
                  placeholder="contoh: Modern, Elegan & Minimalis"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Master HTML File Uploader */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-800">
                    File Master Template (.html) {!editingTheme && <span className="text-red-500">*</span>}
                  </label>
                  {editingTheme && (
                    <span className="text-[10px] text-gray-400 font-normal">Opsional (Unggah jika ingin mengganti file master)</span>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-3 bg-stone-50/50 transition">
                  <input
                    type="file"
                    id="themeMasterFileInput"
                    accept=".html"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setThemeFile(f);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="themeMasterFileInput"
                    className="flex flex-col items-center justify-center cursor-pointer text-center py-2"
                  >
                    <svg className="w-6 h-6 text-amber-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {themeFile ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-emerald-700 break-all">{themeFile.name}</p>
                        <p className="text-[10px] text-gray-500">{(themeFile.size / 1024).toFixed(1)} KB — Siap disimpan</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-gray-700">
                          {editingTheme ? "Klik untuk mengganti file master .html" : "Pilih atau Seret file .html ke sini"}
                        </p>
                        <p className="text-[10px] text-gray-400">File akan otomatis disimpan ke folder themes/ dan dikompilasi ke demo statis</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Musik Default Tema — pilih dari Pustaka Musik Sistem */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-gray-800">
                  Musik Default Tema
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400">(Opsional — dipakai otomatis saat klien belum upload musik sendiri)</span>
                </label>
                <select
                  value={themeForm.defaultMusicUrl}
                  onChange={(e) => setThemeForm({ ...themeForm, defaultMusicUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">— Tidak ada (pakai fallback sistem) —</option>
                  {systemMusics.map((m: any) => (
                    <option key={m.id} value={m.url}>
                      {m.title}{m.composer ? ` — ${m.composer}` : ""}
                    </option>
                  ))}
                </select>
                {themeForm.defaultMusicUrl && (
                  <p className="text-[10px] text-stone-400 font-mono truncate" title={themeForm.defaultMusicUrl}>
                    {themeForm.defaultMusicUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                {/* Tombol Hapus — hanya muncul saat edit tema yang ada */}
                {editingTheme ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus tema "${editingTheme.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
                        setShowThemeModal(false);
                        handleDeleteTheme(editingTheme.id, editingTheme.name);
                      }
                    }}
                    className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus Tema
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={themeSaving}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {themeSaving ? "Menyimpan..." : "Simpan Tema"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit System Music Modal ── */}
      {showMusicModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {editingMusic ? "Edit Metadata Lagu" : "Tambah Lagu ke Pustaka Sistem"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !musicUploading && setShowMusicModal(false)}
                disabled={musicUploading}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMusic} className="space-y-3.5">
              {!editingMusic && (
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    File Audio (.mp3, .ogg, .wav, .m4a) <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-3.5 bg-stone-50/50 transition">
                    <input
                      type="file"
                      id="systemMusicFileInput"
                      accept="audio/mp3,audio/mpeg,audio/ogg,audio/wav,audio/m4a,audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedMusicFile(file);
                        if (file && !musicForm.title) {
                          // Auto fill title from filename without extension
                          const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                          setMusicForm((prev) => ({ ...prev, title: baseName }));
                        }
                      }}
                      className="hidden"
                      disabled={musicUploading}
                    />
                    <label
                      htmlFor="systemMusicFileInput"
                      className="flex flex-col items-center justify-center cursor-pointer text-center py-2"
                    >
                      <svg className="w-7 h-7 text-amber-700 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      {selectedMusicFile ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-emerald-700 break-all">{selectedMusicFile.name}</p>
                          <p className="text-[10px] text-gray-500">{(selectedMusicFile.size / (1024 * 1024)).toFixed(2)} MB — Siap diproses</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-gray-700">Pilih atau seret file audio ke sini</p>
                          <p className="text-[10px] text-gray-400">Otomatis dioptimalkan &amp; dikompres ke MP3 128 kbps (FFmpeg)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Judul Lagu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={musicForm.title}
                  onChange={(e) => setMusicForm({ ...musicForm, title: e.target.value })}
                  placeholder="contoh: Canon in D (Johann Pachelbel)"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  required
                  disabled={musicUploading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Pencipta / Komposer</label>
                <input
                  type="text"
                  value={musicForm.composer}
                  onChange={(e) => setMusicForm({ ...musicForm, composer: e.target.value })}
                  placeholder="contoh: Johann Pachelbel / Ludwig van Beethoven"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  disabled={musicUploading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Genre / Mood</label>
                <input
                  type="text"
                  value={musicForm.genre}
                  onChange={(e) => setMusicForm({ ...musicForm, genre: e.target.value })}
                  placeholder="contoh: Piano &amp; Strings Klasik Sakral"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                  disabled={musicUploading}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMusicModal(false)}
                  disabled={musicUploading}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={musicUploading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {musicUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Mengunggah &amp; Kompresi (FFmpeg)...</span>
                    </>
                  ) : (
                    <span>{editingMusic ? "Simpan Perubahan" : "Simpan Lagu"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Theme Demo Studio Modal ── */}
      {showDemoStudioModal && demoStudioTheme && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 5 5 0 0110 0 4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold font-serif text-lg text-stone-100">
                      Theme Demo Studio: {demoStudioTheme.name}
                    </h3>
                    <span className="font-mono text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded-full uppercase">
                      #{demoStudioTheme.id}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Kelola aset foto showroom, musik bawaan, dan cerita pasangan demo tema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href={`/demo/${demoStudioTheme.id}${demoStudioSessionTime ? `?t=${demoStudioSessionTime}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Lihat Demo Live</span>
                </a>
                <button
                  type="button"
                  onClick={handleCloseDemoStudio}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Success Feedback Alert */}
            {demoStudioUploadSuccess && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span>{demoStudioUploadSuccess}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2 pt-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDemoStudioTab("visual")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "visual"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Aset Visual &amp; Audio ({demoStudioTheme.id})
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("profile")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "profile"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Profil Pasangan &amp; Acara
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("stories")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "stories"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Kisah Cinta &amp; Rekening
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("narratives")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "narratives"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Teks Seksi &amp; Narasi Bawaan
              </button>
              <button
                type="button"
                onClick={() => setDemoStudioTab("vendors")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer shrink-0 ${
                  demoStudioTab === "vendors"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Mitra Vendor
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {demoStudioLoading ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                  Memuat data demo tema...
                </div>
              ) : (
                <>
                  {/* TAB 1: VISUAL & AUDIO ASSETS */}
                  {demoStudioTab === "visual" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed">
                        <div>
                          <strong>Panduan Aset:</strong> Foto atau Video MP4 yang diunggah akan otomatis disimpan ke folder{" "}
                          <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">
                            public/demo/{demoStudioTheme.id}/
                          </code>{" "}
                          dan langsung tampil di halaman showroom demo publik tema bersangkutan.
                        </div>
                      </div>


                      {/* Main Cover & Hero Slots Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          1. Foto Utama &amp; Banner Hero (Mendukung Video MP4 Loop)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { slot: "cover", label: "Landing Cover Mobile (Portrait 9:16)", file: "cover.webp", allowVideo: true, desc: "Tampilan layar pembuka khusus HP (Portrait 9:16 — Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "cover_desktop", label: "Landing Cover Desktop (Landscape 16:9)", file: "cover_desktop.webp", allowVideo: true, desc: "Tampilan layar pembuka khusus PC/Laptop (Landscape 16:9 — Foto WebP/JPG atau Video Loop MP4). Opsional, jika kosong pakai Cover Mobile." },
                            { slot: "hero", label: "Hero / Sidebar Desktop", file: "hero.webp", allowVideo: true, desc: "Foto portrait sidebar kolom kiri layar lebar desktop (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "background", label: "Background Global", file: "background.webp", allowVideo: true, desc: "Latar belakang fixed tema (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "home", label: "Latar Home", file: "home.webp", allowVideo: false, desc: "Background khusus seksi Home (Opsional)" },
                            { slot: "footer", label: "Foto Footer", file: "footer.webp", allowVideo: false, desc: "Foto penutup di bagian akhir undangan (Opsional)" },
                            { slot: "groom", label: "Mempelai Pria", file: "groom.webp", allowVideo: false, desc: "Foto profil pria" },
                            { slot: "bride", label: "Mempelai Wanita", file: "bride.webp", allowVideo: false, desc: "Foto profil wanita" },
                            { 
                              slot: "thumbnail_mobile", 
                              label: "Thumbnail Mobile (HP)", 
                              file: "thumbnail_mobile.webp", 
                              allowVideo: false, 
                              desc: "Ukuran pas: 400 × 800 px (Rasio 1:2 — Retina: 800 × 1600 px)" 
                            },
                            { 
                              slot: "thumbnail_desktop", 
                              label: "Thumbnail Desktop (Laptop)", 
                              file: "thumbnail_desktop.webp", 
                              allowVideo: false, 
                              desc: "Ukuran pas: 1280 × 800 px (Rasio 16:10)" 
                            },
                          ].map((item) => {
                            const isDeleted = Boolean(stagedDeletedSlots[item.slot]);
                            const isStaged = Boolean(stagedDemoFiles[item.slot]);
                            const isSaved = Boolean(updatedDemoSlots[item.slot]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === item.slot;
                            const stagedFile = stagedDemoFiles[item.slot];
                            const localPreview = localPreviews[item.slot];

                            const explicitUrl = (
                              item.slot === "cover" ? demoStudioData.landingCoverUrl :
                              item.slot === "cover_desktop" ? demoStudioData.landingCoverDesktopUrl :
                              item.slot === "hero" ? demoStudioData.sidebarPhotoUrl :
                              item.slot === "background" ? demoStudioData.globalBgUrl :
                              item.slot === "home" ? demoStudioData.homePhotoUrl :
                              item.slot === "footer" ? demoStudioData.footerPhotoUrl :
                              item.slot === "groom" ? demoStudioData.groomPhotoUrl :
                              item.slot === "bride" ? demoStudioData.bridePhotoUrl :
                              item.slot === "thumbnail_mobile" ? demoStudioData.thumbnailMobileUrl :
                              item.slot === "thumbnail_desktop" ? demoStudioData.thumbnailDesktopUrl : undefined
                            );

                            const isExplicitlyEmpty = isDeleted || explicitUrl === "";
                            const rawSavedUrl = isExplicitlyEmpty ? "" : (explicitUrl || `/demo/${demoStudioTheme.id}/${item.file}`);

                            const cacheVersion = updatedDemoSlots[item.slot] || demoStudioSessionTime;
                            const cleanBaseUrl = rawSavedUrl ? rawSavedUrl.split("?")[0] : "";
                            const savedUrl = cleanBaseUrl ? `${cleanBaseUrl}?v=${cacheVersion}` : "";

                            const effectiveSrc = isDeleted ? "" : (localPreview || savedUrl);
                            const isVideoSlot = Boolean(
                              item.allowVideo && (
                                (stagedFile && (stagedFile.type?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(stagedFile.name))) ||
                                (!stagedFile && effectiveSrc && /\.(mp4|webm|mov)(\?.*)?$/i.test(effectiveSrc))
                              )
                            );
                            return (
                              <div
                                key={item.slot}
                                className={`border rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-gray-900">{item.label}</span>
                                    {isDeleted ? (
                                      <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>✕</span> Dikosongkan
                                      </span>
                                    ) : isStaged ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>●</span> Draft Baru
                                      </span>
                                    ) : isSaved ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>✓</span> Tersimpan
                                      </span>
                                    ) : !effectiveSrc ? (
                                      <span className="text-[10px] font-semibold text-gray-400 italic">Kosong</span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-gray-400">{item.file}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                                </div>

                                <div className={`relative rounded-xl bg-stone-100 overflow-hidden border border-gray-300 flex items-center justify-center ${
                                  item.slot === "thumbnail_mobile"
                                    ? "aspect-[1/2] max-h-56 mx-auto w-auto min-w-[112px]"
                                    : item.slot === "thumbnail_desktop"
                                    ? "aspect-[16/10] w-full"
                                    : item.slot === "cover" || item.slot === "groom" || item.slot === "bride" || item.slot === "hero"
                                    ? "aspect-[3/4] max-h-56 mx-auto w-auto min-w-[140px]"
                                    : "aspect-video w-full"
                                }`}>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none text-stone-400">
                                    <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] font-medium text-stone-500">
                                      {isDeleted ? "Foto dikosongkan (tanpa foto)" : "Belum ada file / Kosong"}
                                    </span>
                                  </div>
                                  {effectiveSrc && isVideoSlot ? (
                                    <video
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover object-top relative z-1"
                                    />
                                  ) : effectiveSrc ? (
                                    <img
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      alt={item.label}
                                      className="w-full h-full object-cover object-top relative z-1"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                      onLoad={(e) => {
                                        (e.target as HTMLElement).style.display = "block";
                                      }}
                                    />
                                  ) : null}
                                  {effectiveSrc && isVideoSlot && (
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-xs text-[9px] font-bold tracking-wider text-amber-300 rounded border border-amber-500/30 pointer-events-none z-10">
                                      VIDEO MP4
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 text-white p-2 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">Menyimpan Aset...</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="flex-1 py-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-xl text-xs font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti Lagi" : effectiveSrc ? (item.allowVideo ? "Ganti File" : "Ganti Foto") : (item.allowVideo ? "Pilih Foto / Video" : "Pilih Foto")}</span>
                                    <input
                                      type="file"
                                      accept={item.allowVideo ? "image/*,video/mp4,video/webm" : "image/*"}
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(item.slot, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft aset ini"
                                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto sebelumnya"
                                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Pulihkan
                                    </button>
                                  )}
                                  {!isDeleted && effectiveSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(item.slot)}
                                      disabled={demoStudioSaving}
                                      title="Hapus / kosongkan foto slot ini"
                                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 8 Gallery Photos Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          2. Delapan Foto Galeri Showroom Demo (gallery_01 s/d gallery_08)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          {Array.from({ length: 8 }).map((_, idx) => {
                            const slotName = `gallery_0${idx + 1}`;
                            const fileName = `${slotName}.webp`;
                            const isDeleted = Boolean(stagedDeletedSlots[slotName]);
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === slotName;

                            const rawGalleryUrl = Array.isArray(demoStudioData.galleryPhotos) ? demoStudioData.galleryPhotos[idx] : undefined;
                            const isExplicitlyEmpty = isDeleted || rawGalleryUrl === "";
                            const cleanSaved = isExplicitlyEmpty ? "" : (rawGalleryUrl || `/demo/${demoStudioTheme.id}/${fileName}`);
                            const imgSrc = isDeleted ? "" : (localPreviews[slotName] || (cleanSaved ? `${cleanSaved.split("?")[0]}?v=${updatedDemoSlots[slotName] || demoStudioSessionTime}` : ""));
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Galeri #{idx + 1}</span>
                                  {isDeleted ? (
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✕</span> Dihapus
                                    </span>
                                  ) : isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : !imgSrc ? (
                                    <span className="text-[9px] font-semibold text-gray-400 italic">Kosong</span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  {imgSrc ? (
                                    <img
                                      key={isStaged ? localPreviews[slotName] : updatedDemoSlots[slotName] || imgSrc}
                                      src={imgSrc}
                                      alt={`Gallery ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none text-stone-400 bg-stone-100">
                                      <span className="text-[10px] font-medium text-stone-500">
                                        {isDeleted ? "Dikosongkan" : "Kosong"}
                                      </span>
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white p-1.5 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">Menyimpan...</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label className="flex-1 py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-lg text-[11px] font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti" : imgSrc ? "Ganti" : "Pilih"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(slotName, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft foto ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto galeri ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ↩
                                    </button>
                                  )}
                                  {!isDeleted && imgSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Hapus foto galeri ini"
                                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Contoh Foto Kenangan Tamu / Guest Memories Showcase */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            3. Contoh Foto Kenangan Tamu (Guest Memories Demo Showcase)
                          </h4>
                          <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            memory_01 s/d memory_04
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          {Array.from({ length: 4 }).map((_, idx) => {
                            const slotName = `memory_0${idx + 1}`;
                            const fileName = `${slotName}.webp`;
                            const isDeleted = Boolean(stagedDeletedSlots[slotName]);
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged && !isDeleted;
                            const isCurrentUploading = uploadingSlot === slotName;
                            const imgSrc = isDeleted ? "" : (localPreviews[slotName] || `/demo/${demoStudioTheme.id}/${fileName}?v=${updatedDemoSlots[slotName] || demoStudioSessionTime}`);
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isDeleted
                                    ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20"
                                    : isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Momen #{idx + 1}</span>
                                  {isDeleted ? (
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✕</span> Dihapus
                                    </span>
                                  ) : isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : !imgSrc ? (
                                    <span className="text-[9px] font-semibold text-gray-400 italic">Kosong</span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  {imgSrc ? (
                                    <img
                                      key={isStaged ? localPreviews[slotName] : updatedDemoSlots[slotName] || imgSrc}
                                      src={imgSrc}
                                      alt={`Memory ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (!img.src.includes("gallery_0")) {
                                          img.src = `/demo/${demoStudioTheme.id}/gallery_0${idx + 1}.webp?v=${updatedDemoSlots[slotName] || 1}`;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none text-stone-400 bg-stone-100">
                                      <span className="text-[10px] font-medium text-stone-500">
                                        {isDeleted ? "Dikosongkan" : "Kosong"}
                                      </span>
                                    </div>
                                  )}
                                  {isCurrentUploading && (
                                    <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white p-1.5 text-center z-10 animate-fade-in">
                                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">Menyimpan...</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label className="flex-1 py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-lg text-[11px] font-bold transition text-center cursor-pointer block shadow-2xs">
                                    <span>{isStaged ? "Ganti" : imgSrc ? "Ganti" : "Pilih"}</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={demoStudioSaving}
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleStageDemoAsset(slotName, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  {isStaged && (
                                    <button
                                      type="button"
                                      onClick={() => handleDiscardStagedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Batalkan draft foto ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  {isDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Pulihkan foto momen ini"
                                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ↩
                                    </button>
                                  )}
                                  {!isDeleted && imgSrc && (
                                    <button
                                      type="button"
                                      onClick={() => handleStageDeleteAsset(slotName)}
                                      disabled={demoStudioSaving}
                                      title="Hapus foto momen ini"
                                      className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Audio Musik Latar Belakang Demo (BGM) */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              4. Musik Latar Belakang Demo (Audio BGM)
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Lagu latar yang akan otomatis diputar saat pengunjung menekan tombol &ldquo;Buka Undangan&rdquo; di showroom demo publik.
                            </p>
                          </div>
                          {stagedDemoFiles["music"] ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md self-start sm:self-auto flex items-center gap-1">
                              <span>●</span> Draft Audio Baru
                            </span>
                          ) : updatedDemoSlots["music"] ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md self-start sm:self-auto flex items-center gap-1">
                              <span>✓</span> Tersimpan
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-gray-400 self-start sm:self-auto">
                              {demoStudioData.audioUrl || "music.mp3"}
                            </span>
                          )}
                        </div>

                        {/* Pilihan: Pilih dari Pustaka Sistem vs Upload Sendiri */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-8 space-y-1">
                            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                              Pilih dari Pustaka Musik Sistem ({systemMusics.length} Lagu):
                            </label>
                            <select
                              value={stagedDemoFiles["music"] ? "" : (demoStudioData.audioUrl || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (stagedDemoFiles["music"]) {
                                  handleDiscardStagedAsset("music");
                                }
                                setDemoStudioData((prev: any) => ({ ...prev, audioUrl: val }));
                              }}
                              disabled={demoStudioSaving}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer truncate"
                            >
                              <option value="">-- Pilih Lagu dari Pustaka Musik --</option>
                              {systemMusics.map((m) => (
                                <option key={m.id} value={m.url}>
                                  {m.title} {m.composer ? `(${m.composer})` : ""} {m.genre ? `• ${m.genre}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-4 flex items-center gap-2">
                            <label className="w-full px-3.5 py-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-xl text-xs font-bold transition text-center cursor-pointer block shadow-2xs truncate">
                              <span>{stagedDemoFiles["music"] ? "Ganti File Audio" : "Upload File Baru"}</span>
                              <input
                                type="file"
                                accept="audio/mpeg,audio/ogg,audio/mp3,.mp3,.ogg"
                                disabled={demoStudioSaving}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleStageDemoAsset("music", e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                            {stagedDemoFiles["music"] && (
                              <button
                                type="button"
                                onClick={() => handleDiscardStagedAsset("music")}
                                disabled={demoStudioSaving}
                                title="Batalkan file audio ini"
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Player Preview Audio */}
                        <div>
                          <audio
                            key={stagedDemoFiles["music"] ? localPreviews["music"] : updatedDemoSlots["music"] || demoStudioData.audioUrl}
                            controls
                            src={localPreviews["music"] || demoStudioData.audioUrl || `/demo/${demoStudioTheme.id}/music.mp3`}
                            className="w-full h-10 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: COUPLE PROFILE & EVENTS */}
                  {demoStudioTab === "profile" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Tagline Undangan Demo</label>
                          <input
                            type="text"
                            value={demoStudioData.tagline || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, tagline: e.target.value })}
                            placeholder={demoStudioTheme?.eventType && demoStudioTheme.eventType !== "WEDDING" ? "EXCLUSIVE INVITATION" : "THE WEDDING OF"}
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Kota / Lokasi Umum</label>
                          <input
                            type="text"
                            value={demoStudioData.city || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, city: e.target.value })}
                            placeholder="Jakarta"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Groom & Bride Info (Wedding) vs Persona Info (Non-Wedding) */}
                      {(!demoStudioTheme?.eventType || demoStudioTheme?.eventType === "WEDDING") ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                          {/* Groom */}
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Mempelai Pria (Demo)</span>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.groomName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomName: e.target.value })}
                                placeholder="Raditya"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap &amp; Gelar</label>
                              <input
                                type="text"
                                value={demoStudioData.groomDisplayName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomDisplayName: e.target.value })}
                                placeholder="Raditya Pratama, S.T."
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ayah Pria</label>
                                <input
                                  type="text"
                                  value={demoStudioData.groomFather || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, groomFather: e.target.value })}
                                  placeholder="Contoh: Ir. Hendra Pratama / Alm. Hendra Pratama"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ibu Pria</label>
                                <input
                                  type="text"
                                  value={demoStudioData.groomMother || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, groomMother: e.target.value })}
                                  placeholder="Contoh: Ratna Dewi / Almh. Ratna Dewi"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Instagram (@)</label>
                              <input
                                type="text"
                                value={demoStudioData.groomInstagram || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomInstagram: e.target.value })}
                                placeholder="raditya.pratama"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>

                          {/* Bride */}
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Mempelai Wanita (Demo)</span>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.brideName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideName: e.target.value })}
                                placeholder="Alana"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap &amp; Gelar</label>
                              <input
                                type="text"
                                value={demoStudioData.brideDisplayName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideDisplayName: e.target.value })}
                                placeholder="Alana Khairunnisa, B.Des."
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ayah Wanita</label>
                                <input
                                  type="text"
                                  value={demoStudioData.brideFather || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, brideFather: e.target.value })}
                                  placeholder="Contoh: Dr. Faisal Basri / Alm. Faisal Basri"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ibu Wanita</label>
                                <input
                                  type="text"
                                  value={demoStudioData.brideMother || ""}
                                  onChange={(e) => setDemoStudioData({ ...demoStudioData, brideMother: e.target.value })}
                                  placeholder="Contoh: Soraya Latief / Almh. Soraya Latief"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Instagram (@)</label>
                              <input
                                type="text"
                                value={demoStudioData.brideInstagram || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, brideInstagram: e.target.value })}
                                placeholder="alana.khairunnisa"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                          <span className="text-xs font-bold text-amber-900 uppercase font-mono block">Profil Utama (Demo {demoStudioTheme.eventType})</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Panggilan</label>
                              <input
                                type="text"
                                value={demoStudioData.groomName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomName: e.target.value })}
                                placeholder="Farhan"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Lengkap</label>
                              <input
                                type="text"
                                value={demoStudioData.groomDisplayName || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomDisplayName: e.target.value })}
                                placeholder="Farhan Pratama"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ayah</label>
                              <input
                                type="text"
                                value={demoStudioData.groomFather || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomFather: e.target.value })}
                                placeholder="Bpk. Hendra"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Ibu</label>
                              <input
                                type="text"
                                value={demoStudioData.groomMother || ""}
                                onChange={(e) => setDemoStudioData({ ...demoStudioData, groomMother: e.target.value })}
                                placeholder="Ibu Rina"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quotes & Dates */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">Kutipan Pembuka (Opening Quote)</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.openingQuote || ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuote: e.target.value })}
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1">Referensi / Dalil Kutipan</label>
                            <input
                              type="text"
                              value={demoStudioData.openingQuoteRef || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuoteRef: e.target.value })}
                              placeholder="QS. AR-RUM : 21"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-800 mb-1">Format Tanggal Pernikahan Teks</label>
                            <input
                              type="text"
                              value={demoStudioData.weddingDateFormatted || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, weddingDateFormatted: e.target.value })}
                              placeholder="Sabtu, 14 November 2026"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Timeline & Sesi Acara Demo */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Timeline &amp; Rangkaian Acara Demo
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola sesi acara (Akad Nikah, Resepsi, Walimah, dll.) untuk tema ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const events = [...(demoStudioData.events || [])];
                              events.push({
                                badge: "RESEPSI",
                                title: "Sesi Acara Baru",
                                time: "11.00 – 14.00 WIB",
                                location: demoStudioData.city ? `Ballroom di ${demoStudioData.city}` : "Ballroom Hotel",
                                address: demoStudioData.city ? `Jl. Utama No. 1, ${demoStudioData.city}` : "Jl. Utama No. 1",
                                mapsUrl: "https://maps.google.com",
                              });
                              setDemoStudioData({ ...demoStudioData, events });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Acara</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.events || []).length === 0 ? (
                            <div className="p-4 bg-white border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada sesi acara. Klik &quot;Tambah Acara&quot; di atas untuk menambahkan.
                            </div>
                          ) : (
                            (demoStudioData.events || []).map((ev: any, evIdx: number) => (
                              <div key={evIdx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Sesi {evIdx + 1}: {ev.title || "Acara"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const events = (demoStudioData.events || []).filter((_: any, idx: number) => idx !== evIdx);
                                      setDemoStudioData({ ...demoStudioData, events });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Acara
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Kategori / Badge Sesi</label>
                                    <input
                                      type="text"
                                      value={ev.badge || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].badge = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="AKAD NIKAH / RESEPSI"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white uppercase font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama / Judul Acara</label>
                                    <input
                                      type="text"
                                      value={ev.title || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].title = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="Akad Nikah &amp; Resepsi"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Waktu / Jam Pelaksanaan</label>
                                    <input
                                      type="text"
                                      value={ev.time || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].time = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="08.00 – 11.00 WIB"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama Tempat / Gedung</label>
                                    <input
                                      type="text"
                                      value={ev.location || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].location = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="Grand Ballroom Gedong Putih"
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Link Google Maps</label>
                                    <input
                                      type="text"
                                      value={ev.mapsUrl || ""}
                                      onChange={(e) => {
                                        const events = [...(demoStudioData.events || [])];
                                        events[evIdx].mapsUrl = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, events });
                                      }}
                                      placeholder="https://maps.google.com/..."
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-blue-600 font-mono"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Alamat Lengkap</label>
                                  <textarea
                                    rows={2}
                                    value={ev.address || ""}
                                    onChange={(e) => {
                                      const events = [...(demoStudioData.events || [])];
                                      events[evIdx].address = e.target.value;
                                      setDemoStudioData({ ...demoStudioData, events });
                                    }}
                                    placeholder="Jl. Villa Triniti KM 4.7, Parongpong, Bandung Barat"
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white resize-none"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LOVE STORIES & BANK ACCOUNTS */}
                  {demoStudioTab === "stories" && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Kisah Cinta Demo (Love Story Chapters)
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola bab alur cerita cinta yang ditampilkan pada demo tema ini.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const stories = [...(demoStudioData.stories || [])];
                              stories.push({
                                chapter: `Bab ${stories.length + 1}`,
                                title: "Momen Indah",
                                content: "",
                              });
                              setDemoStudioData({ ...demoStudioData, stories });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Bab Cerita</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.stories || []).length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada bab cerita cinta. Klik &quot;Tambah Bab Cerita&quot; di atas untuk menambahkan.
                            </div>
                          ) : (
                            (demoStudioData.stories || []).map((story: any, sIdx: number) => (
                              <div key={sIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Bab {sIdx + 1}: {story.title || "Kisah"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const stories = (demoStudioData.stories || []).filter((_: any, idx: number) => idx !== sIdx);
                                      setDemoStudioData({ ...demoStudioData, stories });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Bab
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Label / Bab</label>
                                    <input
                                      type="text"
                                      value={story.chapter || ""}
                                      onChange={(e) => {
                                        const stories = [...(demoStudioData.stories || [])];
                                        stories[sIdx].chapter = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, stories });
                                      }}
                                      placeholder="Pertemuan / Lamaran"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Judul Bab</label>
                                    <input
                                      type="text"
                                      value={story.title || ""}
                                      onChange={(e) => {
                                        const stories = [...(demoStudioData.stories || [])];
                                        stories[sIdx].title = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, stories });
                                      }}
                                      placeholder="Langkah Awal"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Isi Cerita</label>
                                  <textarea
                                    rows={2}
                                    value={story.content || ""}
                                    onChange={(e) => {
                                      const stories = [...(demoStudioData.stories || [])];
                                      stories[sIdx].content = e.target.value;
                                      setDemoStudioData({ ...demoStudioData, stories });
                                    }}
                                    placeholder="Ceritakan momen indah perjalanan cinta..."
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white resize-none"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Bank Accounts */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              Rekening Hadiah Digital Demo
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Kelola rekening bank atau dompet digital untuk fitur tanda kasih.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const banks = [...(demoStudioData.banks || [])];
                              banks.push({
                                bank: "BCA",
                                number: "",
                                name: demoStudioData.groomName || "Mempelai",
                              });
                              setDemoStudioData({ ...demoStudioData, banks });
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Tambah Rekening</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(demoStudioData.banks || []).length === 0 ? (
                            <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                              Belum ada rekening demo. Klik &quot;Tambah Rekening&quot; di atas.
                            </div>
                          ) : (
                            (demoStudioData.banks || []).map((bank: any, bIdx: number) => (
                              <div key={bIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                  <span className="text-xs font-bold text-amber-900 font-mono">Rekening {bIdx + 1}: {bank.bank || "Bank"}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const banks = (demoStudioData.banks || []).filter((_: any, idx: number) => idx !== bIdx);
                                      setDemoStudioData({ ...demoStudioData, banks });
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                                  >
                                    Hapus Rekening
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama Bank / Wallet</label>
                                    <input
                                      type="text"
                                      value={bank.bank || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].bank = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="Bank BCA / Mandiri / BSI"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Nomor Rekening</label>
                                    <input
                                      type="text"
                                      value={bank.number || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].number = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="8830192831"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Atas Nama (Pemilik)</label>
                                    <input
                                      type="text"
                                      value={bank.name || ""}
                                      onChange={(e) => {
                                        const banks = [...(demoStudioData.banks || [])];
                                        banks[bIdx].name = e.target.value;
                                        setDemoStudioData({ ...demoStudioData, banks });
                                      }}
                                      placeholder="Raditya Pratama"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: THEME BLUEPRINT & SECTION TEXTS */}
                  {demoStudioTab === "narratives" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed">
                        <div>
                          <strong>Cetak Biru Teks Bawaan Tema:</strong> Teks dan narasi di bawah ini merupakan teks penulisan bawaan untuk tema <strong>{demoStudioTheme.name}</strong>. Ketika calon klien memilih tema ini di dashboard, teks inilah yang otomatis dimuat ke formulir undangan mereka (tidak disamaratakan).
                        </div>
                      </div>

                      {/* Sub-Panel 1: Kutipan Pembuka & Sampul */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            1. Pembuka &amp; Sampul Undangan (Cover Section)
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Opening &amp; Cover</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan Ayat / Kata Mutiara Pembuka</label>
                          <textarea
                            rows={3}
                            value={demoStudioData.openingQuote ?? currentDemoBlueprint?.openingQuote ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuote: e.target.value })}
                            placeholder="Kutipan pembuka..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Rujukan / Sumber Kutipan</label>
                            <input
                              type="text"
                              value={demoStudioData.openingQuoteRef ?? currentDemoBlueprint?.openingQuoteRef ?? ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, openingQuoteRef: e.target.value })}
                              placeholder="QS. AR-RUM: 21"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Label Tombol Buka Undangan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.openBtn ?? currentDemoBlueprint?.openBtn ?? "Buka Undangan"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.openBtn = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Buka Undangan"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Subjudul Sampul / Teks Undangan</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.coverSubtitle ?? currentDemoBlueprint?.coverSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.coverSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Tanpa mengurangi rasa hormat..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 2: Seksi Mempelai & Acara */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            2. Teks Seksi Mempelai &amp; Rangkaian Acara
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Couple &amp; Events</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Mempelai</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.coupleTitle ?? currentDemoBlueprint?.coupleSectionTitle ?? "Mempelai"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.coupleTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Mempelai / The Couple"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Rangkaian Acara</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.eventsTitle ?? currentDemoBlueprint?.eventsSectionTitle ?? "Rangkaian Acara"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.eventsTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Rangkaian Acara"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Mempelai</label>
                            <textarea
                              rows={2}
                              value={demoStudioData.customLabels?.coupleSub ?? currentDemoBlueprint?.coupleSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.coupleSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Dengan penuh rasa syukur..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Rangkaian Acara</label>
                            <textarea
                              rows={2}
                              value={demoStudioData.customLabels?.eventsSub ?? currentDemoBlueprint?.eventsSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.eventsSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Merupakan suatu kehormatan dan kebahagiaan bagi kami..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 3: Seksi Kisah Cinta & Galeri Momen */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            3. Teks Seksi Kisah Cinta &amp; Galeri Momen
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Story &amp; Gallery</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Kisah Cinta (Story)</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.storyTitle ?? currentDemoBlueprint?.storySectionTitle ?? "Love Story"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.storyTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Love Story / Cerita Cinta"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow / Subjudul Kisah Cinta</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.storyEyebrow ?? currentDemoBlueprint?.storySectionEyebrow ?? "Our Journey"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.storyEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Our Journey / Perjalanan Kisah Kami"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Galeri Momen</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.galleryTitle ?? currentDemoBlueprint?.gallerySectionTitle ?? "Our Moments"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.galleryTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Our Moments / Galeri Momen"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow / Subjudul Galeri</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.galleryEyebrow ?? currentDemoBlueprint?.gallerySectionEyebrow ?? "Sweet Memories"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.galleryEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Sweet Memories / Momen Bahagia"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan / Narasi Pengantar Galeri</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.galleryQuote ?? currentDemoBlueprint?.galleryQuote ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.galleryQuote = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Kebahagiaan yang terabadikan dalam setiap bingkai cerita kami."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 4: Seksi Dress Code & Live Streaming */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            4. Teks Dress Code &amp; Live Streaming
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Dress Code &amp; Streaming</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Dress Code</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.dressCodeTitle ?? currentDemoBlueprint?.dressCodeTitle ?? "Dress Code"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.dressCodeTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Dress Code / Aturan Busana"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Dress Code</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.dressCodeEyebrow ?? currentDemoBlueprint?.dressCodeEyebrow ?? "Attire Guide"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.dressCodeEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Attire Guide / Panduan Busana"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Panduan Dress Code</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.dressCodeSubtitle ?? currentDemoBlueprint?.dressCodeSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.dressCodeSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Nuansa pakaian yang disarankan untuk keharmonisan momen istimewa kami"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Live Streaming</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.streamingTitle ?? currentDemoBlueprint?.streamingTitle ?? "Live Streaming"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.streamingTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Live Streaming"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Live Streaming</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.streamingEyebrow ?? currentDemoBlueprint?.streamingEyebrow ?? "Virtual Attendance"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.streamingEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Virtual Attendance / Siaran Langsung"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Live Streaming</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.streamingSubtitle ?? currentDemoBlueprint?.streamingSubtitle ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.streamingSubtitle = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Bagi keluarga dan sahabat yang berhalangan hadir secara langsung, Anda dapat menyaksikan momen bahagia kami secara virtual."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Sub-Panel 5: Seksi Tanda Kasih & Turut Mengundang */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            5. Teks Tanda Kasih &amp; Turut Mengundang
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Gifts &amp; Family</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Tanda Kasih</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.giftTitle ?? currentDemoBlueprint?.giftSectionTitle ?? "Tanda Kasih"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.giftTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Tanda Kasih / Digital Gift"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Tanda Kasih</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.giftEyebrow ?? currentDemoBlueprint?.giftSectionEyebrow ?? "Wedding Gift"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.giftEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Digital Gift / Kirim Hadiah"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Tanda Kasih</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.customLabels?.giftDesc ?? currentDemoBlueprint?.giftSectionDesc ?? ""}
                            onChange={(e) => {
                              const customLabels = { ...(demoStudioData.customLabels || {}) };
                              customLabels.giftDesc = e.target.value;
                              setDemoStudioData({ ...demoStudioData, customLabels });
                            }}
                            placeholder="Doa restu Anda adalah hadiah terindah bagi kami..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangTitle ?? currentDemoBlueprint?.turutMengundangTitle ?? "Turut Mengundang"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Turut Mengundang"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangEyebrow ?? currentDemoBlueprint?.turutMengundangEyebrow ?? "Hormat Kami"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Hormat Kami"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Subjudul Turut Mengundang</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.turutMengundangSubtitle ?? currentDemoBlueprint?.turutMengundangSubtitle ?? "Keluarga Besar"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.turutMengundangSubtitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Keluarga Besar"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 6: Doa Penutup, RSVP & Ucapan */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                            6. Doa Penutup, Ucapan &amp; RSVP
                          </h4>
                          <span className="text-[10px] font-mono text-gray-400">Closing &amp; Wishes</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Kutipan Doa / Narasi Penutup</label>
                          <textarea
                            rows={2}
                            value={demoStudioData.closingQuote ?? currentDemoBlueprint?.closingQuote ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, closingQuote: e.target.value })}
                            placeholder="Merupakan suatu kehormatan dan kebahagiaan bagi kami..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 resize-none focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Salam Penutup / Tanda Hormat Keluarga</label>
                          <input
                            type="text"
                            value={demoStudioData.closingSub ?? currentDemoBlueprint?.closingSub ?? ""}
                            onChange={(e) => setDemoStudioData({ ...demoStudioData, closingSub: e.target.value })}
                            placeholder="Salam hangat dari keluarga besar..."
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi RSVP</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.rsvpTitle ?? currentDemoBlueprint?.rsvpTitle ?? "Konfirmasi Kehadiran & Doa"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.rsvpTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="RSVP & Doa"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Label Tombol RSVP</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.rsvpBtnText ?? currentDemoBlueprint?.rsvpBtnText ?? "Kirim Konfirmasi Kehadiran"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.rsvpBtnText = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Kirim Konfirmasi Kehadiran"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi Ucapan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.wishesTitle ?? currentDemoBlueprint?.wishesSectionTitle ?? "Ucapan & Doa Restu"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.wishesTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Ucapan & Doa Restu"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengantar Ucapan</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.wishesSub ?? currentDemoBlueprint?.wishesSectionSub ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.wishesSub = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels });
                              }}
                              placeholder="Berikan doa & restu untuk kedua mempelai"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: MITRA VENDOR */}
                  {demoStudioTab === "vendors" && (
                    <div className="space-y-6">
                      {/* Info Banner */}
                      <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          i
                        </div>
                        <div>
                          <strong>Desain Bersih &amp; Melayang (No Card Wrap):</strong> Atur logo, nama, dan tautan mitra vendor (fotografer, MUA, dekorasi, busana) untuk tema <strong>{demoStudioTheme.name}</strong>. Seluruh logo transparan tampil melayang elegan langsung di atas kanvas tema tanpa bingkai kartu di atas footer.
                        </div>
                      </div>

                      {/* Panel 1: Switch Tampilkan Section Vendor & Label Kustom */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                              1. Pengaturan &amp; Visibilitas Seksi Vendor
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Tentukan apakah seksi mitra vendor ditampilkan pada demo publik tema ini.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={demoStudioData.showVendors !== false}
                              onChange={(e) => {
                                setDemoStudioData({
                                  ...demoStudioData,
                                  showVendors: e.target.checked,
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            <span className="ml-2.5 text-xs font-bold text-gray-800">
                              {demoStudioData.showVendors !== false ? "Aktif (Tampil)" : "Nonaktif (Sembunyi)"}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Seksi</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorTitle ?? demoStudioData.vendorTitle ?? "Vendor"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorTitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorTitle: e.target.value });
                              }}
                              placeholder="Vendor / Event Partners"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Eyebrow Seksi</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorEyebrow ?? demoStudioData.vendorEyebrow ?? "SPECIAL THANKS"}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorEyebrow = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorEyebrow: e.target.value });
                              }}
                              placeholder="SPECIAL THANKS"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Subtitle / Catatan (Opsional)</label>
                            <input
                              type="text"
                              value={demoStudioData.customLabels?.vendorSubtitle ?? demoStudioData.vendorSubtitle ?? ""}
                              onChange={(e) => {
                                const customLabels = { ...(demoStudioData.customLabels || {}) };
                                customLabels.vendorSubtitle = e.target.value;
                                setDemoStudioData({ ...demoStudioData, customLabels, vendorSubtitle: e.target.value });
                              }}
                              placeholder="Terima kasih kepada seluruh mitra..."
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Panel 2: Daftar Mitra Vendor & Upload Logo */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                              <span>2. Daftar Logo &amp; Profil Mitra Vendor</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300/70">
                                {((demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || []).length} Vendor
                              </span>
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">Unggah logo PNG transparan dan atur tautan media sosial mitra.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const dummyVendors = [
                                  { id: "v_1", name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
                                  { id: "v_2", name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
                                  { id: "v_3", name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
                                  { id: "v_4", name: "Royal Wedding Car", logoUrl: "/uploads/logo_dummy/logo_4.png", url: "https://instagram.com" },
                                ];
                                setDemoStudioData({
                                  ...demoStudioData,
                                  vendors: dummyVendors,
                                });
                              }}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                              title="Muat 4 Logo Dummy Default (AMS, Pick Your Photo, Sore Hari, Royal Wedding Car)"
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                              <span>Muat 4 Logo Dummy Default</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const curVendors = [...((demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || [])];
                                curVendors.push({
                                  id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  name: "",
                                  logoUrl: "",
                                  url: "",
                                });
                                setDemoStudioData({ ...demoStudioData, vendors: curVendors });
                              }}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                              <span>Tambah Vendor</span>
                            </button>
                          </div>
                        </div>

                        {/* List Vendor Items */}
                        <div className="space-y-2.5">
                          {(() => {
                            const curVendors = (demoStudioData.vendors || demoStudioData.featureSettings?.vendors) || [];
                            if (curVendors.length === 0) {
                              return (
                                <div className="p-8 bg-white border border-dashed border-gray-300 rounded-xl text-center space-y-3">
                                  <div className="w-10 h-10 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xs font-bold">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-700">Belum Ada Mitra Vendor</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Tambahkan logo vendor secara manual atau klik tombol di bawah untuk memuat 4 logo dummy transparan default.</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dummyVendors = [
                                        { id: "v_1", name: "AMS Creative Studio", logoUrl: "/uploads/logo_dummy/logo_1.png", url: "https://instagram.com" },
                                        { id: "v_2", name: "Pick Your Photo", logoUrl: "/uploads/logo_dummy/logo_2.png", url: "https://instagram.com" },
                                        { id: "v_3", name: "Sore Hari Floral & Styling", logoUrl: "/uploads/logo_dummy/logo_3.png", url: "https://instagram.com" },
                                        { id: "v_4", name: "Royal Wedding Car", logoUrl: "/uploads/logo_dummy/logo_4.png", url: "https://instagram.com" },
                                      ];
                                      setDemoStudioData({
                                        ...demoStudioData,
                                        vendors: dummyVendors,
                                      });
                                    }}
                                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                                  >
                                    Muat 4 Logo Dummy Default
                                  </button>
                                </div>
                              );
                            }

                            return curVendors.map((vendor: any, vIdx: number) => {
                              const vendorSlot = `vendor_${vIdx + 1}`;
                              return (
                                <div 
                                  key={vendor.id || vIdx} 
                                  className="p-2 sm:p-2.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3"
                                >
                                  {/* Nomor urut */}
                                  <span className="hidden sm:flex w-6 h-6 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-mono font-bold items-center justify-center shrink-0">
                                    {vIdx + 1}
                                  </span>

                                  {/* Slot Logo Mini */}
                                  <div className="relative shrink-0 flex items-center gap-1.5">
                                    <label 
                                      className="w-16 h-10 rounded-lg border border-dashed border-stone-300 hover:border-amber-600 bg-stone-50 hover:bg-amber-50/30 flex items-center justify-center p-1 transition cursor-pointer relative group/logo overflow-hidden" 
                                      title={vendor.logoUrl ? `Logo: ${vendor.logoUrl} (Klik untuk ganti berkas)` : "Klik untuk unggah berkas logo"}
                                    >
                                      <input
                                        type="file"
                                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !demoStudioTheme) return;
                                          try {
                                            setUploadingSlot(vendorSlot);
                                            const fd = new FormData();
                                            fd.append("slot", vendorSlot);
                                            fd.append("file", file);
                                            const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset`, {
                                              method: "POST",
                                              body: fd,
                                            });
                                            const json = await res.json();
                                            if (json.success && json.rawUrl) {
                                              const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: json.rawUrl } : v);
                                              setDemoStudioData({ ...demoStudioData, vendors: updated });
                                            } else {
                                              alert(json.error || "Gagal mengunggah logo vendor");
                                            }
                                          } catch (err: any) {
                                            alert(err.message || "Error mengunggah logo");
                                          } finally {
                                            setUploadingSlot(null);
                                          }
                                        }}
                                      />
                                      {uploadingSlot === vendorSlot ? (
                                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                      ) : vendor.logoUrl ? (
                                        <img 
                                          src={vendor.logoUrl} 
                                          alt={vendor.name || "Logo"} 
                                          className="max-h-8 max-w-full object-contain" 
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center text-stone-400 group-hover/logo:text-amber-700">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                          <span className="text-[8px] font-semibold tracking-tight mt-0.5">+ Logo</span>
                                        </div>
                                      )}
                                    </label>

                                    {/* Tombol Input URL Manual */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentUrl = vendor.logoUrl || "";
                                        const inputUrl = window.prompt("Masukkan URL Logo Vendor (misal: /uploads/logo_dummy/logo_1.png atau URL eksternal):", currentUrl);
                                        if (inputUrl !== null) {
                                          const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: inputUrl.trim() } : v);
                                          setDemoStudioData({ ...demoStudioData, vendors: updated });
                                        }
                                      }}
                                      className="text-stone-400 hover:text-amber-700 p-1 rounded transition cursor-pointer"
                                      title="Tautkan URL logo kustom secara manual"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    </button>

                                    {vendor.logoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, logoUrl: "" } : v);
                                          setDemoStudioData({ ...demoStudioData, vendors: updated });
                                        }}
                                        className="text-stone-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                        title="Hapus logo (gunakan hanya teks nama)"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    )}
                                  </div>

                                  {/* Input Nama Vendor */}
                                  <div className="flex-1 min-w-[140px]">
                                    <input
                                      type="text"
                                      value={vendor.name || ""}
                                      onChange={(e) => {
                                        const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, name: e.target.value } : v);
                                        setDemoStudioData({ ...demoStudioData, vendors: updated });
                                      }}
                                      placeholder="Nama Vendor (misal: AMS Creative Studio)"
                                      className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                    />
                                  </div>

                                  {/* Input Tautan / Instagram */}
                                  <div className="flex-1 min-w-[140px]">
                                    <input
                                      type="text"
                                      value={vendor.url || ""}
                                      onChange={(e) => {
                                        const updated = curVendors.map((v: any, i: number) => i === vIdx ? { ...v, url: e.target.value } : v);
                                        setDemoStudioData({ ...demoStudioData, vendors: updated });
                                      }}
                                      placeholder="@instagram atau https://..."
                                      className="w-full px-3 py-2 text-xs bg-stone-50/60 focus:bg-white border border-stone-200 focus:border-amber-600 rounded-lg text-stone-800 focus:outline-none transition"
                                    />
                                  </div>

                                  {/* Tombol Hapus Vendor */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = curVendors.filter((_: any, i: number) => i !== vIdx);
                                      setDemoStudioData({ ...demoStudioData, vendors: updated });
                                    }}
                                    className="self-end sm:self-center p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                                    title="Hapus vendor ini"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {isDemoStudioDirty ? (
                  <div className="flex items-center gap-2 text-amber-900 font-semibold bg-amber-100/70 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                    <span>Ada perubahan draft yang belum disimpan.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0"></span>
                    <span>Tidak ada perubahan baru.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDemoStudio}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-white transition cursor-pointer"
                >
                  {isDemoStudioDirty ? "Batal" : "Tutup"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllDemoChanges}
                  disabled={!isDemoStudioDirty || demoStudioSaving}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 ${
                    isDemoStudioDirty && !demoStudioSaving
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 cursor-pointer shadow-md"
                      : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  {demoStudioSaving && (
                    <svg className="animate-spin h-3.5 w-3.5 text-stone-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{demoStudioSaving ? "Menyimpan ke Demo..." : "Simpan Perubahan Demo"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pratinjau Bukti Transfer ── */}
      {previewProofOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-6 py-4 bg-stone-950 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Bukti Transfer Pembayaran</h3>
                  <span className="font-mono text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {previewProofOrder.invoiceNumber}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {previewProofOrder.user?.name || "Klien"} ({previewProofOrder.user?.email}) &bull; Rp {Number(previewProofOrder.amount).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofOrder(null)}
                className="p-1 text-stone-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body: Image Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-stone-900 flex items-center justify-center min-h-[300px]">
              {previewProofOrder.proofImageUrl ? (
                <div className="relative group max-h-[60vh]">
                  <img
                    src={previewProofOrder.proofImageUrl}
                    alt="Bukti Transfer"
                    className="max-h-[58vh] max-w-full rounded-2xl shadow-xl object-contain mx-auto border border-white/10"
                  />
                  <div className="absolute top-3 right-3">
                    <a
                      href={previewProofOrder.proofImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-xs transition flex items-center gap-1.5 border border-white/20"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Buka Ukuran Penuh</span>
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-stone-400 text-xs italic">Bukti gambar tidak tersedia</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewProofOrder(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-white transition cursor-pointer"
              >
                Tutup
              </button>

              {previewProofOrder.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalOrder(previewProofOrder);
                      setRejectReasonInput("Bukti transfer tidak valid atau nominal tidak sesuai.");
                    }}
                    disabled={processingOrderAction}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    Tolak Transaksi
                  </button>

                  {orderActionFeedback && orderActionFeedback.id === previewProofOrder.id && orderActionFeedback.type === "success" ? (
                    <div className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in zoom-in-95 duration-150">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {orderActionFeedback.msg}
                    </div>
                  ) : confirmApproveOrderId === previewProofOrder.id ? (
                    <div className="flex items-center gap-1.5 p-1 bg-emerald-950/10 border border-emerald-500/40 rounded-xl animate-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => handleApproveOrder(previewProofOrder.id)}
                        disabled={processingOrderAction}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {processingOrderAction ? "Memproses..." : "Ya, Lunas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmApproveOrderId(null)}
                        disabled={processingOrderAction}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmApproveOrderId(previewProofOrder.id)}
                      disabled={processingOrderAction}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                    >
                      Konfirmasi LUNAS
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tolak Transaksi ── */}
      {rejectModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-gray-100 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Tolak Pembayaran</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Invoice: <span className="font-mono font-bold text-gray-800">{rejectModalOrder.invoiceNumber}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Alasan Penolakan (akan disimpan di sistem):
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Contoh: Bukti transfer buram / dana belum masuk rekening / nominal tidak sesuai"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleRejectOrder}
                disabled={processingOrderAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {processingOrderAction ? "Memproses..." : "Tolak Pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- Kelola Klien Modal --- */}
      {manageClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setManageClient(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Kelola Klien</h3>
                <p className="text-xs text-gray-500">ID: {manageClient.id}</p>
              </div>
              <button onClick={() => setManageClient(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {clientActionMsg && (
                <div className={`mb-5 p-3 rounded-xl text-sm font-medium ${clientActionMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {clientActionMsg.msg}
                </div>
              )}
              
              {(() => {
                const activeInv = manageClient.invitations?.[0];
                let eventDateStr = "-";
                let eventDate = null;
                
                if (activeInv?.eventData) {
                  try {
                    const parsed = JSON.parse(activeInv.eventData);
                    if (parsed[0]?.date) {
                      eventDate = new Date(parsed[0].date);
                      eventDateStr = eventDate.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
                    }
                  } catch(e) {}
                }
                
                let expiredStr = "-";
                if (activeInv?.expiresAt) {
                  expiredStr = new Date(activeInv.expiresAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
                } else if (eventDate) {
                  const retentionDays = parseInt(settingsMap["retention_cleanup_days"] || "14", 10);
                  const calculatedExpiry = new Date(eventDate.getTime() + (retentionDays * 24 * 60 * 60 * 1000));
                  expiredStr = calculatedExpiry.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
                }
                
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="text-xs text-gray-400 font-medium mb-1">Nama Lengkap</div>
                      <div className="text-sm font-bold text-gray-900">{manageClient.name}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="text-xs text-gray-400 font-medium mb-1">Email</div>
                      <div className="text-sm font-mono text-gray-700">{manageClient.email}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="text-xs text-gray-400 font-medium mb-1">Tanggal Terdaftar</div>
                      <div className="text-sm text-gray-700">{new Date(manageClient.createdAt).toLocaleString("id-ID")}</div>
                    </div>
                    
                    {/* Data Undangan Tambahan */}
                    {activeInv && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-xs text-gray-400 font-medium mb-1">Tanggal Acara Utama</div>
                          <div className="text-sm font-bold text-indigo-700">{eventDateStr}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-xs text-gray-400 font-medium mb-1">Masa Aktif Berakhir</div>
                          <div className="text-sm font-bold text-rose-600">{expiredStr}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}


              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleImpersonateClient(manageClient.id, manageClient.email, manageClient.name)}
                  disabled={impersonatingClient}
                  className="w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {impersonatingClient ? "Menghubungkan ke Dasbor..." : "Remote Dasbor Klien Ini"}
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-rose-600 mb-2">Zona Berbahaya</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Menghapus akun klien akan menghapus semua undangan, pengaturan, aset media, dan histori transaksi klien ini secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
                <button
                  type="button"
                  onClick={() => handleDeleteClient(manageClient.id)}
                  disabled={deletingClient}
                  className="w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingClient ? (
                    <>
                      <span className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></span>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Hapus Akun Klien Permanen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
