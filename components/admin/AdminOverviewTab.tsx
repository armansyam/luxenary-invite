"use client";

import { getInvitationPublicUrl } from "@/lib/domainUtils";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    EXPIRED: "bg-gray-100 text-gray-600 border border-gray-200",
    PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    EVENT_FINISHED: "bg-purple-50 text-purple-700 border border-purple-200",
    DRAFT: "bg-amber-50 text-amber-700 border border-amber-200",
    TAKEN_DOWN: "bg-rose-50 text-rose-700 border border-rose-200",
    ARCHIVED: "bg-stone-100 text-stone-600 border border-stone-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "EVENT_FINISHED" ? "Galeri Momen" : status}
    </span>
  );
};

interface AdminOverviewTabProps {
  settingsMap: Record<string, string>;
  stats: any;
  orders: any[];
  allOrders: any[];
  invitations: any[];
  themes: any[];
  logs: any[];
  snapshots: any[];
  backupPathInfo: any;
  loading: boolean;
  creatingSnapshot: boolean;
  onRefresh: () => void;
  onCreateSnapshot: () => void;
  onSelectTab: (tab: string) => void;
}

export default function AdminOverviewTab({
  settingsMap,
  stats,
  orders,
  allOrders,
  invitations,
  themes,
  logs,
  snapshots,
  backupPathInfo,
  loading,
  creatingSnapshot,
  onRefresh,
  onCreateSnapshot,
  onSelectTab,
}: AdminOverviewTabProps) {
  const orderList = allOrders.length > 0 ? allOrders : orders;
  const totalRevenue = orderList.filter((o) => o.status === "PAID").reduce((sum, o) => sum + Number(o.amount), 0);
  const totalPending = orderList.filter((o) => o.status === "PENDING").reduce((sum, o) => sum + Number(o.amount), 0);
  const paidCount = orderList.filter((o) => o.status === "PAID").length;
  const pendingCount = orderList.filter((o) => o.status === "PENDING").length;
  const totalOrdersCount = orderList.length;
  const conversionRate = totalOrdersCount > 0 ? Math.round((paidCount / totalOrdersCount) * 100) : 0;

  const tier1Orders = orderList.filter((o) => o.planType === "TIER_1" && o.status === "PAID");
  const tier2Orders = orderList.filter((o) => o.planType === "TIER_2" && o.status === "PAID");
  const tier3Orders = orderList.filter((o) => o.planType === "TIER_3" && o.status === "PAID");

  const tier1Rev = tier1Orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const tier2Rev = tier2Orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const tier3Rev = tier3Orders.reduce((sum, o) => sum + Number(o.amount), 0);

  const themeUsageMap: Record<string, number> = {};
  invitations.forEach((inv) => {
    const t = inv.themeId || "kalandra";
    themeUsageMap[t] = (themeUsageMap[t] || 0) + 1;
  });
  const sortedThemeUsage = Object.entries(themeUsageMap)
    .map(([themeId, count]) => {
      const match = themes.find((th) => th.id === themeId);
      return {
        themeId,
        name: match?.name || themeId,
        category: match?.category || "modern",
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & Quick Shortcuts */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xs">
        <div>
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Pusat Kendali Administrator</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            <span className="sm:hidden">Ringkasan</span>
            <span className="hidden sm:inline">{settingsMap["platform_name"] ? `${settingsMap["platform_name"]} Executive Dashboard` : "Executive Dashboard"}</span>
          </h2>
          <p className="hidden sm:block text-sm text-gray-500 mt-0.5">
            Ringkasan performa finansial, analitik paket, aktivitas mempelai &amp; status operasional sistem.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0 [&>button]:justify-center [&>button]:min-h-11 sm:[&>button]:min-h-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Segarkan data ringkasan"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? "Menyegarkan..." : "Segarkan Data"}</span>
          </button>

          <button
            type="button"
            onClick={onCreateSnapshot}
            disabled={creatingSnapshot}
            className="px-3.5 py-2 bg-gray-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span>{creatingSnapshot ? "Snapshotting..." : "+ Snapshot DB"}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("themes")}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Kelola Tema</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("settings")}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Unified KPI + Operational Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* DESKTOP (lg+): Horizontal 4-col */}
        <div className="hidden lg:grid grid-cols-4 divide-x divide-gray-100">
          <div className="px-6 py-5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pendapatan Lunas</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(stats.conversionRate ?? conversionRate) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                {stats.conversionRate ?? conversionRate}% konversi
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 tracking-tight">Rp {totalRevenue.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-gray-400">{paidCount} lunas · {stats.pendingOrderCount ?? pendingCount} pending</p>
          </div>

          <div className="px-5 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Menunggu Bayar</p>
              <p className="text-lg font-bold text-amber-700 tracking-tight">Rp {totalPending.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice aktif</p>
            </div>
          </div>

          <div className="px-5 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Klien</p>
              <p className="text-lg font-bold text-sky-700 tracking-tight">
                {stats.paidUserCount ?? 0}<span className="text-[11px] font-normal text-gray-400 ml-1">bayar</span>
                <span className="text-gray-300 mx-1.5">/</span>
                <span className="text-gray-500 text-base">{stats.userCount || 0}</span><span className="text-[11px] font-normal text-gray-400 ml-1">total</span>
              </p>
              <p className="text-[10px] text-gray-400">
                {(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar
                {(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1.5 text-emerald-600 font-semibold">+{stats.newRegistrationsToday} hari ini</span>}
              </p>
            </div>
          </div>

          <div className="px-5 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Tamu Terdaftar</p>
              <p className="text-lg font-bold text-blue-700 tracking-tight">{stats.guestCount || 0}<span className="text-[11px] font-normal text-gray-400 ml-1">tamu</span></p>
              <p className="text-[10px] text-gray-400">
                {stats.rsvpCount || 0} RSVP · <span className={stats.guestCount > 0 ? "text-blue-600 font-semibold" : ""}>{stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</span>
              </p>
            </div>
          </div>
        </div>

        {/* TABLET (md-lg): 2x2 grid */}
        <div className="hidden md:grid lg:hidden grid-cols-2 divide-x divide-y divide-gray-100">
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">Rp</div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Pendapatan · <span className={`font-bold ${(stats.conversionRate ?? conversionRate) > 0 ? "text-emerald-600" : "text-gray-400"}`}>{stats.conversionRate ?? conversionRate}% konversi</span></p>
              <p className="text-lg font-bold text-emerald-700 truncate">Rp {totalRevenue.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-gray-400">{paidCount} lunas · {stats.pendingOrderCount ?? pendingCount} pending</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Menunggu Bayar</p>
              <p className="text-lg font-bold text-amber-700 truncate">Rp {totalPending.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Klien</p>
              <p className="text-lg font-bold text-sky-700">{stats.paidUserCount ?? 0}<span className="text-gray-300 mx-1">/</span><span className="text-gray-500">{stats.userCount || 0}</span></p>
              <p className="text-[10px] text-gray-400">{(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar{(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1 text-emerald-600 font-semibold">+{stats.newRegistrationsToday}</span>}</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium">Tamu</p>
              <p className="text-lg font-bold text-blue-700">{stats.guestCount || 0}<span className="text-[11px] font-normal text-gray-400 ml-1">tamu</span></p>
              <p className="text-[10px] text-gray-400">{stats.rsvpCount || 0} RSVP · <span className={stats.guestCount > 0 ? "text-blue-600 font-semibold" : ""}>{stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</span></p>
            </div>
          </div>
        </div>

        {/* MOBILE (<md) */}
        <div className="block md:hidden divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">Rp</div>
              <span className="text-xs text-gray-600 font-medium">Pendapatan</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-700">Rp {totalRevenue.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-gray-400">{paidCount} lunas · {stats.conversionRate ?? conversionRate}% konversi</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-xs text-gray-600 font-medium">Menunggu Bayar</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-700">Rp {totalPending.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-gray-400">{stats.pendingOrderCount ?? pendingCount} invoice</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <span className="text-xs text-gray-600 font-medium">Klien</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-sky-700">{stats.paidUserCount ?? 0}<span className="text-gray-400 font-normal text-xs"> / {stats.userCount || 0} total</span></p>
              <p className="text-[10px] text-gray-400">{(stats.userCount || 0) - (stats.paidUserCount ?? 0)} belum bayar{(stats.newRegistrationsToday ?? 0) > 0 && <span className="ml-1 text-emerald-600 font-semibold">+{stats.newRegistrationsToday}</span>}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <span className="text-xs text-gray-600 font-medium">Tamu</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-700">{stats.guestCount || 0} tamu</p>
              <p className="text-[10px] text-gray-400">{stats.rsvpCount || 0} RSVP · {stats.guestCount > 0 ? Math.round((stats.rsvpCount / stats.guestCount) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        {/* Operational Pulse Strip */}
        <div className="border-t border-gray-100 bg-gray-50/60">
          <div className="hidden sm:grid grid-cols-3 divide-x divide-gray-200">
            <div className="flex items-start gap-2.5 px-5 py-3">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Undangan <span className="text-gray-400">({stats.invitationCount || 0})</span></p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{stats.publishedInvitationCount || 0} Live</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{stats.draftInvitationCount || 0} Draft</span>
                  {(stats.staleDraftCount ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded" title={`Draf yang tidak diubah lebih dari ${stats.staleDraftDays} hari; tidak dihapus otomatis karena klien sudah membayar`}>
                      {stats.staleDraftCount} Draft &gt;{stats.staleDraftDays} hari
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">{stats.eventFinishedCount ?? 0} Selesai</span>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{stats.archivedCount ?? 0} Arsip</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-3">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${(stats.eventTodayCount ?? 0) > 0 ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                Hari-H: <span className={`font-bold ${(stats.eventTodayCount ?? 0) > 0 ? "text-rose-600" : "text-gray-400"}`}>{stats.eventTodayCount ?? 0} hari ini</span>
                <span className="text-gray-400 font-normal"> · {stats.eventThisWeekCount ?? 0} minggu · {stats.eventThisMonthCount ?? 0} bln</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-3">
              <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                Klien baru: <span className="font-bold text-teal-700">{stats.newRegistrationsToday ?? 0}</span> hari ini
                <button className="ml-2 text-teal-700 font-semibold hover:underline cursor-pointer" onClick={() => onSelectTab("users")}>Lihat</button>
              </span>
            </div>
          </div>
          <div className="block sm:hidden divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-gray-500 font-medium">Undangan</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{stats.publishedInvitationCount || 0} Live</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{stats.draftInvitationCount || 0} Draft</span>
                {(stats.staleDraftCount ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{stats.staleDraftCount} &gt;{stats.staleDraftDays}h</span>
                )}
                <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{(stats.eventFinishedCount ?? 0) + (stats.archivedCount ?? 0)} lainnya</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-gray-500 font-medium">Hari-H Acara</span>
              <span className={`text-[11px] font-bold ${(stats.eventTodayCount ?? 0) > 0 ? "text-rose-600" : "text-gray-400"}`}>
                {stats.eventTodayCount ?? 0} hari ini · {stats.eventThisWeekCount ?? 0} minggu
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-gray-500 font-medium">Klien Baru</span>
              <span className="text-[11px] font-bold text-teal-700">{stats.newRegistrationsToday ?? 0} hari ini</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Distribusi Penjualan per Paket</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pendapatan dan volume transaksi lunas berdasarkan tier paket</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("orders")}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
            >
              Lihat Detail
            </button>
          </div>

          <div className="space-y-4 pt-1">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 uppercase tracking-wide">
                  Tier 1 • {settingsMap["name_tier1"] || "Serenade"}
                </span>
                <span className="font-bold text-gray-900">Rp {tier1Rev.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-700 h-full rounded-full transition-all duration-500" style={{ width: `${paidCount > 0 ? (tier1Orders.length / paidCount) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{tier1Orders.length} order lunas</span>
                <span>{paidCount > 0 ? Math.round((tier1Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide">
                  Tier 2 • {settingsMap["name_tier2"] || "Symphony"}
                </span>
                <span className="font-bold text-gray-900">Rp {tier2Rev.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-700 h-full rounded-full transition-all duration-500" style={{ width: `${paidCount > 0 ? (tier2Orders.length / paidCount) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{tier2Orders.length} order lunas</span>
                <span>{paidCount > 0 ? Math.round((tier2Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
              </div>
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 uppercase tracking-wide">
                  Tier 3 • {settingsMap["name_tier3"] || "Eternity"}
                </span>
                <span className="font-bold text-gray-900">Rp {tier3Rev.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-700 h-full rounded-full transition-all duration-500" style={{ width: `${paidCount > 0 ? (tier3Orders.length / paidCount) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{tier3Orders.length} order lunas</span>
                <span>{paidCount > 0 ? Math.round((tier3Orders.length / paidCount) * 100) : 0}% dari total penjualan</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Popularitas Tema Pilihan Mempelai</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ranking tema pada {invitations.length} undangan terbaru</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("themes")}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
            >
              Katalog Tema
            </button>
          </div>

          {sortedThemeUsage.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-xs">
              Belum ada data penggunaan tema oleh mempelai.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {sortedThemeUsage.slice(0, 4).map((item, idx) => {
                const pct = invitations.length > 0 ? Math.round((item.count / invitations.length) * 100) : 0;
                return (
                  <div key={item.themeId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-gray-900 text-xs">{item.name}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-gray-900 font-mono">
                        {item.count} Undangan ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                <span className="sm:hidden">Undangan Terbaru</span>
                <span className="hidden sm:inline">Undangan Mempelai Terkini</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("invitations")}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer whitespace-nowrap"
            >
              Lihat Semua ({stats.invitationCount || 0})
            </button>
          </div>

          {invitations.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">Belum ada undangan dibuat</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {invitations.slice(0, 5).map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {resolveInvitationDisplayName(inv)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="hidden sm:inline text-[11px] text-gray-500 font-mono">/{inv.invitationSlug}</span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 uppercase">
                        {inv.themeId}
                      </span>
                      {inv.eventType && inv.eventType !== "WEDDING" && (
                        <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                          {inv.eventType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={inv.status} />
                    <a
                      href={inv.subdomain ? getInvitationPublicUrl(inv.subdomain) : `/${inv.invitationSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-gray-400 hover:text-amber-800 hover:bg-gray-100 rounded-lg transition"
                      title="Pratinjau Undangan Langsung"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                <span className="sm:hidden">Transaksi Terbaru</span>
                <span className="hidden sm:inline">Aktivitas Transaksi Pembayaran</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("orders")}
              className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer whitespace-nowrap"
            >
              Lihat Semua ({stats.orderCount ?? orderList.length})
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">Belum ada transaksi terekam</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-gray-800 truncate">{ord.invoiceNumber}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{ord.user?.name || ord.user?.email || "Klien"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-gray-900 font-mono">
                      Rp {Number(ord.amount).toLocaleString("id-ID")}
                    </p>
                    <div className="mt-0.5">
                      <StatusBadge status={ord.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Status & Shortcuts */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">Database &amp; Snapshot</span>
          </div>
          <p className="text-xs text-gray-500">
            {backupPathInfo
              ? <>{snapshots.length} snapshot tersimpan di <code>{backupPathInfo.resolvedPath}</code>.</>
              : "Buka tab Database untuk melihat daftar snapshot dan lokasi backup."}
          </p>
          <button
            type="button"
            onClick={() => onSelectTab("database")}
            className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Kelola Database &amp; Snapshot</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">Monitoring Webhook</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
              {logs.length} Log
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Status webhook payment gateway &amp; event listener aktif.
          </p>
          <button
            type="button"
            onClick={() => onSelectTab("logs")}
            className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Log Monitoring</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">Koleksi Desain Tema</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
              {themes.filter((t) => t.isActive).length} Aktif
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Katalog tema Traditional, Modern, dan Minimalist siap pakai.
          </p>
          <button
            type="button"
            onClick={() => onSelectTab("themes")}
            className="mt-3 text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Atur Katalog &amp; Sinkronisasi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
