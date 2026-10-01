"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminProfileSettings } from "@/components/admin/AdminProfileSettings";
import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";

const AVAILABLE_CAPABILITIES = [
  { id: "guest_memories", label: "Galeri Kenangan Tamu (Live Photo Drop)" },
  { id: "qr_checkin", label: "QR Code Check-in Tamu & Sistem Resepsionis" },
  { id: "custom_domain", label: "Integrasi Custom Domain Pribadi (.com / .id)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  session: any;
  // Settings state
  settingsMap: Record<string, string>;
  editSection: Record<string, boolean>;
  settingsSaved: Record<string, boolean>;
  activeSettingsTab: "akun" | "keuangan" | "paket" | "integrasi" | "operasional";
  setActiveSettingsTab: (tab: "akun" | "keuangan" | "paket" | "integrasi" | "operasional") => void;
  currentOrigin: string;
  // Saving flags
  savingPricing: boolean;
  setSavingPricing: (v: boolean) => void;
  savingAddons: boolean;
  setSavingAddons: (v: boolean) => void;
  savingPlatform: boolean;
  setSavingPlatform: (v: boolean) => void;
  savingPlatformCustom: boolean;
  setSavingPlatformCustom: (v: boolean) => void;
  savingServiceStatus: boolean;
  setSavingServiceStatus: (v: boolean) => void;
  savingSubdomainSettings: boolean;
  setSavingSubdomainSettings: (v: boolean) => void;
  savingActiveGateway: boolean;
  setSavingActiveGateway: (v: boolean) => void;
  savingMidtrans: boolean;
  setSavingMidtrans: (v: boolean) => void;
  savingXendit: boolean;
  setSavingXendit: (v: boolean) => void;
  savingSmtp: boolean;
  setSavingSmtp: (v: boolean) => void;
  savingDomainDns: boolean;
  setSavingDomainDns: (v: boolean) => void;
  savingMemoriesMilestones: boolean;
  setSavingMemoriesMilestones: (v: boolean) => void;
  savingPaymentSettings: boolean;
  setSavingPaymentSettings: (v: boolean) => void;
  // SMTP test
  testingSmtp: boolean;
  testSmtpEmail: string;
  setTestSmtpEmail: (v: string) => void;
  testSmtpResult: { success: boolean; message: string } | null;
  setTestSmtpResult: (v: { success: boolean; message: string } | null) => void;
  // Server IP detection
  detectingServerIp: boolean;
  detectIpResult: { success: boolean; message: string } | null;
  // Subdomain recycle
  recyclingSubdomains: boolean;
  recycleResult: { success: boolean; message: string } | null;
  // Gateway
  selectedGatewayVendor: "midtrans" | "xendit";
  setSelectedGatewayVendor: (v: "midtrans" | "xendit") => void;
  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  pendingLogo: File | null;
  setPendingLogo: (v: File | null) => void;
  pendingFavicon: File | null;
  setPendingFavicon: (v: File | null) => void;
  previewLogo: string | null;
  setPreviewLogo: (v: string | null) => void;
  previewFavicon: string | null;
  setPreviewFavicon: (v: string | null) => void;
  uploadingLogo: boolean;
  uploadingFavicon: boolean;
  brandUploadMsg: { type: "logo" | "favicon"; ok: boolean; msg: string } | null;
  setBrandUploadMsg: (v: { type: "logo" | "favicon"; ok: boolean; msg: string } | null) => void;
  // Actions
  setSetting: (key: string, value: string) => void;
  getCaps: (key: string) => string[];
  toggleCap: (key: string, capId: string) => void;
  toggleEditSection: (section: string) => void;
  cancelEdit: (section: string, keys: string[]) => void;
  isSectionDirty: (keys: string[]) => boolean;
  saveSettings: (keys: string[], savingFn: (v: boolean) => void, group: string) => void;
  uploadBrandAsset: (type: "logo" | "favicon") => void;
  handleTestSmtp: () => void;
  handleDetectServerIp: () => void;
  handleManualRecycleSubdomains: () => void;
}

export default function AdminSettingsTab(props: Props) {
  const {
    session,
    settingsMap, editSection, settingsSaved,
    activeSettingsTab, setActiveSettingsTab,
    currentOrigin,
    savingPricing, setSavingPricing,
    savingAddons, setSavingAddons,
    savingPlatform, setSavingPlatform,
    savingPlatformCustom, setSavingPlatformCustom,
    savingServiceStatus, setSavingServiceStatus,
    savingSubdomainSettings, setSavingSubdomainSettings,
    savingActiveGateway, setSavingActiveGateway,
    savingMidtrans, setSavingMidtrans,
    savingXendit, setSavingXendit,
    savingSmtp, setSavingSmtp,
    savingDomainDns, setSavingDomainDns,
    savingMemoriesMilestones, setSavingMemoriesMilestones,
    savingPaymentSettings, setSavingPaymentSettings,
    testingSmtp, testSmtpEmail, setTestSmtpEmail, testSmtpResult, setTestSmtpResult,
    detectingServerIp, detectIpResult,
    recyclingSubdomains, recycleResult,
    selectedGatewayVendor, setSelectedGatewayVendor,
    logoUrl, faviconUrl,
    pendingLogo, setPendingLogo, pendingFavicon, setPendingFavicon,
    previewLogo, setPreviewLogo, previewFavicon, setPreviewFavicon,
    uploadingLogo, uploadingFavicon,
    brandUploadMsg, setBrandUploadMsg,
    setSetting, getCaps, toggleCap,
    toggleEditSection, cancelEdit, isSectionDirty, saveSettings,
    uploadBrandAsset,
    handleTestSmtp, handleDetectServerIp, handleManualRecycleSubdomains,
  } = props;

  // Local state for purge cache (only needed within this component)
  const [purgingCache, setPurgingCache] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; msg: string } | null>(null);


  return (
<div className="space-y-6 max-w-7xl w-full">
  <div>
    <h2 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h2>
    <p className="text-sm text-gray-500 mt-0.5">Akun, keuangan &amp; payment gateway, paket harga, integrasi API, dan operasional platform</p>
  </div>

  {/* ── Sub-Tab Navigation ── */}
  <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
    {([
      { id: "akun",         label: "Akun & Keamanan",      hint: "Profil & password admin" },
      { id: "keuangan",     label: "Keuangan & Gateway",   hint: "Pembayaran, QRIS, bank" },
      { id: "paket",        label: "Paket & Harga",        hint: "Tier pricing & kapabilitas" },
      { id: "integrasi",    label: "Integrasi & API",      hint: "OAuth, SMTP, DNS, domain" },
      { id: "operasional",  label: "Operasional",          hint: "Status layanan, WA, landing" },
    ] as const).map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => setActiveSettingsTab(t.id)}
        title={t.hint}
        className={`w-full py-2.5 px-3 rounded-xl text-xs transition cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
          activeSettingsTab === t.id
            ? "bg-white text-gray-900 shadow-sm border border-gray-200 font-bold"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-semibold"
        }`}
      >
        <span className="truncate w-full text-center">{t.label}</span>
        {activeSettingsTab === t.id && (
          <span className="text-[9px] font-normal text-gray-400 truncate w-full text-center hidden sm:block">{t.hint}</span>
        )}
      </button>
    ))}
  </div>

  {/* ── Sub-Tab: Akun & Keamanan ── */}
  {activeSettingsTab === "akun" && (
    <AdminProfileSettings sessionUser={session?.user} />
  )}

  {/* ══ TAB: KEUANGAN & GATEWAY ══ */}
  {activeSettingsTab === "keuangan" && (
  <>
  {/* Mode Pembayaran & Rekening Bank Manual */}
  <SettingsCard
    title="Mode Pembayaran"
    description="Pilih satu metode pembayaran untuk klien: QRIS Otomatis (payment gateway) atau Transfer Bank Manual."
    isEditing={Boolean(editSection["payment_mode"])}
    onEdit={() => toggleEditSection("payment_mode")}
    onCancel={() =>
      cancelEdit("payment_mode", [
        "payment_mode",
        "bank_name",
        "bank_account_number",
        "bank_account_holder",
        "bank_instructions",
      ])
    }
    onSave={() =>
      saveSettings(
        [
          "payment_mode",
          "bank_name",
          "bank_account_number",
          "bank_account_holder",
          "bank_instructions",
        ],
        setSavingPaymentSettings,
        "payment_mode"
      )
    }
    saving={savingPaymentSettings}
    isDirty={isSectionDirty([
      "payment_mode",
      "bank_name",
      "bank_account_number",
      "bank_account_holder",
      "bank_instructions",
    ])}
    saveSuccess={settingsSaved["payment_mode"]}
    saveSuccessMessage="Pengaturan metode pembayaran & rekening bank berhasil disimpan"
    viewContent={
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Mode Pembayaran Aktif</span>
            <div className="mt-1">
              {(settingsMap["payment_mode"] || "GATEWAY") === "GATEWAY" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Hanya QRIS / Otomatis
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Transfer Manual (Mode Darurat)
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Rekening Tujuan</span>
            {settingsMap["bank_name"] && settingsMap["bank_account_number"] ? (
              <>
                <span className="text-xs font-bold text-gray-800 mt-1 inline-block">
                  {settingsMap["bank_name"]} - {settingsMap["bank_account_number"]}
                </span>
                <span className="text-[11px] text-gray-500 block font-medium">
                  a.n {settingsMap["bank_account_holder"] || "-"}
                </span>
              </>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium inline-block mt-1 border border-amber-200">
                Rekening Belum Dikonfigurasi
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-950">
          <span className="font-bold block mb-0.5">Petunjuk Transfer untuk Klien:</span>
          <p className="text-amber-900/80 leading-relaxed text-[11px]">
            {settingsMap["bank_instructions"] ||
              "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer untuk diverifikasi admin."}
          </p>
        </div>
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Mode Pembayaran yang Dibuka">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: "GATEWAY", label: "Hanya QRIS / Otomatis", desc: "Auto verifikasi via Payment Gateway" },
            { id: "MANUAL", label: "Transfer Manual (Darurat)", desc: "Verifikasi via upload struk" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSetting("payment_mode", opt.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                (settingsMap["payment_mode"] || "GATEWAY") === opt.id
                  ? "border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-500"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-xs font-bold block">{opt.label}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </FieldRow>

      <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FieldRow label="Nama Bank">
          <input
            type="text"
            value={settingsMap["bank_name"] || ""}
            onChange={(e) => setSetting("bank_name", e.target.value)}
            placeholder="Contoh: BCA / Mandiri / BRI / BSI"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>

        <FieldRow label="Nomor Rekening">
          <input
            type="text"
            value={settingsMap["bank_account_number"] || ""}
            onChange={(e) => setSetting("bank_account_number", e.target.value)}
            placeholder="Contoh: 1234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>

        <FieldRow label="Nama Pemilik Rekening" description="Atas nama dari rekening penerima pembayaran di atas.">
            <input
              type="text"
              value={settingsMap["bank_account_holder"] || ""}
              onChange={(e) => setSetting("bank_account_holder", e.target.value)}
              placeholder="Contoh: PT Nama Perusahaan / Nama Pemilik"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
            />
        </FieldRow>
      </div>

      <FieldRow label="Petunjuk Transfer Bank">
        <textarea
          rows={3}
          value={
            settingsMap["bank_instructions"] ||
            "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin."
          }
          onChange={(e) => setSetting("bank_instructions", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
        />
      </FieldRow>
    </div>
  </SettingsCard>
  </>
  )}

  {/* ══ LANJUTAN TAB KEUANGAN: GATEWAY QRIS ══ */}
  {activeSettingsTab === "keuangan" && (
  <>
  {/* ═══ PUSAT KONTROL & BASE SETTING GATEWAY GLOBAL ═══ */}
  <SettingsCard
    title="Pusat Kontrol & Pengaturan Global Gateway"
    description="Konfigurasi terpusat untuk semua payment gateway: pilih gateway aktif, mode lingkungan, masa berlaku QRIS, penanggung biaya admin, dan format nama invoice."
    isEditing={Boolean(editSection["active_gateway"])}
    onEdit={() => toggleEditSection("active_gateway")}
    onCancel={() => cancelEdit("active_gateway", ["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"])}
    onSave={() => saveSettings(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"], setSavingActiveGateway, "active_gateway")}
    saving={savingActiveGateway}
    isDirty={isSectionDirty(["active_payment_gateway", "payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_invoice_prefix"])}
    saveSuccess={settingsSaved["active_gateway"]}
    saveSuccessMessage="Pengaturan global payment gateway berhasil disimpan"
    viewContent={
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Gateway Aktif</span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {(settingsMap["active_payment_gateway"] || "midtrans").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Status Sistem</span>
            <div className="mt-1.5">
              {(() => {
                const gw = settingsMap["active_payment_gateway"] || "midtrans";
                const isSandbox =
                  gw === "midtrans"
                    ? (settingsMap["midtrans_environment"] || "sandbox") === "sandbox"
                    : (settingsMap["xendit_api_key"] || "").startsWith("xnd_development");
                return isSandbox ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
                    Sandbox (Simulator)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Produksi (Live)
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200">
            <span className="text-xs text-sky-800 block font-bold">Masa Berlaku Tagihan</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-mono font-bold text-sky-950">
                {settingsMap["payment_expiry_minutes"] || "60"}
              </span>
              <span className="text-xs font-semibold text-sky-800">Menit</span>
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
            <span className="text-xs text-purple-900 block font-bold">Biaya Layanan Aplikasi</span>
            <div className="mt-1 text-xs font-semibold text-purple-950">
              {(settingsMap["payment_fee_payer"] || "MERCHANT") === "BUYER" ? (
                <span className="text-amber-800 font-bold">Dibebankan ke Klien (+{settingsMap["payment_gateway_fee_percent"] || "0.7"}%)</span>
              ) : (
                <span className="text-emerald-700 font-bold">Ditanggung Platform ({settingsMap["payment_gateway_fee_percent"] || "0.7"}% Disubsidi)</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between gap-2 flex-wrap">
          <span className="text-gray-600 font-medium">
            Format Judul Invoice: <code className="font-mono text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">{settingsMap["payment_invoice_prefix"] || "Sistem Undangan"} — Order #XXXXXX</code>
          </span>
          <span className="text-[11px] text-gray-400">Berlaku otomatis untuk semua vendor gateway</span>
        </div>
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Pilih Gateway Aktif" description="Gateway utama 2-arah yang memproses pembayaran saat klien klik bayar via QRIS / Online">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "midtrans", label: "Midtrans", desc: "Core API QRIS (In-App), Snap UI, GoPay, VA" },
            { id: "xendit", label: "Xendit", desc: "Invoice UI, Multi-Bank VA, OVO, DANA, QRIS" },
          ].map((gw) => (
            <button
              key={gw.id}
              type="button"
              onClick={() => setSetting("active_payment_gateway", gw.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-left ${
                (settingsMap["active_payment_gateway"] || "midtrans") === gw.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="font-bold">{gw.label}</div>
              <div className={`text-[10px] mt-0.5 ${
                (settingsMap["active_payment_gateway"] || "midtrans") === gw.id ? "text-emerald-100" : "text-gray-400"
              }`}>{gw.desc}</div>
            </button>
          ))}
        </div>
      </FieldRow>


      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <FieldRow label="Masa Berlaku Tagihan (Menit)" description="Durasi QRIS/Invoice sebelum kedaluwarsa otomatis (contoh: 15, 30, 60, atau 1440 untuk 24 jam).">
          <input
            type="number"
            min="5"
            max="1440"
            value={settingsMap["payment_expiry_minutes"] || "60"}
            onChange={(e) => setSetting("payment_expiry_minutes", e.target.value)}
            className="w-full px-3.5 py-2.5 border border-sky-300 rounded-xl text-sm bg-sky-50 text-sky-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-2xs font-mono font-bold"
          />
        </FieldRow>

        <FieldRow label="Awalan Judul Invoice (Prefix)" description="Digunakan pada judul invoice Xendit. (e.g. Nama Platform Anda).">
          <input
            type="text"
            value={settingsMap["payment_invoice_prefix"] || "Sistem Undangan"}
            onChange={(e) => setSetting("payment_invoice_prefix", e.target.value)}
            placeholder="Contoh: Sistem Undangan"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-medium"
          />
        </FieldRow>
      </div>

      <FieldRow label="Skema Biaya Admin Gateway" description="Tentukan apakah potongan fee gateway (misal QRIS 0.7%) ditanggung oleh platform atau dibebankan ke pembeli">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "MERCHANT", label: "Ditanggung Platform (Gratis Klien)", desc: "Klien bayar pas harga paket (contoh: Rp 299.000), fee dipotong dari saldo Anda." },
            { id: "BUYER", label: "Dibebankan ke Klien (Ditambah ke Tagihan)", desc: "Total bayar di checkout otomatis ditambah biaya transaksi payment gateway." },
          ].map((feeOpt) => (
            <button
              key={feeOpt.id}
              type="button"
              onClick={() => setSetting("payment_fee_payer", feeOpt.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                (settingsMap["payment_fee_payer"] || "MERCHANT") === feeOpt.id
                  ? "border-amber-600 bg-amber-50/70 text-amber-950 ring-1 ring-amber-500"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-xs font-bold block">{feeOpt.label}</span>
              <span className="text-[11px] text-gray-500 block mt-1 leading-relaxed">{feeOpt.desc}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <label className="text-xs font-bold text-gray-800 block mb-1">
            Besaran Persentase Fee Gateway (%)
          </label>
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={settingsMap["payment_gateway_fee_percent"] || "0.7"}
              onChange={(e) => {
                setSetting("payment_gateway_fee_percent", e.target.value);
                setSetting("payment_fee_rate", (Number(e.target.value) / 100).toString());
              }}
              className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold bg-white text-gray-900 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-gray-600 font-medium">% (Standar QRIS BI: 0.7%)</span>
          </div>
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* ── Sub-Tab Selector Vendor Gateway ── */}
  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Vendor Payment Gateway Setup</h3>
        <p className="text-xs text-gray-500">Pilih vendor gateway untuk konfigurasi kredensial API resmi</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Gateway utama aktif: <strong className="text-gray-900 font-bold uppercase">{settingsMap["active_payment_gateway"] || "midtrans"}</strong></span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
      {[
        { id: "midtrans", name: "Midtrans", desc: "Core API QRIS (In-App), Snap UI, GoPay, VA" },
        { id: "xendit", name: "Xendit", desc: "Invoice UI, Multi-Bank VA, OVO, DANA, QRIS" },
      ].map((v) => {
        const isSelected = selectedGatewayVendor === v.id;
        const isCurrentlyActive = (settingsMap["active_payment_gateway"] || "midtrans") === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedGatewayVendor(v.id as any)}
            className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${
              isSelected
                ? "bg-amber-50/70 border-amber-500 ring-1 ring-amber-500 shadow-xs"
                : "bg-gray-50/80 border-gray-200 hover:bg-gray-100/80 hover:border-gray-300"
            }`}
          >
            {isCurrentlyActive && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                Aktif
              </span>
            )}
            <span className={`text-xs font-bold block ${isSelected ? "text-amber-950" : "text-gray-900"}`}>
              {v.name}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
              {v.desc}
            </span>
          </button>
        );
      })}
    </div>
  </div>

  {/* ═══ MIDTRANS SETTINGS ═══ */}
  {selectedGatewayVendor === "midtrans" && (
  <SettingsCard
    title="Midtrans Payment Gateway"
    description="Konfigurasi Midtrans Snap — payment gateway resmi berlisensi Bank Indonesia (GoTo Group)."
    isEditing={Boolean(editSection["midtrans"])}
    onEdit={() => toggleEditSection("midtrans")}
    onCancel={() => cancelEdit("midtrans", ["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_production_client_key", "midtrans_production_server_key"])}
    onSave={() => saveSettings(["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_production_client_key", "midtrans_production_server_key"], setSavingMidtrans, "midtrans")}
    saving={savingMidtrans}
    isDirty={isSectionDirty(["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_production_client_key", "midtrans_production_server_key"])}
    saveSuccess={settingsSaved["midtrans"]}
    saveSuccessMessage="Pengaturan Midtrans berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        {/* ── Badge Mode Gateway Midtrans ── */}
        {(() => {
          const isSandbox = (settingsMap["midtrans_environment"] || "sandbox") === "sandbox";
          const activeSk = isSandbox
            ? (settingsMap["midtrans_sandbox_server_key"] || settingsMap["midtrans_server_key"] || "").trim()
            : (settingsMap["midtrans_production_server_key"] || "").trim();

          if (!activeSk) return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  {isSandbox ? "Sandbox Belum Dikonfigurasi" : "Produksi Belum Dikonfigurasi"}
                </span>
                <span className="text-[10px] text-rose-500 block mt-0.5">
                  Klik Ubah lalu isi Client Key dan Server Key pada slot {isSandbox ? "Sandbox" : "Produksi"}.
                </span>
              </div>
            </div>
          );
          if (isSandbox) return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sandbox — Simulator Aktif</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Transaksi fiktif — tidak ada uang asli terpotong. Terhubung ke server simulator (api.sandbox.midtrans.com).</span>
              </div>
            </div>
          );
          return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Production — Live Gateway</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Transaksi nyata aktif — setiap pembayaran memotong saldo rekening bank klien secara langsung (api.midtrans.com).</span>
              </div>
            </div>
          );
        })()}

        {/* ── Ringkasan Kredensial Dual Slot (Sandbox & Produksi) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Slot Sandbox */}
          {(() => {
            const isCurrentActive = (settingsMap["midtrans_environment"] || "sandbox") === "sandbox";
            const sbCk = settingsMap["midtrans_sandbox_client_key"] || settingsMap["midtrans_client_key"] || "";
            const sbSk = settingsMap["midtrans_sandbox_server_key"] || settingsMap["midtrans_server_key"] || "";
            return (
              <div className={`p-3.5 rounded-xl border transition ${
                isCurrentActive
                  ? "bg-slate-50/90 border-slate-300 ring-1 ring-slate-400"
                  : "bg-gray-50/60 border-gray-200 opacity-75"
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isCurrentActive ? "bg-slate-600 animate-pulse" : "bg-gray-300"}`}></span>
                    <span className="text-xs font-bold text-gray-900">Slot Sandbox (Simulator)</span>
                  </div>
                  {isCurrentActive && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                      Sedang Aktif
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Client Key:</span>
                    <span className="font-mono font-medium text-gray-900">{sbCk ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Server Key:</span>
                    <span className="font-mono font-medium text-gray-900">{sbSk ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Slot Produksi */}
          {(() => {
            const isCurrentActive = (settingsMap["midtrans_environment"] || "sandbox") === "production";
            const prodCk = settingsMap["midtrans_production_client_key"] || "";
            const prodSk = settingsMap["midtrans_production_server_key"] || "";
            return (
              <div className={`p-3.5 rounded-xl border transition ${
                isCurrentActive
                  ? "bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-500"
                  : "bg-gray-50/60 border-gray-200 opacity-75"
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isCurrentActive ? "bg-emerald-600" : "bg-gray-300"}`}></span>
                    <span className="text-xs font-bold text-gray-900">Slot Produksi (Live)</span>
                  </div>
                  {isCurrentActive && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Sedang Aktif
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Client Key:</span>
                    <span className="font-mono font-medium text-gray-900">{prodCk ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Server Key:</span>
                    <span className="font-mono font-medium text-gray-900">{prodSk ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs flex-wrap">
          <span className="text-gray-600 font-medium">
            URL Webhook: <code className="font-mono text-gray-900 font-semibold">{`${settingsMap["platform_url"] || currentOrigin}/api/webhook/midtrans`}</code>
          </span>
          <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/midtrans`)}
            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-semibold transition cursor-pointer">
            Salin Webhook
          </button>
        </div>
      </div>
    }
  >
    <div className="space-y-5">
      {/* Mode Lingkungan Selector */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mode Lingkungan Aktif</h4>
        </div>
        <p className="text-xs text-gray-500">Pilih lingkungan yang aktif digunakan untuk memproses transaksi. Kedua slot kredensial tetap tersimpan aman di bawah.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "sandbox", label: "Sandbox (Simulator)", desc: "Gunakan untuk uji coba/testing pembayaran fiktif (api.sandbox.midtrans.com)" },
            { id: "production", label: "Produksi (Live)", desc: "Gunakan saat siap menerima pembayaran asli dari rekening klien (api.midtrans.com)" },
          ].map((envOpt) => (
            <button
              key={envOpt.id}
              type="button"
              onClick={() => setSetting("midtrans_environment", envOpt.id)}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                (settingsMap["midtrans_environment"] || "sandbox") === envOpt.id
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 shadow-2xs"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${envOpt.id === "sandbox" ? "bg-slate-500" : "bg-emerald-500"}`}></span>
                <span className="text-xs font-bold">{envOpt.label}</span>
              </div>
              <span className="text-[11px] text-gray-500 block mt-1 leading-relaxed">{envOpt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Slot 1: Kredensial Sandbox */}
      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kredensial Sandbox (Simulator)</h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300">
            api.sandbox.midtrans.com
          </span>
        </div>

        <FieldRow label="Client Key (Sandbox)" description="Midtrans Sandbox Dashboard → Settings → Access Keys">
          <input
            type="text"
            value={settingsMap["midtrans_sandbox_client_key"] ?? settingsMap["midtrans_client_key"] ?? ""}
            onChange={(e) => setSetting("midtrans_sandbox_client_key", e.target.value.trim())}
            placeholder="Mid-client-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Server Key (Sandbox)" description="Midtrans Sandbox Dashboard → Settings → Access Keys">
          <input
            type="password"
            value={settingsMap["midtrans_sandbox_server_key"] ?? settingsMap["midtrans_server_key"] ?? ""}
            onChange={(e) => setSetting("midtrans_sandbox_server_key", e.target.value.trim())}
            placeholder="Mid-server-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>
      </div>

      {/* Slot 2: Kredensial Produksi */}
      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Kredensial Produksi (Live)</h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            api.midtrans.com
          </span>
        </div>

        <FieldRow label="Client Key (Produksi)" description="Midtrans Production Dashboard → Settings → Access Keys">
          <input
            type="text"
            value={settingsMap["midtrans_production_client_key"] || ""}
            onChange={(e) => setSetting("midtrans_production_client_key", e.target.value.trim())}
            placeholder="Mid-client-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Server Key (Produksi)" description="Midtrans Production Dashboard → Settings → Access Keys">
          <input
            type="password"
            value={settingsMap["midtrans_production_server_key"] || ""}
            onChange={(e) => setSetting("midtrans_production_server_key", e.target.value.trim())}
            placeholder="Mid-server-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>
      </div>
    </div>

    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan URL ini di Midtrans Dashboard → Settings → Configuration → Notification URL (berlaku untuk Sandbox maupun Produksi)">
      <div className="flex items-center gap-2">
        <input type="text" readOnly value={`${settingsMap["platform_url"] || currentOrigin}/api/webhook/midtrans`}
          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/midtrans`)}
          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
      </div>
    </FieldRow>
  </SettingsCard>
  )}

  {/* ═══ XENDIT SETTINGS ═══ */}
  {selectedGatewayVendor === "xendit" && (
  <SettingsCard
    title="Xendit Payment Gateway"
    description="Konfigurasi Xendit Invoice — payment gateway modern untuk startup Indonesia."
    isEditing={Boolean(editSection["xendit"])}
    onEdit={() => toggleEditSection("xendit")}
    onCancel={() => cancelEdit("xendit", ["xendit_api_key", "xendit_webhook_token"])}
    onSave={() => saveSettings(["xendit_api_key", "xendit_webhook_token"], setSavingXendit, "xendit")}
    saving={savingXendit}
    isDirty={isSectionDirty(["xendit_api_key", "xendit_webhook_token"])}
    saveSuccess={settingsSaved["xendit"]}
    saveSuccessMessage="Pengaturan Xendit berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        {/* ── Badge Mode Gateway Xendit ── */}
        {(() => {
          const ak = settingsMap["xendit_api_key"] || "";
          if (!ak) return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Belum Dikonfigurasi</span>
                <span className="text-[10px] text-rose-500 block mt-0.5">Klik Edit lalu isi Secret API Key dan Webhook Token dari dashboard Xendit.</span>
              </div>
            </div>
          );
          if (ak.startsWith("xnd_development")) return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test Mode — Sandbox Aktif</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Transaksi fiktif — tidak ada uang asli terpotong. Gunakan metode uji coba Xendit.</span>
              </div>
            </div>
          );
          return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Production — Live Gateway</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">Transaksi nyata aktif — setiap pembayaran memotong saldo rekening bank klien secara langsung.</span>
              </div>
            </div>
          );
        })()}

        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Kredensial API Xendit</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500 block">Secret API Key:</span>
            <span className="font-mono font-medium text-gray-900">{settingsMap["xendit_api_key"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500 block">Webhook Token:</span>
            <span className="font-mono font-medium text-gray-900">{settingsMap["xendit_webhook_token"] ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">Belum diatur</em>}</span>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs flex-wrap">
          <span className="text-gray-600 font-medium">
            URL Webhook: <code className="font-mono text-gray-900 font-semibold">{`${settingsMap["platform_url"] || currentOrigin}/api/webhook/xendit`}</code>
          </span>
          <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/xendit`)}
            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-semibold transition cursor-pointer">
            Salin Webhook
          </button>
        </div>
      </div>
    }
  >
    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Kredensial Xendit</h4>
      </div>
      <FieldRow label="Secret API Key" description="Xendit Dashboard → Settings → API Keys. Sandbox: xnd_development_xxx | Production: xnd_production_xxx">
        <input type="password" value={settingsMap["xendit_api_key"] || ""} onChange={(e) => setSetting("xendit_api_key", e.target.value)}
          placeholder="xnd_development_xxx (sandbox) atau xnd_production_xxx (production)"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
      </FieldRow>
      <FieldRow label="Webhook Verification Token" description="Dari Xendit Dashboard → Settings → Webhooks">
        <input type="password" value={settingsMap["xendit_webhook_token"] || ""} onChange={(e) => setSetting("xendit_webhook_token", e.target.value)}
          placeholder="Token verifikasi webhook"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs" />
      </FieldRow>
    </div>

    <FieldRow label="URL Webhook (Otomatis)" description="Daftarkan di Xendit Dashboard → Settings → Webhooks → Invoice Paid">
      <div className="flex items-center gap-2">
        <input type="text" readOnly value={`${settingsMap["platform_url"] || currentOrigin}/api/webhook/xendit`}
          className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-gray-100 text-gray-900 font-semibold shadow-2xs" />
        <button type="button" onClick={() => navigator.clipboard.writeText(`${settingsMap["platform_url"] || currentOrigin}/api/webhook/xendit`)}
          className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer">Salin</button>
      </div>
    </FieldRow>
  </SettingsCard>
  )}
  </>
  )}


  {/* ══ TAB: PAKET & HARGA ══ */}
  {activeSettingsTab === "paket" && (
  <>
  {/* Pricing Settings */}
  {(() => {
    const PRICING_KEYS = [
      "pricing_subtitle",
      "name_tier1", "name_tier2", "name_tier3",
      "price_tier1", "price_tier2", "price_tier3",
      "desc_tier1", "desc_tier2", "desc_tier3",
      "features_tier1", "features_tier2", "features_tier3",
      "capabilities_tier1", "capabilities_tier2", "capabilities_tier3",
      "memories_total_quota_tier1", "memories_max_contributors_tier1", "memories_shots_quota_tier1",
      "memories_total_quota_tier2", "memories_max_contributors_tier2", "memories_shots_quota_tier2",
      "memories_total_quota_tier3", "memories_max_contributors_tier3", "memories_shots_quota_tier3",
    ];
    return (
      <SettingsCard
        title="Manajemen Harga & Paket"
        description="Atur nama paket komersial, harga, deskripsi, kapabilitas, dan plafon kuota kamera tamu untuk masing-masing tingkatan (Tier 1, Tier 2, Tier 3)."
        isEditing={Boolean(editSection["pricing"])}
        onEdit={() => toggleEditSection("pricing")}
        onCancel={() => cancelEdit("pricing", PRICING_KEYS)}
        onSave={() => saveSettings(PRICING_KEYS, setSavingPricing, "pricing")}
        saving={savingPricing}
        isDirty={isSectionDirty(PRICING_KEYS)}
        saveSuccess={settingsSaved["pricing"]}
        saveSuccessMessage="Harga, kapabilitas, dan kuota paket berhasil diperbarui"
        viewContent={
          <div className="space-y-3.5">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Subjudul Section Harga (Homepage)</span>
              <p className="text-xs text-gray-700 leading-relaxed">{settingsMap["pricing_subtitle"] || "Biaya satu kali bayar dengan masa aktif undangan 1 tahun (archive), penyimpanan galeri foto tamu 30 hari, dan portofolio resmi permanen."}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Tier 1 • {settingsMap["name_tier1"] || "Serenade"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier1"] || 49000).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier1"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-stone-700 bg-white border-stone-200">
                {getCaps("capabilities_tier1").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier1"] || 0} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Tier 2 • {settingsMap["name_tier2"] || "Symphony"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier2"] || 99000).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier2"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-slate-700 bg-white border-slate-200">
                {getCaps("capabilities_tier2").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier2"] || 250} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
            <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                    Tier 3 • {settingsMap["name_tier3"] || "Eternity"}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  Rp {Number(settingsMap["price_tier3"] || 149000).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{settingsMap["desc_tier3"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal"}</p>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg border text-purple-700 bg-white border-purple-200">
                {getCaps("capabilities_tier3").includes("guest_memories")
                  ? `Kamera: ${settingsMap["memories_total_quota_tier3"] || 1000} Foto Acara`
                  : "Kamera Tamu: Nonaktif"}
              </div>
            </div>
          </div>
          </div>
        }
      >
    <div className="space-y-4">
      <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
        <FieldRow label="Subjudul Section Harga (Homepage)" description="Kalimat penjelasan tepat di bawah judul 'Pilih Paket yang Sesuai dengan Cerita Anda' di halaman beranda.">
          <input
            type="text"
            value={settingsMap["pricing_subtitle"] ?? "Biaya satu kali bayar dengan masa aktif undangan 1 tahun (archive), penyimpanan galeri foto tamu 30 hari, dan portofolio resmi permanen."}
            onChange={(e) => setSetting("pricing_subtitle", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {/* Tier 1 */}
      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-sm font-bold text-gray-800">Tier 1 • {settingsMap["name_tier1"] || "Serenade"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier1"] || "Serenade"}
            onChange={(e) => setSetting("name_tier1", e.target.value)}
            placeholder="Contoh: Serenade"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier1"] || "49000"}
            onChange={(e) => setSetting("price_tier1", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier1"] || "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online"}
            onChange={(e) => setSetting("desc_tier1", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier1"] || ""}
            onChange={(e) => setSetting("features_tier1", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier1").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier1", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier1").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-amber-500/10 rounded-xl border border-amber-300/60 space-y-2">
            <span className="block text-[11px] font-bold text-amber-900 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={0}
                max={2000}
                step={25}
                value={settingsMap["memories_total_quota_tier1"] || "0"}
                onChange={(e) => setSetting("memories_total_quota_tier1", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[10px] text-amber-800 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>

      {/* Tier 2 */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          <span className="text-sm font-bold text-gray-800">Tier 2 • {settingsMap["name_tier2"] || "Symphony"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier2"] || "Symphony"}
            onChange={(e) => setSetting("name_tier2", e.target.value)}
            placeholder="Contoh: Symphony"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier2"] || "99000"}
            onChange={(e) => setSetting("price_tier2", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier2"] || "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu"}
            onChange={(e) => setSetting("desc_tier2", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier2"] || ""}
            onChange={(e) => setSetting("features_tier2", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier2").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier2", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier2").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-slate-100 rounded-xl border border-slate-300/80 space-y-2">
            <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={50}
                max={5000}
                step={50}
                value={settingsMap["memories_total_quota_tier2"] || "250"}
                onChange={(e) => setSetting("memories_total_quota_tier2", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-slate-500"
              />
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>

      {/* Tier 3 */}
      <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          <span className="text-sm font-bold text-gray-800">Tier 3 • {settingsMap["name_tier3"] || "Eternity"}</span>
        </div>
        <FieldRow label="Nama Paket">
          <input
            type="text"
            value={settingsMap["name_tier3"] || "Eternity"}
            onChange={(e) => setSetting("name_tier3", e.target.value)}
            placeholder="Contoh: Eternity"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
          />
        </FieldRow>
        <FieldRow label="Harga (IDR)">
          <input
            type="number"
            value={settingsMap["price_tier3"] || "149000"}
            onChange={(e) => setSetting("price_tier3", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
          />
        </FieldRow>
        <FieldRow label="Deskripsi">
          <textarea
            rows={3}
            value={settingsMap["desc_tier3"] || "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal"}
            onChange={(e) => setSetting("desc_tier3", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
          />
        </FieldRow>
        <FieldRow label="Daftar Fitur (Satu per baris)">
          <textarea
            rows={4}
            value={settingsMap["features_tier3"] || ""}
            onChange={(e) => setSetting("features_tier3", e.target.value)}
            placeholder="Pisahkan dengan baris baru (Enter)"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none"
          />
        </FieldRow>
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">Fitur / Kapabilitas Paket</label>
          <div className="space-y-1.5 bg-white p-3 border border-purple-200 rounded-xl max-h-48 overflow-y-auto no-scrollbar">
            {AVAILABLE_CAPABILITIES.map(cap => (
              <label key={cap.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-purple-50 p-1 rounded">
                <input
                  type="checkbox"
                  className="rounded border-purple-300 text-purple-600 focus:ring-purple-600 w-3.5 h-3.5 cursor-pointer"
                  checked={getCaps("capabilities_tier3").includes(cap.id)}
                  onChange={() => toggleCap("capabilities_tier3", cap.id)}
                />
                <span>{cap.label}</span>
              </label>
            ))}
          </div>
        </div>
        {getCaps("capabilities_tier3").includes("guest_memories") && (
          <div className="mt-2.5 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
            <span className="block text-[11px] font-bold text-purple-900 uppercase tracking-wide">Total Kuota Foto Acara</span>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Batas Maksimal Foto Tamu (Plafon Cloud)</label>
              <input
                type="number"
                min={100}
                max={10000}
                step={100}
                value={settingsMap["memories_total_quota_tier3"] || "1000"}
                onChange={(e) => setSetting("memories_total_quota_tier3", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-[10px] text-purple-700 leading-tight">
              Pengantin bebas mengatur jatah roll per tamu di studionya selama total foto tidak melampaui kuota ini.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  </SettingsCard>
    );
  })()}

  {/* Add-ons & Extension Pricing Settings */}
  {(() => {
    const ADDONS_KEYS = [
      "gallery_extension_price_per_month",
      "addon_memories_topup_photos",
      "addon_memories_topup_price",
      "addon_memories_topup_enabled",
    ];
    return (
      <SettingsCard
        title="Pengaturan Layanan Tambahan (Add-Ons)"
        description="Atur tarif dinamis untuk layanan perpanjangan masa aktif (undangan & galeri momen tamu) serta add-on kapasitas kuota foto tambahan (top-up)."
        isEditing={Boolean(editSection["addons"])}
        onEdit={() => toggleEditSection("addons")}
        onCancel={() => cancelEdit("addons", ADDONS_KEYS)}
        onSave={() => saveSettings(ADDONS_KEYS, setSavingAddons, "addons")}
        saving={savingAddons}
        isDirty={isSectionDirty(ADDONS_KEYS)}
        saveSuccess={settingsSaved["addons"]}
        saveSuccessMessage="Pengaturan layanan tambahan (Add-Ons) berhasil diperbarui"
        viewContent={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-900 block mb-1">Perpanjangan Masa Aktif (Undangan & Galeri)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-bold text-purple-950">
                    Rp {Number(settingsMap["gallery_extension_price_per_month"] || 50000).toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-purple-800 font-medium">/ 30 Hari (Bulan)</span>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Tarif perpanjangan masa aktif website undangan & penyimpanan foto momen tamu per 30 hari via kasir terpadu.
                </p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900">Top-Up Kuota Foto Tamu</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${settingsMap["addon_memories_topup_enabled"] !== "false" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                    {settingsMap["addon_memories_topup_enabled"] !== "false" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-mono font-bold text-indigo-950">
                    Rp {Number(settingsMap["addon_memories_topup_price"] || 35000).toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-indigo-800 font-medium">/ +{settingsMap["addon_memories_topup_photos"] || 100} Foto</span>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Ekstra kapasitas foto tamu yang dapat dibeli pengantin secara fleksibel di dashboard tanpa harus upgrade tier paket.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FieldRow
            label="Tarif Perpanjangan Masa Aktif (Bulanan / 30 Hari)"
            description="Nominal tagihan dinamis per bulan (+30 hari) untuk mempertahankan masa aktif website undangan dan penyimpanan galeri foto momen tamu di cloud (Rupiah)."
          >
            <input
              type="number"
              min="10000"
              step="5000"
              value={settingsMap["gallery_extension_price_per_month"] || "50000"}
              onChange={(e) => setSetting("gallery_extension_price_per_month", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono"
            />
          </FieldRow>

          <FieldRow
            label="Top-Up Kuota Foto Kamera Tamu"
            description="Atur kapasitas tambahan foto dan tarif add-on top-up per batch jika pengantin membutuhkan kuota foto lebih banyak tanpa upgrade paket."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Add-On</label>
                <select
                  value={settingsMap["addon_memories_topup_enabled"] ?? "true"}
                  onChange={(e) => setSetting("addon_memories_topup_enabled", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="true">Aktif (Dapat Dipesan)</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tambah Kuota (Foto)</label>
                <input
                  type="number"
                  min="25"
                  step="25"
                  value={settingsMap["addon_memories_topup_photos"] || "100"}
                  onChange={(e) => setSetting("addon_memories_topup_photos", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Add-On (IDR)</label>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={settingsMap["addon_memories_topup_price"] || "35000"}
                  onChange={(e) => setSetting("addon_memories_topup_price", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </FieldRow>
        </div>
      </SettingsCard>
    );
  })()}
  </>
  )}

  {/* ══ TAB: INTEGRASI & API ══ */}
  {activeSettingsTab === "integrasi" && (
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
              <span>Galeri Template Email Transaksional (7 Varian)</span>
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
                placeholder={session?.user?.email || "email@anda.com"}
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
    onSave={() => saveSettings(["memories_notify_milestones"], setSavingMemoriesMilestones, "setup")}
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
    onCancel={() => cancelEdit("subdomain", ["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "subdomain_auto_recycle"])}
    onSave={() => saveSettings(["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "subdomain_auto_recycle"], setSavingSubdomainSettings, "subdomain")}
    saving={savingSubdomainSettings}
    isDirty={isSectionDirty(["subdomain_grace_days", "retention_cleanup_days", "retention_custom_domain_days", "subdomain_auto_recycle"])}
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

  {/* Google OAuth 2.0 Integration Info */}
  <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900">Google OAuth 2.0 (Login & Registrasi Klien)</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Terkonfigurasi di .env
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Sesuai standar keamanan NextAuth v5, kredensial Google Client ID &amp; Client Secret dikelola terpusat melalui environment variable server (<code className="font-mono text-gray-700">.env</code>).
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-xs text-gray-500 block font-medium mb-1">Authorized JavaScript Origin</span>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono font-semibold text-gray-900 truncate flex-1">{currentOrigin}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(currentOrigin)}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Salin
          </button>
        </div>
      </div>

      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-xs text-gray-500 block font-medium mb-1">Authorized Redirect URI (Callback)</span>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono font-semibold text-gray-900 truncate flex-1">{`${currentOrigin}/api/auth/callback/google`}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`${currentOrigin}/api/auth/callback/google`)}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Salin
          </button>
        </div>
      </div>
    </div>
  </div>

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
  </>
  )}

  {/* ══ TAB: OPERASIONAL ══ */}
  {activeSettingsTab === "operasional" && (
  <>

  {/* ── Status Layanan & Pembatasan Registrasi (Service Availability / Close Order) ── */}
  <SettingsCard
    title="Status Layanan & Pembatasan Registrasi / Order"
    description="Kelola ketersediaan platform: Buka normal, Tutup order / kuota penuh, Pemeliharaan sistem, atau Segera hadir. Dilengkapi notifikasi dinamis untuk pengunjung."
    isEditing={Boolean(editSection["service_status"])}
    onEdit={() => toggleEditSection("service_status")}
    onCancel={() =>
      cancelEdit("service_status", [
        "service_status_mode",
        "service_status_title",
        "service_status_message",
        "service_status_reopen_date",
        "service_status_contact_wa",
      ])
    }
    onSave={() =>
      saveSettings(
        [
          "service_status_mode",
          "service_status_title",
          "service_status_message",
          "service_status_reopen_date",
          "service_status_contact_wa",
        ],
        setSavingServiceStatus,
        "service_status"
      )
    }
    saving={savingServiceStatus}
    isDirty={isSectionDirty([
      "service_status_mode",
      "service_status_title",
      "service_status_message",
      "service_status_reopen_date",
      "service_status_contact_wa",
    ])}
    saveSuccess={settingsSaved["service_status"]}
    saveSuccessMessage="Status ketersediaan layanan berhasil disimpan dan langsung aktif"
    viewContent={
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500">Mode Saat Ini:</span>
            {(!settingsMap["service_status_mode"] || settingsMap["service_status_mode"] === "OPEN") && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Buka Normal (Layanan Penuh)
              </span>
            )}
            {settingsMap["service_status_mode"] === "CLOSED_ORDER" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Tutup Order / Kuota Penuh
              </span>
            )}
            {settingsMap["service_status_mode"] === "MAINTENANCE" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Pemeliharaan Sistem
              </span>
            )}
            {settingsMap["service_status_mode"] === "COMING_SOON" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Segera Hadir (Pre-Launch)
              </span>
            )}
          </div>

          <span className="text-[11px] text-gray-500">
            {(!settingsMap["service_status_mode"] || settingsMap["service_status_mode"] === "OPEN")
              ? "Pendaftaran akun baru & order terbuka"
              : "Klien terdaftar tetap dapat login & akses dashboard"}
          </span>
        </div>

        {/* Details when non-OPEN */}
        {settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">Judul Pengumuman</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                {settingsMap["service_status_title"] || (
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Pemesanan Ditutup Sementara" :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "Sistem Dalam Pemeliharaan" : "Segera Hadir"
                )}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">Estimasi Dibuka Kembali</span>
              <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                {settingsMap["service_status_reopen_date"] || "Tidak ditentukan"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-medium">WhatsApp Waiting List</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                {settingsMap["service_status_contact_wa"] ? `+${settingsMap["service_status_contact_wa"]}` : "Belum diatur"}
              </span>
            </div>
          </div>
        )}

        {settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN" && (
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium mb-1">Isi Pesan Pengumuman Klien</span>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {settingsMap["service_status_message"] || (
                settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa." :
                settingsMap["service_status_mode"] === "MAINTENANCE" ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara." :
                "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
              )}
            </p>
          </div>
        )}
      </div>
    }
  >
    <div className="space-y-5">
      {/* Mode Selection Cards */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Mode Status Layanan</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: "OPEN",
              label: "Buka Normal",
              desc: "Pendaftaran akun baru dan order paket aktif tanpa batasan.",
              color: "emerald",
            },
            {
              id: "CLOSED_ORDER",
              label: "Tutup Order",
              desc: "Kuota penuh. Pendaftaran baru ditolak, klien lama tetap bisa login.",
              color: "amber",
            },
            {
              id: "MAINTENANCE",
              label: "Pemeliharaan",
              desc: "Perbaikan sistem. Pendaftaran & transaksi baru ditangguhkan.",
              color: "rose",
            },
            {
              id: "COMING_SOON",
              label: "Segera Hadir",
              desc: "Persiapan rilis versi baru. Registrasi publik belum dibuka.",
              color: "purple",
            },
          ].map((m) => {
            const isSelected = (settingsMap["service_status_mode"] || "OPEN") === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSetting("service_status_mode", m.id);
                  if (!settingsMap["service_status_title"]) {
                    if (m.id === "CLOSED_ORDER") setSetting("service_status_title", "Pemesanan Ditutup Sementara");
                    if (m.id === "MAINTENANCE") setSetting("service_status_title", "Sistem Dalam Pemeliharaan");
                    if (m.id === "COMING_SOON") setSetting("service_status_title", "Segera Hadir");
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? m.color === "emerald"
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                      : m.color === "amber"
                      ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20"
                      : m.color === "rose"
                      ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20"
                      : "bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900">{m.label}</span>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? m.color === "emerald" ? "border-emerald-600 bg-emerald-600" :
                          m.color === "amber" ? "border-amber-600 bg-amber-600" :
                          m.color === "rose" ? "border-rose-600 bg-rose-600" : "border-purple-600 bg-purple-600"
                        : "border-gray-300 bg-white"
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Details (Relevant when not OPEN or custom) */}
      {(settingsMap["service_status_mode"] && settingsMap["service_status_mode"] !== "OPEN") && (
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Formulir Pesan &amp; Notifikasi Pengunjung</h4>

          <FieldRow
            label="Judul Notifikasi"
            description="Teks judul yang ditampilkan di banner atas login, paket, dan landing page."
          >
            <input
              type="text"
              value={settingsMap["service_status_title"] ?? ""}
              placeholder={
                settingsMap["service_status_mode"] === "CLOSED_ORDER"
                  ? "Pemesanan Ditutup Sementara"
                  : settingsMap["service_status_mode"] === "MAINTENANCE"
                  ? "Sistem Dalam Pemeliharaan"
                  : "Segera Hadir"
              }
              onChange={(e) => setSetting("service_status_title", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
          </FieldRow>

          <FieldRow
            label="Pesan Penjelasan untuk Klien"
            description="Jelaskan alasan penutupan, kuota pengerjaan, atau informasi pemeliharaan sistem."
          >
            <textarea
              rows={3}
              value={settingsMap["service_status_message"] ?? ""}
              placeholder={
                settingsMap["service_status_mode"] === "CLOSED_ORDER"
                  ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa."
                  : settingsMap["service_status_mode"] === "MAINTENANCE"
                  ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara."
                  : "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
              }
              onChange={(e) => setSetting("service_status_message", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
            />
          </FieldRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow
              label="Estimasi Dibuka Kembali"
              description="Contoh: 15 Oktober 2026 atau Segera (kosongkan jika belum pasti)."
            >
              <input
                type="text"
                value={settingsMap["service_status_reopen_date"] ?? ""}
                placeholder="Contoh: 15 Oktober 2026"
                onChange={(e) => setSetting("service_status_reopen_date", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
              />
            </FieldRow>

            <FieldRow
              label="WhatsApp Bantuan / Waiting List"
              description="Format internasional tanpa tanda plus, contoh: 6281234567890."
            >
              <input
                type="text"
                value={settingsMap["service_status_contact_wa"] ?? ""}
                placeholder="Contoh: 6281234567890"
                onChange={(e) => setSetting("service_status_contact_wa", e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
              />
            </FieldRow>
          </div>

          {/* Live Preview Box */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Simulasi Tampilan Banner di Halaman Login &amp; Paket:</span>
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              settingsMap["service_status_mode"] === "CLOSED_ORDER"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : settingsMap["service_status_mode"] === "MAINTENANCE"
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-stone-50 border-stone-200 text-stone-900"
            }`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "bg-amber-600" :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "bg-rose-600" : "bg-stone-700"
                }`} />
                <span>
                  {settingsMap["service_status_title"] || (
                    settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Pemesanan Ditutup Sementara" :
                    settingsMap["service_status_mode"] === "MAINTENANCE" ? "Sistem Dalam Pemeliharaan" : "Segera Hadir"
                  )}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed text-xs">
                {settingsMap["service_status_message"] || (
                  settingsMap["service_status_mode"] === "CLOSED_ORDER" ? "Mohon maaf, kuota pemesanan undangan baru saat ini telah penuh demi menjaga standar kualitas dan ketepatan pengerjaan. Klien terdaftar tetap dapat masuk dan mengelola undangan seperti biasa." :
                  settingsMap["service_status_mode"] === "MAINTENANCE" ? "Kami sedang melakukan pemeliharaan berkala untuk meningkatkan stabilitas sistem. Pendaftaran akun baru ditangguhkan sementara." :
                  "Platform undangan pernikahan digital mewah sedang mempersiapkan perilisan versi terbaru. Pantau terus pembaruan kami."
                )}
              </p>
              {settingsMap["service_status_reopen_date"] && (
                <p className="text-[11px] font-semibold text-amber-900">
                  Estimasi dibuka kembali: <span className="underline">{settingsMap["service_status_reopen_date"]}</span>
                </p>
              )}
              <div className="pt-2 border-t border-black/5 text-[11px] text-gray-500 flex items-center justify-between">
                <span>Akun terdaftar tetap bisa login.</span>
                {settingsMap["service_status_contact_wa"] && (
                  <span className="font-bold text-amber-800">Tanya Kuota via WhatsApp →</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </SettingsCard>

  {/* WhatsApp Template Settings */}
  <SettingsCard
    title="Template Pesan WhatsApp (Pengiriman Undangan)"
    description="Kustomisasi pesan default yang akan dikirimkan ke tamu via WhatsApp. Gunakan placeholder {{GUEST_NAME}}, {{INVITATION_URL}}, {{COUPLE_NAMES}}."
    isEditing={Boolean(editSection["wa_template"])}
    onEdit={() => toggleEditSection("wa_template")}
    onCancel={() => cancelEdit("wa_template", ["wa_template_message"])}
    onSave={() => saveSettings(["wa_template_message"], setSavingPlatformCustom, "wa_template")}
    saving={savingPlatformCustom}
    isDirty={isSectionDirty(["wa_template_message"])}
    saveSuccess={settingsSaved["wa_template"]}
    saveSuccessMessage="Template WhatsApp berhasil disimpan"
    viewContent={
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
        {settingsMap["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{COUPLE_NAMES}}"}
      </div>
    }
  >
    <FieldRow label="Isi Pesan WhatsApp" description="Pesan ini akan menjadi default untuk semua klien.">
      <textarea
        rows={6}
        value={settingsMap["wa_template_message"] || "Assalamu'alaikum {{GUEST_NAME}},\n\nKami mengundang Bapak/Ibu dalam pernikahan kami.\n\nUndangan: {{INVITATION_URL}}\n\nHormat kami,\n{{COUPLE_NAMES}}"}
        onChange={(e) => setSetting("wa_template_message", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
      />
    </FieldRow>
  </SettingsCard>

  {/* Landing Page Feature Cards Settings */}
  <SettingsCard
    title="Fitur Landing Page (3 Kartu)"
    description="Sesuaikan judul dan deskripsi untuk 3 kartu fitur utama di halaman depan (Landing Page)."
    isEditing={Boolean(editSection["landing_features"])}
    onEdit={() => toggleEditSection("landing_features")}
    onCancel={() => cancelEdit("landing_features", ["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
    onSave={() => saveSettings(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"], setSavingPlatformCustom, "landing_features")}
    saving={savingPlatformCustom}
    isDirty={isSectionDirty(["landing_feature_1_title", "landing_feature_1_desc", "landing_feature_2_title", "landing_feature_2_desc", "landing_feature_3_title", "landing_feature_3_desc"])}
    saveSuccess={settingsSaved["landing_features"]}
    saveSuccessMessage="Fitur Landing Page berhasil disimpan"
    viewContent={
      <div className="space-y-4">
        {[1, 2, 3].map((num) => (
          <div key={num} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-amber-600 font-bold block mb-1">Kartu Fitur {num}</span>
            <div className="font-bold text-gray-800 text-sm">{settingsMap[`landing_feature_${num}_title`] || (num === 1 ? "Desain Elegan & Responsif" : num === 2 ? "Manajemen Tamu & WhatsApp" : "Galeri Foto Dinamis")}</div>
            <div className="text-xs text-gray-500 mt-1">{settingsMap[`landing_feature_${num}_desc`] || (num === 1 ? "Desain visual modern yang memukau di perangkat apa pun." : num === 2 ? "Generator link pintar per tamu dengan automasi pesan." : "Layout Masonry cerdas untuk galeri foto pernikahan.")}</div>
          </div>
        ))}
      </div>
    }
  >
    <div className="space-y-4">
      {[1, 2, 3].map((num) => (
        <div key={num} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-3">
          <h4 className="text-sm font-bold text-gray-700">Kartu {num}</h4>
          <FieldRow label="Judul">
            <input
              type="text"
              value={settingsMap[`landing_feature_${num}_title`] || ""}
              onChange={(e) => setSetting(`landing_feature_${num}_title`, e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
            />
          </FieldRow>
          <FieldRow label="Deskripsi">
            <textarea
              rows={2}
              value={settingsMap[`landing_feature_${num}_desc`] || ""}
              onChange={(e) => setSetting(`landing_feature_${num}_desc`, e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-amber-500 transition shadow-2xs"
            />
          </FieldRow>
        </div>
      ))}
    </div>
  </SettingsCard>





  {/* Branding — Logo & Favicon */}
  <div
    className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 p-6 ${
      editSection["branding"]
        ? "border-amber-400 ring-2 ring-amber-400/20"
        : "border-gray-200 hover:border-gray-300"
    }`}
  >
    <div className="flex items-start justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Branding — Logo &amp; Favicon</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Identitas visual platform yang otomatis terpasang dan tersinkronisasi di seluruh halaman.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          toggleEditSection("branding");
          setPendingLogo(null);
          setPendingFavicon(null);
          setPreviewLogo(null);
          setPreviewFavicon(null);
          setBrandUploadMsg(null);
        }}
        className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{editSection["branding"] ? "Tutup Form" : "Ubah File"}</span>
      </button>
    </div>

    {/* Upload Message */}
    {brandUploadMsg && (
      <div className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
        brandUploadMsg.ok
          ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
          : "bg-rose-50 border border-rose-300 text-rose-900"
      }`}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {brandUploadMsg.ok
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          }
        </svg>
        <span>[{brandUploadMsg.type.toUpperCase()}] {brandUploadMsg.msg}</span>
      </div>
    )}

    {/* ── Minimized Summary View (Saat tidak mode edit) ── */}
    {!editSection["branding"] ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Summary Logo */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold font-serif text-amber-800 text-sm">L</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-gray-800 block">Logo Platform</span>
              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                {logoUrl ? "logo.webp (Optimal)" : "Menggunakan Monogram"}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            logoUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
          }`}>
            {logoUrl ? "● Terpasang" : "Default"}
          </span>
        </div>

        {/* Summary Favicon */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
              ) : (
                <span className="font-bold text-gray-400 text-xs">ICO</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-gray-800 block">Favicon Tab</span>
              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">
                {faviconUrl ? "favicon.png (64×64)" : "favicon.ico"}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            faviconUrl ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
          }`}>
            {faviconUrl ? "● Terpasang" : "Default"}
          </span>
        </div>
      </div>
    ) : (
      /* ── Expanded Form Edit Mode ── */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* ── Logo Upload ── */}
        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-bold text-gray-800">Upload Logo Baru</p>
            <p className="text-xs text-gray-400 mt-0.5">Format: WebP, maks. 800px. Menimpa logo sebelumnya.</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {(previewLogo || logoUrl) ? (
                <img src={previewLogo ?? logoUrl!} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold font-serif text-gray-400 text-sm">L</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-gray-500 truncate">
                {pendingLogo
                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingLogo.name}</span>
                  : logoUrl ? "/assets/brand/logo.webp" : "Belum ada logo"
                }
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                Pilih File Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingLogo(f);
                    setPreviewLogo(URL.createObjectURL(f));
                    setBrandUploadMsg(null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {pendingLogo && (
              <button
                type="button"
                onClick={() => { setPendingLogo(null); setPreviewLogo(null); }}
                disabled={uploadingLogo}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => uploadBrandAsset("logo")}
              disabled={!pendingLogo || uploadingLogo}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {uploadingLogo ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : "Simpan Logo"}
            </button>
          </div>
        </div>

        {/* ── Favicon Upload ── */}
        <div className="space-y-3 p-4 bg-gray-50/70 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-bold text-gray-800">Upload Favicon Baru</p>
            <p className="text-xs text-gray-400 mt-0.5">Format: PNG/SVG persegi (disarankan min. 192×192px). Sistem otomatis men-generate seluruh ukuran standar Google Search & PWA (48px, 96px, 192px, 512px).</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {(previewFavicon || faviconUrl) ? (
                <img src={previewFavicon ?? faviconUrl!} alt="Favicon preview" className="w-8 h-8 object-contain" />
              ) : (
                <span className="font-bold text-gray-400 text-xs">ICO</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-gray-500 truncate">
                {pendingFavicon
                  ? <span className="text-amber-800 font-bold">Terpilih: {pendingFavicon.name}</span>
                  : faviconUrl ? "/assets/brand/favicon.png" : "Belum ada favicon"
                }
              </p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition bg-gray-100 hover:bg-gray-200 text-gray-700">
                Pilih File Favicon
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingFavicon(f);
                    setPreviewFavicon(URL.createObjectURL(f));
                    setBrandUploadMsg(null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {pendingFavicon && (
              <button
                type="button"
                onClick={() => { setPendingFavicon(null); setPreviewFavicon(null); }}
                disabled={uploadingFavicon}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => uploadBrandAsset("favicon")}
              disabled={!pendingFavicon || uploadingFavicon}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {uploadingFavicon ? (
                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
              ) : "Simpan Favicon"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Platform Settings */}
  <SettingsCard
    title="Konfigurasi Platform & Tampilan"
    description="Nama platform, kontak resmi, dan teks headline hero yang digunakan di seluruh sistem."
    isEditing={Boolean(editSection["platform"])}
    onEdit={() => toggleEditSection("platform")}
    onCancel={() => cancelEdit("platform", ["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
    onSave={() => saveSettings(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"], setSavingPlatform, "platform")}
    saving={savingPlatform}
    isDirty={isSectionDirty(["platform_name", "support_email", "support_whatsapp", "hero_tagline", "hero_subtitle"])}
    saveSuccess={settingsSaved["platform"]}
    saveSuccessMessage="Konfigurasi platform & tampilan berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Nama Platform</span>
            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["platform_name"] || "Sistem Undangan"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Domain Host</span>
            <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 inline-block">{currentOrigin}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Email Support</span>
            <span className="text-sm font-bold text-gray-800 mt-0.5 inline-block">{settingsMap["support_email"] || "Belum diatur"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">WhatsApp Admin / CS</span>
            <span className="text-sm font-bold text-emerald-700 mt-0.5 inline-block">{settingsMap["support_whatsapp"] ? `+${settingsMap["support_whatsapp"]}` : "Belum diatur"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Tagline Hero (Halaman Utama)</span>
            <span className="text-xs font-semibold text-gray-800 mt-0.5 inline-block">{settingsMap["hero_tagline"] || "Undangan Digital Elegan, Hangat & Berkelas"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Deskripsi Subtitle Hero</span>
            <span className="text-xs text-gray-600 mt-0.5 line-clamp-2">{settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif..."}</span>
          </div>
        </div>
      </div>
    }
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FieldRow label="Nama Platform">
        <input
          type="text"
          value={settingsMap["platform_name"] !== undefined ? settingsMap["platform_name"] : "Sistem Undangan"}
          onChange={(e) => setSetting("platform_name", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <FieldRow label="Domain Host Platform" description="Domain terdeteksi otomatis dari host server aktif.">
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono flex items-center justify-between">
          <span>{currentOrigin}</span>
          <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-sans font-bold">● Auto</span>
        </div>
      </FieldRow>

      <FieldRow label="Email Support">
        <input
          type="email"
          value={settingsMap["support_email"] || ""}
          onChange={(e) => setSetting("support_email", e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      <FieldRow label="Nomor WhatsApp Admin / CS" description="Gunakan kode negara tanpa +, contoh: 6281234567890">
        <input
          type="text"
          value={settingsMap["support_whatsapp"] || ""}
          onChange={(e) => {
            let val = e.target.value.replace(/[^0-9]/g, "");
            if (val.startsWith("0")) val = "62" + val.slice(1);
            setSetting("support_whatsapp", val);
          }}
          placeholder="Contoh: 6281234567890"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
        />
      </FieldRow>

      </div>

    <FieldRow label="Tagline Hero (Headline Besar Halaman Utama)">
      <input
        type="text"
        value={settingsMap["hero_tagline"] || "Undangan Digital Elegan, Hangat & Berkelas"}
        onChange={(e) => setSetting("hero_tagline", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
      />
    </FieldRow>

    <FieldRow label="Deskripsi / Subtitle Hero Halaman Utama">
      <textarea
        rows={3}
        value={settingsMap["hero_subtitle"] || "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, dan buku tamu real-time."}
        onChange={(e) => setSetting("hero_subtitle", e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none shadow-2xs"
      />
    </FieldRow>
  </SettingsCard>
  </>
  )}

</div>
  );
}
