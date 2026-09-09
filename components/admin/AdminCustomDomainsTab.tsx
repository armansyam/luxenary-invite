"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getApexRootDomain } from "@/lib/domainUtils";

interface CustomDomainOrder {
  id: string;
  invoiceNumber: string;
  amount: number | string;
  status: "PENDING" | "PAID" | "FAILED" | string;
  requestedDomain?: string | null;
  createdAt: string;
  user?: {
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  invitation?: {
    id?: string | null;
    subdomain?: string | null;
    customDomain?: string | null;
  } | null;
}

interface DnsCheckResult {
  pointsToUs: boolean;
  detectedA: string[];
  detectedCname: string[];
  expectedIp: string;
  expectedCname: string;
  message: string;
}

interface SubdomainItem {
  id: string;
  subdomain: string;
  coupleName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  status: string;
  themeId: string;
  planType: string;
  customDomain?: string | null;
  invitationSlug: string;
  eventDate?: string | null;
  isExpired: boolean;
  remainingDays: number | null;
  createdAt: string;
}

interface AdminCustomDomainsTabProps {
  orders?: CustomDomainOrder[];
  onRefresh?: () => void;
  onNavigateToSetup?: () => void;
  onNavigateToSettings?: () => void;
}

export default function AdminCustomDomainsTab({
  orders = [],
  onRefresh,
  onNavigateToSetup,
  onNavigateToSettings,
}: AdminCustomDomainsTabProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"subdomains" | "custom_domains">("subdomains");

  // Custom Domains State
  const [checkingDns, setCheckingDns] = useState<Record<string, boolean>>({});
  const [dnsResults, setDnsResults] = useState<Record<string, DnsCheckResult>>({});
  const [activatingOrder, setActivatingOrder] = useState<Record<string, boolean>>({});
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setActionMsg({ ok: true, msg: `${label} tersalin ke clipboard!` });
    setTimeout(() => setActionMsg(null), 3000);
  };

