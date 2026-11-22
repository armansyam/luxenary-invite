"use client";

export interface PartnerClientStats {
  totalClients: number;
  activeClients: number;
  pendingActivationClients: number;
  paidClientOrders: number;
  pendingClientOrders?: number;
  totalPaidNetAmount?: number;
  totalWholesaleSavings?: number;
}

export interface PartnerClientTransaction {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  planType: string;
  orderType: string;
  status: "PENDING" | "PAID" | "EXPIRED" | string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  promoCodeApplied: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PartnerInfo {
  id: string;
  name: string;
  vendorCategory?: string | null;
  email: string | null;
  phoneNumber: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountName: string | null;
  commissionType: "NOMINAL" | "PERCENT";
  commissionValue: number;
  pendingBalance: number;
  totalPaidOut: number;
  totalEarned: number;
  totalTransactions: number;
  clientStats?: PartnerClientStats;
}

export interface PartnerPackageOption {
  id: "TIER_1" | "TIER_2" | "TIER_3";
  name: string;
  desc: string;
  badge: string | null;
  isFeatured: boolean;
  basePrice: number;
  discountAmount: number;
  partnerPrice: number;
}

export interface PartnerPlatformConfig {
  name: string;
  paymentMode: "GATEWAY" | "MANUAL";
  feePercent: number;
  feePayer: "BUYER" | "MERCHANT";
  bank: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankInstructions: string;
  };
  packages: PartnerPackageOption[];
}

export interface ActivePaymentModalState {
  orderId: string;
  invoiceNumber: string;
  planType: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  chargedAmount: number | null;
  discountAmount: number;
  paymentMethod: "GATEWAY" | "MANUAL_TRANSFER" | string;
  status: "PENDING" | "PAID" | "EXPIRED" | string;
  qrString?: string | null;
  checkoutUrl?: string | null;
  expiryTimestamp?: number | null;
  hasProof?: boolean;
  rejectReason?: string | null;
  bank?: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankInstructions: string;
  };
}

export interface ProvisionedClient {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string;
  isActivated: boolean;
  hasPaidOrder?: boolean;
  invitationCount: number;
  activation: {
    expiresAt: string;
    consumedAt: string | null;
    emailSentAt: string | null;
    isExpired: boolean;
  } | null;
  latestOrder: {
    id: string;
    invoiceNumber: string;
    planType: string;
    orderType?: string;
    status: string;
    paymentMethod?: string;
    amount: number;
    discountAmount: number;
    hasProof?: boolean;
    rejectReason?: string | null;
    paidAt: string | null;
    expiredAt?: string | null;
  } | null;
}

export interface ActivationDeliveryResult {
  clientName: string;
  clientEmail: string;
  activationUrl: string;
  expiresAt: string;
  emailSent: boolean;
  emailError: string | null;
  whatsappText: string;
  whatsappUrl: string;
  reissued?: boolean;
}

export interface PartnerCommission {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  createdAt: string;
  order: {
    invoiceNumber: string | null;
    planType: string;
    amount: number;
    paidAt: string | null;
  } | null;
}

export interface PartnerPayout {
  id: string;
  amount: number;
  expenseDate: string;
  paymentSource: string;
  referenceNumber: string | null;
  notes: string | null;
  hasReceipt: boolean;
}

export function formatPaymentSource(source: string): string {
  switch (source) {
    case "E_WALLET":
      return "E-Wallet";
    case "TUNAI":
      return "Tunai";
    case "TRANSFER_BANK":
    default:
      return "Transfer Bank";
  }
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount || 0).toLocaleString("id-ID")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeWib(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;
}

export type PartnerAuthView = "login" | "activate" | "reset";

export function EyeToggleIcon({ shown }: { shown: boolean }) {
  return shown ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M9.88 5.09A10.45 10.45 0 0112 4.8c5 0 9.27 3.11 10.5 7.2a10.6 10.6 0 01-4.16 5.47M6.61 6.61A10.55 10.55 0 001.5 12c1.23 4.09 5.5 7.2 10.5 7.2 1.66 0 3.24-.34 4.66-.96" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

