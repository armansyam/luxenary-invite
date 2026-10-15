/**
 * Satu sel CSV yang aman dibuka di Excel/Sheets: dikutip, tanda kutip digandakan, dan nilai yang diawali `=`, `+`, `-`,
 * `@`, tab, atau CR diberi awalan `'` agar tidak dieksekusi sebagai formula (isi seperti nama tamu dan ucapan RSVP
 * ditulis oleh pengunjung anonim).
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const neutralized = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${neutralized.replace(/"/g, '""')}"`;
}
