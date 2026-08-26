"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function AdminProfileSettings({ sessionUser }: { sessionUser: any }) {
  const [formData, setFormData] = useState({
    name: sessionUser?.name || "",
    username: sessionUser?.username || "", // Might not be in session depending on token config, but we'll try
    email: sessionUser?.email || "",
    currentPassword: "",
    newPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil");

      setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
      
      // Clear passwords fields
      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));

      // If they changed password, maybe force logout? Or just notify
      if (formData.newPassword) {
        alert("Password berhasil diubah. Silakan login kembali.");
        signOut({ callbackUrl: "/admin/login" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Profil & Keamanan Akun</h3>
        <p className="text-sm text-gray-500 mt-1">Perbarui data diri dan ganti password akun Anda.</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" />
        </div>
      </div>

      <hr className="border-gray-100" />
      
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-3">Ganti Password</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password Saat Ini</label>
            <input type="password" value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="Kosongkan jika tidak ingin ganti" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password Baru</label>
            <input type="password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="Minimal 6 karakter" minLength={6} />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-2">Penting: Mengganti password akan mengharuskan Anda untuk login ulang.</p>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={saving} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
