import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { masterTemplateCache, publishedHtmlCache, invitationLookupCache } from "@/lib/cache";
import { getActiveRateLimitDriver } from "@/lib/rateLimit";
import { isErrorTrackingConfigured } from "@/lib/errorTracker";

export const dynamic = "force-dynamic";

/**
 * Enterprise Production Health Check Endpoint
 * Digunakan oleh Caddy reverse proxy, Kubernetes liveness probes,
 * AWS Target Group healthchecks, dan Uptime Monitoring (BetterStack/UptimeRobot).
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verifikasi konektivitas nyata PostgreSQL via raw ping query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

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
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: "disconnected",
          error: error.message || "Database connection failed",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
