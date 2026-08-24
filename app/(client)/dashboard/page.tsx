"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { getInvitationPublicUrl } from "@/lib/domainUtils";

export default function DashboardHome() {
  const { data: session } = useSession();
  const [invitation, setInvitation] = useState<any>(null);
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
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const subdomainName = invitation?.subdomain || `${invitation?.groomSlug || "didan"}-${invitation?.brideSlug || "nasha"}`;
  const invUrl = getInvitationPublicUrl(subdomainName);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
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
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:items-center">
            <Link
              href={editorUrl}
              className="w-full sm:w-auto px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Undangan (Studio)</span>
            </Link>

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

          {/* URL Bar */}
          <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-400 font-mono bg-stone-950/40 p-2.5 rounded-xl">
            <span className="truncate text-amber-200/90">{invUrl}</span>
            <span className="text-[11px] font-sans text-stone-500 sm:text-right">Link Publik Undangan Anda</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: Studio Editor */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-700/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Studio Editor Undangan</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Atur susunan multi-acara (Akad, Resepsi, Mappacci, Mapparola), foto prewedding, video teaser YouTube, dan rekening bank.
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
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-600/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Buku Tamu &amp; WhatsApp</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Tambah daftar nama tamu, atur kuota kehadiran (Pax), dan buat link undangan personal WhatsApp 1-klik.
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
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-600/40 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">RSVP &amp; Doa Restu</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pantau konfirmasi kehadiran dari para tamu, baca doa restu yang masuk, dan ekspor data kehadiran ke spreadsheet.
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
    </div>
  );
}