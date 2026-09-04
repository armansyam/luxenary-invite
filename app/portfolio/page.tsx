import Link from "next/link";
import { Metadata } from "next";
import { listPortfolioSlugs, STORAGE_PROVIDER, getPortfolioMetadata } from "@/lib/storage";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";
import { PortfolioGallery, PortfolioGalleryItem } from "./PortfolioGallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portofolio Undangan Pernikahan Digital",
  description:
    "Galeri mahakarya undangan pernikahan digital. Desain estetis, tata letak editorial mewah, dan pengalaman interaktif berkelas.",
};

export default async function PortfolioPage() {
  const { platformName } = await getPublicPlatformSettings();

  // Fetch daftar portfolio slug (bisa dari R2 atau Lokal)
  const clonedSlugs = await listPortfolioSlugs();

  if (clonedSlugs.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans flex flex-col">
        <header className="border-b border-[#eadecf]/70 bg-[#faf8f5]/85 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo size="sm" lightBg showName brandName={platformName} />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto my-16 p-8 bg-white border border-[#eadecf] rounded-3xl text-center space-y-4 shadow-xs">
            <h3 className="text-lg font-serif font-bold text-stone-900">Belum Ada Portofolio</h3>
            <p className="text-xs text-stone-600 leading-relaxed">Portofolio akan ditampilkan setelah Admin mengkurasi dan menerbitkan undangan pilihan.</p>
          </div>
        </main>
      </div>
    );
  }

  // Fetch data klien dari metadata statis (tanpa query DB agar kebal pembersihan)
  const portfolioItems: PortfolioGalleryItem[] = [];

  for (const slug of clonedSlugs) {
    const metadata = await getPortfolioMetadata(slug);
    if (!metadata) continue;
    
    // Asumsi cover.webp selalu di-generate oleh admin portfolio POST endpoint
    let coverImage = `/portfolio/assets/${slug}/cover.webp`;
    
    // Jika R2, prefix dengan public CDN URL
    if (STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") {
      const publicUrl = (process.env.S3_CUSTOM_DOMAIN || process.env.S3_PUBLIC_URL)?.replace(/\/$/, "");
      coverImage = `${publicUrl}/portfolio/assets/${slug}/cover.webp`;
    }

    portfolioItems.push({
      id: slug, // Gunakan slug sebagai ID karena kita tidak punya ID unik database lagi
      coupleName: metadata.coupleName,
      themeId: metadata.themeId,
      category: metadata.category,
      coverImage,
      publicUrl: `/portfolio/${slug}`,
    });
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans flex flex-col selection:bg-amber-200 selection:text-amber-900">
      {/* Top Header Navbar */}
      <header className="border-b border-[#eadecf]/70 bg-[#faf8f5]/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size="sm" lightBg showName brandName={platformName} />
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/demo"
              className="text-xs sm:text-sm font-medium text-stone-600 hover:text-amber-900 transition hidden sm:inline-block"
            >
              Katalog Tema
            </Link>
            <Link
              href="/portfolio"
              className="text-xs sm:text-sm font-bold text-amber-900 border-b-2 border-amber-900 pb-0.5"
            >
              Portofolio
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-stone-950 hover:bg-amber-950 text-white text-xs font-bold rounded-full transition shadow-xs"
            >
              Buat Undangan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Showcase Section */}
      <main className="flex-1 pb-24">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-0.5 rounded-full font-mono">
            PORTOFOLIO KLIEN
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-stone-950 mt-3 mb-2 tracking-tight">
            Galeri Undangan Klien
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Kumpulan mahakarya undangan pernikahan digital yang telah dipercaya oleh pasangan pengantin.
          </p>
        </section>

        {/* 6-Column Responsive Portfolio Gallery with Lazy Loading */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <PortfolioGallery items={portfolioItems} />
        </section>
      </main>
    </div>
  );
}
