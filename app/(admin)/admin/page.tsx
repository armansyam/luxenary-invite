"use client";

import { useState } from 'react';

const tabs = [
  { id: 'overview', label: 'Ringkasan', icon: '📊' },
  { id: 'orders', label: 'Transaksi', icon: '💳' },
  { id: 'users', label: 'Klien', icon: '👥' },
  { id: 'invitations', label: 'Undangan', icon: '📬' },
  { id: 'themes', label: 'Tema', icon: '🎨' },
  { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
  { id: 'logs', label: 'Monitoring', icon: '📊' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Placeholder data - will be fetched from API
  const invitationCount = 0;
  const orderCount = 0;
  const guestCount = 0;
  const orders: any[] = [];
  const users: any[] = [];
  const invitations: any[] = [];
  const themes: any[] = [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">S-Invite Admin</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200">
          <nav className="py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700 border-r-2 border-amber-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Ringkasan Eksekutif</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Undangan</h3>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{invitationCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Transaksi</h3>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{orderCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Tamu Terkini</h3>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{guestCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
              {orders.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-500">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paket</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-3 text-sm text-gray-900">{order.invoiceNumber}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{order.planType}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">Rp {Number(order.amount).toLocaleString('id-ID')}</td>
                          <td className="px-6 py-3 text-sm">
                            <span className={`px-2 inline-flex text-xs font-medium rounded-full ${
                              order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm">
                            <a href={`/admin/orders/${order.id}`} className="text-amber-600 hover:text-amber-900">
                              Detail
                            </a>
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
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Daftar Klien</h1>
              {users.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-500">Belum ada klien</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-3 text-sm text-gray-900">{user.name}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{user.role}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            <button className="text-amber-600 hover:text-amber-900">
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Undangan</h1>
              {invitations.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-500">Belum ada undangan</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tema</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invitations.map((inv) => (
                        <tr key={inv.id}>
                          <td className="px-6 py-3 text-sm text-gray-900 font-mono text-xs">{inv.groomSlug}-{inv.brideSlug}</td>
                          <td className="px-6 py-3 text-sm text-gray-900">{inv.themeId}</td>
                          <td className="px-6 py-3 text-sm">
                            <span className="px-2 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            <a href={`/admin/invitations/${inv.id}`} className="text-amber-600 hover:text-amber-900">
                              Edit
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Katalog Tema</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <div key={theme.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{theme.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{theme.description}</p>
                        <div className="mt-3 flex items-center">
                          <span className={`px-2 inline-flex text-xs font-medium rounded-full ${
                            theme.isPremium ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {theme.isPremium ? 'Premium' : 'Basic'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Platform</h3>
                    <p className="mt-1 text-sm text-gray-500">S-Invite</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Versi</h3>
                    <p className="mt-1 text-sm text-gray-500">5.2</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">API Keys</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="font-mono text-xs">MIDTRANS_SERVER_KEY</span> • {process.env.MIDTRANS_SERVER_KEY?.substring(0, 10)}...
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Log Aktivitas</h3>
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada log aktivitas</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}