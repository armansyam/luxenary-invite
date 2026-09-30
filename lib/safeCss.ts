const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.%\s,/-]+\)$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i;

/**
 * Menormalkan nilai warna dari input pengguna sebelum masuk ke atribut `style`.
 * Hanya hex, rgb()/hsl() numerik, dan nama warna huruf. Selain itu diganti `fallback`.
 */
export function safeCssColor(input: unknown, fallback = "transparent"): string {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (HEX_COLOR.test(value) || FUNCTIONAL_COLOR.test(value) || NAMED_COLOR.test(value)) return value;
  return fallback;
}
