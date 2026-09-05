import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";
  return {
    title: "Hubungi Kami",
    description: `Hubungi tim layanan dan dukungan pelanggan ${platformName}. Kami siap membantu kebutuhan undangan pernikahan digital Anda.`,
  };
}

export default async function ContactPage() {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";
  const supportEmail = settings.supportEmail || "support@example.com";
  const supportWhatsapp = settings.supportWhatsapp || "";
  const cleanWaNumber = supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62");
  const graceDays = settings.retentionInvitationGraceDays || 7;

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col text-stone-800" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#292524" }}>
      {/* Header */}
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="sm" showName lightBg brandName={platformName} />
          </Link>
          <div className="text-xs font-semibold text-stone-500 hidden sm:block">Pusat Bantuan & Kontak</div>
          <Link href="/" className="text-xs text-stone-500 hover:text-amber-800 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-900 mb-3">
            Bantuan Pelanggan
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-amber-900 mb-3">Hubungi Tim Kami</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Punya pertanyaan seputar pembuatan undangan digital, pembayaran, kustomisasi domain, atau kendala teknis? Kami siap membantu mewujudkan momen istimewa Anda.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* WhatsApp Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#eadecf]/60 flex flex-col justify-between hover:border-emerald-300 transition group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">WhatsApp Dukungan</h2>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                Saluran tercepat untuk konsultasi live, aktivasi kilat, dan bantuan teknis langsung dengan staf layanan kami.
              </p>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs font-mono text-stone-700 mb-6">
                {cleanWaNumber ? `+${cleanWaNumber}` : "Nomor WhatsApp belum dikonfigurasi"}
              </div>
            </div>

            {cleanWaNumber ? (
              <a
                href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(`Halo ${platformName}, saya membutuhkan bantuan atau informasi mengenai layanan undangan.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Chat WhatsApp Sekarang
              </a>
            ) : (
              <div className="text-xs text-stone-400 italic">Kontak WhatsApp dapat diatur melalui dashboard admin.</div>
            )}
          </div>

          {/* Email Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#eadecf]/60 flex flex-col justify-between hover:border-amber-300 transition group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mb-5 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">Email Resmi</h2>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                Untuk pertanyaan formal, kendala verifikasi pembayaran, kerjasama vendor, atau pengajuan komplain akun.
              </p>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-xs font-mono text-stone-700 mb-6">
                {supportEmail}
              </div>
            </div>

            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Pertanyaan Layanan - ${platformName}`)}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Kirim Email
            </a>
          </div>
        </div>

        {/* Operational Hours & FAQ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#eadecf]/50 shadow-sm md:col-span-1">
            <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waktu Operasional
            </h3>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between pb-1 border-b border-stone-100">
                <span>Senin — Jumat</span>
                <span className="font-semibold text-stone-800">08:00 - 21:00 WIB</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-stone-100">
                <span>Sabtu — Minggu</span>
                <span className="font-semibold text-stone-800">09:00 - 18:00 WIB</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Infrastruktur Server</span>
                <span className="font-semibold text-emerald-700">Online 24/7</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#eadecf]/50 shadow-sm md:col-span-2">
            <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pertanyaan yang Sering Diajukan (FAQ)
            </h3>
            <div className="space-y-3 text-xs text-stone-600">
              <div>
                <p className="font-semibold text-stone-800 mb-0.5">Berapa lama masa aktif undangan digital saya?</p>
                <p>
                  Masa aktif tautan (subdomain) undangan digital berlaku hingga {graceDays} hari setelah tanggal acara pernikahan selesai sesuai pengaturan sistem platform (dan dapat diperpanjang via paket add-on). Khusus undangan yang telah dikurasi dan dikloning ke galeri portofolio resmi platform, halaman undangan statis akan terus tersedia secara permanen sebagai arsip kenangan.
                </p>
              </div>
              <div>
                <p className="font-semibold text-stone-800 mb-0.5">Apakah saya bisa mengubah detail acara setelah undangan terbit?</p>
                <p>Ya, seluruh data teks, foto, cerita cinta, dan musik latar dapat diedit kapan saja melalui Dashboard Klien.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eadecf] bg-[#f4ede4] py-8 px-6 text-center text-xs text-[#7d756b]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} {platformName}. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-amber-900 transition">Syarat & Ketentuan</Link>
            <Link href="/privacy" className="hover:text-amber-900 transition">Kebijakan Privasi</Link>
            <Link href="/refund" className="hover:text-amber-900 transition">Pengembalian Dana</Link>
            <Link href="/contact" className="hover:text-amber-900 transition font-semibold underline">Hubungi Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
