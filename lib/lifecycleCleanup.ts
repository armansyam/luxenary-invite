import fs from "fs";
import path from "path";
import { prisma, pool } from "./prisma";
import { logger } from "./logger";
import { getAdminSetting } from "./settings";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "./staticPublisher";
import { deleteFile } from "./storage";
import { invalidateInvitationLookup } from "./cache";
import { isNasArchiveEnabled, purgeNasArchive, syncInvitationToNasArchive } from "./nasArchive";
import { DAY_MS, computeLifecycleDates, formatDateInEventTimezone, getPrimaryEventTimezone, type LifecycleSettings } from "./lifecycleDates";
import { getLifecycleSettings } from "./lifecycleSettings";
import { applyUpgradePlan } from "./upgradeHelper";

const CONTEXT = "LifecycleCleanup";
const RETENTION_WARNING_LEAD_MS = 3 * DAY_MS;

export interface LifecycleCleanupOptions {
  now?: Date;
  /** Hanya menghitung yang akan diproses, tanpa mengubah data, berkas, maupun mengirim email. */
  dryRun?: boolean;
}

export interface ArchiveFailure {
  invitationId: string;
  slug: string;
  reason: string;
}

export interface LifecycleCleanupResult {
  transitionedInvitations: number;
  recycledSubdomains: number;
  archivedInvitations: number;
  archiveFailures: ArchiveFailure[];
  purgedArchives: number;
  retentionWarningsSent: number;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.promises.access(target);
    return true;
  } catch {
    return false;
  }
}

/** PUBLISHED -> EVENT_FINISHED saat hari acara utama (zona waktu acara) telah berlalu. */
async function transitionFinishedInvitations(now: Date, settings: LifecycleSettings, dryRun: boolean): Promise<number> {
  const published = await prisma.invitation.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, eventData: true },
  });

  let transitioned = 0;
  for (const inv of published) {
    const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);
    if (!dates || now < dates.eventFinishedAt) continue;

    if (!dryRun) {
      await buildAndSavePublishedHtml(inv.id);
      await prisma.invitation.update({ where: { id: inv.id }, data: { status: "EVENT_FINISHED" } });
    }
    transitioned++;
  }
  return transitioned;
}

/** Subdomain kembali ke pool setelah `subdomain_grace_days`; URL yang tersisa adalah slug. */
async function releaseExpiredSubdomains(now: Date, settings: LifecycleSettings, dryRun: boolean): Promise<number> {
  if (!settings.autoRecycleSubdomain) return 0;

  const holders = await prisma.invitation.findMany({
    where: { subdomain: { not: null }, status: { in: ["EVENT_FINISHED", "ARCHIVED", "TAKEN_DOWN"] } },
    select: { id: true, eventData: true, invitationSlug: true, subdomain: true },
  });

  let released = 0;
  for (const inv of holders) {
    const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);
    if (!dates || now <= dates.subdomainReleaseAt) continue;

    if (!dryRun) {
      await prisma.invitation.update({ where: { id: inv.id }, data: { subdomain: null } });
      invalidateInvitationLookup(inv.invitationSlug, inv.subdomain);
    }
    released++;
  }
  return released;
}

interface WarningTarget {
  id: string;
  invitationSlug: string;
  eventData: string | null;
  featureSettings: string | null;
  groomName: string | null;
  brideName: string | null;
  user: { email: string; name: string } | null;
}

/** Email peringatan retensi galeri H-3; ditandai `retentionWarningSentAt` agar terkirim sekali. */
async function sendRetentionWarningIfDue(inv: WarningTarget, expiresAt: Date, now: Date, dryRun: boolean): Promise<boolean> {
  const remainingMs = expiresAt.getTime() - now.getTime();
  if (remainingMs <= 0 || remainingMs > RETENTION_WARNING_LEAD_MS || !inv.user?.email) return false;

  let features: Record<string, unknown> = {};
  if (typeof inv.featureSettings === "string" && inv.featureSettings.trim()) {
    try {
      features = JSON.parse(inv.featureSettings);
    } catch (err) {
      logger.warn(CONTEXT, "featureSettings tidak dapat dibaca, peringatan retensi dilewati", { invitationId: inv.id, error: String(err) });
      return false;
    }
  }
  if (features.retentionWarningSentAt) return false;
  if (dryRun) return true;

  const totalPhotos = await prisma.guestMemory.count({ where: { invitationId: inv.id } });
  const coupleNames = inv.groomName && inv.brideName ? `${inv.groomName} & ${inv.brideName}` : inv.user.name || "Mempelai";

  try {
    const { sendRetentionExpiryAlertEmail } = await import("./mailer");
    const result = await sendRetentionExpiryAlertEmail({
      invitationId: inv.id,
      invitationSlug: inv.invitationSlug,
      coupleNames,
      daysRemaining: Math.max(1, Math.ceil(remainingMs / DAY_MS)),
      expiryDateFormatted: formatDateInEventTimezone(expiresAt, getPrimaryEventTimezone(inv.eventData)),
      totalPhotos,
      recipientEmail: inv.user.email,
      recipientName: inv.user.name || coupleNames,
    });
    if (!result.success) return false;

    await prisma.invitation.update({
      where: { id: inv.id },
      data: { featureSettings: JSON.stringify({ ...features, retentionWarningSentAt: now.toISOString() }) },
    });
    return true;
  } catch (err) {
    logger.warn(CONTEXT, "Gagal mengirim email peringatan retensi", { invitationId: inv.id, error: String(err) });
    return false;
  }
}

