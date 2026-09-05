import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  return {
    title: "Syarat dan Ketentuan",
    description: `Syarat dan ketentuan penggunaan layanan ${settings.platformName || "Platform Undangan"}.`,
  };
}

export default async function TermsPage() {
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
            <h2 className="text-lg font-semibold text-stone-800 mb-2">3. Masa Aktif Layanan & Kebijakan Retensi Data</h2>
            <p>
              Kami memahami pentingnya setiap momen pernikahan Anda. Agar tidak terjadi kesalahpahaman, berikut adalah rincian lengkap mengenai masa aktif undangan dan penyimpanan data di platform {platformName}:
            </p>
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  1. Masa Persiapan & Hari Pernikahan (Aktif Tanpa Batas / Unlimited)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Sejak undangan Anda diterbitkan hingga hari pernikahan (Hari-H) selesai dilaksanakan, website undangan Anda <strong>aktif penuh tanpa batasan waktu</strong>. Anda leluasa menyusun susunan acara, mengedit informasi, membagikan link ke para tamu, menerima konfirmasi kehadiran (RSVP), serta mengumpulkan ucapan doa kapan pun (bahkan jika undangan dibuat berbulan-bulan sebelum hari-H).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  2. Pasca Hari-H & Rekapitulasi Data Tamu (24 Jam Setelah Acara)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Untuk menjaga keabsahan dan kerapian data kehadiran, formulir interaktif (RSVP kehadiran dan Buku Tamu online) dikunci secara otomatis 24 jam setelah tanggal acara berakhir. Klien dapat mengunduh seluruh rekapan daftar tamu hadir dan ucapan doa ke dalam format <strong>Excel / CSV</strong> melalui Dasbor Klien kapan saja untuk disimpan pribadi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  3. Masa Transisi Subdomain ({graceDays} Hari Pasca-Acara)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Tautan alamat subdomain ringkas Anda (misal: <em>namakamu.luxvite.id</em>) tetap aktif melayani tamu hingga {graceDays} hari setelah tanggal acara selesai sebagai masa tenggang transisi. Setelah {graceDays} hari, alamat subdomain akan dinonaktifkan secara anggun, sementara akses kenangan beralih ke galeri foto atau layar ucapan terima kasih resmi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  4. Galeri Kenangan Tamu (/memories) & Hak Unduh Arsip Foto ZIP
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Khusus Paket Premium yang dilengkapi fitur Galeri Kenangan Tamu, seluruh foto candid dan video ucapan yang diunggah para tamu tersimpan aman di cloud server dan dapat dibuka selama <strong>{galleryDays % 30 === 0 ? `${galleryDays / 30} bulan (${galleryDays} hari)` : `${galleryDays} hari`} pasca-acara</strong> secara gratis. Klien memiliki fasilitas untuk <strong>mengunduh seluruh foto resolusi asli dalam 1 file ZIP</strong> ke galeri ponsel/laptop pribadi agar tersimpan selamanya, atau dapat memperpanjang masa simpan cloud via Add-on.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  5. Layanan Custom Domain Pribadi (Aktif 1 Tahun Penuh)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bagi klien yang memilih layanan integrasi Custom Domain pribadi (seperti <em>namakamu.com</em>), website undangan beserta galeri foto kenangan Anda dijamin aktif dan dapat diakses publik selama <strong>1 tahun penuh (365 hari)</strong> sejak aktivasi.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">4. Pembayaran dan Kebijakan Refund</h2>
            <p>
              Seluruh pembayaran diproses secara aman melalui gerbang pembayaran resmi berlisensi (seperti QRIS, Virtual Account, e-Wallet) maupun metode transfer bank resmi yang disediakan platform. Layanan kami memproduksi aset digital yang secara instan dapat digunakan (dikonsumsi) setelah aktivasi/pembayaran berhasil.
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
              Jika Anda memiliki pertanyaan mengenai Syarat & Ketentuan ini atau memerlukan bantuan, silakan hubungi tim layanan pelanggan kami:
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
                    href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${platformName}, saya ingin bertanya perihal layanan.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline font-medium"
                  >
                    +{supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}
                  </a>
                </p>
              )}
              <p>
                Anda juga dapat mengunjungi halaman <Link href="/contact" className="text-amber-800 hover:underline font-medium">Hubungi Kami</Link> untuk detail saluran komunikasi resmi.
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
