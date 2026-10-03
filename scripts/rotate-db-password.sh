#!/usr/bin/env bash
# Rotasi password user PostgreSQL aplikasi (di PostgreSQL DAN di .env) dalam satu langkah, dengan pemulihan otomatis.
#
# Dijalankan dari Mac lewat SSH (skrip dibaca dari stdin, jadi tidak perlu disalin ke server):
#   Pemeriksaan saja (tidak mengubah apa pun):
#     ssh -i KUNCI.pem USER@HOST 'DRY_RUN=1 bash -s' < scripts/rotate-db-password.sh
#   Ganti sungguhan:
#     ssh -i KUNCI.pem USER@HOST 'CONFIRM=ya bash -s' < scripts/rotate-db-password.sh
#
# Password baru dibuat di server dan tidak pernah dicetak. Bila langkah mana pun gagal setelah password diganti,
# skrip mengembalikan password lama di PostgreSQL dan .env lama, lalu me-restart aplikasi.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/amsdev/luxenary-invite}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3001/api/health}"
PM2_APP="${PM2_APP:-luxenary-invite}"
BASE_URL="${HEALTH_URL%/api/health}"

say() { printf '%s\n' "$*"; }
die() { printf 'GAGAL: %s\n' "$*" >&2; exit 1; }

if [ "${CONFIRM:-}" != "ya" ] && [ "${DRY_RUN:-}" != "1" ]; then
  die "Skrip ini mengganti password database produksi. Jalankan dengan DRY_RUN=1 (hanya pemeriksaan) atau CONFIRM=ya (ganti sungguhan)."
fi

cd "$APP_DIR" || die "Folder aplikasi tidak ditemukan: $APP_DIR"
[ -f .env ] || die "Berkas .env tidak ada di $APP_DIR"
[ -f scripts/pg-env.cjs ] || die "scripts/pg-env.cjs tidak ada (jalankan deploy terbaru dulu)"
for tool in psql pg_dump openssl curl; do command -v "$tool" >/dev/null || die "Perintah '$tool' tidak tersedia di server"; done

env_value() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true; }
OLD_URL=$(env_value DATABASE_URL)
[ -n "$OLD_URL" ] || die "DATABASE_URL tidak ditemukan di .env"
NODE_BIN_DIR=$(env_value NODE_BIN_DIR)
NODE="${NODE_BIN_DIR:+$NODE_BIN_DIR/}node"
command -v "$NODE" >/dev/null || die "Node tidak ditemukan ($NODE)"

# Kredensial dipecah pada '@' TERAKHIR, sehingga password lama yang memuat '@' tetap terbaca benar.
eval "$(DB_URL="$OLD_URL" "$NODE" scripts/pg-env.cjs)"
OLDPW="${PGPASSWORD:-}"
ROLE="$PGUSER"
DBNAME="$PGDATABASE"
SUFFIX="${OLD_URL##*@}"

say "== Pemeriksaan awal"
[ "$(psql -Atc 'select current_user')" = "$ROLE" ] || die "Login ke PostgreSQL dengan password saat ini gagal"
say "login PostgreSQL sebagai '$ROLE' ke database '$DBNAME': OK"
curl -fsS -m 8 "$HEALTH_URL" 2>/dev/null | grep -q healthy || die "Aplikasi tidak sehat sebelum rotasi ($HEALTH_URL)"
say "aplikasi sehat sebelum rotasi: OK"
command -v pm2 >/dev/null || die "pm2 tidak tersedia"
say "pm2 tersedia: OK"

if [ "${DRY_RUN:-}" = "1" ]; then
  say ""
  say "DRY_RUN selesai: semua prasyarat terpenuhi. Tidak ada yang diubah."
  exit 0
fi

STAMP=$(date +%F_%H%M%S)
PRE_DUMP="data/backups/pre-rotate_${STAMP}.dump"
mkdir -p data/backups
say "== Backup database sebelum rotasi"
pg_dump -Fc -f "$PRE_DUMP"
say "tersimpan: $PRE_DUMP"

