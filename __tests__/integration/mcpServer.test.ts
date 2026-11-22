import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { hasAdminPermission, SUPER_ADMIN_ONLY_MODULE_IDS } from "@/lib/adminPermissions";
import { generateMcpApiKey, hashMcpApiKey } from "@/lib/mcp/auth";
import { GET as mcpGet, POST as mcpPost } from "@/app/api/mcp/route";

function makeMcpReq(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": "127.0.0.99",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("Remote MCP Server (/api/mcp) — Auth, RBAC, Tools, Resources & Rate Limit", () => {
  const createdKeyIds: string[] = [];
  let prevMcpEnabled: string | null = null;
  let prevMcpRate: string | null = null;

  let contentToken = "";
  let financeToken = "";
  let supportToken = "";
  let pausedToken = "";
  let revokedToken = "";
  let expiredToken = "";

  beforeAll(async () => {
    const [enRow, rateRow] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: "mcp_enabled" } }),
      prisma.adminSetting.findUnique({ where: { key: "mcp_rate_limit_per_min" } }),
    ]);
    prevMcpEnabled = enRow?.value ?? null;
    prevMcpRate = rateRow?.value ?? null;

    await prisma.adminSetting.upsert({
      where: { key: "mcp_enabled" },
      update: { value: "true" },
      create: { key: "mcp_enabled", value: "true", label: "MCP Enabled", group: "mcp" },
    });
    await prisma.adminSetting.upsert({
      where: { key: "mcp_rate_limit_per_min" },
      update: { value: "120" },
      create: { key: "mcp_rate_limit_per_min", value: "120", label: "MCP Rate Limit", group: "mcp" },
    });
    invalidateSettingsCache();

    const makeKey = async (
      name: string,
      department: string,
      scopes: string[],
      extra?: { isActive?: boolean; revokedAt?: Date; expiresAt?: Date }
    ) => {
      const gen = generateMcpApiKey();
      const row = await prisma.mcpApiKey.create({
        data: {
          name,
          department,
          keyPrefix: gen.keyPrefix,
          keyHash: gen.keyHash,
          scopes,
          isActive: extra?.isActive ?? true,
          revokedAt: extra?.revokedAt ?? null,
          expiresAt: extra?.expiresAt ?? null,
        },
      });
      createdKeyIds.push(row.id);
      return gen.rawKey;
    };

    contentToken = await makeKey("Test Dept 1 Content", "DEPT_1_CONTENT", [
      "docs:read",
      "catalog:read",
    ]);
    financeToken = await makeKey("Test Dept 6 Finance", "DEPT_6_FINANCE", [
      "docs:read",
      "finance:read",
      "ops:read",
    ]);
    supportToken = await makeKey("Test Dept 4 Support", "DEPT_4_SUPPORT", ["support:read"]);
    pausedToken = await makeKey("Test Paused Key", "GENERAL", ["docs:read"], { isActive: false });
    revokedToken = await makeKey("Test Revoked Key", "GENERAL", ["docs:read"], {
      isActive: false,
      revokedAt: new Date(),
    });
    expiredToken = await makeKey("Test Expired Key", "GENERAL", ["docs:read"], {
      expiresAt: new Date(Date.now() - 60_000),
    });
  });

  afterAll(async () => {
    if (createdKeyIds.length) {
      await prisma.rateLimitCounter.deleteMany({
        where: { key: { in: createdKeyIds.map((id) => `mcp:${id}`) } },
      });
      await prisma.adminAuditLog.deleteMany({
        where: {
          adminLabel: { startsWith: "MCP:Test " },
        },
      });
      await prisma.mcpApiKey.deleteMany({ where: { id: { in: createdKeyIds } } });
    }
    if (prevMcpEnabled !== null) {
      await prisma.adminSetting.update({
        where: { key: "mcp_enabled" },
        data: { value: prevMcpEnabled },
      });
    }
    if (prevMcpRate !== null) {
      await prisma.adminSetting.update({
        where: { key: "mcp_rate_limit_per_min" },
        data: { value: prevMcpRate },
      });
    }
    invalidateSettingsCache();
  });

  it("modul admin 'mcp' terkunci mutlak hanya untuk SUPER_ADMIN", () => {
    expect(SUPER_ADMIN_ONLY_MODULE_IDS).toContain("mcp");
    expect(hasAdminPermission({ role: "SUPER_ADMIN", isAdmin: true }, "mcp")).toBe(true);
    expect(hasAdminPermission({ role: "ADMIN", isAdmin: true, permissions: ["mcp"] }, "mcp")).toBe(false);
    expect(hasAdminPermission({ role: "FINANCE", isAdmin: true, permissions: ["mcp"] }, "mcp")).toBe(false);
    expect(hasAdminPermission({ role: "SUPPORT", isAdmin: true, permissions: ["mcp"] }, "mcp")).toBe(false);
  });

  it("generateMcpApiKey menghasilkan prefix lux_mcp_ dan hash SHA-256 deterministik", () => {
    const k = generateMcpApiKey();
    expect(k.rawKey.startsWith("lux_mcp_")).toBe(true);
    expect(k.keyPrefix).toBe(k.rawKey.slice(0, 16));
    expect(k.keyHash).toBe(hashMcpApiKey(k.rawKey));
    expect(k.keyHash).not.toBe(k.rawKey);
  });

  it("GET /api/mcp membalas 405 Method Not Allowed dengan Allow: POST", async () => {
    const res = await mcpGet();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("menolak request tanpa token (401), token salah (401), dijeda/dicabut/kedaluwarsa (403)", async () => {
    const body = { jsonrpc: "2.0", id: 1, method: "ping" };
    expect((await mcpPost(makeMcpReq(body))).status).toBe(401);
    expect((await mcpPost(makeMcpReq(body, "lux_mcp_00000000000000000000000000000000"))).status).toBe(401);
    expect((await mcpPost(makeMcpReq(body, pausedToken))).status).toBe(403);
    expect((await mcpPost(makeMcpReq(body, revokedToken))).status).toBe(403);
    expect((await mcpPost(makeMcpReq(body, expiredToken))).status).toBe(403);
  });

  it("handshake initialize, notification 202, dan batch JSON-RPC bekerja standar", async () => {
    const initRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
        contentToken
      )
    );
    expect(initRes.status).toBe(200);
    const initJson = await initRes.json();
    expect(initJson.result.serverInfo.name).toBe("luxvite-server-mcp");
    expect(initJson.result.protocolVersion).toBe("2025-03-26");

    const notifRes = await mcpPost(
      makeMcpReq({ jsonrpc: "2.0", method: "notifications/initialized" }, contentToken)
    );
    expect(notifRes.status).toBe(202);

    const batchRes = await mcpPost(
      makeMcpReq(
        [
          { jsonrpc: "2.0", id: "a", method: "ping" },
          { jsonrpc: "2.0", id: "b", method: "tools/list" },
        ],
        contentToken
      )
    );
    expect(batchRes.status).toBe(200);
    const batchJson = await batchRes.json();
    expect(Array.isArray(batchJson)).toBe(true);
    expect(batchJson).toHaveLength(2);
  });

  it("isolasi scope ketat: Dept 1 Content hanya melihat tool catalog, bisa baca docs, ditolak dari finance & ops:write", async () => {
    const listRes = await mcpPost(
      makeMcpReq({ jsonrpc: "2.0", id: 10, method: "tools/list" }, contentToken)
    );
    const listJson = await listRes.json();
    const names = listJson.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("luxvite_list_themes_catalog");
    expect(names).toContain("luxvite_get_packages_and_settings");
    expect(names).not.toContain("luxvite_get_finance_report");
    expect(names).not.toContain("luxvite_purge_cache");

    // Baca resource dokumentasi resmi
    const docRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 11, method: "resources/read", params: { uri: "luxvite://docs/index" } },
        contentToken
      )
    );
    const docJson = await docRes.json();
    expect(docJson.result.contents[0].text).toContain("GROUND TRUTH");

    // Blokir path traversal / URI di luar allowlist
    const badDocRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 12, method: "resources/read", params: { uri: "luxvite://docs/../../.env" } },
        contentToken
      )
    );
    expect((await badDocRes.json()).error.code).toBe(-32002);

    // Panggil tool finance -> wajib ditolak -32003
    const deniedFin = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "luxvite_get_finance_report", arguments: {} } },
        contentToken
      )
    );
    expect((await deniedFin.json()).error.code).toBe(-32003);
  });

  it("Dept 6 Finance dapat membaca laporan keuangan lengkap & KPI non-finansial, namun ditolak dari ops:write", async () => {
    const finRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "luxvite_get_finance_report", arguments: {} } },
        financeToken
      )
    );
    const finJson = await finRes.json();
    expect(finJson.result.isError).toBe(false);
    const report = JSON.parse(finJson.result.content[0].text);
    expect(report).toHaveProperty("summary.grossRevenue");
    expect(report).toHaveProperty("summary.estimatedPphFinal05");
    expect(report).toHaveProperty("summary.marginHealth");
    expect(report).toHaveProperty("pendingReconciliation.items");
    expect(report).toHaveProperty("recurringCommitments.estimatedMonthlyTotal");

    const kpiRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 21, method: "tools/call", params: { name: "luxvite_get_business_kpi_report", arguments: { days: 30 } } },
        financeToken
      )
    );
    const kpiJson = await kpiRes.json();
    expect(kpiJson.result.isError).toBe(false);
    const kpi = JSON.parse(kpiJson.result.content[0].text);
    expect(kpi).toHaveProperty("users.total");
    expect(kpi).toHaveProperty("invitations.byEventType");
    expect(kpi).toHaveProperty("themes.activeInCatalog");

    const deniedWrite = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 22, method: "tools/call", params: { name: "luxvite_purge_cache", arguments: {} } },
        financeToken
      )
    );
    expect((await deniedWrite.json()).error.code).toBe(-32003);
  });

  it("Dept 4 Support dapat mencari undangan tanpa membocorkan staffPin/passwordHash dan ditolak baca docs tanpa scope docs:read", async () => {
    const searchRes = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 30, method: "tools/call", params: { name: "luxvite_search_invitations", arguments: { limit: 5 } } },
        supportToken
      )
    );
    const searchJson = await searchRes.json();
    expect(searchJson.result.isError).toBe(false);
    const rawText = searchJson.result.content[0].text;
    expect(rawText).not.toContain("staffPin");
    expect(rawText).not.toContain("passwordHash");

    const deniedDoc = await mcpPost(
      makeMcpReq(
        { jsonrpc: "2.0", id: 31, method: "resources/read", params: { uri: "luxvite://docs/index" } },
        supportToken
      )
    );
    expect((await deniedDoc.json()).error.code).toBe(-32003);
  });

  it("kill-switch mcp_enabled=false membalas 503 dan rate limit per kunci membalas 429", async () => {
    // Uji kill-switch
    await prisma.adminSetting.update({ where: { key: "mcp_enabled" }, data: { value: "false" } });
    invalidateSettingsCache();
    const disabledRes = await mcpPost(
      makeMcpReq({ jsonrpc: "2.0", id: 40, method: "ping" }, contentToken)
    );
    expect(disabledRes.status).toBe(503);

    // Aktifkan kembali dengan batas 2 req/menit pada kunci baru khusus uji rate limit
    await prisma.adminSetting.update({ where: { key: "mcp_enabled" }, data: { value: "true" } });
    await prisma.adminSetting.update({ where: { key: "mcp_rate_limit_per_min" }, data: { value: "2" } });
    invalidateSettingsCache();

    const gen = generateMcpApiKey();
    const rlRow = await prisma.mcpApiKey.create({
      data: {
        name: "Test RateLimit Key",
        department: "GENERAL",
        keyPrefix: gen.keyPrefix,
        keyHash: gen.keyHash,
        scopes: ["docs:read"],
      },
    });
    createdKeyIds.push(rlRow.id);

    expect((await mcpPost(makeMcpReq({ jsonrpc: "2.0", id: 41, method: "ping" }, gen.rawKey))).status).toBe(200);
    expect((await mcpPost(makeMcpReq({ jsonrpc: "2.0", id: 42, method: "ping" }, gen.rawKey))).status).toBe(200);
    expect((await mcpPost(makeMcpReq({ jsonrpc: "2.0", id: 43, method: "ping" }, gen.rawKey))).status).toBe(429);

    // Pulihkan rate limit normal
    await prisma.adminSetting.update({ where: { key: "mcp_rate_limit_per_min" }, data: { value: "120" } });
    invalidateSettingsCache();

    // Verifikasi audit trail tercatat di admin_audit_logs
    const auditCount = await prisma.adminAuditLog.count({
      where: {
        action: { in: ["MCP_TOOL_CALL", "MCP_RESOURCE_READ", "MCP_SCOPE_DENIED"] },
        adminLabel: { startsWith: "MCP:Test " },
      },
    });
    expect(auditCount).toBeGreaterThanOrEqual(4);
  });
});