/** Foto candid tamu (R2 dan lokal) beserta barisnya; jam galeri `retention_cleanup_days` / `galleryExpiresAt`. */
async function purgeGuestMemories(invitationId: string): Promise<void> {
  const memories = await prisma.guestMemory.findMany({ where: { invitationId }, select: { mediaUrl: true } });
  await Promise.all(memories.map((memory) => deleteFile(memory.mediaUrl)));
  await prisma.guestMemory.deleteMany({ where: { invitationId } });

  const publicUploads = path.join(process.cwd(), "public", "uploads");
  await Promise.all(
    [path.join(publicUploads, "guest-memories", invitationId), path.join(publicUploads, "invitations", invitationId, "memories")].map(
      (dir) => fs.promises.rm(dir, { recursive: true, force: true })
    )
  );
}

interface ExpiredInvitation extends WarningTarget {
  subdomain: string | null;
}

/**
 * Menutup masa galeri: foto tamu dibersihkan, undangan diarsipkan dan DIVERIFIKASI, baru kemudian
 * artefak hot storage dihapus. Bila arsip gagal, tidak ada yang dihapus dan undangan dicoba lagi pada
 * eksekusi berikutnya.
 */
async function archiveExpiredInvitation(inv: ExpiredInvitation, nasEnabled: boolean): Promise<ArchiveFailure | null> {
  await purgeGuestMemories(inv.id);

  if (nasEnabled) {
    const sync = await syncInvitationToNasArchive(inv.id);
    if (!sync.success) {
      return { invitationId: inv.id, slug: inv.invitationSlug, reason: sync.error ?? "Sinkronisasi arsip gagal" };
    }
  }

  await deletePublishedHtml(inv.id);
  await fs.promises.rm(path.join(process.cwd(), "data", "drafts", `${inv.id}.html`), { force: true });

  if (nasEnabled) {
    const media = await prisma.invitationMedia.findMany({ where: { invitationId: inv.id }, select: { localPath: true } });
    await Promise.all(media.map((item) => deleteFile(item.localPath)));
  }

  await prisma.rsvp.deleteMany({ where: { invitationId: inv.id } });
  await prisma.invitation.update({ where: { id: inv.id }, data: { status: "ARCHIVED", memoriesUploadLocked: true } });
  invalidateInvitationLookup(inv.invitationSlug, inv.subdomain);
  return null;
}

/** Arsip undangan dibersihkan setelah `nas_archive_retention_days` sejak acara utama. */
async function purgeExpiredArchives(now: Date, settings: LifecycleSettings, dryRun: boolean): Promise<number> {
  const archived = await prisma.invitation.findMany({
    where: { status: "ARCHIVED" },
    select: { invitationSlug: true, eventData: true },
  });

  let purged = 0;
  for (const inv of archived) {
    const dates = computeLifecycleDates({ eventData: inv.eventData }, settings);
    if (!dates || now <= dates.archiveExpiresAt) continue;

    if (dryRun) {
      purged++;
    } else if (await purgeNasArchive(inv.invitationSlug)) {
      purged++;
    }
  }
  return purged;
}

/**
 * Siklus hidup undangan dengan jam terpisah, seluruhnya dari acara utama pada zona waktu acara:
 * EVENT_FINISHED (H+1), subdomain (`subdomain_grace_days`), galeri dan ARCHIVED (`retention_cleanup_days`
 * atau `galleryExpiresAt`), serta arsip (`nas_archive_retention_days`). Custom domain tidak diproses di sini:
 * resolver publiknya menegakkan `retention_custom_domain_days`.
 */
