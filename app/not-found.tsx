import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-sm p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-mono font-bold text-stone-600">
          404
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-stone-900">Halaman Tidak Ditemukan</h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            Tautan yang Anda buka mungkin telah dipindahkan, kedaluwarsa, atau alamatnya kurang tepat.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/demo"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition"
          >
            Lihat Katalog Tema
          </Link>
        </div>
      </div>
    </div>
  );
}
