"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    document.title = "Admin Login — Luxenary";
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.platformName) {
          document.title = `Admin Login — ${data.platformName}`;
        }
      })
      .catch(() => {});
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username/email dan password administrator wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: username.trim().toLowerCase(),
        password: password.trim(),
        portal: "ADMIN",
      });

      if (res?.error || !res?.ok) {
        setError("Kredensial administrator salah atau akses ditolak. Periksa kembali username dan password.");
        setLoading(false);
      } else {
        router.replace("/admin");
      }
    } catch (e) {
      console.error(e);
      setError("Gagal terhubung ke server otorisasi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4 py-12 relative overflow-hidden font-sans">
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
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Admin Console</h1>
          <p className="text-xs text-stone-400">Pusat kendali transaksi, manajemen paket &amp; pengaturan sistem</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form id="form-admin-login" onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-[11px] font-bold text-stone-300 mb-1.5">
              Username / Email Admin
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@platformanda.com"
              autoComplete="username"
              className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono placeholder:text-stone-600"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-[11px] font-bold text-stone-300 mb-1.5">
              Password Keamanan
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono placeholder:text-stone-600 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition"
                tabIndex={-1}
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="btn-admin-login"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-amber-950/40 disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Kredensial...</span>
              </>
            ) : (
              "Otorisasi & Masuk ke Console"
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[11px] text-stone-600 border-t border-stone-800/60 pt-4">
          <p>Akses ini dilindungi oleh otentikasi terenkripsi.</p>
        </div>
      </div>
    </div>
  );
}
