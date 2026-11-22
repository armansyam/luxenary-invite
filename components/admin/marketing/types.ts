export interface PartnerAffiliate {
  id: string;
  name: string;
  vendorCategory: string | null;
  phoneNumber: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  commissionType: "PERCENT" | "NOMINAL";
  commissionValue: number;
  pendingBalance: number;
  totalPaidOut: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  _count?: {
    coupons: number;
    commissions: number;
    provisionedClients?: number;
  };
}

export interface PromoCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "NOMINAL" | "PERCENT";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  quotaLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  applicablePlans: string[];
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  partnerId: string | null;
  partner?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    holds: number;
    orders: number;
  };
  createdAt: string;
}

export interface AffiliateCommission {
  id: string;
  partnerId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "PENDING" | "PAID";
  payoutExpenseId: string | null;
  paidAt: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    bankName: string | null;
    accountNumber: string | null;
  };
  order: {
    id: string;
    invoiceNumber: string;
    planType: string;
    status: string;
    paidAt: string | null;
  };
}

export interface PartnerPayoutRecord {
  id: string;
  amount: number;
  expenseDate: string;
  paymentSource: string | null;
  referenceNumber: string | null;
  notes: string | null;
  hasReceipt: boolean;
  partnerAffiliateId: string | null;
  partner: {
    id: string;
    name: string;
    email: string | null;
    bankName: string | null;
    accountNumber: string | null;
  } | null;
}

export function formatPayoutMethod(source: string | null): string {
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

// <input type="datetime-local"> reads and writes wall-clock time in the browser's zone; toISOString() is UTC.