export async function runLifecycleCleanup(options: LifecycleCleanupOptions = {}): Promise<LifecycleCleanupResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const settings = await getLifecycleSettings();

  const transitionedInvitations = await transitionFinishedInvitations(now, settings, dryRun);
  const recycledSubdomains = await releaseExpiredSubdomains(now, settings, dryRun);

  const finished = await prisma.invitation.findMany({
    where: { status: { in: ["EVENT_FINISHED", "TAKEN_DOWN"] } },
    select: {
      id: true,
      eventData: true,
      featureSettings: true,
      galleryExpiresAt: true,
      invitationSlug: true,
      subdomain: true,
      groomName: true,
      brideName: true,
      user: { select: { email: true, name: true } },
    },
  });

  const nasEnabled = await isNasArchiveEnabled();
  const archiveFailures: ArchiveFailure[] = [];
  let archivedInvitations = 0;
  let retentionWarningsSent = 0;

  for (const inv of finished) {
    const dates = computeLifecycleDates({ eventData: inv.eventData, galleryExpiresAt: inv.galleryExpiresAt }, settings);
    if (!dates) continue;

    if (now <= dates.galleryExpiresAt) {
      if (await sendRetentionWarningIfDue(inv, dates.galleryExpiresAt, now, dryRun)) retentionWarningsSent++;
      continue;
    }

    if (dryRun) {
      archivedInvitations++;
      continue;
    }

    const failure = await archiveExpiredInvitation(inv, nasEnabled);
    if (failure) {
      logger.error(CONTEXT, "Arsip gagal; undangan tidak dibersihkan dan akan dicoba lagi", undefined, { ...failure });
      archiveFailures.push(failure);
    } else {
      archivedInvitations++;
    }
  }

  const purgedArchives = await purgeExpiredArchives(now, settings, dryRun);

  return { transitionedInvitations, recycledSubdomains, archivedInvitations, archiveFailures, purgedArchives, retentionWarningsSent };
}

export interface StaleDataCleanupResult {
  orphanedDrafts: number;
  deletedOrders: number;
  refulfilledOrders: number;
  purgedRateLimitRows: number;
}

const FULFILLMENT_GRACE_MS = 5 * 60 * 1000;

/** Order PAID yang pemenuhan layanannya tidak pernah selesai (kegagalan setelah webhook) dijalankan ulang. */
async function refulfillStuckOrders(now: Date, dryRun: boolean): Promise<number> {
  const stuck = await prisma.order.findMany({
    where: { status: "PAID", fulfilledAt: null, paidAt: { lt: new Date(now.getTime() - FULFILLMENT_GRACE_MS) } },
    select: { id: true },
    take: 50,
  });
  if (dryRun) return stuck.length;

  let done = 0;
  for (const order of stuck) {
    try {
      await applyUpgradePlan(order.id);
      done++;
    } catch (err) {
      logger.error("LifecycleCleanup", `Pemenuhan ulang order ${order.id} gagal`, err);
    }
  }
  return done;
}

/**
 * Baris limiter yang sudah kedaluwarsa tidak pernah dipakai ulang bila kuncinya (mis. IP) tidak muncul lagi.
 * SQL mentah, bukan filter DateTime Prisma: kolom `expires_at` bertipe timestamptz dan adapter pg mengirim parameter
 * tanpa zona, sehingga perbandingan bergeser sebesar selisih zona waktu sesi (sama seperti rateLimitDb di lib/rateLimit.ts).
 */
async function purgeExpiredRateLimitRows(dryRun: boolean): Promise<number> {
  if (dryRun) {
    const counted = await pool.query("SELECT count(*)::int AS n FROM rate_limit_counters WHERE expires_at < now()");
    return counted.rows[0].n;
  }
  const deleted = await pool.query("DELETE FROM rate_limit_counters WHERE expires_at < now()");
  return deleted.rowCount ?? 0;
}

/** Draft HTML tanpa undangan dan order EXPIRED/FAILED/PENDING yang melewati `retention_order_days`. */
export async function runStaleDataCleanup(options: LifecycleCleanupOptions = {}): Promise<StaleDataCleanupResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;

  let orphanedDrafts = 0;
  const draftsDir = path.join(process.cwd(), "data", "drafts");
  if (await pathExists(draftsDir)) {
    for (const file of await fs.promises.readdir(draftsDir)) {
      if (!file.endsWith(".html")) continue;
      const owner = await prisma.invitation.findUnique({ where: { id: file.replace(".html", "") }, select: { id: true } });
      if (owner) continue;
      if (!dryRun) await fs.promises.rm(path.join(draftsDir, file), { force: true });
      orphanedDrafts++;
    }
  }

  const parsedDays = Number.parseInt(await getAdminSetting("retention_order_days", ""), 10);
  const retentionOrderDays = Number.isFinite(parsedDays) && parsedDays >= 1 ? parsedDays : 90;
  const staleWhere = {
    status: { in: ["EXPIRED", "FAILED", "PENDING"] as Array<"EXPIRED" | "FAILED" | "PENDING"> },
    createdAt: { lt: new Date(now.getTime() - retentionOrderDays * DAY_MS) },
  };

  const refulfilledOrders = await refulfillStuckOrders(now, dryRun);
  const purgedRateLimitRows = await purgeExpiredRateLimitRows(dryRun);

  const staleOrders = await prisma.order.findMany({ where: staleWhere, select: { proofImageUrl: true } });
  if (dryRun) return { orphanedDrafts, deletedOrders: staleOrders.length, refulfilledOrders, purgedRateLimitRows };

  await Promise.all(staleOrders.map((order) => deleteFile(order.proofImageUrl)));
  const deleted = await prisma.order.deleteMany({ where: staleWhere });
  return { orphanedDrafts, deletedOrders: deleted.count, refulfilledOrders, purgedRateLimitRows };
}
