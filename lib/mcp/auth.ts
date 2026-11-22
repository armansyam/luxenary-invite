import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSetting } from "@/lib/settings";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import {
  MCP_DEFAULT_RATE_LIMIT_PER_MIN,
  MCP_KEY_PREFIX,
  normalizeMcpScopes,
  type McpScope,
} from "./constants";

export interface AuthenticatedMcpKey {
  id: string;
  name: string;
  department: string;
  keyPrefix: string;
  scopes: McpScope[];
}

export type McpAuthResult =
  | { ok: true; key: AuthenticatedMcpKey; ipAddress: string }
  | { ok: false; status: 401 | 403 | 429 | 503; error: string; code: string };

export function hashMcpApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function generateMcpApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `${MCP_KEY_PREFIX}${randomPart}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashMcpApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export async function getMcpRuntimeConfig(): Promise<{
  enabled: boolean;
  rateLimitPerMin: number;
}> {
  const [enabledRaw, rateRaw] = await Promise.all([
    getAdminSetting("mcp_enabled", "true"),
    getAdminSetting("mcp_rate_limit_per_min", String(MCP_DEFAULT_RATE_LIMIT_PER_MIN)),
  ]);
  const enabled = String(enabledRaw || "true").trim().toLowerCase() !== "false";
  const parsedRate = Number.parseInt(String(rateRaw || ""), 10);
  const rateLimitPerMin =
    Number.isInteger(parsedRate) && parsedRate >= 1 && parsedRate <= 600
      ? parsedRate
      : MCP_DEFAULT_RATE_LIMIT_PER_MIN;
  return { enabled, rateLimitPerMin };
}

export function hasMcpScope(key: AuthenticatedMcpKey, required: McpScope | McpScope[]): boolean {
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((scope) => key.scopes.includes(scope));
}

export async function authenticateMcpBearer(req: NextRequest): Promise<McpAuthResult> {
  const ipAddress = getClientIp(req);
  const { enabled, rateLimitPerMin } = await getMcpRuntimeConfig();

  if (!enabled) {
    return {
      ok: false,
      status: 503,
      code: "MCP_DISABLED",
      error: "Remote MCP Server sedang dinonaktifkan oleh Super Administrator.",
    };
  }

  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const rawToken = match?.[1]?.trim() || "";

  if (!rawToken || !rawToken.startsWith(MCP_KEY_PREFIX) || rawToken.length < 24) {
    return {
      ok: false,
      status: 401,
      code: "MCP_UNAUTHORIZED",
      error: "Header Authorization: Bearer <MCP_API_KEY> tidak ditemukan atau format tidak valid.",
    };
  }

  const keyHash = hashMcpApiKey(rawToken);
  const record = await prisma.mcpApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      name: true,
      department: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!record) {
    return {
      ok: false,
      status: 401,
      code: "MCP_INVALID_KEY",
      error: "Kunci API MCP tidak dikenali.",
    };
  }

  if (record.revokedAt || !record.isActive) {
    return {
      ok: false,
      status: 403,
      code: "MCP_KEY_INACTIVE",
      error: record.revokedAt
        ? "Kunci API MCP ini telah dicabut."
        : "Kunci API MCP ini sedang dijeda sementara.",
    };
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 403,
      code: "MCP_KEY_EXPIRED",
      error: "Kunci API MCP ini telah melewati masa berlaku.",
    };
  }

  const allowed = await rateLimitDb(`mcp:${record.id}`, rateLimitPerMin, 60_000);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      code: "MCP_RATE_LIMITED",
      error: `Batas ${rateLimitPerMin} permintaan per menit untuk kunci MCP ini terlampaui.`,
    };
  }

  // Perbarui statistik penggunaan secara non-blocking agar tidak menambah latensi respons
  void prisma.mcpApiKey
    .update({
      where: { id: record.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })
    .catch((err) => {
      logger.warn("McpAuth", "Gagal memperbarui statistik pemakaian kunci MCP", {
        keyId: record.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return {
    ok: true,
    ipAddress,
    key: {
      id: record.id,
      name: record.name,
      department: record.department,
      keyPrefix: record.keyPrefix,
      scopes: normalizeMcpScopes(record.scopes),
    },
  };
}

export async function recordMcpAudit(params: {
  key: AuthenticatedMcpKey;
  action: "MCP_TOOL_CALL" | "MCP_RESOURCE_READ" | "MCP_SCOPE_DENIED";
  target: string;
  ok: boolean;
  durationMs: number;
  ipAddress: string;
  note?: string;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: null,
        adminLabel: `MCP:${params.key.name} (${params.key.department})`,
        action: params.action,
        ipAddress: params.ipAddress,
        details: JSON.stringify({
          keyId: params.key.id,
          keyPrefix: params.key.keyPrefix,
          target: params.target,
          ok: params.ok,
          durationMs: params.durationMs,
          ...(params.note ? { note: params.note.slice(0, 300) } : {}),
        }),
      },
    });
  } catch (err) {
    logger.warn("McpAudit", "Gagal mencatat audit log MCP", {
      action: params.action,
      target: params.target,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
