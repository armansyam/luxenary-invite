import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp } from "@/lib/rateLimit";
import { normalizeMcpScopes } from "@/lib/mcp/constants";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("mcp");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    const existing = await prisma.mcpApiKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kunci MCP tidak ditemukan." }, { status: 404 });
    }
    if (existing.revokedAt) {
      return NextResponse.json(
        { error: "Kunci MCP yang sudah dicabut permanen tidak dapat diubah lagi." },
        { status: 409 }
      );
    }

    const body = await readJsonBody(req);
    const data: {
      name?: string;
      department?: string;
      scopes?: string[];
      isActive?: boolean;
    } = {};

    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json(
          { error: "Nama kunci MCP harus berisi 2 sampai 80 karakter." },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body?.department !== undefined) {
      const dept = String(body.department).trim().toUpperCase().slice(0, 60);
      if (dept) data.department = dept;
    }

    if (body?.scopes !== undefined) {
      const scopes = normalizeMcpScopes(body.scopes);
      if (scopes.length === 0) {
        return NextResponse.json(
          { error: "Pilih minimal satu scope izin yang valid." },
          { status: 400 }
        );
      }
      data.scopes = scopes;
    }

    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "Field 'isActive' harus boolean." }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const updated = await prisma.mcpApiKey.update({
      where: { id },
      data,
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

    const actorId = adminActorId(guard.session);
    const actorLabel = guard.session.user.name || guard.session.user.email || "SUPER_ADMIN";
    await prisma.adminAuditLog.create({
      data: {
        adminId: actorId,
        adminLabel: actorLabel,
        action: "MCP_KEY_UPDATE",
        ipAddress: getClientIp(req),
        details: JSON.stringify({
          keyId: updated.id,
          name: updated.name,
          changes: data,
        }),
      },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error) {
    return routeError("AdminMcpUpdateKey", error, "Gagal memperbarui kunci API MCP");
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("mcp");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    const existing = await prisma.mcpApiKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kunci MCP tidak ditemukan." }, { status: 404 });
    }

    const permanent = req.nextUrl.searchParams.get("permanent") === "1";
    const actorId = adminActorId(guard.session);
    const actorLabel = guard.session.user.name || guard.session.user.email || "SUPER_ADMIN";

    if (permanent && existing.revokedAt) {
      await prisma.mcpApiKey.delete({ where: { id } });
      await prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          adminLabel: actorLabel,
          action: "MCP_KEY_REVOKE",
          ipAddress: getClientIp(req),
          details: JSON.stringify({
            keyId: existing.id,
            name: existing.name,
            keyPrefix: existing.keyPrefix,
            permanentDelete: true,
          }),
        },
      });
      return NextResponse.json({ success: true, deleted: true });
    }

    const revoked = await prisma.mcpApiKey.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: existing.revokedAt ?? new Date(),
      },
      select: {
        id: true,
        name: true,
        department: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        revokedAt: true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: actorId,
        adminLabel: actorLabel,
        action: "MCP_KEY_REVOKE",
        ipAddress: getClientIp(req),
        details: JSON.stringify({
          keyId: revoked.id,
          name: revoked.name,
          keyPrefix: revoked.keyPrefix,
        }),
      },
    });

    return NextResponse.json({ success: true, key: revoked });
  } catch (error) {
    return routeError("AdminMcpRevokeKey", error, "Gagal mencabut kunci API MCP");
  }
}