  // Subdomains Monitoring State
  const [subdomainsLoading, setSubdomainsLoading] = useState(false);
  const [subdomainsList, setSubdomainsList] = useState<SubdomainItem[]>([]);
  const [kpis, setKpis] = useState({
    totalActive: 0,
    totalPublished: 0,
    totalDraft: 0,
    totalExpired: 0,
  });
  const [searchInspector, setSearchInspector] = useState("");
  const [inspectorResult, setInspectorResult] = useState<any>(null);
  const [isSearchingInspector, setIsSearchingInspector] = useState(false);
  const [recycling, setRecycling] = useState(false);
  const [rootDomain, setRootDomain] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return getApexRootDomain();
    }
    return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").replace(/^https?:\/\//, "").replace(/\/$/, "");
  });

  useEffect(() => {
    setRootDomain(getApexRootDomain());
  }, []);

  const getSubdomainUrl = (subdomain: string) => {
    const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${proto}//${subdomain}.${rootDomain}`;
  };

  // Fetch subdomains
  const fetchSubdomains = useCallback(async (query: string = "") => {
    setSubdomainsLoading(true);
    try {
      const url = query
        ? `/api/admin/subdomains?search=${encodeURIComponent(query)}`
        : "/api/admin/subdomains";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSubdomainsList(data.subdomains || []);
        if (data.kpis) setKpis(data.kpis);
        if (data.inspectorResult) {
          setInspectorResult(data.inspectorResult);
        } else if (!query) {
          setInspectorResult(null);
        }
      }
    } catch (e) {
      console.error("Gagal memuat subdomains:", e);
    } finally {
      setSubdomainsLoading(false);
      setIsSearchingInspector(false);
    }
  }, []);

  useEffect(() => {
    fetchSubdomains();
  }, [fetchSubdomains]);

  // Live Subdomain Inspector trigger
  const handleInspectSubdomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInspector.trim()) {
      setInspectorResult(null);
      fetchSubdomains("");
      return;
    }
    setIsSearchingInspector(true);
    fetchSubdomains(searchInspector.trim());
  };

  // Recycle Expired Subdomains
  const handleRecycleSubdomains = async () => {
    setRecycling(true);
    try {
      const res = await fetch("/api/admin/subdomains/recycle", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: data.message || "Daur ulang subdomain selesai." });
        fetchSubdomains(searchInspector);
      } else {
        throw new Error(data.error || "Gagal daur ulang subdomain");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal daur ulang subdomain" });
    } finally {
      setRecycling(false);
    }
  };

  // Uji coba resolusi DNS real-time (Custom Domain)
  const handleCheckDns = async (orderId: string, domain?: string | null) => {
    if (!domain) return;
    try {
      setCheckingDns((prev) => ({ ...prev, [orderId]: true }));
      const res = await fetch("/api/admin/custom-domains/check-dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        setDnsResults((prev) => ({ ...prev, [orderId]: data }));
      } else {
        setActionMsg({ ok: false, msg: data.error || "Gagal melakukan resolusi DNS" });
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal menghubungi DNS resolver" });
    } finally {
      setCheckingDns((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Aktivasi domain ke projek undangan (Custom Domain)
  const handleActivateDomain = async (orderId: string, domain?: string | null) => {
    try {
      setActivatingOrder((prev) => ({ ...prev, [orderId]: true }));
      setActionMsg(null);
      const res = await fetch("/api/admin/custom-domains/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ ok: true, msg: data.message || `Domain ${domain} berhasil dihubungkan ke undangan klien.` });
        onRefresh?.();
      } else {
        throw new Error(data.error || "Gagal mengaktifkan domain");
      }
    } catch (err: any) {
      setActionMsg({ ok: false, msg: err.message || "Gagal mengaktifkan domain" });
    } finally {
      setActivatingOrder((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Sub-Tab Switcher ── */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl w-fit border border-stone-200">
        <button
          type="button"
          onClick={() => setActiveSubTab("subdomains")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "subdomains"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          <span>Subdomain Sistem (*.{rootDomain})</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-mono font-bold text-stone-700 border border-stone-200">
            {kpis.totalActive}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("custom_domains")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === "custom_domains"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>Domain Kustom (.com / .id)</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-mono font-bold text-stone-700 border border-stone-200">
            {orders.length}
          </span>
        </button>
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
          <button type="button" onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 1: SUBDOMAIN MONITOR & LIVE INSPECTOR
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "subdomains" && (
        <div className="space-y-6">
          {/* Header Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                <span>Namespace &amp; Subdomain Controller</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Subdomain Sistem (*.{rootDomain})</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Monitor status subdomain aktif, cek kepemilikan nama secara langsung, dan kelola daur ulang domain kedaluwarsa.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRecycleSubdomains}
                disabled={recycling || kpis.totalExpired === 0}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-rose-200 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Lepas subdomain yang sudah lewat H+7 tanggal acara"
              >
                <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{recycling ? "Mendaur Ulang..." : `Daur Ulang (${kpis.totalExpired})`}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchSubdomains(searchInspector)}
                disabled={subdomainsLoading}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-200 shadow-2xs cursor-pointer"
              >
                <svg className={`w-3.5 h-3.5 text-gray-500 ${subdomainsLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Subdomain Aktif</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpis.totalActive}</p>
              <span className="text-[11px] text-gray-400 block">Digunakan oleh klien di database</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Subdomain Tayang (Live)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">{kpis.totalPublished}</p>
              <span className="text-[11px] text-gray-400 block">Undangan berstatus Published</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kedaluwarsa (H+7)</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-700">{kpis.totalExpired}</p>
              <span className="text-[11px] text-gray-400 block">Siap dilepaskan kembali ke pool</span>
            </div>
          </div>

          {/* Live Subdomain Inspector */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-sm font-bold text-gray-900">Live Subdomain Inspector</h3>
              </div>
              <p className="text-xs text-gray-500">
                Periksa ketersediaan nama subdomain atau lacak siapa pemilik subdomain tertentu secara instan.
              </p>
            </div>

            <form onSubmit={handleInspectSubdomain} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInspector}
                  onChange={(e) => setSearchInspector(e.target.value)}
                  placeholder="Ketik nama subdomain... (contoh: alanastory, dimas-clarissa)"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-mono">.{rootDomain}</span>
              </div>
              <button
                type="submit"
                disabled={isSearchingInspector}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSearchingInspector ? "Memeriksa..." : "Inspeksi"}
              </button>
              {searchInspector && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInspector("");
                    setInspectorResult(null);
                    fetchSubdomains("");
                  }}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </form>

            {/* Inspector Result Card */}
            {inspectorResult && (
              <div
                className={`p-4 rounded-xl border text-xs animate-in fade-in duration-200 ${
                  inspectorResult.status === "AVAILABLE"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : inspectorResult.status === "RESERVED"
                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        inspectorResult.status === "AVAILABLE"
                          ? "bg-emerald-500"
                          : inspectorResult.status === "RESERVED"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <strong className="font-mono text-sm">{inspectorResult.subdomain}.{rootDomain}</strong>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inspectorResult.status === "AVAILABLE"
                        ? "bg-emerald-200/80 text-emerald-900"
                        : inspectorResult.status === "RESERVED"
                        ? "bg-rose-200/80 text-rose-900"
                        : "bg-amber-200/80 text-amber-900"
                    }`}
                  >
                    {inspectorResult.badge}
                  </span>
                </div>

                <p className="text-xs mb-1">{inspectorResult.message}</p>

                {inspectorResult.owner && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-amber-800/80 block">Klien:</span>
                      <strong>{inspectorResult.owner.clientName}</strong> ({inspectorResult.owner.clientEmail})
                    </div>
                    <div>
                      <span className="text-amber-800/80 block">Mempelai &amp; Acara:</span>
                      <strong>{inspectorResult.owner.coupleName}</strong> — {inspectorResult.owner.eventDate || "Belum ditentukan"}
                    </div>
                    <div className="flex items-center justify-start sm:justify-end">
                      <a
                        href={getSubdomainUrl(inspectorResult.subdomain)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-amber-800 text-white rounded-lg font-bold hover:bg-amber-900 transition inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka Undangan</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Subdomains Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Daftar Seluruh Subdomain Aktif</h3>
              <span className="text-[11px] text-gray-400 font-mono">{subdomainsList.length} entri ditemukan</span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-100 text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    {["Subdomain URL", "Klien", "Mempelai", "Paket & Tema", "Status Undangan", "Tanggal Acara", "Aksi"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white text-xs">
                  {subdomainsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400 italic">
                        Saat ini belum ada subdomain yang digunakan oleh klien di database.
                      </td>
                    </tr>
                  ) : (
                    subdomainsList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition">
                        {/* Subdomain */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {item.subdomain}
                            </span>
                            <span className="text-gray-400 font-mono">.{rootDomain}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(getSubdomainUrl(item.subdomain), `Tautan ${getSubdomainUrl(item.subdomain)}`);
                              }}
                              title="Salin Tautan"
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Klien */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{item.clientName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.clientEmail}</div>
                        </td>

                        {/* Mempelai */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-gray-800">{item.coupleName}</div>
                        </td>

                        {/* Paket & Tema */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 mr-1">
                            {item.planType}
                          </span>
                          <span className="font-mono text-gray-500 capitalize">{item.themeId}</span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {item.status === "PUBLISHED" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Live</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Draft</span>
                            </span>
                          )}
                        </td>

                        {/* Tanggal Acara & Retensi */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-gray-700">{item.eventDate || "—"}</div>
                          {item.isExpired ? (
                            <span className="text-[10px] text-rose-600 font-semibold">Kedaluwarsa</span>
                          ) : item.remainingDays !== null ? (
                            <span className="text-[10px] text-stone-400 font-mono">Sisa {item.remainingDays} hari</span>
                          ) : null}
                        </td>

                        {/* Aksi */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <a
                            href={getSubdomainUrl(item.subdomain)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <span>Buka Web</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 2: CUSTOM DOMAIN ORDERS & DNS RESOLVER
         ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "custom_domains" && (
        <div className="space-y-6">
          {/* Header Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                <span>Caddy Auto-SSL &amp; DNS Management</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Custom Domain (.com / .id)</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Pantau pesanan domain pribadi klien, verifikasi propagasi DNS real-time, dan aktifkan integrasi HTTPS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToSetup || onNavigateToSettings}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-stone-200"
              >
                <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Pengaturan DNS Target &amp; IP Server</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-200 shadow-2xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-100 text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    {["Klien", "Subdomain Asli", "Domain Diminta", "Pembayaran", "Status DNS Resolver", "Status Terhubung", "Aksi"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white text-xs">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400 italic">
                        Belum ada pesanan layanan add-on Custom Domain.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => {
                      const isPaid = ord.status === "PAID";
                      const reqDomain = ord.requestedDomain || "";
                      const isConnected = Boolean(ord.invitation?.customDomain && ord.invitation.customDomain === reqDomain);
                      const dns = dnsResults[ord.id];
                      const isChecking = checkingDns[ord.id];
                      const isActivating = activatingOrder[ord.id];

                      return (
                        <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                          {/* Klien */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{ord.user?.name || "Klien"}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{ord.user?.email || "-"}</div>
                          </td>

                          {/* Subdomain Asli */}
                          <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-600">
                            {ord.invitation?.subdomain ? `${ord.invitation.subdomain}` : "-"}
                          </td>

                          {/* Domain Diminta */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 font-mono text-xs">{reqDomain || "-"}</span>
                              {reqDomain && (
                                <button
                                  type="button"
                                  title="Salin Domain"
                                  onClick={() => {
                                    handleCopy(reqDomain, `Domain ${reqDomain}`);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status Pembayaran */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Lunas</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Menunggu Bayar</span>
                              </span>
                            )}
                          </td>

                          {/* Status DNS Resolver */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              {dns ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      dns.pointsToUs ? "bg-emerald-500" : "bg-amber-500"
                                    }`}
                                  />
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      dns.pointsToUs ? "text-emerald-700" : "text-amber-800"
                                    }`}
                                  >
                                    {dns.pointsToUs ? "DNS Mengarah ke Server" : "Belum Propagasi"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px] italic">Belum diuji</span>
                              )}

                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleCheckDns(ord.id, reqDomain)}
                                  disabled={isChecking || !reqDomain}
                                  className="text-[11px] font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {isChecking ? "Menguji DNS..." : "Cek Resolusi DNS"}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Status Terhubung */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {isConnected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Terhubung Aktif</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                                <span>Belum Terhubung</span>
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {!isPaid ? (
                              <span className="text-gray-400 text-[11px] italic">Menunggu Lunas</span>
                            ) : isConnected ? (
                              <span className="text-emerald-700 font-semibold text-[11px]">Selesai</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivateDomain(ord.id, reqDomain)}
                                disabled={isActivating}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                {isActivating ? "Menghubungkan..." : "Hubungkan Domain"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
