import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdminSetting, hasPlanCapability } from "@/lib/settings";

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

  // Cek kapabilitas guest_memories secara dinamis berdasarkan konfigurasi admin
  const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
  if (!canAccessMemories) {
    redirect(`/${slug}`);
  }

  const memories: any[] = invitation.guestMemories || [];
  const coupleName = `${invitation.groomNickname || "Mempelai Pria"} & ${invitation.brideNickname || "Mempelai Wanita"}`;
  const invitationUrl = `/${slug}`;

  // ── 1. PARSE FEATURE SETTINGS & DELAYED REVEAL STATUS ──
  const fs = (() => {
    try {
      return typeof invitation.featureSettings === "object"
        ? invitation.featureSettings
        : JSON.parse(invitation.featureSettings || "{}");
    } catch {
      return {};
    }
  })();

  const isDelayedReveal = Boolean(fs.memoriesDelayedReveal);
  const isCustomSchedule = Boolean(fs.memoriesCustomSchedule);

  let eventEndTime: Date | null = null;
  if (isCustomSchedule && fs.memoriesEndTime) {
    const parsed = new Date(fs.memoriesEndTime);
    if (!isNaN(parsed.getTime())) eventEndTime = parsed;
  } else if (invitation.eventData) {
    try {
      const ev = typeof invitation.eventData === "object" ? invitation.eventData : JSON.parse(invitation.eventData);
      const receptionDate = ev.receptionDate || ev.date;
      const receptionEndTime = ev.receptionEndTime || ev.endTime || "23:59";
      if (receptionDate) {
        const parsed = new Date(`${receptionDate}T${receptionEndTime}:00`);
        if (!isNaN(parsed.getTime())) eventEndTime = parsed;
      }
    } catch {}
  }

  const now = new Date();
  const isDarkroomActive = isDelayedReveal && eventEndTime !== null && now < eventEndTime;

  // ── 2. KELOMPOKKAN FOTO MENJADI ROLL STACK PER TAMU (OPSI B) ──
  interface StackPhoto {
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    createdAt: string;
    message?: string;
  }

  interface GuestRollStack {
    key: string;
    senderName: string;
    senderEmail: string;
    message: string;
    photos: StackPhoto[];
    coverPhoto: string;
    photoCount: number;
    latestCreatedAt: string;
  }

  const rollStacksMap = new Map<string, GuestRollStack>();

  for (const m of memories) {
    const rawKey = (m.senderEmail && m.senderEmail !== "guest@system" && m.senderEmail !== "guest@moment.com")
      ? m.senderEmail
      : m.senderName.trim().toLowerCase();

    if (!rollStacksMap.has(rawKey)) {
      rollStacksMap.set(rawKey, {
        key: rawKey,
        senderName: m.senderName || "Tamu Undangan",
        senderEmail: m.senderEmail || "",
        message: m.message || "",
        photos: [],
        coverPhoto: m.mediaUrl,
        photoCount: 0,
        latestCreatedAt: m.createdAt,
      });
    }

    const stack = rollStacksMap.get(rawKey)!;
    stack.photos.push({
      id: m.id,
      mediaUrl: m.mediaUrl,
      thumbnailUrl: m.thumbnailUrl || m.mediaUrl,
      createdAt: m.createdAt,
      message: m.message || "",
    });
    stack.photoCount = stack.photos.length;
    if (!stack.message && m.message) {
      stack.message = m.message;
    }
  }

  const rollStacks = Array.from(rollStacksMap.values());
  const shuffledStoryStacks = [...rollStacks].sort(() => 0.5 - Math.random()).slice(0, 10);

  const rollStacksJson = JSON.stringify(rollStacks);

  // ── JIKA KAMAR GELAP DIGITAL MASIH AKTIF (DELAYED REVEAL) ──
  if (isDarkroomActive) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500/30 select-none">
        <header className="sticky top-0 z-40 bg-stone-950/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3.5">
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href={invitationUrl}
              className="text-xs font-semibold text-stone-300 hover:text-white flex items-center gap-1.5 transition"
            >
              <span>&larr;</span>
              <span>Kembali ke Undangan</span>
            </Link>
            <Link
              href={`${invitationUrl}/sharemoment`}
              className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              <span>Buka Kamera</span>
            </Link>
          </div>
        </header>

        <section className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full bg-stone-900/90 border border-amber-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
            
            {/* Animasi Ikon Film Roll Kamar Gelap */}
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <svg className="w-10 h-10 animate-spin" style={{ animationDuration: "12s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
                Kamar Gelap Digital Aktif
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                Foto Sedang Dicuci &amp; Dicetak
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-md mx-auto pt-1 font-serif italic">
                &ldquo;Sesuai konsep kamera disposable retro, seluruh momen candid yang diabadikan oleh para tamu sedang diproses secara rahasia dan akan dibuka serentak setelah acara resepsi selesai.&rdquo;
              </p>
            </div>

            {/* Status Jam Buka */}
            <div className="p-4 bg-stone-950/70 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">Jadwal Rilis Galeri:</span>
                  {eventEndTime
                    ? `${eventEndTime.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • ${eventEndTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
                    : "Setelah Resepsi Selesai"}
              </div>
              <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[11px] font-mono font-bold text-amber-300">
                {memories.length} Foto Terkumpul
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`${invitationUrl}/sharemoment`}
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-amber-900/30 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                <span>Ambil Foto Sekarang (Buka Kamera)</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ── 3. RENDER GALERI UTAMA (OPSI B: MASONRY ROLL STACK) ──
  return (
    <main
      className="min-h-screen bg-stone-950 text-stone-100 antialiased font-sans pb-24 selection:bg-amber-500/30 select-none"
      style={{ WebkitTouchCallout: "none" }}
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
          &ldquo;Koleksi roll foto kenangan candid dan ucapan penuh kehangatan dari para tamu terkasih.&rdquo;
        </p>
      </section>

      {/* ── Story Highlights Rail ── */}
      {shuffledStoryStacks.length > 0 && (
        <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4 mb-3 px-1 text-center">
            <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase font-mono flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Kontributor Roll Kenangan ({rollStacks.length})
            </span>
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
            {shuffledStoryStacks.map((stack) => (
              <div
                key={`story-${stack.key}`}
                className="memory-clickable flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer group"
                data-stack-key={stack.key}
              >
                <div
                  className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 group-hover:scale-105 transition-transform duration-200 select-none shadow-md shadow-amber-500/10 relative"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-900 border-2 border-stone-950 pointer-events-none select-none">
                    <img
                      src={stack.coverPhoto}
                      alt={stack.senderName}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      style={{ WebkitTouchCallout: "none" }}
                    />
                  </div>
                  {stack.photoCount > 1 && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-stone-900 border border-amber-400 text-amber-300 rounded-full text-[9px] font-mono font-bold">
                      {stack.photoCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-300 group-hover:text-white font-medium truncate max-w-[68px] text-center">
                  {stack.senderName.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Masonry Media Grid: 1 Card per Guest Roll Stack (Opsi B) ── */}
      <section className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4">
        {rollStacks.length === 0 ? (
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
          <div id="memoriesMasonry" className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
            {rollStacks.map((stack) => (
              <div
                key={stack.key}
                data-stack-key={stack.key}
                className="memory-clickable roll-stack-card break-inside-avoid rounded-2xl overflow-hidden bg-stone-900/90 border border-white/10 hover:border-amber-400/60 transition duration-300 shadow-lg hover:shadow-amber-500/10 group cursor-pointer relative"
              >
                {/* Efek Visual Tumpukan Foto Berlapis di Belakang */}
                {stack.photoCount > 1 && (
                  <div className="absolute -top-1 -right-1 inset-x-1 h-full bg-stone-800/80 rounded-2xl -z-10 border border-white/5 pointer-events-none" />
                )}
                {stack.photoCount > 2 && (
                  <div className="absolute -top-2 -right-2 inset-x-2 h-full bg-stone-800/50 rounded-2xl -z-20 border border-white/5 pointer-events-none" />
                )}

                {/* Foto Sampul Roll */}
                <div
                  className="relative overflow-hidden bg-stone-900 select-none"
                >
                  <img
                    src={stack.coverPhoto}
                    alt={`Roll momen dari ${stack.senderName}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    style={{ WebkitTouchCallout: "none" }}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                  />

                  {/* Floating Pill Badge: Jumlah Foto Roll */}
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md border border-white/15 rounded-full flex items-center gap-1.5 shadow-md">
                    <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-mono font-bold text-amber-300">
                      {stack.photoCount} Foto
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-[10px] sm:text-[11px] text-white font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Buka Roll ({stack.photoCount} Foto)</span>
                    </span>
                  </div>
                </div>

                {/* Info Tamu & Doa Tunggal (Bebas Duplikasi) */}
                <div className="p-3 bg-stone-900/95 border-t border-white/5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-amber-400 truncate max-w-[130px] sm:max-w-[150px]">
                      {stack.senderName}
                    </span>
                    <span className="text-[10px] text-stone-500 shrink-0 font-mono">
                      {new Date(stack.latestCreatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {stack.message && (
                    <p className="text-[11px] text-stone-300 mt-1 line-clamp-2 italic font-serif leading-relaxed">
                      &ldquo;{stack.message}&rdquo;
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

      {/* ── Roll Stack Lightbox Modal (Bisa Swipe/Pindah Foto dalam Roll Tamu) ── */}
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
      {rollStacks.length > 0 && (
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

      {/* ── Client Scripts untuk Roll Stack Modal & SSE ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const invitationId = "${invitation.id}";
          const sseEventSource = new EventSource('/api/sse/memories?invitationId=' + invitationId);
          let newMemoriesQueue = [];
          const toast = document.getElementById('liveToastIndicator');
          const toastCount = document.getElementById('liveToastCount');
          const allStacks = ${rollStacksJson};
          let activeStack = null;
          let activePhotoIndex = 0;

          if (toast) {
            toast.addEventListener('click', function() {
              window.location.reload();
            });
          }

          sseEventSource.onmessage = function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data && data.id) {
                newMemoriesQueue.push(data);
                if (toast && toastCount) {
                  toastCount.textContent = newMemoriesQueue.length;
                  toast.style.transform = 'translateY(0)';
                  toast.style.opacity = '1';
                }
              }
            } catch (e) {}
          };

          function renderStackPhoto(photoIdx) {
            if (!activeStack || !activeStack.photos || activeStack.photos.length === 0) return;
            if (photoIdx < 0) photoIdx = activeStack.photos.length - 1;
            if (photoIdx >= activeStack.photos.length) photoIdx = 0;
            activePhotoIndex = photoIdx;

            const photo = activeStack.photos[photoIdx];
            const modal = document.getElementById('galleryPreviewModal');
            const content = document.getElementById('previewModalContent');
            const caption = document.getElementById('previewModalCaption');

            if (content) {
              let html = '<div class="relative select-none pointer-events-none flex items-center justify-center max-h-[65vh] w-full" style="-webkit-touch-callout:none;">';
              html += '<img src="' + photo.mediaUrl + '" alt="' + (activeStack.senderName || '') + '" class="max-h-[65vh] w-auto object-contain transition-all duration-300 pointer-events-none select-none" draggable="false" style="-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;" />';
              
              // Tombol Panah Navigasi Kiri & Kanan jika foto dalam roll > 1
              if (activeStack.photos.length > 1) {
                html += '<button type="button" id="prevRollPhotoBtn" class="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>';
                html += '<button type="button" id="nextRollPhotoBtn" class="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition cursor-pointer"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>';
              }
              html += '</div>';
              content.innerHTML = html;

              // Bind tombol panah
              const prevBtn = document.getElementById('prevRollPhotoBtn');
              const nextBtn = document.getElementById('nextRollPhotoBtn');
              if (prevBtn) {
                prevBtn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  renderStackPhoto(activePhotoIndex - 1);
                });
              }
              if (nextBtn) {
                nextBtn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  renderStackPhoto(activePhotoIndex + 1);
                });
              }
            }

            if (caption) {
              let capHtml = '<div class="flex items-center justify-between mb-2">';
              capHtml += '<div class="flex items-center gap-2">';
              capHtml += '<h3 class="text-base font-bold text-white select-none">' + activeStack.senderName + '</h3>';
              capHtml += '<span class="text-[10px] font-mono text-amber-400 bg-stone-900 border border-stone-800 px-2.5 py-0.5 rounded-full font-bold">' + (photoIdx + 1) + ' / ' + activeStack.photos.length + ' Roll</span>';
              capHtml += '</div>';
              capHtml += '<span class="text-xs text-stone-500 font-mono">' + new Date(photo.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + '</span>';
              capHtml += '</div>';

              // Pesan doa
              if (activeStack.message) {
                capHtml += '<p class="text-sm text-stone-300 leading-relaxed font-serif italic text-left select-none">"' + activeStack.message + '"</p>';
              }

              // Deretan Thumbnail Roll jika foto > 1
              if (activeStack.photos.length > 1) {
                capHtml += '<div class="flex items-center gap-2 mt-3 pt-3 border-t border-stone-800/80 overflow-x-auto pb-1">';
                activeStack.photos.forEach(function(p, pIdx) {
                  const isActive = pIdx === photoIdx;
                  capHtml += '<button type="button" data-photo-idx="' + pIdx + '" class="roll-thumb-btn w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition ' + (isActive ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/20' : 'border-white/10 opacity-50 hover:opacity-100') + '">';
                  capHtml += '<img src="' + (p.thumbnailUrl || p.mediaUrl) + '" class="w-full h-full object-cover pointer-events-none" />';
                  capHtml += '</button>';
                });
                capHtml += '</div>';
              }

              capHtml += '<div class="mt-3 text-[11px] text-stone-500 flex items-center justify-between">';
              capHtml += '<span>Geser (swipe) atau gunakan tombol panah ← / →</span>';
              capHtml += '<span class="font-mono">Esc untuk tutup</span>';
              capHtml += '</div>';

              caption.innerHTML = capHtml;

              // Bind thumbnail clicks
              caption.querySelectorAll('.roll-thumb-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  const targetIdx = parseInt(btn.getAttribute('data-photo-idx') || '0', 10);
                  renderStackPhoto(targetIdx);
                });
              });
            }

            if (modal) {
              modal.style.display = 'flex';
            }
          }

          function openStackByKey(key) {
            const stack = allStacks.find(function(s) { return s.key === key; });
            if (stack) {
              activeStack = stack;
              activePhotoIndex = 0;
              renderStackPhoto(0);
            }
          }

          // Keyboard arrow navigation
          document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('galleryPreviewModal');
            if (!modal || modal.style.display === 'none') return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              renderStackPhoto(activePhotoIndex + 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              renderStackPhoto(activePhotoIndex - 1);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              modal.style.display = 'none';
            }
          });

          // Touch swipe gesture navigation
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
                  renderStackPhoto(activePhotoIndex + 1);
                } else {
                  renderStackPhoto(activePhotoIndex - 1);
                }
              }
              touchStartX = null;
              touchStartY = null;
            }, { passive: true });

            modalEl.addEventListener('click', function(e) {
              if (e.target === modalEl) modalEl.style.display = 'none';
            });
          }

          // Bind all clickable roll stack items
          document.querySelectorAll('.memory-clickable').forEach(function(el) {
            el.addEventListener('click', function() {
              const stackKey = el.getAttribute('data-stack-key');
              if (stackKey) openStackByKey(stackKey);
            });
          });

          document.addEventListener('contextmenu', function(e) {
            const t = e.target;
            if (t && (t.tagName === 'IMG' || (t.closest && (t.closest('.memory-clickable') || t.closest('#galleryPreviewModal'))))) {
              e.preventDefault();
            }
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