cp -p .env ".env.bak-${STAMP}"
chmod 600 ".env.bak-${STAMP}"

ROTATED=0
DONE=0
rollback() {
  say "== Memulihkan keadaan semula"
  if [ "$ROTATED" = "1" ]; then
    local escaped="${OLDPW//\'/\'\'}"
    if printf "ALTER ROLE \"%s\" WITH PASSWORD '%s';\n" "$ROLE" "$escaped" | PGPASSWORD="$NEWPW" psql -v ON_ERROR_STOP=1 -q; then
      say "password lama dikembalikan di PostgreSQL"
    else
      say "PERINGATAN: password lama GAGAL dikembalikan di PostgreSQL. Cadangan .env ada di: $APP_DIR/.env.bak-${STAMP}"
    fi
  fi
  [ -f ".env.bak-${STAMP}" ] && cp -p ".env.bak-${STAMP}" .env && say ".env lama dipulihkan"
  rm -f .env.new
  pm2 restart "$PM2_APP" >/dev/null 2>&1 && say "aplikasi di-restart dengan konfigurasi lama" || say "PERINGATAN: restart aplikasi gagal, jalankan: pm2 restart $PM2_APP"
}
abort() { trap - ERR; printf 'GAGAL: %s\n' "$*" >&2; rollback; exit 1; }
on_error() { local rc=$?; trap - ERR; printf 'GAGAL (kode %s) pada baris %s.\n' "$rc" "${BASH_LINENO[0]}" >&2; rollback; exit "$rc"; }
trap on_error ERR

NEWPW=$(openssl rand -hex 16)
[ "${#NEWPW}" -eq 32 ] || abort "pembuatan password baru gagal"

grep -v '^DATABASE_URL=' .env > .env.new
printf 'DATABASE_URL="postgresql://%s:%s@%s"\n' "$ROLE" "$NEWPW" "$SUFFIX" >> .env.new
chmod --reference=.env .env.new 2>/dev/null || chmod 600 .env.new

say "== Mengganti password di PostgreSQL"
printf "ALTER ROLE \"%s\" WITH PASSWORD '%s';\n" "$ROLE" "$NEWPW" | psql -v ON_ERROR_STOP=1 -q
ROTATED=1
mv .env.new .env
say "password PostgreSQL dan .env sudah diganti"

[ "$(PGPASSWORD="$NEWPW" psql -h "$PGHOST" -p "${PGPORT:-5432}" -U "$ROLE" -d "$DBNAME" -Atc 'select 1')" = "1" ] \
  || abort "login dengan password baru gagal"
say "login dengan password baru: OK"

say "== Restart aplikasi dan uji"
pm2 restart "$PM2_APP" >/dev/null
healthy=0
for _ in $(seq 1 20); do
  sleep 3
  if curl -fsS -m 6 "$HEALTH_URL" 2>/dev/null | grep -q healthy; then healthy=1; break; fi
done
[ "$healthy" = "1" ] || abort "aplikasi tidak sehat setelah restart"
say "aplikasi sehat setelah restart: OK"

if [ -f data/.cron-auth ]; then
  resp=$(curl -sS -m 180 -X POST -H @data/.cron-auth "$BASE_URL/api/cron/backup" 2>&1 || true)
  case "$resp" in
    *'"success":true'*) say "backup lewat aplikasi (memakai password baru): OK" ;;
    *dinonaktifkan*)    say "backup otomatis dinonaktifkan di pengaturan: dilewati" ;;
    *) abort "backup lewat aplikasi gagal: ${resp:0:200}" ;;
  esac
else
  say "data/.cron-auth tidak ada: uji backup dilewati"
fi

DONE=1
trap - ERR
if command -v shred >/dev/null; then shred -u ".env.bak-${STAMP}"; else rm -f ".env.bak-${STAMP}"; fi
say ""
say "SELESAI. Password database berhasil dirotasi."
say "- Cadangan .env lama (berisi password lama) sudah dihapus."
say "- Backup sebelum rotasi tetap ada: $APP_DIR/$PRE_DUMP"
