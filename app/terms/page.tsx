import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  return {
    title: `Syarat dan Ketentuan | ${settings.platformName || "Platform Undangan"}`,
    description: `Syarat dan ketentuan penggunaan layanan ${settings.platformName || "Platform Undangan"}.`,
  };
}

export default async function TermsPage() {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";
  const supportEmail = settings.supportEmail || "";

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col text-stone-800">
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="sm" showName />
          <div className="text-xs font-semibold text-stone-500 hidden sm:block">Syarat & Ketentuan</div>
          <Link href="/" className="text-xs text-stone-500 hover:text-amber-800 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif text-amber-900 mb-8">Syarat dan Ketentuan Layanan</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-stone-600 bg-white p-8 rounded-xl shadow-sm border border-[#eadecf]/50">
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">1. Pengantar</h2>
            <p>
              Selamat datang di {platformName}. Dengan mendaftar dan menggunakan layanan pembuatan undangan digital {platformName}, Anda dianggap telah membaca, memahami, dan menyetujui seluruh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui syarat ini, mohon untuk tidak melanjutkan penggunaan layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">2. Layanan {platformName}</h2>
            <p>
              {platformName} menyediakan platform mandiri berbasis web bagi pengguna (Klien) untuk membuat, mengelola, dan mendistribusikan undangan pernikahan digital. Fitur dan batasan tema bergantung pada paket langganan yang Anda pilih.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">3. Kebijakan Retensi (Masa Aktif)</h2>
            <p>
              Masa aktif undangan dan retensi data berlaku sesuai dengan ketentuan berikut:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Masa aktif undangan statis dapat diakses tamu tanpa batas waktu selama server kami beroperasi secara normal.</li>
              <li>Namun, hak akses **Dashboard Editor** dan **seluruh interaksi tamu** (seperti pengisian buku tamu, RSVP, dan fitur Guest Memories) akan **dikunci (Locked)** secara otomatis 24 jam setelah tanggal acara pernikahan terlewati.</li>
              <li>Untuk alasan performa dan efisiensi penyimpanan, seluruh data terkait tamu, buku tamu, komentar, dan unggahan foto/video akan **dihapus bersih dari server kami (Sapu Bersih) selambat-lambatnya 1 tahun (365 hari)** setelah undangan diterbitkan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">4. Pembayaran dan Kebijakan Refund</h2>
            <p>
              Seluruh pembayaran diproses melalui gerbang pembayaran pihak ketiga yang resmi (iPaymu). Layanan kami memproduksi aset digital yang secara instan dapat digunakan (dikonsumsi) setelah aktivasi/pembayaran berhasil.
            </p>
            <p className="mt-2 font-medium text-red-700">
              Oleh karena itu, seluruh transaksi yang telah berhasil bersifat final dan TIDAK ADA PENGEMBALIAN DANA (No Refund) dengan alasan apa pun, kecuali terjadi kesalahan fatal dari sisi sistem kami yang menyebabkan layanan tidak dapat digunakan sama sekali (Force Majeure).
            </p>
            <p className="mt-2">
              Dengan melanjutkan transaksi, Anda setuju dengan kebijakan &quot;No Refund&quot; ini. Silakan tinjau kembali <Link href="/refund" className="text-amber-800 hover:underline">Kebijakan Pengembalian Dana</Link> kami secara terpisah.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">5. Penggunaan Tema (Themes)</h2>
            <p>
              Setelah Klien menekan tombol &quot;Terbitkan&quot; (Publish), tata letak (Tema/Desain) undangan akan dikunci. Klien tidak diperkenankan untuk merubah tema undangan setelah diterbitkan. Klien wajib memeriksa ulang kesesuaian data dan desain pada mode &quot;Preview&quot; sebelum menekan tombol Publish.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">6. Hak Kekayaan Intelektual</h2>
            <p>
              Semua desain tema, aset grafis bawaan, struktur HTML/CSS, dan sistem operasional yang disediakan adalah hak milik intelektual {platformName}. Klien dilarang mereproduksi, menjual kembali, mendistribusikan kode program, atau mengklaim kepemilikan atas desain tersebut.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">7. Kontak & Bantuan</h2>
            <p>
              Untuk pertanyaan umum atau keluhan dari publik, Anda dapat menghubungi kami melalui email di <strong>{supportEmail}</strong>.
            </p>
            <p className="mt-2">
              Demi keamanan dan menghindari penipuan, layanan dukungan prioritas via WhatsApp hanya diberikan secara eksklusif kepada Klien Resmi yang aktif. Tombol kontak WhatsApp Admin dapat ditemukan di dalam <strong>Dashboard Klien</strong> Anda setelah proses login.
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
