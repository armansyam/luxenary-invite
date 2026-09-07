"use client";

import React, { useState, useEffect, useCallback } from "react";

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
    role: string;
  };
}

interface WebhookLog {
  id: string;
  source: string;
  event: string;
  payload: any;
  status: string;
  processedAt: string | null;
  createdAt: string;
}

export default function AdminMonitoringTab() {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "webhooks">("audit");

  // State Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [loadingAudit, setLoadingAudit] = useState(false);

  // State Webhook Logs
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookTotal, setWebhookTotal] = useState(0);
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhookTotalPages, setWebhookTotalPages] = useState(1);
  const [webhookSourceFilter, setWebhookSourceFilter] = useState("ALL");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("ALL");
  const [loadingWebhook, setLoadingWebhook] = useState(false);

  // Modal Payload Webhook
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: "20",
        action: auditActionFilter,
      });
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
        setAuditTotal(data.pagination?.total || 0);
        setAuditTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Gagal memuat log audit:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage, auditActionFilter]);

  // Fetch Webhook Logs
  const fetchWebhookLogs = useCallback(async () => {
    setLoadingWebhook(true);
    try {
      const params = new URLSearchParams({
        page: webhookPage.toString(),
        limit: "20",
        source: webhookSourceFilter,
        status: webhookStatusFilter,
      });
      const res = await fetch(`/api/admin/webhooks?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWebhookLogs(data.logs || []);
        setWebhookTotal(data.pagination?.total || 0);
        setWebhookTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Gagal memuat log webhook:", err);
    } finally {
      setLoadingWebhook(false);
    }
  }, [webhookPage, webhookSourceFilter, webhookStatusFilter]);

  useEffect(() => {
    if (activeSubTab === "audit") {
      fetchAuditLogs();
    } else {
      fetchWebhookLogs();
    }
  }, [activeSubTab, fetchAuditLogs, fetchWebhookLogs]);

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("UNLOCK") || action.includes("APPROVE")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("REJECT") || action.includes("DELETE") || action.includes("REVOKE")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (action.includes("ACTIVATE") || action.includes("LOGIN")) {
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Sistem Pemantauan & Audit Keamanan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catatan jejak rekam mutasi operasional staf administrator dan log komunikasi webhook payment gateway
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveSubTab("audit");
                setAuditPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeSubTab === "audit"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Audit Aktivitas Staf ({auditTotal})
            </button>
            <button
              onClick={() => {
                setActiveSubTab("webhooks");
                setWebhookPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeSubTab === "webhooks"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Log Webhook Gateway ({webhookTotal})
            </button>
          </div>

          <button
            onClick={() => (activeSubTab === "audit" ? fetchAuditLogs() : fetchWebhookLogs())}
            title="Muat ulang data"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
          >
            <svg
              className={`w-4 h-4 ${loadingAudit || loadingWebhook ? "animate-spin text-indigo-400" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: AUDIT AKTIVITAS ADMIN */}
      {activeSubTab === "audit" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter Tipe Aksi:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="bg-slate-950 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="LOGIN">LOGIN</option>
                <option value="UNLOCK_INVITATION">UNLOCK_INVITATION</option>
                <option value="APPROVE_ORDER">APPROVE_ORDER</option>
                <option value="REJECT_ORDER">REJECT_ORDER</option>
                <option value="ACTIVATE_CUSTOM_DOMAIN">ACTIVATE_CUSTOM_DOMAIN</option>
              </select>
            </div>
            <div className="text-xs text-slate-400">
              Total riwayat tercatat: <span className="text-slate-200 font-semibold">{auditTotal} entri</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Waktu (WIB)</th>
                    <th className="py-3 px-4">Pelaksana / Staf</th>
                    <th className="py-3 px-4">Aksi Operasional</th>
                    <th className="py-3 px-4">Keterangan / Detail Mutasi</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Memuat riwayat audit...
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        Belum ada aktivitas admin yang tercatat pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-white">{log.admin?.name || "System / Admin"}</div>
                          <div className="text-[11px] text-slate-400">{log.admin?.email || log.adminId}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-md">
                          <div className="line-clamp-2 text-[11px] font-mono bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                            {log.details || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {log.ipAddress || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/30">
                <span>
                  Halaman <span className="text-white font-medium">{auditPage}</span> dari{" "}
                  <span className="text-white font-medium">{auditTotalPages}</span>
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: WEBHOOK LOGS */}
      {activeSubTab === "webhooks" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Gateway:</span>
                <select
                  value={webhookSourceFilter}
                  onChange={(e) => {
                    setWebhookSourceFilter(e.target.value);
                    setWebhookPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Gateway</option>
                  <option value="xendit">Xendit</option>
                  <option value="midtrans">Midtrans</option>
                  <option value="manual">Manual Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <select
                  value={webhookStatusFilter}
                  onChange={(e) => {
                    setWebhookStatusFilter(e.target.value);
                    setWebhookPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="received">Received</option>
                  <option value="processed">Processed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Total log webhook: <span className="text-slate-200 font-semibold">{webhookTotal} entri</span>
            </div>
          </div>

          {/* Webhook Logs Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium">
                    <th className="py-3 px-4">Waktu Terima</th>
                    <th className="py-3 px-4">Gateway Source</th>
                    <th className="py-3 px-4">Event Payload</th>
                    <th className="py-3 px-4">Status Proses</th>
                    <th className="py-3 px-4">Waktu Diproses</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loadingWebhook ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Memuat data webhook...
                        </div>
                      </td>
                    </tr>
                  ) : webhookLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Belum ada data log webhook yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold uppercase tracking-wider text-slate-200">
                            {log.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-indigo-400">
                          {log.event}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              log.status === "processed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : log.status === "failed"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {log.processedAt
                            ? new Date(log.processedAt).toLocaleTimeString("id-ID")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedPayload(log.payload)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          >
                            Lihat Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {webhookTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/30">
                <span>
                  Halaman <span className="text-white font-medium">{webhookPage}</span> dari{" "}
                  <span className="text-white font-medium">{webhookTotalPages}</span>
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={webhookPage <= 1}
                    onClick={() => setWebhookPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={webhookPage >= webhookTotalPages}
                    onClick={() => setWebhookPage((p) => Math.min(webhookTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Payload Viewer */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Payload Transaksi Webhook (Raw JSON)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPayload(JSON.stringify(selectedPayload, null, 2))}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
                >
                  {copiedPayload ? "Tersalin!" : "Salin JSON"}
                </button>
                <button
                  onClick={() => setSelectedPayload(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300">
              <pre>{JSON.stringify(selectedPayload, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
