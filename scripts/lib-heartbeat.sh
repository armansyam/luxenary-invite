#!/bin/bash
# Pustaka kecil untuk skrip cron: mengirim "denyut" ke layanan pemantau eksternal (healthchecks.io, atau layanan lain
# yang memakai pola URL yang sama: <URL> bila sehat, <URL>/fail bila gagal). Layanan itulah yang memberi tahu pemilik
# lewat email atau chat bila denyut berhenti, sehingga alert tetap sampai walau seluruh server mati.
#
# Pemakaian (dari folder aplikasi):  . scripts/lib-heartbeat.sh; heartbeat NAMA_VARIABEL [/fail]
# URL dibaca dari lingkungan atau dari .env. Tanpa URL, tidak melakukan apa pun. Kegagalan mengirim tidak pernah
# menggagalkan skrip pemanggil, dan URL tidak pernah dicetak karena memuat tanda pengenal rahasia.
heartbeat() {
  local url="${!1:-}"
  if [ -z "$url" ] && [ -f .env ]; then
    url=$(grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  [ -n "$url" ] || return 0
  curl -fsS -m 10 -o /dev/null "${url}${2:-}" >/dev/null 2>&1 || true
}
