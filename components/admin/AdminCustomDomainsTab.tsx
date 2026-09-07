"use client";

import React, { useState } from "react";

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
  const [checkingDns, setCheckingDns] = useState<Record<string, boolean>>({});
  const [dnsResults, setDnsResults] = useState<Record<string, DnsCheckResult>>({});
  const [activatingOrder, setActivatingOrder] = useState<Record<string, boolean>>({});
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // Uji coba resolusi DNS real-time
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
        alert(data.error || "Gagal melakukan resolusi DNS");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghubungi DNS resolver");
    } finally {
      setCheckingDns((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Aktivasi domain ke projek undangan
  const handleActivateDomain = async (orderId: string, domain?: string | null) => {
    if (!confirm(`Hubungkan domain ${domain} ke proyek undangan klien sekarang?`)) return;

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
        setActionMsg({ ok: true, msg: data.message || "Custom domain berhasil dihubungkan." });
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
    <div className="space-y-6">
      {/* ── Header Title & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>Caddy Auto-SSL &amp; DNS Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Custom Domain</h2>
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
                                navigator.clipboard.writeText(reqDomain);
                                alert(`Domain ${reqDomain} tersalin!`);
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
  );
}
