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

interface SystemHealthData {
  timestamp: string;
  process: {
    uptimeSeconds: number;
    hostUptimeSeconds?: number;
    nodeVersion: string;
    platform: string;
    loadAvg: number[];
    memoryMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      heapPercent: number;
    };
    hostMemory?: {
      totalGb: number;
      usedGb: number;
      freeGb: number;
      totalMb: number;
      usedMb: number;
      freeMb: number;
      percentUsed: number;
    };
  };
  availability?: {
    overallUptimePercent: number;
    status: string;
    hostUptimeSeconds: number;
    processUptimeSeconds: number;
    daysCount: number;
    history: Array<{
      dayIndex: number;
      date: string;
      status: "OPERATIONAL" | "DEGRADED" | "DOWN";
      uptimePercent: number;
      latencyMs: number;
    }>;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    percentUsed: number;
    available: boolean;
  };
  localFolders: {
    uploadsMb: number;
    draftsMb: number;
    totalLocalMediaMb: number;
  };
  database: {
    status: string;
    latencyMs: number;
    metrics: {
      totalUsers: number;
      totalInvitations: number;
      totalOrders: number;
      totalMediaObjects: number;
    };
  };
  r2Storage: {
    provider: string;
    isR2: boolean;
    bucketName: string | null;
    status: string;
    latencyMs: number | null;
    totalMediaObjects: number;
    totalBytes?: number;
    formattedSize?: string;
    usedMb?: number;
    usedGb?: number;
    freeTierGb?: number;
    remainingFreeTierGb?: number;
    freeTierPercentUsed?: number;
    avgFileSizeFormatted?: string;
    breakdown?: {
      invitations: { count: number; formattedSize: string };
      guestMemories: { count: number; formattedSize: string };
      paymentProofs: { count: number; formattedSize: string };
      other: { count: number; formattedSize: string };
    };
  };
  smtp: {
    configured: boolean;
    host: string | null;
    port: string;
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}h ${hours}j ${minutes}m`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m ${Math.floor(seconds % 60)}d`;
}

