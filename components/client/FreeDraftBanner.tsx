"use client";

import Link from "next/link";

const RETENTION_DAYS = 14;

export function FreeDraftBanner({
  createdAt,
  compact = false,
}: {
  createdAt?: string | Date | null;
  compact?: boolean;
}) {
  let daysLeft = RETENTION_DAYS;
  if (createdAt) {
    const createdMs = new Date(createdAt).getTime();
    if (!Number.isNaN(createdMs)) {
      const elapsedDays = Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
      daysLeft = Math.max(1, RETENTION_DAYS - Math.max(0, elapsedDays));
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
          Maksimal 3 foto unggahan, unggah audio/video terkunci, pratinjau bertanda air, dan tidak dapat dipublikasikan hingga paket diaktifkan.
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
