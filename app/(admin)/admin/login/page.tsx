"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Silakan masukkan username/email dan password administrator.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: username.trim(),
        password: password.trim(),
        portal: "ADMIN",
      });

      if (res?.error) {
        setError("Kredensial administrator salah atau akses ditolak.");
        setLoading(false);
      } else {
        window.location.href = "/admin";
      }
    } catch (e) {
      console.error(e);
      setError("Gagal terhubung ke server otorisasi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* High-security ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 text-white space-y-6">
        {/* Admin Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-600/20 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            RESTRICTED ENTERPRISE ACCESS
          </span>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Luxenary Admin Console</h1>
          <p className="text-xs text-stone-400">Pusat kendali transaksi, manajemen paket &amp; pengaturan sistem</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1.5">Username / Email Admin</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@luxenary.id atau admin"
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1.5">Password Keamanan</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-950/40 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Memverifikasi Kredensial..." : "Otorisasi & Masuk ke Console"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-stone-800/80">
          <a href="/login" className="text-[11px] text-stone-400 hover:text-amber-400 transition">
            ← Pindah ke Portal Login Klien (Calon Pengantin)
          </a>
        </div>
      </div>
    </div>
  );
}
