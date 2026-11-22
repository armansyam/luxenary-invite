export const AVAILABLE_CAPABILITIES = [
  { id: "guest_memories", label: "Galeri Kenangan Tamu (Live Photo Drop)" },
  { id: "qr_checkin", label: "QR Code Check-in Tamu & Sistem Resepsionis" },
  { id: "custom_domain", label: "Integrasi Custom Domain Pribadi (.com / .id)" },
];

// Sama dengan seed prisma/defaultSettings.ts; token diganti label masa simpan oleh lib/settings.ts.
export const PRICING_SUBTITLE_DEFAULT =
  "Biaya satu kali bayar dengan masa aktif undangan {{archiveRetention}} (archive) dan penyimpanan galeri foto tamu {{galleryRetention}}.";

export type SettingsSubTab = "akun" | "keuangan" | "paket" | "integrasi" | "operasional" | "tentang";

export interface AdminSettingsTabProps {
  session: any;
  settingsMap: Record<string, string>;
  editSection: Record<string, boolean>;
  settingsSaved: Record<string, boolean>;
  activeSettingsTab: SettingsSubTab;
  setActiveSettingsTab: (tab: SettingsSubTab) => void;
  currentOrigin: string;
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
  savingSmtp: boolean;
  setSavingSmtp: (v: boolean) => void;
  savingDomainDns: boolean;
  setSavingDomainDns: (v: boolean) => void;
  savingMemoriesMilestones: boolean;
  setSavingMemoriesMilestones: (v: boolean) => void;
  savingPaymentSettings: boolean;
  setSavingPaymentSettings: (v: boolean) => void;
  testingSmtp: boolean;
  testSmtpEmail: string;
  setTestSmtpEmail: (v: string) => void;
  testSmtpResult: { success: boolean; message: string } | null;
  setTestSmtpResult: (v: { success: boolean; message: string } | null) => void;
  detectingServerIp: boolean;
  detectIpResult: { success: boolean; message: string } | null;
  recyclingSubdomains: boolean;
  recycleResult: { success: boolean; message: string } | null;
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
