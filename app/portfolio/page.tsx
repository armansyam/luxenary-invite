import Link from "next/link";
import { Metadata } from "next";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";
import { PortfolioGallery, PortfolioGalleryItem } from "./PortfolioGallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portofolio Undangan Pernikahan Digital — Luxenary Invite",
  description:
    "Galeri mahakarya undangan pernikahan digital karya klien Luxenary Invite. Desain estetis, tata letak editorial mewah, dan pengalaman interaktif berkelas.",
};

export default async function PortfolioPage() {
  const { platformName } = await getPublicPlatformSettings();

  // Hanya tampilkan undangan yang sudah dikurasi admin ke public/portfolio/
  const portfolioDir = path.join(process.cwd(), "public", "portfolio");
  let clonedSlugs: string[] = [];
  try {
    const files = await fs.promises.readdir(portfolioDir);
    clonedSlugs = files
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(".html", ""));
  } catch {
    clonedSlugs = [];
  }

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

  // Fetch data klien dari DB berdasarkan slug yang sudah dikurasi
  const publishedInvs = await prisma.invitation.findMany({
    where: { invitationSlug: { in: clonedSlugs } },
    include: { media: true },
    orderBy: { updatedAt: "desc" },
  });

  const portfolioItems: PortfolioGalleryItem[] = [];

  for (const inv of publishedInvs) {
    const themeId = (inv.themeId || "kalandra").toLowerCase();

    let category = "premium";
    try {
      const themeRecord = await prisma.theme.findUnique({ where: { id: themeId } });
      if (themeRecord?.category) category = themeRecord.category.toLowerCase();
    } catch {}

    // Gunakan cover dari asset portofolio yang sudah diisolasi
    const slug = inv.invitationSlug;
    const portfolioCoverPath = path.join(process.cwd(), "public", "portfolio", "assets", slug, "cover.webp");
    let coverImage: string;
    try {
      await fs.promises.access(portfolioCoverPath);
      coverImage = `/portfolio/assets/${slug}/cover.webp`;
    } catch {
      // Fallback ke localPath jika cover.webp belum ada di portfolio assets
      const coverMedia = inv.media.find(
        (m) => m.mediaSlot === "LANDING_COVER" || m.mediaSlot === "DESKTOP_SIDEBAR" || m.mediaSlot === "GROOM_PHOTO"
      );
      coverImage = coverMedia?.localPath || `/demo/${themeId}/cover.webp`;
    }

    portfolioItems.push({
      id: inv.id,
      coupleName: `${inv.groomNickname || inv.groomName || "Pengantin Pria"} & ${inv.brideNickname || inv.brideName || "Pengantin Wanita"}`,
      themeId,
      category,
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
