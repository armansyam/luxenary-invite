"use client";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { getPlanDisplayName } from "@/lib/planUtils";
import type { PartnerAffiliate, PromoCoupon } from "@/components/admin/marketing/types";

export interface MarketingModalsContext {
  addingCategory: boolean;
  clearPayoutReceipt: () => void;
  closePayoutDialog: () => void;
  couponForm: {
    code: string;
    description: string;
    discountType: "NOMINAL" | "PERCENT";
    discountValue: string;
    maxDiscountAmount: string;
    quotaLimit: string;
    applicablePlans: string[];
    validFrom: string;
    validUntil: string;
    partnerId: string;
    isActive: boolean;
  };
  couponModalOpen: boolean;
  deleteConfirm: { title: string; message: string; onConfirm: () => void } | null;
  editingCoupon: PromoCoupon | null;
  editingPartner: PartnerAffiliate | null;
  formSubmitting: boolean;
  handleAddVendorCategory: () => Promise<void>;
  handleCouponSubmit: (e: FormEvent) => Promise<void>;
  handleExecutePayout: (e: FormEvent) => Promise<void>;
  handleGenerateCode: () => void;
  handlePartnerSubmit: (e: FormEvent) => Promise<void>;
  handleSelectPayoutReceipt: (e: ChangeEvent<HTMLInputElement>) => void;
  newCategoryName: string;
  packages: Array<{ id: string; name: string }>;
  partnerForm: {
    name: string;
    vendorCategory: string;
    phoneNumber: string;
    email: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    commissionType: "PERCENT" | "NOMINAL";
    commissionValue: string;
    notes: string;
    isActive: boolean;
  };
  partnerModalOpen: boolean;
  payoutAmount: string;
  payoutLoading: boolean;
  payoutModalOpen: boolean;
  payoutNotes: string;
  payoutPartner: PartnerAffiliate | null;
  payoutPaymentSource: "TRANSFER_BANK" | "E_WALLET" | "TUNAI";
  payoutReceiptFile: File | null;
  payoutReceiptPreviewUrl: string | null;
  payoutReferenceNumber: string;
  setCouponForm: Dispatch<SetStateAction<MarketingModalsContext["couponForm"]>>;
  setCouponModalOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteConfirm: Dispatch<SetStateAction<MarketingModalsContext["deleteConfirm"]>>;
  setNewCategoryName: Dispatch<SetStateAction<string>>;
  setPartnerForm: Dispatch<SetStateAction<MarketingModalsContext["partnerForm"]>>;
  setPartnerModalOpen: Dispatch<SetStateAction<boolean>>;
  setPayoutAmount: Dispatch<SetStateAction<string>>;
  setPayoutNotes: Dispatch<SetStateAction<string>>;
  setPayoutPaymentSource: Dispatch<SetStateAction<"TRANSFER_BANK" | "E_WALLET" | "TUNAI">>;
  setPayoutReferenceNumber: Dispatch<SetStateAction<string>>;
  setShowAddCategoryInput: Dispatch<SetStateAction<boolean>>;
  showAddCategoryInput: boolean;
  vendorCategories: string[];
}

