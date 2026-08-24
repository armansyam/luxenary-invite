import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2d2c2a] flex flex-col selection:bg-amber-200 selection:text-amber-900 font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-[#eadecf] bg-[#faf8f5]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-white font-bold font-serif text-xl shadow-md shadow-amber-900/10">
              L
            </div>
            <span className="text-xl font-bold tracking-wider text-amber-900 font-serif">
              LUXENARY INVITE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/demo"
              className="text-sm font-medium text-[#6e685f] hover:text-amber-900 transition hidden sm:inline-block"
            >
              Lihat Demo Tema
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-full transition shadow-sm text-sm"
            >
              Pilih Paket
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section
          className="relative w-full overflow-hidden"
          style={{ minHeight: "85vh" }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/homepage.webp')",
              backgroundPosition: "center 30%",
            }}
          />

          {/* Gradient fade bottom — transparent to page bg */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "45%",
              background:
                "linear-gradient(to bottom, transparent 0%, #faf8f5cc 55%, #faf8f5 100%)",
            }}
          />

          {/* Content — posisi atas, foto terlihat penuh di bawah */}
          <div className="relative z-10 flex flex-col items-center justify-start text-center px-6 pt-14 pb-0 min-h-[85vh]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-800/20 bg-white/60 backdrop-blur-sm text-amber-900 text-xs font-semibold uppercase tracking-widest mb-6 shadow-sm">
              Platform Undangan Pernikahan Digital Mandiri
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-[#1e1c1a] leading-tight font-normal drop-shadow-sm">
              Undangan Pernikahan Digital <br />
              <span className="italic text-amber-800 font-serif">
                Elegan, Hangat &amp; Berkelas
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#6e685f] max-w-2xl mx-auto leading-relaxed">
              Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-base rounded-full transition shadow-md shadow-amber-900/10"
              >
                Pilih Paket Undangan
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white border border-[#d8cdbf] text-amber-900 font-semibold text-base rounded-full transition shadow-sm"
              >
                Pratinjau Tema Live
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">Desain Kalandra &amp; Prameswari</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                Estetika natural dengan split view desktop, transisi foto section overlap, audio player autoplay, dan CSS scroll snap mulus.
              </p>
            </div>

            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">Manajemen Tamu &amp; WhatsApp</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                Kirim tautan personal via WhatsApp 1-klik, validasi RSVP interaktif, dan check-in barcode kehadiran fisik di lokasi.
              </p>
            </div>

            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">Video Wishes Booth</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                Tamu dapat memindai barcode di lokasi pesta untuk langsung merekam video ucapan doa restu yang tersimpan otomatis ke cloud.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-normal text-[#1e1c1a]">Pilihan Paket Undangan</h2>
            <p className="text-[#6e685f] mt-1 text-sm">Biaya satu kali bayar untuk masa aktif selamanya</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <div className="bg-white border border-[#eadecf] rounded-3xl p-8 flex flex-col justify-between shadow-sm">
              <div>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Basic Package
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1e1c1a] mt-4">Standard Series</h3>
                <div className="my-4">
                  <span className="text-3xl font-bold text-[#1e1c1a]">Rp 99.000</span>
                  <span className="text-[#6e685f] text-xs"> / undangan</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#524d45]">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    URL Path Slug Eksklusif
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Tema Heritage Aruna &amp; Moody Papercut
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    RSVP &amp; Buku Doa Tamu Real-time
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Amplop Digital &amp; Nomor Rekening
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Unlimited Nama Tamu Undangan
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-8 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-full text-center transition text-sm"
              >
                Pilih Basic
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-[#fffdfa] border-2 border-amber-800/40 rounded-3xl p-8 flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3 right-6 bg-amber-800 text-white text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                Paling Favorit
              </div>
              <div>
                <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Premium Package
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1e1c1a] mt-4">All-Access Premium</h3>
                <div className="my-4">
                  <span className="text-3xl font-bold text-amber-900">Rp 199.000</span>
                  <span className="text-[#6e685f] text-xs"> / undangan</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#524d45]">
                  <li className="flex items-center gap-2 font-medium text-amber-900">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Semua Fitur Basic Termasuk
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Custom Subdomain (nama.domain.com)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Semua Seri Tema (Kila, Ivanna, Danila)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Video Background &amp; HD Audio Player
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Bebas Watermark Platform
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Akses Video Wishes Booth On-Site
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-8 w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-full text-center transition text-sm shadow-sm"
              >
                Pilih Premium
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eadecf] bg-[#f4ede4] py-8 px-6 text-center text-xs text-[#7d756b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Luxenary Invite — Platform Undangan Pernikahan Digital.</p>
          <div className="flex gap-6 text-[#524d45]">
            <Link href="/demo" className="hover:text-amber-900 transition">Demo Tema</Link>
            <Link href="/login" className="hover:text-amber-900 transition">Portal Klien</Link>
            <Link href="/admin" className="hover:text-amber-900 transition">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}