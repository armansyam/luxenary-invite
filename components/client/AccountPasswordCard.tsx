"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

function EyeIcon({ shown }: { shown: boolean }) {
  return shown ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M9.88 5.09A10.45 10.45 0 0112 4.8c5 0 9.27 3.11 10.5 7.2a10.6 10.6 0 01-4.16 5.47M6.61 6.61A10.55 10.55 0 001.5 12c1.23 4.09 5.5 7.2 10.5 7.2 1.66 0 3.24-.34 4.66-.96" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function AccountPasswordCard() {
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading");
  const [email, setEmail] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/client/account/password", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setStatus("hidden");
          return;
        }
        const data = await res.json();
        if (!active || !data?.success) {
          setStatus("hidden");
          return;
        }
        setEmail(data.email || "");
        setHasPassword(Boolean(data.hasPassword));
        setHasGoogle(Boolean(data.hasGoogle));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("hidden");
      });
    return () => {
      active = false;
    };
  }, []);

  if (status !== "ready") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (hasPassword && !currentPassword) {
      setErrorMsg("Masukkan kata sandi saat ini terlebih dahulu.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/client/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || "Gagal memperbarui kata sandi.");
        setSaving(false);
        return;
      }

      // Perbarui token sesi JWT pada perangkat ini agar tetap aktif saat pwdTag berubah
      if (data.email) {
        await signIn("credentials", {
          email: data.email,
          password: newPassword,
          portal: "CLIENT_PASSWORD",
          redirect: false,
        }).catch(() => {});
      }

      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg(data.message || "Kata sandi berhasil diperbarui.");
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat menyimpan kata sandi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#eadecf] shadow-xs p-5 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-stone-900">
              {hasPassword ? "Ubah Kata Sandi Akun" : "Buat Kata Sandi Akun"}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
              {hasPassword
                ? "Perbarui kata sandi akun Anda secara berkala. Perubahan kata sandi otomatis mengakhiri sesi pada perangkat lain."
                : "Akun Anda saat ini masuk melalui Google. Buat kata sandi agar dapat juga masuk menggunakan email dan kata sandi."}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-[11px] font-medium text-stone-600 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-full shrink-0 self-start">
          <span className={`w-1.5 h-1.5 rounded-full ${hasPassword ? "bg-emerald-600" : "bg-amber-600"}`} />
          <span>{hasPassword ? (hasGoogle ? "Google & Sandi" : "Email & Sandi") : "Khusus Google"}</span>
        </div>
      </div>

      {email && (
        <div className="text-xs text-stone-500">
          Email akun: <span className="font-semibold text-stone-800">{email}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 max-w-lg">
        {hasPassword && (
          <div>
            <label htmlFor="settings-current-password" className="block text-xs font-semibold text-stone-700 mb-1">
              Kata Sandi Saat Ini
            </label>
            <input
              id="settings-current-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan kata sandi saat ini"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="settings-new-password" className="block text-xs font-semibold text-stone-700 mb-1">
              Kata Sandi Baru <span className="font-normal text-stone-400">(min. 8 karakter)</span>
            </label>
            <div className="relative">
              <input
                id="settings-new-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition"
              />
              <button
                type="button"
                aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <EyeIcon shown={showPw} />
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="settings-confirm-password" className="block text-xs font-semibold text-stone-700 mb-1">
              Konfirmasi Kata Sandi
            </label>
            <input
              id="settings-confirm-password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            id="btn-save-account-password"
            type="submit"
            disabled={saving || !newPassword || !confirmPassword || (hasPassword && !currentPassword)}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Menyimpan..." : hasPassword ? "Simpan Kata Sandi Baru" : "Buat Kata Sandi"}
          </button>
        </div>
      </form>
    </div>
  );
}
