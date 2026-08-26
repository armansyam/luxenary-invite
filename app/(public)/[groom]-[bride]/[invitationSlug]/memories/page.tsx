import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { getGoogleDriveFolderPhotos } from "@/lib/driveHelper";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ groom: string; bride: string; invitationSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groom, bride, invitationSlug } = await params;
  const invitation = await prisma.invitation.findUnique({
    where: {
      groomSlug_brideSlug_invitationSlug: {
        groomSlug: groom,
        brideSlug: bride,
        invitationSlug: invitationSlug,
      },
    },
  });

  if (!invitation) return {};

  const coupleName = `${invitation.groomNickname || "Pria"} & ${invitation.brideNickname || "Wanita"}`;
  return {
    title: `Galeri Kenangan Tamu — ${coupleName} | Luxenary Invite`,
    description: `Kumpulan foto candid dan video ucapan dari sahabat & keluarga di pernikahan ${coupleName}.`,
  };
}

export default async function GuestMemoriesGalleryPage({ params }: PageProps) {
  const { groom, bride, invitationSlug } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: {
      groomSlug_brideSlug_invitationSlug: {
        groomSlug: groom,
        brideSlug: bride,
        invitationSlug: invitationSlug,
      },
    },
    include: {
      guestMemories: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  let memories: any[] = invitation.guestMemories || [];

  const coupleName = `${invitation.groomNickname || "Didan"} & ${invitation.brideNickname || "Nasha"}`;
  const invitationUrl = `/${invitation.groomSlug}-${invitation.brideSlug}/${invitation.invitationSlug}`;

  // Random 10 highlights for top story circles
  const shuffledMemories = [...memories].sort(() => 0.5 - Math.random()).slice(0, 10);
  const photoMemories = memories.filter((m) => m.mediaType !== "VIDEO");
  const videoMemories = memories.filter((m) => m.mediaType === "VIDEO");

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
          MEMORY VAULT
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
            <span>BAGIKAN MOMEN ANDA</span>
          </button>
        </div>
      </section>

      {/* ── Instagram Story Highlights Rail ("Kami Sudah Membagikan Momen") ── */}
      {shuffledMemories.length > 0 && (
        <section className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Kami Sudah Membagikan Momen
            </span>
            <span className="text-[10px] text-stone-500 font-mono">Geser &rarr;</span>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
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
                    {item.mediaType === "VIDEO" ? (
                      <div className="w-full h-full bg-stone-800 flex items-center justify-center text-xs">
                        <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt={item.senderName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
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

      {/* ── Interactive Tab Switcher & Count ── */}
      <section className="px-4 mt-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 p-1 bg-stone-900/90 rounded-2xl border border-white/10 max-w-md mx-auto">
          <button
            type="button"
            id="tabAll"
            className="flex-1 py-2 text-xs font-bold rounded-xl transition bg-amber-500 text-stone-950 shadow-xs"
          >
            Semua ({memories.length})
          </button>
          <button
            type="button"
            id="tabPhoto"
            className="flex-1 py-2 text-xs font-bold rounded-xl transition text-stone-400 hover:text-white"
          >
            Foto ({photoMemories.length})
          </button>
          <button
            type="button"
            id="tabVideo"
            className="flex-1 py-2 text-xs font-bold rounded-xl transition text-stone-400 hover:text-white"
          >
            Video ({videoMemories.length})
          </button>
        </div>
      </section>

      {/* ── Seamless Masonry Media Grid ── */}
      <section className="px-4 pt-6 max-w-4xl mx-auto">
        {memories.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-200">Belum Ada Momen yang Dibagikan</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              Jadilah yang pertama mengabadikan dan membagikan momen seru bersama kedua mempelai!
            </p>
          </div>
        ) : (
          <div
            id="memoriesMasonry"
            className="columns-2 sm:columns-3 gap-3.5 [column-fill:_balance] space-y-3.5"
          >
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
                  {m.mediaType === "VIDEO" ? (
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                      <video src={m.mediaUrl} playsInline preload="metadata" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                        <div className="w-10 h-10 rounded-full bg-amber-500/90 text-stone-950 flex items-center justify-center font-bold pl-0.5 shadow-lg">
                          ▶
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={m.mediaUrl}
                      alt={`Momen dari ${m.senderName}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
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

      {/* ── Client Scripts for Tabs, Modal, and Lightbox ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const tabAll = document.getElementById('tabAll');
          const tabPhoto = document.getElementById('tabPhoto');
          const tabVideo = document.getElementById('tabVideo');
          const cards = document.querySelectorAll('.memory-grid-card');

          function setFilter(type) {
            cards.forEach(card => {
              if (type === 'ALL' || card.getAttribute('data-type') === type) {
                card.style.display = 'block';
              } else {
                card.style.display = 'none';
              }
            });
            [tabAll, tabPhoto, tabVideo].forEach(btn => {
              btn.className = "flex-1 py-2 text-xs font-bold rounded-xl transition text-stone-400 hover:text-white";
            });
            if (type === 'ALL') tabAll.className = "flex-1 py-2 text-xs font-bold rounded-xl transition bg-amber-500 text-stone-950 shadow-xs";
            if (type === 'PHOTO') tabPhoto.className = "flex-1 py-2 text-xs font-bold rounded-xl transition bg-amber-500 text-stone-950 shadow-xs";
            if (type === 'VIDEO') tabVideo.className = "flex-1 py-2 text-xs font-bold rounded-xl transition bg-amber-500 text-stone-950 shadow-xs";
          }

          if (tabAll) tabAll.addEventListener('click', () => setFilter('ALL'));
          if (tabPhoto) tabPhoto.addEventListener('click', () => setFilter('PHOTO'));
          if (tabVideo) tabVideo.addEventListener('click', () => setFilter('VIDEO'));

          // Open Upload Modal Trigger
          const openBtn = document.getElementById('openModalTrigger');
          const uploadModal = document.getElementById('memoryUploadModal');
          const closeUploadBtn = document.getElementById('closeUploadModalBtn');

          if (openBtn && uploadModal) {
            openBtn.addEventListener('click', () => { uploadModal.style.display = 'flex'; });
          }
          if (closeUploadBtn && uploadModal) {
            closeUploadBtn.addEventListener('click', () => { uploadModal.style.display = 'none'; });
          }

          // Handle Upload Form Submit with Canvas Compression and Progress Bar
          const uploadForm = document.getElementById('pageMemoryUploadForm');
          if (uploadForm) {
            uploadForm.addEventListener('submit', async function(e) {
              e.preventDefault();
              const submitBtn = document.getElementById('pageMemorySubmitBtn');
              const progressBox = document.getElementById('pageMemoryProgressBox');
              const progressBar = document.getElementById('pageMemoryProgressBar');
              const progressText = document.getElementById('pageMemoryProgressText');
              const successBox = document.getElementById('pageMemorySuccessBox');
              const fileInput = document.getElementById('pageMemoryFileInput');

              if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                alert('Silakan pilih foto atau video terlebih dahulu.');
                return;
              }

              const rawFile = fileInput.files[0];
              if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; }
              if (progressBox) progressBox.style.display = 'block';
              if (progressBar) progressBar.style.width = '20%';
              if (progressText) progressText.textContent = 'Menyiapkan & mengompres media...';

              let optimizedFile = rawFile;
              if (rawFile.type.startsWith('image/')) {
                try {
                  optimizedFile = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width;
                        let h = img.height;
                        const maxDim = 1920;
                        if (w > maxDim || h > maxDim) {
                          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                          else { w = Math.round((w * maxDim) / h); h = maxDim; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        canvas.toBlob((blob) => {
                          if (blob) {
                            resolve(new File([blob], rawFile.name.replace(/\\.[^/.]+$/, '') + '.webp', { type: 'image/webp' }));
                          } else {
                            resolve(rawFile);
                          }
                        }, 'image/webp', 0.85);
                      };
                      img.src = re.target.result;
                    };
                    reader.readAsDataURL(rawFile);
                  });
                } catch {}
              }

              if (progressBar) progressBar.style.width = '65%';
              if (progressText) progressText.textContent = 'Mengunggah ke album pengantin...';

              const fd = new FormData(uploadForm);
              fd.set('file', optimizedFile);
              fd.set('mediaType', optimizedFile.type.startsWith('video/') ? 'VIDEO' : 'PHOTO');

              try {
                const res = await fetch('/api/public/memories/upload', {
                  method: 'POST',
                  body: fd,
                });
                const data = await res.json();
                if (data.success) {
                  if (progressBar) progressBar.style.width = '100%';
                  if (progressBox) progressBox.style.display = 'none';
                  if (successBox) {
                    successBox.style.display = 'block';
                    successBox.textContent = '✓ ' + data.message;
                  }
                  setTimeout(() => {
                    if (uploadModal) uploadModal.style.display = 'none';
                    window.location.reload();
                  }, 1500);
                } else {
                  throw new Error(data.error || 'Gagal mengunggah.');
                }
              } catch (err) {
                alert(err.message || 'Terjadi kesalahan saat mengunggah.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
                if (progressBox) progressBox.style.display = 'none';
              }
            });
          }

          // ── SSE Real-Time Updates & Toast Logic ──
          const invitationId = "${invitation.id}";
          const sseEventSource = new EventSource('/api/sse/memories?invitationId=' + invitationId);
          let newMemoriesQueue = [];
          const toast = document.getElementById('liveToastIndicator');
          const toastCount = document.getElementById('liveToastCount');
          const masonryContainer = document.getElementById('memoriesMasonry');

          sseEventSource.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              // Only add if we don't already have it in DOM to prevent duplicates
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

          if (toast) {
            toast.addEventListener('click', function() {
              if (!masonryContainer) return;
              
              let newHtml = '';
              newMemoriesQueue.reverse().forEach(m => {
                const dateStr = new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                const mediaHtml = m.mediaType === 'VIDEO' 
                  ? \`<div class="relative aspect-video bg-black flex items-center justify-center">
                      <video src="\${m.mediaUrl}" playsInline preload="metadata" class="w-full h-full object-cover"></video>
                      <div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                        <div class="w-10 h-10 rounded-full bg-amber-500/90 text-stone-950 flex items-center justify-center font-bold pl-0.5 shadow-lg">▶</div>
                      </div>
                    </div>\`
                  : \`<img src="\${m.mediaUrl}" alt="\${m.senderName}" loading="lazy" class="w-full object-cover group-hover:scale-105 transition-transform duration-300" />\`;
                  
                const msgHtml = m.message 
                  ? \`<p class="text-[11px] text-stone-400 mt-1 line-clamp-2 italic font-serif leading-relaxed">“\${m.message}”</p>\` 
                  : '';

                newHtml += \`
                  <div 
                    data-memory-id="\${m.id}"
                    data-type="\${m.mediaType}"
                    class="memory-grid-card break-inside-avoid rounded-2xl overflow-hidden bg-stone-900/80 border border-white/10 hover:border-amber-400/50 transition duration-200 shadow-md group cursor-pointer"
                    data-media-url="\${m.mediaUrl}"
                    data-sender-name="\${m.senderName}"
                    data-message="\${m.message || ''}"
                  >
                    <div class="relative overflow-hidden bg-stone-900">\${mediaHtml}</div>
                    <div class="p-3 bg-stone-900/90">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-stone-100 truncate">\${m.senderName}</span>
                        <span class="text-[10px] text-stone-500 shrink-0 font-mono">\${dateStr}</span>
                      </div>
                      \${msgHtml}
                    </div>
                  </div>
                \`;
              });

              masonryContainer.insertAdjacentHTML('afterbegin', newHtml);
              newMemoriesQueue = [];
              toast.style.transform = 'translateY(150%)';
              toast.style.opacity = '0';
              
              // Re-bind lightbox clicks for new items
              bindLightbox();
            });
          }

          function bindLightbox() {
            document.querySelectorAll('.memory-grid-card').forEach(el => {
              if (el.dataset.bound) return; // Prevent double binding
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

                if (type === 'VIDEO') {
                  content.innerHTML = '<video src="' + url + '" controls autoplay playsinline class="max-h-[75vh] max-w-full rounded-2xl shadow-2xl bg-black"></video>';
                } else {
                  content.innerHTML = '<img src="' + url + '" class="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl" />';
                }

                caption.innerHTML = '<div class="font-bold text-sm text-white">' + (name || '') + '</div>' + (msg ? '<div class="text-xs text-stone-300 mt-1 italic font-serif">“' + msg + '”</div>' : '');

                modal.style.display = 'flex';
              });
            });
          }
          
          // Initial bind
          bindLightbox();
        });
      `,
        }}
      />

      {/* ── Live Toast Notification (Hidden by default) ── */}
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

      {/* ── Guest Upload Modal ── */}
      <div
        id="memoryUploadModal"
        style={{ display: "none" }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center"
      >
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-7 max-w-md w-full text-white shadow-2xl relative space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="font-bold font-serif text-base text-stone-100">Kirim Momen Spesial</h3>
              <p className="text-[11px] text-stone-400">Bagikan foto/video candid ke album pengantin</p>
            </div>
            <button
              type="button"
              id="closeUploadModalBtn"
              className="text-stone-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form id="pageMemoryUploadForm" className="space-y-3.5">
            <input type="hidden" name="invitationId" value={invitation.id} />

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">Nama Anda *</label>
              <input
                type="text"
                name="senderName"
                required
                placeholder="Contoh: Dimas &amp; Ratih"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">Email / Kontak *</label>
              <input
                type="email"
                name="senderEmail"
                required
                placeholder="email@anda.com"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">Pesan / Cerita di Balik Foto</label>
              <textarea
                name="message"
                rows={2}
                placeholder="Tulis ucapan singkat..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-sans resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">Pilih Foto atau Video *</label>
              <input
                type="file"
                id="pageMemoryFileInput"
                name="file"
                required
                accept="image/*,video/*"
                className="w-full text-xs text-stone-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-stone-950 hover:file:bg-amber-500 cursor-pointer"
              />
            </div>

            {/* Progress Container */}
            <div id="pageMemoryProgressBox" style={{ display: "none" }} className="space-y-1.5 pt-2">
              <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                <div id="pageMemoryProgressBar" className="bg-gradient-to-r from-amber-600 to-amber-400 h-full w-0 transition-all duration-300"></div>
              </div>
              <p id="pageMemoryProgressText" className="text-[10px] text-amber-400 font-mono text-center">Menyiapkan...</p>
            </div>

            {/* Success Box */}
            <div id="pageMemorySuccessBox" style={{ display: "none" }} className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold text-center"></div>

            <button
              type="submit"
              id="pageMemorySubmitBtn"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Kirim ke Album Pengantin
            </button>
          </form>
        </div>
      </div>

      {/* ── Lightbox Preview Modal ── */}
      <div
        id="galleryPreviewModal"
        style={{ display: "none" }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.style.display = "none";
          }
        }}
      >
        <button
          type="button"
          onClick={() => {
            const m = document.getElementById("galleryPreviewModal");
            if (m) m.style.display = "none";
          }}
          className="absolute top-4 right-4 text-white text-2xl font-bold p-2 hover:opacity-80 transition cursor-pointer"
        >
          ✕
        </button>
        <div id="previewModalContent" className="max-w-3xl w-full flex items-center justify-center"></div>
        <div id="previewModalCaption" className="mt-4 text-center max-w-md"></div>
      </div>
    </main>
  );
}
