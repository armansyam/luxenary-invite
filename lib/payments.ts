import axios from "axios";

export interface PaymentGateway {
  init(orderId: string, amount: number, appUrl?: string): Promise<{ checkoutUrl: string }>;
  verify(reference: string): Promise<{ status: "PAID" | "FAILED" }>;
}

export { MidtransGateway } from "@/lib/gateways/midtrans";
export { IPaymuGateway } from "@/lib/ipaymu";