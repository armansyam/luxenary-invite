"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Silakan masukkan alamat email Anda.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await signIn("credentials", {
        callbackUrl: "/dashboard",
        email: email.trim(),
        password: "password123",
        portal: "CLIENT",
      });
    } catch (e) {
      console.error(e);
      setError("Gagal masuk ke studio. Silakan periksa kembali email Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4 py-12 relative overflow-hidden font-sans">
      {/* Warm ambient wedding glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-700/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-amber-900/10 rounded-3xl p-8 sm:p-10 shadow-xl relative z-10 text-stone-900 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center font-serif text-3xl font-bold text-white mx-auto mb-3 shadow-lg shadow-amber-800/25">
            L
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Luxenary Wedding Studio</span>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Masuk ke Studio Undangan</h1>
          <p className="text-xs text-stone-500">Kelola desain, multi-acara, buku tamu, dan foto pre-wedding Anda</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Primary: Google OAuth Login */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl flex items-center justify-center gap-3 text-xs font-bold transition shadow-md shadow-stone-950/20 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Masuk dengan Akun Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 w-full" />
          <span className="bg-white px-3 text-[11px] text-stone-400 font-medium uppercase tracking-wider absolute">atau dengan email</span>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1.5">Alamat Email Terdaftar</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memproses..." : "Masuk dengan Email"}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center pt-2">
          <p className="text-xs text-stone-500">
            Belum memiliki paket undangan?{" "}
            <a href="/register" className="text-amber-800 font-bold hover:underline">
              Pilih Paket Undangan →
            </a>
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-between pt-4 text-[11px] text-stone-400 border-t border-stone-100">
          <a href="/demo" className="hover:text-stone-700 transition">
            ← Showroom Tema Demo
          </a>
          <a href="/admin/login" className="hover:text-stone-700 transition">
            Portal Admin
          </a>
        </div>
      </div>
    </div>
  );
}