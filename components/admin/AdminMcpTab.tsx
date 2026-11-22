"use client";

import { useCallback, useEffect, useState } from "react";
import { useFeedback } from "@/components/ui/Feedback";

interface McpScopeDef {
  id: string;
  label: string;
  kind: "READ_ONLY" | "WRITE_SAFE";
  description: string;
}

interface McpDepartmentPreset {
  id: string;
  label: string;
  roleSummary: string;
  defaultScopes: string[];
}

interface McpKeyItem {
  id: string;
  name: string;
  department: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdByLabel: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface McpToolSummary {
  name: string;
  description: string;
  requiredScopes: string[];
  readOnly: boolean;
}

interface McpResourceSummary {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

interface McpAuditItem {
  id: string;
  adminLabel: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface McpDashboardData {
  serverInfo: {
    name: string;
    version: string;
    protocolVersion: string;
    transport: string;
    endpointUrl: string;
  };
  config: {
    enabled: boolean;
    rateLimitPerMin: number;
  };
  keys: McpKeyItem[];
  scopes: McpScopeDef[];
  departments: McpDepartmentPreset[];
  toolsCatalog: McpToolSummary[];
  resourcesCatalog: McpResourceSummary[];
  recentLogs: McpAuditItem[];
}

interface HandshakeResult {
  latencyMs: number;
  mcpEnabled: boolean;
  protocolVersion: string;
  toolsCount: number;
  resourcesCount: number;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Belum pernah";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminMcpTab({
  onToast,
}: {
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const feedback = useFeedback();
  const [data, setData] = useState<McpDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Global config state
  const [enabledDraft, setEnabledDraft] = useState(true);
  const [rateDraft, setRateDraft] = useState("60");
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingHandshake, setTestingHandshake] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<HandshakeResult | null>(null);

