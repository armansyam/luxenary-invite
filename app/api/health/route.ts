import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { masterTemplateCache, publishedHtmlCache, invitationLookupCache } from "@/lib/cache";
import { getActiveRateLimitDriver } from "@/lib/rateLimit";
import { isErrorTrackingConfigured } from "@/lib/errorTracker";

export const dynamic = "force-dynamic";

/**
 * Enterprise Production Health Check Endpoint
 * Digunakan oleh Caddy reverse proxy, Kubernetes liveness probes,
 * AWS Target Group healthchecks, dan Uptime Monitoring (BetterStack/UptimeRobot).
 *
 * Publik hanya menerima status dan timestamp. Detail operasional (lingkungan, memori, cache, latensi DB)
 * hanya untuk pemegang CRON_SECRET (Authorization: Bearer), mis. agen pemantau VPS.
 */
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function hasDetailAccess(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const detailed = hasDetailAccess(req);

  try {
    // 1. Verifikasi konektivitas nyata PostgreSQL via raw ping query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    if (!detailed) {
      return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString() }, { status: 200, headers: NO_STORE });
    }

    // 2. Ekstraksi penggunaan memori proses Node.js
    const mem = process.memoryUsage();
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssMb: toMb(mem.rss),
          heapUsedMb: toMb(mem.heapUsed),
          heapTotalMb: toMb(mem.heapTotal),
        },
        cacheStats: {
          masterTemplates: masterTemplateCache.size(),
          publishedHtml: publishedHtmlCache.size(),
          invitationLookups: invitationLookupCache.size(),
        },
        services: {
          rateLimiter: { driver: getActiveRateLimitDriver() },
          errorTracker: { sentryConfigured: isErrorTrackingConfigured() },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    const publicBody = { status: "unhealthy", timestamp: new Date().toISOString() };
    return NextResponse.json(
      detailed
        ? {
            ...publicBody,
            uptimeSeconds: Math.floor(process.uptime()),
            database: { status: "disconnected", error: error.message || "Database connection failed" },
          }
        : publicBody,
      { status: 503, headers: NO_STORE }
    );
  }
}
