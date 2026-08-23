"use client";

import { useState, useEffect, useCallback } from "react";

const tabs = [
  { id: "overview", label: "📊 Ringkasan", icon: "📊" },
  { id: "orders", label: "💳 Transaksi", icon: "💳" },
  { id: "users", label: "👥 Klien", icon: "👥" },
  { id: "invitations", label: "💌 Undangan", icon: "💌" },
  { id: "themes", label: "🎨 Tema", icon: "🎨" },
  { id: "settings", label: "⚙️ Pengaturan", icon: "⚙️" },
  { id: "logs", label: "🔍 Monitoring", icon: "🔍" },
];

const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    FAILED: "bg-red-100 text-red-700",
    EXPIRED: "bg-gray-100 text-gray-600",
    PUBLISHED: "bg-green-100 text-green-800",
    DRAFT: "bg-amber-100 text-amber-700",
    TAKEN_DOWN: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
};

function SettingsCard({
  title, description, children, onSave, saving,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-5">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
      {onSave && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Menyimpan...</>
            ) : "Simpan Perubahan"}
          </button>
        </div>
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
  const [savingIpaymu, setSavingIpaymu] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState<Record<string, boolean>>({});

  // Theme Management Modal / Form State
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any | null>(null);
  const [themeForm, setThemeForm] = useState({
    id: "",
    name: "",
    category: "modern",
    series: "Modern",
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
        setSettingsSaved((p) => ({ ...p, [group]: true }));
        setTimeout(() => setSettingsSaved((p) => ({ ...p, [group]: false })), 3000);
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
      category: "modern",
      series: "Modern",
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
      category: th.category || "modern",
      series: th.series || (th.category === "traditional" ? "Traditional" : "Modern"),
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                      { label: "Total Klien", value: stats.userCount, color: "text-blue-600", bg: "bg-blue-50", icon: "👥" },
                      { label: "Total Undangan", value: stats.invitationCount, color: "text-amber-600", bg: "bg-amber-50", icon: "💌" },
                      { label: "Total Transaksi", value: stats.orderCount, color: "text-purple-600", bg: "bg-purple-50", icon: "💳" },
                      { label: "Tamu Terdaftar", value: stats.guestCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: "🎟" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
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
                    <p className="text-sm text-gray-500">{users.length} klien terdaftar</p>
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
                        {users.map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50 transition">
                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">{usr.name}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{usr.email}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${usr.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400">{new Date(usr.createdAt).toLocaleDateString("id-ID")}</td>
                          </tr>
                        ))}
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
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50 transition">
                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">{inv.groomName} & {inv.brideName}</td>
                            <td className="px-5 py-3 text-xs font-mono text-amber-700">{inv.subdomain ? `${inv.subdomain}.luxenary.id` : `/${inv.groomSlug}-${inv.brideSlug}/${inv.invitationSlug}`}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm capitalize">{inv.themeId}</span>
                                <select
                                  value={inv.themeId}
                                  onChange={(e) => handleSwitchTheme(inv.id, e.target.value)}
                                  className="text-xs bg-gray-50 border border-gray-200 rounded p-1 text-gray-700 font-medium capitalize"
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
                                <a href={`/${inv.groomSlug}-${inv.brideSlug}/${inv.invitationSlug}`} target="_blank" className="text-amber-700 hover:text-amber-900 font-bold text-xs underline">Preview</a>
                                <button onClick={() => handleUnlockTheme(inv.id)} className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer">🔓 Tema</button>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-stone-300 shadow-2xs"
                      >
                        <span>📥</span>
                        <span>Download Starter Blueprint HTML</span>
                      </a>
                      <button
                        onClick={handleOpenNewTheme}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
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
                      { id: "modern", label: `Modern Series (${themes.filter((t) => (t.category || "modern") === "modern").length})` },
                      { id: "traditional", label: `Traditional Series (${themes.filter((t) => t.category === "traditional").length})` },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setThemeCategoryFilter(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                    {(themeCategoryFilter === "all" ? themes : themes.filter((t) => (t.category || "modern") === themeCategoryFilter)).map((theme) => (
                      <div key={theme.id} className={`bg-white rounded-2xl shadow-sm border p-5 space-y-3 transition ${theme.isActive === false ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base">{theme.name}</h3>
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              #{theme.id}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            theme.category === "traditional" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {theme.category === "traditional" ? "Traditional" : "Modern"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed font-medium">{theme.description || "Tanpa deskripsi"}</p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleThemeStatus(theme)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${theme.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {theme.isActive !== false ? "● Aktif" : "○ Non-aktif"}
                            </button>
                            <span className="text-gray-400 text-[10px]">Urutan: #{theme.sortOrder || 1}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <a href={`/demo/${theme.id}`} target="_blank" className="text-amber-700 hover:underline font-bold text-xs">Preview</a>
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
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Konfigurasi payment gateway, harga paket, dan info platform</p>
                  </div>

                  {/* iPaymu Settings */}
                  <SettingsCard
                    title="💳 iPaymu Payment Gateway"
                    description="Konfigurasi koneksi ke iPaymu sebagai payment gateway utama. Dapatkan VA dan API Key dari dashboard iPaymu."
                    onSave={() => saveSettings(["ipaymu_mode", "ipaymu_va", "ipaymu_api_key"], setSavingIpaymu, "ipaymu")}
                    saving={savingIpaymu}
                  >
                    {settingsSaved["ipaymu"] && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium">
                        ✓ Pengaturan iPaymu berhasil disimpan!
                      </div>
                    )}

                    <FieldRow label="Mode" description="Gunakan Sandbox untuk pengujian, Produksi untuk transaksi nyata">
                      <div className="flex gap-3">
                        {["sandbox", "production"].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSetting("ipaymu_mode", mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                              settingsMap["ipaymu_mode"] === mode
                                ? mode === "production"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-amber-500 text-white border-amber-500"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {mode === "sandbox" ? "🧪 Sandbox" : "🟢 Produksi"}
                          </button>
                        ))}
                      </div>
                      {settingsMap["ipaymu_mode"] === "sandbox" && (
                        <p className="mt-1.5 text-xs text-amber-600 font-medium">⚠ Mode Sandbox aktif — transaksi tidak nyata</p>
                      )}
                      {settingsMap["ipaymu_mode"] === "production" && (
                        <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ Mode Produksi aktif — transaksi nyata</p>
                      )}
                    </FieldRow>

                    <FieldRow label="Virtual Account (VA)" description="Nomor VA iPaymu Anda (dari Dashboard → Akun → VA Number)">
                      <input
                        type="text"
                        value={settingsMap["ipaymu_va"] || ""}
                        onChange={(e) => setSetting("ipaymu_va", e.target.value)}
                        placeholder="Contoh: 0000000000000000"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition"
                      />
                    </FieldRow>

                    <FieldRow label="API Key" description="API Key dari Dashboard iPaymu → Pengaturan → API Key">
                      <input
                        type="password"
                        value={settingsMap["ipaymu_api_key"] || ""}
                        onChange={(e) => setSetting("ipaymu_api_key", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition"
                      />
                    </FieldRow>

                    <FieldRow label="URL Webhook (Otomatis)" description="URL ini harus dikonfigurasi di dashboard iPaymu sebagai Notify URL">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`${settingsMap["platform_url"] || "http://localhost:3000"}/api/webhook/ipaymu`}
                          readOnly
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono bg-gray-100 text-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || "http://localhost:3000"}/api/webhook/ipaymu`)}
                          className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          Salin
                        </button>
                      </div>
                    </FieldRow>
                  </SettingsCard>

                  {/* Pricing Settings */}
                  <SettingsCard
                    title="💰 Manajemen Harga Paket"
                    description="Atur harga dan deskripsi paket Traditional dan Modern yang ditampilkan di halaman registrasi."
                    onSave={() => saveSettings(["price_traditional", "price_modern", "desc_traditional", "desc_modern"], setSavingPricing, "pricing")}
                    saving={savingPricing}
                  >
                    {settingsSaved["pricing"] && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium">
                        ✓ Harga paket berhasil diperbarui!
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span className="text-sm font-bold text-gray-800">Paket Traditional</span>
                        </div>
                        <FieldRow label="Harga (IDR)">
                          <input
                            type="number"
                            value={settingsMap["price_traditional"] || "299000"}
                            onChange={(e) => setSetting("price_traditional", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-400 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Deskripsi">
                          <textarea
                            rows={2}
                            value={settingsMap["desc_traditional"] || "Tema Traditional — Sakral & Royal Keraton"}
                            onChange={(e) => setSetting("desc_traditional", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-400 transition resize-none"
                          />
                        </FieldRow>
                      </div>

                      <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          <span className="text-sm font-bold text-gray-800">Paket Modern</span>
                        </div>
                        <FieldRow label="Harga (IDR)">
                          <input
                            type="number"
                            value={settingsMap["price_modern"] || "499000"}
                            onChange={(e) => setSetting("price_modern", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition"
                          />
                        </FieldRow>
                        <FieldRow label="Deskripsi">
                          <textarea
                            rows={2}
                            value={settingsMap["desc_modern"] || "Tema Modern — Minimalis, Editorial & Sinematik"}
                            onChange={(e) => setSetting("desc_modern", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-rose-400 transition resize-none"
                          />
                        </FieldRow>
                      </div>
                    </div>
                  </SettingsCard>

                  {/* Platform Settings */}
                  <SettingsCard
                    title="🌐 Konfigurasi Platform"
                    description="Nama platform dan email support yang digunakan di seluruh sistem."
                    onSave={() => saveSettings(["platform_name", "support_email"], setSavingPlatform, "platform")}
                    saving={savingPlatform}
                  >
                    {settingsSaved["platform"] && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl font-medium">
                        ✓ Konfigurasi platform berhasil disimpan!
                      </div>
                    )}

                    <FieldRow label="Nama Platform">
                      <input
                        type="text"
                        value={settingsMap["platform_name"] || "Luxenary Invite"}
                        onChange={(e) => setSetting("platform_name", e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition"
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
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-amber-400 focus:bg-white transition"
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
                <label className="block text-xs font-bold text-gray-700 mb-1">ID Tema (Nama file HTML)</label>
                <input
                  type="text"
                  value={themeForm.id}
                  onChange={(e) => setThemeForm({ ...themeForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="contoh: kalandra, jawa, sunda"
                  disabled={Boolean(editingTheme)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 disabled:opacity-60"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  File HTML disimpan di <code className="font-mono text-gray-600">themes/modern/{themeForm.id || "id"}.html</code> atau <code className="font-mono text-gray-600">themes/traditional/{themeForm.id || "id"}.html</code>.{" "}
                  <a href="/downloads/starter-blueprint.html" download="starter-blueprint.html" className="text-amber-700 font-bold hover:underline">
                    Unduh Starter Blueprint HTML
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Tema</label>
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  placeholder="contoh: Kalandra"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={themeForm.category}
                    onChange={(e) => setThemeForm({ ...themeForm, category: e.target.value, series: e.target.value === "traditional" ? "Traditional" : "Modern" })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
                  >
                    <option value="modern">Modern</option>
                    <option value="traditional">Traditional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Urutan (Sort)</label>
                  <input
                    type="number"
                    value={themeForm.sortOrder}
                    onChange={(e) => setThemeForm({ ...themeForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={themeForm.description}
                  onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })}
                  placeholder="contoh: Modern, Elegan & Minimalis"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
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
