import { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicPlatformSettings();
  return {
    title: "Kebijakan Pengembalian Dana",
    description: `Kebijakan pengembalian dana (Refund Policy) ${settings.platformName || "Platform Undangan"}.`,
  };
}

export default async function RefundPage() {
  const settings = await getPublicPlatformSettings();
  const platformName = settings.platformName || "Platform Undangan";
  const supportEmail = settings.supportEmail || "support@example.com";
  const supportWhatsapp = settings.supportWhatsapp || "";

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans flex flex-col text-stone-800" style={{ colorScheme: "only light", backgroundColor: "#faf8f5", color: "#292524" }}>
      <header className="border-b border-[#eadecf]/70 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="sm" showName brandName={platformName} />
          <div className="text-xs font-semibold text-stone-500 hidden sm:block">Kebijakan Pengembalian Dana (Refund)</div>
          <Link href="/" className="text-xs text-stone-500 hover:text-amber-800 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif text-amber-900 mb-8">Kebijakan Pengembalian Dana</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-stone-600 bg-white p-8 rounded-xl shadow-sm border border-[#eadecf]/50">
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Pemberitahuan Utama</h2>
            <p className="font-medium text-red-700 p-4 bg-red-50 rounded-lg border border-red-100">
              Layanan {platformName} memproduksi barang berupa produk digital (kode perangkat lunak web / HTML) yang secara instan diproses dan langsung dapat dikonsumsi oleh pembeli setelah pembayaran berhasil. Oleh karena itu, {platformName} menerapkan kebijakan keras <strong>TIDAK ADA PENGEMBALIAN DANA (No Refund)</strong> untuk seluruh transaksi yang telah berstatus Lunas / Berhasil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Kapan Pengembalian Dana TIDAK Berlaku?</h2>
            <p>Pengembalian dana sama sekali tidak akan diberikan untuk alasan-alasan berikut:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Pembeli berubah pikiran (change of mind) setelah melakukan pembayaran.</li>
              <li>Acara pernikahan batal, diundur, atau diubah tanggalnya.</li>
              <li>Pembeli merasa tidak mampu atau tidak mengerti cara menggunakan platform (meskipun kami telah menyediakan panduan penggunaan yang lengkap).</li>
              <li>Pembeli tidak menyukai desain tema (Pembeli diwajibkan untuk memeriksa halaman Demo sebelum membeli).</li>
              <li>Kesalahan pengisian data (typo) oleh pembeli sendiri di dalam Dashboard Editor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Pengecualian (Force Majeure)</h2>
            <p>
              Satu-satunya pengecualian di mana kami akan mempertimbangkan pengembalian dana (Refund) adalah jika terjadi kesalahan teknis fatal (Force Majeure) dari sisi server utama {platformName} yang mengakibatkan:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Undangan sama sekali tidak dapat diterbitkan (Gagal Sistem) setelah pembayaran sukses, dan tim teknis kami gagal memperbaikinya dalam waktu 3x24 jam kerja.</li>
            </ul>
            <p className="mt-2">
              Dalam kasus pengecualian ini, Anda wajib menghubungi dukungan pelanggan (CS) kami selambat-lambatnya 7 hari sejak transaksi terjadi, menyertakan bukti Invoice resmi pembayaran dan tangkapan layar kegagalan sistem.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Pembatalan (Chargeback)</h2>
            <p>
              Tindakan melakukan komplain sengketa ke bank atau metode pembayaran (Chargeback) untuk transaksi yang sah akan mengakibatkan pemblokiran akun dan penghapusan langsung atas undangan digital Anda tanpa peringatan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-2">Kontak & Layanan Bantuan</h2>
            <p>
              Apabila Anda memiliki pertanyaan atau pengajuan perihal kendala transaksi dan kebijakan ini, silakan hubungi saluran resmi kami:
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
                    href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${platformName}, saya ingin berkonsultasi mengenai transaksi/layanan.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline font-medium"
                  >
                    +{supportWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}
                  </a>
                </p>
              )}
              <p>
                Kunjungi juga laman <Link href="/contact" className="text-amber-800 hover:underline font-medium">Hubungi Kami</Link> untuk informasi kontak selengkapnya.
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
            <Link href="/refund" className="hover:text-amber-900 transition font-semibold underline">Pengembalian Dana</Link>
            <Link href="/contact" className="hover:text-amber-900 transition">Hubungi Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
