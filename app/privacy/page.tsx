import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  return {
    title: "Kebijakan Privasi",
    description: `Kebijakan privasi dan perlindungan data pengguna ${settings.platformName || "Platform Undangan"}.`,
  };
}

export default async function PrivacyPage() {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";
  const supportEmail = settings.supportEmail || "";
  const supportWhatsapp = settings.supportWhatsapp || "";
  const graceDays = settings.retentionInvitationGraceDays || 7;
  const galleryDays = settings.retentionGalleryDefaultDays || 30;

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col text-stone-800" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#292524" }}>
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="sm" showName brandName={platformName} />
          <div className="text-xs font-semibold text-stone-500 hidden sm:block">Kebijakan Privasi</div>
          <Link href="/" className="text-xs text-stone-500 hover:text-amber-800 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif text-amber-900 mb-8">Kebijakan Privasi</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-stone-600 bg-white p-8 rounded-xl shadow-sm border border-[#eadecf]/50">
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">1. Pendahuluan</h2>
            <p>
              Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana {platformName} (&quot;kami&quot;) mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat menggunakan layanan pembuatan undangan digital kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">2. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan dua jenis informasi utama:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Data Klien:</strong> Nama lengkap, alamat email, kata sandi (dienkripsi), nomor WhatsApp, dan informasi acara pernikahan Anda.</li>
              <li><strong>Data Tamu:</strong> Nama tamu, ucapan/komentar yang ditinggalkan di buku tamu, dan foto/video yang diunggah pada fitur Guest Memories.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">3. Penggunaan Informasi</h2>
            <p>
              Data yang Anda masukkan murni digunakan untuk tujuan operasional pembuatan dan penayangan undangan digital Anda. Kami tidak akan pernah menjual, menyewakan, atau mendistribusikan data pribadi Anda maupun data tamu Anda kepada pihak ketiga untuk tujuan pemasaran.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">4. Keamanan dan Retensi Data</h2>
            <p>
              Kami menerapkan standar keamanan dan enkripsi industri untuk melindungi seluruh informasi pribadi Anda dan para tamu. Terkait masa simpan data di cloud server kami:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-stone-600 leading-relaxed">
              <li><strong>Masa Persiapan & Hari-H:</strong> Seluruh data undangan aktif penuh tanpa batasan waktu sejak Anda mendaftar hingga rangkaian acara pernikahan selesai.</li>
              <li><strong>Pasca Hari-H:</strong> Demi privasi dan kerapian data, formulir RSVP dan buku tamu ditutup 24 jam setelah acara berakhir. Klien dapat mengunduh seluruh rekapan daftar tamu hadir dalam format Excel/CSV kapan saja dari Dasbor Klien.</li>
              <li><strong>Masa Transisi Subdomain:</strong> Subdomain publik aktif melayani pengunjung hingga {graceDays} hari pasca-acara sebelum dinonaktifkan secara anggun.</li>
              <li><strong>Galeri Kenangan Tamu (/memories):</strong> Pada paket yang memiliki fitur kenangan tamu, foto tersimpan di server selama {galleryDays % 30 === 0 ? `${galleryDays / 30} bulan (${galleryDays} hari)` : `${galleryDays} hari`} pasca-acara (atau 1 tahun penuh bagi pengguna Custom Domain). Klien memiliki hak penuh untuk mengunduh seluruh arsip foto beresolusi penuh dalam 1 file ZIP ke perangkat pribadi sebelum pembersihan server dilakukan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">5. Pihak Ketiga (Payment Gateway)</h2>
            <p>
              Proses pembayaran di {platformName} sepenuhnya ditangani secara aman oleh gerbang pembayaran resmi berlisensi (seperti QRIS, Virtual Account, e-Wallet, maupun transfer bank). {platformName} tidak menyimpan, mengumpulkan, atau memproses detail kartu kredit atau informasi perbankan sensitif Anda di server kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">6. Pertanyaan & Kontak Privasi</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau hak perlindungan data Anda, silakan hubungi tim kami:
            </p>
            <div className="mt-3 p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2 text-xs">
              {supportEmail && (
                <p>
                  <strong>Email Resmi:</strong>{" "}
                  <a href={`mailto:${supportEmail}`} className="text-amber-800 hover:underline font-medium">
                    {supportEmail}
                  </a>
                </p>
              )}
              {supportWhatsapp && (
                <p>
                  <strong>WhatsApp Dukungan:</strong>{" "}
                  <a
                    href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${platformName}, saya ingin bertanya perihal privasi data.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline font-medium"
                  >
                    +{supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}
                  </a>
                </p>
              )}
              <p>
                Informasi lebih lanjut dapat dilihat pada halaman <Link href="/contact" className="text-amber-800 hover:underline font-medium">Hubungi Kami</Link>.
              </p>
            </div>
          </section>

          <p className="pt-8 text-xs text-stone-400 italic">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>

      <footer className="border-t border-[#eadecf] bg-[#f4ede4] py-8 px-6 text-center text-xs text-[#7d756b]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} {platformName}. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-amber-900 transition">Syarat & Ketentuan</Link>
            <Link href="/privacy" className="hover:text-amber-900 transition">Kebijakan Privasi</Link>
            <Link href="/refund" className="hover:text-amber-900 transition">Pengembalian Dana</Link>
            <Link href="/contact" className="hover:text-amber-900 transition">Hubungi Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
