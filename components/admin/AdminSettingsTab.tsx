"use client";

import { AdminProfileSettings } from "@/components/admin/AdminProfileSettings";
import { AdminAboutSettings } from "@/components/admin/AdminAboutSettings";
import { AdminFinanceSettings } from "@/components/admin/settings/AdminFinanceSettings";
import { AdminPricingSettings } from "@/components/admin/settings/AdminPricingSettings";
import { AdminIntegrationsSettings } from "@/components/admin/settings/AdminIntegrationsSettings";
import { AdminOperationalSettings } from "@/components/admin/settings/AdminOperationalSettings";
import type { AdminSettingsTabProps } from "@/components/admin/settings/types";

const SETTINGS_TABS = [
  { id: "akun",        label: "Akun & Keamanan",    hint: "Profil & password admin" },
  { id: "keuangan",    label: "Keuangan & Gateway", hint: "Pembayaran, QRIS, bank" },
  { id: "paket",       label: "Paket & Harga",      hint: "Tier pricing & kapabilitas" },
  { id: "integrasi",   label: "Integrasi & API",    hint: "SMTP, DNS, domain" },
  { id: "operasional", label: "Operasional",        hint: "Status layanan, WA, landing" },
  { id: "tentang",     label: "Tentang Aplikasi",   hint: "Versi & catatan rilis" },
] as const;

export default function AdminSettingsTab(props: AdminSettingsTabProps) {
  const { activeSettingsTab, setActiveSettingsTab } = props;

  return (
    <div className="space-y-6 max-w-7xl w-full">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Akun, keuangan &amp; payment gateway, paket harga, integrasi API, dan operasional platform
        </p>
      </div>

      {/* ── Sub-Tab Navigation ── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
        {SETTINGS_TABS.map((t) => (
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
              <span className="text-[9px] font-normal text-gray-400 truncate w-full text-center hidden sm:block">
                {t.hint}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSettingsTab === "akun" && <AdminProfileSettings />}
      {activeSettingsTab === "tentang" && <AdminAboutSettings />}
      {activeSettingsTab === "keuangan" && <AdminFinanceSettings {...props} />}
      {activeSettingsTab === "paket" && <AdminPricingSettings {...props} />}
      {activeSettingsTab === "integrasi" && <AdminIntegrationsSettings {...props} />}
      {activeSettingsTab === "operasional" && <AdminOperationalSettings {...props} />}
    </div>
  );
}
