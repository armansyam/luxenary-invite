"use client";

import { useState, useEffect } from "react";

const tabs = [
  { id: "overview", label: "Ringkasan", icon: "📊" },
  { id: "orders", label: "Transaksi", icon: "💳" },
  { id: "users", label: "Klien", icon: "👥" },
  { id: "invitations", label: "Undangan", icon: "📬" },
  { id: "themes", label: "Tema", icon: "🎨" },
  { id: "settings", label: "Pengaturan", icon: "⚙️" },
  { id: "logs", label: "Monitoring", icon: "📑" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    invitationCount: 0,
    orderCount: 0,
    guestCount: 0,
    userCount: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💍</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-amber-950 bg-clip-text text-transparent">
                Luxenary Admin Portal
              </h1>
            </div>
            <a
              href="/dashboard"
              className="text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline"
            >
              ← Kembali ke Dashboard Klien
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
          <nav className="py-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-5 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-amber-50 text-amber-800 border-r-4 border-amber-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="mr-3 text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ringkasan Sistem</h2>
                    <p className="text-sm text-gray-500 mt-1">Metrik dan aktivitas platform Luxenary Invite</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Total Klien</span>
                        <span className="text-2xl">👥</span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-gray-900">{stats.userCount}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Total Undangan</span>
                        <span className="text-2xl">💌</span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-amber-600">{stats.invitationCount}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Total Transaksi</span>
                        <span className="text-2xl">💳</span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.orderCount}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Tamu Terdaftar</span>
                        <span className="text-2xl">📋</span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-purple-600">{stats.guestCount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Undangan Terbaru</h3>
                      {invitations.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Belum ada undangan terdaftar</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {invitations.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">
                                  {inv.groomName || "Groom"} & {inv.brideName || "Bride"}
                                </p>
                                <p className="text-xs text-gray-500">Tema: {inv.themeId}</p>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                inv.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Transaksi Terkini</h3>
                      {orders.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Belum ada transaksi</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {orders.slice(0, 5).map((ord) => (
                            <div key={ord.id} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="font-mono text-xs text-gray-600">{ord.invoiceNumber}</p>
                                <p className="text-xs text-gray-500">Klien: {ord.user?.name || ord.user?.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm text-gray-900">
                                  Rp {Number(ord.amount).toLocaleString("id-ID")}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  ord.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {ord.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Daftar Transaksi Pembelian</h2>
                  {orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                      Belum ada riwayat transaksi
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm font-mono text-gray-800">{ord.invoiceNumber}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{ord.user?.name || ord.user?.email}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{ord.planType}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                Rp {Number(ord.amount).toLocaleString("id-ID")}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  ord.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Daftar Pengguna / Klien</h2>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terdaftar</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{usr.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{usr.email}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                usr.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(usr.createdAt).toLocaleDateString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invitations Tab */}
              {activeTab === "invitations" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Katalog Undangan Klien</h2>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pasangan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tema</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {inv.groomName} & {inv.brideName}
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-amber-700">
                              /{inv.groomSlug}-{inv.brideSlug}/{inv.invitationSlug}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{inv.themeId}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                inv.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <a
                                href={`/${inv.groomSlug}-${inv.brideSlug}/${inv.invitationSlug}`}
                                target="_blank"
                                className="text-amber-600 hover:text-amber-900 font-medium text-xs"
                              >
                                Buka Undangan ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Themes Tab */}
              {activeTab === "themes" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Katalog Tema Undangan</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {themes.map((theme) => (
                      <div key={theme.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-lg">{theme.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            theme.isPremium ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                          }`}>
                            {theme.isPremium ? "Premium" : "Standard"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{theme.description}</p>
                        <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Series: <strong className="capitalize">{theme.series}</strong></span>
                          <span>Order: #{theme.sortOrder}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Pengaturan Konfigurasi</h2>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                      <input
                        type="text"
                        defaultValue="Luxenary Invite Platform"
                        className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Domain</label>
                      <input
                        type="text"
                        defaultValue="luxenary.id / invited.id"
                        className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Gateways Active</label>
                      <p className="text-sm text-emerald-600 font-medium mt-1">✓ Midtrans Snap & iPaymu Ready</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === "logs" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Monitoring Webhook & Log Aktivitas</h2>
                  {logs.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                      Belum ada webhook log yang terekam
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                      {logs.map((log) => (
                        <div key={log.id} className="p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 uppercase">{log.source} • {log.event}</span>
                            <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                          </div>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto text-gray-700">
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
    </div>
  );
}