  // Create key form state
  const [keyName, setKeyName] = useState("");
  const [department, setDepartment] = useState("DEPT_6_FINANCE");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "docs:read",
    "finance:read",
    "ops:read",
  ]);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);

  // Newly revealed one-time key modal
  const [revealedKey, setRevealedKey] = useState<{
    rawKey: string;
    name: string;
    department: string;
    scopes: string[];
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit key scopes modal
  const [editingKey, setEditingKey] = useState<McpKeyItem | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Bottom inspector tab
  const [inspectorTab, setInspectorTab] = useState<"tools" | "resources" | "logs">("tools");
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/mcp", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoadError(json?.error || `Gagal memuat konfigurasi MCP (HTTP ${res.status}).`);
        return;
      }
      setData(json);
      setEnabledDraft(Boolean(json.config?.enabled));
      setRateDraft(String(json.config?.rateLimitPerMin ?? 60));
    } catch {
      setLoadError("Gagal terhubung ke server untuk memuat konfigurasi MCP.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyText = async (value: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(tag);
      onToast("Tersalin ke clipboard.");
      setTimeout(() => setCopiedField((prev) => (prev === tag ? null : prev)), 2500);
    } catch {
      onToast("Gagal menyalin ke clipboard.", false);
    }
  };

  const applyDepartmentPreset = (presetId: string) => {
    setDepartment(presetId);
    const preset = data?.departments.find((d) => d.id === presetId);
    if (preset) {
      setSelectedScopes([...preset.defaultScopes]);
      if (!keyName.trim() && preset.id !== "GENERAL") {
        setKeyName(preset.label);
      }
    }
  };

  const toggleScope = (scopeId: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(scopeId)) {
      setter(list.filter((s) => s !== scopeId));
    } else {
      setter([...list, scopeId]);
    }
  };

  const handleSaveConfig = async () => {
    const parsedRate = Number.parseInt(rateDraft, 10);
    if (!Number.isInteger(parsedRate) || parsedRate < 1 || parsedRate > 600) {
      onToast("Batas rate limit harus bilangan bulat 1 sampai 600 request/menit.", false);
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/mcp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          enabled: enabledDraft,
          rateLimitPerMin: parsedRate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onToast(json?.error || "Gagal menyimpan konfigurasi MCP.", false);
        return;
      }
      onToast("Konfigurasi Remote MCP Server diperbarui.");
      await loadData();
    } catch {
      onToast("Koneksi terputus saat menyimpan konfigurasi MCP.", false);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestHandshake = async () => {
    setTestingHandshake(true);
    try {
      const res = await fetch("/api/admin/mcp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_handshake" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast(json?.error || "Handshake MCP gagal.", false);
        return;
      }
      setHandshakeResult({
        latencyMs: json.latencyMs,
        mcpEnabled: json.mcpEnabled,
        protocolVersion: json.protocolVersion,
        toolsCount: json.toolsCount,
        resourcesCount: json.resourcesCount,
      });
      onToast(
        `Handshake MCP lolos (${json.toolsCount} tools, ${json.resourcesCount} resources, ${json.latencyMs}ms).`
      );
    } catch {
      onToast("Gagal menjalankan uji handshake MCP.", false);
    } finally {
      setTestingHandshake(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyName.trim().length < 2) {
      onToast("Nama kunci minimal 2 karakter.", false);
      return;
    }
    if (selectedScopes.length === 0) {
      onToast("Pilih minimal satu scope izin.", false);
      return;
    }
    setCreatingKey(true);
    try {
      const res = await fetch("/api/admin/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName.trim(),
          department,
          scopes: selectedScopes,
          expiresInDays: expiresInDays ? Number.parseInt(expiresInDays, 10) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast(json?.error || "Gagal membuat kunci MCP.", false);
        return;
      }
      setRevealedKey({
        rawKey: json.rawKey,
        name: json.key.name,
        department: json.key.department,
        scopes: json.key.scopes,
      });
      setKeyName("");
      setExpiresInDays("");
      onToast("Kunci API MCP berhasil dibuat. Simpan sekarang karena hanya tampil satu kali.");
      await loadData();
    } catch {
      onToast("Koneksi terputus saat membuat kunci MCP.", false);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleToggleActive = async (key: McpKeyItem) => {
    setBusyKeyId(key.id);
    try {
      const res = await fetch(`/api/admin/mcp/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        onToast(json?.error || "Gagal mengubah status kunci.", false);
        return;
      }
      onToast(key.isActive ? `Kunci "${key.name}" dijeda.` : `Kunci "${key.name}" diaktifkan kembali.`);
      await loadData();
    } catch {
      onToast("Gagal terhubung ke server.", false);
    } finally {
      setBusyKeyId(null);
    }
  };

  const handleRevokeKey = async (key: McpKeyItem, permanent = false) => {
    const ok = await feedback.confirm({
      title: permanent ? "Hapus Permanen Riwayat Kunci?" : "Cabut Kunci API MCP?",
      message: permanent
        ? `Riwayat kunci "${key.name}" (${key.keyPrefix}...) akan dihapus permanen dari tabel.`
        : `Kunci "${key.name}" (${key.keyPrefix}...) akan dicabut permanen dan seluruh agen AI yang memakainya langsung kehilangan akses.`,
      confirmLabel: permanent ? "Hapus Permanen" : "Cabut Kunci",
      danger: true,
    });
    if (!ok) return;

    setBusyKeyId(key.id);
    try {
      const res = await fetch(`/api/admin/mcp/${key.id}${permanent ? "?permanent=1" : ""}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        onToast(json?.error || "Gagal mencabut kunci.", false);
        return;
      }
      onToast(permanent ? "Riwayat kunci dihapus." : `Kunci "${key.name}" berhasil dicabut.`);
      await loadData();
    } catch {
      onToast("Gagal terhubung ke server.", false);
    } finally {
      setBusyKeyId(null);
    }
  };

  const handleSaveEditKey = async () => {
    if (!editingKey) return;
    if (editScopes.length === 0) {
      onToast("Minimal satu scope harus aktif.", false);
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/mcp/${editingKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          scopes: editScopes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onToast(json?.error || "Gagal memperbarui kunci.", false);
        return;
      }
      setEditingKey(null);
      onToast("Scope dan nama kunci MCP diperbarui.");
      await loadData();
    } catch {
      onToast("Gagal terhubung ke server.", false);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-gray-500">Memuat Remote MCP Server...</span>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-2xl">
        <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (!data) return null;

  const activeKeysCount = data.keys.filter((k) => k.isActive && !k.revokedAt).length;
  const endpointUrl = data.serverInfo.endpointUrl;

  const buildClientJsonSnippet = (token: string) =>
    JSON.stringify(
      {
        mcpServers: {
          "luxvite-server": {
            url: endpointUrl,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
      null,
      2
    );

  const buildCurlSnippet = (token: string) =>
    `curl -s -X POST "${endpointUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${token}" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <div className="space-y-6 max-w-7xl w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Remote MCP Server &amp; AI Access</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerbang MCP Streamable HTTP terpusat di server produksi untuk seluruh departemen karyawan AI dengan kunci API &amp; scope granular.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestHandshake}
            disabled={testingHandshake}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            {testingHandshake ? "Menguji..." : "Uji Handshake MCP"}
          </button>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200/70 transition cursor-pointer"
          >
            Segarkan
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span
              className={`w-2 h-2 rounded-full ${
                data.config.enabled ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span>Status Endpoint</span>
          </div>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {data.config.enabled ? "Aktif" : "Nonaktif"}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Protokol {data.serverInfo.protocolVersion}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Kunci AI Aktif</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{activeKeysCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Total {data.keys.length} kunci tercatat
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Tools &amp; Resources</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {data.toolsCatalog.length} Tools · {data.resourcesCatalog.length} Docs
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">6 scope RBAC terisolasi</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Batas Rate Limit</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {data.config.rateLimitPerMin} req/menit
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Per kunci · PostgreSQL lintas worker</p>
        </div>
      </div>

      {/* ── Handshake Result Banner ── */}
      {handshakeResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <span>
              <strong>Handshake MCP Valid:</strong> Protokol{" "}
              <code className="font-mono">{handshakeResult.protocolVersion}</code> ·{" "}
              {handshakeResult.toolsCount} tools · {handshakeResult.resourcesCount} resources ·{" "}
              {handshakeResult.latencyMs} ms · Status publik:{" "}
              <strong>{handshakeResult.mcpEnabled ? "Aktif" : "Nonaktif (Kill-Switch)"}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHandshakeResult(null)}
            className="text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ── Master Switch & Endpoint Configuration ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Endpoint &amp; Kontrol Global</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Hanya aktif di domain apex utama (otomatis 404 pada subdomain &amp; custom domain klien via <code className="font-mono">proxy.ts</code>).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-mono text-gray-800 select-all">
              {endpointUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText(endpointUrl, "endpoint")}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition cursor-pointer"
            >
              {copiedField === "endpoint" ? "Tersalin" : "Salin URL"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-gray-900 block">Aktifkan MCP Server</span>
              <span className="text-[11px] text-gray-500">
                Matikan untuk menghentikan seluruh koneksi AI seketika
              </span>
            </div>
            <input
              type="checkbox"
              checked={enabledDraft}
              onChange={(e) => setEnabledDraft(e.target.checked)}
              className="w-4 h-4 accent-amber-700 cursor-pointer"
            />
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Rate Limit per Kunci (req/menit)
            </label>
            <input
              type="number"
              min={1}
              max={600}
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? "Menyimpan..." : "Simpan Konfigurasi"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Create New MCP Key Card ── */}
      <form
        onSubmit={handleCreateKey}
        className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5"
      >
        <div>
          <h3 className="text-sm font-bold text-gray-900">Terbitkan Kunci API Karyawan AI Baru</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Pilih preset departemen agar izin langsung sesuai prinsip <em>least privilege</em>, lalu sesuaikan scope bila perlu.
          </p>
        </div>

        {/* Preset Department Selector */}
        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-2">
            Preset Departemen AI
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {data.departments.map((dept) => {
              const active = department === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => applyDepartmentPreset(dept.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? "border-amber-600 bg-amber-50/70 shadow-2xs"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900 truncate">{dept.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{dept.roleSummary}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name & Expiry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nama / Label Kunci
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder="Contoh: Dept 6 Finance — Tika & Nanda"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Masa Berlaku (Opsional)
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
            >
              <option value="">Tidak pernah kedaluwarsa</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="180">180 hari</option>
              <option value="365">365 hari</option>
            </select>
          </div>
        </div>

        {/* Granular Scope Checkboxes */}
        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-2">
            Scope Izin Granular ({selectedScopes.length} dipilih)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.scopes.map((scope) => {
              const checked = selectedScopes.includes(scope.id);
              const isWrite = scope.kind === "WRITE_SAFE";
              return (
                <label
                  key={scope.id}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                    checked
                      ? isWrite
                        ? "border-amber-500 bg-amber-50/70"
                        : "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white hover:bg-gray-50/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleScope(scope.id, selectedScopes, setSelectedScopes)}
                    className="mt-0.5 w-4 h-4 accent-amber-700 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <code className="text-xs font-bold font-mono text-gray-900">{scope.id}</code>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                          isWrite
                            ? "bg-amber-100 text-amber-900"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isWrite ? "Write Non-Finansial" : "Read-Only"}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-800 mt-0.5">{scope.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                      {scope.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creatingKey}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
          >
            {creatingKey ? "Menerbitkan Kunci..." : "Terbitkan Kunci API MCP"}
          </button>
        </div>
      </form>

      {/* ── Keys Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Daftar Kunci API MCP</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Kunci disimpan sebagai hash SHA-256. Cabut segera jika token bocor atau agen diganti.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{data.keys.length} entri</span>
        </div>

        {data.keys.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Belum ada kunci API MCP yang diterbitkan. Buat kunci pertama menggunakan formulir di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Kunci &amp; Departemen</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Scope Izin</th>
                  <th className="py-3 px-4">Pemakaian</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {data.keys.map((k) => {
                  const isRevoked = Boolean(k.revokedAt);
                  const isExpired = Boolean(
                    k.expiresAt && new Date(k.expiresAt).getTime() <= Date.now()
                  );
                  const isBusy = busyKeyId === k.id;
                  return (
                    <tr key={k.id} className={isRevoked ? "bg-gray-50/60 opacity-70" : "hover:bg-gray-50/40"}>
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">{k.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono">{k.department}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="px-2 py-0.5 rounded bg-gray-100 text-[11px] font-mono text-gray-700">
                          {k.keyPrefix}...
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {k.scopes.map((sc) => (
                            <span
                              key={sc}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                sc === "ops:write"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-gray-600">
                        <p className="font-semibold text-gray-900">{k.usageCount} req</p>
                        <p className="text-gray-500">{formatDateTime(k.lastUsedAt)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRevoked || isExpired
                                ? "bg-rose-500"
                                : k.isActive
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                            }`}
                          />
                          <span className="font-semibold text-gray-700">
                            {isRevoked
                              ? "Dicabut"
                              : isExpired
                                ? "Kedaluwarsa"
                                : k.isActive
                                  ? "Aktif"
                                  : "Dijeda"}
                          </span>
                        </div>
                        {k.expiresAt && !isRevoked && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            s/d {formatDateTime(k.expiresAt)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {!isRevoked ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setEditingKey(k);
                                setEditName(k.name);
                                setEditScopes([...k.scopes]);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Scope
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleActive(k)}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {k.isActive ? "Jeda" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRevokeKey(k, false)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              Cabut
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRevokeKey(k, true)}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-700 hover:border-rose-200 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Inspector: Tools / Resources / Activity Logs ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 pt-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
          {(
            [
              { id: "tools", label: `Katalog Tools (${data.toolsCatalog.length})` },
              { id: "resources", label: `Dokumentasi Resources (${data.resourcesCatalog.length})` },
              { id: "logs", label: `Log Aktivitas MCP (${data.recentLogs.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setInspectorTab(t.id)}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                inspectorTab === t.id
                  ? "border-amber-700 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {inspectorTab === "tools" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.toolsCatalog.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <code className="text-xs font-bold font-mono text-gray-900">{tool.name}</code>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          tool.readOnly
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {tool.readOnly ? "Read-Only" : "Write Non-Finansial"}
                      </span>
                      {tool.requiredScopes.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{tool.description}</p>
                </div>
              ))}
            </div>
          )}

          {inspectorTab === "resources" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {data.resourcesCatalog.map((res) => (
                <div
                  key={res.uri}
                  className="p-3 rounded-xl border border-gray-200 bg-gray-50/40"
                >
                  <code className="text-[11px] font-mono font-bold text-amber-800">{res.uri}</code>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">{res.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{res.description}</p>
                </div>
              ))}
            </div>
          )}

          {inspectorTab === "logs" && (
            <div className="overflow-x-auto">
              {data.recentLogs.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  Belum ada aktivitas MCP tercatat.
                </p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] text-gray-500 uppercase">
                      <th className="py-2 pr-4">Waktu</th>
                      <th className="py-2 pr-4">Aktor / Departemen</th>
                      <th className="py-2 pr-4">Aksi</th>
                      <th className="py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-gray-800">
                          {log.adminLabel || "SYSTEM"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <code className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-800">
                            {log.action}
                          </code>
                        </td>
                        <td className="py-2.5 text-[11px] font-mono text-gray-600 max-w-md truncate">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── One-Time Revealed Key Modal ── */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Kunci API MCP Berhasil Diterbitkan
              </h3>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
                Salin dan simpan kunci ini sekarang. Demi keamanan, kunci mentah tidak disimpan di database dan tidak dapat dilihat kembali setelah jendela ini ditutup.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-700">
                Bearer API Key ({revealedKey.name})
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-xl bg-gray-900 text-emerald-300 text-xs font-mono break-all select-all">
                  {revealedKey.rawKey}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(revealedKey.rawKey, "rawKey")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 cursor-pointer shrink-0"
                >
                  {copiedField === "rawKey" ? "Tersalin" : "Salin Kunci"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                  Konfigurasi JSON (Antigravity / Claude / Cursor)
                </span>
                <button
                  type="button"
                  onClick={() => copyText(buildClientJsonSnippet(revealedKey.rawKey), "jsonSnippet")}
                  className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  {copiedField === "jsonSnippet" ? "Tersalin" : "Salin JSON"}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-800 overflow-x-auto">
                {buildClientJsonSnippet(revealedKey.rawKey)}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                  Uji Cepat via Terminal (cURL)
                </span>
                <button
                  type="button"
                  onClick={() => copyText(buildCurlSnippet(revealedKey.rawKey), "curlSnippet")}
                  className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  {copiedField === "curlSnippet" ? "Tersalin" : "Salin cURL"}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-800 overflow-x-auto">
                {buildCurlSnippet(revealedKey.rawKey)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
              >
                Saya Sudah Menyimpan Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Key Scope Modal ── */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Ubah Nama &amp; Scope Kunci MCP
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Kunci</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.scopes.map((scope) => (
                <label
                  key={scope.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={editScopes.includes(scope.id)}
                    onChange={() => toggleScope(scope.id, editScopes, setEditScopes)}
                    className="mt-0.5 w-4 h-4 accent-amber-700 cursor-pointer"
                  />
                  <div>
                    <code className="text-xs font-bold font-mono text-gray-900">{scope.id}</code>
                    <p className="text-[11px] text-gray-500">{scope.label}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEditKey}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
