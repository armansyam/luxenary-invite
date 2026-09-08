"use client";

import { useState, useEffect } from "react";

const ROLE_DEFINITIONS: Record<string, {
  name: string;
  badgeClass: string;
  description: string;
  allowedTabs: { id: string; label: string }[];
  restrictedTabs: { id: string; label: string }[];
}> = {
  SUPPORT: {
    name: "SUPPORT (Customer Service)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    description: "Fokus pada asistensi klien, buka kunci darurat studio, dan bantuan aktivasi custom domain.",
    allowedTabs: [
      { id: "users", label: "Klien & Remote" },
      { id: "invitations", label: "Projek & Kunci Darurat" },
      { id: "custom_domains", label: "Custom Domain" },
    ],
    restrictedTabs: [
      { id: "overview", label: "Ringkasan" },
      { id: "orders", label: "Transaksi" },
      { id: "themes", label: "Tema" },
      { id: "portfolio", label: "Portofolio" },
      { id: "finance", label: "Keuangan" },
      { id: "settings", label: "Pengaturan" },
      { id: "database", label: "Database" },
      { id: "logs", label: "Monitoring" },
      { id: "team", label: "Tim" },
    ],
  },
  FINANCE: {
    name: "FINANCE (Staf Keuangan)",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Fokus pada arus kas, verifikasi transfer manual, pengeluaran rutin bulanan, tutup buku & rekap pajak.",
    allowedTabs: [
      { id: "overview", label: "Ringkasan Finansial" },
      { id: "orders", label: "Transaksi & Bukti Bayar" },
      { id: "users", label: "Daftar Klien" },
      { id: "finance", label: "Finance & Pembukuan" },
    ],
    restrictedTabs: [
      { id: "invitations", label: "Projek Undangan" },
      { id: "custom_domains", label: "Custom Domain" },
      { id: "themes", label: "Tema & Musik" },
      { id: "portfolio", label: "Portofolio" },
      { id: "settings", label: "Pengaturan" },
      { id: "database", label: "Database" },
      { id: "logs", label: "Monitoring" },
      { id: "team", label: "Tim" },
    ],
  },
  ADMIN: {
    name: "ADMIN (Staf Operasional)",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Mengelola operasional harian: transaksi, klien, proyek undangan, portofolio, custom domain, dan tema & musik.",
    allowedTabs: [
      { id: "overview", label: "Ringkasan" },
      { id: "orders", label: "Transaksi" },
      { id: "users", label: "Klien" },
      { id: "invitations", label: "Projek Undangan" },
      { id: "portfolio", label: "Portofolio" },
      { id: "custom_domains", label: "Custom Domain" },
      { id: "themes", label: "Tema & Musik" },
    ],
    restrictedTabs: [
      { id: "finance", label: "Finance & Pembukuan" },
      { id: "settings", label: "Pengaturan Platform" },
      { id: "database", label: "Database & Backup" },
      { id: "logs", label: "Monitoring" },
      { id: "team", label: "Tim & Hak Akses" },
    ],
  },
  SUPER_ADMIN: {
    name: "SUPER ADMIN (Owner / Akses Penuh)",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Akses mutlak ke seluruh 12 modul sistem, termasuk konfigurasi platform, database snapshot, finance, dan manajemen tim.",
    allowedTabs: [
      { id: "all", label: "Semua 12 Modul Sistem (Akses Penuh)" },
    ],
    restrictedTabs: [],
  },
};

export function AdminTeamManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", username: "", email: "", role: "SUPPORT", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error("Gagal mengambil data admin");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat admin");
      
      setIsModalOpen(false);
      setFormData({ name: "", username: "", email: "", role: "SUPPORT", password: "" });
      fetchAdmins();
    } catch (err: any) {
      setActionError(err.message || "Gagal membuat admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError("");
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus admin");
      setDeleteConfirmId(null);
      fetchAdmins();
    } catch (err: any) {
      setActionError(err.message || "Gagal menghapus admin");
    }
  };

  const selectedRoleMeta = ROLE_DEFINITIONS[formData.role] || ROLE_DEFINITIONS.SUPPORT;

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium text-xs">Memuat data tim...</div>;
  if (error) return <div className="p-8 text-center text-rose-600 font-medium text-xs">{error}</div>;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError("")} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tim &amp; Hak Akses Administrator</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola staf admin, customer service, dan finance dengan pembagian hak akses terisolasi.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setActionError("");
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Admin Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Nama Lengkap</th>
                <th className="px-6 py-3.5">Username / Email</th>
                <th className="px-6 py-3.5">Jabatan (Role)</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => {
                const roleMeta = ROLE_DEFINITIONS[admin.role] || {
                  name: admin.role,
                  badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
                };
                return (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{admin.name}</td>
                    <td className="px-6 py-3.5 text-gray-500">
                      <div className="font-medium text-gray-800 font-mono">@{admin.username}</div>
                      <div className="text-[11px] text-gray-400">{admin.email}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.badgeClass}`}>
                        {roleMeta.name.split(" ")[0]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {deleteConfirmId === admin.id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[11px] text-rose-600 font-medium">Yakin hapus?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(admin.id)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(admin.id)}
                          className="text-rose-600 hover:text-rose-800 font-medium text-xs cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada staf admin terdaftar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Tambah Administrator Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">Tentukan kredensial akun dan batasan hak akses menu staf.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900"
                    placeholder="Budi Santoso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-mono"
                    placeholder="budi_cs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900"
                    placeholder="budi@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password Awal</label>
                  <input
                    required
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-mono"
                    placeholder="P@ssw0rd123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan &amp; Peran (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-medium"
                >
                  <option value="SUPPORT">SUPPORT — Customer Service (Bantu Klien &amp; Undangan)</option>
                  <option value="FINANCE">FINANCE — Staf Keuangan (Kas, Transaksi &amp; Pajak)</option>
                  <option value="ADMIN">ADMIN — Staf Operasional (Undangan, Klien, Tema &amp; Transaksi)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN — Owner (Akses Penuh ke 12 Modul Sistem)</option>
                </select>
              </div>

              {/* PRATINJAU HAK AKSES MENU DINAMIS */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-900 uppercase tracking-wider">
                    Pratinjau Hak Akses Menu:
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedRoleMeta.badgeClass}`}>
                    {selectedRoleMeta.name.split(" ")[0]}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {selectedRoleMeta.description}
                </p>

                <div className="space-y-2 pt-1 border-t border-stone-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Menu yang Dapat Diakses ({selectedRoleMeta.allowedTabs.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoleMeta.allowedTabs.map((tab) => (
                        <span key={tab.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-[10px] font-medium">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{tab.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedRoleMeta.restrictedTabs.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">
                        Menu yang Terkunci ({selectedRoleMeta.restrictedTabs.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoleMeta.restrictedTabs.map((tab) => (
                          <span key={tab.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/60 border border-stone-300/60 text-stone-600 text-[10px]">
                            <svg className="w-2.5 h-2.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>{tab.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