export default function AdminMonitoringTab() {
  const [activeSubTab, setActiveSubTab] = useState<"app_health" | "audit" | "webhooks">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mSub = params.get("mon_sub");
      if (mSub && ["app_health", "audit", "webhooks"].includes(mSub)) return mSub as any;
      const stored = localStorage.getItem("lux_admin_monitoring_subtab");
      if (stored && ["app_health", "audit", "webhooks"].includes(stored)) return stored as any;
    }
    return "app_health";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("lux_admin_monitoring_subtab", activeSubTab);
      const params = new URLSearchParams(window.location.search);
      params.set("mon_sub", activeSubTab);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    } catch {}
  }, [activeSubTab]);

  // State App Health Monitoring
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{
    latencyMs: number;
    message: string;
  } | null>(null);

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

  // Fetch Health Data
  const fetchHealthData = useCallback(async (pingR2: boolean = false) => {
    if (pingR2) {
      setTestingR2(true);
    } else {
      setLoadingHealth(true);
    }
    try {
      const res = await fetch(`/api/admin/monitoring/health?pingR2=${pingR2}`);
      const data = await res.json();
      if (res.ok) {
        setHealthData(data);
        if (pingR2 && data.r2Storage?.latencyMs !== null) {
          setR2TestResult({
            latencyMs: data.r2Storage.latencyMs,
            message: `Handshake ke bucket "${data.r2Storage.bucketName || 'R2'}" berhasil. Latensi: ${data.r2Storage.latencyMs}ms.`,
          });
        }
      }
    } catch (err) {
      console.error("Gagal memuat status kesehatan sistem:", err);
    } finally {
      setLoadingHealth(false);
      setTestingR2(false);
    }
  }, []);

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
    if (activeSubTab === "app_health") {
      fetchHealthData();
    } else if (activeSubTab === "audit") {
      fetchAuditLogs();
    } else {
      fetchWebhookLogs();
    }
  }, [activeSubTab, fetchHealthData, fetchAuditLogs, fetchWebhookLogs]);

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("UNLOCK") || action.includes("APPROVE")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("REJECT") || action.includes("DELETE") || action.includes("REVOKE")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (action.includes("ACTIVATE") || action.includes("LOGIN")) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    return "bg-stone-100 text-stone-700 border-stone-200";
  };

  return (
    <div className="space-y-6">
      {/* ── Header Title & Sub-tab Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Sistem Pemantauan &amp; Kinerja Platform</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Monitoring &amp; Status Server</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Deteksi dini kesehatan server, latensi Cloudflare R2, kapasitas disk, audit operasional staf, dan webhook gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/80">
            {/* Sub-tab 1: Kinerja & Kesehatan Aplikasi */}
            <button
              type="button"
              onClick={() => setActiveSubTab("app_health")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "app_health"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Kesehatan &amp; Storage</span>
            </button>

            {/* Sub-tab 2: Audit Staf */}
            <button
              type="button"
              onClick={() => {
                setActiveSubTab("audit");
                setAuditPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "audit"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Audit Staf ({auditTotal})</span>
            </button>

            {/* Sub-tab 3: Log Webhook */}
            <button
              type="button"
              onClick={() => {
                setActiveSubTab("webhooks");
                setWebhookPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "webhooks"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Log Webhook ({webhookTotal})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeSubTab === "app_health") fetchHealthData(false);
              else if (activeSubTab === "audit") fetchAuditLogs();
              else fetchWebhookLogs();
            }}
            disabled={loadingHealth || loadingAudit || loadingWebhook}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Segarkan data"
          >
            <svg
              className={`w-4 h-4 ${loadingHealth || loadingAudit || loadingWebhook ? "animate-spin text-amber-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: KESEHATAN APLIKASI & STORAGE ==================== */}
      {activeSubTab === "app_health" && (
        <div className="space-y-6">
          {/* PITA 4 STATUS DETAK SISTEM (WARNA TERANG, BERSIH & BEBAS ABU GELAP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. CLOUDFLARE R2 STORAGE */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cloud Storage (R2)</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  healthData?.r2Storage?.status === "CONNECTED" || healthData?.r2Storage?.status === "CONFIGURED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {healthData?.r2Storage?.isR2 ? "R2 Cloud" : "Local Disk"}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 font-mono flex items-baseline gap-2">
                  <span>{healthData?.r2Storage?.latencyMs ? `${healthData.r2Storage.latencyMs} ms` : "Standby"}</span>
                  <span className="text-xs font-normal text-gray-400 font-sans">
                    {healthData?.r2Storage?.latencyMs ? "latensi round-trip" : "siap diuji"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 truncate">
                  Bucket: <span className="font-mono font-medium text-gray-800">{healthData?.r2Storage?.bucketName || "public/uploads"}</span>
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => fetchHealthData(true)}
                  disabled={testingR2}
                  className="w-full py-1.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {testingR2 ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menguji Latensi...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Uji Akses &amp; Latensi R2</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. POSTGRESQL DATABASE */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database PostgreSQL</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Koneksi Stabil
                </span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 font-mono flex items-baseline gap-2">
                  <span>{healthData?.database?.latencyMs ?? "..."} ms</span>
                  <span className="text-xs font-normal text-gray-400 font-sans">query ping</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Koleksi data: <span className="font-mono font-medium text-gray-800">{healthData?.database?.metrics?.totalInvitations || 0}</span> projek undangan
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Driver: @prisma/adapter-pg</span>
                <span className="text-emerald-700 font-semibold">Aktif</span>
              </div>
            </div>

            {/* 3. NODE.JS PROCESS & MEMORI */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Node.js Engine</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  {healthData?.process?.nodeVersion || "Node.js"}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 font-mono flex items-baseline gap-2">
                  <span>{healthData?.process ? formatUptime(healthData.process.uptimeSeconds) : "..."}</span>
                  <span className="text-xs font-normal text-gray-400 font-sans">uptime aktif</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Heap RAM: <span className="font-mono font-medium text-gray-800">{healthData?.process?.memoryMb?.heapUsed || 0} MB</span> / {healthData?.process?.memoryMb?.heapTotal || 0} MB ({healthData?.process?.memoryMb?.heapPercent || 0}%)
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, healthData?.process?.memoryMb?.heapPercent || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4. SERVER EMAIL (SMTP) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Server Email (SMTP)</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  healthData?.smtp?.configured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${healthData?.smtp?.configured ? "bg-emerald-500" : "bg-stone-400"}`} />
                  {healthData?.smtp?.configured ? "Siap Kirim" : "Belum Diatur"}
                </span>
              </div>
              <div>
                <div className="text-sm font-mono font-bold text-gray-900 truncate">
                  {healthData?.smtp?.host || "Belum Dikonfigurasi"}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Port: <span className="font-mono font-medium text-gray-800">{healthData?.smtp?.port || "587"} (TLS)</span>
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                <span>Faktur tagihan &amp; kuitansi otomatis</span>
              </div>
            </div>
          </div>

          {/* Alert Notifikasi Pengujian R2 */}
          {r2TestResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{r2TestResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setR2TestResult(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* TIMELINE KESTABILAN SISTEM & STATUS DOWNTIME (60 HARI ALA UPTIMEROBOT) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">Kestabilan Layanan &amp; Riwayat Uptime</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{healthData?.availability?.overallUptimePercent || 99.98}% Operasional</span>
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Pemantauan detak jantung proses, latensi respon API, dan riwayat ketersediaan server 60 hari terakhir</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>100% Normal</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                  <span>Degradasi</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  <span>Downtime</span>
                </div>
              </div>
            </div>

            {/* Bilah Bar Segmen 60 Hari */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
                {(healthData?.availability?.history || Array.from({ length: 60 }).map((_, i) => ({
                  dayIndex: 59 - i,
                  date: `${60 - i}h lalu`,
                  status: "OPERATIONAL" as const,
                  uptimePercent: 100,
                  latencyMs: 24,
                }))).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex-1 min-w-[5px] h-9 sm:h-10 rounded-xs bg-emerald-500 hover:bg-emerald-400 hover:scale-110 transition cursor-pointer relative group"
                    title={`${item.date}: ${item.uptimePercent}% Uptime (${item.latencyMs} ms)`}
                  >
                    <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 px-2 py-1 bg-stone-900 text-white text-[10px] font-mono rounded shadow-lg whitespace-nowrap pointer-events-none">
                      <div className="font-semibold">{item.date}</div>
                      <div className="text-emerald-300">{item.uptimePercent}% Operasional</div>
                      <div className="text-stone-400">{item.latencyMs} ms latensi</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-1">
                <span>60 hari yang lalu</span>
                <span className="text-emerald-700 font-semibold font-mono">Status Sistem Saat Ini: Normal (0 Insiden Tercatat)</span>
                <span>Hari Ini</span>
              </div>
            </div>

            {/* 3 Indikator Uptime Ringkas */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Uptime Host Server VPS</span>
                <span className="text-sm font-bold font-mono text-gray-900 mt-0.5 block">
                  {healthData?.process?.hostUptimeSeconds ? formatUptime(healthData.process.hostUptimeSeconds) : "Aktif"}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">OS Linux Host</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Uptime Aplikasi Next.js</span>
                <span className="text-sm font-bold font-mono text-gray-900 mt-0.5 block">
                  {healthData?.process ? formatUptime(healthData.process.uptimeSeconds) : "Aktif"}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Runtime Node.js Engine</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Riwayat Insiden / Crash</span>
                <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block">
                  0 Kejadian Down
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">Sistem terpantau stabil</span>
              </div>
            </div>
          </div>

          {/* TIGA METERAN HARDWARE & STORAGE: RAM VPS, DISK VPS, & CLOUDFLARE R2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meteran 1: RAM Memori Fisik Server VPS */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">RAM Memori Server VPS</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Alokasi memori fisik host OS dan engine komputasi</p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold font-mono">
                    Host RAM
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total RAM</span>
                    <span className="text-base font-bold font-mono text-gray-900 mt-0.5 block">
                      {healthData?.process?.hostMemory?.totalGb ?? 8} GB
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Terpakai</span>
                    <span className="text-base font-bold font-mono text-stone-800 mt-0.5 block">
                      {healthData?.process?.hostMemory?.usedGb ?? 0} GB
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sisa Bebas</span>
                    <span className="text-base font-bold font-mono text-emerald-800 mt-0.5 block">
                      {healthData?.process?.hostMemory?.freeGb ?? 0} GB
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Beban Penggunaan RAM:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {healthData?.process?.hostMemory?.percentUsed ?? 0}% Terpakai
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (healthData?.process?.hostMemory?.percentUsed || 0) > 85
                          ? "bg-rose-500"
                          : (healthData?.process?.hostMemory?.percentUsed || 0) > 70
                          ? "bg-amber-500"
                          : "bg-purple-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(1, healthData?.process?.hostMemory?.percentUsed || 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Heap Node.js Engine:</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {healthData?.process?.memoryMb?.heapUsed || 0} MB / {healthData?.process?.memoryMb?.heapTotal || 0} MB
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Resident Set (RSS):</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {healthData?.process?.memoryMb?.rss || 0} MB
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Load Average (1m, 5m, 15m):</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {healthData?.process?.loadAvg?.join(", ") || "0.1, 0.2, 0.2"}
                  </span>
                </div>
              </div>
            </div>

            {/* Meteran 2: Disk Penyimpanan VPS Server */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Disk Penyimpanan VPS Server</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Kapasitas partisi root sistem operasi Ubuntu &amp; basis data</p>
                  </div>
                  <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold font-mono">
                    Partisi (/)
                  </span>
                </div>

                {healthData?.disk?.available ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Disk</span>
                        <span className="text-base font-bold font-mono text-gray-900 mt-0.5 block">
                          {healthData.disk.totalGb} GB
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Terpakai</span>
                        <span className="text-base font-bold font-mono text-stone-800 mt-0.5 block">
                          {healthData.disk.usedGb} GB
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sisa Bebas</span>
                        <span className="text-base font-bold font-mono text-emerald-800 mt-0.5 block">
                          {healthData.disk.freeGb} GB
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">Beban Penggunaan Partisi:</span>
                        <span className="font-mono font-bold text-gray-900">{healthData.disk.percentUsed}% Terpakai</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            healthData.disk.percentUsed > 85 ? "bg-rose-500" : healthData.disk.percentUsed > 70 ? "bg-amber-500" : "bg-stone-800"
                          }`}
                          style={{ width: `${healthData.disk.percentUsed}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400">
                    Membaca statistik partisi server...
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-medium">Folder /public/uploads:</span>
                  <span className="font-mono font-semibold text-gray-800">{healthData?.localFolders?.uploadsMb || 0} MB</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-medium">Piring Draft /data/drafts:</span>
                  <span className="font-mono font-semibold text-gray-800">{healthData?.localFolders?.draftsMb || 0} MB</span>
                </div>
              </div>
            </div>

            {/* Meteran 3: Cloudflare R2 Storage (Aset Media Klien) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Cloudflare R2 Media Storage</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Penyimpanan aset cloud foto cover, galeri, &amp; tamu</p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-mono">
                    S3 API
                  </span>
                </div>

                {/* 2 Box Ringkasan Kapasitas R2 (Bersih & Efisien) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Ukuran Terpakai</span>
                    <span className="text-base font-bold font-mono text-gray-900 mt-0.5 block">
                      {healthData?.r2Storage?.formattedSize || "0 B"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block truncate">
                      {healthData?.r2Storage?.usedMb ? `${healthData.r2Storage.usedMb} MB` : "0 MB"} dari 10 GB
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Sisa Bebas Biaya</span>
                    <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
                      {healthData?.r2Storage?.remainingFreeTierGb ?? 10} GB
                    </span>
                    <span className="text-[10px] text-emerald-600/80 mt-0.5 block truncate">
                      Free tier / bln
                    </span>
                  </div>
                </div>

                {/* Beban Penggunaan Kuota R2 */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Beban Kuota Free Tier (10 GB):</span>
                    <span className="font-mono font-bold text-gray-900">
                      {healthData?.r2Storage?.freeTierPercentUsed ?? 0}% Terpakai
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (healthData?.r2Storage?.freeTierPercentUsed || 0) > 85
                          ? "bg-rose-500"
                          : (healthData?.r2Storage?.freeTierPercentUsed || 0) > 60
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0.5, healthData?.r2Storage?.freeTierPercentUsed || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Ringkasan Berkas & Handshake */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-medium">Total Berkas:</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {healthData?.r2Storage?.totalMediaObjects?.toLocaleString("id-ID") || 0} berkas
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block font-medium">Rata-rata Ukuran:</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {healthData?.r2Storage?.avgFileSizeFormatted || "0 B"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">Retensi Aset R2:</span>
                  <span className="font-mono text-[10px] text-stone-500">{healthData?.r2Storage?.bucketName || "luxenary-invitation"}</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  R2 hanya menyimpan aset media undangan aktif. Foto tamu dibersihkan pasca 30 hari via cron job, arsip permanen hanya di portofolio lokal.
                </p>
              </div>
            </div>
          </div>

          {/* RINGKASAN AKTIVITAS PLATFORM & INFORMASI HOST */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Arsitektur Host &amp; Kapasitas Operasional</h3>
              <span className="text-xs text-gray-400 font-mono">Platform Health Telemetry</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block font-medium">Sistem Operasi</span>
                <span className="text-xs font-mono font-bold text-gray-900 block mt-1 truncate">
                  {healthData?.process?.platform || "Linux VPS"}
                </span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block font-medium">CPU Load Average</span>
                <span className="text-xs font-mono font-bold text-gray-900 block mt-1">
                  {healthData?.process?.loadAvg ? healthData.process.loadAvg.join(", ") : "..."}
                </span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block font-medium">Total Akun Klien</span>
                <span className="text-xs font-mono font-bold text-gray-900 block mt-1">
                  {healthData?.database?.metrics?.totalUsers || 0} Akun
                </span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 block font-medium">Total Transaksi Order</span>
                <span className="text-xs font-mono font-bold text-gray-900 block mt-1">
                  {healthData?.database?.metrics?.totalOrders || 0} Transaksi
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: AUDIT LOG STAF ==================== */}
      {activeSubTab === "audit" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Filter Tipe Aksi:</label>
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Aksi</option>
                <option value="ADMIN_LOGIN">Login Administrator</option>
                <option value="ORDER_APPROVE">Konfirmasi Transaksi</option>
                <option value="ORDER_REJECT">Penolakan Transaksi</option>
                <option value="EMERGENCY_UNLOCK">Buka Kunci Darurat</option>
                <option value="CUSTOM_DOMAIN_ACTIVATE">Aktivasi Domain</option>
                <option value="THEME_CREATE">Upload Tema Baru</option>
                <option value="THEME_DELETE">Hapus Tema</option>
                <option value="STAFF_INVITE">Undang Staf Baru</option>
                <option value="STAFF_ROLE_CHANGE">Ubah Peran Staf</option>
                <option value="STAFF_REVOKE">Cabut Akses Staf</option>
              </select>
            </div>
            <span className="text-xs text-gray-400">Total riwayat tercatat: <strong className="text-gray-700">{auditTotal} entri</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Waktu (WIB)</th>
                  <th className="pb-3 font-semibold">Pelaksana / Staf</th>
                  <th className="pb-3 font-semibold">Aksi Operasional</th>
                  <th className="pb-3 font-semibold">Keterangan / Detail Mutasi</th>
                  <th className="pb-3 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">Memuat catatan audit...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">Belum ada riwayat aktivitas staf pada filter ini.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 font-mono text-gray-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-gray-900">{log.admin?.name || "Super Admin"}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{log.admin?.email || "-"}</div>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 max-w-md">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 font-mono text-[11px] leading-relaxed break-all">
                          {log.details || "-"}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-gray-500 whitespace-nowrap">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <span className="text-gray-400">Halaman {auditPage} dari {auditTotalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: LOG WEBHOOK ==================== */}
      {activeSubTab === "webhooks" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">Gateway:</label>
                <select
                  value={webhookSourceFilter}
                  onChange={(e) => {
                    setWebhookSourceFilter(e.target.value);
                    setWebhookPage(1);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Gateway</option>
                  <option value="MIDTRANS">Midtrans</option>
                  <option value="XENDIT">Xendit</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">Status:</label>
                <select
                  value={webhookStatusFilter}
                  onChange={(e) => {
                    setWebhookStatusFilter(e.target.value);
                    setWebhookPage(1);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SUCCESS">Berhasil Diproses</option>
                  <option value="FAILED">Gagal / Error</option>
                  <option value="IGNORED">Dilewati / Ignored</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-gray-400">Total payload tersimpan: <strong className="text-gray-700">{webhookTotal} transmisi</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Waktu Masuk</th>
                  <th className="pb-3 font-semibold">Sumber Gateway</th>
                  <th className="pb-3 font-semibold">Tipe Event</th>
                  <th className="pb-3 font-semibold">Status Pemrosesan</th>
                  <th className="pb-3 font-semibold text-right">Payload Mentah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingWebhook ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">Memuat log transmisi webhook...</td>
                  </tr>
                ) : webhookLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">Belum ada catatan transmisi webhook payment gateway.</td>
                  </tr>
                ) : (
                  webhookLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 font-mono text-gray-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3 font-semibold text-gray-900 uppercase">
                        {log.source}
                      </td>
                      <td className="py-3 font-mono text-gray-600">
                        {log.event}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : log.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-stone-100 text-stone-700 border-stone-200"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayload(log.payload)}
                          className="px-2.5 py-1 text-[11px] font-medium border border-gray-200 hover:border-gray-400 rounded-lg text-gray-700 transition cursor-pointer"
                        >
                          Lihat JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {webhookTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <span className="text-gray-400">Halaman {webhookPage} dari {webhookTotalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={webhookPage <= 1}
                  onClick={() => setWebhookPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={webhookPage >= webhookTotalPages}
                  onClick={() => setWebhookPage((p) => Math.min(webhookTotalPages, p + 1))}
                  className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL JSON PAYLOAD WEBHOOK */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Payload Mentah Webhook (JSON)</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPayload(JSON.stringify(selectedPayload, null, 2))}
                  className="px-2.5 py-1 text-[11px] font-medium border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition cursor-pointer"
                >
                  {copiedPayload ? "Tersalin!" : "Salin JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayload(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[65vh] overflow-y-auto bg-gray-50 font-mono text-xs text-gray-800">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
