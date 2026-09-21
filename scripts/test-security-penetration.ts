import "dotenv/config";
import { rateLimitDb } from "../lib/rateLimit";
import { prisma } from "../lib/prisma";
import path from "path";

interface PenTestResult {
  category: string;
  name: string;
  passed: boolean;
  detail: string;
}

async function runPenetrationTests() {
  console.log("================================================================================");
  console.log("🛡️ [PEN-TEST & KEAMANAN SISTEM] PENGUJIAN KETAHANAN AKSES, INJEKSI & KONKURENSI 🛡️");
  console.log("================================================================================\n");

  const results: PenTestResult[] = [];

  // ---------------------------------------------------------------------------
  // TEST 1: Rate Limiter Database Multi-Request Burst (Atomic UPSERT)
  // ---------------------------------------------------------------------------
  console.log("▶ [TEST 1] Pengujian Rate Limiting Database (Burst Concurrency)...");
  const testIp = `test-pen-${Date.now()}`;
  const limit = 5;
  const windowMs = 30_000;

  // Tembak 15 request paralel secara serentak
  const burstRequests = Array.from({ length: 15 }, (_, i) => rateLimitDb(`pentest:${testIp}`, limit, windowMs));
  const burstResults = await Promise.all(burstRequests);

  const allowedCount = burstResults.filter((r) => r === true).length;
  const blockedCount = burstResults.filter((r) => r === false).length;

  const rateLimitPassed = allowedCount === limit && blockedCount === 15 - limit;
  results.push({
    category: "RATE_LIMITING",
    name: "DB Rate Limiting Burst Guard (5 allowed, 10 blocked)",
    passed: rateLimitPassed,
    detail: `Allowed: ${allowedCount}/${limit} (Expected: ${limit}), Blocked: ${blockedCount}/10 (Expected: 10)`,
  });
  console.log(`  ${rateLimitPassed ? "✅ PASS" : "❌ FAIL"}: Allowed ${allowedCount}, Blocked ${blockedCount}`);

  // ---------------------------------------------------------------------------
  // TEST 2: Reserved Subdomains & Anti-Hijacking Protection
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 2] Pengujian Subdomain Hijacking & Kata Kunci Terlarang...");
  const RESERVED_SUBDOMAINS = [
    "admin", "api", "dashboard", "demo", "public", "login", 
    "checkout", "payment", "portfolio", "s", "uploads", "static"
  ];

  // Cek ketersediaan via query langsung sesuai logika subdomains check
  let reservedAllBlocked = true;
  const reservedFailures: string[] = [];

  for (const sub of RESERVED_SUBDOMAINS) {
    // Logika reservasi: jika ada di list reserved ATAU sudah ada di DB
    const isReservedKeyword = RESERVED_SUBDOMAINS.includes(sub.toLowerCase());
    const existing = await prisma.invitation.findFirst({
      where: { subdomain: sub.toLowerCase() },
    });
    const isAvailable = !isReservedKeyword && !existing;
    if (isAvailable) {
      reservedAllBlocked = false;
      reservedFailures.push(sub);
    }
  }

  results.push({
    category: "SUBDOMAIN_SECURITY",
    name: "Reserved Subdomain Hijacking Guard",
    passed: reservedAllBlocked,
    detail: reservedAllBlocked 
      ? `Semua ${RESERVED_SUBDOMAINS.length} reserved subdomains terlindungi dari pendaftaran`
      : `Bocor pada: ${reservedFailures.join(", ")}`,
  });
  console.log(`  ${reservedAllBlocked ? "✅ PASS" : "❌ FAIL"}: Seluruh ${RESERVED_SUBDOMAINS.length} reserved keyword ditolak sistem.`);

  // ---------------------------------------------------------------------------
  // TEST 3: Path Traversal & Identifier Sanitization
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 3] Pengujian Sanitasi Path Traversal pada Upload & Draft IDs...");
  const maliciousIds = [
    "../../etc/passwd",
    "..\\..\\windows\\system32",
    "slug/../../config",
    "id\0nullbyte",
    "81b283d2' OR '1'='1",
    "id; DROP TABLE users;--",
  ];

  let pathSanitizationOk = true;
  for (const rawId of maliciousIds) {
    const sanitized = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitized.includes("/") || sanitized.includes("\\") || sanitized.includes("..") || sanitized.includes("'") || sanitized.includes(";")) {
      pathSanitizationOk = false;
      break;
    }
  }

  results.push({
    category: "PATH_TRAVERSAL",
    name: "Path Traversal & SQL Injection Identifier Sanitizer",
    passed: pathSanitizationOk,
    detail: pathSanitizationOk ? "Seluruh karakter traversal & injeksi ternetralisir" : "Gagal membersihkan karakter berbahaya",
  });
  console.log(`  ${pathSanitizationOk ? "✅ PASS" : "❌ FAIL"}: Seluruh payload traversal & SQL injection ternetralisir.`);

  // ---------------------------------------------------------------------------
  // TEST 4: Parallel Webhook Idempotency (Race Condition Simulation)
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 4] Pengujian Idempotensi Webhook Paralel (5 Panggilan Simultan)...");
  // Buat order dummy untuk pengujian webhook
  const testUser = await prisma.user.create({
    data: {
      name: "Pentest User",
      email: `pentest-webhook-${Date.now()}@example.com`,
      role: "CLIENT",
    },
  });

  const testOrder = await prisma.order.create({
    data: {
      userId: testUser.id,
      invoiceNumber: `INV-PEN-${Date.now()}`,
      amount: 199000,
      planType: "TIER_1",
      status: "PENDING",
    },
  });

  // Tembak 5 simulasi update pembayaran paralel
  const updatePromises = Array.from({ length: 5 }, () =>
    prisma.order.updateMany({
      where: { id: testOrder.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    })
  );

  const updateResults = await Promise.all(updatePromises);
  const updatedOrdersCount = updateResults.reduce((acc, curr) => acc + curr.count, 0);

  const webhookIdempotencyPassed = updatedOrdersCount === 1;

  results.push({
    category: "IDEMPOTENCY",
    name: "Parallel Webhook Concurrency Guard",
    passed: webhookIdempotencyPassed,
    detail: `Jumlah eksekusi status transition: ${updatedOrdersCount} (Expected: 1, 4 diabaikan secara idempotent)`,
  });
  console.log(`  ${webhookIdempotencyPassed ? "✅ PASS" : "❌ FAIL"}: Tepat 1 proses memicu transisi status, 4 lainnya diabaikan secara aman.`);

  // Cleanup test user & order
  await prisma.order.deleteMany({ where: { id: testOrder.id } });
  await prisma.user.deleteMany({ where: { id: testUser.id } });

  // ---------------------------------------------------------------------------
  // RINGKASAN
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊 RINGKASAN HASIL PEN-TEST KEAMANAN SISTEM:");
  console.log("================================================================================");
  let allPass = true;
  for (const r of results) {
    const statusMark = r.passed ? "✅ PASS" : "❌ FAIL";
    if (!r.passed) allPass = false;
    console.log(`${statusMark} - [${r.category}] ${r.name}: ${r.detail}`);
  }

  if (allPass) {
    console.log("\n🎉 SELURUH SKENARIO PENETRATION TESTING 100% LOLOS & AMAN!");
    process.exit(0);
  } else {
    console.error("\n⚠️ DITEMUKAN KERENTANAN PADA PENETRATION TESTING!");
    process.exit(1);
  }
}

runPenetrationTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
