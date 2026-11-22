"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error?.digest || error?.message || "Unexpected root error");
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center p-6 font-sans antialiased">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-sm p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-stone-900">Layanan Sedang Memulihkan Diri</h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Terjadi kesalahan tidak terduga pada halaman utama. Silakan muat ulang atau kembali beberapa saat lagi.
            </p>
            {error?.digest && (
              <p className="text-[11px] font-mono text-stone-400 pt-1">
                Kode referensi: {error.digest}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Muat Ulang
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition"
            >
              Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
