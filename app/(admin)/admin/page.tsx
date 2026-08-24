"use client";

import { useState, useEffect, useCallback } from "react";
import { getApexRootDomain, getInvitationPublicUrl } from "@/lib/domainUtils";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Data state
  const [stats, setStats] = useState({ invitationCount: 0, orderCount: 0, guestCount: 0, userCount: 0 });
  const [orders, setOrders] = useState<any[]>([]);
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
  const [settingsSaved, setSettingsSaved] = useState<Record<string, boolean>>({});

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
  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<string>("all");

  const loadOverviewData = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/overview")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setOrders(data.orders || []);
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

  useEffect(() => {
    loadOverviewData();
    loadSettings();
  }, [loadOverviewData, loadSettings]);

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

  // Revenue stats
  const totalRevenue = orders.filter((o) => o.status === "PAID").reduce((s: number, o: any) => s + Number(o.amount), 0);
  const totalPending = orders.filter((o) => o.status === "PENDING").reduce((s: number, o: any) => s + Number(o.amount), 0);
  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

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
    if (!confirm("Tandai order ini sebagai LUNAS secara manual?")) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
      if (res.ok) { alert("✓ Order berhasil dikonfirmasi!"); loadOverviewData(); }
      else { const d = await res.json(); alert("Error: " + d.error); }
    } catch (err: any) { alert("Gagal: " + err.message); }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm">L</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none">Luxenary Admin</h1>
                <p className="text-xs text-gray-400">Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/demo" target="_blank" className="text-xs font-medium text-amber-700 hover:underline">Lihat Demo</a>
              <a href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-gray-800">Dashboard Klien</a>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 shadow-sm shrink-0">
          <nav className="py-4 space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-amber-50 text-amber-800 border-r-4 border-amber-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label.replace(/^[^\s]+ /, "")}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto max-w-6xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <>
              {/* ── Overview ── */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ringkasan Sistem</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Metrik dan aktivitas platform Luxenary Invite</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Total Klien",
                        value: stats.userCount,
                        color: "text-blue-600",
                        bg: "bg-blue-50 text-blue-600",
                        icon: (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        ),
                      },
                      {
                        label: "Total Undangan",
                        value: stats.invitationCount,
                        color: "text-amber-600",
                        bg: "bg-amber-50 text-amber-600",
                        icon: (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ),
                      },
                      {
                        label: "Total Transaksi",
                        value: stats.orderCount,
                        color: "text-purple-600",
                        bg: "bg-purple-50 text-purple-600",
                        icon: (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        ),
                      },
                      {
                        label: "Tamu Terdaftar",
                        value: stats.guestCount,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50 text-emerald-600",
                        icon: (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        ),
                      },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                        <p className="text-xs font-medium text-gray-500">{s.label}</p>
                        <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Revenue Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
                      <p className="text-emerald-100 text-sm font-medium">Total Pendapatan (PAID)</p>
                      <p className="text-3xl font-bold mt-1">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                      <p className="text-emerald-200 text-xs mt-1">{paidCount} transaksi lunas</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
                      <p className="text-amber-100 text-sm font-medium">Menunggu Pembayaran</p>
                      <p className="text-3xl font-bold mt-1">Rp {totalPending.toLocaleString("id-ID")}</p>
                      <p className="text-amber-100 text-xs mt-1">{pendingCount} transaksi pending</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <p className="text-gray-500 text-sm font-medium">Tingkat Konversi</p>
                      <p className="text-3xl font-bold mt-1 text-gray-900">
                        {orders.length > 0 ? Math.round((paidCount / orders.length) * 100) : 0}%
                      </p>
                      <p className="text-gray-400 text-xs mt-1">{paidCount} dari {orders.length} order berhasil</p>
                    </div>
                  </div>

                  {/* Recent Data */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-900 mb-3">Undangan Terbaru</h3>
                      {invitations.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Belum ada undangan</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {invitations.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{inv.groomName || "Groom"} & {inv.brideName || "Bride"}</p>
                                <p className="text-xs text-gray-400">Tema: <span className="capitalize font-semibold text-amber-700">{inv.themeId}</span></p>
                              </div>
                              <Badge status={inv.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-900 mb-3">Transaksi Terkini</h3>
                      {orders.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Belum ada transaksi</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {orders.slice(0, 5).map((ord) => (
                            <div key={ord.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-mono text-xs text-gray-600">{ord.invoiceNumber}</p>
                                <p className="text-xs text-gray-400">{ord.user?.name || ord.user?.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm text-gray-900">Rp {Number(ord.amount).toLocaleString("id-ID")}</p>
                                <Badge status={ord.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                          {["Invoice", "Klien", "Paket", "Jumlah", "Status", "Tanggal", "Aksi"].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {orders.length === 0 ? (
                          <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 italic">Belum ada transaksi</td></tr>
                        ) : orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50 transition">
                            <td className="px-5 py-3 text-xs font-mono text-gray-700">{ord.invoiceNumber}</td>
                            <td className="px-5 py-3 text-sm text-gray-800">{ord.user?.name || ord.user?.email}</td>
                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">{ord.planType}</td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-900">Rp {Number(ord.amount).toLocaleString("id-ID")}</td>
                            <td className="px-5 py-3"><Badge status={ord.status} /></td>
                            <td className="px-5 py-3 text-xs text-gray-400">{new Date(ord.createdAt).toLocaleDateString("id-ID")}</td>
                            <td className="px-5 py-3">
                              {ord.status === "PENDING" && (
                                <button
                                  onClick={() => handleApproveOrder(ord.id)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                >
                                  ✓ Konfirmasi Manual
                                </button>
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
                          {["Pasangan", "Subdomain / URL", "Tema", "Status", "Aksi"].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invitations.map((inv) => {
                          const coupleName = `${inv.groomNickname || inv.groomName || "Mempelai Pria"} & ${inv.brideNickname || inv.brideName || "Mempelai Wanita"}`;
                          const activeSub = inv.subdomain || `${inv.groomSlug || "didan"}-${inv.brideSlug || "nasha"}`;
                          const publicUrl = getInvitationPublicUrl(activeSub);

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
                                <div className="flex items-center gap-2">
                                  <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-700 hover:text-amber-900 font-semibold text-xs underline"
                                  >
                                    Preview
                                  </a>
                                  <button
                                    onClick={() => handleUnlockTheme(inv.id)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    title="Buka akses semua tema untuk undangan ini"
                                  >
                                    Buka Akses Tema
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
                    <div className="flex items-center gap-2">
                      <a
                        href="/downloads/starter-blueprint.html"
                        download="starter-blueprint.html"
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-stone-300 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Blueprint HTML</span>
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

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                    {[
                      { id: "all", label: `Semua Tema (${themes.length})` },
                      { id: "premium", label: `Premium Series (${themes.filter((t) => (t.category || "premium") === "premium").length})` },
                      { id: "modern", label: `Modern Series (${themes.filter((t) => t.category === "modern").length})` },
                      { id: "traditional", label: `Traditional Series (${themes.filter((t) => t.category === "traditional").length})` },
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
                            <a href={`/demo/${theme.id}`} target="_blank" className="text-amber-700 hover:underline font-semibold text-xs">Preview</a>
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

                  {/* iPaymu Settings */}
                  <SettingsCard
                    title="iPaymu Payment Gateway"
                    description="Konfigurasi koneksi ke iPaymu sebagai payment gateway utama. Dapatkan VA dan API Key dari dashboard iPaymu."
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

                  {/* Pricing Settings */}
                  <SettingsCard
                    title="Manajemen Harga Paket"
                    description="Atur harga dan deskripsi untuk 3 kategori paket: Traditional Series, Modern Series, dan Premium Series."
                    isEditing={Boolean(editSection["pricing"])}
                    onEdit={() => toggleEditSection("pricing")}
                    onCancel={() => cancelEdit("pricing", ["price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"])}
                    onSave={() => saveSettings(["price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"], setSavingPricing, "pricing")}
                    saving={savingPricing}
                    isDirty={isSectionDirty(["price_traditional", "price_modern", "price_premium", "desc_traditional", "desc_modern", "desc_premium"])}
                    saveSuccess={settingsSaved["pricing"]}
                    saveSuccessMessage="Harga paket berhasil diperbarui"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Traditional</span>
                            <span className="text-sm font-bold text-gray-900 font-mono">
                              Rp {Number(settingsMap["price_traditional"] || 299000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_traditional"] || "Tema Traditional — Sakral, Megah & Bernuansa Tradisional"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Modern</span>
                            <span className="text-sm font-bold text-gray-900 font-mono">
                              Rp {Number(settingsMap["price_modern"] || 499000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_modern"] || "Tema Modern — Minimalis, Kontemporer & Sinematik"}</p>
                        </div>
                        <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Premium Series</span>
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
                          <span className="text-sm font-bold text-gray-800">Paket Traditional</span>
                        </div>
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
                          <span className="text-sm font-bold text-gray-800">Paket Modern</span>
                        </div>
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
                          <span className="text-sm font-bold text-gray-800">Paket Premium</span>
                        </div>
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

                  {/* Platform Settings */}
                  <SettingsCard
                    title="Konfigurasi Platform"
                    description="Nama platform dan email support yang digunakan di seluruh sistem."
                    isEditing={Boolean(editSection["platform"])}
                    onEdit={() => toggleEditSection("platform")}
                    onCancel={() => cancelEdit("platform", ["platform_name", "support_email"])}
                    onSave={() => saveSettings(["platform_name", "support_email"], setSavingPlatform, "platform")}
                    saving={savingPlatform}
                    isDirty={isSectionDirty(["platform_name", "support_email"])}
                    saveSuccess={settingsSaved["platform"]}
                    saveSuccessMessage="Konfigurasi platform berhasil disimpan"
                    viewContent={
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      </div>
                    }
                  >
                    <FieldRow label="Nama Platform">
                      <input
                        type="text"
                        value={settingsMap["platform_name"] || "Luxenary Invite"}
                        onChange={(e) => setSetting("platform_name", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
                      />
                    </FieldRow>

                    <FieldRow label="Domain Host Platform" description="Domain ini otomatis terdeteksi dari host server aktif saat aplikasi dijalankan / di-deploy.">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono flex items-center justify-between">
                        <span>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</span>
                        <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-sans font-bold">● Auto-Detected</span>
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
                  </SettingsCard>
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
    </div>
  );
}
