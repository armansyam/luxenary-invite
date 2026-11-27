"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { normalizeRsvpStatus } from "@/lib/rsvpStatus";
import { csvCell } from "@/lib/csv";
import { useClientInvitation } from "@/components/client/ClientInvitationContext";

export default function RsvpPage() {
  const { activeInvitation, activeInvitationId, loading: ctxLoading } = useClientInvitation();
  const isArchivedOrTakenDown =
    activeInvitation?.status === "ARCHIVED" || activeInvitation?.status === "TAKEN_DOWN";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResponses: 0,
    attending: 0,
    declined: 0,
    uncertain: 0,
    totalWishes: 0,
    hiddenCount: 0,
  });
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [platformName, setPlatformName] = useState("Platform");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [giftClaims, setGiftClaims] = useState<Array<{
    id: string;
    itemId: string;
    itemName: string;
    guestName: string;
    quantity: number;
    note?: string | null;
    claimedAt: string;
  }>>([]);
  const [giftItemsCount, setGiftItemsCount] = useState(0);
  const [confirmGiftDeleteId, setConfirmGiftDeleteId] = useState<string | null>(null);
  const [busyGiftId, setBusyGiftId] = useState<string | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [beamStyle, setBeamStyle] = useState({ left: 0, width: 0 });

  const RSVP_TABS = useMemo(() => [
    { id: "all", label: "Semua", count: stats.totalResponses },
    { id: "hadir", label: "Hadir", count: `${stats.attending} Pax` },
    { id: "tidak", label: "Tidak Hadir", count: stats.declined },
    { id: "ragu", label: "Ragu-ragu", count: stats.uncertain },
  ], [stats]);

  useEffect(() => {
    const idx = RSVP_TABS.findIndex((t) => t.id === filterStatus);
    const el = tabRefs.current[idx];
    if (el) {
      setBeamStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [filterStatus, RSVP_TABS]);

  useEffect(() => {
    fetch("/api/public/settings").then(r => r.json()).then(d => {
      if (d?.platformName) setPlatformName(d.platformName);
    }).catch(() => {});
  }, []);

  const loadRsvps = useCallback(() => {
    if (ctxLoading) return;
    setLoading(true);
    const url = activeInvitationId
      ? `/api/client/rsvps?invitationId=${encodeURIComponent(activeInvitationId)}`
      : "/api/client/rsvps";
    const giftUrl = activeInvitationId
      ? `/api/client/gift-claims?invitationId=${encodeURIComponent(activeInvitationId)}`
      : "/api/client/gift-claims";
    Promise.all([
      fetch(url, { cache: "no-store" }).then((res) => res.json()).catch(() => null),
      fetch(giftUrl, { cache: "no-store" }).then((res) => res.json()).catch(() => null),
    ])
      .then(([data, giftData]) => {
        if (data?.success) {
          setStats({
            totalResponses: data.stats?.totalResponses ?? 0,
            attending: data.stats?.attending ?? 0,
            declined: data.stats?.declined ?? 0,
            uncertain: data.stats?.uncertain ?? 0,
            totalWishes: data.stats?.totalWishes ?? 0,
            hiddenCount: data.stats?.hiddenCount ?? 0,
          });
          setRsvps(data.rsvps || []);
        }
        if (giftData?.success) {
          setGiftClaims(Array.isArray(giftData.claims) ? giftData.claims : []);
          setGiftItemsCount(Number(giftData.stats?.totalItems ?? 0));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeInvitationId, ctxLoading]);

  const handleDeleteGiftClaim = async (claimId: string) => {
    setBusyGiftId(claimId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/client/gift-claims/${claimId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ type: "error", text: data?.error || "Gagal membatalkan klaim kado." });
      } else {
        setGiftClaims((prev) => prev.filter((item) => item.id !== claimId));
        setConfirmGiftDeleteId(null);
        setActionMsg({ type: "success", text: "Klaim kado berhasil dibatalkan dan kuota item dikembalikan." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Koneksi terganggu saat membatalkan klaim kado." });
    } finally {
      setBusyGiftId(null);
    }
  };

  useEffect(() => {
    loadRsvps();
  }, [loadRsvps]);

  const handleToggleHidden = async (rsvp: any) => {
    setBusyId(rsvp.id);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/client/rsvps/${rsvp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !rsvp.isHidden }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ type: "error", text: data?.error || "Gagal mengubah visibilitas ucapan." });
      } else {
        setRsvps((prev) => prev.map((item) => (item.id === rsvp.id ? { ...item, isHidden: data.rsvp.isHidden } : item)));
        setStats((prev) => ({
          ...prev,
          hiddenCount: data.rsvp.isHidden ? prev.hiddenCount + 1 : Math.max(0, prev.hiddenCount - 1),
        }));
      }
    } catch {
      setActionMsg({ type: "error", text: "Kesalahan jaringan saat menyimpan status ucapan." });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveReply = async (rsvpId: string, nextReply: string | null) => {
    setBusyId(rsvpId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/client/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyMessage: nextReply }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ type: "error", text: data?.error || "Gagal menyimpan balasan ucapan." });
      } else {
        setRsvps((prev) =>
          prev.map((item) =>
            item.id === rsvpId
              ? { ...item, replyMessage: data.rsvp.replyMessage, repliedAt: data.rsvp.repliedAt }
              : item,
          ),
        );
        setReplyingId(null);
        setReplyDraft("");
        setActionMsg({
          type: "success",
          text: nextReply ? "Balasan ucapan berhasil disimpan." : "Balasan ucapan dihapus.",
        });
      }
    } catch {
      setActionMsg({ type: "error", text: "Kesalahan jaringan saat mengirim balasan." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRsvp = async (rsvpId: string) => {
    setBusyId(rsvpId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/client/rsvps/${rsvpId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionMsg({ type: "error", text: data?.error || "Gagal menghapus data RSVP." });
      } else {
        setConfirmDeleteId(null);
        loadRsvps();
        setActionMsg({ type: "success", text: "Ucapan & konfirmasi tamu dihapus." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Kesalahan jaringan saat menghapus RSVP." });
    } finally {
      setBusyId(null);
    }
  };

  const filteredRsvps = rsvps.filter((r) => {
    const matchesFilter = filterStatus === "all" || normalizeRsvpStatus(r.status) === filterStatus;
    const matchesSearch =
      !search ||
      (r.guestName && r.guestName.toLowerCase().includes(search.toLowerCase())) ||
      (r.message && r.message.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExportCSV = () => {
    if (rsvps.length === 0) return;
    const headers = ["Nama Tamu", "Status Kehadiran", "Jumlah Pax", "Pesan / Doa", "Waktu Respon"];
    const rows = rsvps.map((r) => [
      csvCell(r.guestName),
      csvCell((r.status || "").toUpperCase()),
      r.guestCount || 1,
      csvCell(r.message),
      csvCell(new Date(r.respondedAt).toLocaleString("id-ID")),
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_RSVP_${platformName.replace(/\s+/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 font-sans">
      {isArchivedOrTakenDown && (
        <div className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-700">
          <p className="font-bold text-stone-900">
            {activeInvitation?.status === "ARCHIVED" ? "Arsip Doa & Konfirmasi (Baca-Saja)" : "Undangan Dinonaktifkan"}
          </p>
          <p className="text-[11px] text-stone-600 mt-0.5">
            Ucapan dan catatan kehadiran dikunci dari perubahan untuk menjaga keaslian arsip. Anda tetap dapat mengunduh seluruh rekap dalam format CSV.
          </p>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <span className="hidden sm:block text-[10px] font-bold tracking-widest text-amber-800 uppercase">Konfirmasi Kehadiran</span>
          <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 sm:mt-0.5 leading-snug">
            <span className="sm:hidden">RSVP &amp; Doa Restu</span>
            <span className="hidden sm:inline">Rekap Konfirmasi Kehadiran &amp; Doa</span>
          </h1>
          <p className="hidden sm:block text-xs text-stone-500 mt-0.5">
            Data konfirmasi kehadiran (RSVP) dan doa restu tersinkronisasi otomatis secara live saat tamu mengisi di website undangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadRsvps}
            className="p-2 min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Muat Ulang Data"
            aria-label="Muat ulang data"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={rsvps.length === 0 || loading}
            title={rsvps.length === 0 ? "Belum ada data RSVP untuk diekspor" : "Unduh data RSVP ke format CSV"}
            className="flex-1 sm:flex-none min-h-11 sm:min-h-0 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar (Clickable Filter Cards) */}
      <div className="hidden sm:grid grid-cols-4 gap-3">

        {/* Total Responses */}
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition text-left cursor-pointer ${
            filterStatus === "all"
              ? "bg-white border-stone-900 shadow-md ring-2 ring-stone-900/10"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Total Respon</span>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{stats.totalResponses}</p>
          <span className="text-[10px] text-stone-400">Konfirmasi masuk</span>
        </button>

        {/* Attending */}
        <button
          type="button"
          onClick={() => setFilterStatus("hadir")}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition text-left cursor-pointer ${
            filterStatus === "hadir"
              ? "bg-emerald-50/80 border-emerald-700 shadow-md ring-2 ring-emerald-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Hadir</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{stats.attending}</p>
          <span className="text-[10px] text-stone-400">Total pax tamu</span>
        </button>

        {/* Declined */}
        <button
          type="button"
          onClick={() => setFilterStatus("tidak")}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition text-left cursor-pointer ${
            filterStatus === "tidak"
              ? "bg-rose-50/80 border-rose-700 shadow-md ring-2 ring-rose-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Tidak Hadir</span>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{stats.declined}</p>
          <span className="text-[10px] text-stone-400">Berhalangan</span>
        </button>

        {/* Uncertain */}
        <button
          type="button"
          onClick={() => setFilterStatus("ragu")}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition text-left cursor-pointer ${
            filterStatus === "ragu"
              ? "bg-amber-50/80 border-amber-700 shadow-md ring-2 ring-amber-700/20"
              : "bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300 shadow-2xs"
          }`}
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Masih Ragu</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{stats.uncertain}</p>
          <span className="text-[10px] text-stone-400">Belum pasti</span>
        </button>
      </div>

      {/* Borderless Glowing Beam Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-1 relative">
        
        {/* Glowing Beam Tabs */}
        <div className="relative flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-1 scrollbar-none">
          {RSVP_TABS.map((tab, idx) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[idx] = el; }}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`relative px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium transition-colors ${
                  isActive ? "bg-amber-100 text-amber-900" : "bg-stone-200/70 text-stone-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          {/* Animated Sliding Glowing Light Beam */}
          {beamStyle.width > 0 && (
            <>
              <span
                className="absolute bottom-0 h-[2.5px] bg-gradient-to-r from-amber-700 via-amber-500 to-amber-600 rounded-full shadow-[0_1px_8px_rgba(217,119,6,0.6)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{ left: `${beamStyle.left}px`, width: `${beamStyle.width}px` }}
              />
              <span
                className="absolute bottom-0 h-2 bg-amber-500/20 blur-xs rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ left: `${beamStyle.left}px`, width: `${beamStyle.width}px` }}
              />
            </>
          )}
        </div>

        {/* Search Box */}
        <div className="relative flex-1 sm:max-w-xs pb-1 sm:pb-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau doa restu..."
            className="w-full pl-8 pr-3 py-2 sm:py-1.5 bg-white border border-stone-200/80 rounded-xl text-base sm:text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 shadow-2xs"
          />
          <svg className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Action Feedback */}
      {actionMsg && (
        <div className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
          actionMsg.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <span>{actionMsg.text}</span>
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer ml-3"
          >
            Tutup
          </button>
        </div>
      )}

      {/* RSVP Content (High-Density List) */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
          Memuat rekap konfirmasi RSVP...
        </div>
      ) : filteredRsvps.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-stone-700">Belum ada data konfirmasi yang sesuai</p>
          <p className="text-xs text-stone-400">Konfirmasi RSVP dari tamu akan otomatis muncul di sini saat tamu mengisi form di website undangan</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs overflow-hidden divide-y divide-stone-100">
          {filteredRsvps.map((rsvp) => {
            const isHadir = normalizeRsvpStatus(rsvp.status) === "hadir";
            const isTidak = normalizeRsvpStatus(rsvp.status) === "tidak";

            const isBusy = busyId === rsvp.id;
            const isReplying = replyingId === rsvp.id;
            const isConfirmDelete = confirmDeleteId === rsvp.id;

            return (
              <div
                key={rsvp.id}
                className={`p-4 sm:px-6 sm:py-4.5 transition flex flex-col gap-3 ${
                  rsvp.isHidden ? "bg-stone-50/90 opacity-75" : "hover:bg-stone-50/60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900">{rsvp.guestName}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isHadir
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : isTidak
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {rsvp.status}
                      </span>
                      {isHadir && (
                        <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                          {rsvp.guestCount || 1} Pax Tamu
                        </span>
                      )}
                      {rsvp.isHidden && (
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                          Disembunyikan
                        </span>
                      )}
                    </div>

                    {rsvp.message && (
                      <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100 leading-relaxed italic mt-2">
                        &ldquo;{rsvp.message}&rdquo;
                      </p>
                    )}

                    {rsvp.replyMessage && !isReplying && (
                      <div className="mt-2 pl-3 py-2 pr-3 bg-amber-50/60 border-l-2 border-amber-700 rounded-r-xl text-xs text-stone-800 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                            Balasan Tuan Rumah
                          </span>
                          {!isArchivedOrTakenDown && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleSaveReply(rsvp.id, null)}
                              className="text-[10px] text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Hapus Balasan
                            </button>
                          )}
                        </div>
                        <p className="leading-relaxed">{rsvp.replyMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] text-stone-400 font-mono block">
                      {new Date(rsvp.respondedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {!isArchivedOrTakenDown && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (isReplying) {
                            setReplyingId(null);
                            setReplyDraft("");
                          } else {
                            setReplyingId(rsvp.id);
                            setReplyDraft(rsvp.replyMessage || "");
                            setConfirmDeleteId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>{rsvp.replyMessage ? "Edit Balasan" : "Balas"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleHidden(rsvp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {rsvp.isHidden ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                          )}
                        </svg>
                        <span>{rsvp.isHidden ? "Tampilkan" : "Sembunyikan"}</span>
                      </button>

                      {!isConfirmDelete ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setConfirmDeleteId(rsvp.id);
                            setReplyingId(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteRsvp(rsvp.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg border border-stone-200 text-stone-600 text-[11px] font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                        </span>
                      )}
                    </div>
                    )}
                  </div>
                </div>

                {isReplying && (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Tulis balasan terima kasih dari tuan rumah..."
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-stone-400">{replyDraft.length}/500 karakter</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setReplyingId(null);
                            setReplyDraft("");
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || !replyDraft.trim()}
                          onClick={() => void handleSaveReply(rsvp.id, replyDraft.trim())}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                        >
                          {isBusy ? "Menyimpan..." : "Simpan Balasan"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Moderasi Klaim Kado (Gift Registry) */}
      {(giftItemsCount > 0 || giftClaims.length > 0) && (
        <section className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Moderasi Klaim Kado / Gift Registry ({giftClaims.length})
              </h2>
              <p className="text-xs text-stone-500">
                Pantau pengirim kado fisik dari tamu undangan dan batalkan klaim yang keliru atau iseng agar kuota kembali tersedia.
              </p>
            </div>
            {activeInvitationId && giftClaims.length > 0 && (
              <a
                href={`/api/client/invitations/${encodeURIComponent(activeInvitationId)}/export?type=gifts`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Ekspor Klaim Kado (CSV)</span>
              </a>
            )}
          </div>

          {giftClaims.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              Belum ada tamu yang menandai pilihan kado dari daftar wishlist Anda.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {giftClaims.map((claim) => {
                const isBusyClaim = busyGiftId === claim.id;
                const isConfirming = confirmGiftDeleteId === claim.id;
                return (
                  <div
                    key={claim.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-900">{claim.itemName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-900">
                          {claim.quantity} unit
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">
                        Pengirim: <strong className="text-stone-800">{claim.guestName}</strong>
                        {" \u2022 "}
                        <span className="text-stone-400">
                          {new Date(claim.claimedAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                      {claim.note && (
                        <p className="text-xs text-stone-500 italic">&ldquo;{claim.note}&rdquo;</p>
                      )}
                    </div>

                    {!isArchivedOrTakenDown && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isConfirming ? (
                        <button
                          type="button"
                          disabled={isBusyClaim}
                          onClick={() => setConfirmGiftDeleteId(claim.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          Batalkan Klaim
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isBusyClaim}
                            onClick={() => void handleDeleteGiftClaim(claim.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            {isBusyClaim ? "Membatalkan..." : "Konfirmasi Batal"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusyClaim}
                            onClick={() => setConfirmGiftDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[11px] font-semibold cursor-pointer"
                          >
                            Tidak
                          </button>
                        </>
                      )}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
