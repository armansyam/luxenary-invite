import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { HowItWorksInteractive } from "./HowItWorksInteractive";
import "../landing.css";

export const revalidate = 86400; // Cache 24 jam (ISR)

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  const brandName = settings.platformName || "Luxenary";
  return {
    title: `Cara Kerja Studio Mandiri — ${brandName}`,
    description: `Pelajari betapa mudah dan menyenangkannya merancang undangan pernikahan digital eksklusif di ${brandName}. Kendali penuh, live preview instan, dan sebar link personal seketika.`,
  };
}

export default async function HowItWorksPage() {
  const settings = await getPublicPlatformSettings();
  const activeDomain = await getDynamicServerRootDomain();
  const brandName = settings.platformName || "Luxenary";
  const supportWhatsapp = settings.supportWhatsapp || "";
  const cleanWaNumber = supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62");

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans pb-24" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#1c1917" }}>
      {/* Top Navigation & Brand Header (Identik dengan /demo) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40" style={{ colorScheme: "only light", backgroundColor: "#ffffff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer min-w-0">
            <BrandLogo size="sm" lightBg />
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-stone-900 tracking-tight group-hover:text-amber-900 transition truncate block">
                PANDUAN STUDIO MANDIRI
              </span>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block truncate">
                Kemudahan Merancang Undangan Eksklusif Anda Sendiri
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/demo"
              className="text-xs font-bold text-stone-600 hover:text-amber-900 transition hidden md:inline-block"
            >
              Koleksi Tema
            </Link>
            <Link
              href="/portfolio"
              className="text-xs font-bold text-stone-600 hover:text-amber-900 transition hidden md:inline-block"
            >
              Portofolio
            </Link>
            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-full transition shadow-xs whitespace-nowrap cursor-pointer"
            >
              <span>Mulai Buat Undangan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Header Ramah, Santai & Langsung ke Intinya */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6 text-center">
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-100 text-amber-900 mb-3">
          SIMULATOR STUDIO
        </span>
        <h1 className="text-2xl sm:text-4xl font-serif text-stone-900 tracking-tight leading-snug max-w-2xl mx-auto mb-2">
          Coba Langsung, Semudah Ini Merancang Undangan Anda
        </h1>
        <p className="text-xs sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
          Sentuh teks untuk ganti nama, pilih warna tema favorit, dan lihat hasilnya langsung di simulator interaktif berikut.
        </p>
      </section>

      {/* Simulator Panggung Visual Interaktif (Fokus Utama Halaman) */}
      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 mb-20">
        <HowItWorksInteractive activeDomain={activeDomain} />
      </section>

      {/* 4 Pilar Keunggulan Sistem (Copywriting Santun & Menghormati Klien) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-wider text-amber-800 font-bold block mb-2">
            PENGALAMAN MENYENANGKAN
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mb-3">
            Dirancang Intuitif untuk Menemani Momen Bahagia Anda
          </h2>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Fokus pada keindahan cerita cinta Anda, sementara sistem kami memastikan setiap detail tampil proporsional dan elegan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pilar 1 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#eadecf]/70 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
                Kebebasan Menata Cerita Anda
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Tuliskan kisah kasih, susunan acara sakral, hingga nama keluarga dengan gelar kehormatan secara leluasa tanpa batasan waktu atau prosedur revisi yang kaku.
              </p>
            </div>
          </div>

          {/* Pilar 2 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#eadecf]/70 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
                Interaktivitas Pratinjau Seketika
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Setiap foto prewedding, bait doa, maupun alunan musik orkestra langsung terwujud nyata di layar ponsel saat Anda menyentuhnya. Memberikan kepastian dan ketenangan hati sebelum dibagikan.
              </p>
            </div>
          </div>

          {/* Pilar 3 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#eadecf]/70 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
                Penghormatan Personal untuk Setiap Tamu
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Sistem secara otomatis menyematkan nama kerabat dan sahabat terhormat di kartu undangan dan tiket VIP, menghadirkan sambutan hangat yang membuat tamu merasa diistimewakan.
              </p>
            </div>
          </div>

          {/* Pilar 4 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#eadecf]/70 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
                Kendali Mandiri Kapan Pun Diperlukan
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Seluruh data tersimpan aman di cloud berkecepatan tinggi. Kapan pun ada penyesuaian jadwal atau penambahan nama tamu, Anda memegang kendali penuh untuk memperbaruinya dalam satu sentuhan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tanya Jawab Praktis (FAQ Santun & Jernih) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-wider text-amber-800 font-bold block mb-2">
            TANYA JAWAB
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-2">
            Pertanyaan Seputar Studio Mandiri
          </h2>
          <p className="text-stone-500 text-sm">
            Semua jawaban praktis untuk ketenangan persiapan momen sakral Anda.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#eadecf]/70 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Seberapa mudahkah mengisi formulir dan mengatur foto undangan?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Sangat mudah dan alami. Anda cukup mengetikkan nama, memilih tanggal dari kalender interaktif, serta memilih foto prewedding favorit langsung dari galeri ponsel Anda. Sistem kami secara otomatis menyesuaikan tata letak agar selalu proporsional dan sedap dipandang.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#eadecf]/70 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Apakah saya bebas mengubah data jika ada penyesuaian susunan acara?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Tentu saja. Anda memiliki kendali penuh 24 jam untuk memperbarui gelar keluarga, waktu akad nikah, maupun urutan acara kapan pun Anda perlukan tanpa dikenakan biaya tambahan.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#eadecf]/70 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Bagaimana cara membagikan undangan personal kepada para tamu?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Anda cukup memasukkan daftar nama kerabat di menu Buku Tamu. Sistem kami akan secara otomatis menghasilkan tautan khusus lengkap dengan draft pesan WhatsApp yang santun, sehingga Anda dapat mengirimkannya satu per satu hanya dengan satu klik.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#eadecf]/70 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              Apakah tim dukungan siap membantu jika saya membutuhkan konsultasi?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Tentu. Tim Customer Support kami selalu siap mendampingi dan menjawab pertanyaan Anda melalui WhatsApp resmi selama proses persiapan undangan berlangsung.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section Akhir */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-[#eadecf]/80 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-amber-800 font-bold block mb-2">
              MULAI SEKARANG
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif text-stone-900 mb-4">
              Wujudkan Undangan Pernikahan Impian Anda
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-8">
              Jelajahi keindahan ragam tema eksklusif kami dan rasakan sendiri kemudahan Studio Mandiri hari ini.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/demo"
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-full transition shadow-sm inline-flex items-center gap-2"
              >
                <span>Lihat Semua Koleksi Tema</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                href="/"
                className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold rounded-full transition"
              >
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalist */}
      <footer className="mt-20 pt-8 border-t border-stone-200 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} {brandName}. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-amber-900 transition">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-amber-900 transition">Ketentuan Layanan</Link>
            <Link href="/contact" className="hover:text-amber-900 transition">Hubungi Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
