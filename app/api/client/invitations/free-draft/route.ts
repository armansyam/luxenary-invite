import crypto from "crypto";
import { NextResponse } from "next/server";
import { EventType, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { getEnabledEventTypes, getServiceAvailability } from "@/lib/settings";
import { DEFAULT_THEME_BY_EVENT, isThemeCompatible } from "@/lib/invitationUtils";
import { loadThemeLabelContext } from "@/lib/themeLabels";
import { loadThemeMediaSnapshot, parseThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { copyMasterToDraft, seedRenderedLabels } from "@/lib/renderedLabels";
import { normalizeJsonInput } from "@/lib/jsonText";

export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES: readonly EventType[] = [
  "WEDDING",
  "BIRTHDAY",
  "KHITAN",
  "AQIQAH",
  "WISUDA",
  "GATHERING",
];

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
    const rawEvent =
      typeof body.eventType === "string" && body.eventType.trim()
        ? body.eventType.trim().toUpperCase()
        : "WEDDING";

    if (!VALID_EVENT_TYPES.includes(rawEvent as EventType)) {
      return NextResponse.json({ error: "Jenis acara tidak valid." }, { status: 400 });
    }
    const eventType = rawEvent as EventType;

    const enabledTypes = await getEnabledEventTypes();
    if (!enabledTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Jenis acara ini belum menerima undangan baru." },
        { status: 400 },
      );
    }

    let chosenTheme = "";
    if (typeof body.themeId === "string" && body.themeId.trim()) {
      const candidate = body.themeId.trim().toLowerCase();
      const theme = await prisma.theme.findUnique({
        where: { id: candidate },
        select: { id: true, isActive: true, eventType: true },
      });
      if (!theme || !theme.isActive || !isThemeCompatible(eventType, theme.eventType)) {
        return NextResponse.json(
          { error: "Tema pilihan tidak aktif atau tidak sesuai jenis acara." },
          { status: 400 },
        );
      }
      chosenTheme = theme.id;
    } else {
      const preferred = DEFAULT_THEME_BY_EVENT[eventType];
      const preferredTheme = preferred
        ? await prisma.theme.findFirst({
            where: { id: preferred, isActive: true },
            select: { id: true },
          })
        : null;

      if (preferredTheme) {
        chosenTheme = preferredTheme.id;
      } else {
        const firstActive = await prisma.theme.findFirst({
          where: { isActive: true, eventType, parentTheme: null },
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
        loadThemeLabelContext(chosenTheme, eventType),
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

    const created = await prisma.invitation.create({
      data: {
        userId,
        orderId: null,
        isFreeDraft: true,
        status: "DRAFT",
        eventType,
        themeId: chosenTheme,
        invitationSlug,
        subdomain: null,
        participantsJson: participants.value,
        musicUrl: initialMusicUrl || undefined,
        openingQuote: blueprint.openingQuote,
        openingQuoteRef: blueprint.openingQuoteRef,
        eventData: [],
        featureSettings: {
          weddingTagline: defaultCoverBadge,
          musicUrl: initialMusicUrl || undefined,
          showStory: eventType === "WEDDING",
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
        themeId: true,
        invitationSlug: true,
      },
    });

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
