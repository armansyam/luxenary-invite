"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getInvitationPublicUrl, resolveEffectiveInvitationUrl, getLatestEventDate } from "@/lib/domainUtils";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";

function DashboardHomeContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const msgParam = searchParams?.get("msg");
  const [invitation, setInvitation] = useState<any>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [guestMemoriesList, setGuestMemoriesList] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [stats, setStats] = useState({
    guestCount: 0,
    waSentCount: 0,
    attendingCount: 0,
    wishesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pendingGalleryOrder, setPendingGalleryOrder] = useState<any>(null);
  const [memoriesQuota, setMemoriesQuota] = useState<any>(null);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const fetchGuestMemories = useCallback(async (invId?: string) => {
    const targetId = invId || invitation?.id;
    if (!targetId) return;
    setLoadingMemories(true);
    try {
      const res = await fetch(`/api/client/invitations/${targetId}/memories`);
      const data = await res.json();
      if (data.success) {
        setGuestMemoriesList(data.memories || []);
        if (data.pendingOrder !== undefined) {
          setPendingGalleryOrder(data.pendingOrder);
        }
        if (data.quota) {
          setMemoriesQuota(data.quota);
        }
      }
    } catch (e) {
      console.error("Failed to fetch guest memories:", e);
    } finally {
      setLoadingMemories(false);
    }
  }, [invitation?.id]);

  useEffect(() => {
    fetch("/api/client/invitations", { cache: "no-store" })
      .then((res) => res.json())
      .then(async (invitations) => {
        if (Array.isArray(invitations) && invitations.length > 0) {
          const inv = invitations[0];
          setInvitation(inv);

          // Fetch platform settings & memories
          fetch("/api/public/settings")
            .then((r) => r.json())
            .then((data) => setPlatformSettings(data))
            .catch(() => null);

          fetchGuestMemories(inv.id);

          // Fetch guests & rsvp stats
          try {
            const [guestRes, rsvpRes] = await Promise.all([
              fetch(`/api/client/guests/${inv.id}`).catch(() => null),
              fetch(`/api/client/rsvps?invitationId=${inv.id}`).catch(() => null),
            ]);

            const guestData = guestRes?.ok ? await guestRes.json().catch(() => []) : [];
            const rsvpData = rsvpRes?.ok ? await rsvpRes.json().catch(() => null) : null;

            const guestCount = Array.isArray(guestData) ? guestData.length : 0;
            const waSent = Array.isArray(guestData) ? guestData.filter((g) => g.waStatus === "SENT").length : 0;
            const attending = rsvpData?.stats?.attending || 0;
            const wishes = rsvpData?.stats?.totalWishes || 0;

            setStats({
              guestCount,
              waSentCount: waSent,
              attendingCount: attending,
              wishesCount: wishes,
            });
          } catch (e) {
            console.error("Stats fetch error:", e);
          }
          setLoading(false);
        } else {
          // User belum memiliki undangan -> Cek tahapan onboarding terakhir (Resume State Machine)
          try {
            const stateRes = await fetch("/api/client/onboarding-state", { cache: "no-store" });
            const stateData = await stateRes.json();
            if (stateData.redirectUrl) {
              router.replace(stateData.redirectUrl);
              return;
            }
          } catch {}

          router.replace("/dashboard/setup");
        }
      })
      .catch(() => setLoading(false));
  }, [router, fetchGuestMemories]);

  const resolvedDomain = resolveEffectiveInvitationUrl({
    customDomain: invitation?.customDomain,
    subdomain: invitation?.subdomain,
    groomSlug: invitation?.groomSlug,
    brideSlug: invitation?.brideSlug,
    invitationSlug: invitation?.invitationSlug,
  });
  const invUrl = resolvedDomain.url;

  const planType = invitation?.order?.planType || "TRADITIONAL";
  const packageConfig = platformSettings?.packages?.find((p: any) => p.id === planType);
  const allowedCaps: string[] = packageConfig?.capabilities || (planType === "PREMIUM" ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"] : planType === "MODERN" ? ["music", "gallery", "qr_checkin", "guest_memories"] : ["music", "gallery"]);
  const hasCap = (cap: string) => allowedCaps.includes(cap);

  const featureSettings = (() => {
    try { return JSON.parse(invitation?.featureSettings || "{}"); } catch { return {}; }
  })();


  const displayOrder: string = featureSettings?.displayOrder || "GROOM_FIRST";
  const coupleDisplayName = invitation
    ? displayOrder === "BRIDE_FIRST"
      ? `${invitation.brideName || "Mempelai Wanita"} & ${invitation.groomName || "Mempelai Pria"}`
      : `${invitation.groomName || "Mempelai Pria"} & ${invitation.brideName || "Mempelai Wanita"}`
    : null;

  const handleCopyLink = () => {
    if (invitation) {
      navigator.clipboard.writeText(invUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-medium">Memuat Studio Undangan Anda...</p>
        </div>
      </div>
    );
  }

  // === 1-PAGE EVENT CLOSING STATEMENT & FINAL SUMMARY (ARCHIVED STATUS) ===
  if (invitation?.status === "ARCHIVED") {
    const latestDate = getLatestEventDate(invitation.eventData);
    const formattedEventDate = latestDate
      ? latestDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : new Date(invitation.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans animate-in fade-in duration-300 pb-12">
        {/* Luxury Memorial Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-stone-200/80 relative overflow-hidden bg-gradient-to-br from-white via-[#fcfbf9] to-amber-50/20">
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded-full text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
              <span>Acara Selesai &amp; Berkas Diarsipkan</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              Momen Bahagia Telah Terukir Sempurna
            </h1>

            <p className="text-base sm:text-lg font-serif italic text-amber-900 font-medium">
              {coupleDisplayName || "Mempelai Pria & Mempelai Wanita"}
            </p>

            <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-300 to-transparent mx-auto my-2" />

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Terima kasih telah mempercayakan perayaan momen sakral perjalanan cinta Anda kepada platform kami. Rangkaian acara pernikahan Anda telah terlaksana dengan indah dan penuh berkah.
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Sesuai standar retensi privasi sistem terpadu (14 hari pasca acara), file foto candid tamu serta tautan subdomain dan custom domain telah didaur ulang secara aman. Seluruh catatan doa restu serta rekapitulasi kehadiran tamu tetap tersimpan abadi dan dapat Anda unduh kapan saja.
            </p>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 px-1">
            Ringkasan Eksekutif &amp; Statistik Acara
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Wishes */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Doa &amp; Ucapan</span>
                <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-stone-900">{stats.wishesCount}</p>
              <span className="text-[10px] text-stone-400 block">Pesan doa restu</span>
            </div>

            {/* Attendance */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Konfirmasi Hadir</span>
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.attendingCount}</p>
              <span className="text-[10px] text-stone-400 block">Pax tamu hadir</span>
            </div>

            {/* Total Guests */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Buku Tamu</span>
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-stone-900">{stats.guestCount}</p>
              <span className="text-[10px] text-stone-400 block">Total tamu terdata</span>
            </div>

            {/* Event Date */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tanggal Acara</span>
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm sm:text-base font-bold text-stone-900 truncate mt-1.5">{formattedEventDate}</p>
              <span className="text-[10px] text-stone-400 block">Pelaksanaan acara</span>
            </div>
          </div>
        </div>

        {/* Download Center */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Pusat Unduhan Arsip Digital</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Simpan rekapitulasi data pernikahan Anda dalam format spreadsheet (.CSV) yang kompatibel dengan Microsoft Excel dan Google Sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Download Wishes */}
            <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-stone-900">Rekapan Doa &amp; Ucapan Tamu</h3>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Seluruh pesan doa restu, ucapan selamat, dan harapan hangat dari para tamu beserta waktu kirim.
                </p>
              </div>
              <a
                href={`/api/client/invitations/${invitation.id}/export?type=wishes`}
                download
                className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition text-center shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh Doa Tamu (.CSV)</span>
              </a>
            </div>

            {/* Download Guests & RSVP */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-stone-900">Rekapitulasi Kehadiran &amp; RSVP</h3>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Daftar nama tamu undangan, kategori, nomor kontak WhatsApp, kuota pax, dan status check-in acara.
                </p>
              </div>
              <a
                href={`/api/client/invitations/${invitation.id}/export?type=guests`}
                download
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition text-center shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Unduh Data Tamu &amp; Kehadiran (.CSV)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Security & Retention Notice */}
        <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200 text-xs text-stone-500 flex items-start gap-3">
          <svg className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p className="font-semibold text-stone-700">Privasi &amp; Keamanan Data Klien Terjamin</p>
            <p className="leading-relaxed">
              Akun klien Anda disimpan permanen di sistem. Anda dapat masuk kembali kapan saja untuk mengakses riwayat dan mengunduh rekapan doa restu ini. Sesuai kebijakan retensi terpadu 14 hari pasca acara, file foto dan alamat domain telah dilepaskan secara aman.
            </p>
          </div>
        </div>

        {/* Action Options */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(window.location.origin);
                alert("Tautan website disalin! Terima kasih telah merekomendasikan layanan kami kepada teman dan keluarga.");
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold rounded-xl text-xs transition border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Rekomendasikan ke Teman / Keluarga</span>
          </button>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar dari Dasbor</span>
          </button>
        </div>
      </div>
    );
  }

  const editorUrl = invitation ? `/dashboard/invitation/${invitation.id}` : "/dashboard/invitation";

  const retentionDays = Number(platformSettings?.retentionCleanupDays) || 30;
  const latestEventDate = getLatestEventDate(invitation?.eventData);
  const effectiveExpiry = invitation?.galleryExpiresAt
    ? new Date(invitation.galleryExpiresAt)
    : latestEventDate
    ? new Date(latestEventDate.getTime() + retentionDays * 24 * 60 * 60 * 1000)
    : null;

  const daysRemaining = effectiveExpiry
    ? Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const currentPlan = (invitation?.order?.planType || "TRADITIONAL").toUpperCase();
  const baseRetentionDays = retentionDays;
  const extraGalleryDays = Number(featureSettings?.extraGalleryDays) || 0;
  const hasExtended = extraGalleryDays >= 30;
  const isRenewalWindow = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const canExtend = !hasExtended && isRenewalWindow;

  const addonPricingSettings = platformSettings ? {
    priceTraditional: platformSettings.packages?.find((p: any) => p.id === "TRADITIONAL")?.price ?? 50000,
    priceModern: platformSettings.packages?.find((p: any) => p.id === "MODERN")?.price ?? 150000,
    pricePremium: platformSettings.packages?.find((p: any) => p.id === "PREMIUM")?.price ?? 250000,
    nameTraditional: platformSettings.packages?.find((p: any) => p.id === "TRADITIONAL")?.name || "Serenade",
    nameModern: platformSettings.packages?.find((p: any) => p.id === "MODERN")?.name || "Symphony",
    namePremium: platformSettings.packages?.find((p: any) => p.id === "PREMIUM")?.name || "Eternity",
    galleryExtensionPricePerMonth: platformSettings.galleryExtensionPricePerMonth ?? 50000,
    addonMemoriesTopupPrice: platformSettings.addonMemoriesTopupPrice ?? 35000,
    addonMemoriesTopupPhotos: platformSettings.addonMemoriesTopupPhotos ?? 100,
    addonMemoriesTopupEnabled: platformSettings.addonMemoriesTopupEnabled !== false,
  } : undefined;

  return (
    <div className="space-y-3 sm:space-y-4 font-sans">
      
      {/* Success Notification Banner for Gallery Extension */}
      {msgParam === "gallery_extended" && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-300">Pembayaran Berhasil!</h4>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Masa simpan foto galeri momen tamu Anda telah diperpanjang <strong>+30 Hari</strong>. Seluruh momen candid tamu tetap tersimpan aman di server.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="text-xs font-bold text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 transition cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 1. Hero Card (White Dominant Luxury & Responsive) */}
      <div className="bg-white text-stone-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-stone-200/80 relative overflow-hidden bg-gradient-to-br from-white via-[#fcfbf9] to-stone-50/60">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-stone-100 border border-stone-200/80 text-stone-600 text-[10px] sm:text-[11px] font-semibold rounded-full uppercase tracking-wider">
                Undangan Pernikahan
              </span>
              {invitation?.status === 'PUBLISHED' ? (
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  AKTIF
                </span>
              ) : invitation?.status === 'EVENT_FINISHED' ? (
                <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  SELESAI
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  DRAFT
                </span>
              )}


            </div>
            
            <span className="text-[11px] text-stone-500 font-medium">
              Tema: {invitation?.themeId ? (
                <strong className="text-amber-800 font-semibold capitalize">{invitation.themeId}</strong>
              ) : (
                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[10px] font-semibold">
                  Belum Memilih Tema
                </span>
              )}
            </span>
          </div>

          {/* Unified Retention & Service Active Card (Ditempatkan di Bagian Atas agar Sangat Jelas) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50/90 border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Masa Aktif Layanan Undangan:</span>
                </span>

                {effectiveExpiry ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-mono text-[11px] font-bold inline-flex items-center gap-1">
                    <span>Aktif s.d. {effectiveExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="text-emerald-600 font-medium">({daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining} hari lagi` : "Menunggu jadwal pembersihan"})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-stone-200/70 text-stone-700 rounded-lg text-[11px] font-semibold">
                    {baseRetentionDays} Hari Pasca Acara (Setelah Resepsi)
                  </span>
                )}

                {extraGalleryDays > 0 && (
                  <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    +{extraGalleryDays} Hari Perpanjangan
                  </span>
                )}
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                Satu masa aktif terpadu mencakup <strong>situs web undangan</strong>, <strong>subdomain</strong>, <strong>kamera disposable tamu</strong>, dan <strong>cloud galeri foto</strong> ({baseRetentionDays} hari default{extraGalleryDays > 0 ? ` + perpanjangan ${extraGalleryDays} hari` : ""}{invitation?.status === 'DRAFT' ? ', dihitung pasca acara resepsi' : ''}).
                {!hasExtended && daysRemaining !== null && daysRemaining > 7 && (
                  <span className="block text-stone-400 mt-0.5">
                    Opsi perpanjangan +30 hari (maksimal 1x) akan terbuka otomatis pada H-7 sebelum masa aktif berakhir.
                  </span>
                )}
                {hasExtended && (
                  <span className="block text-amber-800 font-medium mt-0.5">
                    Masa aktif telah diperpanjang maksimal (+30 hari). Pastikan Anda telah mengunduh seluruh foto kenangan sebelum batas waktu berakhir.
                  </span>
                )}
              </p>
            </div>

            {/* Quick Action Button: Perpanjangan Bertahap (H-7 & Maksimal 1x) */}
            <div className="shrink-0 flex items-center gap-2">
              {hasExtended ? (
                <span className="px-3 py-1.5 bg-stone-100 border border-stone-200 text-stone-600 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5" title="Batas maksimal perpanjangan (+30 hari) telah digunakan.">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                  Perpanjangan Maksimal Telah Digunakan
                </span>
              ) : canExtend ? (
                <button
                  type="button"
                  onClick={() => setIsAddonModalOpen(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto animate-pulse"
                  title="Masa aktif tersisa 7 hari atau kurang. Buka jendela perpanjangan."
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Perpanjang +30 Hari</span>
                </button>
              ) : (
                <span className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1.5" title="Opsi perpanjangan akan terbuka saat sisa masa aktif 7 hari">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Masa Aktif Aman
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-serif font-bold text-stone-900 leading-snug tracking-tight">
              {coupleDisplayName || "Mempelai Pria & Mempelai Wanita"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              Kelola seluruh konten, galeri, susunan acara, dan tamu undangan Anda dari satu panel kontrol.
            </p>
          </div>

          {/* Catatan Belum Memilih Tema */}
          {!invitation?.themeId && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                <span>Anda belum memilih desain tema undangan. Silakan buka Studio Editor untuk memilih tema perdana Anda.</span>
              </div>
              <Link href={editorUrl} className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-[11px] shrink-0 transition text-center shadow-xs">
                Pilih Tema Sekarang
              </Link>
            </div>
          )}

          {/* Action Buttons & Status Notice */}
          {(invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED') ? (
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5 sm:items-center flex-wrap">
              {hasCap("guest_memories") && (
                <a
                  href={`${invUrl}/memories`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Galeri Momen Tamu</span>
                </a>
              )}

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold rounded-xl text-xs transition border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>{copied ? "Tersalin!" : "Salin Link"}</span>
                </button>

                <a
                  href={invUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-xl text-xs transition border border-amber-200/80 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Buka Web</span>
                  <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <div className="w-full p-2.5 sm:p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p><strong>Belum Terbit.</strong> Tautan undangan akan aktif dan siap dibagikan setelah Anda menekan Publikasi di Studio Editor.</p>
            </div>
          )}

          {invitation?.status === 'EVENT_FINISHED' && hasCap("guest_memories") && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span>Acara telah selesai. URL website Anda sekarang otomatis menampilkan <strong>Galeri Momen Tamu</strong>.</span>
              </div>
              <Link href="/dashboard/moments" className="text-amber-800 hover:underline font-semibold">
                Kelola Galeri &amp; Unduh ZIP &rarr;
              </Link>
            </div>
          )}

          {invitation?.status === 'EVENT_FINISHED' && !hasCap("guest_memories") && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>Acara pernikahan telah selesai dilaksanakan. Undangan utama Anda kini telah ditutup secara resmi.</span>
            </div>
          )}

          {/* URL Bars (Undangan + Galeri Kenangan jika aktif) */}
          <div className={`pt-3 border-t border-stone-200/60 grid grid-cols-1 ${hasCap("guest_memories") ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-2 text-xs text-stone-600 font-mono`}>
            <div className="bg-stone-50 border border-stone-200/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
              {invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED' ? (
                <span className="truncate text-stone-800 font-medium">{invUrl}</span>
              ) : (
                <span className="truncate text-stone-400 italic">URL tersedia setelah Publish</span>
              )}
              <span className="text-[10px] font-sans text-stone-400 shrink-0">Web Undangan</span>
            </div>
            {hasCap("guest_memories") && (
              <div className="bg-stone-50 border border-stone-200/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                {invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED' ? (
                  <span className="truncate text-amber-800 font-medium">{`${invUrl}/memories`}</span>
                ) : (
                  <span className="truncate text-stone-400 italic">Tersedia setelah Publish</span>
                )}
                <span className="text-[10px] font-sans text-stone-400 shrink-0">Galeri Momen</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Live Metrics Grid (2x2 on Mobile, 4 Cols on Desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Tamu</span>
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-stone-900">{stats.guestCount}</p>
          <span className="text-[10px] text-stone-400 block">Tamu terdaftar</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">WA Terkirim</span>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700">{stats.waSentCount}</p>
          <span className="text-[10px] text-stone-400 block">Pesan terkirim</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Konfirmasi Hadir</span>
            <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-800">{stats.attendingCount}</p>
          <span className="text-[10px] text-stone-400 block">Pax terkonfirmasi</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Status Lisensi</span>
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <p className="text-sm font-bold text-stone-900 truncate">
              {invitation?.order?.planType
                ? `Paket ${invitation.order.planType.charAt(0) + invitation.order.planType.slice(1).toLowerCase()}`
                : "—"}
            </p>
            {invitation?.id && (
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(true)}
                className="w-fit text-[10px] font-bold text-violet-700 hover:text-violet-900 border border-violet-200 hover:border-violet-300 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition flex items-center gap-1 cursor-pointer"
                title="Buka Pusat Checkout Terpadu Layanan & Upgrade"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                <span>{invitation?.order?.planType !== "PREMIUM" ? "Upgrade & Add-On" : "Kelola Add-On"}</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-stone-400 block">
            {packageConfig?.desc || (invitation?.order?.planType === "PREMIUM"
              ? "Akses semua tema Premium, Modern & Traditional"
              : invitation?.order?.planType === "MODERN"
              ? "Akses tema Modern & Traditional"
              : invitation?.order?.planType === "TRADITIONAL"
              ? "Akses tema Traditional"
              : "Belum ada paket aktif")}
          </span>
        </div>
      </div>

      {/* 3. Core Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Card 1: Studio Editor */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-700/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900">Studio Editor Undangan</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Atur susunan multi-acara, foto prewedding, video YouTube, dan rekening bank.
            </p>
          </div>
          <Link
            href={editorUrl}
            className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition text-center block shadow-xs"
          >
            Buka Studio Editor
          </Link>
        </div>

        {/* Card 2: Guest Management */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-600/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900">Buku Tamu &amp; WhatsApp</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Daftar nama tamu, atur kuota Pax, dan buat link personal WhatsApp 1-klik.
            </p>
          </div>
          <Link
            href="/dashboard/guests"
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition text-center block shadow-xs"
          >
            Kelola Buku Tamu
          </Link>
        </div>

        {/* Card 3: RSVP & Wishes */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-600/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900">RSVP &amp; Doa Restu</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pantau konfirmasi kehadiran dari para tamu, baca doa, dan ekspor spreadsheet.
            </p>
          </div>
          <Link
            href="/dashboard/rsvp"
            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition text-center block border border-stone-300"
          >
            Lihat Rekap RSVP
          </Link>
        </div>
      </div>


      {/* Pusat Layanan Tambahan & Upgrade Terpadu */}
      {invitation && (
        <UnifiedAddonModal
          isOpen={isAddonModalOpen}
          onClose={() => setIsAddonModalOpen(false)}
          invitationId={invitation.id}
          currentPlan={invitation.order?.planType || "TRADITIONAL"}
          currentQuota={memoriesQuota?.maxTotalPhotos || 250}
          galleryExpiresAt={effectiveExpiry ? effectiveExpiry.toISOString() : null}
          pricingSettings={addonPricingSettings}
          hasExtended={hasExtended}
          daysRemaining={daysRemaining}
        />
      )}


    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-400 text-xs">Memuat Dashboard...</div>}>
      <DashboardHomeContent />
    </Suspense>
  );
}