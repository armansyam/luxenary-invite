"use client";

import { useState, useEffect } from "react";
import {
  CONFIGURABLE_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  resolveAdminPermissions,
} from "@/lib/adminPermissions";

const ROLE_META: Record<string, {
  name: string;
  badgeClass: string;
  description: string;
}> = {
  SUPPORT: {
    name: "SUPPORT (Customer Service)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    description: "Fokus pada asistensi klien, buka kunci darurat studio, dan bantuan aktivasi custom domain.",
  },
  FINANCE: {
    name: "FINANCE (Staf Keuangan)",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Fokus pada arus kas, verifikasi transfer manual, pengeluaran rutin bulanan, tutup buku & rekap pajak.",
  },
  ADMIN: {
    name: "ADMIN (Staf Operasional)",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Mengelola operasional harian: transaksi, klien, proyek undangan, portofolio, custom domain, dan tema & musik.",
  },
  SUPER_ADMIN: {
    name: "SUPER ADMIN (Owner / Akses Penuh)",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Akses mutlak ke seluruh 13 modul sistem, termasuk konfigurasi platform, database snapshot, pemasaran & afiliasi, finance, dan manajemen tim.",
  },
};

const CATEGORY_BADGES: Record<string, string> = {
  OPERATIONAL: "bg-blue-50 text-blue-700 border-blue-200",
  FINANCE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CREATIVE: "bg-violet-50 text-violet-700 border-violet-200",
  SYSTEM: "bg-stone-50 text-stone-700 border-stone-200",
};

