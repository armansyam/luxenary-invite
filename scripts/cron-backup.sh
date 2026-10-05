#!/bin/bash
# Dijalankan cron tiap hari: memanggil /api/cron/backup dan melaporkan hasilnya ke pemantau heartbeat
# (HEALTHCHECK_BACKUP_PING_URL). Backup dianggap sehat hanya bila snapshot dibuat DAN terunggah off-site;
# selain itu (galat HTTP, auto-backup dimatikan, unggahan R2 gagal) dilaporkan sebagai gagal.

cd "$(dirname "$0")/.." || exit 1
. scripts/lib-heartbeat.sh

BASE_URL="${APP_URL:-http://localhost:3001}"
LOG="logs/cron-backup.log"
ts() { date '+%Y-%m-%d %H:%M:%S %z'; }
mkdir -p logs

resp=$(curl -sS -m 300 -X POST -H @data/.cron-auth "$BASE_URL/api/cron/backup" 2>&1)

if printf '%s' "$resp" | grep -q '"success":true' && ! printf '%s' "$resp" | grep -q '"warning"'; then
  echo "$(ts) backup berhasil" >> "$LOG"
  heartbeat HEALTHCHECK_BACKUP_PING_URL
else
  echo "$(ts) backup GAGAL: ${resp:0:300}" >> "$LOG"
  heartbeat HEALTHCHECK_BACKUP_PING_URL /fail
  exit 1
fi
