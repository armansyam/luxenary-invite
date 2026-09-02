"use client";

import { useState, useEffect } from "react";

export function AdminTeamManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", username: "", email: "", role: "SUPPORT", password: "" });
  const [submitting, setSubmitting] = useState(false);

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
      fetchAdmins(); // refresh
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Hapus admin ${username}?`)) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus admin");
      fetchAdmins();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat data tim...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tim & Hak Akses</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola staf admin, customer service, dan finance Anda di sini.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          + Tambah Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Nama Lengkap</th>
              <th className="px-6 py-4">Username / Email</th>
              <th className="px-6 py-4">Jabatan (Role)</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50/50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{admin.name}</td>
                <td className="px-6 py-4 text-gray-500">
                  <div className="font-medium text-gray-700">@{admin.username}</div>
                  <div className="text-xs">{admin.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    admin.role === 'FINANCE' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button onClick={() => handleDelete(admin.id, admin.username)} className="text-rose-500 hover:text-rose-700 font-medium">Hapus</button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada admin lain.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Admin Baru</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="Budi Santoso" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="budi_cs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="budi@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm bg-white">
                  <option value="SUPPORT">SUPPORT (Customer Service)</option>
                  <option value="FINANCE">FINANCE (Keuangan)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN (Akses Penuh)</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">CS: Hanya menu klien. Finance: Hanya transaksi & klien.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password Awal</label>
                <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="P@ssw0rd123" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-semibold text-sm">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
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
