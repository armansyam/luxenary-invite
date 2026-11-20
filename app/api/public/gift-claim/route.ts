import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";
import { routeError } from "@/lib/routeError";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";

export const dynamic = "force-dynamic";

async function summarizeClaims(invitationId: string) {
  const rows = await prisma.giftClaim.findMany({
    where: { invitationId },
    orderBy: { claimedAt: "desc" },
    select: { itemId: true, guestName: true, quantity: true, claimedAt: true },
  });

  const grouped = new Map<string, { itemId: string; claimedQty: number; claimers: string[] }>();
  for (const row of rows) {
    const cur = grouped.get(row.itemId) || { itemId: row.itemId, claimedQty: 0, claimers: [] };
    cur.claimedQty += Math.max(1, row.quantity);
    if (row.guestName && !cur.claimers.includes(row.guestName)) {
      cur.claimers.push(row.guestName);
    }
    grouped.set(row.itemId, cur);
  }
  return Array.from(grouped.values());
}

export async function GET(req: NextRequest) {
  try {
    const invitationId = new URL(req.url).searchParams.get("invitationId")?.trim() || "";
    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib diisi." }, { status: 400 });
    }

    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { status: true },
    });
    if (!inv || inv.status === "TAKEN_DOWN" || inv.status === "ARCHIVED" || inv.status === "DRAFT") {
      return NextResponse.json({ success: true, claims: [] });
    }

    const claims = await summarizeClaims(invitationId);
    return NextResponse.json({ success: true, claims }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError("PublicGiftClaimGet", error, "Gagal memuat status daftar kado");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    const invitationId = typeof body?.invitationId === "string" ? body.invitationId.trim() : "";
    const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";
    const guestName = typeof body?.guestName === "string" ? body.guestName.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
    const quantity = Number.isInteger(Number(body?.quantity)) ? Number(body.quantity) : 1;

    if (!invitationId || !itemId || !guestName) {
      return NextResponse.json(
        { error: "invitationId, itemId, dan nama tamu wajib diisi." },
        { status: 400 },
      );
    }
    if (guestName.length > 100) {
      return NextResponse.json({ error: "Nama maksimal 100 karakter." }, { status: 400 });
    }
    if (quantity < 1 || quantity > 10) {
      return NextResponse.json({ error: "Jumlah kado harus antara 1 sampai 10." }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (
      !(await rateLimitDb(`gift_claim:ip:${ip}`, 30, 60_000)) ||
      !(await rateLimitDb(`gift_claim:inv:${invitationId}`, 120, 60_000))
    ) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu sebentar." },
        { status: 429 },
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, status: true, featureSettings: true },
    });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }
    if (invitation.status === "DRAFT") {
      return NextResponse.json({ error: "Undangan masih berupa draf dan belum dipublikasikan." }, { status: 403 });
    }
    if (invitation.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Daftar kado untuk acara ini tidak aktif." }, { status: 410 });
    }

    const items = parseGiftRegistryFromSettings(invitation.featureSettings);
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) {
      return NextResponse.json({ error: "Pilihan kado tidak ditemukan di daftar." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const lockKey = `gift:${invitationId}:${itemId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const agg = await tx.giftClaim.aggregate({
        where: { invitationId, itemId },
        _sum: { quantity: true },
      });
      const alreadyClaimed = agg._sum.quantity || 0;
      if (alreadyClaimed + quantity > targetItem.qtyNeeded) {
        return { conflict: true as const, claimedQty: alreadyClaimed };
      }

      const claim = await tx.giftClaim.create({
        data: {
          invitationId,
          itemId,
          guestName,
          quantity,
          ...(note ? { note } : {}),
        },
      });
      return { conflict: false as const, claim, claimedQty: alreadyClaimed + quantity };
    });

    if (result.conflict) {
      return NextResponse.json(
        { error: "Pilihan kado ini sudah terpenuhi atau dipilih tamu lain." },
        { status: 409 },
      );
    }

    const claims = await summarizeClaims(invitationId);
    return NextResponse.json({
      success: true,
      claim: result.claim,
      remaining: Math.max(0, targetItem.qtyNeeded - result.claimedQty),
      claims,
    });
  } catch (error) {
    return routeError("PublicGiftClaimPost", error, "Gagal menyimpan pilihan kado");
  }
}
