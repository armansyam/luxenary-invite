import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { 
    platformName, 
    heroTagline,
    heroSubtitle,
    packages: pricingPackages,
    landingFeature1Title,
    landingFeature1Desc,
    landingFeature2Title,
    landingFeature2Desc,
    landingFeature3Title,
    landingFeature3Desc,
  } = await getPublicPlatformSettings();

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2d2c2a] flex flex-col selection:bg-amber-200 selection:text-amber-900 font-sans">
      {/* Header / Navbar — Minimalis & Sleek */}
      <header className="border-b border-[#eadecf]/70 bg-[#faf8f5]/85 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <BrandLogo size="sm" lightBg showName brandName={platformName} />

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/portfolio"
              className="text-xs sm:text-sm font-medium text-[#6e685f] hover:text-amber-900 transition"
            >
              Portofolio
            </Link>
            <Link
              href="/demo"
              className="text-xs sm:text-sm font-medium text-[#6e685f] hover:text-amber-900 transition hidden sm:inline-block"
            >
              Lihat Demo Tema
            </Link>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-amber-900 hover:text-amber-700 transition"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {/* Background Foto Utuh di Layer Belakang (Membentang Bebas Tanpa Terpotong Section) */}
        <div
          className="absolute top-0 inset-x-0 h-[1067px] bg-cover bg-top bg-no-repeat pointer-events-none -z-0"
          style={{
            backgroundImage: "url('/assets/homepage/homepage.webp')",
            backgroundPosition: "center top",
          }}
        >
          {/* Gradasi fade halus 10% di ujung paling bawah foto */}
          <div
            className="absolute inset-x-0 bottom-0 h-[10%]"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, #faf8f5 100%)",
            }}
          />
        </div>

        {/* Hero Section — Posisi teks tetap sama */}
        <section
          className="relative z-10 w-full"
          style={{ minHeight: "clamp(600px, 85vh, 95vh)" }}
        >
          {/* Content — posisi atas, foto terlihat penuh di bawah */}
          <div className="flex flex-col items-center justify-start text-center px-4 sm:px-6 pt-10 sm:pt-14 pb-0" style={{ minHeight: "clamp(600px, 85vh, 95vh)" }}>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-amber-800/20 bg-white/60 backdrop-blur-sm text-amber-900 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-5 sm:mb-6 shadow-sm max-w-[280px] sm:max-w-none text-center leading-snug">
              {platformName}
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif text-[#1e1c1a] leading-tight font-normal drop-shadow-sm max-w-4xl">
              {heroTagline}
            </h1>

            <p className="mt-6 text-sm sm:text-base md:text-lg text-[#6e685f] max-w-2xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>
          </div>
        </section>

        {/* Feature Cards Section — Posisi tetap, latar transparan agar sisa foto terlihat di belakang kartu */}
        <section className="relative z-10 bg-transparent max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">{landingFeature1Title}</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                {landingFeature1Desc}
              </p>
            </div>

            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">{landingFeature2Title}</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                {landingFeature2Desc}
              </p>
            </div>

            <div className="bg-white border border-[#eadecf] rounded-2xl p-8 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#1e1c1a] mb-2">{landingFeature3Title}</h3>
              <p className="text-[#6e685f] text-sm leading-relaxed">
                {landingFeature3Desc}
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section — 100% Dinamis dari Admin Setting */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#1e1c1a]">Pilihan Paket Undangan</h2>
            <p className="text-[#6e685f] mt-1 text-xs sm:text-sm">Biaya satu kali bayar untuk masa tayang interaktif 1 bulan pasca-acara, dengan arsip portofolio web 1 tahun</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                  pkg.isFeatured
                    ? "bg-[#fffdfa] border-2 border-amber-800/40 shadow-lg scale-[1.02]"
                    : "bg-white border border-[#eadecf] shadow-sm hover:shadow-md"
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {pkg.badge}
                  </div>
                )}

                <div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                    pkg.isFeatured ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700"
                  }`}>
                    {pkg.name}
                  </span>

                  <h3 className="text-xl font-serif font-bold text-[#1e1c1a] mt-4">{pkg.name}</h3>
                  <p className="text-xs text-[#6e685f] mt-1 line-clamp-2">{pkg.desc}</p>

                  <div className="my-5">
                    <span className="text-3xl font-bold text-[#1e1c1a]">
                      Rp {pkg.price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[#6e685f] text-xs"> / undangan</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#524d45]">
                    {pkg.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tombol dihapus agar user login terlebih dahulu melalui navbar atas */}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eadecf] bg-[#f4ede4] py-8 px-6 text-center text-xs text-[#7d756b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {platformName} — Platform Undangan Pernikahan Digital.</p>
          <div className="flex gap-6 text-[#524d45]">
            <Link href="/demo" className="hover:text-amber-900 transition">Demo Tema</Link>
            <Link href="/login" className="hover:text-amber-900 transition">Portal Klien</Link>
            <Link href="/admin/login" className="hover:text-amber-900 transition">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}