/**
 * Slot media yang belum diisi menghasilkan rujukan kosong di master tulisan tangan: `url('')` di CSS dan `<img src="">`.
 * `url('')` diganti `none` (sah sebagai nilai gambar latar, juga di dalam daftar lapisan) supaya peramban tidak mengira
 * itu alamat dokumen; `<img src="">` dibuang karena hanya menampilkan teks alt atau ikon gambar rusak.
 * Gambar ber-`id` dibiarkan: itu milik skrip yang mengisi `src` belakangan (mis. pratinjau unggahan kamera tamu).
 */
export function stripEmptyMediaRefs(html: string): string {
  return html
    .replace(/url\(\s*(?:''|""|)\s*\)/g, "none")
    .replace(/<img\b[^>]*?\ssrc=(?:""|'')[^>]*>/gi, (tag) => (/\sid\s*=/i.test(tag) ? tag : ""));
}
