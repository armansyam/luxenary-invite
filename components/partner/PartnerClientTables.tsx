"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  formatDate,
  formatDateTimeWib,
  formatPaymentSource,
  formatRupiah,
  type PartnerClientTransaction,
  type PartnerCommission,
  type PartnerInfo,
  type PartnerPayout,
  type ProvisionedClient,
} from "@/components/partner/types";

export type PartnerClientStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "PENDING_ACTIVATION"
  | "EXPIRED";

export interface PartnerClientTablesContext {
  cancellingOrderId: string | null;
  clientEmail: string;
  clientName: string;
  clientSearch: string;
  clientStatusFilter: PartnerClientStatusFilter;
  clientTransactions: PartnerClientTransaction[];
  clients: ProvisionedClient[];
  clientsLoading: boolean;
  commissions: PartnerCommission[];
  dashboardTab: "clients" | "transactions";
  deletingClientId: string | null;
  email: string;
  filteredClients: ProvisionedClient[];
  filteredTransactions: PartnerClientTransaction[];
  filteredTxTotalBase: number;
  filteredTxTotalDiscount: number;
  filteredTxTotalFinal: number;
  handleCancelPartnerOrder: (orderId: string) => Promise<void>;
  handleDeletePartnerClient: (client: ProvisionedClient) => Promise<void>;
  handleExportTransactionsCsv: (rows: PartnerClientTransaction[]) => void;
  handleReorderClient: (client: ProvisionedClient) => Promise<void>;
  handleResendActivation: (client: ProvisionedClient) => Promise<void>;
  loadDashboard: () => Promise<void>;
  openPaymentModalForOrder: (opts: {
    orderId: string;
    invoiceNumber: string;
    planType: string;
    clientId: string;
    clientName: string;
    clientEmail: string;
    amount: number;
    discountAmount: number;
    paymentMethod: string;
    status: string;
    hasProof?: boolean;
    rejectReason?: string | null;
  }) => Promise<void>;
  partner: PartnerInfo;
  payouts: PartnerPayout[];
  reorderingClientId: string | null;
  resendingClientId: string | null;
  setClientSearch: Dispatch<SetStateAction<string>>;
  setClientStatusFilter: Dispatch<SetStateAction<PartnerClientStatusFilter>>;
  setDashboardTab: Dispatch<SetStateAction<"clients" | "transactions">>;
  setTxSearch: Dispatch<SetStateAction<string>>;
  setTxStatusFilter: Dispatch<SetStateAction<"ALL" | "PAID" | "PENDING" | "EXPIRED">>;
  txSearch: string;
  txStatusFilter: "ALL" | "PAID" | "PENDING" | "EXPIRED";
}

