import { notFound } from "next/navigation";
import Link from "next/link";
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

  const sampleMemories = [
    {
      id: "mem-1",
      senderName: "Budi Santoso",
      message: "Selamat berbahagia untuk Raditya & Alana! Sukses dan berkah selalu pernikahannya 🎉",
      mediaUrl: `/demo/${demo.themeId}/memory_01.webp`,
      fallbackUrl: `/demo/${demo.themeId}/gallery_01.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T10:30:00Z",
    },
    {
      id: "mem-2",
      senderName: "Sahabat SMA (Dimas)",
      message: "Happy wedding bro! Akhirnya berlabuh di pelabuhan terakhir 🥂",
      mediaUrl: `/demo/${demo.themeId}/memory_02.webp`,
      fallbackUrl: `/demo/${demo.themeId}/gallery_02.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T11:15:00Z",
    },
    {
      id: "mem-3",
      senderName: "Rina & Teman Kuliah",
      message: "Cantik banget Alana hari ini! Sakinah mawaddah warahmah yaa ✨",
      mediaUrl: `/demo/${demo.themeId}/memory_03.webp`,
      fallbackUrl: `/demo/${demo.themeId}/gallery_03.webp`,
      mediaType: "IMAGE",
      createdAt: "2026-11-14T12:00:00Z",
    },
    {
      id: "mem-4",
      senderName: "Keluarga Besar Tante Maya",
      message: "Selamat menempuh hidup baru! Semoga rukun dan bahagia selalu.",
      mediaUrl: `/demo/${demo.themeId}/memory_04.webp`,
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
          GUEST MEMORIES &amp; SHARED MOMENTS
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide mb-3">
          {coupleName}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-md mx-auto font-serif italic">
          &ldquo;Kumpulan foto candid dan video ucapan penuh kehangatan yang dibagikan oleh sahabat dan keluarga tercinta.&rdquo;
        </p>

        <div className="mt-6">
          <button
            type="button"
            id="openModalTrigger"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs tracking-wider shadow-lg shadow-amber-900/30 transition cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>UNGGAH FOTO / VIDEO MOMEN</span>
          </button>
        </div>
      </section>

      {/* ── Story Circles Highlights (Instagram Style) ── */}
      <section className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-stone-400 font-mono">
            Sorotan Cerita Tamu ({sampleMemories.length})
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
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
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
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

      {/* ── Interactive Upload Modal ── */}
      <div
        id="demoUploadModal"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ display: "none" }}
      >
        <div className="bg-stone-900 border border-white/15 rounded-3xl p-6 max-w-md w-full text-left space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-serif font-bold text-base text-white">Unggah Momen Tamu (Demo)</h3>
            <button
              type="button"
              id="closeModalTrigger"
              className="text-stone-400 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          </div>
          <form id="demoMemForm" className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">NAMA ANDA</label>
              <input
                type="text"
                required
                placeholder="Nama Tamu Undangan"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">PESAN / DOA SINGKAT</label>
              <input
                type="text"
                placeholder="Tuliskan ucapan manis untuk kedua mempelai..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">PILIH FOTO / VIDEO</label>
              <input
                type="file"
                accept="image/*,video/*"
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-950/60 border border-dashed border-white/25 text-xs text-stone-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-stone-950"
              />
            </div>
            <button
              type="submit"
              id="demoFormSubmit"
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              KIRIM MOMEN ANDA
            </button>
            <div id="demoSuccessAlert" className="text-emerald-400 text-xs text-center font-bold" style={{ display: "none" }}>
              ✓ Foto berhasil diunggah dan ditambahkan ke galeri kenangan!
            </div>
          </form>
        </div>
      </div>

      {/* ── Client Scripts for Interaction & Lightbox ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const modal = document.getElementById('demoUploadModal');
              const openBtn = document.getElementById('openModalTrigger');
              const closeBtn = document.getElementById('closeModalTrigger');
              const form = document.getElementById('demoMemForm');
              const alert = document.getElementById('demoSuccessAlert');
              const submitBtn = document.getElementById('demoFormSubmit');

              if (openBtn && modal) openBtn.onclick = () => { modal.style.display = 'flex'; };
              if (closeBtn && modal) closeBtn.onclick = () => { modal.style.display = 'none'; };
              if (modal) modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

              if (form) {
                form.onsubmit = (e) => {
                  e.preventDefault();
                  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Mengunggah...'; }
                  setTimeout(() => {
                    if (alert) alert.style.display = 'block';
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'KIRIM MOMEN ANDA'; }
                    setTimeout(() => {
                      if (modal) modal.style.display = 'none';
                      if (alert) alert.style.display = 'none';
                    }, 1500);
                  }, 800);
                };
              }
            });
          `,
        }}
      />
    </main>
  );
}
