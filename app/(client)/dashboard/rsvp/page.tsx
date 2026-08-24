"use client";

import { useState, useEffect } from "react";

export default function RsvpPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalResponses: 0,
    attending: 0,
    declined: 0,
    uncertain: 0,
    totalWishes: 0,
  });
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadRsvps = () => {
    setLoading(true);
    fetch("/api/client/invitations")
      .then((res) => res.json())
      .then((invs: any[]) => {
        const invId = Array.isArray(invs) && invs.length > 0 ? invs[0].id : "";
        const url = invId ? `/api/client/rsvps?invitationId=${invId}` : "/api/client/rsvps";
        return fetch(url);
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setRsvps(data.rsvps || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadRsvps();
  }, []);

  const filteredRsvps = rsvps.filter((r) => {
    const matchesFilter = filterStatus === "all" || (r.status || "").toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch =
      !search ||
      (r.guestName && r.guestName.toLowerCase().includes(search.toLowerCase())) ||
      (r.message && r.message.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExportCSV = () => {
    if (rsvps.length === 0) {
      alert("Belum ada data RSVP untuk diekspor.");
      return;
    }
    const headers = ["Nama Tamu", "Status Kehadiran", "Jumlah Pax", "Pesan / Doa", "Waktu Respon"];
    const rows = rsvps.map((r) => [
      `"${r.guestName || ""}"`,
      `"${(r.status || "").toUpperCase()}"`,
      r.guestCount || 1,
      `"${(r.message || "").replace(/"/g, '""')}"`,
      `"${new Date(r.respondedAt).toLocaleString("id-ID")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_RSVP_Luxenary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase block">Konfirmasi Kehadiran</span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Rekap Konfirmasi Kehadiran &amp; Doa
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Data konfirmasi kehadiran (RSVP) dan doa restu tersinkronisasi otomatis secara live saat tamu mengisi di website undangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadRsvps}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar (Clickable Filter Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Total Responses */}
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`p-4 rounded-2xl border transition text-left cursor-pointer ${
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
          className={`p-4 rounded-2xl border transition text-left cursor-pointer ${
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
          className={`p-4 rounded-2xl border transition text-left cursor-pointer ${
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
          className={`p-4 rounded-2xl border transition text-left cursor-pointer ${
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        
        {/* Filter Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 text-xs overflow-x-auto">
          {[
            { id: "all", label: `Semua (${stats.totalResponses})` },
            { id: "hadir", label: `Hadir (${stats.attending} Pax)` },
            { id: "tidak", label: `Tidak Hadir (${stats.declined})` },
            { id: "ragu", label: `Ragu-ragu (${stats.uncertain})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-white text-stone-900 shadow-xs font-bold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau doa restu..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/30"
          />
          <svg className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

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
            const isHadir = (rsvp.status || "").toLowerCase() === "hadir";
            const isTidak = (rsvp.status || "").toLowerCase() === "tidak";

            return (
              <div
                key={rsvp.id}
                className="p-4 sm:px-6 sm:py-4.5 hover:bg-stone-50/60 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
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
                  </div>

                  {rsvp.message && (
                    <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100 leading-relaxed italic mt-2">
                      &ldquo;{rsvp.message}&rdquo;
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] text-stone-400 font-mono block">
                    {new Date(rsvp.respondedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
