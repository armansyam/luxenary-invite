import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpBearer } from "@/lib/mcp/auth";
import { handleMcpJsonRpc, type JsonRpcRequest, type JsonRpcResponse } from "@/lib/mcp/protocol";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Endpoint ini menggunakan MCP Streamable HTTP stateless. Kirim JSON-RPC 2.0 via POST /api/mcp dengan header Authorization: Bearer <MCP_API_KEY>.",
    },
    { status: 405, headers: { ...NO_STORE_HEADERS, Allow: "POST" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateMcpBearer(req);
    if (!auth.ok) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: auth.status === 429 ? -32029 : auth.status === 503 ? -32053 : -32001,
            message: auth.error,
            data: { code: auth.code },
          },
        },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: Body JSON tidak valid." },
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Dukung JSON-RPC batch (array, maks. 10 item per request)
    if (Array.isArray(payload)) {
      if (payload.length === 0 || payload.length > 10) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32600,
              message: "Batch JSON-RPC harus berisi 1 sampai 10 permintaan.",
            },
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const responses: JsonRpcResponse[] = [];
      for (const item of payload) {
        const res = await handleMcpJsonRpc(item as JsonRpcRequest, auth.key, auth.ipAddress);
        if (res.response) responses.push(res.response);
      }

      if (responses.length === 0) {
        return new NextResponse(null, { status: 202, headers: NO_STORE_HEADERS });
      }
      return NextResponse.json(responses, { status: 200, headers: NO_STORE_HEADERS });
    }

    const handled = await handleMcpJsonRpc(payload as JsonRpcRequest, auth.key, auth.ipAddress);
    if (handled.response === null) {
      return new NextResponse(null, { status: handled.status, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(handled.response, {
      status: handled.status,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return routeError("McpEndpoint", error, "Terjadi kesalahan pada Remote MCP Server");
  }
}
