/**
 * Nominal tagihan gateway dihitung di satu tempat: checkout awal dan penerbitan ulang QRIS wajib menagih
 * nominal yang sama (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, pool } from "@/lib/prisma";
import { computeGatewayCharge } from "@/lib/paymentFees";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const KEYS = ["payment_fee_payer", "payment_gateway_fee_payer", "payment_gateway_fee_percent", "payment_fee_rate", "payment_expiry_minutes"];
const previous = new Map<string, string | null>();

async function setSettings(values: Record<string, string | null>) {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined || value === null) await prisma.adminSetting.deleteMany({ where: { key } });
    else await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, label: key, group: "payment" } });
  }
}

describe.skipIf(!IS_TEST_DB)("computeGatewayCharge", () => {
  beforeAll(async () => {
    for (const key of KEYS) previous.set(key, (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null);
  });

  afterAll(async () => {
    await setSettings(Object.fromEntries(previous));
    await prisma.$disconnect();
    await pool.end();
  });

  it("MERCHANT menanggung biaya: nominal sama dengan harga order", async () => {
    await setSettings({ payment_fee_payer: "MERCHANT" });
    expect((await computeGatewayCharge(100000)).finalAmount).toBe(100000);
  });

  it("BUYER menanggung biaya: persen dari pengaturan ditambahkan dan dibulatkan", async () => {
    await setSettings({ payment_fee_payer: "BUYER", payment_gateway_fee_percent: "0.7" });
    expect((await computeGatewayCharge(100000)).finalAmount).toBe(100700);
  });

  it("BUYER tanpa persen eksplisit memakai bawaan 0,7 persen", async () => {
    await setSettings({ payment_fee_payer: "BUYER" });
    expect((await computeGatewayCharge(250000)).finalAmount).toBe(251750);
  });

  it("masa berlaku dibatasi 5 sampai 1440 menit dan bawaan 60 menit", async () => {
    await setSettings({});
    expect((await computeGatewayCharge(1000)).expiryMinutes).toBe(60);
    await setSettings({ payment_expiry_minutes: "1" });
    expect((await computeGatewayCharge(1000)).expiryMinutes).toBe(5);
    await setSettings({ payment_expiry_minutes: "99999" });
    expect((await computeGatewayCharge(1000)).expiryMinutes).toBe(1440);
    await setSettings({ payment_expiry_minutes: "30" });
    expect((await computeGatewayCharge(1000)).expiryMinutes).toBe(30);
  });
});
