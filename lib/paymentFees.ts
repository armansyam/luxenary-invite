import { prisma } from "@/lib/prisma";

export interface GatewayCharge {
  /** Nominal yang dikirim ke gateway: harga order, ditambah biaya layanan bila ditanggung pembeli (BUYER). */
  finalAmount: number;
  expiryMinutes: number;
}

/**
 * Satu-satunya tempat menghitung nominal tagihan gateway dan masa berlaku sesi dari AdminSetting.
 * Dipakai oleh checkout awal dan penerbitan ulang QRIS; keduanya wajib menagih nominal yang sama untuk order yang sama,
 * karena webhook memvalidasi pembayaran terhadap `Order.chargedAmount`.
 * Kegagalan membaca pengaturan dilempar ke pemanggil: menagih tanpa biaya layanan secara diam-diam merugikan merchant.
 */
export async function computeGatewayCharge(baseAmount: number): Promise<GatewayCharge> {
  const [feePayerSetting, feePercentSetting, expirySetting] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: "payment_fee_payer" } }),
    prisma.adminSetting.findUnique({ where: { key: "payment_gateway_fee_percent" } }),
    prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } }),
  ]);

  const feePayer = feePayerSetting?.value === "BUYER" ? "BUYER" : "MERCHANT";
  const feePercent = feePercentSetting && !isNaN(Number(feePercentSetting.value)) ? Number(feePercentSetting.value) : 0.7;

  const finalAmount = feePayer === "BUYER" ? baseAmount + Math.round(baseAmount * (feePercent / 100)) : baseAmount;

  const expiryMinutes =
    expirySetting && !isNaN(Number(expirySetting.value)) ? Math.max(5, Math.min(1440, Number(expirySetting.value))) : 60;

  return { finalAmount, expiryMinutes };
}
