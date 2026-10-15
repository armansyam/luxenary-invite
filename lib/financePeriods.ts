/**
 * Periode keuangan (omzet, tutup buku, pajak) dihitung pada WIB, bukan zona waktu server: VPS umumnya berjalan di UTC,
 * sehingga transaksi pukul 00.00–07.00 WIB tanggal 1 akan masuk ke bulan sebelumnya.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Awal bulan (00.00 WIB). `monthIndex` 0-11; nilai di luar rentang digulirkan ke tahun berikut/sebelumnya. */
export function wibMonthStart(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1) - WIB_OFFSET_MS);
}

/** Awal hari (00.00 WIB) dari tanggal kalender WIB yang memuat `instant`. */
export function wibDayStart(instant: Date): Date {
  const wib = new Date(instant.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS);
}

/** Tanggal kalender WIB `YYYY-MM-DD` dari sebuah instan. */
export function wibDateKey(instant: Date): string {
  return new Date(instant.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Tahun, bulan (0-11), dan tanggal kalender WIB dari sebuah instan. */
export function wibParts(instant: Date): { year: number; monthIndex: number; day: number } {
  const wib = new Date(instant.getTime() + WIB_OFFSET_MS);
  return { year: wib.getUTCFullYear(), monthIndex: wib.getUTCMonth(), day: wib.getUTCDate() };
}
