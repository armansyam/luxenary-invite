"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { EyeToggleIcon, type PartnerAuthView } from "@/components/partner/types";

export interface PartnerAuthScreenContext {
  authError: string;
  authMessage: string;
  authView: PartnerAuthView;
  confirmPassword: string;
  email: string;
  handlePasswordLogin: (e: FormEvent) => Promise<void>;
  handleRequestOtp: (e: FormEvent) => Promise<void>;
  handleSetPassword: (e: FormEvent) => Promise<void>;
  needsActivation: boolean;
  otpCode: string;
  otpStep: "EMAIL" | "VERIFY";
  partner: null;
  password: string;
  setAuthError: Dispatch<SetStateAction<string>>;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setOtpCode: Dispatch<SetStateAction<string>>;
  setOtpStep: Dispatch<SetStateAction<"EMAIL" | "VERIFY">>;
  setPassword: Dispatch<SetStateAction<string>>;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  showPassword: boolean;
  submitting: boolean;
  switchAuthView: (view: PartnerAuthView) => void;
}

export function PartnerAuthScreen({ ctx }: { ctx: PartnerAuthScreenContext }) {
  const {
    authError,
    authMessage,
    authView,
    confirmPassword,
    email,
    handlePasswordLogin,
    handleRequestOtp,
    handleSetPassword,
    needsActivation,
    otpCode,
    otpStep,
    partner,
    password,
    setAuthError,
    setConfirmPassword,
    setEmail,
    setOtpCode,
    setOtpStep,
    setPassword,
    setShowPassword,
    showPassword,
    submitting,
    switchAuthView,
  } = ctx;

    const authHeading =
      authView === "activate"
        ? "Aktivasi Akun Mitra"
        : authView === "reset"
          ? "Reset Kata Sandi Mitra"
          : "Masuk Portal Mitra";

    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#eadecf] shadow-sm p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1.5">
            <div className="flex justify-center">
              <BrandLogo size="md" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
              Portal Mitra
            </p>
            <h1 className="text-2xl font-serif font-bold text-[#1e1c1a]">
              {authHeading}
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Daftarkan akun klien pengantin, kirim tautan aktivasi 48 jam, dan nikmati potongan harga khusus mitra secara otomatis saat checkout.
            </p>
          </div>

          {authView !== "reset" && (
            <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => switchAuthView("login")}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  authView === "login" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => switchAuthView("activate")}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  authView === "activate" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Aktivasi Akun
              </button>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium space-y-2">
              <p>{authError}</p>
              {needsActivation && (
                <button
                  type="button"
                  onClick={() => switchAuthView("activate")}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-800 text-white text-[11px] font-bold hover:bg-amber-900 transition cursor-pointer"
                >
                  Aktivasi Akun Sekarang
                </button>
              )}
            </div>
          )}

          {authMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {authMessage}
            </div>
          )}

          {authView === "login" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="partner-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email Mitra Terdaftar
                </label>
                <input
                  id="partner-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mitra@domain.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="partner-password" className="text-xs font-bold text-stone-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => switchAuthView("reset")}
                    className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="partner-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="w-full py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Masuk ke Portal Mitra"}
              </button>
            </form>
          ) : otpStep === "EMAIL" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                {authView === "activate"
                  ? "Khusus mitra yang emailnya sudah didaftarkan admin. Kami akan mengirim kode OTP 6 digit untuk memverifikasi email dan membuat kata sandi pertama Anda."
                  : "Masukkan email mitra terdaftar. Kami akan mengirim kode OTP 6 digit untuk mengatur ulang kata sandi Anda."}
              </p>
              <div>
                <label htmlFor="partner-otp-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email Mitra Terdaftar
                </label>
                <input
                  id="partner-otp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mitra@domain.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? "Mengirim Kode..."
                  : authView === "activate"
                    ? "Kirim Kode Aktivasi (OTP)"
                    : "Kirim Kode Reset (OTP)"}
              </button>

              {authView === "reset" && (
                <button
                  type="button"
                  onClick={() => switchAuthView("login")}
                  className="w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Kembali ke halaman Masuk
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="partner-otp-code" className="text-xs font-bold text-stone-700">
                    Kode OTP 6 Digit
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("EMAIL");
                      setOtpCode("");
                      setAuthError("");
                    }}
                    className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                  >
                    Ganti Email
                  </button>
                </div>
                <input
                  id="partner-otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-center text-lg font-mono font-bold tracking-[0.4em] text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
                <p className="mt-1.5 text-[11px] text-stone-500 leading-relaxed text-center">
                  Belum menerima email kode OTP? Periksa folder <strong className="text-stone-700">Spam / Junk</strong> atau tab <strong className="text-stone-700">Promosi</strong>.
                </p>
              </div>

              <div>
                <label htmlFor="partner-new-password" className="block text-xs font-bold text-stone-700 mb-1">
                  {authView === "activate" ? "Buat Kata Sandi" : "Kata Sandi Baru"}{" "}
                  <span className="font-normal text-stone-400">(min. 8 karakter)</span>
                </label>
                <div className="relative">
                  <input
                    id="partner-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="partner-confirm-password" className="block text-xs font-bold text-stone-700 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <input
                  id="partner-confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6 || !password || !confirmPassword}
                className="w-full py-3 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? "Menyimpan..."
                  : authView === "activate"
                    ? "Aktifkan & Masuk Portal"
                    : "Simpan Kata Sandi & Masuk"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleRequestOtp}
                className="w-full py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Kirim Ulang Kode OTP
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <Link href="/login" className="hover:text-stone-900 underline">
              Login Klien Undangan
            </Link>
            <Link href="/" className="hover:text-stone-900 underline">
              Beranda
            </Link>
          </div>
        </div>
      </div>
    );
}
