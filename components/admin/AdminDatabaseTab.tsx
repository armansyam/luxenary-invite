"use client";

import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Snapshot {
  filename: string;
  size: number;
  sizeFormatted: string;
  label: string;
  createdAt: string;
  isSafetyBackup?: boolean;
}

interface BackupPathInfo {
  configuredPath: string;
  resolvedPath: string;
  isRelative: boolean;
  isValid: boolean;
  isWritable: boolean;
  isFallback: boolean;
  fallbackPath: string;
  error?: string;
  fixCommand?: string;
  locationType: "PROJECT_INTERNAL" | "EXTERNAL_MOUNT" | "CUSTOM_PATH";
}

interface Props {
  // State
  snapshots: Snapshot[];
  loadingSnapshots: boolean;
  creatingSnapshot: boolean;
  restoringSnapshot: string | null;
  deletingSnapshot: string | null;
  showUploadSnapshot: boolean;
  pendingRestoreFile: File | null;
  uploadingRestoreFile: boolean;
  savingBackupSettings: boolean;
  backupActionMsg: { ok: boolean; msg: string } | null;
  backupPathInfo: BackupPathInfo | null;
  testingBackupPath: boolean;
  copiedCommand: boolean;
  settingsMap: Record<string, string>;
  editSection: Record<string, boolean>;
  settingsSaved: Record<string, boolean>;
  // Setters
  setShowUploadSnapshot: (v: boolean) => void;
  setPendingRestoreFile: (v: File | null) => void;
  setCopiedCommand: (v: boolean) => void;
  setBackupActionMsg: (v: { ok: boolean; msg: string } | null) => void;
  setSetting: (key: string, value: string) => void;
  // Handlers
  handleCreateSnapshot: () => void;
  handleRestoreSnapshot: (filename: string) => void;
  handleUploadAndRestore: () => void;
  handleDeleteSnapshot: (filename: string) => void;
  loadSnapshots: () => void;
  testCurrentBackupPath: (path?: string) => void;
  toggleEditSection: (section: string) => void;
  cancelEdit: (section: string, keys: string[]) => void;
  isSectionDirty: (keys: string[]) => boolean;
  saveSettings: (keys: string[], savingFn: (v: boolean) => void, group: string) => void;
  setSavingBackupSettings: (v: boolean) => void;
}

