import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { getDemoThemeData } from "@/lib/demoRegistry";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ theme: string }>;
}

export default async function DemoGuestMemoriesGalleryPage({ params }: PageProps) {
  const { theme } = await params;
  const cleanId = (theme || "kalandra").toLowerCase().trim();
  const demo = getDemoThemeData(cleanId);

  if (!demo) {
    notFound();
  }

  const coupleName = `${demo.groomName} & ${demo.brideName}`;
  const invitationUrl = `/demo/${demo.themeId}`;

  // Local theme highlight resolution (use memory_0X if exists, otherwise fallback to gallery_0X)
  const demoDir = path.join(process.cwd(), "public", "demo", demo.themeId);
  const getMediaUrl = (num: string) => {
    if (fs.existsSync(path.join(demoDir, `memory_${num}.webp`))) {
      return `/demo/${demo.themeId}/memory_${num}.webp`;
    }
    return `/demo/${demo.themeId}/gallery_${num}.webp`;
  };

  const sampleMemories = [
    {
      id: "mem-1",
      senderName: "Budi Santoso",
      message: `Selamat berbahagia untuk ${coupleName}! Sukses dan berkah selalu pernikahannya 🎉`,
      mediaUrl: getMediaUrl("01"),
      fallbackUrl: `/demo/${demo.themeId}/gallery_01.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T10:30:00Z",
    },
    {
      id: "mem-2",
      senderName: "Sahabat SMA (Dimas)",
      message: "Happy wedding bro! Akhirnya berlabuh di pelabuhan terakhir 🥂",
      mediaUrl: getMediaUrl("02"),
      fallbackUrl: `/demo/${demo.themeId}/gallery_02.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T11:15:00Z",
    },
    {
      id: "mem-3",
      senderName: "Rina & Teman Kuliah",
      message: `Cantik banget ${demo.brideName} hari ini! Sakinah mawaddah warahmah yaa ✨`,
      mediaUrl: getMediaUrl("03"),
      fallbackUrl: `/demo/${demo.themeId}/gallery_03.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T12:00:00Z",
    },
    {
      id: "mem-4",
      senderName: "Keluarga Besar Tante Maya",
      message: "Selamat menempuh hidup baru! Semoga rukun dan bahagia selalu.",
      mediaUrl: getMediaUrl("04"),
      fallbackUrl: `/demo/${demo.themeId}/gallery_04.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T13:45:00Z",
    },
  ];

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 antialiased font-sans pb-24 selection:bg-amber-500/30">
      {/* ── Top Navigation & Back Link ── */}
      <header className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur-md border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
        <Link
          href={invitationUrl}
          className="text-xs font-semibold text-stone-300 hover:text-white flex items-center gap-1.5 transition"
        >
          <span>&larr;</span>
          <span>Kembali ke Undangan</span>
        </Link>
        <span className="text-[11px] font-mono tracking-wider text-amber-400/90 uppercase font-bold">
          MEMORY VAULT (DEMO)
        </span>
      </header>

      {/* ── Hero Title Section ── */}
      <section className="px-4 pt-10 pb-6 text-center max-w-xl mx-auto">
        <span className="text-xs tracking-[0.25em] text-amber-300/80 uppercase font-semibold font-mono block mb-2">
          GUEST MOMENT GALLERY
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide mb-3">
          {coupleName}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-md mx-auto font-serif italic">
          &ldquo;Kumpulan foto candid dan ucapan penuh kehangatan yang dibagikan oleh sahabat dan keluarga tercinta.&rdquo;
        </p>

      </section>

      {/* ── Story Circles Highlights (Instagram Style) ── */}
      <section className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 mb-3 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400 font-mono">
            Sorotan Cerita Tamu ({sampleMemories.length})
          </span>
        </div>
        <div className="flex justify-center gap-4 overflow-x-auto pb-4 no-scrollbar">
          {sampleMemories.map((m, idx) => (
            <div
              key={m.id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              data-preview-trigger
              data-src={m.mediaUrl}
              data-sender={m.senderName}
              data-msg={m.message}
            >
              <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-amber-300 to-yellow-500 group-hover:scale-105 transition-transform shadow-md shadow-amber-500/20">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950 flex items-center justify-center">
                  <img
                    src={m.mediaUrl}
                    alt={m.senderName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] text-stone-300 group-hover:text-white max-w-[70px] truncate text-center font-medium">
                {m.senderName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Masonry Grid of Memories ── */}
      <section className="max-w-5xl mx-auto px-4 pt-6">
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
          {sampleMemories.map((m) => (
            <div
              key={m.id}
              className="break-inside-avoid bg-stone-900/60 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/40 transition group cursor-pointer shadow-lg"
              data-preview-trigger
              data-src={m.mediaUrl}
              data-sender={m.senderName}
              data-msg={m.message}
            >
              <div className="relative overflow-hidden bg-stone-950">
                <img
                  src={m.mediaUrl}
                  alt={m.senderName}
                  className="w-full h-auto object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300/90">{m.senderName}</span>
                  <span className="text-[10px] text-stone-500 font-mono">Baru saja</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed italic font-serif">
                  &ldquo;{m.message}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>


    </main>
  );
}
