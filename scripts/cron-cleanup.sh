#!/bin/bash
# Dijalankan cron tiap hari (02:00): memanggil /api/cron/cleanup, mencatat ringkasan ke logs/cron-cleanup.log,
# dan mengirim denyut ke pemantau eksternal (HEALTHCHECK_CLEANUP_PING_URL) bila dikonfigurasi.

cd "$(dirname "$0")/.." || exit 1
. scripts/lib-heartbeat.sh

BASE_URL="${APP_URL:-http://localhost:3001}"
LOG="logs/cron-cleanup.log"
ts() { date '+%Y-%m-%d %H:%M:%S %z'; }
mkdir -p logs

resp=$(curl -sS -m 300 -X POST -H @data/.cron-auth "$BASE_URL/api/cron/cleanup" 2>&1)

if printf '%s' "$resp" | grep -q '"success":true'; then
  msg=$(printf '%s' "$resp" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p')
  if [ -n "$msg" ]; then
    echo "$(ts) cleanup berhasil: ${msg:0:300}" >> "$LOG"
  else
    echo "$(ts) cleanup berhasil" >> "$LOG"
  fi
  heartbeat HEALTHCHECK_CLEANUP_PING_URL
else
  echo "$(ts) cleanup GAGAL: ${resp:0:300}" >> "$LOG"
  heartbeat HEALTHCHECK_CLEANUP_PING_URL /fail
  exit 1
fi