export default function AdminDatabaseTab(props: Props) {
  const {
    snapshots, loadingSnapshots, creatingSnapshot, restoringSnapshot, deletingSnapshot,
    showUploadSnapshot, pendingRestoreFile, uploadingRestoreFile, savingBackupSettings,
    backupActionMsg, backupPathInfo, testingBackupPath, copiedCommand,
    settingsMap, editSection, settingsSaved,
    setShowUploadSnapshot, setPendingRestoreFile, setCopiedCommand, setBackupActionMsg,
    setSetting,
    handleCreateSnapshot, handleRestoreSnapshot, handleUploadAndRestore, handleDeleteSnapshot,
    loadSnapshots, testCurrentBackupPath, toggleEditSection, cancelEdit, isSectionDirty,
    saveSettings, setSavingBackupSettings,
  } = props;

  return (
<div className="space-y-6">
  {/* Header & Status Banner */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Database &amp; Snapshot Manager</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        Kelola backup, snapshot database PostgreSQL mandiri, jadwal auto-backup, dan pemulihan data (restore).
      </p>
    </div>
    <button
      type="button"
      onClick={handleCreateSnapshot}
      disabled={creatingSnapshot}
      className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
    >
      {creatingSnapshot ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Membuat Snapshot...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Buat Snapshot Sekarang</span>
        </>
      )}
    </button>
  </div>

  {/* Feedback Message */}
  {backupActionMsg && (
    <div className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
      backupActionMsg.ok
        ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
        : "bg-rose-50 border border-rose-300 text-rose-900"
    }`}>
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {backupActionMsg.ok
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        }
      </svg>
      <span>{backupActionMsg.msg}</span>
    </div>
  )}

  {/* Database Info Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
      <span className="text-xs text-gray-500 font-medium block">Database Engine &amp; File Aktif</span>
      <span className="text-sm font-bold text-gray-900 mt-1 inline-block">PostgreSQL (pg_dump)</span>
      <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">● Connected &amp; Running</span>
    </div>
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
      <span className="text-xs text-gray-500 font-medium block">Total Snapshot Tersedia</span>
      <span className="text-2xl font-bold text-gray-900 mt-1 inline-block">{snapshots.length}</span>
      <span className="text-[11px] text-gray-400 block mt-0.5">File snapshot (.sql) di server</span>
    </div>
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
      <span className="text-xs text-gray-500 font-medium block">Path Direktori Backup</span>
      <span className="text-xs font-mono font-bold text-amber-900 mt-1 inline-block bg-amber-50 px-2 py-1 rounded-md border border-amber-200/60 truncate max-w-full" title={backupPathInfo?.resolvedPath || settingsMap["backup_path"] || "./data/backups"}>
        {backupPathInfo?.resolvedPath || settingsMap["backup_path"] || "./data/backups"}
      </span>
    </div>
  </div>

  {/* ── Card 1: Upload File Snapshot & Restore ── */}
  <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
    showUploadSnapshot ? "border-amber-400 ring-2 ring-amber-400/20" : "border-gray-200 hover:border-gray-300"
  }`}>
    <div className="flex items-start justify-between gap-4 mb-3 border-b border-gray-100 pb-3.5">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Upload &amp; Restore Snapshot (.db)</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Pulihkan database dari file backup eksternal. Safety backup dibuat otomatis sebelum data ditimpa.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowUploadSnapshot(!showUploadSnapshot);
          setPendingRestoreFile(null);
        }}
        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>{showUploadSnapshot ? "Tutup Form" : "Upload File"}</span>
      </button>
    </div>

    {!showUploadSnapshot ? (
      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Format didukung: <strong>.sql, .backup</strong>. Engine aktif saat ini: <strong>PostgreSQL</strong></span>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadSnapshot(true)}
          className="text-amber-800 hover:underline font-semibold text-xs cursor-pointer"
        >
          Pilih file snapshot
        </button>
      </div>
    ) : (
      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700">Pilih File Snapshot Database</p>
            <p className="text-xs text-gray-500">
              {pendingRestoreFile ? (
                <span className="text-amber-800 font-bold">File terpilih: {pendingRestoreFile.name} ({(pendingRestoreFile.size / 1024).toFixed(1)} KB)</span>
              ) : (
                "Belum ada file dipilih (format didukung: .sql, .backup)"
              )}
            </p>
          </div>

          <label className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl cursor-pointer transition text-center shrink-0">
            Pilih File .db
            <input
              type="file"
              accept=".sql,.backup"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingRestoreFile(f);
                  setBackupActionMsg(null);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Warning & Simpan / Restore Actions */}
        <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Sistem otomatis membuat safety backup sebelum restore dieksekusi.</span>
          </div>

          <div className="flex items-center gap-2">
            {pendingRestoreFile && (
              <button
                type="button"
                onClick={() => setPendingRestoreFile(null)}
                disabled={uploadingRestoreFile}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleUploadAndRestore}
              disabled={!pendingRestoreFile || uploadingRestoreFile}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {uploadingRestoreFile ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Me-restore Database...</span>
                </>
              ) : (
                <span>Simpan &amp; Restore Sekarang</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* ── Card 2: Pengaturan Jadwal Auto-Backup (Dinamis) ── */}
  <SettingsCard
    title="Jadwal Auto-Backup Database"
    description="Atur waktu otomatis pembuatan snapshot database setiap hari dan batas rotasi retensi file."
    isEditing={Boolean(editSection["backup"])}
    onEdit={() => toggleEditSection("backup")}
    onCancel={() => cancelEdit("backup", ["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"])}
    onSave={() => saveSettings(["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"], setSavingBackupSettings, "backup")}
    saving={savingBackupSettings}
    isDirty={isSectionDirty(["backup_auto_enabled", "backup_auto_time", "backup_path", "backup_retention_count"])}
    saveSuccess={settingsSaved["backup"]}
    saveSuccessMessage="Pengaturan auto-backup berhasil disimpan"
    viewContent={
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Status Auto-Backup</span>
          <span className={`text-sm font-bold mt-0.5 inline-block ${
            settingsMap["backup_auto_enabled"] === "false" ? "text-rose-600" : "text-emerald-700"
          }`}>
            {settingsMap["backup_auto_enabled"] === "false" ? "Nonaktif" : "Aktif Harian"}
          </span>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Jam Eksekusi</span>
          <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">
            Pukul {settingsMap["backup_auto_time"] || "02:00"} WIB
          </span>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Direktori Backup</span>
          <span className="text-xs font-mono font-bold text-amber-900 mt-0.5 inline-block truncate max-w-full" title={settingsMap["backup_path"] || "./data/backups"}>
            {settingsMap["backup_path"] || "./data/backups"}
          </span>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Batas Retensi File</span>
          <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">
            {settingsMap["backup_retention_count"] || "10"} Snapshot Terbaru
          </span>
        </div>
      </div>
    }
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FieldRow label="Status Auto-Backup">
        <select
          value={settingsMap["backup_auto_enabled"] ?? "true"}
          onChange={(e) => setSetting("backup_auto_enabled", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        >
          <option value="true">Aktif (Jalankan Backup Otomatis)</option>
          <option value="false">Nonaktif</option>
        </select>
      </FieldRow>

      <FieldRow label="Waktu Eksekusi Harian" description="Format 24 jam (HH:mm), contoh: 02:00">
        <input
          type="time"
          value={settingsMap["backup_auto_time"] || "02:00"}
          onChange={(e) => setSetting("backup_auto_time", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <div className="md:col-span-2">
        <FieldRow
          label="Path Direktori Penyimpanan"
          description="Gunakan ./ untuk folder internal aplikasi (contoh: ./data/backups) atau path absolut untuk partisi HDD/Mount (contoh: /mnt/storage_backup)."
        >
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={settingsMap["backup_path"] !== undefined ? settingsMap["backup_path"] : "./data/backups"}
                onChange={(e) => setSetting("backup_path", e.target.value)}
                placeholder="./data/backups"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-mono"
              />
              <button
                type="button"
                onClick={() => testCurrentBackupPath(settingsMap["backup_path"])}
                disabled={testingBackupPath}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 whitespace-nowrap transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                title="Uji apakah direktori ini dapat dibuat dan ditulis oleh server"
              >
                {testingBackupPath ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Uji Akses</span>
                  </>
                )}
              </button>
            </div>

            {/* Info Inspeksi Lokasi Server Faktual & Notifikasi Izin */}
            {backupPathInfo && (
              <div className="space-y-2 pt-1">
                {/* Lokasi Server Faktual */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-sans font-semibold text-gray-600 shrink-0">Lokasi Server Faktual:</span>
                    <span className="font-bold text-gray-900 truncate" title={backupPathInfo.resolvedPath}>
                      {backupPathInfo.resolvedPath}
                    </span>
                  </div>
                  <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border ${
                    backupPathInfo.locationType === "EXTERNAL_MOUNT"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {backupPathInfo.locationType === "EXTERNAL_MOUNT" ? "External Mount HDD" : "Internal Folder Apps"}
                  </span>
                </div>

                {/* Status Izin: Hijau jika Writable & Valid */}
                {backupPathInfo.isWritable && !backupPathInfo.isFallback ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Izin akses tulis valid. Server dapat menyimpan snapshot langsung ke direktori ini.</span>
                  </div>
                ) : (
                  /* Notifikasi Merah Elegan jika Izin Ditolak / Fallback */
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-bold text-rose-950">Akses Direktori Ditolak (Permission Denied)</p>
                        <p className="text-rose-800 mt-0.5">
                          Server aplikasi tidak memiliki hak akses tulis ke path <code>{backupPathInfo.configuredPath}</code>.
                          Sistem saat ini otomatis mengalihkan snapshot ke fallback lokal: <code>{backupPathInfo.fallbackPath}</code>.
                        </p>
                      </div>
                    </div>

                    {backupPathInfo.fixCommand && (
                      <div className="space-y-1.5 pt-1.5 border-t border-rose-200/70">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-950 text-[11px]">
                            Jalankan perintah ini di terminal server VPS:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (backupPathInfo.fixCommand) {
                                navigator.clipboard.writeText(backupPathInfo.fixCommand);
                                setCopiedCommand(true);
                                setTimeout(() => setCopiedCommand(false), 2500);
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg text-[10px] font-bold text-rose-900 transition cursor-pointer"
                          >
                            {copiedCommand ? "✓ Perintah Tersalin" : "Salin Perintah"}
                          </button>
                        </div>
                        <pre className="p-2.5 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap select-all">
                          {backupPathInfo.fixCommand}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </FieldRow>
      </div>

      <FieldRow label="Jumlah Retensi Snapshot Tersimpan" description="Snapshot tertua otomatis dibersihkan jika melebihi batas">
        <input
          type="number"
          min="3"
          max="100"
          value={settingsMap["backup_retention_count"] || "10"}
          onChange={(e) => setSetting("backup_retention_count", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>
    </div>
  </SettingsCard>

  {/* ── Card 2.5: Cold Storage & Arsip Mandiri NAS (Luxenary Vault) ── */}
  <SettingsCard
    title="Cold Storage & Arsip Mandiri NAS (Luxenary Vault)"
    description="Kelola penyimpanan arsip dingin jangka panjang (1 tahun) ke direktori mount NAS lokal pasca retensi galeri tamu berakhir."
    isEditing={Boolean(editSection["nas_archive"])}
    onEdit={() => toggleEditSection("nas_archive")}
    onCancel={() => cancelEdit("nas_archive", ["nas_archive_enabled", "nas_archive_path", "nas_archive_retention_days"])}
    onSave={() => saveSettings(["nas_archive_enabled", "nas_archive_path", "nas_archive_retention_days"], setSavingBackupSettings, "nas_archive")}
    saving={savingBackupSettings}
    isDirty={isSectionDirty(["nas_archive_enabled", "nas_archive_path", "nas_archive_retention_days"])}
    saveSuccess={settingsSaved["nas_archive"]}
    saveSuccessMessage="Pengaturan Cold Storage NAS berhasil disimpan"
    viewContent={
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Status Fitur Cold Storage</span>
          <span className={`text-sm font-bold mt-0.5 inline-block ${
            settingsMap["nas_archive_enabled"] === "true" ? "text-emerald-700" : "text-stone-500"
          }`}>
            {settingsMap["nas_archive_enabled"] === "true" ? "Aktif (Duplikasi NAS)" : "Nonaktif (Dormant)"}
          </span>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Direktori Arsip NAS</span>
          <span className="text-xs font-mono font-bold text-amber-900 mt-0.5 inline-block truncate max-w-full" title={settingsMap["nas_archive_path"] || "./data/archives"}>
            {settingsMap["nas_archive_path"] || "./data/archives"}
          </span>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block font-medium">Masa Simpan Arsip</span>
          <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">
            {settingsMap["nas_archive_retention_days"] || "365"} Hari (1 Tahun)
          </span>
        </div>
      </div>
    }
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FieldRow label="Status Cold Storage NAS">
        <select
          value={settingsMap["nas_archive_enabled"] ?? "false"}
          onChange={(e) => setSetting("nas_archive_enabled", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        >
          <option value="false">Nonaktif (Hanya gunakan R2 / VPS default)</option>
          <option value="true">Aktif (Duplikasi berkas mandiri ke folder NAS)</option>
        </select>
      </FieldRow>

      <FieldRow label="Masa Tayang Arsip (Hari)" description="Durasi penyimpanan arsip setelah status beralih ke ARCHIVED">
        <input
          type="number"
          min="30"
          max="3650"
          value={settingsMap["nas_archive_retention_days"] || "365"}
          onChange={(e) => setSetting("nas_archive_retention_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <div className="md:col-span-2">
        <FieldRow
          label="Path Direktori Arsip NAS"
          description="Direktori mount NAS di server VPS (contoh: /mnt/nas/archives) atau folder lokal cadangan (contoh: ./data/archives)."
        >
          <input
            type="text"
            value={settingsMap["nas_archive_path"] !== undefined ? settingsMap["nas_archive_path"] : "./data/archives"}
            onChange={(e) => setSetting("nas_archive_path", e.target.value)}
            placeholder="./data/archives"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-mono"
          />
        </FieldRow>
      </div>
    </div>
  </SettingsCard>

  {/* ── Card 3: Daftar Riwayat Snapshot Server ── */}
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Daftar Snapshot Tersimpan</h3>
        <p className="text-sm text-gray-500 mt-0.5">{snapshots.length} file snapshot tersimpan di server</p>
      </div>
      <button
        type="button"
        onClick={loadSnapshots}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
      >
        ↻ Refresh
      </button>
    </div>

    {loadingSnapshots ? (
      <div className="p-12 text-center text-gray-400">
        <span className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs">Memuat daftar snapshot...</p>
      </div>
    ) : snapshots.length === 0 ? (
      <div className="p-12 text-center text-gray-400 italic">
        Belum ada file snapshot tersimpan. Klik &quot;Buat Snapshot Sekarang&quot; untuk membuat backup pertama.
      </div>
    ) : (
      <>
        {/* ── Desktop Table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Nama File Snapshot</th>
                <th className="px-5 py-3.5">Tipe</th>
                <th className="px-5 py-3.5">Ukuran</th>
                <th className="px-5 py-3.5">Waktu Pembuatan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {snapshots.map((snap) => (
                <tr key={snap.filename} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-medium text-gray-900">
                    {snap.filename}
                  </td>
                  <td className="px-5 py-3.5">
                    {snap.isSafetyBackup ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Safety Backup
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Snapshot
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-800">
                    {snap.sizeFormatted}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {new Date(snap.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Download */}
                      <a
                        href={`/api/admin/database/download?filename=${encodeURIComponent(snap.filename)}`}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                        title="Download file .db"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download</span>
                      </a>

                      {/* Restore */}
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap.filename)}
                        disabled={restoringSnapshot === snap.filename}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Restore database ke snapshot ini"
                      >
                        {restoringSnapshot === snap.filename ? (
                          <span className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        <span>Restore</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.filename)}
                        disabled={deletingSnapshot === snap.filename}
                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Hapus snapshot ini"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile-Native Snapshot Cards ── */}
        <div className="block md:hidden divide-y divide-gray-100">
          {snapshots.map((snap) => (
            <div key={snap.filename} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-medium text-xs text-gray-900 break-all">{snap.filename}</span>
                {snap.isSafetyBackup ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    Safety
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Snapshot
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{snap.sizeFormatted}</span>
                <span className="text-[11px] text-gray-400">
                  {new Date(snap.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <a
                  href={`/api/admin/database/download?filename=${encodeURIComponent(snap.filename)}`}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => handleRestoreSnapshot(snap.filename)}
                  disabled={restoringSnapshot === snap.filename}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {restoringSnapshot === snap.filename ? "Restoring..." : "Restore"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSnapshot(snap.filename)}
                  disabled={deletingSnapshot === snap.filename}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
</div>
  );
}
