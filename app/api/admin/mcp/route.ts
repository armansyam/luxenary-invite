import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { invalidateSettingsCache } from "@/lib/settings";
import { resolvePublicAppOrigin } from "@/lib/domainUtils";
import { getClientIp } from "@/lib/rateLimit";
import {
  MCP_DEPARTMENT_PRESETS,
  MCP_PROTOCOL_VERSION,
  MCP_SCOPE_DEFINITIONS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  VALID_MCP_SCOPES,
  normalizeMcpScopes,
} from "@/lib/mcp/constants";
import { generateMcpApiKey, getMcpRuntimeConfig } from "@/lib/mcp/auth";
import { handleMcpJsonRpc } from "@/lib/mcp/protocol";
import { listMcpDocResources } from "@/lib/mcp/resources";
import { listToolsCatalogSummary } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("mcp");
    if (!guard.ok) return guard.response;

    const [runtimeConfig, keys, recentLogs] = await Promise.all([
      getMcpRuntimeConfig(),
      prisma.mcpApiKey.findMany({
        orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          department: true,
          keyPrefix: true,
          scopes: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          usageCount: true,
          createdByLabel: true,
          revokedAt: true,
          createdAt: true,
        },
      }),
      prisma.adminAuditLog.findMany({
        where: {
          action: {
            in: [
              "MCP_TOOL_CALL",
              "MCP_RESOURCE_READ",
              "MCP_SCOPE_DENIED",
              "MCP_KEY_CREATE",
              "MCP_KEY_UPDATE",
              "MCP_KEY_REVOKE",
              "MCP_CONFIG_UPDATE",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          adminLabel: true,
          action: true,
          details: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
    ]);

    const baseOrigin = resolvePublicAppOrigin() || req.nextUrl?.origin || "http://localhost:3000";
    const endpointUrl = `${baseOrigin.replace(/\/$/, "")}/api/mcp`;

    return NextResponse.json(
      {
        success: true,
        serverInfo: {
          name: MCP_SERVER_NAME,
          version: MCP_SERVER_VERSION,
          protocolVersion: MCP_PROTOCOL_VERSION,
          transport: "Streamable HTTP (JSON-RPC 2.0 Stateless)",
          endpointUrl,
        },
        config: runtimeConfig,
        keys,
        scopes: MCP_SCOPE_DEFINITIONS,
        departments: MCP_DEPARTMENT_PRESETS,
        toolsCatalog: listToolsCatalogSummary(),
        resourcesCatalog: listMcpDocResources(),
        recentLogs,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return routeError("AdminMcpGet", error, "Gagal memuat konfigurasi MCP Server");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("mcp");
    if (!guard.ok) return guard.response;

    const body = await readJsonBody(req);
    const name = String(body?.name ?? "").trim();
    const department = String(body?.department ?? "GENERAL").trim().toUpperCase().slice(0, 60);
    const scopes = normalizeMcpScopes(body?.scopes);
    const expiresInDaysRaw = body?.expiresInDays;

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Nama kunci MCP harus berisi 2 sampai 80 karakter." },
        { status: 400 }
      );
    }

    if (scopes.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu scope izin untuk kunci MCP ini." },
        { status: 400 }
      );
    }

    let expiresAt: Date | null = null;
    if (expiresInDaysRaw !== null && expiresInDaysRaw !== undefined && expiresInDaysRaw !== "") {
      const days = Number.parseInt(String(expiresInDaysRaw), 10);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return NextResponse.json(
          { error: "Masa berlaku kunci harus bilangan bulat antara 1 sampai 3650 hari." },
          { status: 400 }
        );
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const { rawKey, keyPrefix, keyHash } = generateMcpApiKey();
    const actorId = adminActorId(guard.session);
    const actorLabel = guard.session.user.name || guard.session.user.email || "SUPER_ADMIN";

    const created = await prisma.mcpApiKey.create({
      data: {
        name,
        department: department || "GENERAL",
        keyPrefix,
        keyHash,
        scopes,
        expiresAt,
        createdById: actorId,
        createdByLabel: actorLabel,
      },
      select: {
        id: true,
        name: true,
        department: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdByLabel: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: actorId,
        adminLabel: actorLabel,
        action: "MCP_KEY_CREATE",
        ipAddress: getClientIp(req),
        details: JSON.stringify({
          keyId: created.id,
          name: created.name,
          department: created.department,
          keyPrefix: created.keyPrefix,
          scopes: created.scopes,
          expiresAt: created.expiresAt?.toISOString() ?? null,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        key: created,
        rawKey,
      },
      { status: 201, headers: NO_STORE }
    );
  } catch (error) {
    return routeError("AdminMcpCreate", error, "Gagal membuat kunci API MCP");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdminModule("mcp");
    if (!guard.ok) return guard.response;

    const body = await readJsonBody(req);
    const action = String(body?.action ?? "update_config").trim();

    if (action === "test_handshake") {
      const startedAt = Date.now();
      const syntheticKey = {
        id: "admin-self-test",
        name: "Admin Handshake Test",
        department: "SUPER_ADMIN",
        keyPrefix: "admin_test",
        scopes: [...VALID_MCP_SCOPES],
      };
      const ip = getClientIp(req);
      const [initRes, toolsRes, resourcesRes] = await Promise.all([
        handleMcpJsonRpc(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: { protocolVersion: MCP_PROTOCOL_VERSION },
          },
          syntheticKey,
          ip,
          { skipAudit: true }
        ),
        handleMcpJsonRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, syntheticKey, ip, {
          skipAudit: true,
        }),
        handleMcpJsonRpc({ jsonrpc: "2.0", id: 3, method: "resources/list" }, syntheticKey, ip, {
          skipAudit: true,
        }),
      ]);

      const runtimeConfig = await getMcpRuntimeConfig();
      const toolsCount = Array.isArray((toolsRes.response?.result as any)?.tools)
        ? (toolsRes.response?.result as any).tools.length
        : 0;
      const resourcesCount = Array.isArray((resourcesRes.response?.result as any)?.resources)
        ? (resourcesRes.response?.result as any).resources.length
        : 0;

      return NextResponse.json(
        {
          success: true,
          latencyMs: Date.now() - startedAt,
          mcpEnabled: runtimeConfig.enabled,
          protocolVersion: (initRes.response?.result as any)?.protocolVersion ?? MCP_PROTOCOL_VERSION,
          serverInfo: (initRes.response?.result as any)?.serverInfo ?? null,
          toolsCount,
          resourcesCount,
        },
        { headers: NO_STORE }
      );
    }

    const updates: Array<{ key: string; value: string; label: string }> = [];
    if (body?.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ error: "Field 'enabled' harus boolean." }, { status: 400 });
      }
      updates.push({
        key: "mcp_enabled",
        value: body.enabled ? "true" : "false",
        label: "Aktifkan Remote MCP Server (/api/mcp)",
      });
    }

    if (body?.rateLimitPerMin !== undefined) {
      const parsed = Number.parseInt(String(body.rateLimitPerMin), 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 600) {
        return NextResponse.json(
          { error: "Batas rate limit MCP harus bilangan bulat antara 1 sampai 600 request/menit." },
          { status: 400 }
        );
      }
      updates.push({
        key: "mcp_rate_limit_per_min",
        value: String(parsed),
        label: "Batas Request MCP per Menit per Kunci",
      });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Tidak ada konfigurasi MCP yang dikirim." }, { status: 400 });
    }

    for (const u of updates) {
      await prisma.adminSetting.upsert({
        where: { key: u.key },
        update: { value: u.value, group: "mcp" },
        create: { key: u.key, value: u.value, label: u.label, group: "mcp" },
      });
    }

    invalidateSettingsCache();

    const actorId = adminActorId(guard.session);
    const actorLabel = guard.session.user.name || guard.session.user.email || "SUPER_ADMIN";
    await prisma.adminAuditLog.create({
      data: {
        adminId: actorId,
        adminLabel: actorLabel,
        action: "MCP_CONFIG_UPDATE",
        ipAddress: getClientIp(req),
        details: JSON.stringify(
          Object.fromEntries(updates.map((u) => [u.key, u.value]))
        ),
      },
    });

    const config = await getMcpRuntimeConfig();
    return NextResponse.json({ success: true, config }, { headers: NO_STORE });
  } catch (error) {
    return routeError("AdminMcpPatch", error, "Gagal memperbarui konfigurasi MCP Server");
  }
}
