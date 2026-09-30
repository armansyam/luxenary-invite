#!/bin/bash
# Dijalankan cron tiap menit. Menjalankan ulang luxenary-invite bila /api/health tidak merespons sama sekali
# (HTTP 000: timeout atau koneksi ditolak) 3 kali berturut-turut. PM2 hanya merestart proses yang crash, bukan yang hidup tetapi macet.
# Respons HTTP apa pun (mis. 503 saat database bermasalah) tidak memicu restart karena restart tidak memperbaikinya.
# Batas satu restart per 15 menit agar tidak berputar.

cd "$(dirname "$0")/.." || exit 1
URL="${HEALTH_URL:-http://localhost:3001/api/health}"
FAILS_FILE="data/.health-watch-fails"
RESTART_MARK="data/.health-watch-restart"
LOG="logs/health-watch.log"
ts() { date '+%Y-%m-%d %H:%M:%S %z'; }

code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$URL")

if [ "$code" = "200" ]; then
  if [ -s "$FAILS_FILE" ]; then
    echo "$(ts) pulih: HTTP 200 setelah $(cat "$FAILS_FILE") kegagalan berturut-turut" >> "$LOG"
  fi
  rm -f "$FAILS_FILE"
  exit 0
fi

fails=$(( $(cat "$FAILS_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$fails" > "$FAILS_FILE"
echo "$(ts) health HTTP $code (gagal berturut-turut: $fails)" >> "$LOG"

if [ "$code" = "000" ] && [ "$fails" -ge 3 ] && [ -z "$(find "$RESTART_MARK" -mmin -15 2>/dev/null)" ]; then
  touch "$RESTART_MARK"
  echo "$(ts) tidak merespons $fails kali berturut-turut: pm2 restart luxenary-invite" >> "$LOG"
  pm2 restart luxenary-invite >> "$LOG" 2>&1
fi
