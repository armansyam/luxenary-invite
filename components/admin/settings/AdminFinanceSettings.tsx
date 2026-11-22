"use client";

import { SettingsCard, FieldRow } from "@/components/admin/AdminSettingsUI";
import type { AdminSettingsTabProps } from "@/components/admin/settings/types";

export function AdminFinanceSettings(props: AdminSettingsTabProps) {
  const {
    settingsMap,
    editSection,
    settingsSaved,
    currentOrigin,
    savingPaymentSettings,
    setSavingPaymentSettings,
    savingActiveGateway,
    setSavingActiveGateway,
    savingMidtrans,
    setSavingMidtrans,
    setSetting,
    toggleEditSection,
    cancelEdit,
    isSectionDirty,
    saveSettings,
  } = props;

  return (
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

  {/* ═══ PUSAT KONTROL & BASE SETTING GATEWAY GLOBAL ═══ */}
  <SettingsCard
    title="Pengaturan Tagihan QRIS"
    description="Masa berlaku QRIS Midtrans dan penanggung biaya layanan gateway."
    isEditing={Boolean(editSection["active_gateway"])}
    onEdit={() => toggleEditSection("active_gateway")}
    onCancel={() => cancelEdit("active_gateway", ["payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent"])}
    onSave={() => saveSettings(["payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent"], setSavingActiveGateway, "active_gateway")}
    saving={savingActiveGateway}
    isDirty={isSectionDirty(["payment_gateway_mode", "payment_expiry_minutes", "payment_fee_payer", "payment_gateway_fee_percent"])}
    saveSuccess={settingsSaved["active_gateway"]}
    saveSuccessMessage="Pengaturan global payment gateway berhasil disimpan"
    viewContent={
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500 block font-medium">Status Midtrans</span>
            <div className="mt-1.5">
              {(() => {
                const isSandbox = (settingsMap["midtrans_environment"] || "sandbox") === "sandbox";
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
      </div>
    }
  >
    <div className="space-y-4">
      <FieldRow label="Masa Berlaku Tagihan (Menit)" description="Durasi QRIS sebelum kedaluwarsa otomatis (contoh: 15, 30, 60, atau 1440 untuk 24 jam).">
        <input
          type="number"
          min="5"
          max="1440"
          value={settingsMap["payment_expiry_minutes"] || "60"}
          onChange={(e) => setSetting("payment_expiry_minutes", e.target.value)}
          className="w-full sm:max-w-xs px-3.5 py-2.5 border border-sky-300 rounded-xl text-sm bg-sky-50 text-sky-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-2xs font-mono font-bold"
        />
      </FieldRow>

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
              onChange={(e) => setSetting("payment_gateway_fee_percent", e.target.value)}
              className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold bg-white text-gray-900 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-gray-600 font-medium">% (Standar QRIS BI: 0.7%)</span>
          </div>
        </div>
      </FieldRow>
    </div>
  </SettingsCard>

  {/* ═══ MIDTRANS SETTINGS ═══ */}
  <SettingsCard
    title="Midtrans Payment Gateway"
    description="Konfigurasi Midtrans Snap — payment gateway resmi berlisensi Bank Indonesia (GoTo Group)."
    isEditing={Boolean(editSection["midtrans"])}
    onEdit={() => toggleEditSection("midtrans")}
    onCancel={() => cancelEdit("midtrans", ["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_sandbox_signature_key", "midtrans_production_client_key", "midtrans_production_server_key", "midtrans_production_signature_key"])}
    onSave={() => saveSettings(["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_sandbox_signature_key", "midtrans_production_client_key", "midtrans_production_server_key", "midtrans_production_signature_key"], setSavingMidtrans, "midtrans")}
    saving={savingMidtrans}
    isDirty={isSectionDirty(["midtrans_environment", "midtrans_sandbox_client_key", "midtrans_sandbox_server_key", "midtrans_sandbox_signature_key", "midtrans_production_client_key", "midtrans_production_server_key", "midtrans_production_signature_key"])}
    saveSuccess={settingsSaved["midtrans"]}
    saveSuccessMessage="Pengaturan Midtrans berhasil disimpan"
    viewContent={
      <div className="space-y-3">
        {/* ── Badge Mode Gateway Midtrans ── */}
        {(() => {
          const isSandbox = (settingsMap["midtrans_environment"] || "sandbox") === "sandbox";
          const activeSk = isSandbox
            ? (settingsMap["midtrans_sandbox_server_key"] || "").trim()
            : (settingsMap["midtrans_production_server_key"] || "").trim();

          if (!activeSk) return (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  {isSandbox ? "Sandbox Belum Dikonfigurasi" : "Produksi Belum Dikonfigurasi"}
                </span>
                <span className="text-[10px] text-rose-500 block mt-0.5">
                  Klik Ubah lalu isi Client Key, Server Key, dan Signature Secret Key pada slot {isSandbox ? "Sandbox" : "Produksi"}.
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
            const sbCk = settingsMap["midtrans_sandbox_client_key"] || "";
            const sbSk = settingsMap["midtrans_sandbox_server_key"] || "";
            const sbSig = settingsMap["midtrans_sandbox_signature_key"] || "";
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
                  <div>
                    <span className="text-gray-500 block text-[11px]">Signature Secret Key:</span>
                    <span className="font-mono font-medium text-gray-900">{sbSig ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">{sbSk ? "Memakai Server Key" : "Belum diatur"}</em>}</span>
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
            const prodSig = settingsMap["midtrans_production_signature_key"] || "";
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
                  <div>
                    <span className="text-gray-500 block text-[11px]">Signature Secret Key:</span>
                    <span className="font-mono font-medium text-gray-900">{prodSig ? "••••••••••••" : <em className="text-gray-400 font-sans font-normal">{prodSk ? "Memakai Server Key" : "Belum diatur"}</em>}</span>
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

        <FieldRow label="Client Key (Sandbox)" description="Dashboard Sandbox → Settings → Access Keys → kartu Client Key">
          <input
            type="text"
            value={settingsMap["midtrans_sandbox_client_key"] ?? ""}
            onChange={(e) => setSetting("midtrans_sandbox_client_key", e.target.value.trim())}
            placeholder="Mid-client-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Server Key (Sandbox) — untuk API" description="Sejak 29 Okt 2026 nilai Server Key hanya tampil saat dibuat: Access Keys → Server Keys → Generate server key (izin Snap Checkout, Core API, Cancel transaction), salin saat itu juga. Akun yang belum pernah membuat Server Key baru: nilainya sama dengan Signature Secret Key.">
          <input
            type="password"
            value={settingsMap["midtrans_sandbox_server_key"] ?? ""}
            onChange={(e) => setSetting("midtrans_sandbox_server_key", e.target.value.trim())}
            placeholder="Mid-server-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Signature Secret Key (Sandbox) — verifikasi notifikasi" description="Dashboard Sandbox → Settings → Access Keys → kartu Signature Secret Key. Kosong = memakai Server Key (hanya benar selama belum pernah membuat Server Key baru).">
          <input
            type="password"
            value={settingsMap["midtrans_sandbox_signature_key"] ?? ""}
            onChange={(e) => setSetting("midtrans_sandbox_signature_key", e.target.value.trim())}
            placeholder="Signature Secret Key"
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

        <FieldRow label="Client Key (Produksi)" description="Dashboard Production → Settings → Access Keys → kartu Client Key">
          <input
            type="text"
            value={settingsMap["midtrans_production_client_key"] || ""}
            onChange={(e) => setSetting("midtrans_production_client_key", e.target.value.trim())}
            placeholder="Mid-client-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Server Key (Produksi) — untuk API" description="Sejak 29 Okt 2026 nilai Server Key hanya tampil saat dibuat: Access Keys → Server Keys → Generate server key (izin Snap Checkout, Core API, Cancel transaction), salin saat itu juga. Akun yang belum pernah membuat Server Key baru: nilainya sama dengan Signature Secret Key.">
          <input
            type="password"
            value={settingsMap["midtrans_production_server_key"] || ""}
            onChange={(e) => setSetting("midtrans_production_server_key", e.target.value.trim())}
            placeholder="Mid-server-xxxxxxxxxxxx"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
        </FieldRow>

        <FieldRow label="Signature Secret Key (Produksi) — verifikasi notifikasi" description="Dashboard Production → Settings → Access Keys → kartu Signature Secret Key. Kosong = memakai Server Key (hanya benar selama belum pernah membuat Server Key baru).">
          <input
            type="password"
            value={settingsMap["midtrans_production_signature_key"] || ""}
            onChange={(e) => setSetting("midtrans_production_signature_key", e.target.value.trim())}
            placeholder="Signature Secret Key"
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
    </>
  );
}
