"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getApexRootDomain, getInvitationPublicUrl } from "@/lib/domainUtils";
import { BrandLogo } from "@/components/BrandLogo";
import { GOOGLE_APPS_SCRIPT_MASTER_CODE } from "@/lib/driveHelper";

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
    label: "Undangan",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "themes",
    label: "Tema",
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
];

const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    FAILED: "bg-rose-50 text-rose-700 border border-rose-200",
    EXPIRED: "bg-gray-100 text-gray-600 border border-gray-200",
    PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
    TAKEN_DOWN: "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
};

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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

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
  const [themes, setThemes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Settings state
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [initialSettingsMap, setInitialSettingsMap] = useState<Record<string, string>>({});
  const [editSection, setEditSection] = useState<Record<string, boolean>>({});
  const [savingIpaymu, setSavingIpaymu] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingSubdomainSettings, setSavingSubdomainSettings] = useState(false);
  const [savingGdriveSettings, setSavingGdriveSettings] = useState(false);
  const [savingActiveGateway, setSavingActiveGateway] = useState(false);
  const [savingMidtrans, setSavingMidtrans] = useState(false);
  const [savingXendit, setSavingXendit] = useState(false);
  const [savingDuitku, setSavingDuitku] = useState(false);
  const [savingTripay, setSavingTripay] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"pembayaran" | "gateway" | "paket" | "platform" | "autentikasi">("pembayaran");
  const [copiedGdriveScript, setCopiedGdriveScript] = useState(false);
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

  // Theme Demo Studio State
  const [showDemoStudioModal, setShowDemoStudioModal] = useState(false);
  const [demoStudioTheme, setDemoStudioTheme] = useState<any | null>(null);
  const [demoStudioTab, setDemoStudioTab] = useState<"visual" | "profile" | "stories">("visual");
  const [demoStudioData, setDemoStudioData] = useState<any>({});
  const [demoStudioLoading, setDemoStudioLoading] = useState(false);
  const [demoStudioSaving, setDemoStudioSaving] = useState(false);
  const [demoStudioUploadSuccess, setDemoStudioUploadSuccess] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const loadOverviewData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/overview")
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
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  useEffect(() => {
    loadOverviewData();
    loadSettings();
    loadBrandAssets();
    loadSnapshots();
  }, [loadOverviewData, loadSettings, loadBrandAssets, loadSnapshots]);

  const setSetting = (key: string, value: string) => {
    setSettingsMap((prev) => ({ ...prev, [key]: value }));
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
    if (section === "google") {
      setGoogleTestResult(null);
    }
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
    setThemeSaving(true);
    setThemeError(null);
    try {
      const url = "/api/admin/themes";
      const method = editingTheme ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(themeForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan tema");
      }
      setShowThemeModal(false);
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
    setShowDemoStudioModal(true);

    try {
      const res = await fetch(`/api/admin/themes/${theme.id}/demo-data`);
      const json = await res.json();
      if (json.success && json.data) {
        setDemoStudioData(json.data);
      } else {
        setDemoStudioData({});
      }
    } catch {
      setDemoStudioData({});
    } finally {
      setDemoStudioLoading(false);
    }
  };

  const handleUploadDemoAsset = async (slot: string, file: File) => {
    if (!demoStudioTheme) return;
    setUploadingSlot(slot);
    setDemoStudioUploadSuccess(null);

    const fd = new FormData();
    fd.append("slot", slot);
    fd.append("file", file);

    try {
      const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-asset`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setDemoStudioUploadSuccess(`✓ Aset ${slot} berhasil diperbarui!`);
        if (slot.startsWith("gallery_")) {
          const galleryPhotos = [...(demoStudioData.galleryPhotos || [])];
          const idx = parseInt(slot.replace("gallery_", ""), 10) - 1;
          if (idx >= 0 && idx < 8) {
            galleryPhotos[idx] = data.url;
            setDemoStudioData({ ...demoStudioData, galleryPhotos });
          }
        } else if (slot === "cover") {
          setDemoStudioData({ ...demoStudioData, landingCoverUrl: data.url });
        } else if (slot === "hero") {
          setDemoStudioData({ ...demoStudioData, sidebarPhotoUrl: data.url });
        } else if (slot === "groom") {
          setDemoStudioData({ ...demoStudioData, groomPhotoUrl: data.url });
        } else if (slot === "bride") {
          setDemoStudioData({ ...demoStudioData, bridePhotoUrl: data.url });
        } else if (slot === "background") {
          setDemoStudioData({ ...demoStudioData, globalBgUrl: data.url });
        }
      } else {
        alert(data.error || "Gagal mengunggah aset");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSaveDemoData = async () => {
    if (!demoStudioTheme) return;
    setDemoStudioSaving(true);
    try {
      const res = await fetch(`/api/admin/themes/${demoStudioTheme.id}/demo-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoStudioData),
      });
      const data = await res.json();
      if (data.success) {
        setDemoStudioUploadSuccess(`✓ Data & cerita demo tema ${demoStudioTheme.name} berhasil disimpan!`);
        setTimeout(() => setDemoStudioUploadSuccess(null), 3000);
      } else {
        alert(data.error || "Gagal menyimpan data demo");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDemoStudioSaving(false);
    }
  };

  // Invitation theme actions
  const handleUnlockTheme = async (invId: string) => {
    if (!confirm("Buka kunci tema untuk klien ini?")) return;
    try {
      const res = await fetch(`/api/client/invitations/${invId}`);
      const invData = await res.json();
      let feat: any = {};
      try { feat = typeof invData.featureSettings === "object" ? invData.featureSettings : JSON.parse(invData.featureSettings || "{}"); } catch { feat = {}; }
      feat = { ...feat, themeLocked: false };
      await fetch(`/api/client/invitations/${invId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invData, featureSettings: feat }),
      });
      alert("✓ Tema berhasil dibuka kembali!");
      loadOverviewData();
    } catch (err: any) { alert("Gagal: " + err.message); }
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
    if (!confirm("Konfirmasi pembayaran ini? Akses studio undangan klien akan segera diaktifkan.")) return;
    setProcessingOrderAction(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
      if (res.ok) {
        alert("Order berhasil dikonfirmasi! Akun klien telah aktif.");
        setPreviewProofOrder(null);
        loadOverviewData();
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
        alert("Order telah ditolak.");
        setRejectModalOrder(null);
        setPreviewProofOrder(null);
        setRejectReasonInput("");
        loadOverviewData();
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

  const handleTestGoogle = async () => {
    setTestingGoogle(true);
    setGoogleTestResult(null);
    try {
      const res = await fetch("/api/admin/test-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: settingsMap["google_client_id"] || "",
          clientSecret: settingsMap["google_client_secret"] || "",
        }),
      });
      const data = await res.json();
      setGoogleTestResult(data);
    } catch (err: any) {
      setGoogleTestResult({
        success: false,
        message: "Gagal menguji koneksi: " + err.message,
      });
    } finally {
      setTestingGoogle(false);
    }
  };

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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-amber-400 font-mono text-xs gap-3">
        <span className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span>MEMVERIFIKASI OTORISASI ADMINISTRATOR...</span>
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    !(
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "ADMIN" ||
      (session?.user as any)?.role === "SUPER_ADMIN"
    )
  ) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-rose-400 font-mono text-xs gap-3">
        <span>AKSES DITOLAK. MENGALIHKAN KE PORTAL LOGIN...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  {settingsMap["platform_name"] || "Luxenary"} Admin
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
                {tabs.map((tab) => (
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
                <a href="/demo" target="_blank" className="hover:text-amber-700">Lihat Demo ↗</a>
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

      <div className="flex flex-1">
        {/* Desktop Sidebar — Hidden di Mobile, Sticky & Fixed di Layar Besar */}
        <aside className="hidden md:flex w-60 bg-white border-r border-gray-200 shadow-2xs shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto">
          <nav className="py-4 space-y-1 px-3">
            {tabs.map((tab) => (
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
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-6xl w-full">
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
                        {settingsMap["platform_name"] || "Luxenary"} Executive Dashboard
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
                          Lihat Detail &rarr;
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
                          Katalog Tema &rarr;
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
                          Lihat Semua ({invitations.length}) &rarr;
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
                          Lihat Semua ({orderList.length}) &rarr;
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
                        <span>&rarr;</span>
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
                        <span>&rarr;</span>
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
                        <span>&rarr;</span>
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
                    <button onClick={loadOverviewData} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer">↻ Refresh</button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Invoice", "Klien", "Paket", "Metode", "Jumlah", "Bukti Transfer", "Status", "Tanggal", "Aksi"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {orders.length === 0 ? (
                          <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400 italic">Belum ada transaksi</td></tr>
                        ) : orders.map((ord) => (
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
                                  <button
                                    onClick={() => handleApproveOrder(ord.id)}
                                    disabled={processingOrderAction}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                  >
                                    Konfirmasi
                                  </button>
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
              )}

              {/* ── Users ── */}
              {activeTab === "users" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Daftar Klien</h2>
                    <p className="text-sm text-gray-500">{users.filter((u) => u.role !== "ADMIN").length} klien terdaftar</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Nama", "Email", "Role", "Terdaftar"].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {users
                          .filter((usr) => usr.role !== "ADMIN")
                          .map((usr) => (
                            <tr key={usr.id} className="hover:bg-gray-50 transition">
                              <td className="px-5 py-3 text-sm font-semibold text-gray-900">{usr.name}</td>
                              <td className="px-5 py-3 text-sm text-gray-600 font-mono text-xs">{usr.email}</td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  Klien
                                </span>
                              </td>
                              <td className="px-5 py-3 text-xs text-gray-500">{new Date(usr.createdAt).toLocaleDateString("id-ID")}</td>
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
              )}

              {/* ── Invitations ── */}
              {activeTab === "invitations" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Katalog Undangan Klien</h2>
                    <p className="text-sm text-gray-500">{invitations.length} undangan terdaftar</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Pasangan", "Subdomain / URL", "Tema", "Status", "Proteksi Editor", "Aksi"].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invitations.map((inv) => {
                          const coupleName = `${inv.groomNickname || inv.groomName || "Mempelai Pria"} & ${inv.brideNickname || inv.brideName || "Mempelai Wanita"}`;
                          const activeSub = inv.subdomain || `${inv.groomSlug || "didan"}-${inv.brideSlug || "nasha"}`;
                          const publicUrl = getInvitationPublicUrl(activeSub);
                          const isEmergencyUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();

                          return (
                            <tr key={inv.id} className="hover:bg-gray-50 transition">
                              <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                                {coupleName}
                              </td>
                              <td className="px-5 py-3 text-xs font-mono text-amber-700">
                                <a
                                  href={publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <span>{activeSub}.{getApexRootDomain()}</span>
                                  <span className="text-[10px] text-stone-400">↗</span>
                                </a>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm capitalize">{inv.themeId}</span>
                                  <select
                                    value={inv.themeId}
                                    onChange={(e) => handleSwitchTheme(inv.id, e.target.value)}
                                    className="text-xs bg-gray-50 border border-gray-200 rounded p-1 text-gray-700 font-medium capitalize cursor-pointer"
                                  >
                                    {themes.map((t) => (
                                      <option key={t.id} value={t.id} className="capitalize">{t.name || t.id}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="px-5 py-3"><Badge status={inv.status} /></td>
                              <td className="px-5 py-3">
                                {isEmergencyUnlocked ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-block">
                                    Kunci Darurat Aktif
                                  </span>
                                ) : inv.isLockedPermanently ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200 inline-block">
                                    Terkunci Permanen
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                                    Bisa Diedit
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-700 hover:text-amber-900 font-semibold text-xs underline"
                                  >
                                    Preview
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEmergencyUnlock(inv)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                                      isEmergencyUnlocked
                                        ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                        : "bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300"
                                    }`}
                                    title={isEmergencyUnlocked ? "Kunci kembali sekarang" : "Buka kunci darurat edit untuk klien selama 24 jam"}
                                  >
                                    {isEmergencyUnlocked ? "Kunci Kembali" : "Buka Kunci Darurat"}
                                  </button>
                                  <button
                                    onClick={() => handleUnlockTheme(inv.id)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    title="Buka akses semua tema untuk undangan ini"
                                  >
                                    Akses Tema
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Themes Management ── */}
              {activeTab === "themes" && (
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
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                    {[
                      { id: "all", label: `Semua Tema (${themes.length})` },
                      { id: "premium", label: `Premium (${themes.filter((t) => (t.category || "premium") === "premium").length})` },
                      { id: "modern", label: `Modern (${themes.filter((t) => t.category === "modern").length})` },
                      { id: "traditional", label: `Traditional (${themes.filter((t) => t.category === "traditional").length})` },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setThemeCategoryFilter(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          themeCategoryFilter === cat.id
                            ? "bg-amber-800 text-white shadow-xs"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(themeCategoryFilter === "all" ? themes : themes.filter((t) => (t.category || "premium") === themeCategoryFilter)).map((theme) => (
                      <div key={theme.id} className={`bg-white rounded-2xl shadow-sm border p-5 space-y-3 transition ${theme.isActive === false ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base">{theme.name}</h3>
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              #{theme.id}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            theme.category === "traditional" ? "bg-amber-100 text-amber-800" :
                            theme.category === "modern" ? "bg-slate-100 text-slate-700" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {theme.category === "traditional" ? "Traditional" : theme.category === "modern" ? "Modern" : "Premium"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed font-medium">{theme.description || "Tanpa deskripsi"}</p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleThemeStatus(theme)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition ${
                                theme.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.isActive !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                              <span>{theme.isActive !== false ? "Aktif" : "Non-aktif"}</span>
                            </button>
                            <span className="text-gray-400 text-[10px]">Urutan: #{theme.sortOrder || 1}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenDemoStudio(theme)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Kelola foto, musik & data cerita demo tema ini"
                            >
                              <span>Demo Studio</span>
                            </button>
                            <a href={`/demo/${theme.id}`} target="_blank" className="text-gray-600 hover:text-gray-900 font-semibold text-xs">Preview</a>
                            <button
                              onClick={() => handleOpenEditTheme(theme)}
                              className="text-gray-600 hover:text-gray-900 font-semibold text-xs cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTheme(theme.id, theme.name)}
                              className="text-rose-600 hover:text-rose-800 font-semibold text-xs cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Settings ── */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Konfigurasi payment gateway, Google OAuth API, harga paket, dan platform</p>
                  </div>

                  {/* ── Sub-Tab Navigation ── */}
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
                    {([
                      { id: "pembayaran", label: "Pembayaran" },
                      { id: "gateway",    label: "Gateway QRIS" },
                      { id: "paket",      label: "Paket & Harga" },
                      { id: "platform",   label: "Platform" },
                      { id: "autentikasi",label: "Autentikasi" },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveSettingsTab(t.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          activeSettingsTab === t.id
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

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
                              {(settingsMap["payment_mode"] || "BOTH") === "BOTH" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  QRIS + Transfer Manual
                                </span>
                              ) : settingsMap["payment_mode"] === "GATEWAY" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                  Hanya QRIS / Otomatis
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Hanya Transfer Bank
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Rekening Tujuan</span>
                            <span className="text-xs font-bold text-gray-800 mt-1 inline-block">
                              {settingsMap["bank_name"] || "BCA"} - {settingsMap["bank_account_number"] || "8735098123"}
                            </span>
                            <span className="text-[11px] text-gray-500 block font-medium">
                              a.n {settingsMap["bank_account_holder"] || "PT Luxenary Karya Digital"}
                            </span>
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: "BOTH", label: "QRIS + Transfer Manual", desc: "Klien bebas memilih metode" },
                            { id: "GATEWAY", label: "Hanya QRIS / Otomatis", desc: "Auto verifikasi via iPaymu" },
                            { id: "MANUAL", label: "Hanya Transfer Manual", desc: "Verifikasi via upload struk" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSetting("payment_mode", opt.id)}
                              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                (settingsMap["payment_mode"] || "BOTH") === opt.id
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
                            value={settingsMap["bank_name"] || "BCA (Bank Central Asia)"}
                            onChange={(e) => setSetting("bank_name", e.target.value)}
                            placeholder="Contoh: BCA / Mandiri / BRI"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>

                        <FieldRow label="Nomor Rekening">
                          <input
                            type="text"
                            value={settingsMap["bank_account_number"] || "8735098123"}
                            onChange={(e) => setSetting("bank_account_number", e.target.value)}
                            placeholder="Contoh: 8735098123"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                          />
                        </FieldRow>

                        <FieldRow label="Atas Nama (Pemilik)">
                          <input
                            type="text"
                            value={settingsMap["bank_account_holder"] || "PT Luxenary Karya Digital"}
                            onChange={(e) => setSetting("bank_account_holder", e.target.value)}
                            placeholder="Contoh: PT Luxenary Karya Digital"
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
                    onCancel={() => cancelEdit("active_gateway", ["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_invoice_prefix"])}
                    onSave={() => saveSettings(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_invoice_prefix"], setSavingActiveGateway, "active_gateway")}
                    saving={savingActiveGateway}
                    isDirty={isSectionDirty(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_invoice_prefix"])}
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
                            <span className="text-xs text-purple-900 block font-bold">Biaya Admin Gateway</span>
                            <div className="mt-1 text-xs font-semibold text-purple-950">
                              {(settingsMap["payment_fee_payer"] || "MERCHANT") === "BUYER" ? (
                                <span className="text-amber-800 font-bold">Dibebankan ke Klien (+0.7%)</span>
                              ) : (
                                <span className="text-emerald-700 font-bold">Ditanggung Platform (Gratis Klien)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-gray-600 font-medium">
                            Format Judul Invoice: <code className="font-mono text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">{settingsMap["payment_invoice_prefix"] || "Luxenary Invite"} — Order #XXXXXX</code>
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

                        <FieldRow label="Prefix Judul Tagihan / Invoice" description="Teks identitas yang muncul di aplikasi e-Wallet pembeli saat scan QRIS.">
                          <input
                            type="text"
                            value={settingsMap["payment_invoice_prefix"] || "Luxenary Invite"}
                            onChange={(e) => setSetting("payment_invoice_prefix", e.target.value)}
                            placeholder="Contoh: Luxenary Invite"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-medium"
                          />
                        </FieldRow>
                      </div>

                      <FieldRow label="Skema Biaya Admin Gateway" description="Tentukan apakah potongan fee gateway (misal QRIS 0.7%) ditanggung oleh platform atau dibebankan ke pembeli">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: "MERCHANT", label: "Ditanggung Platform (Gratis Klien)", desc: "Klien bayar pas harga paket (contoh: Rp 299.000), fee dipotong dari saldo Anda." },
                            { id: "BUYER", label: "Dibebankan ke Klien (+0.7% QRIS)", desc: "Total bayar di checkout otomatis ditambah biaya admin gateway." },
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
                            URL Webhook: <code className="font-mono text-gray-900 font-semibold">{`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/api/webhook/ipaymu`}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/api/webhook/ipaymu`)}
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

                    <FieldRow label="API Key" description="API Key dari Dashboard iPaymu → Pengaturan → API Key">
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
                          value={`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/api/webhook/ipaymu`}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}/api/webhook/ipaymu`)}
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
                            Redirect Callback: <code className="font-mono text-gray-900 font-semibold">{`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/callback/google`}</code>
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/callback/google`)}
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
                          value={typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")}
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
                          value={`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/callback/google`}
                          readOnly
                          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold select-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/callback/google`)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Salin
                        </button>
                      </div>
                    </FieldRow>

                    {/* Test Google Credentials Probe */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleTestGoogle}
                        disabled={testingGoogle || !settingsMap["google_client_id"]}
                        className="px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        {testingGoogle ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Memverifikasi ke Server Google...</span>
                          </>
                        ) : (
                          <span>Uji Kredensial Google</span>
                        )}
                      </button>
                      {!settingsMap["google_client_id"] && (
                        <span className="text-xs text-gray-500">Masukkan Client ID terlebih dahulu untuk menguji.</span>
                      )}
                    </div>

                    {googleTestResult && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                          googleTestResult.success
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : "bg-rose-50 border-rose-300 text-rose-900"
                        }`}
                      >
                        {googleTestResult.success ? (
                          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div className="flex-1 leading-relaxed">
                          <strong className="block font-bold text-sm mb-0.5">
                            {googleTestResult.success ? "Kredensial Valid & Terhubung" : "Kredensial Ditolak Google"}
                          </strong>
                          <span>{googleTestResult.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 space-y-1.5 mt-2">
                      <span className="font-bold block text-gray-900">Panduan Konfigurasi Google Cloud Console:</span>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600">
                        <li>Buka <strong className="text-gray-800">console.cloud.google.com</strong> &rarr; Buat Project &rarr; Buka <strong className="text-gray-800">APIs &amp; Services &rarr; Credentials</strong>.</li>
                        <li>Klik <strong className="text-gray-800">Create Credentials &rarr; OAuth client ID</strong>, pilih tipe <strong className="text-gray-800">Web application</strong>.</li>
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
                    onCancel={() => cancelEdit("pricing", ["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"])}
                    onSave={() => saveSettings(["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"], setSavingPricing, "pricing")}
                    saving={savingPricing}
                    isDirty={isSectionDirty(["name_traditional", "name_modern", "name_premium", "price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"])}
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
                      </div>
                    </div>
                  </SettingsCard>
                  </>
                  )}

                  {/* ══ TAB: PLATFORM ══ */}
                  {activeSettingsTab === "platform" && (
                  <>
                  {/* Subdomain Lifecycle & Archiving Settings */}
                  <SettingsCard
                    title="Siklus Hidup & Daur Ulang Subdomain"
                    description="Atur masa tenggang (grace period) keaktifan subdomain setelah acara selesai, dan otomatisasi pelepasan subdomain ke pool agar dapat digunakan kembali oleh pasangan baru."
                    isEditing={Boolean(editSection["subdomain"])}
                    onEdit={() => toggleEditSection("subdomain")}
                    onCancel={() => cancelEdit("subdomain", ["subdomain_grace_days", "subdomain_auto_recycle"])}
                    onSave={() => saveSettings(["subdomain_grace_days", "subdomain_auto_recycle"], setSavingSubdomainSettings, "subdomain")}
                    saving={savingSubdomainSettings}
                    isDirty={isSectionDirty(["subdomain_grace_days", "subdomain_auto_recycle"])}
                    saveSuccess={settingsSaved["subdomain"]}
                    saveSuccessMessage="Pengaturan siklus hidup subdomain berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                            <span className="text-xs text-amber-950 font-bold block mb-1">Masa Tenggang (Grace Period)</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-mono font-bold text-amber-900">
                                {settingsMap["subdomain_grace_days"] || "7"}
                              </span>
                              <span className="text-xs text-amber-800 font-medium">Hari pasca acara pernikahan</span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-2">
                              Subdomain tetap aktif selama {settingsMap["subdomain_grace_days"] || "7"} hari setelah acara sebelum dilepas ke pool.
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
                              Undangan lama tetap dapat diakses seumur hidup via link path: <code>luxenary.id/[pasangan]/[bln-thn]</code>.
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
                          max="365"
                          value={settingsMap["subdomain_grace_days"] || "7"}
                          onChange={(e) => setSetting("subdomain_grace_days", e.target.value)}
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

                  {/* Google Drive Master Webhook & Cloud Storage Settings */}
                  <SettingsCard
                    title="Penyimpanan Cloud & Master Google Drive Webhook"
                    description="Kelola integrasi Zero-Disk Storage untuk dokumentasi kenangan tamu. File foto dan video tamu langsung di-stream ke folder Google Drive pengantin tanpa membebani harddisk server."
                    isEditing={Boolean(editSection["gdrive"])}
                    onEdit={() => toggleEditSection("gdrive")}
                    onCancel={() => cancelEdit("gdrive", ["gdrive_webhook_url"])}
                    onSave={() => saveSettings(["gdrive_webhook_url"], setSavingGdriveSettings, "gdrive")}
                    saving={savingGdriveSettings}
                    isDirty={isSectionDirty(["gdrive_webhook_url"])}
                    saveSuccess={settingsSaved["gdrive"]}
                    saveSuccessMessage="Master Webhook Google Drive berhasil disimpan"
                    viewContent={
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-emerald-950 block">Status Zero-Disk Storage</span>
                            <p className="text-xs text-emerald-800">
                              {settingsMap["gdrive_webhook_url"]
                                ? "● Master Webhook Google Drive Aktif & Terhubung (Harddisk Server 0 Byte)"
                                : "○ Mode Penyimpanan Lokal (Belum Ada Webhook Google Drive)"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_MASTER_CODE);
                              setCopiedGdriveScript(true);
                              setTimeout(() => setCopiedGdriveScript(false), 2500);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>{copiedGdriveScript ? "✓ Skrip Tersalin!" : "Salin Skrip Google Webhook"}</span>
                          </button>
                        </div>

                        {settingsMap["gdrive_webhook_url"] && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-[11px] font-bold text-gray-500 block mb-1">URL Webhook Aktif:</span>
                            <code className="text-xs font-mono text-gray-800 break-all select-all">
                              {settingsMap["gdrive_webhook_url"]}
                            </code>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <FieldRow
                        label="Master Google Drive Webhook URL"
                        description="URL Web App dari Google Apps Script (script.google.com). Buka script.google.com > Paste Skrip > Deploy as Web App (Execute as: Me, Access: Anyone) > Salin URL-nya ke sini."
                      >
                        <div className="space-y-2">
                          <input
                            type="url"
                            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                            value={settingsMap["gdrive_webhook_url"] || ""}
                            onChange={(e) => setSetting("gdrive_webhook_url", e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-gray-500">
                              Belum punya skrip? Salin kode skrip siap pakai di samping.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_MASTER_CODE);
                                setCopiedGdriveScript(true);
                                setTimeout(() => setCopiedGdriveScript(false), 2500);
                              }}
                              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{copiedGdriveScript ? "✓ Berhasil Disalin!" : "Salin Skrip Master (.gs)"}</span>
                            </button>
                          </div>
                        </div>
                      </FieldRow>
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
                            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["platform_name"] || "Luxenary Invite"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Domain Host</span>
                            <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 inline-block">{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">Email Support</span>
                            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["support_email"] || "support@luxenary.id"}</span>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs text-gray-500 block font-medium">WhatsApp Admin / CS</span>
                            <span className="text-sm font-bold text-emerald-700 mt-0.5 inline-block">+{settingsMap["support_whatsapp"] || "6281234567890"}</span>
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
                          value={settingsMap["platform_name"] || "Luxenary Invite"}
                          onChange={(e) => setSetting("platform_name", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Domain Host Platform" description="Domain terdeteksi otomatis dari host server aktif.">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono flex items-center justify-between">
                          <span>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</span>
                          <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-sans font-bold">● Auto</span>
                        </div>
                      </FieldRow>

                      <FieldRow label="Email Support">
                        <input
                          type="email"
                          value={settingsMap["support_email"] || "support@luxenary.id"}
                          onChange={(e) => setSetting("support_email", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                        />
                      </FieldRow>

                      <FieldRow label="Nomor WhatsApp Admin / CS" description="Gunakan kode negara tanpa +, contoh: 6281234567890">
                        <input
                          type="text"
                          value={settingsMap["support_whatsapp"] || "6281234567890"}
                          onChange={(e) => setSetting("support_whatsapp", e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="6281234567890"
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
                        value={settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan."}
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
                        Kelola backup, snapshot SQLite mandiri, jadwal auto-backup, dan pemulihan data (restore).
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
                      <span className="text-sm font-bold text-gray-900 mt-1 inline-block">SQLite (`dev.db`)</span>
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
                          <span>Format didukung: <strong>.db, .sqlite</strong>. File aktif saat ini: <strong>SQLite (`dev.db`)</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUploadSnapshot(true)}
                          className="text-amber-800 hover:underline font-semibold text-xs cursor-pointer"
                        >
                          Pilih file snapshot &rarr;
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
                                "Belum ada file dipilih (format didukung: .db, .sqlite)"
                              )}
                            </p>
                          </div>

                          <label className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl cursor-pointer transition text-center shrink-0">
                            Pilih File .db
                            <input
                              type="file"
                              accept=".db,.sqlite"
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
                      <div className="overflow-x-auto">
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
                    <button onClick={loadOverviewData} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer">↻ Refresh</button>
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
                  onClick={() => setShowDemoStudioModal(false)}
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
                          <strong>Panduan Aset:</strong> Foto yang diunggah akan otomatis dikonversi dan disimpan ke folder{" "}
                          <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">
                            public/demo/{demoStudioTheme.id}/
                          </code>{" "}
                          sebagai WebP beresolusi optimal dan langsung tampil di halaman showroom demo publik.
                        </div>
                      </div>

                      {/* Main Cover & Hero Slots Grid */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
                          1. Foto Utama &amp; Banner Hero
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { slot: "cover", label: "Landing Cover", file: "cover.webp", desc: "Tampilan layar pembuka & sampul awal" },
                            { slot: "hero", label: "Hero / Sidebar", file: "hero.webp", desc: "Foto portrait sidebar desktop & hero" },
                            { slot: "background", label: "Background Global", file: "background.webp", desc: "Latar belakang fixed blur tema" },
                            { slot: "groom", label: "Mempelai Pria", file: "groom.webp", desc: "Foto profil pria" },
                            { slot: "bride", label: "Mempelai Wanita", file: "bride.webp", desc: "Foto profil wanita" },
                          ].map((item) => (
                            <div key={item.slot} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-xs text-gray-900">{item.label}</span>
                                  <span className="font-mono text-[10px] text-gray-400">{item.file}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-tight">{item.desc}</p>
                              </div>

                              <div className="relative aspect-video rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                <img
                                  src={`/demo/${demoStudioTheme.id}/${item.file}`}
                                  alt={item.label}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                                {uploadingSlot === item.slot && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                                    Mengunggah...
                                  </div>
                                )}
                              </div>

                              <label className="w-full py-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-xl text-xs font-bold transition text-center cursor-pointer block shadow-2xs">
                                <span>Ganti Foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUploadDemoAsset(item.slot, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          ))}
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
                            return (
                              <div key={slotName} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span>Galeri #{idx + 1}</span>
                                  <span className="font-mono text-[9px] text-gray-400">{fileName}</span>
                                </div>
                                <div className="relative aspect-square rounded-xl bg-gray-200 overflow-hidden border border-gray-300">
                                  <img
                                    src={`/demo/${demoStudioTheme.id}/${fileName}`}
                                    alt={`Gallery ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  {uploadingSlot === slotName && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                                      Uploading...
                                    </div>
                                  )}
                                </div>
                                <label className="w-full py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-gray-300 hover:border-amber-300 rounded-lg text-[11px] font-bold transition text-center cursor-pointer block shadow-2xs">
                                  <span>Ganti</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUploadDemoAsset(slotName, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            );
                          })}
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
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                Perubahan pada tab profil &amp; cerita akan langsung aktif setelah disimpan.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDemoStudioModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-white transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveDemoData}
                  disabled={demoStudioSaving}
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 rounded-xl text-xs font-bold transition disabled:opacity-60 shadow-sm cursor-pointer"
                >
                  {demoStudioSaving ? "Menyimpan..." : "Simpan Perubahan Demo"}
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
                  <button
                    type="button"
                    onClick={() => handleApproveOrder(previewProofOrder.id)}
                    disabled={processingOrderAction}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processingOrderAction ? "Memproses..." : "Konfirmasi LUNAS"}
                  </button>
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
    </div>
  );
}
