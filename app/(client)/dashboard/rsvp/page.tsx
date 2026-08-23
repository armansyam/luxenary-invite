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

  useEffect(() => {
    fetch("/api/client/rsvps")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setRsvps(data.rsvps || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredRsvps = rsvps.filter((r) => {
    const matchesFilter = filterStatus === "all" || r.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = !search || r.guestName.toLowerCase().includes(search.toLowerCase()) || (r.message && r.message.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExportCSV = () => {
    if (rsvps.length === 0) {
      alert("Belum ada data RSVP untuk diekspor.");
      return;
    }
    const headers = ["Nama Tamu", "Status Kehadiran", "Jumlah Pax", "Pesan / Doa", "Waktu Respon"];
    const rows = rsvps.map((r) => [
      `"${r.guestName}"`,
      `"${r.status.toUpperCase()}"`,
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
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            Rekap Konfirmasi Kehadiran &amp; Doa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftar tamu yang telah mengisi konfirmasi RSVP dan doa restu secara live
          </p>
        </div>

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

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Total Respon</span>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{stats.totalResponses}</p>
          <span className="text-[10px] text-stone-400">Konfirmasi masuk</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Hadir</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{stats.attending}</p>
          <span className="text-[10px] text-stone-400">Total pax tamu</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Tidak Hadir</span>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{stats.declined}</p>
          <span className="text-[10px] text-stone-400">Berhalangan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Masih Ragu</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{stats.uncertain}</p>
          <span className="text-[10px] text-stone-400">Belum pasti</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
        
        {/* Filter Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 text-xs">
          {[
            { id: "all", label: "Semua" },
            { id: "hadir", label: "Hadir" },
            { id: "tidak", label: "Tidak Hadir" },
            { id: "ragu", label: "Ragu-ragu" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
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

      {/* RSVP Content (Mobile-First Cards + Desktop Table) */}
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
          <p className="text-xs text-stone-400">Konfirmasi RSVP dari tamu akan otomatis muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRsvps.map((rsvp) => {
              const isHadir = rsvp.status.toLowerCase() === "hadir";
              const isTidak = rsvp.status.toLowerCase() === "tidak";
              return (
                <div
                  key={rsvp.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{rsvp.guestName}</h4>
                      <span className="text-[11px] text-stone-400">
                        {new Date(rsvp.respondedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                        <span className="text-[10px] text-stone-500 font-semibold">
                          {rsvp.guestCount || 1} Pax
                        </span>
                      )}
                    </div>
                  </div>

                  {rsvp.message && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700 leading-relaxed italic">
                      &ldquo;{rsvp.message}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
