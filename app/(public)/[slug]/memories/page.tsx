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

  const memoriesJson = JSON.stringify(
    memories.map((m: any) => ({
      id: m.id,
      mediaUrl: m.mediaUrl,
      senderName: m.senderName,
      message: m.message || "",
      createdAt: m.createdAt,
      mediaType: m.mediaType,
    }))
  );

  return (
    <main
      className="min-h-screen bg-stone-950 text-stone-100 antialiased font-sans pb-24 selection:bg-amber-500/30 select-none"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === "IMG" || t.closest(".memory-clickable") || t.closest("#galleryPreviewModal"))) {
          e.preventDefault();
        }
      }}
    >
      {/* ── Top Navigation & Back Link ── */}
      <header className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-3.5">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          <Link
            href={invitationUrl}
            className="text-xs font-semibold text-stone-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
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
        </div>
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
        <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4 mb-3 px-1 text-center">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase font-mono flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Kami Sudah Membagikan Momen ({shuffledMemories.length})
            </span>
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
            {shuffledMemories.map((item, idx) => (
              <div
                key={`story-${item.id}-${idx}`}
                className="memory-clickable flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
                data-memory-id={item.id}
                data-media-url={item.mediaUrl}
                data-sender-name={item.senderName}
                data-message={item.message || ""}
                data-type={item.mediaType}
              >
                <div
                  className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 group-hover:scale-105 transition-transform duration-200 select-none shadow-md shadow-amber-500/10"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950 pointer-events-none select-none">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.senderName}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      style={{ WebkitTouchCallout: "none" }}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-stone-300 group-hover:text-white font-medium truncate max-w-[68px] text-center">
                  {item.senderName.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Masonry Media Grid Fluid Full-Width ── */}
      <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4">
        {memories.length === 0 ? (
          <div className="max-w-xl mx-auto p-12 sm:p-16 text-center rounded-[2rem] bg-gradient-to-b from-stone-900/90 to-stone-950 border border-white/5 mt-8 shadow-2xl relative overflow-hidden">
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
          <div id="memoriesMasonry" className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7 gap-3 sm:gap-3.5 space-y-3 sm:space-y-3.5">
            {memories.map((m) => (
              <div
                key={m.id}
                data-memory-id={m.id}
                data-type={m.mediaType}
                className="memory-clickable memory-grid-card break-inside-avoid rounded-2xl overflow-hidden bg-stone-900/80 border border-white/10 hover:border-amber-400/50 transition duration-200 shadow-md group cursor-pointer"
                data-media-url={m.mediaUrl}
                data-sender-name={m.senderName}
                data-message={m.message || ""}
              >
                <div
                  className="relative overflow-hidden bg-stone-900 select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={m.mediaUrl}
                    alt={`Momen dari ${m.senderName}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    style={{ WebkitTouchCallout: "none" }}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-[10px] sm:text-[11px] text-white font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Perbesar</span>
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-stone-900/90">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-amber-400 truncate max-w-[130px] sm:max-w-[150px]">{m.senderName}</span>
                    <span className="text-[10px] text-stone-500 shrink-0 font-mono">
                      {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {m.message && (
                    <p className="text-[11px] text-stone-300 mt-1 line-clamp-2 italic font-serif leading-relaxed">
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

      {/* ── Lightbox Preview Modal Bebas Ikon Panah (Touch Swipe & Keyboard Arrow) ── */}
      <div
        id="galleryPreviewModal"
        style={{ display: "none" }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md p-4 flex flex-col items-center justify-center cursor-pointer select-none animate-in fade-in duration-200"
      >
        <div
          id="previewModalCard"
          className="bg-[#121215] border border-stone-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-150 cursor-default"
        >
          {/* Tombol Tutup Minimalis */}
          <button
            type="button"
            id="closeModalBtn"
            className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer border border-white/10"
            aria-label="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div id="previewModalContent" className="bg-black max-h-[65vh] flex items-center justify-center overflow-hidden relative"></div>
          <div id="previewModalCaption" className="p-5 sm:p-6 bg-[#121215]"></div>
        </div>
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
          const initialMemories = ${memoriesJson};
          let currentActiveIndex = 0;

          if (toast) {
            toast.addEventListener('click', function() {
              window.location.reload();
            });
          }

          sseEventSource.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data && data.id && !document.querySelector('[data-memory-id="' + data.id + '"]')) {
                newMemoriesQueue.push(data);
                if (toast && toastCount) {
                  toastCount.textContent = newMemoriesQueue.length;
                  toast.style.transform = 'translateY(0)';
                  toast.style.opacity = '1';
                }
              }
            } catch (e) {}
          };

          function showPhotoAt(idx) {
            if (!initialMemories || initialMemories.length === 0) return;
            if (idx < 0) idx = initialMemories.length - 1;
            if (idx >= initialMemories.length) idx = 0;
            currentActiveIndex = idx;
            const item = initialMemories[idx];
            const modal = document.getElementById('galleryPreviewModal');
            const content = document.getElementById('previewModalContent');
            const caption = document.getElementById('previewModalCaption');
            if (content) {
              content.innerHTML = '<div class="relative select-none pointer-events-none flex items-center justify-center max-h-[65vh] w-full" style="-webkit-touch-callout:none;"><img src="' + item.mediaUrl + '" alt="' + (item.senderName || '') + '" class="max-h-[65vh] w-auto object-contain transition-all duration-300 pointer-events-none select-none" draggable="false" style="-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;" /></div>';
            }
            if (caption) {
              caption.innerHTML = '<div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2"><h3 class="text-base font-bold text-white select-none">' + (item.senderName || '') + '</h3><span class="text-[10px] font-mono text-amber-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-full">' + (idx + 1) + ' / ' + initialMemories.length + '</span></div><span class="text-xs text-stone-500 font-mono">' + new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + '</span></div>' + (item.message ? '<p class="text-sm text-stone-300 leading-relaxed font-serif italic text-left select-none">"' + item.message + '"</p>' : '') + '<div class="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400"><span class="hidden sm:inline">Navigasi: Tombol panah keyboard ← / →</span><span class="sm:hidden">Geser (swipe) kiri/kanan untuk foto lain</span><span class="text-stone-500 font-mono">Esc / Klik luar untuk tutup</span></div>';
            }
            if (modal) {
              modal.style.display = 'flex';
            }
          }

          function nextPhoto() {
            showPhotoAt(currentActiveIndex + 1);
          }

          function prevPhoto() {
            showPhotoAt(currentActiveIndex - 1);
          }

          // Keyboard arrow navigation (Desktop)
          document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('galleryPreviewModal');
            if (!modal || modal.style.display === 'none') return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              nextPhoto();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              prevPhoto();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              modal.style.display = 'none';
            }
          });

          // Touch swipe gesture navigation (Mobile)
          const modalEl = document.getElementById('galleryPreviewModal');
          const modalCardEl = document.getElementById('previewModalCard');
          let touchStartX = null;
          let touchStartY = null;

          if (modalEl) {
            modalEl.addEventListener('touchstart', function(e) {
              if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
              }
            }, { passive: true });

            modalEl.addEventListener('touchend', function(e) {
              if (touchStartX === null) return;
              const deltaX = e.changedTouches[0].clientX - touchStartX;
              const deltaY = e.changedTouches[0].clientY - (touchStartY || 0);

              if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < 0) {
                  nextPhoto(); // Swipe kiri -> Next
                } else {
                  prevPhoto(); // Swipe kanan -> Prev
                }
              }
              touchStartX = null;
              touchStartY = null;
            }, { passive: true });

            modalEl.addEventListener('contextmenu', function(e) { e.preventDefault(); });
            modalEl.addEventListener('click', function(e) {
              if (e.target === modalEl) modalEl.style.display = 'none';
            });
          }

          // Proteksi anti-save gambar & blokir klik kanan dokumen menyeluruh
          document.addEventListener('contextmenu', function(e) {
            if (e.target && (e.target.tagName === 'IMG' || e.target.closest('img') || e.target.closest('.memory-clickable') || e.target.closest('#galleryPreviewModal'))) {
              e.preventDefault();
            }
          });

          if (modalCardEl) {
            modalCardEl.addEventListener('click', function(e) {
              e.stopPropagation();
            });
          }

          // Bind all clickable items (story rail & masonry cards)
          document.querySelectorAll('.memory-clickable').forEach(function(el) {
            el.addEventListener('click', function() {
              const memId = el.getAttribute('data-memory-id');
              const idx = initialMemories.findIndex(function(m) { return String(m.id) === String(memId); });
              showPhotoAt(idx !== -1 ? idx : 0);
            });
          });

          const closeBtnEl = document.getElementById('closeModalBtn');
          if (closeBtnEl) {
            closeBtnEl.addEventListener('click', function(e) {
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
