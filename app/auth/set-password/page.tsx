"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

interface TokenInspectionValid {
  status: "VALID";
  tokenId: string;
  userId: string;
  clientName: string;
  emailMasked: string;
  partnerName: string | null;
  expiresAt: string;
}

interface TokenInspectionEnded {
  status: "USED" | "EXPIRED";
  clientName: string;
  partnerName: string | null;
}

interface TokenInspectionInvalid {
  status: "INVALID";
}

type TokenInspection = TokenInspectionValid | TokenInspectionEnded | TokenInspectionInvalid;

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

function formatExpiryWib(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;
}

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [inspection, setInspection] = useState<TokenInspection | null>(null);
  const [platformName, setPlatformName] = useState("Luxvite");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setChecking(true);
      try {
        const [settingsRes, inspectRes] = await Promise.all([
          fetch("/api/public/settings", { cache: "no-store" }).catch(() => null),
          token
            ? fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`, { cache: "no-store" })
            : Promise.resolve(null),
        ]);

        if (active && settingsRes && settingsRes.ok) {
          const s = await settingsRes.json().catch(() => ({}));
          if (s?.platformName) setPlatformName(s.platformName);
        }

        if (!token || !inspectRes || !inspectRes.ok) {
          if (active) setInspection({ status: "INVALID" });
          return;
        }

        const data = (await inspectRes.json()) as TokenInspection;
        if (active) setInspection(data);
      } catch {
        if (active) setInspection({ status: "INVALID" });
      } finally {
        if (active) setChecking(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password.length > 72) {
      setError("Kata sandi maksimal 72 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Gagal mengaktifkan akun. Silakan coba lagi.");
        if (data.reason === "EXPIRED" || data.reason === "USED") {
          setInspection((prev) =>
            prev && "clientName" in prev
              ? { status: data.reason, clientName: prev.clientName, partnerName: prev.partnerName }
              : { status: "INVALID" },
          );
        }
        return;
      }

      setActivatedSuccess(true);

      // Auto-login langsung ke sesi klien lalu arahkan ke /onboarding
      const loginRes = await signIn("credentials", {
        email: data.email,
        password,
        portal: "CLIENT_PASSWORD",
        redirect: false,
      });

      if (loginRes && !loginRes.error) {
        router.replace("/onboarding");
        return;
      }

      // Fallback aman bila auto-login gagal: arahkan user klik masuk manual
      setError("");
    } catch {
      setError("Terjadi gangguan koneksi. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-medium">Memverifikasi tautan aktivasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#eadecf] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="md" />
          </div>

          {inspection && "partnerName" in inspection && inspection.partnerName ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold uppercase tracking-wider text-amber-900">
              <span>{inspection.partnerName}</span>
              <span className="text-amber-500">&times;</span>
              <span>{platformName}</span>
            </div>
          ) : (
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
              Aktivasi Akun {platformName}
            </p>
          )}
        </div>

        {activatedSuccess ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-serif font-bold text-[#1e1c1a]">Akun Anda Sudah Aktif</h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Kata sandi berhasil disimpan. Mengarahkan Anda ke studio persiapan undangan...
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition"
            >
              Lanjut ke Studio Undangan &rarr;
            </Link>
          </div>
        ) : inspection?.status === "VALID" ? (
          <>
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-serif font-bold text-[#1e1c1a]">
                Halo, {inspection.clientName}
              </h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Buat kata sandi pribadi Anda untuk mengaktifkan akun undangan digital dan mulai memilih tema.
              </p>
              <div className="pt-1 flex flex-col items-center gap-1">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-stone-100 text-stone-700 font-mono text-xs font-semibold">
                  {inspection.emailMasked}
                </span>
                <span className="text-[11px] text-stone-400">
                  Tautan berlaku s.d. {formatExpiryWib(inspection.expiresAt)}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  >
                    <EyeIcon shown={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Konfirmasi Kata Sandi
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-base sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                {submitting ? "Mengaktifkan Akun..." : "Aktifkan Akun & Mulai Sekarang"}
              </button>
            </form>

            {inspection.partnerName && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed text-center">
                Harga khusus dari <strong>{inspection.partnerName}</strong> akan diterapkan otomatis saat Anda melakukan aktivasi paket.
              </div>
            )}
          </>
        ) : inspection?.status === "USED" ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-serif font-bold text-[#1e1c1a]">Tautan Sudah Digunakan</h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Akun atas nama <strong>{inspection.clientName}</strong> sudah pernah diaktifkan sebelumnya. Silakan masuk menggunakan email dan kata sandi Anda.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition"
            >
              Masuk ke Halaman Login
            </Link>
          </div>
        ) : inspection?.status === "EXPIRED" ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-serif font-bold text-[#1e1c1a]">Tautan Aktivasi Kedaluwarsa</h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Demi keamanan akun, tautan aktivasi hanya berlaku 48 jam. Silakan hubungi{" "}
                <strong>{inspection.partnerName || "Mitra WO Anda"}</strong> agar mengirim ulang tautan aktivasi terbaru.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition"
            >
              Kembali ke Halaman Login
            </Link>
          </div>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-serif font-bold text-[#1e1c1a]">Tautan Tidak Valid</h1>
              <p className="text-xs text-stone-500 leading-relaxed">
                Tautan aktivasi tidak ditemukan atau sudah digantikan dengan tautan baru. Pastikan Anda membuka tautan terakhir dari email atau WhatsApp Mitra WO Anda.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition"
            >
              Ke Halaman Login
            </Link>
          </div>
        )}

        <div className="pt-2 border-t border-stone-100 text-center">
          <Link href="/" className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 transition">
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
