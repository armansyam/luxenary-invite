"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_MAX_PHOTOS = 3;

let cachedLimits: { retentionDays: number; maxPhotos: number } | null = null;
let pendingFetch: Promise<{ retentionDays: number; maxPhotos: number }> | null = null;

function loadFreeDraftLimits(): Promise<{ retentionDays: number; maxPhotos: number }> {
  if (cachedLimits) return Promise.resolve(cachedLimits);
  if (!pendingFetch) {
    pendingFetch = fetch("/api/public/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const retentionDays =
          Number.isFinite(Number(data?.freeDraftRetentionDays)) && Number(data?.freeDraftRetentionDays) >= 1
            ? Number(data.freeDraftRetentionDays)
            : DEFAULT_RETENTION_DAYS;
        const maxPhotos =
          Number.isFinite(Number(data?.freeDraftMaxPhotos)) && Number(data?.freeDraftMaxPhotos) >= 1
            ? Number(data.freeDraftMaxPhotos)
            : DEFAULT_MAX_PHOTOS;
        cachedLimits = { retentionDays, maxPhotos };
        return cachedLimits;
      })
      .catch(() => ({ retentionDays: DEFAULT_RETENTION_DAYS, maxPhotos: DEFAULT_MAX_PHOTOS }))
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

export function FreeDraftBanner({
  createdAt,
  compact = false,
  retentionDays: retentionDaysProp,
  maxPhotos: maxPhotosProp,
}: {
  createdAt?: string | Date | null;
  compact?: boolean;
  retentionDays?: number;
  maxPhotos?: number;
}) {
  const [limits, setLimits] = useState<{ retentionDays: number; maxPhotos: number }>(() => ({
    retentionDays: retentionDaysProp ?? cachedLimits?.retentionDays ?? DEFAULT_RETENTION_DAYS,
    maxPhotos: maxPhotosProp ?? cachedLimits?.maxPhotos ?? DEFAULT_MAX_PHOTOS,
  }));

  useEffect(() => {
    if (retentionDaysProp !== undefined && maxPhotosProp !== undefined) return;
    let cancelled = false;
    void loadFreeDraftLimits().then((resolved) => {
      if (!cancelled) {
        setLimits({
          retentionDays: retentionDaysProp ?? resolved.retentionDays,
          maxPhotos: maxPhotosProp ?? resolved.maxPhotos,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [retentionDaysProp, maxPhotosProp]);

  let daysLeft = limits.retentionDays;
  if (createdAt) {
    const createdMs = new Date(createdAt).getTime();
    if (!Number.isNaN(createdMs)) {
      const elapsedDays = Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
      daysLeft = Math.max(1, limits.retentionDays - Math.max(0, elapsedDays));
    }
  }

  return (
    <div
      className={`rounded-2xl border border-amber-300/80 bg-amber-50/90 text-amber-950 ${
        compact ? "px-3.5 py-2.5" : "px-4 py-3 sm:px-5"
      } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Mode Draf Gratis ({daysLeft} hari tersisa)
          </span>
        </div>
        <p className="text-xs text-amber-900/90 leading-relaxed">
          Maksimal {limits.maxPhotos} foto unggahan, unggah audio/video terkunci, pratinjau bertanda air, dan tidak dapat dipublikasikan hingga paket diaktifkan.
        </p>
      </div>

      <Link
        href="/packages"
        className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold transition shadow-2xs"
      >
        Aktifkan Paket &amp; Publikasikan
      </Link>
    </div>
  );
}
