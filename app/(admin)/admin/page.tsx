"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getApexRootDomain, getInvitationPublicUrl } from "@/lib/domainUtils";
import { BrandLogo } from "@/components/BrandLogo";

import { AdminProfileSettings } from "@/components/admin/AdminProfileSettings";
import { AdminTeamManagement } from "@/components/admin/AdminTeamManagement";
import { AdminPortfolioTab } from "@/components/admin/AdminPortfolioTab";
import { startRemoteSession } from "./actions/remote";
import { compressImageToWebP } from "@/lib/clientImageCompressor";

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

function SettingsCard({
  title,
  description,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  isDirty,
  saveSuccess,
  saveSuccessMessage = "Pengaturan berhasil disimpan",
  viewContent,
  children,
}: {
  title: string;
  description: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  isDirty?: boolean;
  saveSuccess?: boolean;
  saveSuccessMessage?: string;
  viewContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
        isEditing
          ? "border-amber-400 ring-2 ring-amber-400/20"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Ubah</span>
          </button>
        )}
      </div>

      {/* Save Success Banner */}
      {saveSuccess && !isEditing && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Body: View Mode or Edit Mode */}
      {isEditing ? (
        <div className="space-y-4">
          {children}

          {/* Edit Mode Footer Buttons */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs">
              {isDirty ? (
                <span className="text-amber-700 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                  Ada perubahan yang belum disimpan
                </span>
              ) : (
                <span className="text-gray-400">Tidak ada perubahan data</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={!isDirty || saving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">{viewContent}</div>
      )}
    </div>
  );
}

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-400 mb-1.5">{description}</p>}
      {children}
    </div>
  );
}