export function AdminTeamManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  
  // Modal Tambah Admin
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    role: "SUPPORT",
    password: "",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.SUPPORT || [])],
  });

  // Modal Edit Admin
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    username: "",
    email: "",
    role: "SUPPORT",
    password: "",
    permissions: [] as string[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Gagal mengambil data admin (${res.status})`);
      }
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

  const handleRoleChange = (newRole: string) => {
    const defaultPerms = newRole === "SUPER_ADMIN" ? [] : [...(ROLE_DEFAULT_PERMISSIONS[newRole] || [])];
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: defaultPerms,
    }));
  };

  const togglePermission = (moduleId: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(moduleId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((id) => id !== moduleId)
          : [...prev.permissions, moduleId],
      };
    });
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat admin");
      
      setIsModalOpen(false);
      setFormData({
        name: "",
        username: "",
        email: "",
        role: "SUPPORT",
        password: "",
        permissions: [...(ROLE_DEFAULT_PERMISSIONS.SUPPORT || [])],
      });
      setActionSuccess("Admin baru berhasil ditambahkan.");
      setTimeout(() => setActionSuccess(""), 4000);
      fetchAdmins();
    } catch (err: any) {
      setActionError(err.message || "Gagal membuat admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (admin: any) => {
    setActionError("");
    setEditingAdmin(admin);
    const resolved = resolveAdminPermissions(admin.role, admin.permissions);
    setEditFormData({
      id: admin.id,
      name: admin.name || "",
      username: admin.username || "",
      email: admin.email || "",
      role: admin.role || "SUPPORT",
      password: "",
      permissions: admin.role === "SUPER_ADMIN" ? [] : resolved,
    });
  };

  const handleEditRoleChange = (newRole: string) => {
    const defaultPerms = newRole === "SUPER_ADMIN" ? [] : [...(ROLE_DEFAULT_PERMISSIONS[newRole] || [])];
    setEditFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: defaultPerms,
    }));
  };

  const toggleEditPermission = (moduleId: string) => {
    setEditFormData((prev) => {
      const exists = prev.permissions.includes(moduleId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((id) => id !== moduleId)
          : [...prev.permissions, moduleId],
      };
    });
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const payload: any = {
        name: editFormData.name,
        username: editFormData.username,
        email: editFormData.email,
        role: editFormData.role,
        permissions: editFormData.role === "SUPER_ADMIN" ? [] : editFormData.permissions,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }
      const res = await fetch(`/api/admin/admins/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui admin");

      setEditingAdmin(null);
      setActionSuccess("Hak akses admin berhasil diperbarui.");
      setTimeout(() => setActionSuccess(""), 4000);
      fetchAdmins();
    } catch (err: any) {
      setActionError(err.message || "Gagal memperbarui admin");
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

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium text-xs">Memuat data tim...</div>;
  if (error) return <div className="p-8 text-center text-rose-600 font-medium text-xs">{error}</div>;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError("")} className="text-rose-600 font-bold ml-2 cursor-pointer">×</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess("")} className="text-emerald-600 font-bold ml-2 cursor-pointer">×</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tim &amp; Hak Akses Administrator</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola staf dan konfigurasikan izin akses modul per anggota tim secara dinamis.</p>
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
                <th className="px-6 py-3.5">Hak Akses Modul</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => {
                const roleMeta = ROLE_META[admin.role] || {
                  name: admin.role,
                  badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
                };
                const isSuperAdmin = admin.role === "SUPER_ADMIN";
                const effectivePerms = isSuperAdmin ? [] : resolveAdminPermissions(admin.role, admin.permissions);

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
                    <td className="px-6 py-3.5">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-semibold">
                          <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Semua 13 Modul (Akses Penuh)</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-stone-700">
                            {effectivePerms.length} dari {CONFIGURABLE_MODULES.length} Modul
                          </span>
                          <span className="text-[10px] text-stone-400">
                            ({effectivePerms.slice(0, 3).join(", ")}{effectivePerms.length > 3 ? "..." : ""})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(admin)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit Akses</span>
                        </button>

                        {deleteConfirmId === admin.id ? (
                          <div className="inline-flex items-center gap-1.5 ml-1">
                            <span className="text-[10px] text-rose-600 font-medium">Hapus?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(admin.id)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Ya
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
                            className="text-rose-600 hover:text-rose-800 font-medium text-xs cursor-pointer ml-1"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada staf admin terdaftar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH ADMIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Tambah Administrator Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">Tentukan kredensial akun dan atur hak akses modul secara dinamis.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Template Jabatan &amp; Peran Dasar</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-medium"
                >
                  <option value="SUPPORT">SUPPORT — Customer Service (Bantu Klien, Undangan &amp; Domain)</option>
                  <option value="FINANCE">FINANCE — Staf Keuangan (Kas, Transaksi &amp; Pajak)</option>
                  <option value="ADMIN">ADMIN — Staf Operasional (Undangan, Klien, Tema, Portofolio &amp; Transaksi)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN — Owner (Akses Penuh Seluruh 13 Modul)</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  {ROLE_META[formData.role]?.description}
                </p>
              </div>

              {/* CHECKLIST HAK AKSES MODUL DINAMIS */}
              {formData.role !== "SUPER_ADMIN" ? (
                <div className="space-y-2 pt-2 border-t border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Rincian Izin Modul ({formData.permissions.length} Dipilih):
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Centang atau batalkan modul sesuai kebutuhan staf
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {CONFIGURABLE_MODULES.map((mod) => {
                      const isChecked = formData.permissions.includes(mod.id);
                      const catBadge = CATEGORY_BADGES[mod.category] || "bg-stone-50 text-stone-700 border-stone-200";
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition select-none ${
                            isChecked
                              ? "bg-amber-50/40 border-amber-300"
                              : "bg-white border-gray-200 hover:bg-gray-50/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(mod.id)}
                            className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-gray-900">{mod.label}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${catBadge}`}>
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {mod.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-stone-700 font-bold text-[10px]">
                      <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Modul Terkunci Mutlak Khusus Super Admin</span>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Pengaturan Platform, Database &amp; Backup, serta Tim &amp; Hak Akses terlindungi secara mutlak demi keamanan kunci API dan integritas database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-800 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Akses Penuh Seluruh Modul</span>
                  </div>
                  <p className="text-[11px] text-purple-700 leading-relaxed">
                    Super Admin memiliki wewenang tertinggi untuk mengakses dan mengelola seluruh 13 modul sistem tanpa batasan.
                  </p>
                </div>
              )}

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

      {/* MODAL EDIT ADMIN */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Hak Akses Administrator</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ubah peran dan checklist izin modul untuk @{editFormData.username}.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                  <input
                    required
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password Baru <span className="text-[10px] text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-mono"
                    placeholder="Biarkan kosong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan &amp; Peran Dasar</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => handleEditRoleChange(e.target.value)}
                  disabled={editingAdmin.role === "SUPER_ADMIN"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-xs bg-white text-gray-900 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="SUPPORT">SUPPORT — Customer Service (Bantu Klien, Undangan &amp; Domain)</option>
                  <option value="FINANCE">FINANCE — Staf Keuangan (Kas, Transaksi &amp; Pajak)</option>
                  <option value="ADMIN">ADMIN — Staf Operasional (Undangan, Klien, Tema, Portofolio &amp; Transaksi)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN — Owner (Akses Penuh Seluruh 13 Modul)</option>
                </select>
                {editingAdmin.role === "SUPER_ADMIN" && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Peran Super Admin utama tidak dapat di-downgrade demi keamanan sistem.
                  </p>
                )}
              </div>

              {/* CHECKLIST HAK AKSES MODUL DINAMIS EDIT */}
              {editFormData.role !== "SUPER_ADMIN" ? (
                <div className="space-y-2 pt-2 border-t border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">
                      Rincian Izin Modul ({editFormData.permissions.length} Dipilih):
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Pilih modul yang diizinkan untuk akun ini
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {CONFIGURABLE_MODULES.map((mod) => {
                      const isChecked = editFormData.permissions.includes(mod.id);
                      const catBadge = CATEGORY_BADGES[mod.category] || "bg-stone-50 text-stone-700 border-stone-200";
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition select-none ${
                            isChecked
                              ? "bg-amber-50/40 border-amber-300"
                              : "bg-white border-gray-200 hover:bg-gray-50/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEditPermission(mod.id)}
                            className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-gray-900">{mod.label}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${catBadge}`}>
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {mod.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-800 text-xs">
                  <span className="font-semibold block mb-0.5">Akses Penuh Seluruh Modul</span>
                  <span className="text-[11px] text-purple-700">
                    Akun Super Admin memiliki wewenang ke semua modul tanpa batasan.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