export function MarketingModals({ ctx }: { ctx: MarketingModalsContext }) {
  const {
    addingCategory,
    clearPayoutReceipt,
    closePayoutDialog,
    couponForm,
    couponModalOpen,
    deleteConfirm,
    editingCoupon,
    editingPartner,
    formSubmitting,
    handleAddVendorCategory,
    handleCouponSubmit,
    handleExecutePayout,
    handleGenerateCode,
    handlePartnerSubmit,
    handleSelectPayoutReceipt,
    newCategoryName,
    packages,
    partnerForm,
    partnerModalOpen,
    payoutAmount,
    payoutLoading,
    payoutModalOpen,
    payoutNotes,
    payoutPartner,
    payoutPaymentSource,
    payoutReceiptFile,
    payoutReceiptPreviewUrl,
    payoutReferenceNumber,
    setCouponForm,
    setCouponModalOpen,
    setDeleteConfirm,
    setNewCategoryName,
    setPartnerForm,
    setPartnerModalOpen,
    setPayoutAmount,
    setPayoutNotes,
    setPayoutPaymentSource,
    setPayoutReferenceNumber,
    setShowAddCategoryInput,
    showAddCategoryInput,
    vendorCategories,
  } = ctx;

  return (
    <>
      {/* ── MODAL CREATE / EDIT COUPON ── */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingCoupon ? "Edit Kupon Promo" : "Buat Kupon Promo Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-4 text-xs">
              {/* Kode Kupon */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Kode Kupon *</label>
                  {!editingCoupon && (
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-amber-700 hover:underline text-[11px] font-semibold"
                    >
                      Generate Otomatis
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingCoupon)}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: WO-BERKAH / LUX-PROMO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Contoh: Diskon Kemitraan Event Organizer / Mitra Berkah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Tipe Diskon & Nilai */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipe Diskon</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NOMINAL">Nominal (Rp)</option>
                    <option value="PERCENT">Persentase (%)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Nilai Diskon ({couponForm.discountType === "NOMINAL" ? "Rp" : "%"}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    placeholder={couponForm.discountType === "NOMINAL" ? "25000" : "15"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Cap Potongan Maks (hanya untuk diskon persen) */}
              {couponForm.discountType === "PERCENT" && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cap Potongan Maks. (Rp)</label>
                  <input
                    type="number"
                    value={couponForm.maxDiscountAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscountAmount: e.target.value })}
                    placeholder="Opsional, misal 50000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">Batasi agar diskon persen tidak terlalu besar pada paket mahal. Kosongkan jika bebas.</span>
                </div>
              )}

              {/* Berlaku untuk Paket */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Berlaku untuk Paket</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tier) => {
                    const isChecked = couponForm.applicablePlans.includes(tier);
                    return (
                      <label key={tier} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked
                              ? couponForm.applicablePlans.filter((p) => p !== tier)
                              : [...couponForm.applicablePlans, tier];
                            setCouponForm({ ...couponForm, applicablePlans: next });
                          }}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        {getPlanDisplayName(tier, packages)}
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">Kosongkan semua = berlaku untuk semua paket.</span>
              </div>

              {/* Batas Kuota Total */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Batas Kuota Total</label>
                <input
                  type="number"
                  value={couponForm.quotaLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, quotaLimit: e.target.value })}
                  placeholder="Kosongkan jika tanpa batas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Berapa orang yang boleh pakai kupon ini secara total.</span>
              </div>

              {/* Masa Berlaku */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mulai Berlaku</label>
                  <input
                    type="datetime-local"
                    value={couponForm.validFrom}
                    onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Berakhir Pada</label>
                  <input
                    type="datetime-local"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Catatan Kupon Promo Mandiri */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-[11px] text-blue-900 leading-relaxed">
                <strong>Kupon Promo Publik Mandiri:</strong> Kupon ini berlaku khusus untuk kampanye promo Luxvite dan otomatis diblokir pada akun klien Mitra (anti-stacking diskon ganda).
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="couponIsActive"
                  checked={couponForm.isActive}
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="couponIsActive" className="text-xs font-semibold text-gray-700">
                  Kupon Aktif dan Dapat Digunakan
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Kupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CREATE / EDIT PARTNER ── */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingPartner ? "Edit Mitra" : "Tambah Mitra Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePartnerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Lengkap Mitra *</label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="Contoh: Sanggar Rias Anggun / Berkah Wedding / Studio Cahaya"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Kategori Vendor Dinamis */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">Kategori Vendor</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryInput((v) => !v);
                      setNewCategoryName("");
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    {showAddCategoryInput ? "Tutup" : "+ Tambah Kategori Baru"}
                  </button>
                </div>
                <select
                  value={partnerForm.vendorCategory}
                  onChange={(e) => setPartnerForm({ ...partnerForm, vendorCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Kategori Vendor (Opsional) --</option>
                  {vendorCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {partnerForm.vendorCategory &&
                    !vendorCategories.some(
                      (c) => c.toLowerCase() === partnerForm.vendorCategory.toLowerCase(),
                    ) && (
                      <option value={partnerForm.vendorCategory}>
                        {partnerForm.vendorCategory}
                      </option>
                    )}
                </select>

                {showAddCategoryInput && (
                  <div className="mt-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                    <span className="text-[10px] font-semibold text-stone-600 block">
                      Tambah kategori vendor baru (otomatis tersimpan &amp; langsung dipilih):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={60}
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddVendorCategory();
                          }
                        }}
                        placeholder="Misal: WO, MC, Florist, Souvenir, Band..."
                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        disabled={addingCategory || !newCategoryName.trim()}
                        onClick={handleAddVendorCategory}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {addingCategory ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={partnerForm.phoneNumber}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phoneNumber: e.target.value })}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email Login Portal Mitra *</label>
                  <input
                    type="email"
                    required
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    placeholder="mitra@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Potongan Harga Langsung Mitra (Zero-Debt / No Payout) */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-3">
                <div>
                  <span className="font-bold text-amber-950 block text-[11px]">
                    Potongan Harga Khusus Mitra (Diskon Langsung di Checkout)
                  </span>
                  <span className="text-[10px] text-amber-900/80 block mt-0.5">
                    Otomatis memotong harga paket baru untuk seluruh klien yang didaftarkan mitra ini dari Portal Mitra. Tanpa utang komisi &amp; tanpa payout.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Tipe Potongan</label>
                    <select
                      value={partnerForm.commissionType}
                      onChange={(e) => setPartnerForm({ ...partnerForm, commissionType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="PERCENT">Persentase (%)</option>
                      <option value="NOMINAL">Nominal Tetap (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Nilai Potongan ({partnerForm.commissionType === "PERCENT" ? "%" : "Rp"}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={partnerForm.commissionType === "PERCENT" ? "95" : undefined}
                      value={partnerForm.commissionValue}
                      onChange={(e) => setPartnerForm({ ...partnerForm, commissionValue: e.target.value })}
                      placeholder={partnerForm.commissionType === "PERCENT" ? "20" : "30000"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Internal */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Catatan Staf (Internal)</label>
                <textarea
                  rows={2}
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  placeholder="Kemitraan event expo, kuota fleksibel, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="partnerIsActive"
                  checked={partnerForm.isActive}
                  onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="partnerIsActive" className="text-xs font-semibold text-gray-700">
                  Status Mitra Aktif
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Mitra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PAYOUT MITRA (INTEGRASI FINANCE + BUKTI TRANSFER + EMAIL OTOMATIS) ── */}
      {payoutModalOpen && payoutPartner && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pencairan Komisi Mitra</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mitra: <strong className="text-gray-800">{payoutPartner.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={closePayoutDialog}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80">
                <span className="text-[11px] text-amber-800 block">Total Saldo Belum Dibayar:</span>
                <span className="text-xl font-bold font-mono text-amber-950 block mt-0.5">
                  Rp {Number(payoutPartner.pendingBalance).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-amber-900/75 block mt-1">
                  Rekening Tujuan: {payoutPartner.bankName || "Bank"} {payoutPartner.accountNumber || "-"} (a.n. {payoutPartner.accountName || payoutPartner.name})
                </span>
              </div>

              {payoutPartner.email ? (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>
                    Detail pencairan &amp; lampiran bukti transfer akan dikirim otomatis ke{" "}
                    <strong className="font-mono">{payoutPartner.email}</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span>
                    Mitra ini belum memiliki alamat email terdaftar. Pencairan tetap tercatat ke Finance, namun email otomatis tidak akan terkirim.
                  </span>
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nominal Dicairkan (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Number(payoutPartner.pendingBalance)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono font-bold bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Metode Pembayaran</label>
                  <select
                    value={payoutPaymentSource}
                    onChange={(e) => setPayoutPaymentSource(e.target.value as "TRANSFER_BANK" | "E_WALLET" | "TUNAI")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="TRANSFER_BANK">Transfer Bank</option>
                    <option value="E_WALLET">E-Wallet</option>
                    <option value="TUNAI">Tunai</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">No. Referensi Transfer</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={payoutReferenceNumber}
                    onChange={(e) => setPayoutReferenceNumber(e.target.value)}
                    placeholder="Opsional, mis. TRF-20261120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Upload Bukti Transfer (JPG, PNG, WEBP, PDF — maks 5MB)
                </label>
                {!payoutReceiptFile ? (
                  <label className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-xl bg-gray-50/70 hover:bg-amber-50/30 transition cursor-pointer text-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span className="font-semibold text-gray-700">Pilih file bukti transfer</span>
                    <span className="text-[10px] text-gray-400">
                      Otomatis tersimpan di Finance &amp; dilampirkan pada email pencairan mitra
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleSelectPayoutReceipt}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center gap-3">
                    {payoutReceiptPreviewUrl ? (
                      <img
                        src={payoutReceiptPreviewUrl}
                        alt="Pratinjau bukti transfer"
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-800 shrink-0">
                        PDF
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{payoutReceiptFile.name}</div>
                      <div className="text-[10px] text-gray-500">
                        {(payoutReceiptFile.size / 1024).toFixed(1)} KB • Siap dilampirkan
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearPayoutReceipt}
                      className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[11px] font-semibold text-gray-600 transition cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Catatan Payout</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Otomatis mencatat pengeluaran kas (Expense) kategori MARKETING di Tab Finance beserta struknya.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closePayoutDialog}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  {payoutLoading
                    ? "Memproses..."
                    : payoutPartner.email
                      ? "Konfirmasi & Kirim Email"
                      : "Konfirmasi & Catat Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Minimalis */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900">{deleteConfirm.title}</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">Konfirmasi penghapusan data</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">{deleteConfirm.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteConfirm.onConfirm}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