const AVAILABLE_CAPABILITIES = [
  { id: "guest_memories", label: "Galeri Kenangan Tamu (Live Photo Drop)" },
  { id: "qr_checkin", label: "QR Code Check-in Tamu" }
];
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [orderTab, setOrderTab] = useState("PENDING"); // PENDING, PAID, FAILED, SEMUA
  const [clientPage, setClientPage] = useState(1);
  const [manageClient, setManageClient] = useState<any | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [clientActionMsg, setClientActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatingClient, setImpersonatingClient] = useState(false);

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

  const userRole = (session?.user as any)?.role || "CLIENT";
  const filteredTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (userRole === "SUPER_ADMIN") return true;
      if (userRole === "FINANCE") return ["overview", "orders", "users"].includes(tab.id);
      if (userRole === "SUPPORT") return ["users", "invitations"].includes(tab.id);
      return false;
    });
  }, [userRole]);

  // Strict session enforcement
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
    } else if (status === "authenticated") {
      const isAdmin =
        (session?.user as any)?.isAdmin === true ||
        (session?.user as any)?.role === "ADMIN" ||
        (session?.user as any)?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.replace("/admin/login");
      }
    }
  }, [status, session, router]);

  // Data state
  const [stats, setStats] = useState<any>({ invitationCount: 0, orderCount: 0, guestCount: 0, userCount: 0, publishedInvitationCount: 0, draftInvitationCount: 0, rsvpCount: 0, videoWishCount: 0 });
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
  const [currentOrigin, setCurrentOrigin] = useState<string>("");
  const [initialSettingsMap, setInitialSettingsMap] = useState<Record<string, string>>({});
  const [editSection, setEditSection] = useState<Record<string, boolean>>({});
  const [savingIpaymu, setSavingIpaymu] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingAddons, setSavingAddons] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingPlatformCustom, setSavingPlatformCustom] = useState(false);
  const [savingSubdomainSettings, setSavingSubdomainSettings] = useState(false);

  const [savingActiveGateway, setSavingActiveGateway] = useState(false);
  const [savingMidtrans, setSavingMidtrans] = useState(false);
  const [savingXendit, setSavingXendit] = useState(false);
  const [savingDuitku, setSavingDuitku] = useState(false);
  const [savingTripay, setSavingTripay] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingDomainDns, setSavingDomainDns] = useState(false);
  const [detectingServerIp, setDetectingServerIp] = useState(false);
  const [detectIpResult, setDetectIpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"akun" | "pembayaran" | "gateway" | "paket" | "setup" | "platform" | "autentikasi">("akun");

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
    category: "premium",
    series: "Premium",
    description: "",
    sortOrder: 1,
    isActive: true,
    isPremium: true,
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSyncing, setThemeSyncing] = useState(false);
  const [themeSyncResult, setThemeSyncResult] = useState<any>(null);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>("all");
  const [themeFile, setThemeFile] = useState<File | null>(null);

  // Theme Demo Studio State
  const [showDemoStudioModal, setShowDemoStudioModal] = useState(false);
  const [demoStudioTheme, setDemoStudioTheme] = useState<any | null>(null);
  const [demoStudioTab, setDemoStudioTab] = useState<"visual" | "profile" | "stories">("visual");
  const [demoStudioData, setDemoStudioData] = useState<any>({});
  const [initialDemoStudioData, setInitialDemoStudioData] = useState<any>({});
  const [stagedDemoFiles, setStagedDemoFiles] = useState<Record<string, File>>({});
  const [demoStudioLoading, setDemoStudioLoading] = useState(false);
  const [demoStudioSaving, setDemoStudioSaving] = useState(false);
  const [demoStudioUploadSuccess, setDemoStudioUploadSuccess] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [updatedDemoSlots, setUpdatedDemoSlots] = useState<Record<string, number>>({});
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
    const hasDataChanges = JSON.stringify(demoStudioData) !== JSON.stringify(initialDemoStudioData);
    return hasStagedFiles || hasDataChanges;
  }, [stagedDemoFiles, demoStudioData, initialDemoStudioData]);

  const loadOverviewData = useCallback((isBackground = false) => {
    if (!isBackground) setLoading(true);
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats || {});
          setOrders(data.orders || []);
          setAllOrders(data.allOrders || []);
          setUsers(data.users || []);
          setInvitations(data.invitations || []);
          setThemes(data.themes || []);
          setLogs(data.logs || []);
          setCustomDomainOrders(data.customDomainOrders || []);
        }
        if (!isBackground) setLoading(false);
      })
      .catch(() => { if (!isBackground) setLoading(false); });
  }, []);

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Hapus klien ini secara permanen? Semua data undangan dan transaksi miliknya akan terhapus juga!")) return;
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
      .catch(() => {});
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
        }
        setLoadingSnapshots(false);
      })
      .catch(() => setLoadingSnapshots(false));
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
    if (!window.confirm(`PERINGATAN: Anda akan me-restore database dari snapshot:\n${filename}\n\nSistem akan otomatis membuat safety backup terlebih dahulu sebelum menimpa. Lanjutkan?`)) {
      return;
    }
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
    if (!window.confirm(`PERINGATAN: Database aktif akan ditimpa dengan file:\n${pendingRestoreFile.name}\n\nSistem akan membuat safety backup database saat ini secara otomatis. Lanjutkan proses restore?`)) {
      return;
    }
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
    if (!window.confirm(`Hapus file snapshot "${filename}" secara permanen?`)) return;
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
      } else {
        alert(data.error || "Gagal mengubah status musik");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleDeleteMusic = async (id: string, title: string) => {
    if (!confirm(`Hapus lagu "${title}" dari pustaka musik sistem?`)) return;
    try {
      const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (playingMusicId === id && musicAudioInstance) {
          musicAudioInstance.pause();
          setPlayingMusicId(null);
        }
        setSystemMusics((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.error || "Gagal menghapus musik");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus lagu.");
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
    audio.play().then(() => {
      setMusicAudioInstance(audio);
      setPlayingMusicId(music.id);
    }).catch((e) => {
      console.error("Gagal memutar audio preview:", e);
    });
    audio.onended = () => {
      setPlayingMusicId(null);
    };
  };

  const handleOpenAddMusic = () => {
    setEditingMusic(null);
    setMusicForm({ title: "", composer: "", genre: "" });
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
      alert("Judul lagu wajib diisi.");
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
        } else {
          alert(data.error || "Gagal memperbarui data musik");
        }
      } else {
        if (!selectedMusicFile) {
          alert("Pilih file audio terlebih dahulu.");
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
        } else {
          alert(data.error || "Gagal mengunggah musik baru");
        }
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan musik");
    } finally {
      setMusicUploading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const brand = settingsMap["platform_name"] || "Luxenary";
    document.title = `${brand} Admin — Control Panel`;
  }, [settingsMap["platform_name"]]);

  useEffect(() => {
    loadOverviewData();
    loadSettings();
    loadBrandAssets();
    loadSnapshots();
    fetchSystemMusics();

    // Auto-refresh data overview setiap 15 detik (pause jika tab tidak aktif)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadOverviewData(true);
      }
    }, 15000);

    // Otomatis refresh data (background) langsung saat Bapak kembali ke tab ini
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadOverviewData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadOverviewData, loadSettings, loadBrandAssets, loadSnapshots]);

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
        setTimeout(() => setSettingsSaved((p) => ({ ...p, [group]: false })), 4000);
      }
    } finally {
      savingFn(false);
    }
  };

  // Theme actions
  const handleOpenNewTheme = () => {
    setEditingTheme(null);
    setThemeFile(null);
    setThemeForm({
      id: "",
      name: "",
      category: "premium",
      series: "Premium",
      description: "",
      sortOrder: (themes.length + 1),
      isActive: true,
      isPremium: true,
    });
    setThemeError(null);
    setShowThemeModal(true);
  };

  const handleOpenEditTheme = (th: any) => {
    setEditingTheme(th);
    setThemeFile(null);
    setThemeForm({
      id: th.id,
      name: th.name,
      category: th.category || "premium",
      series: th.series || (th.category === "traditional" ? "Traditional" : "Premium"),
      description: th.description || "",
      sortOrder: th.sortOrder || 1,
      isActive: th.isActive !== false,
      isPremium: Boolean(th.isPremium),
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
      formData.append("category", themeForm.category);
      formData.append("series", themeForm.series);
      formData.append("description", themeForm.description);
      formData.append("sortOrder", String(themeForm.sortOrder));
      formData.append("isActive", String(themeForm.isActive));
      formData.append("isPremium", String(themeForm.isPremium));
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
      loadOverviewData();
    } catch (err: any) {
      setThemeError(err.message);
    } finally {
      setThemeSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    if (!confirm(`Hapus tema "${themeName}" (${themeId}) dari katalog?`)) return;
    try {
      const res = await fetch(`/api/admin/themes?id=${themeId}`, { method: "DELETE" });
      if (res.ok) {
        loadOverviewData();
      } else {
        const d = await res.json();
        alert("Error: " + d.error);
      }
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  const handleToggleThemeStatus = async (th: any) => {
    try {
      await fetch("/api/admin/themes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: th.id, isActive: !th.isActive }),
      });
      loadOverviewData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
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
        loadOverviewData();
      } else {
        alert(data.error || "Gagal menyinkronkan tema");
      }
    } catch (err: any) {
      alert("Gagal: " + err.message);
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
    setUpdatedDemoSlots({});
    setLocalPreviews({});
    setStagedDemoFiles({});
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
      setDemoStudioUploadSuccess(null);
    } catch (err: any) {
      alert("Gagal memuat file gambar lokal: " + err.message);
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

  const handleSaveAllDemoChanges = async () => {
    if (!demoStudioTheme || !isDemoStudioDirty) return;
    setDemoStudioSaving(true);
    setDemoStudioUploadSuccess(null);

    try {
      // 1. Upload all staged files to server
      const slots = Object.keys(stagedDemoFiles);
      const nextDemoData = { ...demoStudioData };

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

          // Synchronize URL in nextDemoData so step 2 preserves the updated media/video/audio URLs
          const targetUrl = data.rawUrl || `/demo/${demoStudioTheme.id}/${data.fileName}`;
          if (slot === "cover") nextDemoData.landingCoverUrl = targetUrl;
          else if (slot === "hero") nextDemoData.sidebarPhotoUrl = targetUrl;
          else if (slot === "background") nextDemoData.globalBgUrl = targetUrl;
          else if (slot === "home") nextDemoData.homePhotoUrl = targetUrl;
          else if (slot === "footer") nextDemoData.footerPhotoUrl = targetUrl;
          else if (slot === "groom") nextDemoData.groomPhotoUrl = targetUrl;
          else if (slot === "bride") nextDemoData.bridePhotoUrl = targetUrl;
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

      // 2. Save text profile & story demo data
      const dataRes = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDemoData),
      });
      const dataJson = await dataRes.json();
      if (!dataJson.success) {
        throw new Error(dataJson.error || "Gagal menyimpan data demo");
      }

      // 3. Mark successfully saved
      const now = Date.now();
      const newUpdatedSlots: Record<string, number> = { ...updatedDemoSlots };
      slots.forEach((s) => {
        newUpdatedSlots[s] = now;
      });
      setUpdatedDemoSlots(newUpdatedSlots);
      setInitialDemoStudioData(JSON.parse(JSON.stringify(nextDemoData)));
      setStagedDemoFiles({});
      setDemoStudioUploadSuccess(`✓ Semua perubahan demo tema ${demoStudioTheme.name} berhasil disimpan permanen!`);
      setTimeout(() => setDemoStudioUploadSuccess(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploadingSlot(null);
      setDemoStudioSaving(false);
    }
  };

  const handleCloseDemoStudio = () => {
    if (isDemoStudioDirty) {
      if (!confirm("Ada draft perubahan yang belum disimpan. Yakin ingin menutup tanpa menyimpan?")) {
        return;
      }
    }
    setShowDemoStudioModal(false);
    setStagedDemoFiles({});
    setLocalPreviews({});
  };


  const handleToggleEmergencyUnlock = async (inv: any) => {
    const isCurrentlyUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();
    const actionLabel = isCurrentlyUnlocked
      ? `Kunci kembali undangan ${inv.groomName || ""} & ${inv.brideName || ""}?`
      : `Buka kunci darurat edit undangan untuk ${inv.groomName || ""} & ${inv.brideName || ""} selama 24 jam?`;
    if (!confirm(actionLabel)) return;

    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationHours: 24,
          lockImmediately: isCurrentlyUnlocked,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadOverviewData();
      } else {
        alert(data.error || "Gagal mengubah status kunci");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCloseToGallery = async (inv: any) => {
    const couple = `${inv.groomName || ""} & ${inv.brideName || ""}`;
    if (!confirm(`Tutup undangan utama ${couple} sekarang dan alihkan URL secara otomatis menjadi Galeri Momen Acara?`)) return;

    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE_TO_GALLERY" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadOverviewData();
      } else {
        alert(data.error || "Gagal menutup undangan");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleExtendGallery = async (inv: any) => {
    const couple = `${inv.groomName || ""} & ${inv.brideName || ""}`;
    if (!confirm(`Perpanjang masa simpan galeri foto tamu untuk ${couple} sebanyak +30 hari?`)) return;

    try {
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXTEND_GALLERY", days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadOverviewData();
      } else {
        alert(data.error || "Gagal memperpanjang galeri");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
      loadOverviewData();
    } catch (err: any) { alert("Gagal: " + err.message); }
  };

  const handleApproveOrder = async (orderId: string) => {
    setProcessingOrderAction(true);
    setOrderActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
      if (res.ok) {
        setOrderActionFeedback({ id: orderId, type: "success", msg: "Lunas & Aktif!" });
        setConfirmApproveOrderId(null);
        setTimeout(() => {
          setPreviewProofOrder(null);
          setOrderActionFeedback(null);
          loadOverviewData(true);
        }, 700);
      } else {
        const d = await res.json();
        setOrderActionFeedback({ id: orderId, type: "error", msg: d.error || "Gagal konfirmasi" });
        setTimeout(() => setOrderActionFeedback(null), 3500);
      }
    } catch (err: any) {
      setOrderActionFeedback({ id: orderId, type: "error", msg: err.message || "Gagal konfirmasi" });
      setTimeout(() => setOrderActionFeedback(null), 3500);
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
        loadOverviewData(true);
      } else {
        const d = await res.json();
        alert("Error: " + d.error);
      }
    } catch (err: any) {
      alert("Gagal: " + err.message);
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
  const traditionalOrders = orderList.filter((o) => o.planType === "TRADITIONAL" && o.status === "PAID");
  const modernOrders = orderList.filter((o) => o.planType === "MODERN" && o.status === "PAID");
  const premiumOrders = orderList.filter((o) => o.planType === "PREMIUM" && o.status === "PAID");

  const traditionalRev = traditionalOrders.reduce((sum, o) => sum + Number(o.amount), 0);
  const modernRev = modernOrders.reduce((sum, o) => sum + Number(o.amount), 0);
  const premiumRev = premiumOrders.reduce((sum, o) => sum + Number(o.amount), 0);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
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
                  {settingsMap["platform_name"] || "Platform"} Admin
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
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          {loading ? (
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
                        {settingsMap["platform_name"] || "Platform"} Executive Dashboard
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Ringkasan performa finansial, analitik paket, aktivitas mempelai &amp; status operasional sistem.
                      </p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
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

                  {/* ── Primary Financial & Growth Metrics (4 Cards) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Revenue */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Pendapatan Bersih (PAID)</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          Rp
                        </div>
                      </div>
                      <div className="my-3">
                        <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
                          Rp {totalRevenue.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{paidCount} transaksi berhasil</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {conversionRate}% Konversi
                        </span>
                      </div>
                    </div>

                    {/* 2. Pending Revenue */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Menunggu Pembayaran</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="my-3">
                        <p className="text-2xl sm:text-3xl font-bold text-amber-800 tracking-tight">
                          Rp {totalPending.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{pendingCount} invoice checkout aktif</span>
                        <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                          Pending
                        </span>
                      </div>
                    </div>

                    {/* 3. Total Undangan */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:border-purple-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Undangan Mempelai</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="my-3">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                          {stats.invitationCount || 0}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{stats.publishedInvitationCount || invitations.filter(i=>i.status==='PUBLISHED').length} Online Aktif</span>
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          {stats.draftInvitationCount || invitations.filter(i=>i.status==='DRAFT').length} Draf
                        </span>
                      </div>
                    </div>

                    {/* 4. Tamu & Interaksi */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Tamu &amp; Interaksi</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="my-3">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                          {stats.guestCount || 0}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{stats.rsvpCount || 0} RSVP Konfirmasi</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {stats.userCount || 0} Akun Klien
                        </span>
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
                        {/* Traditional */}
                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-900 uppercase tracking-wide">
                              {settingsMap["name_traditional"] || "Traditional"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {traditionalRev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (traditionalOrders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{traditionalOrders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((traditionalOrders.length / paidCount) * 100) : 0}% dari total penjualan</span>
                          </div>
                        </div>

                        {/* Modern */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 uppercase tracking-wide">
                              {settingsMap["name_modern"] || "Modern"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {modernRev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (modernOrders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{modernOrders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((modernOrders.length / paidCount) * 100) : 0}% dari total penjualan</span>
                          </div>
                        </div>

                        {/* Premium */}
                        <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-purple-900 uppercase tracking-wide">
                              {settingsMap["name_premium"] || "Premium"}
                            </span>
                            <span className="font-bold text-gray-900">
                              Rp {premiumRev.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-700 h-full rounded-full transition-all duration-500"
                              style={{ width: `${paidCount > 0 ? (premiumOrders.length / paidCount) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{premiumOrders.length} order lunas</span>
                            <span>{paidCount > 0 ? Math.round((premiumOrders.length / paidCount) * 100) : 0}% dari total penjualan</span>
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
                                  {inv.groomNickname || inv.groomName || "Mempelai Pria"} &amp; {inv.brideNickname || inv.brideName || "Mempelai Wanita"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    /{inv.groomSlug || "pria"}-{inv.brideSlug || "wanita"}/{inv.invitationSlug || "wedding"}
                                  </span>
                                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 uppercase">
                                    {inv.themeId}
                                  </span>
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
                        {snapshots.length} snapshot tersimpan di <code>{settingsMap["backup_path"] || "/data/backups"}</code>.
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
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Daftar Transaksi</h2>
                      <p className="text-sm text-gray-500">{orders.length} transaksi total</p>
                    </div>
                    <button onClick={() => loadOverviewData()} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer">
                      ↻ Refresh
                    </button>
                  </div>

                  {/* ── Transaction Subtabs ── */}
                  <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar">
                    {["PENDING", "PAID", "FAILED", "SEMUA"].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setOrderTab(tab)}
                        className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                          orderTab === tab 
                            ? "border-amber-500 text-amber-600" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {tab === "PENDING" ? "Menunggu Pembayaran" : tab === "PAID" ? "Sukses / Lunas" : tab === "FAILED" ? "Gagal / Dibatalkan" : "Semua Transaksi"}
                      </button>
                    ))}
                  </div>

                  {/* ── Desktop Widescreen Table View ── */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            {["Invoice", "Klien", "Paket", "Metode", "Jumlah", "Bukti Transfer", "Status", "Tanggal", "Aksi"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                          {orders.filter(ord => orderTab === "SEMUA" || (orderTab === "FAILED" ? (ord.status === "FAILED" || ord.status === "EXPIRED") : ord.status === orderTab)).length === 0 ? (
                            <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400 italic">Belum ada transaksi</td></tr>
                          ) : orders.filter(ord => orderTab === "SEMUA" || (orderTab === "FAILED" ? (ord.status === "FAILED" || ord.status === "EXPIRED") : ord.status === orderTab)).map((ord) => (
                            <tr key={ord.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-xs font-mono text-gray-700 font-bold">{ord.invoiceNumber}</td>
                              <td className="px-4 py-3 text-xs text-gray-800 font-medium">
                                <div className="font-semibold text-gray-900">{ord.user?.name || "Klien"}</div>
                                <div className="text-gray-400 text-[11px] font-mono">{ord.user?.email}</div>
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-gray-900">{ord.planType}</td>
                              <td className="px-4 py-3 text-xs">
                                {ord.paymentMethod === "MANUAL_TRANSFER" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    Transfer Bank
                                  </span>
                                ) : (ord.status === "PENDING" && !ord.proofImageUrl && !ord.snapToken) ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                    Belum Dipilih
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                    QRIS / Otomatis
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-gray-900 font-mono">Rp {Number(ord.amount).toLocaleString("id-ID")}</td>
                              <td className="px-4 py-3 text-xs">
                                {ord.proofImageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProofOrder(ord)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                  >
                                    <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>Lihat Struk</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  {/* Status kontekstual sesuai metode & kondisi */}
                                  {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && !ord.proofImageUrl && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                      Menunggu Bukti
                                    </span>
                                  )}
                                  {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && ord.proofImageUrl && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                      Menunggu Verifikasi
                                    </span>
                                  )}
                                  {ord.status === "PENDING" && ord.paymentMethod !== "MANUAL_TRANSFER" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                      Menunggu Pembayaran
                                    </span>
                                  )}
                                  {ord.status === "PAID" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Lunas
                                    </span>
                                  )}
                                  {ord.status === "EXPIRED" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                      QRIS Kedaluwarsa
                                    </span>
                                  )}
                                  {ord.status === "FAILED" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                      Ditolak
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-gray-400">{new Date(ord.createdAt).toLocaleDateString("id-ID")}</td>
                              <td className="px-4 py-3">
                                {/* Tombol Konfirmasi/Tolak HANYA untuk Transfer Manual yang sudah upload struk */}
                                {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && ord.proofImageUrl && (
                                  <div className="flex items-center gap-1.5">
                                    {orderActionFeedback && orderActionFeedback.id === ord.id && orderActionFeedback.type === "success" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white animate-in zoom-in-95 duration-150">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Lunas!
                                      </span>
                                    ) : confirmApproveOrderId === ord.id ? (
                                      <div className="flex items-center gap-1 p-0.5 bg-emerald-50 border border-emerald-300 rounded-lg animate-in zoom-in-95 duration-150">
                                        <button
                                          onClick={() => handleApproveOrder(ord.id)}
                                          disabled={processingOrderAction}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1 active:scale-95"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                          {processingOrderAction ? "..." : "Ya"}
                                        </button>
                                        <button
                                          onClick={() => setConfirmApproveOrderId(null)}
                                          disabled={processingOrderAction}
                                          className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmApproveOrderId(ord.id)}
                                        disabled={processingOrderAction}
                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-95"
                                      >
                                        Konfirmasi
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                       setRejectModalOrder(ord);
                                       setRejectReasonInput("Bukti transfer tidak valid atau dana belum masuk.");
                                      }}
                                      disabled={processingOrderAction}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                                {/* QRIS: Menunggu otomatis dari webhook gateway */}
                                {ord.status === "PENDING" && ord.paymentMethod !== "MANUAL_TRANSFER" && (
                                  <span className="text-[10px] text-gray-400 italic">Auto via gateway</span>
                                )}
                                {/* Transfer Manual: Menunggu klien upload struk */}
                                {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && !ord.proofImageUrl && (
                                  <span className="text-[10px] text-gray-400 italic">Menunggu bukti upload</span>
                                )}
                                {ord.status === "FAILED" && ord.rejectReason && (
                                  <span className="text-[10px] text-rose-600 italic block max-w-[120px] truncate" title={ord.rejectReason}>
                                    {ord.rejectReason}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Mobile-Native Compact Feed View ── */}
                  <div className="block md:hidden space-y-3">
                    {orders.filter(ord => orderTab === "SEMUA" || (orderTab === "FAILED" ? (ord.status === "FAILED" || ord.status === "EXPIRED") : ord.status === orderTab)).length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs italic">
                        Belum ada transaksi
                      </div>
                    ) : orders.filter(ord => orderTab === "SEMUA" || (orderTab === "FAILED" ? (ord.status === "FAILED" || ord.status === "EXPIRED") : ord.status === orderTab)).map((ord) => (
                        <div key={ord.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2.5">
                          {/* Top: Invoice + Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-gray-900 truncate">{ord.invoiceNumber}</span>
                            <div>
                              {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && !ord.proofImageUrl && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                  Menunggu Bukti
                                </span>
                              )}
                              {ord.status === "PENDING" && ord.paymentMethod === "MANUAL_TRANSFER" && ord.proofImageUrl && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Verifikasi
                                </span>
                              )}
                              {ord.status === "PENDING" && ord.paymentMethod !== "MANUAL_TRANSFER" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                  Pending
                                </span>
                              )}
                              {ord.status === "PAID" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Lunas
                                </span>
                              )}
                              {ord.status === "EXPIRED" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                  Kedaluwarsa
                                </span>
                              )}
                              {ord.status === "FAILED" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Ditolak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Client info */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-900">{ord.user?.name || "Klien"}</span>
                            <span className="text-gray-400 font-mono text-[11px] truncate max-w-[160px]">{ord.user?.email}</span>
                          </div>

                          {/* Meta & Amount Row */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[10px] uppercase">
                                {ord.planType}
                              </span>
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                                {ord.paymentMethod === "MANUAL_TRANSFER" ? "Transfer" : "QRIS"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gray-900 font-mono text-sm">Rp {Number(ord.amount).toLocaleString("id-ID")}</span>
                              <span className="text-[10px] text-gray-400 block">{new Date(ord.createdAt).toLocaleDateString("id-ID")}</span>
                            </div>
                          </div>

                          {/* Manual transfer proof & actions */}
                          {ord.paymentMethod === "MANUAL_TRANSFER" && (
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                              {ord.proofImageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewProofOrder(ord)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>Lihat Struk</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">Belum ada struk</span>
                              )}

                              {ord.status === "PENDING" && ord.proofImageUrl && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                  {orderActionFeedback && orderActionFeedback.id === ord.id && orderActionFeedback.type === "success" ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white animate-in zoom-in-95 duration-150">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Lunas!
                                    </span>
                                  ) : confirmApproveOrderId === ord.id ? (
                                    <div className="flex items-center gap-1 p-0.5 bg-emerald-50 border border-emerald-300 rounded-lg animate-in zoom-in-95 duration-150">
                                      <button
                                        onClick={() => handleApproveOrder(ord.id)}
                                        disabled={processingOrderAction}
                                        className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1 active:scale-95"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Ya
                                      </button>
                                      <button
                                        onClick={() => setConfirmApproveOrderId(null)}
                                        disabled={processingOrderAction}
                                        className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-semibold transition cursor-pointer"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmApproveOrderId(ord.id)}
                                      disabled={processingOrderAction}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                      Konfirmasi
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setRejectModalOrder(ord);
                                      setRejectReasonInput("Bukti transfer tidak valid atau dana belum masuk.");
                                    }}
                                    disabled={processingOrderAction}
                                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* ── Users ── */}
              {activeTab === "users" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Daftar Klien</h2>
                      <p className="text-sm text-gray-500">{users.filter((u) => u.role !== "ADMIN").length} klien terdaftar</p>
                    </div>
                  </div>

                  {/* ── Desktop Widescreen Table View ── */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            {["Nama", "Email", "Terdaftar", "Aksi"].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {users
                            .filter((usr) => usr.role !== "ADMIN")
                            .slice((clientPage - 1) * 10, clientPage * 10)
                            .map((usr) => (
                              <tr key={usr.id} className="hover:bg-gray-50 transition">
                                <td className="px-5 py-3 text-sm font-semibold text-gray-900">{usr.name}</td>
                                <td className="px-5 py-3 text-sm text-gray-600 font-mono text-xs">{usr.email}</td>
                                <td className="px-5 py-3 text-xs text-gray-500">{new Date(usr.createdAt).toLocaleDateString("id-ID")}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleImpersonateClient(usr.id, usr.email, usr.name)}
                                      disabled={impersonatingClient}
                                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                                      title="Remote Dasbor Klien"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </button>
                                    <button onClick={() => { setManageClient(usr); setClientActionMsg(null); }} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer">
                                      Kelola Klien
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {users.filter((usr) => usr.role !== "ADMIN").length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">
                                Belum ada akun klien terdaftar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Mobile-Native Contact Feed View ── */}
                  <div className="block md:hidden space-y-2.5">
                    {users.filter((u) => u.role !== "ADMIN").length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs italic">
                        Belum ada akun klien terdaftar.
                      </div>
                    ) : (
                      users
                        .filter((usr) => usr.role !== "ADMIN")
                        .slice((clientPage - 1) * 10, clientPage * 10)
                        .map((usr) => (
                          <div key={usr.id} className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-2xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0">
                                {(usr.name || "K")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-gray-900 truncate">{usr.name || "Klien"}</div>
                                <div className="text-gray-500 text-[11px] font-mono truncate">{usr.email}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">{new Date(usr.createdAt).toLocaleDateString("id-ID")}</div>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleImpersonateClient(usr.id, usr.email, usr.name)}
                                disabled={impersonatingClient}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                                title="Remote Dasbor Klien"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              </button>
                              <button onClick={() => { setManageClient(usr); setClientActionMsg(null); }} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer">
                                Kelola
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* ── Pagination Controls ── */}
                  {users.filter((usr) => usr.role !== "ADMIN").length > 10 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setClientPage(p => Math.max(1, p - 1))}
                        disabled={clientPage === 1}
                        className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
                      >
                        Sebelumnya
                      </button>
                      <span className="text-xs font-medium text-gray-500">
                        Halaman {clientPage} dari {Math.ceil(users.filter(u => u.role !== "ADMIN").length / 10)}
                      </span>
                      <button
                        onClick={() => setClientPage(p => Math.min(Math.ceil(users.filter(u => u.role !== "ADMIN").length / 10), p + 1))}
                        disabled={clientPage === Math.ceil(users.filter(u => u.role !== "ADMIN").length / 10)}
                        className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Invitations / Projek Undangan ── */}
              {activeTab === "invitations" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Invitation Projects</h2>
                      <p className="text-sm text-gray-500">{invitations.length} total projek terdaftar</p>
                    </div>

                    {/* ── Quick Status Filter Tabs ── */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                      {[
                        { id: "ALL", label: "Semua", count: invitations.length },
                        { id: "DRAFT", label: "Draft", count: draftInvitationCount },
                        { id: "PUBLISHED", label: "Undangan Tayang", count: publishedInvitationCount },
                        { id: "EVENT_FINISHED", label: "Galeri Momen Tamu", count: eventFinishedInvitationCount },
                        { id: "ARCHIVED", label: "Selesai / Arsip", count: archivedInvitationCount },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInvitationFilter(tab.id as any)}
                          className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            invitationFilter === tab.id
                              ? "bg-stone-900 text-white shadow-2xs"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            invitationFilter === tab.id ? "bg-stone-700 text-stone-200" : "bg-stone-200 text-stone-600"
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Desktop Widescreen Table View ── */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            {["Klien & Pasangan", "Domain & Tema", "Status Projek", "Masa Tayang & Expired", "Aksi"].map((h) => (
                              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredInvitations.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400 italic">
                                Tidak ada projek undangan dalam kategori ini.
                              </td>
                            </tr>
                          ) : (
                            filteredInvitations.map((inv) => {
                              const coupleName = `${inv.groomNickname || inv.groomName || "Mempelai Pria"} & ${inv.brideNickname || inv.brideName || "Mempelai Wanita"}`;
                              const activeSub = inv.subdomain;
                              const publicUrl = activeSub ? getInvitationPublicUrl(activeSub) : "#";
                              const isEmergencyUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();
                              const eventDate = getInvitationEventDate(inv.eventData);
                              const defaultGalleryExpiry = eventDate ? new Date(eventDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

                              return (
                                <tr key={inv.id} className="hover:bg-gray-50 transition">
                                  <td className="px-5 py-3.5">
                                    <div className="text-sm font-semibold text-gray-900">{coupleName}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{inv.user?.name || "Tanpa Nama"} &bull; <span className="font-mono">{inv.user?.email}</span></div>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="mb-0.5">
                                      {activeSub ? (
                                        <a
                                          href={publicUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-semibold text-indigo-700 hover:underline flex items-center gap-1 w-max"
                                        >
                                          <span>{activeSub}.{getApexRootDomain()}</span>
                                          <span className="text-[10px] text-stone-400">↗</span>
                                        </a>
                                      ) : (
                                        <span className="text-gray-400 font-sans italic text-[11px]">[URL Belum Setup]</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                      <span>Tema:</span>
                                      <span className="font-semibold text-stone-800 capitalize">{inv.themeId}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {/* Minimalist Dot Indicator & Status Label without heavy badges */}
                                    {inv.status === "DRAFT" && (
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                        <div>
                                          <div className="text-xs font-semibold text-stone-800">Draft</div>
                                          <div className="text-[11px] text-stone-400">Penyusunan Klien</div>
                                        </div>
                                      </div>
                                    )}
                                    {inv.status === "PUBLISHED" && (
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                        <div>
                                          <div className="text-xs font-semibold text-emerald-800">Undangan Tayang</div>
                                          <div className="text-[11px] text-stone-400">Pra-Acara & Hari H</div>
                                        </div>
                                      </div>
                                    )}
                                    {inv.status === "EVENT_FINISHED" && (
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                        <div>
                                          <div className="text-xs font-semibold text-purple-800">Galeri Momen Tamu</div>
                                          <div className="text-[11px] text-stone-400">Pasca Acara (/memories)</div>
                                        </div>
                                      </div>
                                    )}
                                    {(inv.status === "ARCHIVED" || inv.status === "TAKEN_DOWN") && (
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-stone-400 shrink-0" />
                                        <div>
                                          <div className="text-xs font-semibold text-stone-700">Selesai / Arsip</div>
                                          <div className="text-[11px] text-stone-400">Dialihkan ke Portofolio</div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Subtle Emergency Unlock Indicator if Active */}
                                    {isEmergencyUnlocked && (
                                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        <span>Kunci Darurat Aktif</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {/* Dedicated Masa Tayang & Expired Column */}
                                    {inv.status === "DRAFT" && (
                                      <span className="text-xs text-stone-400 italic">- Belum Rilis -</span>
                                    )}
                                    {inv.status === "PUBLISHED" && (
                                      <div>
                                        <div className="text-xs text-stone-700 font-medium">
                                          {eventDate ? (
                                            <span>Acara: <strong>{eventDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</strong></span>
                                          ) : (
                                            <span className="text-stone-400 italic">Tanggal acara belum diatur</span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-stone-400 mt-0.5">Masa tayang undangan aktif</div>
                                      </div>
                                    )}
                                    {inv.status === "EVENT_FINISHED" && (
                                      <div>
                                        {inv.galleryExpiresAt ? (
                                          <div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                              <span>Extended: {new Date(inv.galleryExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                            </div>
                                            <div className="text-[11px] text-purple-600/80 mt-0.5 font-medium">Masa galeri diperpanjang</div>
                                          </div>
                                        ) : defaultGalleryExpiry ? (
                                          <div>
                                            <div className="text-xs text-stone-700 font-medium">
                                              s.d. {defaultGalleryExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </div>
                                            <div className="text-[11px] text-stone-400 mt-0.5">Standar 30 Hari pasca acara</div>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-stone-500">Standar 30 Hari</span>
                                        )}
                                      </div>
                                    )}
                                    {(inv.status === "ARCHIVED" || inv.status === "TAKEN_DOWN") && (
                                      <div>
                                        <div className="text-xs text-stone-500 font-medium">Masa Tayang Selesai</div>
                                        <div className="text-[11px] text-stone-400 mt-0.5">Dialihkan ke Portofolio</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleImpersonateClient(inv.userId, inv.user?.email || "", inv.user?.name || "")}
                                        disabled={impersonatingClient}
                                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                                        title="Remote Dashboard (Impersonate)"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                      </button>

                                      {inv.status === "PUBLISHED" && (
                                        <button
                                          type="button"
                                          onClick={() => handleCloseToGallery(inv)}
                                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition cursor-pointer"
                                          title="Tutup ke Galeri Momen"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </button>
                                      )}

                                      {inv.status === "EVENT_FINISHED" && (
                                        <button
                                          type="button"
                                          onClick={() => handleExtendGallery(inv)}
                                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition cursor-pointer"
                                          title="Perpanjang Masa Galeri (+30 Hari)"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </button>
                                      )}

                                      {(isEmergencyUnlocked || inv.isLockedPermanently || inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") && (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleEmergencyUnlock(inv)}
                                          className={`p-1.5 rounded-lg border border-transparent transition cursor-pointer ${
                                            isEmergencyUnlocked
                                              ? "text-red-600 hover:bg-red-50 hover:border-red-100"
                                              : "text-stone-600 hover:bg-stone-50 hover:border-stone-100"
                                          }`}
                                          title={isEmergencyUnlocked ? "Kunci kembali sekarang" : "Buka kunci darurat (24 Jam)"}
                                        >
                                          {isEmergencyUnlocked ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" /></svg>
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Mobile-Native Invitation Card List View ── */}
                  <div className="block md:hidden space-y-3">
                    {filteredInvitations.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs italic">
                        Tidak ada projek undangan dalam kategori ini.
                      </div>
                    ) : (
                      filteredInvitations.map((inv) => {
                        const coupleName = `${inv.groomNickname || inv.groomName || "Mempelai Pria"} & ${inv.brideNickname || inv.brideName || "Mempelai Wanita"}`;
                        const activeSub = inv.subdomain || `${inv.groomSlug || "mempelai"}-${inv.brideSlug || "pria"}`;
                        const publicUrl = getInvitationPublicUrl(activeSub);
                        const isEmergencyUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();
                        const eventDate = getInvitationEventDate(inv.eventData);
                        const defaultGalleryExpiry = eventDate ? new Date(eventDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

                        return (
                          <div key={inv.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-sm text-gray-900">{coupleName}</h3>
                                <a
                                  href={publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-mono text-amber-700 hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  <span>{activeSub}.{getApexRootDomain()}</span>
                                  <span className="text-[10px] text-stone-400">↗</span>
                                </a>
                              </div>
                              {/* Dot indicator status mobile */}
                              <div>
                                {inv.status === "DRAFT" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Draft
                                  </span>
                                )}
                                {inv.status === "PUBLISHED" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Tayang
                                  </span>
                                )}
                                {inv.status === "EVENT_FINISHED" && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Galeri
                                  </span>
                                )}
                                {(inv.status === "ARCHIVED" || inv.status === "TAKEN_DOWN") && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" /> Arsip
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Lifecycle details on mobile */}
                            <div className="text-xs text-stone-500 space-y-1">
                              {inv.status === "PUBLISHED" && eventDate && (
                                <div>Acara: <strong className="text-stone-700">{eventDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</strong></div>
                              )}
                              {inv.status === "EVENT_FINISHED" && (
                                <div>
                                  {inv.galleryExpiresAt ? (
                                    <span className="text-purple-700 font-semibold">✦ Extended s.d. {new Date(inv.galleryExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  ) : defaultGalleryExpiry ? (
                                    <span>Masa Galeri: s.d. {defaultGalleryExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  ) : (
                                    <span>Masa Galeri Standar 30 Hari</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Info Detail Mobile */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                              <span>Tema: <strong className="capitalize text-gray-800">{inv.themeId}</strong></span>
                              {isEmergencyUnlocked ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Darurat Aktif
                                </span>
                              ) : inv.isLockedPermanently ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Terkunci Permanen
                                </span>
                              ) : (inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-stone-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300" /> Terkunci Pasca Publish
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Bisa Diedit
                                </span>
                              )}
                            </div>

                            {/* Actions Mobile */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleImpersonateClient(inv.userId, inv.user?.email || "", inv.user?.name || "")}
                                disabled={impersonatingClient}
                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                                title="Remote Dashboard (Impersonate)"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              </button>

                              {inv.status === "PUBLISHED" && (
                                <button
                                  type="button"
                                  onClick={() => handleCloseToGallery(inv)}
                                  className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition cursor-pointer"
                                  title="Tutup ke Galeri"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              )}
                              {inv.status === "EVENT_FINISHED" && (
                                <button
                                  type="button"
                                  onClick={() => handleExtendGallery(inv)}
                                  className="px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition cursor-pointer"
                                  title="Tambah Masa Simpan Galeri (+30 Hari)"
                                >
                                  +30H
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleEmergencyUnlock(inv)}
                                className={`p-2 rounded-lg border border-transparent transition cursor-pointer ${
                                  isEmergencyUnlocked
                                    ? "text-red-600 hover:bg-red-50 hover:border-red-100"
                                    : "text-stone-600 hover:bg-stone-50 hover:border-stone-100"
                                }`}
                                title={isEmergencyUnlocked ? "Kunci kembali sekarang" : "Buka kunci darurat (24 Jam)"}
                              >
                                {isEmergencyUnlocked ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── Custom Domain Management ── */}
              {activeTab === "custom_domains" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Custom Domain</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Pantau pesanan add-on Custom Domain dari klien dan status penyelesaiannya.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("settings");
                        setActiveSettingsTab("setup");
                      }}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Pengaturan DNS &amp; IP Server</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-200">
                            <th className="py-4 px-6 font-semibold text-gray-900">Klien</th>
                            <th className="py-4 px-6 font-semibold text-gray-900">Undangan (Asli)</th>
                            <th className="py-4 px-6 font-semibold text-gray-900">Domain Diminta</th>
                            <th className="py-4 px-6 font-semibold text-gray-900">Pembayaran</th>
                            <th className="py-4 px-6 font-semibold text-gray-900">Status Terhubung</th>
                            <th className="py-4 px-6 font-semibold text-gray-900">Aksi (Admin)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {customDomainOrders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-500">Belum ada pesanan Custom Domain.</td>
                            </tr>
                          ) : (
                            customDomainOrders.map((ord: any) => {
                              const isPaid = ord.status === "PAID";
                              const isConnected = ord.invitation?.customDomain === ord.requestedDomain;
                              return (
                                <tr key={ord.id} className="hover:bg-gray-50/50 transition">
                                  <td className="py-4 px-6">
                                    <div className="font-semibold text-gray-900">{ord.user?.name || "Klien Terhapus"}</div>
                                    <div className="text-xs text-gray-500">{ord.user?.email}</div>
                                  </td>
                                  <td className="py-4 px-6 text-gray-600 font-mono text-xs">
                                    {ord.invitation?.subdomain ? `https://${ord.invitation.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}` : "-"}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-900">{ord.requestedDomain || "-"}</span>
                                      {ord.requestedDomain && (
                                        <button
                                          type="button"
                                          title="Copy Domain"
                                          onClick={() => {
                                            navigator.clipboard.writeText(ord.requestedDomain);
                                            alert(`Domain ${ord.requestedDomain} tersalin!`);
                                          }}
                                          className="p-1 hover:bg-gray-200 rounded text-gray-500 transition"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <Badge status={ord.status} />
                                  </td>
                                  <td className="py-4 px-6">
                                    {isConnected ? (
                                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">Terhubung</span>
                                    ) : (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">Belum Terhubung</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 text-xs font-medium">
                                    {!isPaid ? (
                                      <span className="text-amber-600">Menunggu Lunas</span>
                                    ) : isConnected ? (
                                      <span className="text-emerald-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                        Selesai
                                      </span>
                                    ) : (
                                      <div className="flex flex-col gap-1 text-rose-600 font-bold">
                                        <span>Menunggu Konfigurasi SSL</span>
                                        <span className="text-[10px] text-gray-500 font-normal">Buat config Nginx & reload</span>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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

                  {/* Category Filter Tabs */}
                  {(() => {
                    const validThemes = themes.filter((t) => t.id !== "starter-blueprint");
                    const countPremium = validThemes.filter((t) => (t.category || "").toLowerCase() === "premium").length;
                    const countModern = validThemes.filter((t) => (t.category || "").toLowerCase() === "modern").length;
                    const countTraditional = validThemes.filter((t) => (t.category || "").toLowerCase() === "traditional").length;
                    const displayedThemes = themeCategoryFilter === "all"
                      ? validThemes
                      : validThemes.filter((t) => (t.category || "").toLowerCase() === themeCategoryFilter);

                    return (
                      <>
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto no-scrollbar">
                          {[
                            { id: "all", label: `Semua Tema (${validThemes.length})` },
                            { id: "premium", label: `Premium (${countPremium})` },
                            { id: "modern", label: `Modern (${countModern})` },
                            { id: "traditional", label: `Traditional (${countTraditional})` },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setThemeCategoryFilter(cat.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                                themeCategoryFilter === cat.id
                                  ? "bg-amber-800 text-white shadow-xs"
                                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {displayedThemes.map((theme) => {
                            const cat = (theme.category || "modern").toLowerCase();
                            return (
                              <div
                                key={theme.id}
                                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between space-y-3.5 transition shadow-2xs ${
                                  theme.isActive === false
                                    ? "opacity-60 border-dashed border-gray-300"
                                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                                }`}
                              >
                                <div className="space-y-2">
                                  {/* Top Row: Name + Status Dot + Category Badge */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-base">{theme.name}</h3>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleThemeStatus(theme)}
                                          className={`w-2 h-2 rounded-full cursor-pointer transition ${
                                            theme.isActive !== false
                                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                              : "bg-gray-300"
                                          }`}
                                          title={theme.isActive !== false ? "Tema Aktif (Klik untuk non-aktifkan)" : "Tema Non-aktif (Klik untuk aktifkan)"}
                                        />
                                      </div>
                                      <span className="text-[11px] font-mono text-gray-400">/{theme.id}</span>
                                    </div>
                                    <span
                                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                                        cat === "traditional"
                                          ? "bg-amber-50 text-amber-800 border-amber-200"
                                          : cat === "modern"
                                          ? "bg-slate-50 text-slate-700 border-slate-200"
                                          : "bg-purple-50 text-purple-800 border-purple-200"
                                      }`}
                                    >
                                      {cat === "traditional" ? "Traditional" : cat === "modern" ? "Modern" : "Premium"}
                                    </span>
                                  </div>

                                  {/* Description / Tagline */}
                                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                    {theme.description || `Desain eksklusif ${settingsMap["platform_name"] || "Platform"}`}
                                  </p>
                                </div>

                                {/* Bottom Action Row */}
                                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
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

                                  <div className="flex items-center gap-1">
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
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTheme(theme.id, theme.name)}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                      title="Hapus Tema"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
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
                        onClick={handleOpenAddMusic}
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
                        onClick={handleOpenAddMusic}
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

              {/* ── Settings ── */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-7xl w-full">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Konfigurasi payment gateway, Google OAuth API, harga paket, dan platform</p>
                  </div>

                  {/* ── Sub-Tab Navigation (Widescreen Responsive Grid) ── */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                    {([
                      { id: "akun",        label: "Akun & Keamanan" },
                      { id: "pembayaran",  label: "Pembayaran" },
                      { id: "gateway",     label: "Gateway QRIS" },
                      { id: "paket",       label: "Paket & Harga" },
                      { id: "setup",       label: "Setup & Integrasi" },
                      { id: "platform",    label: "Platform & Tampilan" },
                      { id: "autentikasi", label: "Autentikasi" },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveSettingsTab(t.id)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs transition cursor-pointer text-center flex items-center justify-center truncate ${
                          activeSettingsTab === t.id
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200 font-bold"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-semibold"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Sub-Tab: Akun & Keamanan ── */}
                  {activeSettingsTab === "akun" && (
                    <AdminProfileSettings sessionUser={session?.user} />
                  )}

                  {/* ══ TAB: PEMBAYARAN ══ */}
                  {activeSettingsTab === "pembayaran" && (
                  <>
                  {/* Mode Pembayaran & Rekening Bank Manual */}
                  <SettingsCard
                    title="Mode Pembayaran"
                    description="Pilih metode pembayaran yang diizinkan untuk klien: QRIS Otomatis, Transfer Bank Manual, atau keduanya."
                    isEditing={Boolean(editSection["payment_mode"])}
                    onEdit={() => toggleEditSection("payment_mode")}
                    onCancel={() =>
                      cancelEdit("payment_mode", [
                        "payment_mode",
                        "bank_name",
                        "bank_account_number",
                        "bank_account_holder",
                        "bank_instructions",
                      ])
                    }
                    onSave={() =>
                      saveSettings(
                        [
                          "payment_mode",
                          "bank_name",
                          "bank_account_number",
                          "bank_account_holder",
                          "bank_instructions",
                        ],
                        setSavingPaymentSettings,
                        "payment_mode"
                      )
                    }
                    saving={savingPaymentSettings}
                    isDirty={isSectionDirty([
                      "payment_mode",
                      "bank_name",
                      "bank_account_number",
                      "bank_account_holder",
                      "bank_instructions",
                    ])}
                    saveSuccess={settingsSaved["payment_mode"]}
                    saveSuccessMessage="Pengaturan metode pembayaran & rekening bank berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Mode Pembayaran Aktif</span>
                            <div className="mt-1">
                              {(settingsMap["payment_mode"] || "GATEWAY") === "GATEWAY" || settingsMap["payment_mode"] === "BOTH" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                  Hanya QRIS / Otomatis
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Transfer Manual (Mode Darurat)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Rekening Tujuan</span>
                            {settingsMap["bank_name"] && settingsMap["bank_account_number"] ? (
                              <>
                                <span className="text-xs font-bold text-gray-800 mt-1 inline-block">
                                  {settingsMap["bank_name"]} - {settingsMap["bank_account_number"]}
                                </span>
                                <span className="text-[11px] text-gray-500 block font-medium">
                                  a.n {settingsMap["bank_account_holder"] || "-"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium inline-block mt-1 border border-amber-200">
                                Rekening Belum Dikonfigurasi
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-950">
                          <span className="font-bold block mb-0.5">Petunjuk Transfer untuk Klien:</span>
                          <p className="text-amber-900/80 leading-relaxed text-[11px]">
                            {settingsMap["bank_instructions"] ||
                              "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer untuk diverifikasi admin."}
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <FieldRow label="Mode Pembayaran yang Dibuka">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { id: "GATEWAY", label: "Hanya QRIS / Otomatis", desc: "Auto verifikasi via Payment Gateway" },
                            { id: "MANUAL", label: "Transfer Manual (Darurat)", desc: "Verifikasi via upload struk" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSetting("payment_mode", opt.id)}
                              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                ((settingsMap["payment_mode"] || "GATEWAY") === opt.id || (settingsMap["payment_mode"] === "BOTH" && opt.id === "GATEWAY"))
                                  ? "border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              <span className="text-xs font-bold block">{opt.label}</span>
                              <span className="text-[10px] text-gray-500 block mt-0.5">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </FieldRow>

                      <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldRow label="Nama Bank">
                          <input
                            type="text"
                            value={settingsMap["bank_name"] || ""}
                            onChange={(e) => setSetting("bank_name", e.target.value)}
                            placeholder="Contoh: BCA / Mandiri / BRI / BSI"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>

                        <FieldRow label="Nomor Rekening">
                          <input
                            type="text"
                            value={settingsMap["bank_account_number"] || ""}
                            onChange={(e) => setSetting("bank_account_number", e.target.value)}
                            placeholder="Contoh: 1234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>

                        <FieldRow label="Nama Pemilik Rekening" description="Atas nama dari rekening penerima pembayaran di atas.">
                            <input
                              type="text"
                              value={settingsMap["bank_account_holder"] || ""}
                              onChange={(e) => setSetting("bank_account_holder", e.target.value)}
                              placeholder="Contoh: PT Luxenary Indonesia / Nama Pemilik"
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                            />
                        </FieldRow>
                      </div>

                      <FieldRow label="Petunjuk Transfer Bank">
                        <textarea
                          rows={3}
                          value={
                            settingsMap["bank_instructions"] ||
                            "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin."
                          }
                          onChange={(e) => setSetting("bank_instructions", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
                        />
                      </FieldRow>
                    </div>
                  </SettingsCard>
                  </>
                  )}

                  {/* ══ TAB: GATEWAY QRIS ══ */}
                  {activeSettingsTab === "gateway" && (
                  <>
                  {/* ═══ PUSAT KONTROL & BASE SETTING GATEWAY GLOBAL ═══ */}
                  <SettingsCard
                    title="Pusat Kontrol & Pengaturan Global Gateway"
                    description="Konfigurasi terpusat untuk semua payment gateway: pilih gateway aktif, mode lingkungan, masa berlaku QRIS, penanggung biaya admin, dan format nama invoice."
                    isEditing={Boolean(editSection["active_gateway"])}
                    onEdit={() => toggleEditSection("active_gateway")}
                    onCancel={() => cancelEdit("active_gateway", ["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"])}
                    onSave={() => saveSettings(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"], setSavingActiveGateway, "active_gateway")}
                    saving={savingActiveGateway}
                    isDirty={isSectionDirty(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"])}
                    saveSuccess={settingsSaved["active_gateway"]}
                    saveSuccessMessage="Pengaturan global payment gateway berhasil disimpan"
                    viewContent={
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Gateway Aktif</span>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {(settingsMap["active_payment_gateway"] || "ipaymu").toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Mode Lingkungan</span>
                            <div className="mt-1.5">
                              {(settingsMap["payment_gateway_mode"] || "sandbox") === "production" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Produksi (Live)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Sandbox (Testing)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200">
                            <span className="text-xs text-sky-800 block font-bold">Masa Berlaku Tagihan</span>
                            <div className="mt-1 flex items-baseline gap-1">
                              <span className="text-xl font-mono font-bold text-sky-950">
                                {settingsMap["payment_expiry_minutes"] || "60"}
                              </span>
                              <span className="text-xs font-semibold text-sky-800">Menit</span>
                            </div>
                          </div>

                          <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
                            <span className="text-xs text-purple-900 block font-bold">Biaya Layanan Aplikasi</span>
                            <div className="mt-1 text-xs font-semibold text-purple-950">
                              {(settingsMap["payment_fee_payer"] || "MERCHANT") === "BUYER" ? (
                                <span className="text-amber-800 font-bold">Dibebankan ke Klien (+{settingsMap["payment_gateway_fee_percent"] || "0.7"}%)</span>
                              ) : (
                                <span className="text-emerald-700 font-bold">Ditanggung Platform ({settingsMap["payment_gateway_fee_percent"] || "0.7"}% Disubsidi)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-gray-600 font-medium">
                            Format Judul Invoice: <code className="font-mono text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">{settingsMap["payment_invoice_prefix"] || "Sistem Undangan"} — Order #XXXXXX</code>
                          </span>
                          <span className="text-[11px] text-gray-400">Berlaku otomatis untuk semua vendor gateway</span>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <FieldRow label="Pilih Gateway Aktif" description="Gateway utama yang memproses pembayaran saat klien klik bayar via QRIS / Online">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "ipaymu", label: "iPaymu", desc: "QRIS, VA, GoPay, OVO" },
                            { id: "midtrans", label: "Midtrans", desc: "Snap UI, VA, GoPay" },
                            { id: "xendit", label: "Xendit", desc: "Invoice, VA, OVO, DANA" },
                            { id: "duitku", label: "Duitku", desc: "QRIS, VA, GoPay, ShopeePay" },
                            { id: "tripay", label: "Tripay", desc: "QRIS, VA, Alfamart, Indomaret" },
                          ].map((gw) => (
                            <button
                              key={gw.id}
                              type="button"
                              onClick={() => setSetting("active_payment_gateway", gw.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-left ${
                                (settingsMap["active_payment_gateway"] || "ipaymu") === gw.id
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <div className="font-bold">{gw.label}</div>
                              <div className={`text-[10px] mt-0.5 ${
                                (settingsMap["active_payment_gateway"] || "ipaymu") === gw.id ? "text-emerald-100" : "text-gray-400"
                              }`}>{gw.desc}</div>
                            </button>
                          ))}
                        </div>
                      </FieldRow>

                      <FieldRow label="Mode Lingkungan Global" description="Ganti status seluruh gateway ke Sandbox (uji coba) atau Produksi (live) sekaligus dengan 1 klik">
                        <div className="flex gap-3">
                          {[
                            { id: "sandbox", label: "Sandbox (Uji Coba)", desc: "Testing tanpa uang sungguhan" },
                            { id: "production", label: "Produksi (Live)", desc: "Transaksi uang nyata" },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setSetting("payment_gateway_mode", mode.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                                (settingsMap["payment_gateway_mode"] || "sandbox") === mode.id
                                  ? mode.id === "production"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-amber-600 text-white border-amber-600 shadow-sm"
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                (settingsMap["payment_gateway_mode"] || "sandbox") === mode.id
                                  ? "bg-white"
                                  : mode.id === "production" ? "bg-emerald-500" : "bg-amber-500"
                              }`}></span>
                              <div>
                                <span className="font-bold block">{mode.label}</span>
                                <span className={`text-[10px] block ${
                                  (settingsMap["payment_gateway_mode"] || "sandbox") === mode.id ? "text-white/80" : "text-gray-400"
                                }`}>{mode.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </FieldRow>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <FieldRow label="Masa Berlaku Tagihan (Menit)" description="Durasi QRIS/Invoice sebelum kedaluwarsa otomatis (contoh: 15, 30, 60, atau 1440 untuk 24 jam).">
                          <input
                            type="number"
                            min="5"
                            max="1440"
                            value={settingsMap["payment_expiry_minutes"] || "60"}
                            onChange={(e) => setSetting("payment_expiry_minutes", e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-sky-300 rounded-xl text-sm bg-sky-50 text-sky-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-2xs font-mono font-bold"
                          />
                        </FieldRow>

                        <FieldRow label="Awalan Judul Invoice (Prefix)" description="Digunakan pada judul invoice Xendit. (e.g. Nama Platform Anda).">
                          <input
                            type="text"
                            value={settingsMap["payment_invoice_prefix"] || "Sistem Undangan"}
                            onChange={(e) => setSetting("payment_invoice_prefix", e.target.value)}
                            placeholder="Contoh: Sistem Undangan"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-medium"
                          />
                        </FieldRow>
                      </div>

                      <FieldRow label="Skema Biaya Admin Gateway" description="Tentukan apakah potongan fee gateway (misal QRIS 0.7%) ditanggung oleh platform atau dibebankan ke pembeli">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: "MERCHANT", label: "Ditanggung Platform (Gratis Klien)", desc: "Klien bayar pas harga paket (contoh: Rp 299.000), fee dipotong dari saldo Anda." },
                            { id: "BUYER", label: "Dibebankan ke Klien (Ditambah ke Tagihan)", desc: "Total bayar di checkout otomatis ditambah biaya transaksi payment gateway." },
                          ].map((feeOpt) => (
                            <button
                              key={feeOpt.id}
                              type="button"
                              onClick={() => setSetting("payment_fee_payer", feeOpt.id)}
                              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                (settingsMap["payment_fee_payer"] || "MERCHANT") === feeOpt.id
                                  ? "border-amber-600 bg-amber-50/70 text-amber-950 ring-1 ring-amber-500"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              <span className="text-xs font-bold block">{feeOpt.label}</span>
                              <span className="text-[11px] text-gray-500 block mt-1 leading-relaxed">{feeOpt.desc}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                          <label className="text-xs font-bold text-gray-800 block mb-1">
                            Besaran Persentase Fee Gateway (%)
                          </label>
                          <div className="flex items-center gap-2 max-w-sm">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={settingsMap["payment_gateway_fee_percent"] || "0.7"}
                              onChange={(e) => {
                                setSetting("payment_gateway_fee_percent", e.target.value);
                                setSetting("payment_fee_rate", (Number(e.target.value) / 100).toString());
                              }}
                              className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-xs text-gray-600 font-medium">% (Standar QRIS BI: 0.7%)</span>
                          </div>
                        </div>
                      </FieldRow>
                    </div>
                  </SettingsCard>

                  {/* iPaymu Settings */}
                  <SettingsCard
                    title="iPaymu Payment Gateway"
                    description="Konfigurasi koneksi ke iPaymu. Dapatkan VA dan API Key dari dashboard iPaymu."
                    isEditing={Boolean(editSection["ipaymu"])}
                    onEdit={() => toggleEditSection("ipaymu")}
                    onCancel={() => cancelEdit("ipaymu", ["ipaymu_mode", "ipaymu_va", "ipaymu_api_key"])}
                    onSave={() => saveSettings(["ipaymu_mode", "ipaymu_va", "ipaymu_api_key"], setSavingIpaymu, "ipaymu")}
                    saving={savingIpaymu}
                    isDirty={isSectionDirty(["ipaymu_mode", "ipaymu_va", "ipaymu_api_key"])}
                    saveSuccess={settingsSaved["ipaymu"]}
                    saveSuccessMessage="Pengaturan iPaymu berhasil disimpan"
                    viewContent={
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Mode Gateway</span>
                            <div className="mt-1">
                              {settingsMap["ipaymu_mode"] === "production" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Produksi (Live)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Sandbox (Testing)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Virtual Account (VA)</span>
                            <span className="text-sm font-mono font-bold text-gray-800 mt-1 inline-block">
                              {settingsMap["ipaymu_va"] ? settingsMap["ipaymu_va"] : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}
                            </span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">API Key</span>
                            <span className="text-sm font-mono font-bold text-gray-800 mt-1 inline-block">
                              {settingsMap["ipaymu_api_key"] ? "••••••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs flex-wrap">
                          <span className="text-gray-600 font-medium">
                            URL Webhook: <code className="font-mono text-gray-900 font-semibold">{`${settingsMap["platform_url"] || currentOrigin}/api/webhook/ipaymu`}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/ipaymu`)}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-semibold transition cursor-pointer"
                          >
                            Salin Webhook
                          </button>
                        </div>
                      </div>
                    }
                  >
                    <FieldRow label="Mode Gateway" description="Gunakan Sandbox untuk pengujian, Produksi untuk transaksi nyata">
                      <div className="flex gap-3">
                        {["sandbox", "production"].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSetting("ipaymu_mode", mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                              (settingsMap["ipaymu_mode"] || "sandbox") === mode
                                ? mode === "production"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-amber-600 text-white border-amber-600"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (settingsMap["ipaymu_mode"] || "sandbox") === mode
                                ? "bg-white"
                                : mode === "production" ? "bg-emerald-500" : "bg-amber-500"
                            }`}></span>
                            <span>{mode === "sandbox" ? "Sandbox" : "Produksi"}</span>
                          </button>
                        ))}
                      </div>
                    </FieldRow>

                    <FieldRow label="Virtual Account (VA)" description="Nomor VA iPaymu Anda (dari Dashboard → Akun → VA Number)">
                      <input
                        type="text"
                        value={settingsMap["ipaymu_va"] || ""}
                        onChange={(e) => setSetting("ipaymu_va", e.target.value)}
                        placeholder="Contoh: 0000000000000000"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>

                    <FieldRow label="API Key" description="API Key dari Dashboard iPaymu Pengaturan API Key">
                      <input
                        type="password"
                        value={settingsMap["ipaymu_api_key"] || ""}
                        onChange={(e) => setSetting("ipaymu_api_key", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>

                    <FieldRow label="URL Webhook (Otomatis)" description="URL ini harus dikonfigurasi di dashboard iPaymu sebagai Notify URL">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`${settingsMap["platform_url"] || currentOrigin}/api/webhook/ipaymu`}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/ipaymu`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Salin
                        </button>
                      </div>
                    </FieldRow>
                  </SettingsCard>

                  {/* ═══ MIDTRANS SETTINGS ═══ */}
                  <SettingsCard
                    title="Midtrans Payment Gateway"
                    description="Konfigurasi Midtrans Snap — payment gateway terbesar Indonesia (GoTo Group). Dapatkan Server Key & Client Key dari Midtrans Dashboard."
                    isEditing={Boolean(editSection["midtrans"])}
                    onEdit={() => toggleEditSection("midtrans")}
                    onCancel={() => cancelEdit("midtrans", ["midtrans_mode", "midtrans_server_key", "midtrans_client_key"])}
                    onSave={() => saveSettings(["midtrans_mode", "midtrans_server_key", "midtrans_client_key"], setSavingMidtrans, "midtrans")}
                    saving={savingMidtrans}
                    isDirty={isSectionDirty(["midtrans_mode", "midtrans_server_key", "midtrans_client_key"])}
                    saveSuccess={settingsSaved["midtrans"]}
                    saveSuccessMessage="Pengaturan Midtrans berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Mode</span>
                          <span className="text-sm font-semibold text-gray-800 mt-1 block">{settingsMap["midtrans_mode"] || "sandbox"}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Server Key</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["midtrans_server_key"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Client Key</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["midtrans_client_key"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                      </div>
                    }
                  >
                    <FieldRow label="Mode" description="Sandbox untuk testing, Produksi untuk live">
                      <div className="flex gap-3">
                        {["sandbox", "production"].map((mode) => (
                          <button key={mode} type="button" onClick={() => setSetting("midtrans_mode", mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                              (settingsMap["midtrans_mode"] || "sandbox") === mode
                                ? mode === "production" ? "bg-emerald-600 text-white border-emerald-600" : "bg-amber-600 text-white border-amber-600"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(settingsMap["midtrans_mode"] || "sandbox") === mode ? "bg-white" : mode === "production" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {mode === "sandbox" ? "Sandbox" : "Produksi"}
                          </button>
                        ))}
                      </div>
                    </FieldRow>
                    <FieldRow label="Server Key" description="Dari Midtrans Dashboard → Settings → Access Keys">
                      <input type="password" value={settingsMap["midtrans_server_key"] || ""} onChange={(e) => setSetting("midtrans_server_key", e.target.value)}
                        placeholder="SB-Mid-server-xxxx / Mid-server-xxxx"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="Client Key" description="Dari Midtrans Dashboard → Settings → Access Keys">
                      <input type="text" value={settingsMap["midtrans_client_key"] || ""} onChange={(e) => setSetting("midtrans_client_key", e.target.value)}
                        placeholder="SB-Mid-client-xxxx / Mid-client-xxxx"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan URL ini di Midtrans Dashboard → Settings → Configuration → Notification URL">
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/midtrans`}
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/midtrans`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
                      </div>
                    </FieldRow>
                  </SettingsCard>

                  {/* ═══ XENDIT SETTINGS ═══ */}
                  <SettingsCard
                    title="Xendit Payment Gateway"
                    description="Konfigurasi Xendit Invoice — payment gateway modern untuk startup Indonesia. Dapatkan API Key dari Xendit Dashboard."
                    isEditing={Boolean(editSection["xendit"])}
                    onEdit={() => toggleEditSection("xendit")}
                    onCancel={() => cancelEdit("xendit", ["xendit_api_key", "xendit_webhook_token"])}
                    onSave={() => saveSettings(["xendit_api_key", "xendit_webhook_token"], setSavingXendit, "xendit")}
                    saving={savingXendit}
                    isDirty={isSectionDirty(["xendit_api_key", "xendit_webhook_token"])}
                    saveSuccess={settingsSaved["xendit"]}
                    saveSuccessMessage="Pengaturan Xendit berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">API Key</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["xendit_api_key"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Webhook Token</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["xendit_webhook_token"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                      </div>
                    }
                  >
                    <FieldRow label="API Key" description="Dari Xendit Dashboard → Settings → API Keys → Secret Key">
                      <input type="password" value={settingsMap["xendit_api_key"] || ""} onChange={(e) => setSetting("xendit_api_key", e.target.value)}
                        placeholder="xnd_production_xxxx / xnd_development_xxxx"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="Webhook Token" description="Dari Xendit Dashboard → Settings → Webhooks → Webhook Verification Token">
                      <input type="password" value={settingsMap["xendit_webhook_token"] || ""} onChange={(e) => setSetting("xendit_webhook_token", e.target.value)}
                        placeholder="Token verifikasi webhook Xendit"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan di Xendit Dashboard → Settings → Webhooks → Invoice Paid">
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/xendit`}
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/xendit`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
                      </div>
                    </FieldRow>
                  </SettingsCard>

                  {/* ═══ DUITKU SETTINGS ═══ */}
                  <SettingsCard
                    title="Duitku Payment Gateway"
                    description="Konfigurasi Duitku — payment gateway lokal terjangkau untuk UMKM Indonesia. Fee rendah dan onboarding cepat."
                    isEditing={Boolean(editSection["duitku"])}
                    onEdit={() => toggleEditSection("duitku")}
                    onCancel={() => cancelEdit("duitku", ["duitku_mode", "duitku_merchant_code", "duitku_api_key"])}
                    onSave={() => saveSettings(["duitku_mode", "duitku_merchant_code", "duitku_api_key"], setSavingDuitku, "duitku")}
                    saving={savingDuitku}
                    isDirty={isSectionDirty(["duitku_mode", "duitku_merchant_code", "duitku_api_key"])}
                    saveSuccess={settingsSaved["duitku"]}
                    saveSuccessMessage="Pengaturan Duitku berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Mode</span>
                          <span className="text-sm font-semibold text-gray-800 mt-1 block">{settingsMap["duitku_mode"] || "sandbox"}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Merchant Code</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["duitku_merchant_code"] || <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">API Key</span>
                          <span className="text-sm font-mono text-gray-800 mt-1 block">{settingsMap["duitku_api_key"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}</span>
                        </div>
                      </div>
                    }
                  >
                    <FieldRow label="Mode" description="Sandbox untuk testing, Produksi untuk live">
                      <div className="flex gap-3">
                        {["sandbox", "production"].map((mode) => (
                          <button key={mode} type="button" onClick={() => setSetting("duitku_mode", mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                              (settingsMap["duitku_mode"] || "sandbox") === mode
                                ? mode === "production" ? "bg-emerald-600 text-white border-emerald-600" : "bg-amber-600 text-white border-amber-600"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(settingsMap["duitku_mode"] || "sandbox") === mode ? "bg-white" : mode === "production" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {mode === "sandbox" ? "Sandbox" : "Produksi"}
                          </button>
                        ))}
                      </div>
                    </FieldRow>
                    <FieldRow label="Merchant Code" description="Dari Duitku Dashboard → Profil Merchant → Merchant Code">
                      <input type="text" value={settingsMap["duitku_merchant_code"] || ""} onChange={(e) => setSetting("duitku_merchant_code", e.target.value)}
                        placeholder="Contoh: Dxxxx"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="API Key" description="Dari Duitku Dashboard → Pengaturan → API Key">
                      <input type="password" value={settingsMap["duitku_api_key"] || ""} onChange={(e) => setSetting("duitku_api_key", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan di Duitku Dashboard → Pengaturan → Callback URL">
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/duitku`}
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/duitku`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
                      </div>
                    </FieldRow>
                  </SettingsCard>

                  {/* ═══ TRIPAY SETTINGS ═══ */}
                  <SettingsCard
                    title="Tripay Payment Gateway"
                    description="Konfigurasi Tripay — payment gateway developer-friendly dengan flat fee transparan. Mendukung QRIS, VA, Alfamart, dan Indomaret."
                    isEditing={Boolean(editSection["tripay"])}
                    onEdit={() => toggleEditSection("tripay")}
                    onCancel={() => cancelEdit("tripay", ["tripay_mode", "tripay_merchant_code", "tripay_api_key", "tripay_private_key"])}
                    onSave={() => saveSettings(["tripay_mode", "tripay_merchant_code", "tripay_api_key", "tripay_private_key"], setSavingTripay, "tripay")}
                    saving={savingTripay}
                    isDirty={isSectionDirty(["tripay_mode", "tripay_merchant_code", "tripay_api_key", "tripay_private_key"])}
                    saveSuccess={settingsSaved["tripay"]}
                    saveSuccessMessage="Pengaturan Tripay berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["tripay_mode", "tripay_merchant_code", "tripay_api_key", "tripay_private_key"].map((key) => (
                          <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium capitalize">{key.replace("tripay_", "").replace("_", " ")}</span>
                            <span className="text-sm font-mono text-gray-800 mt-1 block">
                              {settingsMap[key]
                                ? (key.includes("key") ? "••••••••••••" : settingsMap[key])
                                : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}
                            </span>
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <FieldRow label="Mode" description="Sandbox untuk testing, Produksi untuk live">
                      <div className="flex gap-3">
                        {["sandbox", "production"].map((mode) => (
                          <button key={mode} type="button" onClick={() => setSetting("tripay_mode", mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                              (settingsMap["tripay_mode"] || "sandbox") === mode
                                ? mode === "production" ? "bg-emerald-600 text-white border-emerald-600" : "bg-amber-600 text-white border-amber-600"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(settingsMap["tripay_mode"] || "sandbox") === mode ? "bg-white" : mode === "production" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {mode === "sandbox" ? "Sandbox" : "Produksi"}
                          </button>
                        ))}
                      </div>
                    </FieldRow>
                    <FieldRow label="Merchant Code" description="Dari Tripay Dashboard → Merchant → Kode Merchant">
                      <input type="text" value={settingsMap["tripay_merchant_code"] || ""} onChange={(e) => setSetting("tripay_merchant_code", e.target.value)}
                        placeholder="Contoh: T00001"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="API Key" description="Dari Tripay Dashboard → Developer → API Key">
                      <input type="password" value={settingsMap["tripay_api_key"] || ""} onChange={(e) => setSetting("tripay_api_key", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="Private Key" description="Dari Tripay Dashboard → Developer → Private Key (untuk signature)">
                      <input type="password" value={settingsMap["tripay_private_key"] || ""} onChange={(e) => setSetting("tripay_private_key", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
                    </FieldRow>
                    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan di Tripay Dashboard → Developer → Callback URL">
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/tripay`}
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "")}/api/webhook/tripay`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
                      </div>
                    </FieldRow>
                  </SettingsCard>
                  </>
                  )}

                  {/* ══ TAB: AUTENTIKASI ══ */}
                  {activeSettingsTab === "autentikasi" && (
                  <>
                  {/* Google OAuth 2.0 Settings */}
                  <SettingsCard
                    title="Google OAuth 2.0 (Login & Registrasi Klien)"
                    description="Kelola kredensial Google API Console untuk mengaktifkan fitur 1-Click Login dan Registrasi instan bagi calon pengantin via akun Google."
                    isEditing={Boolean(editSection["google"])}
                    onEdit={() => toggleEditSection("google")}
                    onCancel={() => cancelEdit("google", ["google_auth_enabled", "google_client_id", "google_client_secret"])}
                    onSave={() => saveSettings(["google_auth_enabled", "google_client_id", "google_client_secret"], setSavingGoogle, "google")}
                    saving={savingGoogle}
                    isDirty={isSectionDirty(["google_auth_enabled", "google_client_id", "google_client_secret"])}
                    saveSuccess={settingsSaved["google"]}
                    saveSuccessMessage="Pengaturan Google OAuth berhasil disimpan"
                    viewContent={
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Status Fitur Google</span>
                            <div className="mt-1">
                              {(settingsMap["google_auth_enabled"] ?? "true") === "true" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                  Nonaktif
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Google Client ID</span>
                            <span className="text-xs font-mono font-bold text-gray-800 mt-1 block truncate" title={settingsMap["google_client_id"]}>
                              {settingsMap["google_client_id"] ? settingsMap["google_client_id"] : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}
                            </span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Google Client Secret</span>
                            <span className="text-sm font-mono font-bold text-gray-800 mt-1 inline-block">
                              {settingsMap["google_client_secret"] ? "••••••••••••••••" : <em className="text-gray-400 font-sans font-normal text-xs">Belum diatur</em>}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs flex-wrap">
                          <span className="text-gray-600 font-medium">
                            Redirect Callback: <code className="font-mono text-gray-900 font-semibold">{`${currentOrigin}/api/auth/callback/google`}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`${currentOrigin}/api/auth/callback/google`)}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-semibold transition cursor-pointer"
                          >
                            Salin Callback
                          </button>
                        </div>
                      </div>
                    }
                  >
                    <FieldRow label="Status Fitur Login Google" description="Aktifkan atau nonaktifkan tombol 'Masuk / Daftar dengan Google' di portal klien.">
                      <div className="flex gap-3">
                        {[
                          { id: "true", label: "Aktif" },
                          { id: "false", label: "Nonaktif" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSetting("google_auth_enabled", opt.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                              (settingsMap["google_auth_enabled"] || "true") === opt.id
                                ? opt.id === "true"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-stone-700 text-white border-stone-700"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (settingsMap["google_auth_enabled"] || "true") === opt.id
                                ? "bg-white"
                                : opt.id === "true" ? "bg-emerald-500" : "bg-gray-400"
                            }`}></span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </FieldRow>

                    <FieldRow label="Google Client ID" description="Client ID dari Google Cloud Console (contoh: 123456789-abc.apps.googleusercontent.com)">
                      <input
                        type="text"
                        value={settingsMap["google_client_id"] || ""}
                        onChange={(e) => setSetting("google_client_id", e.target.value)}
                        placeholder="Contoh: 123456789012-xxxx.apps.googleusercontent.com"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>

                    <FieldRow label="Google Client Secret" description="Client Secret rahasia yang digenerate oleh Google Cloud Console">
                      <div className="relative">
                        <input
                          type={showGoogleSecret ? "text" : "password"}
                          value={settingsMap["google_client_secret"] || ""}
                          onChange={(e) => setSetting("google_client_secret", e.target.value)}
                          placeholder="••••••••••••••••••••••••••••••••"
                          className="w-full pl-3.5 pr-24 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                          className="absolute right-2.5 top-2.5 text-xs text-stone-700 hover:text-stone-900 font-semibold px-2.5 py-1 bg-stone-200 hover:bg-stone-300 rounded-md cursor-pointer transition"
                        >
                          {showGoogleSecret ? "Sembunyikan" : "Tampilkan"}
                        </button>
                      </div>
                    </FieldRow>

                    <FieldRow label="Authorized JavaScript Origins" description="Tambahkan URL ini ke 'Authorized JavaScript origins' di Google Cloud Console">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentOrigin}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(currentOrigin)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Salin
                        </button>
                      </div>
                    </FieldRow>

                    <FieldRow label="Authorized Redirect URI (Callback URL)" description="Tambahkan URL ini ke 'Authorized redirect URIs' di Google Cloud Console">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`${currentOrigin}/api/auth/callback/google`}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${currentOrigin}/api/auth/callback/google`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Salin
                        </button>
                      </div>
                    </FieldRow>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <p className="text-xs text-stone-500 leading-relaxed">
                          <strong className="text-stone-700">Catatan:</strong> Integrasi Google Drive telah dihapus dari sistem.
                          Media undangan kini disimpan di Cloudflare R2 atau penyimpanan lokal server.
                          Field <em>Google Client ID</em> dan <em>Client Secret</em> di atas tidak lagi digunakan.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 space-y-1.5 mt-2">
                      <span className="font-bold block text-gray-900">Panduan Konfigurasi Google Cloud Console:</span>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                        <li>Buka <strong className="text-gray-800">console.cloud.google.com</strong> Buat Project Buka <strong className="text-gray-800">APIs &amp; Services Credentials</strong>.</li>
                        <li>Klik <strong className="text-gray-800">Create Credentials OAuth client ID</strong>, pilih tipe <strong className="text-gray-800">Web application</strong>.</li>
                        <li>Salin dan tempelkan <em>Authorized JavaScript Origins</em> dan <em>Authorized Redirect URI</em> di atas.</li>
                        <li>Salin <strong className="text-gray-800">Client ID</strong> &amp; <strong className="text-gray-800">Client Secret</strong> yang didapat ke form ini, lalu klik tombol Uji Kredensial &amp; Simpan.</li>
                      </ol>
                    </div>
                  </SettingsCard>
                  </>
                  )}

                  {/* ══ TAB: PAKET & HARGA ══ */}
                  {activeSettingsTab === "paket" && (
                  <>
                  {/* Pricing Settings */}
                  <SettingsCard
                    title="Manajemen Harga & Paket"
                    description="Atur nama paket, harga, dan deskripsi untuk 3 kategori paket undangan."
                    isEditing={Boolean(editSection["pricing"])}
                    onEdit={() => toggleEditSection("pricing")}
                    onCancel={() => cancelEdit("pricing", ["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium", "features_traditional", "features_modern", "features_premium", "capabilities_traditional", "capabilities_modern", "capabilities_premium"])}
                    onSave={() => saveSettings(["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium", "features_traditional", "features_modern", "features_premium", "capabilities_traditional", "capabilities_modern", "capabilities_premium"], setSavingPricing, "pricing")}
                    saving={savingPricing}
                    isDirty={isSectionDirty(["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium", "features_traditional", "features_modern", "features_premium", "capabilities_traditional", "capabilities_modern", "capabilities_premium"])}
                    saveSuccess={settingsSaved["pricing"]}
                    saveSuccessMessage="Harga dan nama paket berhasil diperbarui"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                              {settingsMap["name_traditional"] || "Traditional"}
                            </span>
                            <span className="text-sm font-bold text-gray-900 font-mono">
                              Rp {Number(settingsMap["price_traditional"] || 299000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_traditional"] || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              {settingsMap["name_modern"] || "Modern"}
                            </span>
                            <span className="text-sm font-bold text-gray-900 font-mono">
                              Rp {Number(settingsMap["price_modern"] || 499000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_modern"] || "Tema Modern — Minimalis, Kontemporer & Sinematik"}</p>
                        </div>
                        <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                              {settingsMap["name_premium"] || "Premium"}
                            </span>
                            <span className="text-sm font-bold text-gray-900 font-mono">
                              Rp {Number(settingsMap["price_premium"] || 699000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_premium"] || "Tema Premium — Editorial, Full-Text & Luxury Visual Motion"}</p>
                        </div>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-sm font-bold text-gray-800">Paket 1 (Traditional)</span>
                        </div>
                        <FieldRow label="Nama Paket">
                          <input
                            type="text"
                            value={settingsMap["name_traditional"] || "Traditional"}
                            onChange={(e) => setSetting("name_traditional", e.target.value)}
                            placeholder="Contoh: Traditional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Harga (IDR)">
                          <input
                            type="number"
                            value={settingsMap["price_traditional"] || "299000"}
                            onChange={(e) => setSetting("price_traditional", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Deskripsi">
                          <textarea
                            rows={3}
                            value={settingsMap["desc_traditional"] || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional"}
                            onChange={(e) => setSetting("desc_traditional", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
                          />
                        </FieldRow>
                        <FieldRow label="Daftar Fitur (Satu per baris)">
                          <textarea
                            rows={4}
                            value={settingsMap["features_traditional"] || ""}
                            onChange={(e) => setSetting("features_traditional", e.target.value)}
                            placeholder="Pisahkan dengan baris baru (Enter)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
                          />
                        </FieldRow>
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
                          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
                            {AVAILABLE_CAPABILITIES.map(cap => (
                              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-600 w-3.5 h-3.5 cursor-pointer"
                                  checked={getCaps("capabilities_traditional").includes(cap.id)}
                                  onChange={() => toggleCap("capabilities_traditional", cap.id)}
                                />
                                <span>{cap.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                          <span className="text-sm font-bold text-gray-800">Paket 2 (Modern)</span>
                        </div>
                        <FieldRow label="Nama Paket">
                          <input
                            type="text"
                            value={settingsMap["name_modern"] || "Modern"}
                            onChange={(e) => setSetting("name_modern", e.target.value)}
                            placeholder="Contoh: Modern"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Harga (IDR)">
                          <input
                            type="number"
                            value={settingsMap["price_modern"] || "499000"}
                            onChange={(e) => setSetting("price_modern", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Deskripsi">
                          <textarea
                            rows={3}
                            value={settingsMap["desc_modern"] || "Tema Modern — Minimalis, Kontemporer & Sinematik"}
                            onChange={(e) => setSetting("desc_modern", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
                          />
                        </FieldRow>
                        <FieldRow label="Daftar Fitur (Satu per baris)">
                          <textarea
                            rows={4}
                            value={settingsMap["features_modern"] || ""}
                            onChange={(e) => setSetting("features_modern", e.target.value)}
                            placeholder="Pisahkan dengan baris baru (Enter)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
                          />
                        </FieldRow>
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
                          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
                            {AVAILABLE_CAPABILITIES.map(cap => (
                              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-600 w-3.5 h-3.5 cursor-pointer"
                                  checked={getCaps("capabilities_modern").includes(cap.id)}
                                  onChange={() => toggleCap("capabilities_modern", cap.id)}
                                />
                                <span>{cap.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                          <span className="text-sm font-bold text-gray-800">Paket 3 (Premium)</span>
                        </div>
                        <FieldRow label="Nama Paket">
                          <input
                            type="text"
                            value={settingsMap["name_premium"] || "Premium"}
                            onChange={(e) => setSetting("name_premium", e.target.value)}
                            placeholder="Contoh: Premium"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Harga (IDR)">
                          <input
                            type="number"
                            value={settingsMap["price_premium"] || "699000"}
                            onChange={(e) => setSetting("price_premium", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Deskripsi">
                          <textarea
                            rows={3}
                            value={settingsMap["desc_premium"] || "Tema Premium — Editorial, Full-Text & Luxury Visual Motion"}
                            onChange={(e) => setSetting("desc_premium", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                          />
                        </FieldRow>
                        <FieldRow label="Daftar Fitur (Satu per baris)">
                          <textarea
                            rows={4}
                            value={settingsMap["features_premium"] || ""}
                            onChange={(e) => setSetting("features_premium", e.target.value)}
                            placeholder="Pisahkan dengan baris baru (Enter)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
                          />
                        </FieldRow>
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
                          <div className="space-y-1.5 bg-white p-3 border border-purple-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
                            {AVAILABLE_CAPABILITIES.map(cap => (
                              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-purple-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  className="rounded border-purple-300 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                                  checked={getCaps("capabilities_premium").includes(cap.id)}
                                  onChange={() => toggleCap("capabilities_premium", cap.id)}
                                />
                                <span>{cap.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Add-ons & Extension Pricing Settings */}
                  <SettingsCard
                    title="Layanan Tambahan (Add-Ons) & Perpanjangan"
                    description="Atur tarif dinamis untuk layanan integrasi custom domain (1 tahun) dan perpanjangan masa aktif URL asli pasca acara (bulanan via QRIS)."
                    isEditing={Boolean(editSection["addons"])}
                    onEdit={() => toggleEditSection("addons")}
                    onCancel={() => cancelEdit("addons", ["gallery_extension_price_per_month", "addon_custom_domain_price", "addon_custom_domain_enabled"])}
                    onSave={() => saveSettings(["gallery_extension_price_per_month", "addon_custom_domain_price", "addon_custom_domain_enabled"], setSavingAddons, "addons")}
                    saving={savingAddons}
                    isDirty={isSectionDirty(["gallery_extension_price_per_month", "addon_custom_domain_price", "addon_custom_domain_enabled"])}
                    saveSuccess={settingsSaved["addons"]}
                    saveSuccessMessage="Pengaturan layanan add-on berhasil diperbarui"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-amber-900 block">Jasa Integrasi Custom Domain (1 Thn)</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                settingsMap["addon_custom_domain_enabled"] !== "false"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                                  : "bg-amber-100 text-amber-800 border border-amber-300/60"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  settingsMap["addon_custom_domain_enabled"] !== "false" ? "bg-emerald-500" : "bg-amber-500"
                                }`}></span>
                                {settingsMap["addon_custom_domain_enabled"] !== "false" ? "Aktif Ditawarkan" : "Coming Soon"}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-mono font-bold text-amber-950">
                                Rp {Number(settingsMap["addon_custom_domain_price"] || 150000).toLocaleString("id-ID")}
                              </span>
                              <span className="text-xs text-amber-800 font-medium">/ 1 Tahun</span>
                            </div>
                            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                              Jasa integrasi domain pribadi milik klien (DNS &amp; Auto-SSL) dan otomatis mengaktifkan masa tayang URL asli serta galeri kenangan undangan selama 1 tahun penuh.
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                          <span className="text-xs font-bold text-purple-900 block mb-1">Perpanjang Masa Aktif URL Asli / Galeri (Bulanan)</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-purple-950">
                              Rp {Number(settingsMap["gallery_extension_price_per_month"] || 50000).toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs text-purple-800 font-medium">/ 30 Hari</span>
                          </div>
                          <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                            Biaya perpanjangan masa aktif URL asli undangan (yang pasca acara beralih ke galeri momen) dan penyimpanan foto tamu di cloud per 30 hari via QRIS dinamis.
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <FieldRow
                        label="Status Fitur Custom Domain (Dasbor Klien)"
                        description="Aktifkan untuk membuka pemesanan domain pribadi bagi klien, atau nonaktifkan untuk menampilkan mode 'Segera Hadir / Belum Tersedia' di dasbor klien."
                      >
                        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settingsMap["addon_custom_domain_enabled"] !== "false"}
                              onChange={(e) => setSetting("addon_custom_domain_enabled", e.target.checked ? "true" : "false")}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                          <span className="text-xs font-bold text-stone-800">
                            {settingsMap["addon_custom_domain_enabled"] !== "false"
                              ? "Aktif — Klien dapat memesan custom domain pribadi"
                              : "Nonaktif — Mode Coming Soon / Belum Tersedia di klien"}
                          </span>
                        </div>
                      </FieldRow>

                      <FieldRow
                        label="Tarif Jasa Custom Domain &amp; Perpanjangan URL Asli (1 Tahun)"
                        description="Biaya jasa integrasi domain pribadi milik klien (DNS &amp; SSL) serta garansi masa aktif URL asli &amp; galeri kenangan selama 1 tahun penuh (Rupiah)."
                      >
                        <input
                          type="number"
                          min="10000"
                          step="5000"
                          value={settingsMap["addon_custom_domain_price"] || "150000"}
                          onChange={(e) => setSetting("addon_custom_domain_price", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>

                      <FieldRow
                        label="Tarif Perpanjangan Masa Aktif URL Asli / Galeri (Rupiah / 30 Hari)"
                        description="Nominal tagihan QRIS dinamis per bulan untuk mempertahankan eksistensi URL asli undangan (galeri momen) dan file foto tamu di server R2."
                      >
                        <input
                          type="number"
                          min="10000"
                          step="5000"
                          value={settingsMap["gallery_extension_price_per_month"] || "50000"}
                          onChange={(e) => setSetting("gallery_extension_price_per_month", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>
                    </div>
                  </SettingsCard>
                  </>
                  )}

                  {/* ══ TAB: SETUP & INTEGRASI ══ */}
                  {activeSettingsTab === "setup" && (
                  <>
                  {/* Integrasi Domain & DNS Server */}
                  <SettingsCard
                    title="Integrasi Domain Pribadi & DNS Server"
                    description="Konfigurasikan IP Publik VPS dan host CNAME target platform. Nilai ini menjadi sumber data dinamis bagi panduan setup DNS di dashboard klien."
                    isEditing={Boolean(editSection["domain_dns"])}
                    onEdit={() => toggleEditSection("domain_dns")}
                    onCancel={() => cancelEdit("domain_dns", ["server_public_ip", "cname_target"])}
                    onSave={() => saveSettings(["server_public_ip", "cname_target"], setSavingDomainDns, "domain_dns")}
                    saving={savingDomainDns}
                    isDirty={isSectionDirty(["server_public_ip", "cname_target"])}
                    saveSuccess={settingsSaved["domain_dns"]}
                    saveSuccessMessage="Pengaturan Integrasi Domain & DNS berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Record A (IP Public Server)</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Wajib untuk @</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-900 block mt-1">
                              {settingsMap["server_public_ip"] || "Belum diatur (Klik Edit untuk mengisi atau deteksi otomatis)"}
                            </span>
                            <p className="text-[11px] text-gray-500 mt-1.5">
                              Digunakan klien untuk mengarahkan root apex domain (@) ke VPS Anda.
                            </p>
                          </div>

                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Record CNAME (Host Target)</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">Untuk www</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-gray-900 block mt-1">
                              {settingsMap["cname_target"] || "Belum diatur"}
                            </span>
                            <p className="text-[11px] text-gray-500 mt-1.5">
                              Target hostname yang diarahkan klien untuk subdomain kustom atau awalan www.
                            </p>
                          </div>
                        </div>

                        {/* Live Pratinjau Panduan DNS Klien */}
                        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Live Preview: Tampilan Langkah DNS di Dashboard Klien</span>
                            </h4>
                            <span className="text-[10px] font-medium text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">Pratinjau Klien</span>
                          </div>
                          <p className="text-[11px] text-amber-900/80 leading-relaxed">
                            Berikut adalah tabel DNS yang akan dilihat langsung oleh klien di menu <em>Dashboard &gt; Domain Sendiri</em>:
                          </p>
                          <div className="rounded-lg overflow-hidden border border-amber-200 text-[11px] font-mono bg-white shadow-2xs">
                            <div className="grid grid-cols-3 bg-amber-100/60 px-3 py-1.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                              <span>Type</span>
                              <span>Host / Name</span>
                              <span>Value / Target</span>
                            </div>
                            <div className="grid grid-cols-3 px-3 py-2 border-b border-amber-100 text-stone-800 items-center">
                              <span className="font-bold text-amber-700">A</span>
                              <span>@</span>
                              <span className="font-bold text-stone-900 break-all">{settingsMap["server_public_ip"] || "IP Belum Diatur"}</span>
                            </div>
                            <div className="grid grid-cols-3 px-3 py-2 text-stone-800 items-center">
                              <span className="font-bold text-sky-700">CNAME</span>
                              <span>www</span>
                              <span className="font-bold text-stone-900 break-all">{settingsMap["cname_target"] || "Host Belum Diatur"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed">
                        <strong>Mengapa perlu IP Server &amp; CNAME?</strong> Sebagian besar registrar domain lokal (Niagahoster, Domainesia, IDWebhost, Namecheap) melarang CNAME pada root domain (<strong>@</strong>). Oleh karena itu, root domain diarahkan via <strong>Record A</strong> ke IP server, sedangkan <strong>www</strong> diarahkan via <strong>Record CNAME</strong>.
                      </div>

                      <FieldRow
                        label="IP Public Server (Record A)"
                        description="Alamat IP publik VPS Anda. Klien akan memasukkan nilai ini untuk record A (@)."
                      >
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={settingsMap["server_public_ip"] || ""}
                              onChange={(e) => setSetting("server_public_ip", e.target.value.trim())}
                              placeholder="Contoh: 103.186.xxx.xxx"
                              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={handleDetectServerIp}
                              disabled={detectingServerIp}
                              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                            >
                              {detectingServerIp ? (
                                <><span className="w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" /> Mendeteksi...</>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                  Deteksi IP Otomatis
                                </>
                              )}
                            </button>
                          </div>
                          {detectIpResult && (
                            <p className={`text-xs font-medium ${detectIpResult.success ? "text-emerald-700" : "text-rose-600"}`}>
                              {detectIpResult.message}
                            </p>
                          )}
                        </div>
                      </FieldRow>

                      <FieldRow
                        label="Host Target CNAME (Custom Domain)"
                        description="Target hostname yang dituju record CNAME klien (misal: cname.domainanda.id atau invite.domainanda.id)."
                      >
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={settingsMap["cname_target"] || ""}
                            onChange={(e) => setSetting("cname_target", e.target.value.trim())}
                            placeholder="Contoh: cname.domainanda.id"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-gray-500">Preset cepat dari host aktif:</span>
                            {["cname", "invite"].map((prefix) => {
                              const hostClean = currentOrigin.replace(/^https?:\/\//, "").split(":")[0];
                              const presetVal = `${prefix}.${hostClean}`;
                              return (
                                <button
                                  key={prefix}
                                  type="button"
                                  onClick={() => setSetting("cname_target", presetVal)}
                                  className="text-[10px] font-mono font-semibold bg-stone-100 hover:bg-amber-100 hover:text-amber-800 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 transition cursor-pointer"
                                >
                                  + {presetVal}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </FieldRow>
                    </div>
                  </SettingsCard>

                  {/* Server Email (SMTP) Configuration */}
                  <SettingsCard
                    title="Server Email (SMTP) untuk Pengiriman Invoice"
                    description="Konfigurasikan akun SMTP (Gmail, Mailgun, Brevo, atau Webmail hosting) untuk mengirimkan faktur tagihan (UNPAID) dan kuitansi resmi (PAID) secara otomatis ke email klien."
                    isEditing={Boolean(editSection["smtp"])}
                    onEdit={() => toggleEditSection("smtp")}
                    onCancel={() => cancelEdit("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"])}
                    onSave={() => saveSettings(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"], setSavingSmtp, "smtp")}
                    saving={savingSmtp}
                    isDirty={isSectionDirty(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"])}
                    saveSuccess={settingsSaved["smtp"]}
                    saveSuccessMessage="Pengaturan server email SMTP berhasil disimpan"
                    viewContent={
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Status Pengiriman</span>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {settingsMap["smtp_host"] && settingsMap["smtp_user"] ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  SMTP Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                  Belum Dikonfigurasi
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Host SMTP</span>
                            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5 truncate">
                              {settingsMap["smtp_host"] || "Belum diisi"}
                            </span>
                          </div>

                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Port</span>
                            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5">
                              {settingsMap["smtp_port"] || "587"}
                            </span>
                          </div>

                          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Akun Pengirim</span>
                            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5 truncate">
                              {settingsMap["smtp_user"] || "Belum diisi"}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500">
                          {settingsMap["smtp_host"] && settingsMap["smtp_user"]
                            ? "Klien akan menerima faktur invoice HTML otomatis setiap kali checkout dan setelah pembayaran QRIS lunas."
                            : "Server email belum diatur. Transaksi tetap berjalan normal via QRIS, dan pengiriman email otomatis dilewati secara aman."}
                        </p>
                      </div>
                    }
                  >
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <FieldRow label="SMTP Host" description="Contoh: smtp.gmail.com atau mail.domainanda.com">
                            <input
                              type="text"
                              value={settingsMap["smtp_host"] || ""}
                              onChange={(e) => setSetting("smtp_host", e.target.value)}
                              placeholder="smtp.gmail.com"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </FieldRow>
                        </div>
                        <div>
                          <FieldRow label="SMTP Port" description="587 (TLS) atau 465 (SSL)">
                            <input
                              type="number"
                              value={settingsMap["smtp_port"] || "587"}
                              onChange={(e) => setSetting("smtp_port", e.target.value)}
                              placeholder="587"
                              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                            />
                          </FieldRow>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldRow label="Username / Email SMTP" description="Email login akun SMTP Anda">
                          <input
                            type="text"
                            value={settingsMap["smtp_user"] || ""}
                            onChange={(e) => setSetting("smtp_user", e.target.value)}
                            placeholder="billing@domainanda.com"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </FieldRow>
                        <FieldRow label="Password / App Password" description="Gunakan App Password untuk akun Gmail">
                          <input
                            type="password"
                            value={settingsMap["smtp_password"] || ""}
                            onChange={(e) => setSetting("smtp_password", e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </FieldRow>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldRow label="Email Pengirim (From Email)" description="Alamat yang tertera sebagai pengirim invoice">
                          <input
                            type="email"
                            value={settingsMap["smtp_from_email"] || ""}
                            onChange={(e) => setSetting("smtp_from_email", e.target.value)}
                            placeholder="no-reply@domainanda.com"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </FieldRow>
                        <FieldRow label="Nama Pengirim (From Name)" description="Nama instansi/brand yang muncul di inbox">
                          <input
                            type="text"
                            value={settingsMap["smtp_from_name"] || ""}
                            onChange={(e) => setSetting("smtp_from_name", e.target.value)}
                            placeholder="Billing & Finance"
                            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
                          />
                        </FieldRow>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Limit Upload Memori */}
                  <SettingsCard
                    title="Batas Upload Galeri Tamu (Memories)"
                    description="Tentukan batas ukuran file maksimum untuk foto yang diunggah oleh tamu."
                    isEditing={Boolean(editSection["upload_limit"])}
                    onEdit={() => toggleEditSection("upload_limit")}
                    onCancel={() => cancelEdit("upload_limit", ["max_upload_mb"])}
                    onSave={() => saveSettings(["max_upload_mb"], setSavingPlatformCustom, "upload_limit")}
                    saving={savingPlatformCustom}
                    isDirty={isSectionDirty(["max_upload_mb"])}
                    saveSuccess={settingsSaved["upload_limit"]}
                    saveSuccessMessage="Batas upload berhasil disimpan"
                    viewContent={
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                        <span className="text-3xl font-mono font-bold text-gray-900">{settingsMap["max_upload_mb"] || "5"}</span>
                        <span className="text-sm text-gray-500 font-medium mt-1">Megabyte (MB) per file</span>
                      </div>
                    }
                  >
                    <FieldRow label="Maksimal Ukuran File (MB)">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settingsMap["max_upload_mb"] || "5"}
                        onChange={(e) => setSetting("max_upload_mb", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs max-w-[200px]"
                      />
                    </FieldRow>
                  </SettingsCard>

                  {/* Subdomain Lifecycle & Archiving Settings */}
                  <SettingsCard
                    title="Siklus Hidup & Daur Ulang Subdomain"
                    description="Atur masa tenggang (grace period) keaktifan subdomain setelah acara selesai, dan otomatisasi pelepasan subdomain ke pool agar dapat digunakan kembali oleh pasangan baru."
                    isEditing={Boolean(editSection["subdomain"])}
                    onEdit={() => toggleEditSection("subdomain")}
                    onCancel={() => cancelEdit("subdomain", ["subdomain_grace_days", "subdomain_auto_recycle", "retention_invitation_days", "retention_account_days", "retention_invitation_grace_days", "retention_gallery_default_days"])}
                    onSave={() => saveSettings(["subdomain_grace_days", "subdomain_auto_recycle", "retention_invitation_days", "retention_account_days", "retention_invitation_grace_days", "retention_gallery_default_days"], setSavingSubdomainSettings, "subdomain")}
                    saving={savingSubdomainSettings}
                    isDirty={isSectionDirty(["subdomain_grace_days", "subdomain_auto_recycle", "retention_invitation_days", "retention_account_days", "retention_invitation_grace_days", "retention_gallery_default_days"])}
                    saveSuccess={settingsSaved["subdomain"]}
                    saveSuccessMessage="Pengaturan siklus hidup subdomain berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                            <span className="text-xs text-amber-950 font-bold block mb-1">Transisi Undangan ke Galeri</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-mono font-bold text-amber-900">
                                {settingsMap["retention_invitation_grace_days"] || "7"}
                              </span>
                              <span className="text-xs text-amber-800 font-medium">Hari pasca acara</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                              Undangan utama ditutup dan URL otomatis beralih menjadi Galeri Momen Tamu (Event Summary).
                            </p>
                          </div>

                          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200">
                            <span className="text-xs text-purple-950 font-bold block mb-1">Masa Simpan Galeri Default</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-mono font-bold text-purple-900">
                                {settingsMap["retention_gallery_default_days"] || "30"}
                              </span>
                              <span className="text-xs text-purple-800 font-medium">Hari</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                              Foto tamu disimpan sebelum dibersihkan dari R2 jika klien tidak memperpanjang.
                            </p>
                          </div>

                          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                            <span className="text-xs text-stone-900 font-bold block mb-1">Status Auto-Recycle ke Pool</span>
                            <div className="mt-1">
                              {(settingsMap["subdomain_auto_recycle"] || "true") === "true" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Otomatis Daur Ulang Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                  Pelepasan Manual Saja
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                              Undangan lama tetap dapat diakses seumur hidup via link path.
                            </p>
                          </div>

                          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                            <span className="text-xs text-rose-950 font-bold block mb-1">Pembersihan Total Akun</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-mono font-bold text-rose-900">
                                {settingsMap["retention_account_days"] || "365"}
                              </span>
                              <span className="text-xs text-rose-800 font-medium">Hari</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                              Akun klien lama tanpa undangan aktif dibersihkan setelah {settingsMap["retention_account_days"] || "365"} hari.
                            </p>
                          </div>
                        </div>

                        {/* Manual Trigger & Maintenance Action */}
                        <div className="p-4 bg-stone-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              <span>Pembersihan Subdomain Kedaluwarsa</span>
                            </h4>
                            <p className="text-[11px] text-stone-300 mt-0.5">
                              Eksekusi manual untuk melepaskan semua subdomain yang telah lewat masa tenggang (&gt; {settingsMap["subdomain_grace_days"] || "7"} hari).
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleManualRecycleSubdomains}
                            disabled={recyclingSubdomains}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {recyclingSubdomains ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Memproses...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Jalankan Pembersihan Sekarang</span>
                              </>
                            )}
                          </button>
                        </div>

                        {recycleResult && (
                          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                            recycleResult.success
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-medium"
                              : "bg-rose-50 border-rose-300 text-rose-950 font-medium"
                          }`}>
                            <span>{recycleResult.success ? "✓" : "✕"}</span>
                            <span>{recycleResult.message}</span>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <FieldRow label="Masa Tenggang Subdomain (Hari)" description="Jumlah hari subdomain tetap aktif setelah tanggal acara pernikahan selesai sebelum dilepas kembali ke pool (contoh: 7, 14, 30 hari).">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={settingsMap["subdomain_grace_days"] || "7"}
                          onChange={(e) => setSetting("subdomain_grace_days", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>
                      
                      <FieldRow label="Jeda Transisi Undangan ke Galeri (Hari)" description="Jumlah hari setelah tanggal acara pernikahan selesai sebelum undangan utama ditutup dan URL otomatis dialihkan menjadi Galeri Momen Acara.">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={settingsMap["retention_invitation_grace_days"] || "7"}
                          onChange={(e) => setSetting("retention_invitation_grace_days", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>

                      <FieldRow label="Masa Simpan Default Galeri Tamu (Hari)" description="Jeda hari pasca-acara sebelum cronjob membersihkan file foto tamu mentah dari Cloudflare R2 / Server (jika klien tidak memperpanjang).">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={settingsMap["retention_gallery_default_days"] || "30"}
                          onChange={(e) => setSetting("retention_gallery_default_days", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>

                      <FieldRow label="Retensi Pembersihan Interaktif (Hari)" description="Jeda hari pasca-acara sebelum sistem menghapus data tamu & RSVP untuk membebaskan storage database (Tahap 1).">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={settingsMap["retention_invitation_days"] || "30"}
                          onChange={(e) => setSetting("retention_invitation_days", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>

                      <FieldRow label="Pembersihan Total Akun & Portofolio (Hari)" description="Jeda waktu (berdasarkan umur akun) sebelum sistem menghapus klien dan seluruh media fisiknya secara permanen (Tahap 2).">
                        <input
                          type="number"
                          min="30"
                          max="1825"
                          value={settingsMap["retention_account_days"] || "365"}
                          onChange={(e) => setSetting("retention_account_days", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </FieldRow>

                      <FieldRow label="Otomatis Daur Ulang Subdomain" description="Jika aktif, sistem otomatis melepaskan subdomain kedaluwarsa saat ada pendaftaran baru atau query berkala.">
                        <div className="flex gap-3">
                          {[
                            { id: "true", label: "Aktif (Otomatis Lepas)" },
                            { id: "false", label: "Manual Saja" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSetting("subdomain_auto_recycle", opt.id)}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                                (settingsMap["subdomain_auto_recycle"] || "true") === opt.id
                                  ? opt.id === "true"
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : "bg-stone-700 text-white border-stone-700"
                                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (settingsMap["subdomain_auto_recycle"] || "true") === opt.id
                                  ? "bg-white"
                                  : opt.id === "true" ? "bg-emerald-500" : "bg-gray-400"
                              }`}></span>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </FieldRow>
                    </div>
                  </SettingsCard>

                  </>
                  )}

                  {/* ══ TAB: PLATFORM & TAMPILAN ══ */}
                  {activeSettingsTab === "platform" && (
                  <>

                  {/* WhatsApp Template Settings */}
                  <SettingsCard
                    title="Template Pesan WhatsApp (Pengiriman Undangan)"
                    description="Kustomisasi pesan default yang akan dikirimkan ke tamu via WhatsApp. Gunakan placeholder {{GUEST_NAME}}, {{INVITATION_URL}}, {{COUPLE_NAMES}}."
                    isEditing={Boolean(editSection["wa_template"])}
                    onEdit={() => toggleEditSection("wa_template")}
                    onCancel={() => cancelEdit("wa_template", ["wa_template_message"])}
                    onSave={() => saveSettings(["wa_template_message"], setSavingPlatformCustom, "wa_template")}
                    saving={savingPlatformCustom}
                    isDirty={isSectionDirty(["wa_template_message"])}
                    saveSuccess={settingsSaved["wa_template"]}
                    saveSuccessMessage="Template WhatsApp berhasil disimpan"
                    viewContent={
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
                        {settingsMap["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{COUPLE_NAMES}}"}
                      </div>
                    }
                  >
                    <FieldRow label="Isi Pesan WhatsApp" description="Pesan ini akan menjadi default untuk semua klien.">
                      <textarea
                        rows={6}
                        value={settingsMap["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{COUPLE_NAMES}}"}
                        onChange={(e) => setSetting("wa_template_message", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>
                  </SettingsCard>

                  {/* Landing Page Feature Cards Settings */}
                  <SettingsCard
                    title="Fitur Landing Page (3 Kartu)"
                    description="Sesuaikan judul dan deskripsi untuk 3 kartu fitur utama di halaman depan (Landing Page)."
                    isEditing={Boolean(editSection["landing_features"])}
                    onEdit={() => toggleEditSection("landing_features")}
                    onCancel={() => cancelEdit("landing_features", ["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
                    onSave={() => saveSettings(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"], setSavingPlatformCustom, "landing_features")}
                    saving={savingPlatformCustom}
                    isDirty={isSectionDirty(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
                    saveSuccess={settingsSaved["landing_features"]}
                    saveSuccessMessage="Fitur Landing Page berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        {[1, 2, 3].map((num) => (
                          <div key={num} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-amber-600 font-bold block mb-1">Kartu Fitur {num}</span>
                            <div className="font-bold text-gray-800 text-sm">{settingsMap[`landing_feature_${num}_title`] || (num === 1 ? "Desain Elegan & Responsif" : num === 2 ? "Manajemen Tamu & WhatsApp" : "Galeri Foto Dinamis")}</div>
                            <div className="text-xs text-gray-500 mt-1">{settingsMap[`landing_feature_${num}_desc`] || (num === 1 ? "Desain visual modern yang memukau di perangkat apa pun." : num === 2 ? "Generator link pintar per tamu dengan automasi pesan." : "Layout Masonry cerdas untuk galeri foto pernikahan.")}</div>
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {[1, 2, 3].map((num) => (
                        <div key={num} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
                          <h4 className="text-sm font-bold text-gray-700">Kartu {num}</h4>
                          <FieldRow label="Judul">
                            <input
                              type="text"
                              value={settingsMap[`landing_feature_${num}_title`] || ""}
                              onChange={(e) => setSetting(`landing_feature_${num}_title`, e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
                            />
                          </FieldRow>
                          <FieldRow label="Deskripsi">
                            <textarea
                              rows={2}
                              value={settingsMap[`landing_feature_${num}_desc`] || ""}
                              onChange={(e) => setSetting(`landing_feature_${num}_desc`, e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
                            />
                          </FieldRow>
                        </div>
                      ))}
                    </div>
                  </SettingsCard>





                  {/* Branding — Logo & Favicon */}
                  <div
                    className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
                      editSection["branding"]
                        ? "border-amber-400 ring-2 ring-amber-400/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Branding — Logo &amp; Favicon</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Identitas visual platform yang otomatis terpasang dan tersinkronisasi di seluruh halaman.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          toggleEditSection("branding");
                          setPendingLogo(null);
                          setPendingFavicon(null);
                          setPreviewLogo(null);
                          setPreviewFavicon(null);
                          setBrandUploadMsg(null);
                        }}
                        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{editSection["branding"] ? "Tutup Form" : "Ubah File"}</span>
                      </button>
                    </div>

                    {/* Upload Message */}
                    {brandUploadMsg && (
                      <div className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        brandUploadMsg.ok
                          ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                          : "bg-rose-50 border border-rose-300 text-rose-900"
                      }`}>
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {brandUploadMsg.ok
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          }
                        </svg>
                        <span>[{brandUploadMsg.type.toUpperCase()}] {brandUploadMsg.msg}</span>
                      </div>
                    )}

                    {/* ── Minimized Summary View (Saat tidak mode edit) ── */}
                    {!editSection["branding"] ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Summary Logo */}
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                              {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold font-serif text-amber-800 text-sm">L</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Logo Platform</span>
                              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                                {logoUrl ? "logo.webp (Optimal)" : "Menggunakan Monogram"}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            logoUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                          }`}>
                            {logoUrl ? "● Terpasang" : "Default"}
                          </span>
                        </div>

                        {/* Summary Favicon */}
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                              {faviconUrl ? (
                                <img src={faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
                              ) : (
                                <span className="font-bold text-gray-400 text-xs">ICO</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Favicon Tab</span>
                              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                                {faviconUrl ? "favicon.png (64×64)" : "favicon.ico"}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            faviconUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                          }`}>
                            {faviconUrl ? "● Terpasang" : "Default"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* ── Expanded Form Edit Mode ── */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* ── Logo Upload ── */}
                        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
                          <div>
                            <p className="text-sm font-bold text-gray-800">Upload Logo Baru</p>
                            <p className="text-xs text-gray-400 mt-0.5">Format: WebP, maks. 800px. Menimpa logo sebelumnya.</p>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                              {(previewLogo || logoUrl) ? (
                                <img src={previewLogo ?? logoUrl!} alt="Logo preview" className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold font-serif text-gray-400 text-sm">L</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-gray-500 truncate">
                                {pendingLogo
                                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingLogo.name}</span>
                                  : logoUrl ? "/assets/brand/logo.webp" : "Belum ada logo"
                                }
                              </p>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                                Pilih File Logo
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setPendingLogo(f);
                                    setPreviewLogo(URL.createObjectURL(f));
                                    setBrandUploadMsg(null);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            {pendingLogo && (
                              <button
                                type="button"
                                onClick={() => { setPendingLogo(null); setPreviewLogo(null); }}
                                disabled={uploadingLogo}
                                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
                              >
                                Batal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => uploadBrandAsset("logo")}
                              disabled={!pendingLogo || uploadingLogo}
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                            >
                              {uploadingLogo ? (
                                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                              ) : "Simpan Logo"}
                            </button>
                          </div>
                        </div>

                        {/* ── Favicon Upload ── */}
                        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
                          <div>
                            <p className="text-sm font-bold text-gray-800">Upload Favicon Baru</p>
                            <p className="text-xs text-gray-400 mt-0.5">Format: PNG 64×64px. Menimpa favicon sebelumnya.</p>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                              {(previewFavicon || faviconUrl) ? (
                                <img src={previewFavicon ?? faviconUrl!} alt="Favicon preview" className="w-8 h-8 object-contain" />
                              ) : (
                                <span className="font-bold text-gray-400 text-xs">ICO</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-gray-500 truncate">
                                {pendingFavicon
                                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingFavicon.name}</span>
                                  : faviconUrl ? "/assets/brand/favicon.png" : "Belum ada favicon"
                                }
                              </p>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                                Pilih File Favicon
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setPendingFavicon(f);
                                    setPreviewFavicon(URL.createObjectURL(f));
                                    setBrandUploadMsg(null);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            {pendingFavicon && (
                              <button
                                type="button"
                                onClick={() => { setPendingFavicon(null); setPreviewFavicon(null); }}
                                disabled={uploadingFavicon}
                                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
                              >
                                Batal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => uploadBrandAsset("favicon")}
                              disabled={!pendingFavicon || uploadingFavicon}
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                            >
                              {uploadingFavicon ? (
                                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                              ) : "Simpan Favicon"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Platform Settings */}
                  <SettingsCard
                    title="Konfigurasi Platform & Tampilan"
                    description="Nama platform, kontak resmi, dan teks headline hero yang digunakan di seluruh sistem."
                    isEditing={Boolean(editSection["platform"])}
                    onEdit={() => toggleEditSection("platform")}
                    onCancel={() => cancelEdit("platform", ["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
                    onSave={() => saveSettings(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"], setSavingPlatform, "platform")}
                    saving={savingPlatform}
                    isDirty={isSectionDirty(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
                    saveSuccess={settingsSaved["platform"]}
                    saveSuccessMessage="Konfigurasi platform & tampilan berhasil disimpan"
                    viewContent={
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Nama Platform</span>
                            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["platform_name"] || "Luxenary"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Domain Host</span>
                            <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 inline-block">{currentOrigin}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Email Support</span>
                            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["support_email"] || "Belum diatur"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">WhatsApp Admin / CS</span>
                            <span className="text-sm font-bold text-emerald-700 mt-0.5 inline-block">{settingsMap["support_whatsapp"] ? `+${settingsMap["support_whatsapp"]}` : "Belum diatur"}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Tagline Hero (Halaman Utama)</span>
                            <span className="text-xs font-semibold text-gray-800 mt-0.5 inline-block">{settingsMap["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Deskripsi Subtitle Hero</span>
                            <span className="text-xs text-gray-600 mt-0.5 line-clamp-2">{settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif..."}</span>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow label="Nama Platform">
                        <input
                          type="text"
                          value={settingsMap["platform_name"] !== undefined ? settingsMap["platform_name"] : "Luxenary"}
                          onChange={(e) => setSetting("platform_name", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Domain Host Platform" description="Domain terdeteksi otomatis dari host server aktif.">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono flex items-center justify-between">
                          <span>{currentOrigin}</span>
                          <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-sans font-bold">● Auto</span>
                        </div>
                      </FieldRow>

                      <FieldRow label="Email Support">
                        <input
                          type="email"
                          value={settingsMap["support_email"] || ""}
                          onChange={(e) => setSetting("support_email", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Nomor WhatsApp Admin / CS" description="Gunakan kode negara tanpa +, contoh: 6281234567890">
                        <input
                          type="text"
                          value={settingsMap["support_whatsapp"] || ""}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9]/g, "");
                            if (val.startsWith("0")) val = "62" + val.slice(1);
                            setSetting("support_whatsapp", val);
                          }}
                          placeholder="Contoh: 6281234567890"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      </div>

                    <FieldRow label="Tagline Hero (Headline Besar Halaman Utama)">
                      <input
                        type="text"
                        value={settingsMap["hero_tagline"] || "Undangan Pernikahan Digital Elegan, Hangat & Berkelas"}
                        onChange={(e) => setSetting("hero_tagline", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>

                    <FieldRow label="Deskripsi / Subtitle Hero Halaman Utama">
                      <textarea
                        rows={3}
                        value={settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, dan buku tamu real-time."}
                        onChange={(e) => setSetting("hero_subtitle", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none shadow-2xs"
                      />
                    </FieldRow>
                  </SettingsCard>
                  </>
                  )}
                </div>
              )}

              {/* ── Database & Backup ── */}
              {activeTab === "database" && (
                <div className="space-y-6">
                  {/* Header & Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Database &amp; Snapshot Manager</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Kelola backup, snapshot database PostgreSQL mandiri, jadwal auto-backup, dan pemulihan data (restore).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSnapshot}
                      disabled={creatingSnapshot}
                      className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {creatingSnapshot ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Membuat Snapshot...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Buat Snapshot Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {backupActionMsg && (
                    <div className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
                      backupActionMsg.ok
                        ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
                        : "bg-rose-50 border border-rose-300 text-rose-900"
                    }`}>
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {backupActionMsg.ok
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        }
                      </svg>
                      <span>{backupActionMsg.msg}</span>
                    </div>
                  )}

                  {/* Database Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <span className="text-xs text-gray-500 font-medium block">Database Engine &amp; File Aktif</span>
                      <span className="text-sm font-bold text-gray-900 mt-1 inline-block">PostgreSQL (pg_dump)</span>
                      <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">● Connected &amp; Running</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <span className="text-xs text-gray-500 font-medium block">Total Snapshot Tersedia</span>
                      <span className="text-2xl font-bold text-gray-900 mt-1 inline-block">{snapshots.length}</span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">File `.db` di server</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <span className="text-xs text-gray-500 font-medium block">Path Direktori Backup</span>
                      <span className="text-xs font-mono font-bold text-amber-900 mt-1 inline-block bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60">
                        {settingsMap["backup_path"] || "/data/backups"}
                      </span>
                    </div>
                  </div>

                  {/* ── Card 1: Upload File Snapshot & Restore ── */}
                  <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
                    showUploadSnapshot ? "border-amber-400 ring-2 ring-amber-400/20" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <div className="flex items-start justify-between gap-4 mb-3 border-b border-gray-100 pb-3.5">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Upload &amp; Restore Snapshot (.db)</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Pulihkan database dari file backup eksternal. Safety backup dibuat otomatis sebelum data ditimpa.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUploadSnapshot(!showUploadSnapshot);
                          setPendingRestoreFile(null);
                        }}
                        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{showUploadSnapshot ? "Tutup Form" : "Upload File"}</span>
                      </button>
                    </div>

                    {!showUploadSnapshot ? (
                      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Format didukung: <strong>.sql, .backup</strong>. Engine aktif saat ini: <strong>PostgreSQL</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUploadSnapshot(true)}
                          className="text-amber-800 hover:underline font-semibold text-xs cursor-pointer"
                        >
                          Pilih file snapshot
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700">Pilih File Snapshot Database</p>
                            <p className="text-xs text-gray-500">
                              {pendingRestoreFile ? (
                                <span className="text-amber-800 font-bold">File terpilih: {pendingRestoreFile.name} ({(pendingRestoreFile.size / 1024).toFixed(1)} KB)</span>
                              ) : (
                                "Belum ada file dipilih (format didukung: .sql, .backup)"
                              )}
                            </p>
                          </div>

                          <label className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl cursor-pointer transition text-center shrink-0">
                            Pilih File .db
                            <input
                              type="file"
                              accept=".sql,.backup"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setPendingRestoreFile(f);
                                  setBackupActionMsg(null);
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>

                        {/* Warning & Simpan / Restore Actions */}
                        <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-stone-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>Sistem otomatis membuat safety backup sebelum restore dieksekusi.</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {pendingRestoreFile && (
                              <button
                                type="button"
                                onClick={() => setPendingRestoreFile(null)}
                                disabled={uploadingRestoreFile}
                                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                              >
                                Batal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleUploadAndRestore}
                              disabled={!pendingRestoreFile || uploadingRestoreFile}
                              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
                            >
                              {uploadingRestoreFile ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Me-restore Database...</span>
                                </>
                              ) : (
                                <span>Simpan &amp; Restore Sekarang</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Card 2: Pengaturan Jadwal Auto-Backup (Dinamis) ── */}
                  <SettingsCard
                    title="Jadwal Auto-Backup Database"
                    description="Atur waktu otomatis pembuatan snapshot database setiap hari dan batas rotasi retensi file."
                    isEditing={Boolean(editSection["backup"])}
                    onEdit={() => toggleEditSection("backup")}
                    onCancel={() => cancelEdit("backup", ["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"])}
                    onSave={() => saveSettings(["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"], setSavingBackupSettings, "backup")}
                    saving={savingBackupSettings}
                    isDirty={isSectionDirty(["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"])}
                    saveSuccess={settingsSaved["backup"]}
                    saveSuccessMessage="Pengaturan auto-backup berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Status Auto-Backup</span>
                          <span className={`text-sm font-bold mt-0.5 inline-block ${
                            settingsMap["backup_auto_enabled"] === "false" ? "text-rose-600" : "text-emerald-700"
                          }`}>
                            {settingsMap["backup_auto_enabled"] === "false" ? "Nonaktif" : "Aktif Harian"}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Jam Eksekusi</span>
                          <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">
                            Pukul {settingsMap["backup_auto_time"] || "02:00"} WIB
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Direktori Backup</span>
                          <span className="text-xs font-mono font-bold text-amber-900 mt-0.5 inline-block truncate max-w-full">
                            {settingsMap["backup_path"] || "/data/backups"}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs text-gray-500 block font-medium">Batas Retensi File</span>
                          <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">
                            {settingsMap["backup_retention_count"] || "10"} Snapshot Terbaru
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow label="Status Auto-Backup">
                        <select
                          value={settingsMap["backup_auto_enabled"] ?? "true"}
                          onChange={(e) => setSetting("backup_auto_enabled", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        >
                          <option value="true">Aktif (Jalankan Backup Otomatis)</option>
                          <option value="false">Nonaktif</option>
                        </select>
                      </FieldRow>

                      <FieldRow label="Waktu Eksekusi Harian" description="Format 24 jam (HH:mm), contoh: 02:00">
                        <input
                          type="time"
                          value={settingsMap["backup_auto_time"] || "02:00"}
                          onChange={(e) => setSetting("backup_auto_time", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Path Direktori Penyimpanan" description="Default /data/backups (otomatis fallback ke ./data/backups jika lokal)">
                        <input
                          type="text"
                          value={settingsMap["backup_path"] || "/data/backups"}
                          onChange={(e) => setSetting("backup_path", e.target.value)}
                          placeholder="/data/backups"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Jumlah Retensi Snapshot Tersimpan" description="Snapshot tertua otomatis dibersihkan jika melebihi batas">
                        <input
                          type="number"
                          min="3"
                          max="100"
                          value={settingsMap["backup_retention_count"] || "10"}
                          onChange={(e) => setSetting("backup_retention_count", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>
                    </div>
                  </SettingsCard>

                  {/* ── Card 3: Daftar Riwayat Snapshot Server ── */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Daftar Snapshot Tersimpan</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{snapshots.length} file snapshot tersimpan di server</p>
                      </div>
                      <button
                        type="button"
                        onClick={loadSnapshots}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
                      >
                        ↻ Refresh
                      </button>
                    </div>

                    {loadingSnapshots ? (
                      <div className="p-12 text-center text-gray-400">
                        <span className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-xs">Memuat daftar snapshot...</p>
                      </div>
                    ) : snapshots.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 italic">
                        Belum ada file snapshot tersimpan. Klik &quot;Buat Snapshot Sekarang&quot; untuk membuat backup pertama.
                      </div>
                    ) : (
                      <>
                        {/* ── Desktop Table ── */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold border-b border-gray-100">
                              <tr>
                                <th className="px-5 py-3.5">Nama File Snapshot</th>
                                <th className="px-5 py-3.5">Tipe</th>
                                <th className="px-5 py-3.5">Ukuran</th>
                                <th className="px-5 py-3.5">Waktu Pembuatan</th>
                                <th className="px-5 py-3.5 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                              {snapshots.map((snap) => (
                                <tr key={snap.filename} className="hover:bg-gray-50/60 transition">
                                  <td className="px-5 py-3.5 font-mono font-medium text-gray-900">
                                    {snap.filename}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {snap.isSafetyBackup ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        Safety Backup
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Snapshot
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 font-semibold text-gray-800">
                                    {snap.sizeFormatted}
                                  </td>
                                  <td className="px-5 py-3.5 text-gray-500">
                                    {new Date(snap.createdAt).toLocaleString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Download */}
                                      <a
                                        href={`/api/admin/database/download?filename=${encodeURIComponent(snap.filename)}`}
                                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                                        title="Download file .db"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Download</span>
                                      </a>

                                      {/* Restore */}
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreSnapshot(snap.filename)}
                                        disabled={restoringSnapshot === snap.filename}
                                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        title="Restore database ke snapshot ini"
                                      >
                                        {restoringSnapshot === snap.filename ? (
                                          <span className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                        )}
                                        <span>Restore</span>
                                      </button>

                                      {/* Delete */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSnapshot(snap.filename)}
                                        disabled={deletingSnapshot === snap.filename}
                                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        title="Hapus snapshot ini"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* ── Mobile-Native Snapshot Cards ── */}
                        <div className="block md:hidden divide-y divide-gray-100">
                          {snapshots.map((snap) => (
                            <div key={snap.filename} className="p-4 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono font-medium text-xs text-gray-900 break-all">{snap.filename}</span>
                                {snap.isSafetyBackup ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                    Safety
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                    Snapshot
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="font-semibold text-gray-800">{snap.sizeFormatted}</span>
                                <span className="text-[11px] text-gray-400">
                                  {new Date(snap.createdAt).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <a
                                  href={`/api/admin/database/download?filename=${encodeURIComponent(snap.filename)}`}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1"
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSnapshot(snap.filename)}
                                  disabled={restoringSnapshot === snap.filename}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {restoringSnapshot === snap.filename ? "Restoring..." : "Restore"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSnapshot(snap.filename)}
                                  disabled={deletingSnapshot === snap.filename}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Logs ── */}
              {activeTab === "logs" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Monitoring Webhook &amp; Log</h2>
                      <p className="text-sm text-gray-500">{logs.length} log terekam</p>
                    </div>
                    <button onClick={() => loadOverviewData()} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer">↻ Refresh</button>
                  </div>

                  {logs.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 italic">Belum ada webhook log yang terekam</div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                      {logs.map((log) => (
                        <div key={log.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                log.status === "processed" ? "bg-green-100 text-green-700" : log.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                              }`}>{log.status}</span>
                              <span className="font-semibold text-gray-800 text-sm uppercase">{log.source} — {log.event}</span>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                          </div>
                          <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-x-auto text-gray-600 max-h-40">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {themeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                ⚠ {themeError}
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
                  File HTML disimpan di <code className="font-mono text-gray-700 font-semibold">themes/premium/{themeForm.id || "id"}.html</code> atau <code className="font-mono text-gray-700 font-semibold">themes/traditional/{themeForm.id || "id"}.html</code>.{" "}
                  <a href="/downloads/starter-blueprint.html" download="starter-blueprint.html" className="text-amber-700 font-bold hover:underline">
                    Unduh Starter Blueprint HTML
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">Kategori</label>
                  <select
                    value={themeForm.category}
                    onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value, series: e.target.value === "traditional" ? "Traditional" : e.target.value === "modern" ? "Modern" : "Premium" })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="premium">Premium</option>
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

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={themeForm.isActive}
                    onChange={(e) => setThemeForm({ ...themeForm, isActive: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  Status Aktif (Tampil di Katalog)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
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
                  href={`/demo/${demoStudioTheme.id}`}
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
            <div className="px-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setDemoStudioTab("visual")}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
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
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
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
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
                  demoStudioTab === "stories"
                    ? "bg-white text-stone-900 border-amber-600 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 border-transparent"
                }`}
              >
                Kisah Cinta &amp; Rekening
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

                      {/* Showroom Color Palette Selector */}
                      <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                              Palet Warna Showroom Demo
                            </h4>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              Pilih nuansa warna resmi yang dikompilasi ke halaman pratinjau showroom publik (/demo/{demoStudioTheme.id}).
                            </p>
                          </div>
                          {(demoStudioData.defaultPalette || demoStudioData.colorPalette) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 capitalize">
                              {demoStudioData.defaultPalette || demoStudioData.colorPalette}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
                          {[
                            { id: "champagne", name: "Champagne Gold", hex: "#a67c52" },
                            { id: "emerald", name: "Royal Emerald", hex: "#1b4332" },
                            { id: "burgundy", name: "Burgundy Wine", hex: "#54192b" },
                            { id: "sage", name: "Botanical Sage", hex: "#4a5d4e" },
                            { id: "terracotta", name: "Warm Terracotta", hex: "#8c583a" },
                            { id: "monochrome", name: "Monochrome Dark", hex: "#262626" },
                          ].map((pal) => {
                            const currentPal = demoStudioData.defaultPalette || demoStudioData.colorPalette || (demoStudioTheme.id === "badrika" ? "emerald" : demoStudioTheme.id === "candani" ? "terracotta" : demoStudioTheme.id === "ameera" ? "burgundy" : demoStudioTheme.id === "chronicle" ? "monochrome" : "champagne");
                            const isSelected = currentPal === pal.id;
                            return (
                              <button
                                key={pal.id}
                                type="button"
                                onClick={() => {
                                  setDemoStudioData((prev: any) => ({
                                    ...prev,
                                    defaultPalette: pal.id,
                                    colorPalette: pal.id,
                                  }));
                                }}
                                className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                                  isSelected
                                    ? "border-amber-800 bg-amber-50/70 ring-2 ring-amber-800/30 shadow-xs"
                                    : "border-stone-200 hover:border-stone-300 bg-white"
                                }`}
                              >
                                <span
                                  className="w-5 h-5 rounded-full shadow-inner border border-black/10 shrink-0"
                                  style={{ backgroundColor: pal.hex }}
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-stone-900 truncate">{pal.name}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Main Cover & Hero Slots Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          1. Foto Utama &amp; Banner Hero (Mendukung Video MP4 Loop)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { slot: "cover", label: "Landing Cover", file: "cover.webp", allowVideo: true, desc: "Tampilan layar pembuka & sampul awal (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "hero", label: "Hero / Sidebar", file: "hero.webp", allowVideo: true, desc: "Foto portrait sidebar desktop & hero (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "background", label: "Background Global", file: "background.webp", allowVideo: true, desc: "Latar belakang fixed tema (Foto WebP/JPG atau Video Loop MP4)" },
                            { slot: "home", label: "Latar Home", file: "home.webp", allowVideo: false, desc: "Background khusus seksi Home (Opsional)" },
                            { slot: "footer", label: "Foto Footer", file: "footer.webp", allowVideo: false, desc: "Foto penutup di bagian akhir undangan (Opsional)" },
                            { slot: "groom", label: "Mempelai Pria", file: "groom.webp", allowVideo: false, desc: "Foto profil pria" },
                            { slot: "bride", label: "Mempelai Wanita", file: "bride.webp", allowVideo: false, desc: "Foto profil wanita" },
                          ].map((item) => {
                            const isStaged = Boolean(stagedDemoFiles[item.slot]);
                            const isSaved = Boolean(updatedDemoSlots[item.slot]) && !isStaged;
                            const isCurrentUploading = uploadingSlot === item.slot;
                            const stagedFile = stagedDemoFiles[item.slot];
                            const localPreview = localPreviews[item.slot];
                            const savedUrl = (
                              item.slot === "cover" ? demoStudioData.landingCoverUrl :
                              item.slot === "hero" ? demoStudioData.sidebarPhotoUrl :
                              item.slot === "background" ? demoStudioData.globalBgUrl :
                              item.slot === "home" ? demoStudioData.homePhotoUrl :
                              item.slot === "footer" ? demoStudioData.footerPhotoUrl :
                              item.slot === "groom" ? demoStudioData.groomPhotoUrl :
                              item.slot === "bride" ? demoStudioData.bridePhotoUrl : null
                            ) || `/demo/${demoStudioTheme.id}/${item.file}?v=${updatedDemoSlots[item.slot] || 1}`;

                            const effectiveSrc = localPreview || savedUrl;
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
                                  isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-xs text-gray-900">{item.label}</span>
                                    {isStaged ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>●</span> Draft Baru
                                      </span>
                                    ) : isSaved ? (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span>✓</span> Tersimpan
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-gray-400">{item.file}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                                </div>

                                <div className="relative aspect-video rounded-xl bg-stone-900 overflow-hidden border border-gray-300">
                                  {isVideoSlot ? (
                                    <video
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <img
                                      key={isStaged ? localPreview : updatedDemoSlots[item.slot] || effectiveSrc}
                                      src={effectiveSrc}
                                      alt={item.label}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  )}
                                  {isVideoSlot && (
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
                                    <span>{isStaged ? "Ganti Lagi" : item.allowVideo ? "Pilih Foto / Video" : "Ganti Foto"}</span>
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
                                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                      Batal
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
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged;
                            const isCurrentUploading = uploadingSlot === slotName;
                            const imgSrc = localPreviews[slotName] || `/demo/${demoStudioTheme.id}/${fileName}?v=${updatedDemoSlots[slotName] || 1}`;
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Galeri #{idx + 1}</span>
                                  {isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  <img
                                    key={isStaged ? localPreviews[slotName] : updatedDemoSlots[slotName] || imgSrc}
                                    src={imgSrc}
                                    alt={`Gallery ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
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
                                    <span>{isStaged ? "Ganti" : "Pilih"}</span>
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
                                      className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
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
                            const isStaged = Boolean(stagedDemoFiles[slotName]);
                            const isSaved = Boolean(updatedDemoSlots[slotName]) && !isStaged;
                            const isCurrentUploading = uploadingSlot === slotName;
                            const imgSrc = localPreviews[slotName] || `/demo/${demoStudioTheme.id}/${fileName}?v=${updatedDemoSlots[slotName] || 1}`;
                            return (
                              <div
                                key={slotName}
                                className={`border rounded-2xl p-3 space-y-2 transition-all ${
                                  isStaged
                                    ? "bg-amber-50/60 border-amber-400 ring-2 ring-amber-500/25 shadow-sm"
                                    : isSaved
                                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/15"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Momen #{idx + 1}</span>
                                  {isStaged ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>●</span> Draft
                                    </span>
                                  ) : isSaved ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>✓</span> Tersimpan
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                  )}
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
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
                                    <span>{isStaged ? "Ganti" : "Pilih"}</span>
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
                                      className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
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
                            placeholder="THE WEDDING OF"
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

                      {/* Groom & Bride Info */}
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
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Keterangan Orang Tua</label>
                            <input
                              type="text"
                              value={demoStudioData.groomParents || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, groomParents: e.target.value })}
                              placeholder="Putra Kedua dari Bpk. Ir. Hendra..."
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                            />
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
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">Keterangan Orang Tua</label>
                            <input
                              type="text"
                              value={demoStudioData.brideParents || ""}
                              onChange={(e) => setDemoStudioData({ ...demoStudioData, brideParents: e.target.value })}
                              placeholder="Putri Pertama dari Bpk. Dr. Faisal..."
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                            />
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
                    </div>
                  )}

                  {/* TAB 3: LOVE STORIES & BANK ACCOUNTS */}
                  {demoStudioTab === "stories" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          Kisah Cinta Demo (Love Story Chapters)
                        </h4>
                        <div className="space-y-3">
                          {(demoStudioData.stories || []).map((story: any, sIdx: number) => (
                            <div key={sIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Bab / Chapter</label>
                                  <input
                                    type="text"
                                    value={story.chapter || ""}
                                    onChange={(e) => {
                                      const stories = [...(demoStudioData.stories || [])];
                                      stories[sIdx].chapter = e.target.value;
                                      setDemoStudioData({ ...demoStudioData, stories });
                                    }}
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
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white resize-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bank Accounts */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          Rekening Hadiah Digital Demo
                        </h4>
                        <div className="space-y-3">
                          {(demoStudioData.banks || []).map((bank: any, bIdx: number) => (
                            <div key={bIdx} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Nama Bank</label>
                                <input
                                  type="text"
                                  value={bank.bank || ""}
                                  onChange={(e) => {
                                    const banks = [...(demoStudioData.banks || [])];
                                    banks[bIdx].bank = e.target.value;
                                    setDemoStudioData({ ...demoStudioData, banks });
                                  }}
                                  placeholder="Bank BCA"
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
                                <label className="block text-[10px] font-bold text-gray-600 mb-1">Atas Nama</label>
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
                          ))}
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
                  const retentionDays = parseInt(settingsMap["retention_invitation_days"] || "30", 10);
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

    </div>
  );
}
