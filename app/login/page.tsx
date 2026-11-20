"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { safeInternalCallbackUrl } from "@/lib/safeUrl";

interface ServiceStatus {
  mode: "OPEN" | "CLOSED_ORDER" | "MAINTENANCE" | "COMING_SOON";
  isOpen: boolean;
  title: string;
  message: string;
  reopenDate?: string;
  contactWa?: string;
}

type AuthView = "login" | "register" | "reset";

function EyeToggleIcon({ shown }: { shown: boolean }) {
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

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginForm({ platformName, serviceStatus }: { platformName: string; serviceStatus: ServiceStatus | null }) {
  const [view, setView] = useState<AuthView>("login");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state (OTP verification before account creation)
  const [regStep, setRegStep] = useState<"form" | "otp">("form");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regCode, setRegCode] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  // Reset password state (OTP verification)
  const [resetStep, setResetStep] = useState<"email" | "verify">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const callbackUrl = safeInternalCallbackUrl(searchParams.get("callbackUrl"), "/onboarding");
  const authError = searchParams.get("error");
  const isRegistrationClosedError = authError === "RegistrationClosed";
  const isEmailNotVerifiedError = authError === "EmailNotVerified";

  const switchView = (next: AuthView) => {
    setView(next);
    setErrorMsg(null);
    setNoticeMsg(null);
    if (next === "register") {
      setRegStep("form");
      setRegCode("");
    }
    if (next === "reset") {
      setResetStep("email");
      setResetCode("");
      if (!resetEmail && loginEmail) setResetEmail(loginEmail);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    signIn("google", { callbackUrl });
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await signIn("credentials", {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        portal: "CLIENT_PASSWORD",
        redirect: false,
      });
      if (res?.error) {
        setErrorMsg(
          "Email atau kata sandi salah. Jika akun Anda terdaftar lewat Google, silakan masuk dengan Google atau klik Lupa kata sandi untuk membuat kata sandi.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setErrorMsg("Kesalahan jaringan saat mencoba masuk.");
      setSubmitting(false);
    }
  };

  const handleRequestRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setNoticeMsg(null);

    if (regName.trim().length < 2) {
      setErrorMsg("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    if (regPassword !== regConfirm) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail.trim(), purpose: "CLIENT_REGISTER" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.error || "Gagal mengirim kode verifikasi ke email Anda.");
      } else {
        setRegStep("otp");
        setNoticeMsg(
          data.message ||
            "Kode OTP 6 digit telah dikirim ke email Anda. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
        );
      }
    } catch {
      setErrorMsg("Kesalahan jaringan saat mengirim kode verifikasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = regCode.replace(/\D/g, "");
    if (cleanCode.length !== 6 || submitting) {
      setErrorMsg("Masukkan 6 digit kode OTP dari email.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.error || "Pendaftaran gagal. Periksa kode OTP Anda.");
        setSubmitting(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        portal: "CLIENT_PASSWORD",
        redirect: false,
      });
      if (signInRes?.error) {
        switchView("login");
        setLoginEmail(regEmail.trim().toLowerCase());
        setNoticeMsg("Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi Anda.");
        setSubmitting(false);
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setErrorMsg("Kesalahan jaringan saat menyelesaikan pendaftaran.");
      setSubmitting(false);
    }
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim(), purpose: "CLIENT_RESET_PASSWORD" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.error || "Gagal mengirim kode reset kata sandi.");
      } else {
        setResetStep("verify");
        setNoticeMsg(
          data.message ||
            "Jika email terdaftar, kode verifikasi 6 digit telah dikirim. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
        );
      }
    } catch {
      setErrorMsg("Kesalahan jaringan saat mengirim kode reset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = resetCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMsg("Masukkan 6 digit kode OTP dari email.");
      return;
    }
    if (resetPassword.length < 8) {
      setErrorMsg("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setErrorMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          code: cleanCode,
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data?.error || "Gagal mengatur ulang kata sandi.");
        setSubmitting(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: resetEmail.trim().toLowerCase(),
        password: resetPassword,
        portal: "CLIENT_PASSWORD",
        redirect: false,
      });
      if (signInRes?.error) {
        switchView("login");
        setLoginEmail(resetEmail.trim().toLowerCase());
        setNoticeMsg("Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.");
        setSubmitting(false);
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setErrorMsg("Kesalahan jaringan saat menyimpan kata sandi baru.");
      setSubmitting(false);
    }
  };

  const isClosed = serviceStatus && !serviceStatus.isOpen;
  const headingTitle =
    view === "register" ? "Daftar Akun Baru" : view === "reset" ? "Atur Ulang Kata Sandi" : "Masuk Akun";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-700/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-amber-900/10 rounded-3xl p-7 sm:p-9 shadow-xl relative z-10 text-stone-900 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link
            href="/"
            title="Kembali ke Beranda"
            className="inline-flex flex-col items-center group cursor-pointer transition select-none"
          >
            <div className="flex justify-center group-hover:scale-105 transition-transform duration-200">
              <BrandLogo size="lg" lightBg brandName={platformName} />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 block mt-2 group-hover:text-amber-800 transition-colors">
              {platformName}
            </span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-stone-900">{headingTitle}</h1>
          <p className="text-xs text-stone-400 leading-relaxed">
            Kelola undangan, buku tamu, galeri foto, dan pengiriman via WhatsApp dari satu tempat.
          </p>
        </div>

        {/* Mode Switcher: Masuk | Daftar Akun */}
        {view !== "reset" && (
          <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => switchView("login")}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                view === "login" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchView("register")}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                view === "register" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Daftar Akun
            </button>
          </div>
        )}

        {/* Dynamic Service Status Notice */}
        {isClosed && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            serviceStatus.mode === "CLOSED_ORDER"
              ? "bg-amber-50/80 border-amber-200/80 text-amber-950"
              : serviceStatus.mode === "MAINTENANCE"
              ? "bg-rose-50/80 border-rose-200/80 text-rose-950"
              : "bg-stone-50 border-stone-200 text-stone-900"
          }`}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                serviceStatus.mode === "CLOSED_ORDER" ? "bg-amber-600" :
                serviceStatus.mode === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
              }`} />
              <span>{serviceStatus.title}</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-normal">
              {serviceStatus.message}
            </p>
            {serviceStatus.reopenDate && (
              <p className="text-[11px] font-medium text-amber-900/80">
                Estimasi dibuka kembali: <span className="font-bold">{serviceStatus.reopenDate}</span>
              </p>
            )}
            <div className="pt-1.5 border-t border-amber-900/10 text-[11px] text-stone-500 flex items-center justify-between">
              <span>Akun terdaftar tetap bisa login.</span>
              {serviceStatus.contactWa && (
                <a
                  href={`https://wa.me/${serviceStatus.contactWa.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-amber-800 hover:underline"
                >
                  Hubungi Admin
                </a>
              )}
            </div>
          </div>
        )}

        {isRegistrationClosedError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Pendaftaran Akun Baru Ditutup</span>
            </div>
            <p className="text-rose-800 leading-relaxed text-[11px]">
              Email yang Anda gunakan belum terdaftar di sistem kami. Saat ini pendaftaran akun baru sedang ditutup sementara.
            </p>
          </div>
        )}

        {isEmailNotVerifiedError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Email Akun Google Belum Terverifikasi</span>
            </div>
            <p className="text-rose-800 leading-relaxed text-[11px]">
              Akun Google yang dipilih belum memiliki alamat email terverifikasi. Gunakan akun Google lain atau daftar menggunakan email.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}
        {noticeMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
            {noticeMsg}
          </div>
        )}

        {/* TAB 1: MASUK (Google + Email & Password) */}
        {view === "login" && (
          <div className="space-y-4">
            <button
              id="btn-google-login"
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || submitting}
              className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-bold transition shadow-lg shadow-stone-950/15 cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>{googleLoading ? "Menghubungkan..." : "Masuk dengan Akun Google"}</span>
            </button>

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-stone-200" />
              <span className="shrink-0 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                atau masuk dengan email
              </span>
              <div className="flex-grow border-t border-stone-200" />
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label htmlFor="login-email-input" className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Email
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password-input" className="text-xs font-semibold text-stone-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView("reset")}
                    className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showLoginPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    aria-label={showLoginPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowLoginPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showLoginPw} />
                  </button>
                </div>
              </div>

              <button
                id="btn-password-login"
                type="submit"
                disabled={submitting || !loginEmail.trim() || !loginPassword}
                className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: DAFTAR AKUN (Google OAuth Langsung atau Email + Verifikasi OTP) */}
        {view === "register" && (
          <div className="space-y-4">
            {regStep === "form" ? (
              <div className="space-y-4">
                <button
                  id="btn-google-register"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || submitting || Boolean(isClosed)}
                  className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex items-center justify-center gap-3 text-sm font-bold transition shadow-lg shadow-stone-950/15 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {googleLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{googleLoading ? "Menghubungkan..." : "Daftar dengan Akun Google"}</span>
                </button>

                <div className="relative flex items-center py-0.5">
                  <div className="flex-grow border-t border-stone-200" />
                  <span className="shrink-0 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    atau daftar dengan email
                  </span>
                  <div className="flex-grow border-t border-stone-200" />
                </div>

                <form onSubmit={handleRequestRegisterOtp} className="space-y-3">
                  <div>
                    <label htmlFor="reg-name-input" className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      id="reg-name-input"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-email-input" className="block text-xs font-semibold text-stone-700 mb-1">
                      Alamat Email
                    </label>
                    <input
                      id="reg-email-input"
                      type="email"
                      autoComplete="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-password-input" className="block text-xs font-semibold text-stone-700 mb-1">
                      Kata Sandi <span className="font-normal text-stone-400">(minimal 8 karakter)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password-input"
                        type={showRegPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={72}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Buat kata sandi"
                        className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        aria-label={showRegPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        onClick={() => setShowRegPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <EyeToggleIcon shown={showRegPw} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reg-confirm-input" className="block text-xs font-semibold text-stone-700 mb-1">
                      Konfirmasi Kata Sandi
                    </label>
                    <input
                      id="reg-confirm-input"
                      type={showRegPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                    />
                  </div>
                  <button
                    id="btn-register-otp"
                    type="submit"
                    disabled={submitting || Boolean(isClosed) || !regName.trim() || !regEmail.trim() || !regPassword || !regConfirm}
                    className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Mengirim Kode Verifikasi..." : "Daftar & Kirim Kode OTP"}
                  </button>
                  <p className="text-center text-[11px] text-stone-400 leading-relaxed">
                    Kode OTP 6 digit dikirim sekali saat pendaftaran untuk memverifikasi kepemilikan email Anda. Periksa kotak masuk (Inbox) atau folder Spam/Junk.
                  </p>
                </form>
              </div>
            ) : (
              <form onSubmit={handleCompleteRegister} className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Email: <strong className="text-stone-800">{regEmail}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep("form");
                      setRegCode("");
                      setErrorMsg(null);
                    }}
                    className="text-amber-800 font-semibold hover:underline cursor-pointer"
                  >
                    Ubah data
                  </button>
                </div>
                <input
                  id="reg-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Masukkan 6 digit kode OTP"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/60 text-center font-mono text-lg tracking-[0.4em] text-stone-900 placeholder:text-stone-400 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                />
                <p className="text-[11px] text-stone-500 leading-relaxed text-center">
                  Belum menemukan email kode OTP di kotak masuk? Periksa folder <strong className="text-stone-700">Spam / Junk</strong> atau tab <strong className="text-stone-700">Promosi</strong>.
                </p>
                <button
                  id="btn-verify-register"
                  type="submit"
                  disabled={submitting || regCode.length !== 6}
                  className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Membuat Akun..." : "Verifikasi & Buat Akun"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRequestRegisterOtp}
                  className="w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Kirim Ulang Kode OTP
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE 3: LUPA KATA SANDI (Reset via OTP 6 digit) */}
        {view === "reset" && (
          <div className="space-y-4">
            {resetStep === "email" ? (
              <form onSubmit={handleRequestResetOtp} className="space-y-3">
                <p className="text-xs text-stone-500 leading-relaxed">
                  Masukkan alamat email akun Anda. Kami akan mengirimkan kode OTP 6 digit untuk membuat kata sandi baru.
                </p>
                <input
                  id="reset-email-input"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                />
                <button
                  id="btn-reset-otp"
                  type="submit"
                  disabled={submitting || !resetEmail.trim()}
                  className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Mengirim Kode..." : "Kirim Kode Verifikasi"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Email: <strong className="text-stone-800">{resetEmail}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep("email");
                      setResetCode("");
                      setErrorMsg(null);
                    }}
                    className="text-amber-800 font-semibold hover:underline cursor-pointer"
                  >
                    Ganti email
                  </button>
                </div>
                <input
                  id="reset-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Masukkan 6 digit kode OTP"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/60 text-center font-mono text-lg tracking-[0.4em] text-stone-900 placeholder:text-stone-400 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-amber-700 focus:bg-white"
                />
                <p className="text-[11px] text-stone-500 leading-relaxed text-center">
                  Belum menemukan email kode OTP di kotak masuk? Periksa folder <strong className="text-stone-700">Spam / Junk</strong> atau tab <strong className="text-stone-700">Promosi</strong>.
                </p>
                <div className="relative">
                  <input
                    id="reset-password-input"
                    type={showResetPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Kata sandi baru (min. 8 karakter)"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    aria-label={showResetPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowResetPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <EyeToggleIcon shown={showResetPw} />
                  </button>
                </div>
                <input
                  id="reset-confirm-input"
                  type={showResetPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Konfirmasi kata sandi baru"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition"
                />
                <button
                  id="btn-confirm-reset"
                  type="submit"
                  disabled={submitting || resetCode.length !== 6 || !resetPassword || !resetConfirm}
                  className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Kata Sandi & Masuk"}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => switchView("login")}
              className="w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Kembali ke halaman Masuk
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-4">
          <Link href="/" className="hover:text-stone-700 transition">
            Beranda
          </Link>
          <Link href="/demo" className="hover:text-stone-700 transition">
            Lihat Demo Tema
          </Link>
          <Link href="/partner" className="hover:text-stone-700 transition">
            Portal Mitra
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  const [platformName, setPlatformName] = useState("");
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  
  useEffect(() => {
    fetch("/api/public/settings", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        const name = data.platformName || "Sistem Undangan";
        setPlatformName(name);
        if (data.serviceStatus) {
          setServiceStatus(data.serviceStatus);
        }
        document.title = `Masuk Akun | ${name}`;
      })
      .catch(() => {});
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf7f2] flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div></div>}>
      <LoginForm platformName={platformName} serviceStatus={serviceStatus} />
    </Suspense>
  );
}