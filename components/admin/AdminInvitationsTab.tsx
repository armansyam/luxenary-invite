"use client";

import React, { useState, useEffect, useCallback } from "react";
import { startRemoteSession } from "@/app/(admin)/admin/actions/remote";

import { getLatestEventDate } from "@/lib/domainUtils";

interface InvitationItem {
  id: string;
  userId: string;
  groomSlug: string;
  brideSlug: string;
  invitationSlug: string;
  groomName?: string | null;
  brideName?: string | null;
  groomNickname?: string | null;
  brideNickname?: string | null;
  themeId: string;
  status: "DRAFT" | "PUBLISHED" | "EVENT_FINISHED" | "ARCHIVED" | "TAKEN_DOWN" | string;
  subdomain?: string | null;
  customDomain?: string | null;
  eventData?: string | null;
  galleryExpiresAt?: string | null;
  adminUnlockedUntil?: string | null;
  isLockedPermanently?: boolean;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
}

interface AdminInvitationsTabProps {
  onNavigateToThemes?: () => void;
}

export default function AdminInvitationsTab({ onNavigateToThemes }: AdminInvitationsTabProps = {}) {
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "EVENT_FINISHED" | "ARCHIVED">("ALL");
  const [counts, setCounts] = useState({ ALL: 0, DRAFT: 0, PUBLISHED: 0, EVENT_FINISHED: 0, ARCHIVED: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Action State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/invitations?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setInvitations(data.invitations || []);
        setCounts(data.counts || { ALL: 0, DRAFT: 0, PUBLISHED: 0, EVENT_FINISHED: 0, ARCHIVED: 0 });
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Fetch invitations error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Handle Remote
  const handleRemote = async (userId: string) => {
    try {
      setActionLoading(true);
      setActionMsg(null);
      await startRemoteSession(userId);
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal memulai sesi remote klien" });
      setActionLoading(false);
    }
  };

  // Handle Toggle Emergency Unlock
  const handleToggleUnlock = async (inv: InvitationItem) => {
    const isUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/invitations/${inv.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lockImmediately: isUnlocked,
          durationHours: 24,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({
          ok: true,
          msg: isUnlocked ? "Undangan berhasil dikunci kembali." : "Buka kunci darurat selama 24 jam berhasil diaktifkan.",
        });
        fetchInvitations();
      } else {
        throw new Error(data.error || "Gagal mengubah status kunci darurat");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal mengubah status kunci" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Close to Gallery
  const handleCloseToGallery = async (inv: InvitationItem) => {
    if (!confirm("Tutup masa sebar undangan dan alihkan pengunjung ke Galeri Momen (/memories)?")) return;
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE_TO_GALLERY" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: "Undangan berhasil dialihkan ke mode Galeri Momen Tamu." });
        fetchInvitations();
      } else {
        throw new Error(data.error || "Gagal mengalihkan ke galeri");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal mengalihkan status" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Extend Gallery
  const handleExtendGallery = async (inv: InvitationItem) => {
    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await fetch(`/api/admin/invitations/${inv.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EXTEND_GALLERY", days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: "Masa aktif galeri berhasil diperpanjang 30 hari." });
        fetchInvitations();
      } else {
        throw new Error(data.error || "Gagal memperpanjang masa galeri");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal memperpanjang masa galeri" });
    } finally {
      setActionLoading(false);
    }
  };

  // Parse tanggal acara dari eventData JSON (mengambil tanggal sesi acara terakhir)
  const getEventDate = (eventDataRaw?: string | null) => {
    return getLatestEventDate(eventDataRaw);
  };

  return (
    <div className="space-y-6">
      {/* ── Header Title & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Katalog Projek Undangan Digital</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Invitation Projects</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Pantau status tayang, kunci darurat, tanggal akad/resepsi, dan siklus hidup galeri momen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchInvitations()}
          className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-200 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Segarkan</span>
        </button>
      </div>

      {/* ── Toolbar: Search & 5 Status Tabs ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama mempelai, subdomain, slug, atau email klien..."
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <span className="text-sm font-bold">&times;</span>
            </button>
          )}
        </div>

        {/* 5 Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold pt-2 border-t border-gray-100">
          {[
            { id: "ALL", label: "Semua Projek", count: counts.ALL },
            { id: "DRAFT", label: "Draft", count: counts.DRAFT },
            { id: "PUBLISHED", label: "Undangan Tayang", count: counts.PUBLISHED },
            { id: "EVENT_FINISHED", label: "Galeri Momen Tamu", count: counts.EVENT_FINISHED },
            { id: "ARCHIVED", label: "Selesai / Arsip", count: counts.ARCHIVED },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id as any);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.id ? "bg-stone-700 text-stone-200" : "bg-gray-200 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Feedback Message Banner ── */}
      {actionMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-3 ${
            actionMsg.ok
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${actionMsg.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span>{actionMsg.msg}</span>
          </div>
          <button type="button" onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* ── Table View ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                {["Klien & Pasangan", "Domain & Tema", "Status Projek", "Masa Tayang & Expired", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat daftar projek undangan...</span>
                    </div>
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400 italic">
                    Tidak ada projek undangan yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const coupleName = `${inv.groomNickname || inv.groomName || "Pria"} & ${inv.brideNickname || inv.brideName || "Wanita"}`;
                  const isEmergencyUnlocked = inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date();
                  const eventDate = getEventDate(inv.eventData);
                  const defaultGalleryExpiry = eventDate ? new Date(eventDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                      {/* Pasangan & Klien */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900 text-sm">{coupleName}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {inv.user?.name || "Klien"} &bull; <span className="font-mono text-gray-400">{inv.user?.email || "-"}</span>
                        </div>
                      </td>

                      {/* Domain & Tema */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="mb-1">
                          {inv.subdomain ? (
                            <span className="font-mono font-bold text-indigo-700">
                              {inv.subdomain}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">[URL Belum Setup]</span>
                          )}
                          {inv.customDomain && (
                            <div className="text-[10px] text-emerald-700 font-mono font-semibold mt-0.5">
                              Custom: {inv.customDomain}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Tema: <span className="font-semibold text-stone-800 capitalize">{inv.themeId}</span>
                        </div>
                      </td>

                      {/* Status Projek */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {inv.status === "DRAFT" && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <div>
                              <div className="font-semibold text-stone-800">Draft</div>
                              <div className="text-[10px] text-stone-400">Penyusunan Klien</div>
                            </div>
                          </div>
                        )}
                        {inv.status === "PUBLISHED" && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <div>
                              <div className="font-semibold text-emerald-800">Undangan Tayang</div>
                              <div className="text-[10px] text-stone-400">Pra-Acara &amp; Hari H</div>
                            </div>
                          </div>
                        )}
                        {inv.status === "EVENT_FINISHED" && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            <div>
                              <div className="font-semibold text-purple-800">Galeri Momen Tamu</div>
                              <div className="text-[10px] text-stone-400">Pasca Acara (/memories)</div>
                            </div>
                          </div>
                        )}
                        {(inv.status === "ARCHIVED" || inv.status === "TAKEN_DOWN") && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-stone-400 shrink-0" />
                            <div>
                              <div className="font-semibold text-stone-700">Selesai / Arsip</div>
                              <div className="text-[10px] text-stone-400">Arsip Permanen</div>
                            </div>
                          </div>
                        )}

                        {isEmergencyUnlocked && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Kunci Darurat Aktif (24 Jam)</span>
                          </div>
                        )}
                      </td>

                      {/* Masa Tayang & Expired */}
                      <td className="px-5 py-3.5">
                        {inv.status === "DRAFT" && (
                          <span className="text-gray-400 italic text-[11px]">- Belum Rilis -</span>
                        )}
                        {inv.status === "PUBLISHED" && (
                          <div>
                            <div className="text-stone-700 font-medium">
                              {eventDate ? (
                                <span>Acara: <strong>{eventDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</strong></span>
                              ) : (
                                <span className="text-stone-400 italic">Tanggal acara belum diset</span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">Masa sebar undangan aktif</div>
                          </div>
                        )}
                        {inv.status === "EVENT_FINISHED" && (
                          <div>
                            {inv.galleryExpiresAt ? (
                              <div className="text-purple-700 font-bold">
                                Extended s.d. {new Date(inv.galleryExpiresAt).toLocaleDateString("id-ID")}
                              </div>
                            ) : defaultGalleryExpiry ? (
                              <div className="text-stone-700">
                                s.d. {defaultGalleryExpiry.toLocaleDateString("id-ID")}
                              </div>
                            ) : (
                              <span className="text-stone-500">Standar 30 Hari</span>
                            )}
                            <div className="text-[10px] text-stone-400 mt-0.5">Retensi foto tamu</div>
                          </div>
                        )}
                        {(inv.status === "ARCHIVED" || inv.status === "TAKEN_DOWN") && (
                          <span className="text-stone-400">Masa Tayang Selesai</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* Remote Dasbor */}
                          <button
                            type="button"
                            onClick={() => handleRemote(inv.userId)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition disabled:opacity-50 cursor-pointer"
                            title="Remote Dashboard (Impersonate)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* Tutup ke Galeri (Khusus PUBLISHED) */}
                          {inv.status === "PUBLISHED" && (
                            <button
                              type="button"
                              onClick={() => handleCloseToGallery(inv)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition cursor-pointer"
                              title="Tutup ke Galeri Momen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}

                          {/* Perpanjang Galeri (Khusus EVENT_FINISHED) */}
                          {inv.status === "EVENT_FINISHED" && (
                            <button
                              type="button"
                              onClick={() => handleExtendGallery(inv)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition cursor-pointer"
                              title="Perpanjang Masa Galeri (+30 Hari)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}

                          {/* Toggle Buka Kunci Darurat */}
                          {(isEmergencyUnlocked || inv.isLockedPermanently || inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") && (
                            <button
                              type="button"
                              onClick={() => handleToggleUnlock(inv)}
                              disabled={actionLoading}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isEmergencyUnlocked
                                  ? "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100"
                                  : "text-stone-600 hover:bg-stone-50 border-stone-200"
                              }`}
                              title={isEmergencyUnlocked ? "Kunci kembali sekarang" : "Buka kunci darurat (24 Jam)"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isEmergencyUnlocked ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                )}
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
          <div>
            Menampilkan{" "}
            <strong>
              {pagination.total > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, pagination.total)}
            </strong>{" "}
            dari <strong>{pagination.total}</strong> projek undangan
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Sebelumnya
            </button>

            <span className="text-xs font-medium px-1">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer font-semibold"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
