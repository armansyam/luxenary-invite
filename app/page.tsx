import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Header / Navbar */}
      <header className="border-b border-amber-500/20 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💍</span>
            <span className="text-2xl font-bold tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent font-serif">
              LUXENARY INVITE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/demo"
              className="text-sm font-medium text-amber-300 hover:text-amber-200 transition hidden sm:inline-block"
            >
              Lihat Demo Live
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-full transition shadow-lg shadow-amber-500/20 text-sm"
            >
              Masuk / Buat Undangan
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 pt-20 pb-28 text-center max-w-5xl mx-auto overflow-hidden">
          {/* Subtle Glow Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold uppercase tracking-widest mb-6">
            <span>✨</span> Next-Gen Wedding Invitation Platform
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight font-serif text-white leading-tight">
            Undangan Pernikahan Digital <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              Eksklusif &amp; Self-Service
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Hadirkan momen terindah dengan tema mewah (Heritage, Moody, &amp; Premium Kila), custom subdomain, konfirmasi RSVP real-time, dan broadcast WhatsApp instan.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold text-base rounded-2xl transition shadow-xl shadow-amber-500/25 transform hover:-translate-y-0.5"
            >
              Mulai Buat Undangan Gratis
            </Link>
            <Link
              href="/demo"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-semibold text-base rounded-2xl transition"
            >
              Pratinjau Tema Kila ↗
            </Link>
          </div>
        </section>

        {/* Features Highlights */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/50 transition">
              <div className="text-3xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-white mb-2">Desain Kila &amp; Moody</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Visual sinematik dengan split layout desktop, video background, audio autoplay, dan scroll-snap yang mulus.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/50 transition">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Manajemen Tamu &amp; WA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate link undangan personal (`?to=Nama+Tamu`), kirim pesan WhatsApp otomatis, dan QR Check-in tamu.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/50 transition">
              <div className="text-3xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-white mb-2">Pembayaran Terintegrasi</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Aktivasi instan otomatis dengan Midtrans Snap &amp; iPaymu, mendukung QRIS, Virtual Account, dan E-Wallet.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Table */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">Pilihan Paket Undangan</h2>
            <p className="text-slate-400 mt-2 text-sm">Transparan, sekali bayar untuk selamanya tanpa biaya tersembunyi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Plan */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Basic Package
                </span>
                <h3 className="text-2xl font-bold text-white mt-4">Standard Series</h3>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">Rp 99.000</span>
                  <span className="text-slate-400 text-sm"> / undangan</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2">✓ URL Slug Eksklusif</li>
                  <li className="flex items-center gap-2">✓ Tema Heritage &amp; Moody</li>
                  <li className="flex items-center gap-2">✓ RSVP &amp; Buku Tamu Real-time</li>
                  <li className="flex items-center gap-2">✓ Amplop Digital &amp; Rekening</li>
                  <li className="flex items-center gap-2">✓ Unlimited Tamu Undangan</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-8 w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-center transition"
              >
                Pilih Basic
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-amber-500/10">
              <div className="absolute -top-3 right-8 bg-amber-500 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Paling Populer
              </div>
              <div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Premium Package
                </span>
                <h3 className="text-2xl font-bold text-white mt-4">All-Access Premium</h3>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-amber-400">Rp 199.000</span>
                  <span className="text-slate-400 text-sm"> / undangan</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2 text-amber-300">✓ Semua Fitur Basic Termasuk</li>
                  <li className="flex items-center gap-2">✓ <strong>Custom Subdomain</strong> (`nama.invited.id`)</li>
                  <li className="flex items-center gap-2">✓ Semua Tema (Kila, Ivanna, Danila)</li>
                  <li className="flex items-center gap-2">✓ Background Video &amp; HD Audio Player</li>
                  <li className="flex items-center gap-2">✓ Tanpa Watermark Platform</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-8 w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-center transition shadow-lg shadow-amber-500/30"
              >
                Pilih Premium
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 px-6 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Luxenary Invite — Platform Undangan Digital Eksklusif.</p>
          <div className="flex gap-6 text-slate-400">
            <Link href="/demo" className="hover:text-amber-400 transition">Demo Tema</Link>
            <Link href="/login" className="hover:text-amber-400 transition">Portal Klien</Link>
            <Link href="/admin" className="hover:text-amber-400 transition">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}