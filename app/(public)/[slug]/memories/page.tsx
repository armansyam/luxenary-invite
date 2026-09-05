import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdminSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [invitation, platformName] = await Promise.all([
    prisma.invitation.findUnique({ where: { invitationSlug: slug } }),
    getAdminSetting("platform_name", "Platform Undangan"),
  ]);

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Galeri Kenangan Tamu — ${coupleName} | ${platformName}`,
    description: `Kumpulan foto candid dan ucapan dari sahabat & keluarga di pernikahan ${coupleName}.`,
  };
}

export default async function GuestMemoriesGalleryPage({ params }: PageProps) {
  const { slug } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { invitationSlug: slug },
    include: {
      order: { select: { planType: true } },
      guestMemories: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  // Jika paket bukan PREMIUM, galeri kenangan tamu tidak tersedia
  if (invitation.order?.planType !== "PREMIUM") {
    redirect(`/${slug}`);
  }

  const memories: any[] = invitation.guestMemories || [];

  const coupleName = `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`;
  const invitationUrl = `/${slug}`;

  // Random 10 highlights for top story circles
  const shuffledMemories = [...memories].sort(() => 0.5 - Math.random()).slice(0, 10);

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
        <Link
          href={`${invitationUrl}/sharemoment`}
          className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <span>Bagikan Momen</span>
        </Link>
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

      {/* ── Instagram Story Highlights Rail ── */}
      {shuffledMemories.length > 0 && (
        <section className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-3 px-1 text-center">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase font-mono flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Kami Sudah Membagikan Momen
            </span>
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
            {shuffledMemories.map((item, idx) => (
              <div
                key={`story-${item.id}-${idx}`}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
                data-media-url={item.mediaUrl}
                data-sender-name={item.senderName}
                data-message={item.message || ""}
                data-type={item.mediaType}
              >
                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 group-hover:scale-105 transition-transform duration-200">
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.senderName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-stone-300 font-medium truncate max-w-[68px] text-center">
                  {item.senderName.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Masonry Media Grid ── */}
      <section className="px-4 pt-6 max-w-4xl mx-auto">
        {memories.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-[2rem] bg-gradient-to-b from-stone-900/90 to-stone-950 border border-white/5 mt-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
            <div className="w-20 h-20 rounded-full bg-stone-900 border border-white/5 flex items-center justify-center text-amber-500 mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif font-bold text-white tracking-wide mb-2">Kanvas Kenangan Masih Kosong</h3>
            <p className="text-sm text-stone-400 leading-relaxed max-w-sm mx-auto mb-8 font-serif italic">
              &quot;Jadilah orang pertama yang mengabadikan tawa, senyum, dan kebahagiaan di hari istimewa ini.&quot;
            </p>
            <Link
              href={`${invitationUrl}/sharemoment`}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Mulai Bagikan Momen</span>
            </Link>
          </div>
        ) : (
          <div id="memoriesMasonry" className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
            {memories.map((m) => (
              <div
                key={m.id}
                data-type={m.mediaType}
                className="memory-grid-card break-inside-avoid rounded-2xl overflow-hidden bg-stone-900/80 border border-white/10 hover:border-amber-400/50 transition duration-200 shadow-md group cursor-pointer"
                data-media-url={m.mediaUrl}
                data-sender-name={m.senderName}
                data-message={m.message || ""}
              >
                <div className="relative overflow-hidden bg-stone-900">
                  <img
                    src={m.mediaUrl}
                    alt={`Momen dari ${m.senderName}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 bg-stone-900/90">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-100 truncate">{m.senderName}</span>
                    <span className="text-[10px] text-stone-500 shrink-0 font-mono">
                      {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {m.message && (
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 italic font-serif leading-relaxed">
                      &ldquo;{m.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Live Toast Notification ── */}
      <div
        id="liveToastIndicator"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer transition-all duration-500 opacity-0 translate-y-[150%]"
      >
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-stone-950"></span>
        </div>
        <span className="text-xs tracking-wide">Ada <span id="liveToastCount">0</span> Momen Baru! Klik untuk memuat</span>
      </div>

      {/* ── Lightbox Preview Modal ── */}
      <div
        id="galleryPreviewModal"
        style={{ display: "none" }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col items-center justify-center cursor-pointer"
      >
        <button
          type="button"
          id="closeModalBtn"
          className="absolute top-4 right-4 text-white text-2xl font-bold p-2 hover:opacity-80 transition cursor-pointer"
        >
          ✕
        </button>
        <div id="previewModalContent" className="max-w-3xl w-full flex items-center justify-center"></div>
        <div id="previewModalCaption" className="mt-4 text-center max-w-md"></div>
      </div>
      {/* ── Mobile Floating Action Button (When Photos Exist) ── */}
      {memories.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Link
            href={`${invitationUrl}/sharemoment`}
            className="px-4 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-2xl shadow-amber-950/60 transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span>Bagikan Momen</span>
          </Link>
        </div>
      )}

      {/* ── Client Scripts ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const invitationId = "${invitation.id}";
          const sseEventSource = new EventSource('/api/sse/memories?invitationId=' + invitationId);
          let newMemoriesQueue = [];
          const toast = document.getElementById('liveToastIndicator');
          const toastCount = document.getElementById('liveToastCount');
          const masonryContainer = document.getElementById('memoriesMasonry');

          sseEventSource.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              if (!document.querySelector(\`[data-memory-id="\${data.id}"]\`)) {
                newMemoriesQueue.push(data);
                if (toast && toastCount) {
                  toastCount.textContent = newMemoriesQueue.length;
                  toast.style.transform = 'translateY(0)';
                  toast.style.opacity = '1';
                }
              }
            } catch (e) {}
          };

          function bindLightbox() {
            document.querySelectorAll('.memory-grid-card').forEach(el => {
              if (el.dataset.bound) return;
              el.dataset.bound = "true";
              el.addEventListener('click', () => {
                const url = el.getAttribute('data-media-url');
                const name = el.getAttribute('data-sender-name');
                const msg = el.getAttribute('data-message');
                const type = el.getAttribute('data-type');
                if (!url) return;
                const modal = document.getElementById('galleryPreviewModal');
                const content = document.getElementById('previewModalContent');
                const caption = document.getElementById('previewModalCaption');
                content.innerHTML = '<img src="' + url + '" class="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl" />';
                caption.innerHTML = '<div class="font-bold text-sm text-white">' + (name || '') + '</div>' + (msg ? '<div class="text-xs text-stone-300 mt-1 italic font-serif">"' + msg + '"</div>' : '');
                modal.style.display = 'flex';
              });
            });
          }

          bindLightbox();

          const modalEl = document.getElementById('galleryPreviewModal');
          const closeBtnEl = document.getElementById('closeModalBtn');
          if (modalEl) {
            modalEl.addEventListener('click', (e) => {
              if (e.target === modalEl) modalEl.style.display = 'none';
            });
          }
          if (closeBtnEl) {
            closeBtnEl.addEventListener('click', (e) => {
              e.stopPropagation();
              if (modalEl) modalEl.style.display = 'none';
            });
          }
        });
      `,
        }}
      />
    </main>
  );
}
