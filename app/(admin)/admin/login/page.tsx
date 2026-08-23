"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (customUser?: string) => {
    setLoading(true);
    setError(null);
    const adminUser = customUser || username || "admin@luxenary.id";

    try {
      await signIn("credentials", {
        callbackUrl: "/admin",
        email: adminUser,
        password: password || "admin123",
        portal: "ADMIN",
      });
    } catch (e) {
      console.error(e);
      setError("Kredensial administrator tidak valid atau gagal terhubung.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* High-security amber glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative z-10 text-white space-y-6">
        
        {/* Admin Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center font-bold text-xl text-white mx-auto mb-3 shadow-lg shadow-amber-600/20">
            🛡️
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            RESTRICTED ENTERPRISE ACCESS
          </span>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Luxenary Admin Console</h1>
          <p className="text-xs text-stone-400">Pusat kendali transaksi, manajemen lisensi klien &amp; sistem</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* 1-Click Fast SuperAdmin Access */}
        <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Superadmin 1-Click Access:</span>
            <span className="text-[10px] text-stone-500 font-mono">admin@luxenary.id</span>
          </div>
          <button
            type="button"
            onClick={() => handleAdminLogin("admin@luxenary.id")}
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            👑 {loading ? "Mengotentikasi Superadmin..." : "Masuk ke Admin Console (/admin)"}
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-800 w-full" />
          <span className="bg-stone-900 px-3 text-[10px] text-stone-500 font-bold uppercase tracking-widest absolute">atau masukkan kredensial</span>
        </div>

        {/* Credentials Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdminLogin();
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">Username / Email Admin</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@luxenary.id atau admin"
              className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">Password Keamanan</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-xl text-xs transition disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Memverifikasi Kredensial..." : "Otorisasi & Masuk ke Console"}
          </button>
        </form>

        <div className="text-center pt-2">
          <a href="/login" className="text-[11px] text-stone-500 hover:text-amber-400 transition">
            ← Pindah ke Portal Login Klien (Calon Pengantin)
          </a>
        </div>
      </div>
    </div>
  );
}
