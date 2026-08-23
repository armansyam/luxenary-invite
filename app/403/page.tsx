import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-amber-600/30 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-500 mb-2 font-serif">403 - Akses Ditolak</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Halaman ini khusus untuk administrator platform. Akun Anda tidak memiliki hak akses administrator.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold rounded-xl transition text-sm"
          >
            Kembali ke Dashboard Klien
          </Link>
          <Link
            href="/"
            className="w-full py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl transition text-sm"
          >
            Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