export function PartnerClientTables({ ctx }: { ctx: PartnerClientTablesContext }) {
  const {
    cancellingOrderId,
    clientEmail,
    clientName,
    clientSearch,
    clientStatusFilter,
    clientTransactions,
    clients,
    clientsLoading,
    commissions,
    dashboardTab,
    deletingClientId,
    email,
    filteredClients,
    filteredTransactions,
    filteredTxTotalBase,
    filteredTxTotalDiscount,
    filteredTxTotalFinal,
    handleCancelPartnerOrder,
    handleDeletePartnerClient,
    handleExportTransactionsCsv,
    handleReorderClient,
    handleResendActivation,
    loadDashboard,
    openPaymentModalForOrder,
    partner,
    payouts,
    reorderingClientId,
    resendingClientId,
    setClientSearch,
    setClientStatusFilter,
    setDashboardTab,
    setTxSearch,
    setTxStatusFilter,
    txSearch,
    txStatusFilter,
  } = ctx;
  const [confirmRowAction, setConfirmRowAction] = useState<{ kind: "cancel" | "delete"; id: string } | null>(null);

  return (
    <>
        {/* Sub-Tabs: Data Klien Ditangani & Laporan Transaksi */}
        <section className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-stone-100 self-start">
              <button
                type="button"
                onClick={() => setDashboardTab("clients")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dashboardTab === "clients"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Data Klien Ditangani ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab("transactions")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dashboardTab === "transactions"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Laporan Transaksi ({clientTransactions.length})
              </button>
            </div>

            {dashboardTab === "clients" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Cari nama / email / WA klien..."
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:border-amber-700 w-52"
                />
                <select
                  value={clientStatusFilter}
                  onChange={(e) => setClientStatusFilter(e.target.value as PartnerClientStatusFilter)}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Sudah Aktif</option>
                  <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
                  <option value="PENDING_ACTIVATION">Menunggu Aktivasi</option>
                  <option value="EXPIRED">Tagihan Kedaluwarsa / Batal</option>
                </select>
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={clientsLoading}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer shrink-0"
                >
                  {clientsLoading ? "Memuat..." : "Segarkan"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Cari invoice / nama klien..."
                  className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:border-amber-700 w-52"
                />
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value as "ALL" | "PAID" | "PENDING" | "EXPIRED")}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PAID">Lunas (PAID)</option>
                  <option value="PENDING">Menunggu Bayar (PENDING)</option>
                  <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                </select>
                <button
                  type="button"
                  disabled={filteredTransactions.length === 0}
                  onClick={() => handleExportTransactionsCsv(filteredTransactions)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Unduh CSV Laporan
                </button>
              </div>
            )}
          </div>

          {dashboardTab === "clients" ? (
            filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                {clients.length === 0
                  ? "Belum ada klien yang didaftarkan. Gunakan formulir di atas untuk mendaftarkan klien pertama Anda."
                  : "Tidak ada klien yang cocok dengan pencarian/filter saat ini."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="py-3 px-4">Klien &amp; Kontak</th>
                      <th className="py-3 px-4">Status Akun</th>
                      <th className="py-3 px-4">Undangan &amp; Aktivasi</th>
                      <th className="py-3 px-4">Pesanan Terakhir</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredClients.map((client) => {
                      const hasPaid = Boolean(client.hasPaidOrder || client.latestOrder?.status === "PAID");
                      const latestStatus = client.latestOrder?.status || null;
                      const isExpiredLink = !client.isActivated && hasPaid && Boolean(client.activation?.isExpired);
                      const isCancelledManually =
                        latestStatus === "EXPIRED" &&
                        Boolean(client.latestOrder?.rejectReason?.toLowerCase().includes("dibatalkan"));
                      const canDeleteClient =
                        !client.isActivated &&
                        !hasPaid &&
                        client.invitationCount === 0 &&
                        !(latestStatus === "PENDING" && client.latestOrder?.hasProof);

                      return (
                        <tr key={client.id} className="hover:bg-stone-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900">{client.name}</div>
                            <div className="text-[11px] text-stone-500">{client.email}</div>
                            {client.phoneNumber && (
                              <div className="text-[11px] font-mono text-stone-400">{client.phoneNumber}</div>
                            )}
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              Terdaftar: {formatDate(client.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {client.isActivated ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Aktif
                              </span>
                            ) : isExpiredLink ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Link Kedaluwarsa
                              </span>
                            ) : hasPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                Menunggu Aktivasi
                              </span>
                            ) : latestStatus === "PENDING" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                                Menunggu Pembayaran
                              </span>
                            ) : latestStatus === "EXPIRED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-200/80 text-stone-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                                {isCancelledManually ? "Tagihan Dibatalkan" : "Tagihan Kedaluwarsa"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                Belum Ada Tagihan
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-[11px] text-stone-500">
                            <div className="font-semibold text-stone-700">
                              {client.invitationCount > 0 ? `${client.invitationCount} undangan dibuat` : "Belum buat undangan"}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {client.isActivated
                                ? "Akun sudah aktif"
                                : hasPaid && client.activation?.expiresAt
                                  ? `Link s.d. ${formatDateTimeWib(client.activation.expiresAt)}`
                                  : latestStatus === "PENDING"
                                    ? "Tautan terbit setelah pembayaran lunas"
                                    : latestStatus === "EXPIRED"
                                      ? "Buat tagihan baru untuk melanjutkan"
                                      : "-"}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {client.latestOrder ? (
                              <div>
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    client.latestOrder.status === "PAID"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : client.latestOrder.status === "PENDING"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-stone-100 text-stone-600"
                                  }`}
                                >
                                  {client.latestOrder.status}
                                </span>
                                <div className="text-[11px] text-stone-600 mt-0.5 font-mono">
                                  {client.latestOrder.planType} &middot; {formatRupiah(client.latestOrder.amount)}
                                </div>
                                {client.latestOrder.discountAmount > 0 && (
                                  <div className="text-[10px] text-emerald-700 font-semibold">
                                    Hemat {formatRupiah(client.latestOrder.discountAmount)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400">Belum order</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {client.latestOrder && client.latestOrder.status === "PENDING" ? (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPaymentModalForOrder({
                                      orderId: client.latestOrder!.id,
                                      invoiceNumber: client.latestOrder!.invoiceNumber,
                                      planType: client.latestOrder!.planType,
                                      clientId: client.id,
                                      clientName: client.name,
                                      clientEmail: client.email,
                                      amount: client.latestOrder!.amount,
                                      discountAmount: client.latestOrder!.discountAmount,
                                      paymentMethod: client.latestOrder!.paymentMethod || "GATEWAY",
                                      status: client.latestOrder!.status,
                                      hasProof: client.latestOrder!.hasProof,
                                      rejectReason: client.latestOrder!.rejectReason,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold transition cursor-pointer"
                                >
                                  {client.latestOrder.hasProof ? "Lihat Status Bukti" : "Bayar Paket"}
                                </button>
                                {!client.latestOrder.hasProof && (
                                  confirmRowAction?.kind === "cancel" && confirmRowAction.id === client.latestOrder.id ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={cancellingOrderId === client.latestOrder.id}
                                        onClick={async () => {
                                          await handleCancelPartnerOrder(client.latestOrder!.id);
                                          setConfirmRowAction(null);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer"
                                      >
                                        {cancellingOrderId === client.latestOrder.id ? "..." : "Ya, Batal"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRowAction(null)}
                                        className="px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 text-[11px] font-semibold cursor-pointer"
                                      >
                                        Tidak
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={cancellingOrderId === client.latestOrder.id}
                                      onClick={() => setConfirmRowAction({ kind: "cancel", id: client.latestOrder!.id })}
                                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                                    >
                                      Batalkan
                                    </button>
                                  )
                                )}
                              </div>
                            ) : !client.isActivated && hasPaid ? (
                              <button
                                type="button"
                                disabled={resendingClientId === client.id}
                                onClick={() => handleResendActivation(client)}
                                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                {resendingClientId === client.id ? "Mengirim..." : "Kirim / Salin Link"}
                              </button>
                            ) : client.isActivated ? (
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                Aktif &amp; Siap Pakai
                              </span>
                            ) : (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={reorderingClientId === client.id}
                                  onClick={() => handleReorderClient(client)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer"
                                >
                                  {reorderingClientId === client.id ? "Membuat..." : "Buat Tagihan Baru"}
                                </button>
                                {canDeleteClient && (
                                  confirmRowAction?.kind === "delete" && confirmRowAction.id === client.id ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={deletingClientId === client.id}
                                        onClick={async () => {
                                          await handleDeletePartnerClient(client);
                                          setConfirmRowAction(null);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer"
                                      >
                                        {deletingClientId === client.id ? "..." : "Ya, Hapus"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRowAction(null)}
                                        className="px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 text-[11px] font-semibold cursor-pointer"
                                      >
                                        Tidak
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={deletingClientId === client.id}
                                      onClick={() => setConfirmRowAction({ kind: "delete", id: client.id })}
                                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-stone-500 hover:text-rose-700 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                                    >
                                      Hapus
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              {clientTransactions.length === 0
                ? "Belum ada transaksi dari klien yang Anda daftarkan. Transaksi akan muncul otomatis di sini saat klien melakukan checkout."
                : "Tidak ada transaksi yang cocok dengan pencarian/filter saat ini."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Invoice &amp; Paket</th>
                    <th className="py-3 px-4">Klien</th>
                    <th className="py-3 px-4 text-right">Harga Normal</th>
                    <th className="py-3 px-4 text-right">Potongan Mitra</th>
                    <th className="py-3 px-4 text-right">Total Dibayar</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <div className="font-medium text-stone-800">{formatDate(tx.createdAt)}</div>
                        {tx.paidAt && (
                          <div className="text-[10px] text-emerald-700">Lunas: {formatDate(tx.paidAt)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-stone-900 text-[11px]">{tx.invoiceNumber}</div>
                        <div className="text-[10px] text-stone-500">
                          {tx.planType} &middot; {tx.orderType}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{tx.clientName}</div>
                        <div className="text-[11px] text-stone-400">{tx.clientEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-500 whitespace-nowrap">
                        {formatRupiah(tx.baseAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {tx.discountAmount > 0 ? `- ${formatRupiah(tx.discountAmount)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                        {formatRupiah(tx.finalAmount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.status === "PENDING"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === "PAID"
                                ? "bg-emerald-600"
                                : tx.status === "PENDING"
                                  ? "bg-amber-600"
                                  : "bg-stone-400"
                            }`}
                          />
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50/90 border-t-2 border-stone-200 font-bold text-xs text-stone-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">
                      Total ({filteredTransactions.length} transaksi ditampilkan)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-600 whitespace-nowrap">
                      {formatRupiah(filteredTxTotalBase)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 whitespace-nowrap">
                      - {formatRupiah(filteredTxTotalDiscount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-stone-900 whitespace-nowrap">
                      {formatRupiah(filteredTxTotalFinal)}
                    </td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Legacy Historical Archive (Hanya tampil jika ada riwayat lama sebelum sistem potongan langsung) */}
        {(payouts.length > 0 || commissions.length > 0) && (
          <details className="bg-white rounded-2xl border border-[#eadecf] overflow-hidden">
            <summary className="px-5 py-4 cursor-pointer text-xs font-bold text-stone-600 hover:text-stone-900 select-none">
              Arsip Riwayat Transaksi Sebelumnya ({payouts.length} pencairan, {commissions.length} catatan lama)
            </summary>
            <div className="border-t border-stone-100 divide-y divide-stone-100">
              {payouts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-600">
                    <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="py-3 px-4">Tanggal Cair</th>
                        <th className="py-3 px-4">Metode &amp; Referensi</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right">Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payouts.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4 whitespace-nowrap">{formatDate(item.expenseDate)}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-stone-900">{formatPaymentSource(item.paymentSource)}</span>
                            {item.referenceNumber && <span className="ml-2 text-[11px] font-mono text-stone-500">Ref: {item.referenceNumber}</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {item.hasReceipt ? (
                              <a
                                href={`/api/partner/payouts/${item.id}/receipt`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                              >
                                Lihat Bukti
                              </a>
                            ) : (
                              <span className="text-[11px] text-stone-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        )}
    </>
  );
}
