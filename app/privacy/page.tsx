import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  return {
    title: `Kebijakan Privasi | ${settings.platformName || "Platform Undangan"}`,
    description: `Kebijakan privasi dan perlindungan data pengguna ${settings.platformName || "Platform Undangan"}.`,
  };
}

export default async function PrivacyPage() {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col text-stone-800">
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="sm" showName />
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
              Kami menggunakan enkripsi dan langkah keamanan standar industri untuk melindungi data Anda. Namun, demi menjaga efisiensi ruang server kami, terdapat kebijakan retensi data otomatis:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Penyimpanan interaktif (ucapan tamu, foto memori) akan dihapus secara permanen dari server kami maksimal <strong>1 Tahun (365 hari)</strong> setelah undangan Anda dipublikasikan.</li>
              <li>Klien diimbau untuk mengunduh seluruh memori tamu sebelum batas waktu tersebut.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">5. Pihak Ketiga (Payment Gateway)</h2>
            <p>
              Proses pembayaran di {platformName} sepenuhnya ditangani oleh gerbang pembayaran resmi berlisensi (iPaymu). {platformName} tidak menyimpan, mengumpulkan, atau memproses detail kartu kredit atau informasi perbankan sensitif Anda di server kami.
            </p>
          </section>

          <p className="pt-8 text-xs text-stone-400 italic">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>

      <footer className="border-t border-[#eadecf] bg-[#f4ede4] py-8 px-6 text-center text-xs text-[#7d756b]">
        <p>&copy; {new Date().getFullYear()} {platformName}. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
