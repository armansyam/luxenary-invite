#!/bin/bash
# Smoke test pasca-deploy: memeriksa hal terpenting dari luar proses (HTTP nyata). Pemakaian: scripts/smoke-test.sh [BASE_URL]
# Hanya memakai undangan demo, tidak menulis data. Exit 1 bila ada pemeriksaan yang gagal.

BASE="${1:-http://localhost:3001}"
FAILS=0
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

check() {
  local name="$1" expected="$2" got="$3"
  if [ "$got" = "$expected" ]; then
    echo "  ok     $name"
  else
    echo "  GAGAL  $name (diharapkan: $expected, didapat: $got)"
    FAILS=$((FAILS + 1))
  fi
}

code() { curl -s -o "$TMP" -m 20 -w '%{http_code}' "$@"; }

echo "Smoke test: $BASE"
check "GET /api/health" 200 "$(code "$BASE/api/health")"
check "health memuat 'healthy'" 1 "$(grep -c '"healthy"' "$TMP")"
check "GET /" 200 "$(code "$BASE/")"
check "tanpa header X-Powered-By" 0 "$(curl -sI -m 20 "$BASE/" | grep -ci '^x-powered-by')"
check "GET /login" 200 "$(code "$BASE/login")"
check "GET /demo" 200 "$(code "$BASE/demo")"
check "GET /halaman-tidak-ada" 404 "$(code "$BASE/halaman-tidak-ada-smoke")"
check "GET /api/public/qr" 200 "$(code "$BASE/api/public/qr?data=smoke")"
check "QR berupa SVG" 1 "$(head -c 4 "$TMP" | grep -c '<svg')"
check "RSVP status tidak sah ditolak" 400 "$(code -X POST -H 'content-type: application/json' -d '{"invitationId":"demo","guestName":"Smoke","status":"APA-SAJA"}' "$BASE/api/public/rsvp")"
check "RSVP demo TIDAK_HADIR diterima" 200 "$(code -X POST -H 'content-type: application/json' -d '{"invitationId":"demo","guestName":"Smoke","status":"TIDAK_HADIR"}' "$BASE/api/public/rsvp")"
check "admin tanpa sesi ditolak" 401 "$(code "$BASE/api/admin/orders")"

if [ "$FAILS" -gt 0 ]; then
  echo "Smoke test: $FAILS pemeriksaan gagal"
  exit 1
fi
echo "Smoke test: semua pemeriksaan lolos"
