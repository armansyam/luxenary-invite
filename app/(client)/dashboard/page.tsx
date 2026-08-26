"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";

import { getInvitationPublicUrl } from "@/lib/domainUtils";

export default function DashboardHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    guestCount: 0,
    waSentCount: 0,
    attendingCount: 0,
    wishesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then(async (invitations) => {
        if (Array.isArray(invitations) && invitations.length > 0) {
          const inv = invitations[0];
          setInvitation(inv);

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
  }, [router]);

  const subdomainName = invitation?.subdomain || `${invitation?.groomSlug || "didan"}-${invitation?.brideSlug || "nasha"}`;
  const invUrl = getInvitationPublicUrl(subdomainName);

  const handleCopyLink = () => {
    if (invitation) {
      const url = getInvitationPublicUrl(subdomainName);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  const editorUrl = invitation ? `/dashboard/invitation/${invitation.id}` : "/dashboard/invitation";

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      
      {/* 1. Hero Card (Mobile-First, Elegant Luxury) */}
      <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider">
                UNDANGAN PERNIKAHAN
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                AKTIF
              </span>
            </div>
            
            <span className="text-[11px] text-stone-400 font-medium capitalize">
              Tema: <strong className="text-amber-400 font-semibold">{invitation?.themeId || "Kila"}</strong>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-100 leading-tight">
              {invitation?.groomName || "Didan Faadhilah"} &amp; {invitation?.brideName || "Nasha Selsabilla"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xl">
              Kelola seluruh konten, galeri, susunan acara, dan tamu undangan Anda dari satu panel kontrol.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:items-center flex-wrap">
            <Link
              href={editorUrl}
              className="w-full sm:w-auto px-5 py-3 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Undangan (Studio)</span>
            </Link>

            <a
              href={`/${invitation?.groomSlug || "didan"}-${invitation?.brideSlug || "nasha"}/${invitation?.invitationSlug || "okt-2026"}/memories`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-stone-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Galeri Momen Tamu</span>
            </a>

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs transition border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>{copied ? "Tersalin!" : "Salin Link"}</span>
              </button>

              <a
                href={invUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold rounded-xl text-xs transition border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Buka Web</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* URL Bars (Undangan + Galeri Kenangan) */}
          <div className="pt-3 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-400 font-mono">
            <div className="bg-stone-950/40 p-2.5 rounded-xl flex items-center justify-between gap-2">
              <span className="truncate text-amber-200/90">{invUrl}</span>
              <span className="text-[10px] font-sans text-stone-500 shrink-0">Web Undangan</span>
            </div>
            <div className="bg-stone-950/40 p-2.5 rounded-xl flex items-center justify-between gap-2">
              <span className="truncate text-amber-400">
                {`/${invitation?.groomSlug || "didan"}-${invitation?.brideSlug || "nasha"}/${invitation?.invitationSlug || "okt-2026"}/memories`}
              </span>
              <span className="text-[10px] font-sans text-stone-500 shrink-0">Galeri Momen</span>
            </div>
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
          <p className="text-sm font-bold text-stone-900">All-Access Premium</p>
          <span className="text-[10px] text-stone-400 block">Bebas ganti 5 tema</span>
        </div>
      </div>

      {/* 3. Core Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
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

        {/* Card 4: Galeri Kenangan Tamu (Memory Vault) */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500 transition bg-gradient-to-b from-amber-50/30 to-white">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-900 font-bold text-sm">
              <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900">Galeri Kenangan Tamu</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Album foto candid &amp; video ucapan dari sahabat yang dibagikan pasca acara.
            </p>
          </div>
          <a
            href={`/${invitation?.groomSlug || "didan"}-${invitation?.brideSlug || "nasha"}/${invitation?.invitationSlug || "okt-2026"}/memories`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition text-center inline-flex items-center justify-center gap-1 shadow-xs"
          >
            <span>Buka Galeri Momen</span>
          </a>
        </div>
      </div>

      {/* 4. Fitur Operasional Hari H */}
      <div className="pt-4 border-t border-stone-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Fitur Operasional (Hari H)
          </h2>
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[11px] font-bold text-rose-800">PIN Akses Panitia: <span className="font-mono text-sm ml-1 tracking-widest">{invitation?.staffPin || "123456"}</span></span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Receptionist */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">Buku Tamu Digital (QR)</h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">Buka di tablet penerima tamu untuk scan QR Code tamu yang datang.</p>
            </div>
            <a href={`/s/${invitation?.subdomain}/receptionist`} target="_blank" className="w-full py-2 bg-stone-100 hover:bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs transition text-center border border-stone-200">
              Buka Scanner QR
            </a>
          </div>

          {/* Photobooth */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">iPad Photobooth</h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">Buka di iPad Photobooth vendor agar tamu bisa merekam video ucapan.</p>
            </div>
            <a href={`/s/${invitation?.subdomain}/booth`} target="_blank" className="w-full py-2 bg-stone-100 hover:bg-blue-50 text-blue-800 font-bold rounded-xl text-xs transition text-center border border-stone-200">
              Buka Aplikasi Booth
            </a>
          </div>

          {/* Live Show Projector */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">Proyektor Live Show</h3>
              <p className="text-[11px] text-stone-500 leading-relaxed">Sambungkan laptop ke Proyektor untuk menampilkan momen tamu real-time.</p>
            </div>
            <div className="flex gap-2">
              <a href={`/s/${invitation?.subdomain}/liveshow`} target="_blank" className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition text-center shadow-xs">
                Buka Layar
              </a>
              <a href={`/s/${invitation?.subdomain}/remote`} target="_blank" className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition text-center shadow-xs">
                Remote TV
              </a>
            </div>
          </div>

          {/* QR Guest Moment (New) */}
          <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-stone-900">QR Guest Moment</h3>
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed mb-4">Cetak URL ini sebagai Standing Banner di meja agar tamu bisa kirim foto.</p>
              
              <div className="flex justify-center mb-2 bg-white p-2 rounded-xl border border-amber-100 shadow-inner max-w-[120px] mx-auto" ref={qrRef}>
                <QRCode
                  value={`https://${invitation?.subdomain || "demo"}.luxenary-invite.com/moment`}
                  size={100}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 100 100`}
                  fgColor="#451a03" // amber-950
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={handleDownloadQR} className="flex-1 py-2 border-2 border-dashed border-amber-500 text-amber-700 font-bold rounded-xl text-[10px] transition text-center hover:bg-amber-50 flex flex-col items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Unduh PNG
              </button>
              <a href={`/s/${invitation?.subdomain}/moment`} target="_blank" className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-xl text-[10px] transition text-center hover:bg-amber-700 flex flex-col items-center justify-center gap-1 shadow-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Buka Link
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}