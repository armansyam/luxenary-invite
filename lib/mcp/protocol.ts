import {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "./constants";
import { hasMcpScope, recordMcpAudit, type AuthenticatedMcpKey } from "./auth";
import { listMcpDocResources, readMcpDocResource } from "./resources";
import { getMcpToolByName, MCP_TOOLS } from "./tools";

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

function rpcOk(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

export async function handleMcpJsonRpc(
  body: JsonRpcRequest,
  authKey: AuthenticatedMcpKey,
  ipAddress: string,
  options?: { skipAudit?: boolean }
): Promise<{ status: number; response: JsonRpcResponse | null }> {
  if (!body || typeof body !== "object" || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return {
      status: 400,
      response: rpcError(null, -32600, "Invalid JSON-RPC 2.0 request."),
    };
  }

  const isNotification = body.id === undefined;
  const id = body.id ?? null;
  const method = body.method;
  const params = (body.params && typeof body.params === "object" ? body.params : {}) as Record<
    string,
    unknown
  >;

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return { status: 202, response: null };
  }

  if (method === "initialize") {
    const requestedVersion =
      typeof params.protocolVersion === "string" ? params.protocolVersion.trim() : "";
    const negotiatedVersion = (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(
      requestedVersion
    )
      ? requestedVersion
      : MCP_PROTOCOL_VERSION;

    return {
      status: 200,
      response: rpcOk(id, {
        protocolVersion: negotiatedVersion,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: MCP_SERVER_NAME,
          version: MCP_SERVER_VERSION,
        },
        instructions:
          "Luxvite Remote MCP Server (Stateless Streamable HTTP). Gunakan MCP Resources luxvite://docs/index untuk Ground Truth arsitektur & SOP terbaru sebelum menganalisis data operasional atau laporan keuangan.",
      }),
    };
  }

  if (method === "ping") {
    return { status: 200, response: rpcOk(id, {}) };
  }

  if (method === "tools/list") {
    const permittedTools = MCP_TOOLS.filter((tool) =>
      hasMcpScope(authKey, tool.requiredScopes)
    ).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: tool.readOnly,
        destructiveHint: false,
        idempotentHint: tool.readOnly,
      },
    }));

    return {
      status: 200,
      response: isNotification ? null : rpcOk(id, { tools: permittedTools }),
    };
  }

  if (method === "tools/call") {
    const toolName = typeof params.name === "string" ? params.name.trim() : "";
    const toolArgs =
      params.arguments && typeof params.arguments === "object"
        ? (params.arguments as Record<string, unknown>)
        : {};

    if (!toolName) {
      return {
        status: 200,
        response: rpcError(id, -32602, "Parameter 'name' wajib diisi untuk tools/call."),
      };
    }

    const tool = getMcpToolByName(toolName);
    if (!tool) {
      return {
        status: 200,
        response: rpcError(id, -32602, `Tool MCP tidak dikenal: ${toolName}`),
      };
    }

    const startedAt = Date.now();
    if (!hasMcpScope(authKey, tool.requiredScopes)) {
      if (!options?.skipAudit) {
        await recordMcpAudit({
          key: authKey,
          action: "MCP_SCOPE_DENIED",
          target: tool.name,
          ok: false,
          durationMs: Date.now() - startedAt,
          ipAddress,
          note: `Butuh salah satu scope: ${tool.requiredScopes.join(" | ")}`,
        });
      }
      return {
        status: 200,
        response: rpcError(
          id,
          -32003,
          `Akses ditolak untuk tool '${tool.name}'. Kunci ini membutuhkan salah satu scope: ${tool.requiredScopes.join(", ")}.`
        ),
      };
    }

    try {
      const output = await tool.handler(toolArgs);
      const durationMs = Date.now() - startedAt;
      if (!options?.skipAudit) {
        await recordMcpAudit({
          key: authKey,
          action: "MCP_TOOL_CALL",
          target: tool.name,
          ok: true,
          durationMs,
          ipAddress,
        });
      }
      return {
        status: 200,
        response: rpcOk(id, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          isError: false,
        }),
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const msg = err instanceof Error ? err.message : "Gagal mengeksekusi tool MCP.";
      if (!options?.skipAudit) {
        await recordMcpAudit({
          key: authKey,
          action: "MCP_TOOL_CALL",
          target: tool.name,
          ok: false,
          durationMs,
          ipAddress,
          note: msg,
        });
      }
      return {
        status: 200,
        response: rpcOk(id, {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: msg }, null, 2) }],
          isError: true,
        }),
      };
    }
  }

  if (method === "resources/list") {
    const resources = hasMcpScope(authKey, "docs:read") ? listMcpDocResources() : [];
    return {
      status: 200,
      response: isNotification ? null : rpcOk(id, { resources }),
    };
  }

  if (method === "resources/read") {
    const uri = typeof params.uri === "string" ? params.uri.trim() : "";
    if (!uri) {
      return {
        status: 200,
        response: rpcError(id, -32602, "Parameter 'uri' wajib diisi untuk resources/read."),
      };
    }

    const startedAt = Date.now();
    if (!hasMcpScope(authKey, "docs:read")) {
      if (!options?.skipAudit) {
        await recordMcpAudit({
          key: authKey,
          action: "MCP_SCOPE_DENIED",
          target: uri,
          ok: false,
          durationMs: Date.now() - startedAt,
          ipAddress,
          note: "Butuh scope docs:read",
        });
      }
      return {
        status: 200,
        response: rpcError(id, -32003, "Akses ditolak. Membaca dokumentasi membutuhkan scope 'docs:read'."),
      };
    }

    try {
      const content = await readMcpDocResource(uri);
      if (!content) {
        return {
          status: 200,
          response: rpcError(id, -32002, `Resource dokumentasi tidak ditemukan: ${uri}`),
        };
      }
      if (!options?.skipAudit) {
        await recordMcpAudit({
          key: authKey,
          action: "MCP_RESOURCE_READ",
          target: uri,
          ok: true,
          durationMs: Date.now() - startedAt,
          ipAddress,
        });
      }
      return {
        status: 200,
        response: rpcOk(id, { contents: [content] }),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membaca berkas dokumentasi.";
      return {
        status: 200,
        response: rpcError(id, -32603, msg),
      };
    }
  }

  return {
    status: 200,
    response: rpcError(id, -32601, `Method MCP tidak didukung: ${method}`),
  };
}
