"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface PartnerInfo {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountName: string | null;
  commissionType: "NOMINAL" | "PERCENT";
  commissionValue: number;
  pendingBalance: number;
  totalPaidOut: number;
  totalEarned: number;
  totalTransactions: number;
}

interface PartnerCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "NOMINAL" | "PERCENT";
  discountValue: number;
  quotaLimit: number | null;
  usageCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

interface PartnerCommission {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  createdAt: string;
  order: {
    invoiceNumber: string | null;
    planType: string;
    amount: number;
    paidAt: string | null;
  } | null;
}

interface PartnerPayout {
  id: string;
  amount: number;
  expenseDate: string;
  paymentSource: string;
  referenceNumber: string | null;
  notes: string | null;
  hasReceipt: boolean;
}

function formatPaymentSource(source: string): string {
  switch (source) {
    case "E_WALLET":
      return "E-Wallet";
    case "TUNAI":
      return "Tunai";
    case "TRANSFER_BANK":
    default:
      return "Transfer Bank";
  }
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount || 0).toLocaleString("id-ID")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type PartnerAuthView = "login" | "activate" | "reset";

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

export default function PartnerPortalPage() {
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);

  // Auth state (Login Email+Password, Aktivasi Akun via OTP, Reset Sandi via OTP)
  const [authView, setAuthView] = useState<PartnerAuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<"EMAIL" | "VERIFY">("EMAIL");
  const [otpCode, setOtpCode] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const switchAuthView = (next: PartnerAuthView) => {
    setAuthView(next);
    setAuthError("");
    setAuthMessage("");
    setNeedsActivation(false);
    setOtpStep("EMAIL");
    setOtpCode("");
    setPassword("");
    setConfirmPassword("");
  };

  const loadDashboard = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/partner/dashboard", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setPartner(null);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setPartner(data.partner);
        setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
        setCommissions(Array.isArray(data.commissions) ? data.commissions : []);
        setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
      } else {
        setPartner(null);
      }
    } catch {
      setPartner(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setNeedsActivation(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/partner/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Email atau kata sandi mitra salah.");
        if (data.code === "PASSWORD_NOT_SET") {
          setNeedsActivation(true);
        }
        return;
      }
      setPassword("");
      await loadDashboard();
    } catch {
      setAuthError("Terjadi gangguan koneksi saat mencoba masuk.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setSubmitting(true);
    const purpose = authView === "reset" ? "PARTNER_RESET_PASSWORD" : "PARTNER_ACTIVATE";
    try {
      const res = await fetch("/api/partner/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Gagal mengirim kode OTP.");
        return;
      }
      setAuthMessage(
        data.message ||
          "Kode OTP 6 digit telah dikirim ke email Anda. Periksa kotak masuk (Inbox) atau folder Spam/Junk.",
      );
      setOtpStep("VERIFY");
    } catch {
      setAuthError("Terjadi gangguan koneksi saat mengirim kode OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    if (otpCode.length !== 6) {
      setAuthError("Masukkan 6 digit kode OTP dari email.");
      return;
    }
    if (password.length < 8) {
      setAuthError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    const purpose = authView === "reset" ? "PARTNER_RESET_PASSWORD" : "PARTNER_ACTIVATE";
    try {
      const res = await fetch("/api/partner/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
          password,
          purpose,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Gagal menyimpan kata sandi mitra.");
        return;
      }
      setOtpCode("");
      setPassword("");
      setConfirmPassword("");
      await loadDashboard();
    } catch {
      setAuthError("Terjadi gangguan koneksi saat memverifikasi OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/partner/auth/logout", { method: "POST" }).catch(() => {});
    setPartner(null);
    setCoupons([]);
    setCommissions([]);
    setPayouts([]);
    switchAuthView("login");
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((curr) => (curr === code ? null : curr)), 2000);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-medium">Memuat Portal Mitra...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
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
              Portal Mitra Afiliasi
            </p>
            <h1 className="text-2xl font-serif font-bold text-[#1e1c1a]">
              {authHeading}
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pantau performa kode kupon promo, akumulasi saldo komisi, dan riwayat pencairan secara mandiri.
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

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans">
      <header className="bg-white border-b border-[#eadecf]/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-stone-900 truncate">Portal Mitra Afiliasi</div>
              <div className="text-[11px] text-stone-500 truncate">{partner.name}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shrink-0"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Partner Summary Header */}
        <section className="bg-white rounded-2xl border border-[#eadecf] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Dashboard Baca-Saja</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1e1c1a]">
              {partner.name}
            </h1>
            <p className="text-xs text-stone-500">
              Skema Komisi:{" "}
              <strong className="text-stone-800">
                {partner.commissionType === "PERCENT"
                  ? `${partner.commissionValue}% per transaksi lunas`
                  : `${formatRupiah(partner.commissionValue)} per transaksi lunas`}
              </strong>
            </p>
          </div>

          <div className="px-4 py-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Rekening Pencairan Terdaftar
            </div>
            <div className="font-semibold text-stone-800">
              {partner.bankName ? `${partner.bankName} ${partner.accountNumberMasked || ""}` : "Belum diatur"}
            </div>
            {partner.accountName && (
              <div className="text-stone-500">a.n. {partner.accountName}</div>
            )}
          </div>
        </section>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Saldo Komisi Pending
            </div>
            <div className="text-2xl font-bold text-amber-800">
              {formatRupiah(partner.pendingBalance)}
            </div>
            <div className="text-[11px] text-stone-500">Menunggu pencairan oleh admin</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Sudah Cair
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatRupiah(partner.totalPaidOut)}
            </div>
            <div className="text-[11px] text-stone-500">Akumulasi komisi yang telah ditransfer</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Komisi Dihasilkan
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {formatRupiah(partner.totalEarned)}
            </div>
            <div className="text-[11px] text-stone-500">Sepanjang masa kemitraan</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#eadecf] p-5 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Transaksi Menggunakan Kupon
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {partner.totalTransactions}
            </div>
            <div className="text-[11px] text-stone-500">Order berstatus PAID</div>
          </div>
        </section>

        {/* Coupons List */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Kode Kupon Anda ({coupons.length})</h2>
              <p className="text-xs text-stone-500">
                Bagikan kode promo ini kepada calon klien untuk mendapatkan komisi otomatis saat order lunas.
              </p>
            </div>
          </div>

          {coupons.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              Belum ada kode kupon yang ditautkan ke akun mitra Anda. Hubungi admin untuk membuatkan kode promo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold tracking-wider text-stone-900">
                        {coupon.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          coupon.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {coupon.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      Diskon Klien:{" "}
                      <strong className="text-stone-900">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discountValue}%`
                          : formatRupiah(coupon.discountValue)}
                      </strong>
                      {" \u2022 "}
                      Terpakai: {coupon.usageCount}
                      {coupon.quotaLimit !== null ? ` / ${coupon.quotaLimit}` : ""}
                    </p>
                    {coupon.validUntil && (
                      <p className="text-[11px] text-stone-400">
                        Berlaku s.d. {formatDate(coupon.validUntil)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(coupon.code)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shrink-0"
                  >
                    {copiedCode === coupon.code ? "Tersalin" : "Salin"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payout & Transfer Proof History */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-bold text-stone-900">
              Riwayat Pencairan Dana ({payouts.length})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Daftar transfer komisi yang telah dicairkan beserta salinan bukti transfer dari admin.
            </p>
          </div>

          {payouts.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              Belum ada pencairan dana komisi yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Tanggal Cair</th>
                    <th className="py-3 px-4">Metode &amp; Referensi</th>
                    <th className="py-3 px-4 text-right">Nominal Diterima</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-right">Bukti Transfer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payouts.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.expenseDate)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">
                          {formatPaymentSource(item.paymentSource)}
                        </div>
                        {item.referenceNumber && (
                          <div className="text-[11px] font-mono text-stone-500">
                            Ref: {item.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate" title={item.notes || ""}>
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {item.hasReceipt ? (
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/api/partner/payouts/${item.id}/receipt`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Lihat Bukti
                            </a>
                            <a
                              href={`/api/partner/payouts/${item.id}/receipt?download=1`}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-semibold transition"
                            >
                              Unduh
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400">Tidak dilampirkan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Commission & Payout History */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-bold text-stone-900">
              Riwayat Komisi &amp; Pencairan ({commissions.length})
            </h2>
          </div>

          {commissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              Belum ada transaksi komisi tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Invoice / Paket</th>
                    <th className="py-3 px-4 text-right">Nilai Order</th>
                    <th className="py-3 px-4 text-right">Komisi Mitra</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tanggal Cair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {commissions.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-stone-900">
                          {item.order?.invoiceNumber || item.orderId.slice(0, 8)}
                        </div>
                        {item.order?.planType && (
                          <div className="text-[11px] text-stone-400">{item.order.planType}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {formatRupiah(item.orderAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-900 whitespace-nowrap">
                        {formatRupiah(item.commissionAmount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "PAID" ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                          {item.status === "PAID" ? "Sudah Cair" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
