"use client";

import { getPlanDisplayName } from "@/lib/planUtils";
import {
  formatPayoutMethod,
  type AffiliateCommission,
  type PartnerAffiliate,
  type PartnerPayoutRecord,
  type PromoCoupon,
} from "@/components/admin/marketing/types";

export interface MarketingTablesContext {
  activeSubTab: "coupons" | "partners" | "commissions" | "payouts";
  commissions: AffiliateCommission[];
  coupons: PromoCoupon[];
  filteredCoupons: PromoCoupon[];
  filteredPartners: PartnerAffiliate[];
  filteredPayouts: PartnerPayoutRecord[];
  handleDeleteCoupon: (id: string, code: string) => void;
  handleDeletePartner: (p: PartnerAffiliate) => void;
  openCouponModal: (c?: PromoCoupon) => void;
  openPartnerModal: (p?: PartnerAffiliate) => void;
  openPayoutDialog: (p: PartnerAffiliate) => void;
  packages: Array<{ id: string; name: string }>;
  partners: PartnerAffiliate[];
  payouts: PartnerPayoutRecord[];
}

export function MarketingTables({ ctx }: { ctx: MarketingTablesContext }) {
  const {
    activeSubTab,
    commissions,
    coupons,
    filteredCoupons,
    filteredPartners,
    filteredPayouts,
    handleDeleteCoupon,
    handleDeletePartner,
    openCouponModal,
    openPartnerModal,
    openPayoutDialog,
    packages,
    partners,
    payouts,
  } = ctx;

  return (
    <>
          {activeSubTab === "coupons" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Kode Kupon</th>
                      <th className="py-3 px-4">Nilai Diskon</th>
                      <th className="py-3 px-4">Kuota & Pemakaian</th>
                      <th className="py-3 px-4">Periode Berlaku</th>
                      <th className="py-3 px-4">Paket / Afiliasi</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          Belum ada kupon promo yang dibuat.
                        </td>
                      </tr>
                    ) : (
                      filteredCoupons.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                                {c.code}
                              </span>
                            </div>
                            {c.description && (
                              <span className="text-[11px] text-gray-400 block mt-1">
                                {c.description}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">
                              {c.discountType === "NOMINAL"
                                ? `Rp ${Number(c.discountValue).toLocaleString("id-ID")}`
                                : `${c.discountValue}%`}
                            </span>
                            {c.maxDiscountAmount && (
                              <span className="text-[10px] text-gray-400 block">
                                Maks: Rp {Number(c.maxDiscountAmount).toLocaleString("id-ID")}
                              </span>
                            )}
                            {Number(c.minOrderAmount) > 0 && (
                              <span className="text-[10px] text-amber-700 block">
                                Min belanja: Rp {Number(c.minOrderAmount).toLocaleString("id-ID")}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-semibold text-gray-800">
                              {c.usageCount}
                            </span>
                            <span className="text-gray-400">
                              {c.quotaLimit !== null ? ` / ${c.quotaLimit}` : " (Tanpa Batas)"}
                            </span>
                            {c._count?.holds ? (
                              <span className="text-[10px] text-amber-600 block mt-0.5">
                                • {c._count.holds} sedang di-hold di checkout
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            {c.validUntil ? (
                              <div>
                                <span className="text-gray-700 block">
                                  s/d {new Date(c.validUntil).toLocaleDateString("id-ID")}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(c.validUntil) < new Date() ? "Expired" : "Berlaku"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Permanen</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {c.partner ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium">
                                Mitra: {c.partner.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                                Promo Internal
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 block mt-1">
                              {c.applicablePlans.length === 0
                                ? "Semua Paket"
                                : c.applicablePlans.map((p) => getPlanDisplayName(p, packages)).join(", ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.isActive ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                              />
                              {c.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCouponModal(c)}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Kupon"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(c.id, c.code)}
                                className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Kupon"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MITRA (POTONGAN LANGSUNG, ZERO PAYOUT) */}
          {activeSubTab === "partners" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Mitra</th>
                      <th className="py-3 px-4">Kategori Vendor</th>
                      <th className="py-3 px-4">Kontak &amp; Login Portal</th>
                      <th className="py-3 px-4">Potongan Harga Mitra</th>
                      <th className="py-3 px-4">Klien Didaftarkan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          {partners.length === 0
                            ? "Belum ada mitra yang terdaftar."
                            : "Tidak ada mitra yang sesuai dengan pencarian atau filter kategori."}
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">{p.name}</span>
                            {p.notes && (
                              <span className="text-[10px] text-gray-400 block mt-0.5 truncate max-w-xs" title={p.notes}>
                                {p.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.vendorCategory ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-semibold">
                                {p.vendorCategory}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">Belum diatur</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            {p.email ? (
                              <span className="text-gray-800 block font-medium">{p.email}</span>
                            ) : (
                              <span className="text-amber-600 text-[10px] block">Belum ada email login</span>
                            )}
                            {p.phoneNumber && (
                              <span className="text-gray-500 block font-mono text-[10px]">
                                WA: {p.phoneNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                              {p.commissionType === "PERCENT"
                                ? `Potongan ${p.commissionValue}%`
                                : `Potongan Rp ${Number(p.commissionValue).toLocaleString("id-ID")}`}
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              Otomatis di checkout &bull; Tanpa payout
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-gray-900">
                              {p._count?.provisionedClients || 0} klien
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.isActive ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                              />
                              {p.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {Number(p.pendingBalance) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPayoutDialog(p)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                  title="Selesaikan sisa saldo lama"
                                >
                                  Selesaikan Saldo Lama
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openPartnerModal(p)}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Edit Mitra"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePartner(p)}
                                className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Mitra"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT KOMISI */}
          {activeSubTab === "commissions" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice Pesanan</th>
                      <th className="py-3 px-4">Mitra Penerima</th>
                      <th className="py-3 px-4">Nilai Transaksi</th>
                      <th className="py-3 px-4">Nominal Komisi</th>
                      <th className="py-3 px-4">Tanggal Order</th>
                      <th className="py-3 px-4">Status Komisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada transaksi yang menghasilkan komisi afiliasi.
                        </td>
                      </tr>
                    ) : (
                      commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4 font-mono font-semibold text-gray-900">
                            {c.order?.invoiceNumber || c.orderId}
                            <span className="text-[10px] text-gray-400 block font-normal font-sans">
                              Paket: {getPlanDisplayName(c.order?.planType, packages)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-800">
                            {c.partner?.name || "Mitra"}
                            {c.partner?.bankName && (
                              <span className="text-[10px] text-gray-400 block font-mono">
                                {c.partner.bankName} - {c.partner.accountNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-700">
                            Rp {Number(c.orderAmount).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                            Rp {Number(c.commissionAmount).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-gray-500">
                            {new Date(c.createdAt).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                c.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {c.status === "PAID" ? "Lunas (Sudah Ditransfer)" : "Menunggu Pencairan"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RIWAYAT PENCAIRAN KOMISI */}
          {activeSubTab === "payouts" && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Tanggal Cair</th>
                      <th className="py-3 px-4">Mitra Penerima</th>
                      <th className="py-3 px-4">Metode &amp; Referensi</th>
                      <th className="py-3 px-4 text-right">Nominal Dicairkan</th>
                      <th className="py-3 px-4">Catatan</th>
                      <th className="py-3 px-4 text-right">Bukti Transfer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada riwayat pencairan komisi mitra.
                        </td>
                      </tr>
                    ) : (
                      filteredPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4 text-[11px] text-gray-600 whitespace-nowrap">
                            {new Date(p.expenseDate).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 block">
                              {p.partner?.name || "Mitra"}
                            </span>
                            {p.partner?.email && (
                              <span className="text-[10px] text-gray-400 block">{p.partner.email}</span>
                            )}
                            {p.partner?.bankName && (
                              <span className="text-[10px] text-gray-400 block font-mono">
                                {p.partner.bankName} - {p.partner.accountNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800 block">
                              {formatPayoutMethod(p.paymentSource)}
                            </span>
                            {p.referenceNumber && (
                              <span className="text-[10px] font-mono text-gray-500 block">
                                Ref: {p.referenceNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            Rp {Number(p.amount).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-gray-500 max-w-xs truncate" title={p.notes || ""}>
                            {p.notes || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {p.hasReceipt ? (
                              <div className="inline-flex items-center gap-1.5">
                                <a
                                  href={`/api/admin/marketing/payouts/${p.id}/receipt`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition"
                                >
                                  Lihat Bukti
                                </a>
                                <a
                                  href={`/api/admin/marketing/payouts/${p.id}/receipt?download=1`}
                                  className="px-2 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-semibold transition"
                                >
                                  Unduh
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400">Tanpa lampiran</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
    </>
  );
}
