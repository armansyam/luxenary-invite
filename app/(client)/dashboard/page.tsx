"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";

import { getInvitationPublicUrl, resolveEffectiveInvitationUrl, shouldDisplayMemoriesGallery, getLatestEventDate } from "@/lib/domainUtils";
import { MemoriesDownloadSection } from "@/components/client/MemoriesDownloadSection";
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
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [copiedGallery, setCopiedGallery] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
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
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [rollModalInput, setRollModalInput] = useState<number>(5);
  const [isSavingRoll, setIsSavingRoll] = useState(false);
  const [rollModalMsg, setRollModalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveRollQuota = async () => {
    if (!invitation?.id || isSavingRoll) return;
    setIsSavingRoll(true);
    setRollModalMsg(null);
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotsQuota: rollModalInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan jatah roll.");
      }
      setRollModalMsg({ type: "success", text: `Jatah roll berhasil disimpan: ${rollModalInput} foto per tamu.` });
      await fetchGuestMemories(invitation.id);
      setTimeout(() => {
        setIsRollModalOpen(false);
        setRollModalMsg(null);
      }, 1000);
    } catch (err: any) {
      setRollModalMsg({ type: "error", text: err.message || "Gagal menyimpan pengaturan." });
    } finally {
      setIsSavingRoll(false);
    }
  };

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
  const allowedCaps: string[] = packageConfig?.capabilities || (planType === "PREMIUM" ? ["music", "gallery", "qr_checkin", "guest_memories", "custom_domain"] : planType === "MODERN" ? ["music", "gallery", "qr_checkin"] : ["music", "gallery"]);
  const hasCap = (cap: string) => allowedCaps.includes(cap);

  // Baca displayOrder dari featureSettings agar urutan nama sesuai setting di Studio Editor
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

  const handleCopyGalleryLink = () => {
    if (invitation) {
      const url = `${invUrl}/memories`;
      navigator.clipboard.writeText(url);
      setCopiedGallery(true);
      setTimeout(() => setCopiedGallery(false), 2000);
    }
  };

  const [deleteMemoryError, setDeleteMemoryError] = useState<string | null>(null);

  const handleDeleteMemory = async (memoryId: string) => {
    if (!invitation?.id) return;
    setDeletingMemoryId(memoryId);
    setDeleteMemoryError(null);
    try {
      const res = await fetch(`/api/client/invitations/${invitation.id}/memories?memoryId=${memoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setGuestMemoriesList((prev) => prev.filter((m) => m.id !== memoryId));
      } else {
        setDeleteMemoryError(data.error || "Gagal menghapus foto kenangan.");
      }
    } catch (err: any) {
      setDeleteMemoryError(err.message || "Terjadi gangguan jaringan saat menghapus foto.");
    } finally {
      setDeletingMemoryId(null);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-GuestMoment-${invitation?.groomSlug}-${invitation?.brideSlug}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
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
  const isGalleryRoute = shouldDisplayMemoriesGallery(invitation);
  const retentionDays = platformSettings?.retentionCleanupDays || 14;
  const latestEventDate = getLatestEventDate(invitation?.eventData);
  const effectiveExpiry = invitation?.galleryExpiresAt
    ? new Date(invitation.galleryExpiresAt)
    : latestEventDate
    ? new Date(latestEventDate.getTime() + retentionDays * 24 * 60 * 60 * 1000)
    : null;

  const daysRemaining = effectiveExpiry
    ? Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

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

              {/* Dynamic Route Switcher Badge */}
              {(invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED') && (
                isGalleryRoute ? (
                  <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-800 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5" title="URL utama otomatis menampilkan Galeri Momen Tamu">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                    Rute: Galeri Momen
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5" title="URL utama menampilkan Halaman Undangan Lengkap">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Rute: Undangan Penuh
                  </span>
                )
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

          {/* Retention Timer Countdown */}
          {(invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED') && effectiveExpiry && (
            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium pt-0.5">
              <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Masa Simpan Sistem (Retensi 14 Hari Pasca Acara):{" "}
                {daysRemaining !== null && daysRemaining > 0 ? (
                  <strong className="text-stone-800 font-bold">{daysRemaining} hari lagi</strong>
                ) : (
                  <strong className="text-amber-800 font-bold">Menunggu jadwal pembersihan</strong>
                )}
                {effectiveExpiry ? ` (hingga ${effectiveExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})` : ""}
              </span>
            </div>
          )}

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
              <a href="#section-galeri-kenangan" className="text-amber-800 hover:underline font-semibold">
                Kelola Galeri &amp; Unduh ZIP &rarr;
              </a>
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

      {/* 4. Fitur Operasional Hari H */}
      {(hasCap("qr_checkin") || hasCap("guest_memories")) && (
        <div className="pt-4 border-t border-stone-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Fitur Operasional (Hari H)
            </h2>
            {hasCap("qr_checkin") && (
              <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[11px] font-bold text-rose-800">PIN Akses Panitia: <span className="font-mono text-sm ml-1 tracking-widest">{invitation?.staffPin || "-"}</span></span>
              </div>
            )}
          </div>
          <div className={`grid grid-cols-1 ${hasCap("qr_checkin") && hasCap("guest_memories") ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-1 max-w-md"} gap-4 sm:gap-5`}>
            
            {/* Receptionist */}
            {hasCap("qr_checkin") && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-1">Buku Tamu Digital (QR)</h3>
                  <p className="text-[11px] text-stone-500 leading-relaxed">Buka di tablet penerima tamu untuk scan QR Code tamu yang datang.</p>
                </div>
                {invitation?.status === 'PUBLISHED' && invitation?.subdomain ? (
                  <a href={`/s/${invitation.subdomain}/receptionist`} target="_blank" className="w-full py-2 bg-stone-100 hover:bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs transition text-center border border-stone-200">
                    Buka Scanner QR
                  </a>
                ) : (
                  <div className="w-full py-2 bg-stone-100 text-stone-400 font-bold rounded-xl text-xs text-center border border-stone-200 cursor-not-allowed">
                    Tersedia setelah Publish
                  </div>
                )}
              </div>
            )}

            {/* QR Guest Moment (New) */}
            {hasCap("guest_memories") && (
              <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition relative">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-stone-900">QR Guest Moment</h3>
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed mb-4">Cetak URL ini sebagai Standing Banner di meja agar tamu bisa kirim foto.</p>
                  
                  {invitation?.status === 'PUBLISHED' ? (
                    <div className="flex justify-center mb-2 bg-white p-2 rounded-xl border border-amber-100 shadow-inner max-w-[120px] mx-auto" ref={qrRef}>
                      <QRCode
                        value={`${invUrl}/sharemoment`}
                        size={100}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 100 100`}
                        fgColor="#451a03" // amber-950
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[120px] mb-2 bg-stone-50 rounded-xl border border-stone-200 border-dashed text-stone-400 text-[10px] text-center p-2 mx-auto max-w-[120px]">
                      QR Code tersedia setelah Publish
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={invitation?.status === 'PUBLISHED' ? handleDownloadQR : undefined} 
                    className={`flex-1 py-2 border-2 border-dashed font-bold rounded-xl text-[10px] transition text-center flex flex-col items-center justify-center gap-1 ${invitation?.status === 'PUBLISHED' ? 'border-amber-500 text-amber-700 hover:bg-amber-50' : 'border-stone-200 text-stone-300 cursor-not-allowed'}`}
                    disabled={invitation?.status !== 'PUBLISHED'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Unduh PNG
                  </button>
                  {invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED' ? (
                    <a href={`${invUrl}/sharemoment`} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-xl text-[10px] transition text-center hover:bg-amber-700 flex flex-col items-center justify-center gap-1 shadow-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Buka Link
                    </a>
                  ) : (
                    <div className="flex-1 py-2 bg-stone-100 text-stone-300 font-bold rounded-xl text-[10px] transition text-center flex flex-col items-center justify-center gap-1 cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Buka Link
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Galeri Kenangan Tamu (Monitoring & Unduh Foto) - Khusus Paket dengan kapabilitas guest_memories */}
      {hasCap("guest_memories") && (
        <div id="section-galeri-kenangan" className="pt-6 border-t border-stone-200/60 space-y-5 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Galeri Kenangan Tamu (Memory Vault)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Pantau foto candid yang diunggah tamu, bagikan tautan album publik, dan unduh arsip foto (ZIP).
              {memoriesQuota && (
                <span className="block mt-1 text-[11px] text-amber-900 font-medium">
                  Kapasitas: Jatah {memoriesQuota.shotsQuota} Foto/Tamu • Estimasi: ~{Math.floor(memoriesQuota.remainingPhotos / (memoriesQuota.shotsQuota || 5))} Tamu dapat berpartisipasi (Sisa Kuota: {memoriesQuota.remainingPhotos} foto)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-stone-800 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl">
              {memoriesQuota ? `${memoriesQuota.usedPhotos} / ${memoriesQuota.maxTotalPhotos} Foto` : `${guestMemoriesList.length} Foto Masuk`}
            </span>
            <button
              type="button"
              onClick={() => {
                setRollModalInput(memoriesQuota?.shotsQuota || 5);
                setRollModalMsg(null);
                setIsRollModalOpen(true);
              }}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Atur Jatah Roll Kamera per Tamu"
            >
              <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Atur Roll Tamu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddonModalOpen(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Tambah Kuota Foto atau Perpanjang Masa Aktif Galeri"
            >
              <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah Kuota / Durasi</span>
            </button>
            <button
              type="button"
              onClick={() => fetchGuestMemories()}
              disabled={loadingMemories}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <svg className={`w-3.5 h-3.5 ${loadingMemories ? "animate-spin text-amber-700" : "text-stone-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loadingMemories ? "Memuat..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Link Album Kenangan Tamu */}
        <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase block font-mono">
              LINK ALBUM KENANGAN TAMU (PUBLIK)
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-stone-900 break-all">
              {invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED'
                ? `${invUrl}/memories`
                : "Tersedia setelah undangan dipublish"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyGalleryLink}
              disabled={invitation?.status !== 'PUBLISHED' && invitation?.status !== 'EVENT_FINISHED'}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedGallery ? "Tersalin" : "Salin Link"}
            </button>
            {invitation?.status === 'PUBLISHED' || invitation?.status === 'EVENT_FINISHED' ? (
              <a
                href={`${invUrl}/memories`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>Buka Galeri</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>

        {/* Client-Side JSZip Download — VPS tidak kena beban bandwidth foto */}
        {invitation && (
          <MemoriesDownloadSection
            invitationId={invitation.id}
            retentionDays={platformSettings?.retentionCleanupDays || 14}
            isUploadLocked={invitation.memoriesUploadLocked ?? false}
            galleryExpiresAt={invitation.galleryExpiresAt ? new Date(invitation.galleryExpiresAt).toISOString() : null}
            extensionPrice={platformSettings?.galleryExtensionPricePerMonth || 50000}
            invitationStatus={invitation.status}
            guestMemoriesCount={guestMemoriesList.length}
            pendingOrder={pendingGalleryOrder}
            onRefresh={() => fetchGuestMemories()}
            onOpenAddonModal={() => setIsAddonModalOpen(true)}
          />
        )}

        {/* Real-time Submissions Monitoring List */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>Daftar Foto Masuk dari Tamu</span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded-full text-[10px] font-mono font-bold">
                {guestMemoriesList.length}
              </span>
            </h3>
            <span className="text-[11px] text-stone-400">Diurutkan dari yang terbaru</span>
          </div>

          {deleteMemoryError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-rose-900 leading-tight">Gagal Menghapus Foto</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{deleteMemoryError}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteMemoryError(null)}
                className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition cursor-pointer"
                title="Tutup pesan"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {guestMemoriesList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
              <svg className="w-8 h-8 text-stone-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-stone-500 font-medium max-w-sm mx-auto">
                Belum ada kiriman foto dari tamu. Saat acara berlangsung, foto yang dikirim tamu akan muncul di sini secara otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {guestMemoriesList.map((item) => (
                <div key={item.id} className="p-3.5 bg-stone-50/70 hover:bg-stone-50 border border-stone-200 rounded-2xl flex gap-3 items-start relative group transition">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-300 flex items-center justify-center">
                    <img src={item.mediaUrl} alt={item.senderName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-stone-900 truncate">{item.senderName}</h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(item.id)}
                        disabled={deletingMemoryId === item.id}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-bold transition cursor-pointer p-1"
                        title="Hapus kiriman ini"
                      >
                        {deletingMemoryId === item.id ? "..." : "✕"}
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500 font-mono truncate">{item.senderEmail}</p>
                    {item.message && (
                      <p className="text-[11px] text-stone-700 mt-1 line-clamp-2 italic">
                        &ldquo;{item.message}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-stone-200/60">
                      <span className="text-[10px] text-stone-400">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Lihat Full</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Pusat Layanan Tambahan & Upgrade Terpadu */}
      {invitation && (
        <UnifiedAddonModal
          isOpen={isAddonModalOpen}
          onClose={() => setIsAddonModalOpen(false)}
          invitationId={invitation.id}
          currentPlan={invitation.order?.planType || "TRADITIONAL"}
          currentQuota={memoriesQuota?.maxTotalPhotos || 250}
          galleryExpiresAt={invitation.galleryExpiresAt ? new Date(invitation.galleryExpiresAt).toISOString() : null}
          pricingSettings={addonPricingSettings}
        />
      )}

      {/* Modal Atur Jatah Roll Kamera Tamu */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Atur Jatah Roll Kamera Tamu</h3>
                  <p className="text-xs text-stone-500">Sesuaikan kuota jepretan kamera Disposable per tamu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Pool Status & Dynamic Calculation Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700">Total Kuota Foto Pool:</span>
                  <span className="font-mono font-bold text-stone-900">{memoriesQuota?.maxTotalPhotos || 0} Foto</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700">Foto Sudah Terpakai:</span>
                  <span className="font-mono font-bold text-stone-900">{memoriesQuota?.usedPhotos || 0} Foto</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-amber-200/60 pt-2">
                  <span className="font-bold text-amber-950">Sisa Kuota Tersedia:</span>
                  <span className="font-mono font-bold text-amber-900 text-sm">{memoriesQuota?.remainingPhotos || 0} Foto</span>
                </div>

                {/* Dynamic Capacity Estimation */}
                <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600 font-medium">Estimasi Tamu Aktif:</span>
                    <span className="font-mono font-bold text-amber-900 text-sm">
                      ~{rollModalInput > 0 ? Math.floor((memoriesQuota?.remainingPhotos || 0) / rollModalInput) : 0} Tamu
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Dengan jatah <strong className="text-stone-800">{rollModalInput} foto/tamu</strong>, sisa kuota pool dapat mengakomodasi sekitar <strong className="text-amber-800">~{rollModalInput > 0 ? Math.floor((memoriesQuota?.remainingPhotos || 0) / rollModalInput) : 0} tamu</strong> lagi.
                  </p>
                </div>
              </div>

              {/* Selector & Stepper */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-800">
                  Pilih atau Masukkan Jatah Roll per Tamu (1 - 30 Foto):
                </label>

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-2">
                  {[3, 5, 10, 15, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRollModalInput(val)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer font-mono ${
                        rollModalInput === val
                          ? "bg-amber-800 text-white border-amber-800 shadow-xs"
                          : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                      }`}
                    >
                      {val} Roll
                    </button>
                  ))}
                </div>

                {/* Stepper + Input */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRollModalInput((prev) => Math.max(1, prev - 1))}
                    disabled={rollModalInput <= 1}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold flex items-center justify-center transition cursor-pointer text-lg"
                  >
                    -
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={rollModalInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setRollModalInput(Math.min(30, Math.max(1, val)));
                        }
                      }}
                      className="w-full text-center py-2.5 text-base font-bold font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">Foto</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRollModalInput((prev) => Math.min(30, prev + 1))}
                    disabled={rollModalInput >= 30}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold flex items-center justify-center transition cursor-pointer text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Information Cards (Anti-Hangus & Boundary) */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 text-xs text-stone-600 space-y-1.5 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-amber-700 font-bold shrink-0">✓</span>
                  <span><strong>Jatah Roll Anti-Hangus:</strong> Tamu yang hanya mengambil 1 atau 2 foto dan selesai, sisa jatah roll-nya <strong>tetap utuh di pool</strong> dan tidak terbuang.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-700 font-bold shrink-0">✓</span>
                  <span><strong>Penyesuaian Tamu Terakhir:</strong> Jika sisa foto di pool tersisa lebih sedikit dari jatah roll (misal sisa 8 foto), kamera tamu otomatis disesuaikan dengan sisa foto tersebut.</span>
                </div>
              </div>

              {/* Status Message */}
              {rollModalMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  rollModalMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}>
                  {rollModalMsg.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRollQuota}
                disabled={isSavingRoll}
                className="px-5 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSavingRoll ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Pengaturan Roll</span>
                )}
              </button>
            </div>
          </div>
        </div>
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