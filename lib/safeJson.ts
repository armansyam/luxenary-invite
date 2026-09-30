const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/**
 * Serialisasi JSON yang aman ditanam di dalam tag <script> pada HTML.
 * JSON.stringify saja tidak meloloskan `<` (sehingga `</script>` menutup skrip lebih awal)
 * dan pemisah baris Unicode (U+2028/U+2029) yang diperlakukan sebagai newline oleh literal JS lama.
 */
export function jsonForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEPARATOR, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR, "\\u2029");
}
