"use client";

import { useEffect, useState } from "react";

type VersionInfo = { version: string; hash?: string };

const RELEASE_1_0_SCOPE = [
  "Pemesanan paket dengan payment gateway atau transfer manual yang disetujui admin",
  "Studio undangan: tema, media slot, jadwal acara, vendor, amplop digital dan QRIS",
  "Daftar tamu, kirim undangan lewat WhatsApp, RSVP dan ucapan",
  "Check-in tamu dengan QR dan PIN resepsionis",
  "Momen acara, galeri, dan statistik kunjungan undangan",
  "Penyimpanan media di Cloudflare R2, backup database dan pembersihan otomatis lewat cron",
];

export function AdminAboutSettings() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/version")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Gagal memuat versi (HTTP ${res.status})`);
        const data = await res.json();
        if (!cancelled) setInfo({ version: data.version, hash: data.hash });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Tentang Aplikasi</h3>
        <p className="text-sm text-gray-500 mt-1">Versi yang sedang berjalan di server ini dan catatan rilisnya.</p>
      </div>

      {error && <div className="p-3 rounded-xl text-sm font-medium bg-rose-50 text-rose-700">{error}</div>}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4">
          <dt className="text-xs font-semibold text-gray-500">Versi</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{info ? `v${info.version}` : "..."}</dd>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <dt className="text-xs font-semibold text-gray-500">Build (commit)</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900 font-mono">{info ? info.hash || "tidak diketahui" : "..."}</dd>
        </div>
      </dl>

      <hr className="border-gray-100" />

      <div>
        <h4 className="text-sm font-bold text-gray-900">Versi 1.0</h4>
        <p className="text-sm text-gray-600 mt-1">
          Versi 1.0 adalah rilis pertama S-Invite yang disempurnakan untuk siap live produksi. Seluruh alur di bawah ini
          sudah diuji ujung ke ujung sebelum rilis.
        </p>
        <ul className="mt-3 space-y-2">
          {RELEASE_1_0_SCOPE.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-gray-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
