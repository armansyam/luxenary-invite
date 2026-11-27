import crypto from "crypto";
import { NextResponse } from "next/server";
import { EventType, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { getEnabledEventTypes, getServiceAvailability } from "@/lib/settings";
import { DEFAULT_THEME_BY_EVENT, EVENT_TYPES, isThemeInMode, resolveSubEventMeta, sanitizeSubEvent, selectableEventTypes } from "@/lib/invitationUtils";
import { loadThemeLabelContext } from "@/lib/themeLabels";
import { loadThemeMediaSnapshot, parseThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { copyMasterToDraft, seedRenderedLabels } from "@/lib/renderedLabels";
import { normalizeJsonInput } from "@/lib/jsonText";

export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES: readonly EventType[] = [...EVENT_TYPES];

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((session.user as { isAdmin?: boolean }).isAdmin) {
      return NextResponse.json(
        { error: "Akun admin tidak dapat membuat draf gratis klien." },
        { status: 403 },
      );
    }

    const availability = await getServiceAvailability();
    if (!availability.isOpen) {
      return NextResponse.json(
        { error: "Pembuatan undangan atau draf baru sedang ditutup sementara." },
        { status: 403 },
      );
    }

    const [existingInvitations, paidNewOrder] = await Promise.all([
      prisma.invitation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          isFreeDraft: true,
          status: true,
          eventType: true,
          themeId: true,
          invitationSlug: true,
        },
      }),
      prisma.order.findFirst({
        where: { userId, orderType: "NEW", status: "PAID" },
        select: { id: true },
      }),
    ]);

    if (paidNewOrder || existingInvitations.some((inv) => !inv.isFreeDraft)) {
      return NextResponse.json(
        { error: "Akun Anda sudah memiliki paket atau undangan aktif." },
        { status: 409 },
      );
    }

    const existingFree = existingInvitations.find((inv) => inv.isFreeDraft);
    if (existingFree) {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          invitation: existingFree,
        },
        { status: 200 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const [enabledTypes, allActiveThemes] = await Promise.all([
      getEnabledEventTypes(),
      prisma.theme.findMany({
        where: { isActive: true },
        select: { id: true, eventType: true },
      }),
    ]);
    const activeThemes = allActiveThemes;
    const selectableTypes = selectableEventTypes(
      enabledTypes,
      allActiveThemes.map((t) => t.eventType),
    );

    const hasExplicitEventType = typeof body.eventType === "string" && body.eventType.trim().length > 0;
    let rawEvent: string;
    if (hasExplicitEventType) {
      rawEvent = String(body.eventType).trim().toUpperCase();
    } else if (selectableTypes.length === 1) {
      rawEvent = selectableTypes[0];
    } else {
      return NextResponse.json(
        {
          error: "Pilih jenis acara terlebih dahulu sebelum membuat draf gratis.",
          code: "EVENT_TYPE_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (!VALID_EVENT_TYPES.includes(rawEvent as EventType)) {
      return NextResponse.json({ error: "Jenis acara tidak valid." }, { status: 400 });
    }
    const eventType = rawEvent as EventType;
    const subEvent = eventType === "WEDDING" ? null : sanitizeSubEvent(body.subEvent);

    if (!enabledTypes.includes(eventType) || !selectableTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Jenis acara ini belum menerima undangan baru." },
        { status: 400 },
      );
    }

    let chosenTheme = "";
    if (typeof body.themeId === "string" && body.themeId.trim()) {
      const candidate = body.themeId.trim().toLowerCase();
      const requested = activeThemes.find((t) => t.id.toLowerCase() === candidate);
      if (!requested || !isThemeInMode(requested.eventType, eventType)) {
        return NextResponse.json(
          { error: "Tema pilihan tidak aktif atau berasal dari mode undangan yang berbeda." },
          { status: 400 },
        );
      }
      chosenTheme = requested.id;
    } else {
      const preferred =
        eventType === "WEDDING"
          ? DEFAULT_THEME_BY_EVENT.WEDDING
          : (subEvent ? resolveSubEventMeta(eventType, subEvent).demoFallbackThemeId : DEFAULT_THEME_BY_EVENT[eventType]);
      const preferredTheme = preferred
        ? await prisma.theme.findFirst({
            where: { id: preferred, isActive: true },
            select: { id: true, eventType: true },
          })
        : null;

      if (preferredTheme && isThemeInMode(preferredTheme.eventType, eventType)) {
        chosenTheme = preferredTheme.id;
      } else {
        const firstActive = await prisma.theme.findFirst({
          where: { isActive: true, eventType },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        });
        if (!firstActive) {
          return NextResponse.json(
            { error: "Belum ada tema aktif untuk jenis acara ini." },
            { status: 503 },
          );
        }
        chosenTheme = firstActive.id;
      }
    }

    const participants = normalizeJsonInput(body.participantsJson ?? {}, "object");
    if (!participants.ok) {
      return NextResponse.json(
        { error: "participantsJson harus berupa objek JSON yang valid." },
        { status: 400 },
      );
    }

    const [{ customDemoData, themeMeta, blueprint, defaultCoverBadge, initialCustomLabels }, snapshot] =
      await Promise.all([
        loadThemeLabelContext(chosenTheme, eventType, subEvent),
        loadThemeMediaSnapshot(chosenTheme),
      ]);

    const initialMusicUrl =
      customDemoData?.audioUrl ||
      customDemoData?.defaultMusicUrl ||
      themeMeta?.defaultMusicUrl ||
      blueprint.defaultMusicUrl ||
      "";
    const themeDefaultMedia = parseThemeDefaultMedia(themeMeta?.defaultMedia);
    const themeMediaSlots = snapshot.themeMediaSlots
      ? (snapshot.themeMediaSlots as Prisma.InputJsonValue)
      : Prisma.DbNull;

    const invitationSlug = `draf-${crypto.randomBytes(4).toString("hex")}`;
    const subMeta = eventType === "WEDDING" ? null : resolveSubEventMeta(eventType, subEvent);

    const txOutcome = await prisma.$transaction(async (tx) => {
      // Kunci per akun mencegah race condition permintaan paralel membuat lebih dari 1 draf gratis.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`free_draft_create:${userId}`}))`;

      const [lockedInvitations, lockedPaidOrder] = await Promise.all([
        tx.invitation.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            isFreeDraft: true,
            status: true,
            eventType: true,
            subEvent: true,
            themeId: true,
            invitationSlug: true,
          },
        }),
        tx.order.findFirst({
          where: { userId, orderType: "NEW", status: "PAID" },
          select: { id: true },
        }),
      ]);

      if (lockedPaidOrder || lockedInvitations.some((inv) => !inv.isFreeDraft)) {
        return { kind: "has_paid" as const };
      }

      const lockedFree = lockedInvitations.find((inv) => inv.isFreeDraft);
      if (lockedFree) {
        return { kind: "exists" as const, invitation: lockedFree };
      }

      const created = await tx.invitation.create({
        data: {
          userId,
          orderId: null,
          isFreeDraft: true,
          status: "DRAFT",
          eventType,
          subEvent,
          themeId: chosenTheme,
          invitationSlug,
          subdomain: null,
          participantsJson: participants.value,
          musicUrl: initialMusicUrl || undefined,
          openingQuote: subMeta ? subMeta.defaultQuote : blueprint.openingQuote,
          openingQuoteRef: subMeta ? subMeta.defaultQuoteRef : blueprint.openingQuoteRef,
          eventData: [],
          featureSettings: {
            weddingTagline: defaultCoverBadge,
            musicUrl: initialMusicUrl || undefined,
            showStory: true,
            showGallery: true,
            showGift: true,
            showDresscode: true,
            showMusic: true,
            customLabels: initialCustomLabels,
            labelDefaults: initialCustomLabels,
          },
          themeDefaultMedia,
          themeMediaSlots,
        },
        select: {
          id: true,
          isFreeDraft: true,
          status: true,
          eventType: true,
          subEvent: true,
          themeId: true,
          invitationSlug: true,
        },
      });

      return { kind: "created" as const, invitation: created };
    }).catch(async (err: unknown) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.invitation.findFirst({
          where: { userId, isFreeDraft: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            isFreeDraft: true,
            status: true,
            eventType: true,
            subEvent: true,
            themeId: true,
            invitationSlug: true,
          },
        });
        if (existing) return { kind: "exists" as const, invitation: existing };
      }
      throw err;
    });

    if (txOutcome.kind === "has_paid") {
      return NextResponse.json(
        { error: "Akun Anda sudah memiliki paket atau undangan aktif." },
        { status: 409 },
      );
    }

    if (txOutcome.kind === "exists") {
      return NextResponse.json(
        {
          success: true,
          alreadyExists: true,
          invitation: txOutcome.invitation,
        },
        { status: 200 },
      );
    }

    const created = txOutcome.invitation;
    if (eventType === "WEDDING") await copyMasterToDraft(created.id);
    else await seedRenderedLabels(created.id);

    return NextResponse.json(
      {
        success: true,
        alreadyExists: false,
        invitation: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return routeError("FreeDraftCreate", error, "Gagal membuat draf gratis");
  }
}
