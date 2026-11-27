"use client";

import { useState } from "react";
import Link from "next/link";
import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";
import type { AdminSettingsTabProps } from "@/components/admin/settings/types";

export function AdminIntegrationsSettings(props: AdminSettingsTabProps) {
  const {
    session,
    settingsMap,
    editSection,
    settingsSaved,
    currentOrigin,
    savingDomainDns,
    setSavingDomainDns,
    savingSmtp,
    setSavingSmtp,
    savingPlatform,
    setSavingPlatform,
    savingPlatformCustom,
    setSavingPlatformCustom,
    savingMemoriesMilestones,
    setSavingMemoriesMilestones,
    savingSubdomainSettings,
    setSavingSubdomainSettings,
    testingSmtp,
    testSmtpEmail,
    setTestSmtpEmail,
    testSmtpResult,
    setTestSmtpResult,
    detectingServerIp,
    detectIpResult,
    recyclingSubdomains,
    recycleResult,
    setSetting,
    toggleEditSection,
    cancelEdit,
    isSectionDirty,
    saveSettings,
    handleTestSmtp,
    handleDetectServerIp,
    handleManualRecycleSubdomains,
  } = props;

  const [purgingCache, setPurgingCache] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [savingAnalytics, setSavingAnalytics] = useState(false);

  return (
    <>
  {/* Integrasi Domain & DNS Server */}
  <SettingsCard
    title="Integrasi Domain Pribadi & DNS Server"
    description="Konfigurasikan IP Publik VPS dan host CNAME target platform. Nilai ini menjadi sumber data dinamis bagi panduan setup DNS di dashboard klien."
    isEditing={Boolean(editSection["domain_dns"])}
    onEdit={() => toggleEditSection("domain_dns")}
    onCancel={() => cancelEdit("domain_dns", ["server_public_ip", "cname_target", "custom_domain_enabled"])}
    onSave={() => saveSettings(["server_public_ip", "cname_target", "custom_domain_enabled"], setSavingDomainDns, "domain_dns")}
    saving={savingDomainDns}
    isDirty={isSectionDirty(["server_public_ip", "cname_target", "custom_domain_enabled"])}
    saveSuccess={settingsSaved["domain_dns"]}
    saveSuccessMessage="Pengaturan Integrasi Domain & DNS berhasil disimpan"
    viewContent={
      <div className="space-y-4">
        {/* Status Master Fitur Custom Domain */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mb-0.5">Status Fitur Custom Domain Klien</span>
            <p className="text-xs text-stone-600">
              Mengontrol visibilitas kartu &quot;Domain Sendiri&quot; di dashboard pengaturan klien dan hak pendaftaran domain.
            </p>
          </div>
          <div className="shrink-0">
            {settingsMap["custom_domain_enabled"] !== "false" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Aktif (Tampil di Klien)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-200/80 text-stone-700 border border-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                Nonaktif (Disembunyikan)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Record A (IP Public Server)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Wajib untuk @</span>
            </div>
            <span className="text-sm font-mono font-bold text-gray-900 block mt-1">
              {settingsMap["server_public_ip"] || "Belum diatur (Klik Edit untuk mengisi atau deteksi otomatis)"}
            </span>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Digunakan klien untuk mengarahkan root apex domain (@) ke VPS Anda.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Record CNAME (Host Target)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">Untuk www</span>
            </div>
            <span className="text-sm font-mono font-bold text-gray-900 block mt-1">
              {settingsMap["cname_target"] || "Belum diatur"}
            </span>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Target hostname yang diarahkan klien untuk subdomain kustom atau awalan www.
            </p>
          </div>
        </div>

        {/* Live Pratinjau Panduan DNS Klien */}
        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Live Preview: Tampilan Langkah DNS di Dashboard Klien</span>
            </h4>
            <span className="text-[10px] font-medium text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">Pratinjau Klien</span>
          </div>
          <p className="text-[11px] text-amber-900/80 leading-relaxed">
            Berikut adalah tabel DNS yang akan dilihat langsung oleh klien di menu <em>Dashboard &gt; Domain Sendiri</em>:
          </p>
          <div className="rounded-lg overflow-hidden border border-amber-200 text-[11px] font-mono bg-white shadow-2xs">
            <div className="grid grid-cols-3 bg-amber-100/60 px-3 py-1.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              <span>Type</span>
              <span>Host / Name</span>
              <span>Value / Target</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-2 border-b border-amber-100 text-stone-800 items-center">
              <span className="font-bold text-amber-700">A</span>
              <span>@</span>
              <span className="font-bold text-stone-900 break-all">{settingsMap["server_public_ip"] || "IP Belum Diatur"}</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-2 text-stone-800 items-center">
              <span className="font-bold text-sky-700">CNAME</span>
              <span>www</span>
              <span className="font-bold text-stone-900 break-all">{settingsMap["cname_target"] || "Host Belum Diatur"}</span>
            </div>
          </div>
        </div>
      </div>
    }
  >
    <div className="space-y-4">
      <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed">
        <strong>Mengapa perlu IP Server &amp; CNAME?</strong> Sebagian besar registrar domain lokal (Niagahoster, Domainesia, IDWebhost, Namecheap) melarang CNAME pada root domain (<strong>@</strong>). Oleh karena itu, root domain diarahkan via <strong>Record A</strong> ke IP server, sedangkan <strong>www</strong> diarahkan via <strong>Record CNAME</strong>.
      </div>

      <FieldRow
        label="Status Fitur Custom Domain Klien"
        description="Aktifkan atau nonaktifkan integrasi domain pribadi platform. Jika dinonaktifkan, kartu 'Domain Sendiri' di dashboard klien akan disembunyikan sepenuhnya dan endpoint penyimpanan domain diblokir."
      >
        <select
          value={settingsMap["custom_domain_enabled"] ?? "true"}
          onChange={(e) => setSetting("custom_domain_enabled", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
        >
          <option value="true">Aktif (Tampilkan menu Domain Sendiri di dashboard klien)</option>
          <option value="false">Nonaktif (Sembunyikan menu dari dashboard klien &amp; kunci API)</option>
        </select>
      </FieldRow>

      <FieldRow
        label="IP Public Server (Record A)"
        description="Alamat IP publik VPS Anda. Klien akan memasukkan nilai ini untuk record A (@)."
      >
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={settingsMap["server_public_ip"] || ""}
              onChange={(e) => setSetting("server_public_ip", e.target.value.trim())}
              placeholder="Contoh: 103.186.xxx.xxx"
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={handleDetectServerIp}
              disabled={detectingServerIp}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {detectingServerIp ? (
                <><span className="w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" /> Mendeteksi...</>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Deteksi IP Otomatis
                </>
              )}
            </button>
          </div>
          {detectIpResult && (
            <p className={`text-xs font-medium ${detectIpResult.success ? "text-emerald-700" : "text-rose-600"}`}>
              {detectIpResult.message}
            </p>
          )}
        </div>
      </FieldRow>

      <FieldRow
        label="Host Target CNAME (Custom Domain)"
        description="Target hostname yang dituju record CNAME klien (misal: cname.domainanda.id atau invite.domainanda.id)."
      >
        <div className="space-y-2">
          <input
            type="text"
            value={settingsMap["cname_target"] || ""}
            onChange={(e) => setSetting("cname_target", e.target.value.trim())}
            placeholder="Contoh: cname.domainanda.id"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500">Preset cepat dari host aktif:</span>
            {["cname", "invite"].map((prefix) => {
              const hostClean = currentOrigin.replace(/^https?:\/\//, "").split(":")[0];
              const presetVal = `${prefix}.${hostClean}`;
              return (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => setSetting("cname_target", presetVal)}
                  className="text-[10px] font-mono font-semibold bg-stone-100 hover:bg-amber-100 hover:text-amber-800 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 transition cursor-pointer"
                >
                  + {presetVal}
                </button>
              );
            })}
          </div>
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* Server Email (SMTP) Configuration */}
  <SettingsCard
    title="Server Email (SMTP) untuk Pengiriman Invoice"
    description="Konfigurasikan akun SMTP (Gmail, Mailgun, Brevo, atau Webmail hosting) untuk mengirimkan faktur tagihan (UNPAID) dan kuitansi resmi (PAID) secara otomatis ke email klien."
    isEditing={Boolean(editSection["smtp"])}
    onEdit={() => toggleEditSection("smtp")}
    onCancel={() => cancelEdit("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"])}
    onSave={() => saveSettings(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"], setSavingSmtp, "smtp")}
    saving={savingSmtp}
    isDirty={isSectionDirty(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"])}
    saveSuccess={settingsSaved["smtp"]}
    saveSuccessMessage="Pengaturan server email SMTP berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Status Pengiriman</span>
            <div className="mt-1.5 flex items-center gap-1.5">
              {settingsMap["smtp_host"] && settingsMap["smtp_user"] ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  SMTP Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-600 border border-stone-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                  Belum Dikonfigurasi
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Host SMTP</span>
            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5 truncate">
              {settingsMap["smtp_host"] || "Belum diisi"}
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Port</span>
            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5">
              {settingsMap["smtp_port"] || "587"}
            </span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Akun Pengirim</span>
            <span className="text-xs font-mono font-bold text-gray-900 block mt-1.5 truncate">
              {settingsMap["smtp_user"] || "Belum diisi"}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500">
          {settingsMap["smtp_host"] && settingsMap["smtp_user"]
            ? "Klien akan menerima faktur invoice HTML otomatis setiap kali checkout dan setelah pembayaran QRIS lunas."
            : "Server email belum diatur. Transaksi tetap berjalan normal via QRIS, dan pengiriman email otomatis dilewati secara aman."}
        </p>

        {/* Dedicated Email Templates Preview Link */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>Galeri Template Email Transaksional</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Warm White Cream
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Lihat pratinjau responsif (Desktop & Mobile) kuitansi lunas, tagihan invoice, perpanjangan galeri, dan notifikasi roll kamera.
            </p>
          </div>
          <Link
            href="/admin/emails"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition shrink-0 inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Buka Pratinjau Email</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Inline Test Handshake SMTP */}
        {settingsMap["smtp_host"] && settingsMap["smtp_user"] && (
          <div className="pt-3 border-t border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">Uji Transmisi Email Live:</span>
              <span className="text-[11px] text-gray-400">Verifikasi port & kredensial</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                placeholder="Kosongkan = email akun admin Anda"
                value={testSmtpEmail}
                onChange={(e) => setTestSmtpEmail(e.target.value)}
                className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 w-full sm:w-80"
              />
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shrink-0 inline-flex items-center justify-center gap-1.5"
              >
                {testingSmtp ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Kirim Email Uji Coba</span>
                  </>
                )}
              </button>
            </div>

            {testSmtpResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                testSmtpResult.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}>
                <span className="font-medium">{testSmtpResult.message}</span>
                <button
                  type="button"
                  onClick={() => setTestSmtpResult(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm ml-2"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    }
  >
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <FieldRow label="SMTP Host" description="Contoh: smtp.gmail.com atau mail.domainanda.com">
            <input
              type="text"
              value={settingsMap["smtp_host"] || ""}
              onChange={(e) => setSetting("smtp_host", e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
            />
          </FieldRow>
        </div>
        <div>
          <FieldRow label="SMTP Port" description="587 (TLS) atau 465 (SSL)">
            <input
              type="number"
              value={settingsMap["smtp_port"] || "587"}
              onChange={(e) => setSetting("smtp_port", e.target.value)}
              placeholder="587"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
            />
          </FieldRow>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Username / Email SMTP" description="Email login akun SMTP Anda">
          <input
            type="text"
            value={settingsMap["smtp_user"] || ""}
            onChange={(e) => setSetting("smtp_user", e.target.value)}
            placeholder="billing@domainanda.com"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </FieldRow>
        <FieldRow label="Password / App Password" description="Gunakan App Password untuk akun Gmail">
          <input
            type="password"
            value={settingsMap["smtp_password"] || ""}
            onChange={(e) => setSetting("smtp_password", e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Email Pengirim (From Email)" description="Alamat yang tertera sebagai pengirim invoice">
          <input
            type="email"
            value={settingsMap["smtp_from_email"] || ""}
            onChange={(e) => setSetting("smtp_from_email", e.target.value)}
            placeholder="no-reply@domainanda.com"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </FieldRow>
        <FieldRow label="Nama Pengirim (From Name)" description="Nama instansi/brand yang muncul di inbox">
          <input
            type="text"
            value={settingsMap["smtp_from_name"] || ""}
            onChange={(e) => setSetting("smtp_from_name", e.target.value)}
            placeholder="Billing & Finance"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </FieldRow>
      </div>
    </div>
  </SettingsCard>

  {/* Limit Upload Media & Galeri */}
  <SettingsCard
    title="Batas Upload Media &amp; Galeri"
    description="Tentukan batas ukuran berkas maksimum untuk media video dan foto yang diunggah oleh calon pengantin di Studio Editor."
    isEditing={Boolean(editSection["upload_limit"])}
    onEdit={() => toggleEditSection("upload_limit")}
    onCancel={() => cancelEdit("upload_limit", ["max_video_upload_mb", "max_photo_upload_mb"])}
    onSave={() => saveSettings(["max_video_upload_mb", "max_photo_upload_mb"], setSavingPlatformCustom, "upload_limit")}
    saving={savingPlatformCustom}
    isDirty={isSectionDirty(["max_video_upload_mb", "max_photo_upload_mb"])}
    saveSuccess={settingsSaved["upload_limit"]}
    saveSuccessMessage="Batas upload berhasil disimpan"
    viewContent={
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium block">Video Studio Klien</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-gray-900">{settingsMap["max_video_upload_mb"] || "50"}</span>
            <span className="text-xs text-gray-500 font-medium">MB</span>
          </div>
        </div>
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium block">Foto Studio Klien</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-gray-900">{settingsMap["max_photo_upload_mb"] || "15"}</span>
            <span className="text-xs text-gray-500 font-medium">MB</span>
          </div>
        </div>
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Batas Video Studio Klien (MB)">
        <div className="space-y-1">
          <input
            type="number"
            min="5"
            max="100"
            value={settingsMap["max_video_upload_mb"] || "50"}
            onChange={(e) => setSetting("max_video_upload_mb", e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs max-w-[200px]"
          />
          <p className="text-[11px] text-gray-500">Maksimal ukuran video MP4/MOV/WebM di Studio. Server otomatis mengompresi via FFmpeg ke ~2-5 MB.</p>
        </div>
      </FieldRow>
      <FieldRow label="Batas Foto Studio Klien (MB)">
        <div className="space-y-1">
          <input
            type="number"
            min="1"
            max="50"
            value={settingsMap["max_photo_upload_mb"] || "15"}
            onChange={(e) => setSetting("max_photo_upload_mb", e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs max-w-[200px]"
          />
          <p className="text-[11px] text-gray-500">Maksimal ukuran foto JPG/PNG/WebP sebelum dikompresi otomatis ke WebP.</p>
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* Ambang Batas Notifikasi Kuota Roll Tamu (Memories) */}
  <SettingsCard
    title="Notifikasi Ambang Batas Kuota Roll Tamu (Memories)"
    description="Atur persentase penggunaan roll kamera kenangan tamu yang memicu email peringatan otomatis ke pengantin sebelum kuota habis, agar pengantin dapat memperluas kapasitas tepat waktu."
    isEditing={Boolean(editSection["memories_milestones"])}
    onEdit={() => toggleEditSection("memories_milestones")}
    onCancel={() => cancelEdit("memories_milestones", ["memories_notify_milestones"])}
    onSave={() => saveSettings(["memories_notify_milestones"], setSavingMemoriesMilestones, "memories_milestones")}
    saving={savingMemoriesMilestones}
    isDirty={isSectionDirty(["memories_notify_milestones"])}
    saveSuccess={settingsSaved["memories_milestones"]}
    saveSuccessMessage="Ambang batas notifikasi roll berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(settingsMap["memories_notify_milestones"] || "50,80,100")
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n > 0 && n <= 100)
            .sort((a, b) => a - b)
            .map((m) => {
              const isFull = m >= 100;
              const isHigh = m >= 80;
              return (
                <span
                  key={m}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
                    isFull
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : isHigh
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isFull ? "bg-rose-500" : isHigh ? "bg-amber-500" : "bg-blue-500"}`} />
                  {m}% {isFull ? "(Roll Penuh)" : isHigh ? "(Hampir Penuh)" : "(Separuh Roll)"}
                </span>
              );
            })}
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Sistem akan mengirim email otomatis ke pengantin saat total foto tamu mencapai masing-masing ambang batas di atas. Email menyertakan progres kuota aktual dan tautan privat ke Dasbor Momen untuk top-up tanpa perantara pihak ketiga.
        </p>
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow
        label="Pilihan Cepat Ambang Batas (Milestones)"
        description="Pilih kombinasi ambang batas umum yang ingin diaktifkan untuk memicu email otomatis ke pengantin."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { value: 50, label: "50% (Separuh Roll)", desc: "Pemberitahuan roll terpakai separuh" },
            { value: 80, label: "80% (Antusiasme Tinggi)", desc: "Peringatan roll hampir penuh" },
            { value: 100, label: "100% (Roll Penuh)", desc: "Pemberitahuan roll terkunci penuh" },
          ].map((preset) => {
            const currentList = (settingsMap["memories_notify_milestones"] || "50,80,100")
              .split(",")
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n));
            const isChecked = currentList.includes(preset.value);

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  let nextList: number[];
                  if (isChecked) {
                    nextList = currentList.filter((n) => n !== preset.value);
                  } else {
                    nextList = [...currentList, preset.value].sort((a, b) => a - b);
                  }
                  setSetting("memories_notify_milestones", nextList.join(","));
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isChecked
                    ? "bg-amber-50/80 border-amber-400 text-amber-950 ring-1 ring-amber-400"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">{preset.label}</span>
                  <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[10px] ${
                    isChecked ? "bg-amber-700 text-white border-amber-700" : "border-gray-300"
                  }`}>
                    {isChecked ? "✓" : ""}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500">{preset.desc}</span>
              </button>
            );
          })}
        </div>
      </FieldRow>

      <FieldRow
        label="Daftar Nilai Kustom Persentase (CSV)"
        description="Format persentase yang dipisahkan koma (contoh: 50,80,100 atau 25,50,75,90,100). Sistem akan memproses dan mengurutkannya secara otomatis."
      >
        <div className="space-y-1">
          <input
            type="text"
            value={settingsMap["memories_notify_milestones"] ?? "50,80,100"}
            onChange={(e) => setSetting("memories_notify_milestones", e.target.value)}
            placeholder="50,80,100"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs font-mono max-w-[300px]"
          />
          <p className="text-[11px] text-gray-500">Nilai yang valid adalah bilangan bulat 1 s/d 100 dipisahkan koma.</p>
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* Subdomain Lifecycle & Archiving Settings */}
  <SettingsCard
    title="Siklus Hidup &amp; Retensi Sistem"
    description="Atur jam retensi yang terpisah, seluruhnya dihitung dari tanggal acara utama sesuai zona waktu acara: pelepasan subdomain, pembersihan galeri foto tamu, dan masa custom domain. Masa simpan arsip undangan diatur di tab Database."
    isEditing={Boolean(editSection["subdomain"])}
    onEdit={() => toggleEditSection("subdomain")}
    onCancel={() => cancelEdit("subdomain", ["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "retention_free_draft_days", "free_draft_max_photos", "retention_leads_days", "subdomain_auto_recycle"])}
    onSave={() => saveSettings(["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "retention_free_draft_days", "free_draft_max_photos", "retention_leads_days", "subdomain_auto_recycle"], setSavingSubdomainSettings, "subdomain")}
    saving={savingSubdomainSettings}
    isDirty={isSectionDirty(["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "retention_free_draft_days", "free_draft_max_photos", "retention_leads_days", "subdomain_auto_recycle"])}
    saveSuccess={settingsSaved["subdomain"]}
    saveSuccessMessage="Pengaturan siklus hidup &amp; retensi berhasil disimpan"
    viewContent={
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
            <span className="text-xs text-amber-950 font-bold block">Jam Retensi Pasca-Acara</span>
            <dl className="space-y-1.5 text-[11px] text-stone-600">
              <div className="flex items-baseline justify-between gap-3">
                <dt>Subdomain kembali ke pool</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["subdomain_grace_days"] || "7"} hari</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Galeri foto tamu dibersihkan</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["retention_cleanup_days"] || "30"} hari</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Custom domain aktif (mengikuti slug)</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["retention_custom_domain_days"] || "365"} hari</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Masa aktif draf gratis (tanpa order)</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["retention_free_draft_days"] || "14"} hari</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Batas foto draf gratis</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["free_draft_max_photos"] || "3"} foto</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Retensi akun leads kosong</dt>
                <dd className="font-mono font-bold text-amber-900">{settingsMap["retention_leads_days"] || "90"} hari</dd>
              </div>
            </dl>
            <p className="text-[11px] text-stone-500">
              Setelah subdomain kembali ke pool, alamat slug menjadi tautan utama. Perpanjangan galeri berbayar menggantikan jam galeri per undangan.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-900 font-bold block mb-1">Status Auto-Recycle Subdomain</span>
            <div className="mt-1">
              {(settingsMap["subdomain_auto_recycle"] || "true") === "true" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Otomatis Daur Ulang Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                  Pelepasan Manual Saja
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-2">
              Subdomain dilepaskan kembali ke pool saat pembersihan tiba agar dapat digunakan oleh pasangan baru berikutnya.
            </p>
          </div>
        </div>

        {/* Manual Trigger & Maintenance Action */}
        <div className="p-4 bg-stone-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Pembersihan Subdomain Kedaluwarsa</span>
            </h4>
            <p className="text-[11px] text-stone-300 mt-0.5">
              Eksekusi manual untuk melepaskan semua subdomain yang telah lewat masa tenggang (&gt; {settingsMap["subdomain_grace_days"] || "7"} hari pasca acara).
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualRecycleSubdomains}
            disabled={recyclingSubdomains}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {recyclingSubdomains ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Jalankan Pembersihan Sekarang</span>
              </>
            )}
          </button>
        </div>

        {recycleResult && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            recycleResult.success
              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-medium"
              : "bg-rose-50 border-rose-300 text-rose-950 font-medium"
          }`}>
            <span>{recycleResult.success ? "✓" : "✕"}</span>
            <span>{recycleResult.message}</span>
          </div>
        )}
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Masa Tenggang Subdomain (Hari)" description="Hari sejak tanggal acara utama hingga subdomain dikembalikan ke pool. Sesudahnya undangan tetap dapat dibuka lewat alamat slug (Default: 7 hari).">
        <input
          type="number"
          min="1"
          max="365"
          value={settingsMap["subdomain_grace_days"] || "7"}
          onChange={(e) => setSetting("subdomain_grace_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Retensi Galeri Foto Tamu (Hari)" description="Hari sejak tanggal acara utama hingga foto candid tamu dibersihkan dari R2 agar penyimpanan tetap lega. Klien dapat memperpanjang lewat add-on galeri (Default: 30 hari).">
        <input
          type="number"
          min="1"
          max="365"
          value={settingsMap["retention_cleanup_days"] || "30"}
          onChange={(e) => setSetting("retention_cleanup_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Masa Aktif Custom Domain (Hari)" description="Hari sejak tanggal acara utama custom domain klien tetap melayani undangan, mengikuti gerbang slug (Default: 365 hari).">
        <input
          type="number"
          min="1"
          max="3650"
          value={settingsMap["retention_custom_domain_days"] || "365"}
          onChange={(e) => setSetting("retention_custom_domain_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Masa Aktif Draf Gratis (Hari)" description="Hari sejak draf gratis dibuat hingga otomatis dibersihkan oleh cron bila klien belum mengaktifkan paket berbayar (Default: 14 hari).">
        <input
          type="number"
          min="1"
          max="365"
          value={settingsMap["retention_free_draft_days"] || "14"}
          onChange={(e) => setSetting("retention_free_draft_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Batas Maksimal Foto Draf Gratis" description="Jumlah maksimal foto unggahan yang diizinkan pada mode Draf Gratis sebelum klien mengaktifkan paket (Default: 3 foto).">
        <input
          type="number"
          min="1"
          max="50"
          value={settingsMap["free_draft_max_photos"] || "3"}
          onChange={(e) => setSetting("free_draft_max_photos", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Retensi Akun Leads Kosong (Hari)" description="Hari sejak pendaftaran hingga akun klien kosong tanpa order, tanpa undangan, dan tanpa tautan aktivasi aktif dibersihkan otomatis oleh cron (Minimal 30 hari, Default: 90 hari).">
        <input
          type="number"
          min="30"
          max="3650"
          value={settingsMap["retention_leads_days"] || "90"}
          onChange={(e) => setSetting("retention_leads_days", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
        />
      </FieldRow>

      <FieldRow label="Otomatis Daur Ulang Subdomain" description="Jika aktif, sistem otomatis melepaskan subdomain kedaluwarsa saat ada pendaftaran baru atau query berkala.">
        <div className="flex gap-3">
          {[
            { id: "true", label: "Aktif (Otomatis Lepas)" },
            { id: "false", label: "Manual Saja" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSetting("subdomain_auto_recycle", opt.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                (settingsMap["subdomain_auto_recycle"] || "true") === opt.id
                  ? opt.id === "true"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-stone-700 text-white border-stone-700"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                (settingsMap["subdomain_auto_recycle"] || "true") === opt.id
                  ? "bg-white"
                  : opt.id === "true" ? "bg-emerald-500" : "bg-gray-400"
              }`}></span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* ── Purge Cache (Server ISR + Cloudflare) ── */}
  <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Purge Cache Server & Cloudflare</h3>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-xl">
          Paksa halaman publik (homepage, paket, sitemap) agar langsung menampilkan perubahan terbaru.
          Menjalankan Next.js ISR revalidation dan Cloudflare edge cache purge sekaligus.
        </p>
      </div>
      <button
        type="button"
        disabled={purgingCache}
        onClick={async () => {
          setPurgingCache(true);
          setPurgeResult(null);
          try {
            const res = await fetch("/api/admin/cache/purge", { method: "POST" });
            const data = await res.json();
            const cfOk = data.results?.cloudflare?.success;
            const cfSkipped = data.results?.cloudflare?.skipped;
            const cfErrors = data.results?.cloudflare?.errors;
            const cfErrMsg = data.results?.cloudflare?.error || (cfErrors && cfErrors[0]?.message);
            const cfMsg = cfSkipped
              ? " (Cloudflare dilewati — kredensial belum diset)"
              : cfOk
              ? " + Cloudflare edge"
              : ` (Cloudflare: ${cfErrMsg || "gagal"})`;
            setPurgeResult({
              success: data.success,
              msg: data.success
                ? `Cache server berhasil dibersihkan${cfMsg}.`
                : "Gagal purge cache. Periksa log server.",
            });
          } catch {
            setPurgeResult({ success: false, msg: "Gagal menghubungi server." });
          } finally {
            setPurgingCache(false);
            setTimeout(() => setPurgeResult(null), 6000);
          }
        }}
        className="shrink-0 px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer min-w-[140px]"
      >
        {purgingCache ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Membersihkan...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Purge Cache</span>
          </>
        )}
      </button>
    </div>
    {purgeResult && (
      <div className={`mt-3 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
        purgeResult.success
          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
          : "bg-rose-50 border border-rose-200 text-rose-700"
      }`}>
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {purgeResult.success
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          }
        </svg>
        {purgeResult.msg}
      </div>
    )}
  </div>

  {/* Analitik & Pixel Konversi */}
  <SettingsCard
    title="Analitik &amp; Pixel Konversi"
    description="Pasang Meta Pixel, TikTok Pixel, dan Google Analytics 4 untuk melacak corong konversi (ViewContent, InitiateCheckout, dan Purchase)."
    isEditing={Boolean(editSection["analytics"])}
    onEdit={() => toggleEditSection("analytics")}
    onCancel={() => cancelEdit("analytics", ["meta_pixel_id", "tiktok_pixel_id", "ga4_measurement_id"])}
    onSave={() => saveSettings(["meta_pixel_id", "tiktok_pixel_id", "ga4_measurement_id"], setSavingAnalytics, "analytics")}
    saving={savingAnalytics}
    isDirty={isSectionDirty(["meta_pixel_id", "tiktok_pixel_id", "ga4_measurement_id"])}
    saveSuccess={settingsSaved["analytics"]}
    saveSuccessMessage="Konfigurasi pixel konversi tersimpan"
    viewContent={
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium block">Meta Pixel ID</span>
          <span className="text-sm font-mono font-bold text-gray-900 mt-1 block truncate">
            {settingsMap["meta_pixel_id"] || "Belum dipasang"}
          </span>
        </div>
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium block">TikTok Pixel ID</span>
          <span className="text-sm font-mono font-bold text-gray-900 mt-1 block truncate">
            {settingsMap["tiktok_pixel_id"] || "Belum dipasang"}
          </span>
        </div>
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium block">GA4 Measurement ID</span>
          <span className="text-sm font-mono font-bold text-gray-900 mt-1 block truncate">
            {settingsMap["ga4_measurement_id"] || "Belum dipasang"}
          </span>
        </div>
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Meta Pixel ID (Angka 8–20 Digit)">
        <input
          type="text"
          value={settingsMap["meta_pixel_id"] || ""}
          onChange={(e) => setSetting("meta_pixel_id", e.target.value)}
          placeholder="Contoh: 123456789012345"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
        />
      </FieldRow>
      <FieldRow label="TikTok Pixel ID (Alfanumerik 10–30 Karakter)">
        <input
          type="text"
          value={settingsMap["tiktok_pixel_id"] || ""}
          onChange={(e) => setSetting("tiktok_pixel_id", e.target.value)}
          placeholder="Contoh: C9ABCDE1234567890"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
        />
      </FieldRow>
      <FieldRow label="GA4 Measurement ID (G-XXXXXXXX)">
        <input
          type="text"
          value={settingsMap["ga4_measurement_id"] || ""}
          onChange={(e) => setSetting("ga4_measurement_id", e.target.value)}
          placeholder="Contoh: G-ABC123DEF4"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500"
        />
      </FieldRow>
    </div>
  </SettingsCard>
    </>
  );
}
