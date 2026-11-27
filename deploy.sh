#!/bin/bash

# ==============================================================================
# LUXENARY INVITE - AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

echo "🚀 Memulai proses deployment otomatis..."

# 1. Tarik pembaruan terbaru dari repository
echo "📦 Menarik pembaruan terbaru dari Git (origin main)..."
export PREVIOUS_COMMIT=${PREVIOUS_COMMIT:-$(git rev-parse HEAD)}
if ! git pull --ff-only origin main; then
  echo "❌ Error: Gagal menarik perubahan terbaru dari Git origin main! Deployment dihentikan untuk mencegah corrupt build."
  # Sebelum 21 Okt 2026 unggahan admin (aset demo, logo, favicon, master tema) menimpa berkas yang dilacak git.
  LOCAL_UPLOADS=$(git status --porcelain -- public/demo public/assets/brand public/favicon.ico app/icon.png app/apple-icon.png themes)
  if [ -n "$LOCAL_UPLOADS" ]; then
    echo "   Berkas berikut diubah di server (unggahan admin lama) dan menghalangi pull:"
    echo "$LOCAL_UPLOADS" | sed 's/^/     /'
    echo "   Salin berkas itu ke tempat aman, kembalikan ke versi git, lalu deploy ulang dan unggah ulang lewat panel admin."
  fi
  exit 1
fi

# Bash membaca skrip secara bertahap; bila git pull mengganti deploy.sh ini, sisa eksekusi memakai versi lama.
# Jalankan ulang skrip hasil pull sekali (DEPLOY_REEXEC mencegah pengulangan).
if [ -z "$DEPLOY_REEXEC" ] && [ "$(git rev-parse HEAD)" != "$PREVIOUS_COMMIT" ]; then
  export DEPLOY_REEXEC=1
  exec bash "$0" "$@"
fi

if [ "${REQUIRE_CI_PASS:-0}" = "1" ]; then
  if ! command -v gh > /dev/null 2>&1; then
    echo "❌ REQUIRE_CI_PASS=1 tetapi GitHub CLI (gh) tidak terpasang. Deployment dihentikan."
    exit 1
  fi
  HEAD_SHA=$(git rev-parse HEAD)
  CI_STATUS=$(gh run list --commit "$HEAD_SHA" --workflow ci.yml --limit 1 --json status,conclusion --jq '.[0] | "\(.status):\(.conclusion)"' 2>/dev/null || echo "")
  if [ "$CI_STATUS" != "completed:success" ]; then
    echo "❌ CI belum lulus untuk commit $HEAD_SHA ($CI_STATUS). Deployment dibatalkan."
    exit 1
  fi
  echo "✅ Verifikasi CI lulus untuk commit $HEAD_SHA."
fi

# Server 2 inti: npm ci, build, dan kompilasi demo menghabiskan CPU sehingga aplikasi yang sedang melayani tidak menjawab
# /api/health dalam 10 detik, dan scripts/health-watch.sh me-restart-nya di tengah deploy (18 Nov 2026, 12:42–12:45).
# Tahap berat dijalankan dengan prioritas rendah, dan berkas kunci memberi tahu health-watch bahwa deploy sedang berjalan.
DEPLOY_LOCK="data/.deploy-running"
mkdir -p data
echo $$ > "$DEPLOY_LOCK"
trap 'rm -rf "$DEPLOY_LOCK" data/.lb-drain .deps-stage .deps-old' EXIT
LOW_PRIORITY="nice -n 19"
command -v ionice > /dev/null && LOW_PRIORITY="ionice -c2 -n7 $LOW_PRIORITY"

# Setelah git pull, npm ci menghapus lalu memasang ulang node_modules dan prisma generate menimpa klien Prisma, sedangkan
# PM2 masih menjalankan build lama. Bila tahap itu atau build gagal, kode dan dependensi dikembalikan ke rilis yang
# berjalan agar restart PM2 berikutnya (mis. setelah crash) tidak memuat dependensi baru dengan build lama.
restore_previous_release() {
  echo "↩️ Memulihkan kode dan dependensi ke rilis sebelumnya ($PREVIOUS_COMMIT)..."
  if git reset --keep "$PREVIOUS_COMMIT" && npm ci && npx prisma generate; then
    echo "✅ Rilis sebelumnya dipulihkan; aplikasi yang berjalan tidak terpengaruh."
  else
    echo "🚨 Pemulihan rilis sebelumnya GAGAL; node_modules mungkin tidak utuh. Jalankan manual: git reset --keep $PREVIOUS_COMMIT && npm ci && npx prisma generate"
  fi
}

# 2. Setup Direktori Runtime
echo "📁 Menyiapkan direktori runtime..."
mkdir -p logs public/uploads data

# 3. Setup Environment Variables
echo "⚙️ Memeriksa konfigurasi Environment Variables (.env)..."
if [ ! -f .env ]; then
  echo "⚠️ File .env tidak ditemukan! Membuat otomatis dari .env.example..."
  cp .env.example .env
fi

# Generate Secrets jika masih kosong di .env
AUTH_SECRET=$(grep -E "^AUTH_SECRET=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" == '""' ]; then
  echo "🔐 Men-generate AUTH_SECRET baru yang aman..."
  NEW_SECRET=$(openssl rand -base64 32)
  if grep -q -E "^AUTH_SECRET=" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$NEW_SECRET\"|" .env
    else
      sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$NEW_SECRET\"|" .env
    fi
  else
    echo "AUTH_SECRET=\"$NEW_SECRET\"" >> .env
  fi
fi

# Hanya perbarui NEXTAUTH_SECRET jika memang tercantum kosong di .env (NextAuth v5 memakai AUTH_SECRET).
if grep -q -E "^NEXTAUTH_SECRET=" .env; then
  NEXTAUTH_SECRET=$(grep -E "^NEXTAUTH_SECRET=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" == '""' ]; then
    echo "🔐 Men-generate NEXTAUTH_SECRET baru yang aman..."
    NEW_NEXT_SECRET=${NEW_SECRET:-$(openssl rand -base64 32)}
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_NEXT_SECRET\"|" .env
    else
      sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_NEXT_SECRET\"|" .env
    fi
  fi
fi

# Kunci enkripsi Server Actions wajib sama di semua server aplikasi (docs Next: self-hosting, Multi-Server Deployments);
# tanpa ini Next membuat kunci acak per build dan aksi dari server lain gagal "Failed to find Server Action".
# Server utama membuatnya sekali; salin nilainya ke .env replika.
if [ "$(grep -E "^LUX_SERVER_ROLE=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")" != "replica" ] && [ -z "$(grep -E "^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")" ]; then
  echo "🔐 Men-generate NEXT_SERVER_ACTIONS_ENCRYPTION_KEY..."
  grep -v -E "^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=" .env > .env.tmp && mv .env.tmp .env
  echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=\"$(openssl rand -base64 32)\"" >> .env
  chmod 600 .env
fi

# Generate CRON_SECRET jika masih kosong
CRON_SECRET=$(grep -E "^CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$CRON_SECRET" ] || [ "$CRON_SECRET" == '""' ]; then
  echo "🔐 Men-generate CRON_SECRET baru yang aman..."
  NEW_CRON_SECRET=$(openssl rand -base64 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^CRON_SECRET=.*|CRON_SECRET=\"$NEW_CRON_SECRET\"|" .env
  else
    sed -i "s|^CRON_SECRET=.*|CRON_SECRET=\"$NEW_CRON_SECRET\"|" .env
  fi
fi

# Generate PIN_ENCRYPTION_KEY jika masih kosong
PIN_KEY=$(grep -E "^PIN_ENCRYPTION_KEY=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ -z "$PIN_KEY" ] || [ "$PIN_KEY" == '""' ]; then
  echo "🔐 Men-generate PIN_ENCRYPTION_KEY baru yang aman..."
  NEW_PIN_KEY=$(openssl rand -hex 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^PIN_ENCRYPTION_KEY=.*|PIN_ENCRYPTION_KEY=\"$NEW_PIN_KEY\"|" .env
  else
    sed -i "s|^PIN_ENCRYPTION_KEY=.*|PIN_ENCRYPTION_KEY=\"$NEW_PIN_KEY\"|" .env
  fi
fi

# 3a. Runtime Node khusus aplikasi (opsional): NODE_BIN_DIR di .env, mis. /home/amsdev/node22/bin.
# Dipakai untuk npm ci, build, seed, dan sebagai interpreter PM2, agar sama persis dengan runtime produksi
# tanpa mengubah Node sistem yang dipakai aplikasi lain di server ini.
SYSTEM_PATH="$PATH"
NODE_BIN_DIR=$(grep -E "^NODE_BIN_DIR=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ -n "$NODE_BIN_DIR" ]; then
  if [ ! -x "$NODE_BIN_DIR/node" ]; then
    echo "❌ NODE_BIN_DIR ($NODE_BIN_DIR) tidak berisi node yang dapat dijalankan. Deployment dihentikan."
    exit 1
  fi
  export PATH="$NODE_BIN_DIR:$PATH"
fi
# 3b. Peran server (LUX_SERVER_ROLE di .env). Server utama (bawaan) menjalankan migrasi, seed, kompilasi demo, cron
# pemeliharaan, dan backup. Server replika memakai database dan bucket yang sama: tidak menyentuh skema atau data, membangun
# HTML terbit/demo sendiri saat diminta, dan menarik berkas buatan server lain (lib/sharedFiles.ts). Deploy server utama
# lebih dulu; replika menolak berjalan bila masih ada migrasi yang belum diterapkan.
SERVER_ROLE=$(grep -E "^LUX_SERVER_ROLE=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
IS_REPLICA=false
if [ "$SERVER_ROLE" = "replica" ]; then
  IS_REPLICA=true
  echo "🛰️ Server replika: migrasi, seed, kompilasi demo, cron pemeliharaan, dan backup dilewati."
  for KEY in S3_BACKUP_BUCKET_NAME NEXT_SERVER_ACTIONS_ENCRYPTION_KEY LUX_SERVER_NAME; do
    if [ -z "$(grep -E "^$KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")" ]; then
      echo "❌ $KEY wajib diisi di .env replika (LUX_SERVER_NAME: nama unik replika ini; lainnya sama dengan server utama). Deployment dihentikan."
      exit 1
    fi
  done
fi

# Server baru yang belum lengkap: tanpa pemeriksaan ini npm ci gagal dengan pesan menyesatkan, dan pg_dump baru
# ketahuan hilang setelah build selesai.
# Alamat yang didengar aplikasi (ecosystem.config.js). Hanya loopback atau alamat Tailscale (100.64.0.0/10) yang diterima:
# di luar itu port 3001 bisa dipanggil langsung dari internet dengan X-Real-IP palsu.
LUX_BIND_HOST=$(grep -E "^LUX_BIND_HOST=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
LUX_BIND_HOST=${LUX_BIND_HOST:-127.0.0.1}
if [ "$LUX_BIND_HOST" != "127.0.0.1" ] && ! echo "$LUX_BIND_HOST" | grep -Eq '^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}$'; then
  echo "❌ LUX_BIND_HOST=$LUX_BIND_HOST ditolak: hanya 127.0.0.1 atau alamat Tailscale 100.64.0.0/10. Deployment dihentikan."
  exit 1
fi

REQUIRED_BINS="node npm npx openssl curl"
[ "$IS_REPLICA" = false ] && REQUIRED_BINS="$REQUIRED_BINS pg_dump"
for BIN in $REQUIRED_BINS; do
  if ! command -v "$BIN" &> /dev/null; then
    echo "❌ '$BIN' tidak ditemukan di PATH. Pasang dulu (lihat docs/admin/DEPLOYMENT_VPS_CADDY.md Tahap 1-2). Deployment dihentikan."
    exit 1
  fi
done
echo "🟢 Runtime Node untuk deploy: $(node -v) | npm $(npm -v) | $(command -v node)"

# Video dan musik unggahan dikompresi lewat ffmpeg (lib/videoOptimizer.ts). Bila ffmpeg tidak ada atau rusak, unggahan
# disimpan apa adanya tanpa galat: video HEVC dari iPhone tidak diubah ke H.264 dan ukurannya tidak dibatasi.
if ! ffmpeg -hide_banner -version > /dev/null 2>&1; then
  echo "⚠️ ffmpeg tidak terpasang atau tidak dapat dijalankan: video dan musik unggahan TIDAK akan dikompresi."
  echo "   Pasang atau perbaiki: sudo apt install -y ffmpeg"
fi

# Thumbnail katalog otomatis (scripts/theme-thumbnail-worker.ts) dipotret dengan Chrome headless. Tanpa Chrome, status
# thumbnail di Demo Studio menjadi "Gagal" dan thumbnail hanya dapat diunggah manual.
if ! { [ -n "${CHROME_PATH:-}" ] && [ -x "$CHROME_PATH" ]; } && ! command -v google-chrome-stable > /dev/null 2>&1; then
  echo "⚠️ Chrome tidak terpasang: thumbnail katalog otomatis tidak dapat dibuat."
  echo "   Pasang: wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo apt install -y ./google-chrome-stable_current_amd64.deb"
fi

# 4. Install Dependencies (persis sesuai package-lock.json lewat staging terisolasi + hash check)
LOCK_HASH_FILE="data/.deps-lock.sha256"
if command -v sha256sum > /dev/null 2>&1; then
  LOCK_SHA=$(sha256sum package-lock.json | awk '{print $1}')
else
  LOCK_SHA=$(shasum -a 256 package-lock.json | awk '{print $1}')
fi
PREV_LOCK_SHA=$(cat "$LOCK_HASH_FILE" 2>/dev/null || echo "")

if [ "${FORCE_NPM_CI:-0}" != "1" ] && [ -n "$LOCK_SHA" ] && [ "$LOCK_SHA" = "$PREV_LOCK_SHA" ] && [ -d node_modules ]; then
  echo "📦 package-lock.json tidak berubah ($LOCK_SHA); melewati npm ci."
else
  echo "📦 Menginstal dependensi ke direktori staging (.deps-stage)..."
  rm -rf .deps-stage .deps-old
  mkdir -p .deps-stage
  cp package.json package-lock.json .deps-stage/
  if ! (cd .deps-stage && $LOW_PRIORITY npm ci); then
    rm -rf .deps-stage
    echo "❌ npm ci gagal! Deployment dihentikan di staging sebelum menyentuh node_modules & database."
    restore_previous_release
    exit 1
  fi
  if [ -d node_modules ]; then
    mv node_modules .deps-old
  fi
  mv .deps-stage/node_modules node_modules
  rm -rf .deps-old .deps-stage
  echo "$LOCK_SHA" > "$LOCK_HASH_FILE"
fi

# 5. Prisma Client & Build — dijalankan SEBELUM database disentuh.
# Bila build gagal, skema database tetap utuh dan PM2 tetap menjalankan rilis lama.
# Build ke direktori cadangan (.next-a atau .next-b): aplikasi yang sedang berjalan tetap melayani dari direktori
# aktifnya selama build, jadi tidak ada jendela error. Penanda data/.dist-dir baru ditulis setelah migrasi berhasil.
mkdir -p data
ACTIVE_DIST=$(cat data/.dist-dir 2>/dev/null || echo ".next")
case "$ACTIVE_DIST" in .next|.next-a|.next-b) ;; *) ACTIVE_DIST=".next" ;; esac
if [ "$ACTIVE_DIST" = ".next-a" ]; then NEW_DIST=".next-b"; else NEW_DIST=".next-a"; fi
export NEXT_DIST_DIR="$NEW_DIST"
export DEPLOYMENT_VERSION="$(git rev-parse HEAD)"
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(grep -E "^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
rm -rf "$NEW_DIST"
echo "🏗️ Membangun (Build) aplikasi Next.js ke $NEW_DIST... (aplikasi aktif tetap melayani dari $ACTIVE_DIST)"
if ! npx prisma generate; then
  echo "❌ prisma generate gagal! Deployment dihentikan sebelum menyentuh database."
  restore_previous_release
  exit 1
fi
TOTAL_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
if [ -n "$TOTAL_MB" ] && [ "$TOTAL_MB" -lt 3072 ]; then
  export SKIP_BUILD_TYPECHECK=1
  echo "ℹ️ RAM host ${TOTAL_MB} MB: typecheck dilewati di server (gerbang tsc --noEmit dijalankan CI untuk commit ini)."
fi
if ! NODE_OPTIONS="--max-old-space-size=1536" $LOW_PRIORITY npm run build; then
  echo "❌ Build Next.js gagal! Database tidak disentuh dan PM2 tidak di-restart."
  restore_previous_release
  exit 1
fi

# 6. Backup database pra-migrasi (format custom pg_dump; pulihkan dengan pg_restore)
DB_URL=$(grep -E "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
# Kredensial diteruskan lewat PGHOST/PGUSER/PGPASSWORD/PGDATABASE (bukan URL): password di .env dapat memuat '@'
# yang tidak di-encode sehingga parser URL libpq salah membaca host, dan URL tidak boleh tampil di daftar proses atau log.
if ! eval "$(DB_URL="$DB_URL" node scripts/pg-env.cjs)"; then
  echo "❌ DATABASE_URL di .env tidak dapat dibaca. Deployment dihentikan sebelum migrasi."
  exit 1
fi
if [ "$IS_REPLICA" = true ]; then
  # Replika tidak memigrasi: kode baru hanya boleh jalan bila skema sudah diterapkan server utama.
  if ! npx prisma migrate status > /dev/null 2>&1; then
    echo "❌ Skema database belum sesuai rilis ini (migrasi tertunda). Deploy server utama lebih dulu, lalu ulangi."
    restore_previous_release
    exit 1
  fi
  replica_refresh_caches() {
    # HTML terbit dan demo di disk replika dibangun ulang saat diminta dengan kode rilis ini (lib/renderVersion.ts).
    rm -f public/published/ids/*.html public/demo/*/index.html
    LUX_SERVER_ROLE=replica npx tsx scripts/sync-shared-files.ts || echo "⚠️ Tarik berkas bersama gagal — rute dan render akan menarik sendiri saat diminta."
  }
  echo "🧹 Menyiapkan cache replika untuk rilis ini..."
  replica_refresh_caches
fi

if [ "$IS_REPLICA" = false ]; then
PRE_BACKUP="data/backups/pre-deploy_$(date +%Y-%m-%d_%H%M%S).dump"
mkdir -p data/backups
echo "💾 Membuat backup database pra-migrasi: $PRE_BACKUP"
if ! pg_dump -Fc -f "$PRE_BACKUP"; then
  echo "❌ Backup pra-migrasi gagal! Migrasi dibatalkan agar tidak ada perubahan skema tanpa titik pemulihan."
  exit 1
fi

# 7. Migrasi database. Kegagalan menghentikan deploy; tidak ada fallback ke 'prisma db push'
# karena db push melewati riwayat migrasi dan dapat membuat skema menyimpang.
# Migrasi harus cocok dengan kode rilis sebelumnya yang masih berjalan sampai reload (dan di server replika).
if ! npx tsx scripts/check-migrations.ts; then
  echo "❌ Deployment dihentikan sebelum migrasi; rilis yang berjalan tidak tersentuh."
  restore_previous_release
  exit 1
fi
echo "🗄️ Menerapkan migrasi database (Prisma)..."
if ! npx prisma migrate deploy; then
  echo "❌ Migrasi database gagal! PM2 tidak di-restart (rilis lama tetap berjalan)."
  echo "   Titik pemulihan : $PRE_BACKUP"
  echo "   Pulihkan DB     : eval \"\$(DB_URL=<DATABASE_URL dari .env> node scripts/pg-env.cjs)\" && pg_restore --clean --if-exists --no-owner -d \"\$PGDATABASE\" $PRE_BACKUP"
  echo "   Kode sebelumnya : git switch --detach $PREVIOUS_COMMIT"
  exit 1
fi

# Piring undangan pindah dari data/drafts ke tabel invitation_drafts (idempoten). Diulang setelah reload untuk piring yang
# sempat ditulis proses lama selama deploy.
npx tsx scripts/migrate-drafts-to-db.ts || echo "⚠️ Impor piring disk ke DB gagal — undangan tanpa piring dirender dari master."

# 7a. Data master (idempoten: seed tidak menghapus atau menimpa data yang dikelola admin)
echo "🌱 Menyinkronisasi data master (Admin Settings, Music Presets, Themes)..."
npx prisma db seed || echo "⚠️ Seed gagal — lanjut deployment."
npm run themes:sync || echo "⚠️ Themes sync gagal — lanjut deployment."

# Berkas buatan aplikasi yang belum ada di penyimpanan bersama (unggahan sebelum fitur ini, berkas yang ditaruh manual)
# disalin agar server replika dapat menariknya. Tanpa S3_BACKUP_BUCKET_NAME langkah ini dilewati.
$LOW_PRIORITY npx tsx scripts/share-existing-files.ts --apply || echo "⚠️ Penyalinan berkas ke penyimpanan bersama gagal sebagian — replika belum melihat berkas itu."

# 7b. Kompilasi Cache Demo Tema Statis
echo "🎨 Memastikan cache demo tema statis terkompilasi segar..."
$LOW_PRIORITY npx -y tsx -r dotenv/config -e "import('./lib/demoPublisher.ts').then(m => (m.compileAllStaticDemos || m.default.compileAllStaticDemos)()).then(n => console.log('✅ ' + n + ' demo tema berhasil dikompilasi.')).catch(e => console.warn('⚠️ Gagal pra-kompilasi demo (akan dikompilasi on-demand saat diakses):', e.message));" || true

# 7c. Undangan terbit disajikan dari snapshot public/published/ids/<id>.html, jadi perbaikan mesin tema (lib/themeEngine.ts)
# tidak sampai ke undangan lama tanpa dibangun ulang. --keep-drafts: piring template klien tetap beku, hanya mesin tema baru.
# Dijalankan sebelum reload (server baru membaca berkas yang sudah baru) dan sekali lagi setelah health check (purge ulang
# Cloudflare atas salinan lama yang sempat dicache tepi dari server lama dalam jeda reload).
refresh_published_html() {
  npx tsx scripts/refresh-theme-drafts.ts --apply --keep-drafts || echo "⚠️ Bangun ulang HTML terbit gagal sebagian — periksa baris GAGAL di atas."
}
echo "🧱 Membangun ulang HTML undangan terbit dengan mesin tema rilis ini..."
refresh_published_html
fi

# 8. Restart Server & Persist PM2
# Migrasi sudah berhasil: dari sini aplikasi dijalankan dari direktori build baru (dibaca ecosystem.config.js, dan
# diteruskan ke 'pm2 reload --update-env' lewat NEXT_DIST_DIR yang sudah di-export).
echo "$NEW_DIST" > data/.dist-dir
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
  # Di belakang pembagi beban (Caddy), /api/health menjawab 503 selama penanda ini ada, sehingga server ini dikeluarkan
  # dari pembagian sebelum PM2 di-reload. LB_DRAIN_SECONDS (.env) = jeda cek kesehatan pembagi beban; kosong = 0 (satu server).
  LB_DRAIN_SECONDS=$(grep -E "^LB_DRAIN_SECONDS=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  touch data/.lb-drain
  if [ -n "$LB_DRAIN_SECONDS" ] && [ "$LB_DRAIN_SECONDS" -gt 0 ] 2>/dev/null; then
    echo "⏳ Menunggu ${LB_DRAIN_SECONDS} detik agar pembagi beban berhenti mengirim permintaan ke server ini..."
    sleep "$LB_DRAIN_SECONDS"
  fi
  # Daemon PM2 dipakai bersama aplikasi lain dan modul pm2-logrotate mewarisi PATH perintah ini; kembalikan ke Node sistem.
  export PATH="$SYSTEM_PATH"
  echo "🪵 Memastikan rotasi log PM2 (anti-disk leak) aktif..."
  if ! pm2 list | grep -q "pm2-logrotate"; then
    pm2 install pm2-logrotate --silent || true
  fi
  pm2 set pm2-logrotate:max_size 10M > /dev/null 2>&1 || true
  pm2 set pm2-logrotate:retain 7 > /dev/null 2>&1 || true
  pm2 set pm2-logrotate:compress true > /dev/null 2>&1 || true

  echo "✅ PM2 terdeteksi. Merestart aplikasi luxenary-invite..."
  # 'pm2 reload' memakai ulang konfigurasi tersimpan dan TIDAK mengganti interpreter. Bila NODE_BIN_DIR diset dan
  # interpreter yang berjalan berbeda, hanya aplikasi ini (luxenary-invite) dihapus dan dijalankan ulang dari
  # ecosystem.config.js (jeda beberapa detik); aplikasi lain di PM2 tidak disentuh.
  CURRENT_INTERPRETER=$(pm2 jlist 2>/dev/null | node -e 'try{const s=require("fs").readFileSync(0,"utf8");const j=JSON.parse(s.slice(s.indexOf("[")));const p=j.find(x=>x.name==="luxenary-invite");process.stdout.write(p?String(p.pm2_env.exec_interpreter||""):"-")}catch{process.stdout.write("?")}')
  # 'pm2 reload' juga tidak membaca ulang argumen proses. Bila port aplikasi masih mendengarkan di semua antarmuka
  # (bukan 127.0.0.1/::1), proses dibuat ulang dari ecosystem.config.js yang mengikatnya ke loopback.
  EXPOSED_LISTENER=$(ss -ltn 2>/dev/null | awk -v bind="$LUX_BIND_HOST:" '$4 ~ /(^|:|\])3001$/ && $4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/ && index($4, bind) != 1 {print $4}' | head -1)
  if [ -n "$NODE_BIN_DIR" ] && [ "$CURRENT_INTERPRETER" != "?" ] && [ "$CURRENT_INTERPRETER" != "-" ] && [ "$CURRENT_INTERPRETER" != "$NODE_BIN_DIR/node" ]; then
    echo "↻ Interpreter PM2 berubah ($CURRENT_INTERPRETER -> $NODE_BIN_DIR/node): menjalankan ulang luxenary-invite dari ecosystem.config.js"
    pm2 delete luxenary-invite && pm2 start ecosystem.config.js
  elif [ -n "$EXPOSED_LISTENER" ]; then
    echo "↻ Port 3001 mendengarkan di $EXPOSED_LISTENER (terbuka ke jaringan): menjalankan ulang luxenary-invite agar terikat ke 127.0.0.1"
    pm2 delete luxenary-invite && pm2 start ecosystem.config.js
  else
    pm2 reload luxenary-invite --update-env || pm2 restart luxenary-invite || pm2 start ecosystem.config.js
  fi
  pm2 save
  rm -f data/.lb-drain

  # Verifikasi port lokal 3001
  echo "🩺 Melakukan health-check aplikasi lokal (port 3001)..."
  HEALTH_OK=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
      HEALTH_OK=1
      break
    fi
    sleep 3
  done
  if [ "$HEALTH_OK" -ne 1 ]; then
    echo "❌ Health check gagal setelah 30 detik. Deployment DITANDAI GAGAL."
    pm2 logs luxenary-invite --lines 40 --nostream || true
    echo "   Build sebelumnya (cepat, bila skema database masih cocok): echo $ACTIVE_DIST > data/.dist-dir && NEXT_DIST_DIR=$ACTIVE_DIST pm2 reload luxenary-invite --update-env"
    echo "   Kode sebelumnya : git switch --detach $PREVIOUS_COMMIT && npm ci && npm run build && pm2 reload luxenary-invite"
    echo "   Database        : pulihkan dari $PRE_BACKUP bila migrasi rilis ini tidak kompatibel dengan kode lama."
    exit 1
  fi
  echo "✅ Health check berhasil! Aplikasi merespons HTTP 200 di port 3001."
  export PATH="${NODE_BIN_DIR:+$NODE_BIN_DIR:}$SYSTEM_PATH"
  if [ "$IS_REPLICA" = true ]; then
    replica_refresh_caches
  else
    npx tsx scripts/migrate-drafts-to-db.ts || echo "⚠️ Impor ulang piring disk ke DB gagal."
    echo "🧱 Purge ulang cache undangan terbit setelah server baru aktif..."
    refresh_published_html
  fi
  export PATH="$SYSTEM_PATH"
  # Direktori build lama sebelum skema .next-a/.next-b tidak dipakai lagi; direktori aktif sebelumnya dibiarkan untuk rollback cepat.
  if [ "$ACTIVE_DIST" = ".next" ]; then rm -rf .next; fi
  # Smoke test tidak membatalkan deploy (aplikasi sudah berjalan); kegagalannya wajib diperiksa pemilik.
  if ! bash scripts/smoke-test.sh http://localhost:3001; then
    echo "⚠️ Smoke test GAGAL: periksa pemeriksaan bertanda GAGAL di atas sebelum menganggap rilis ini sehat."
  fi
else
  echo "⚠️ PM2 tidak terdeteksi di sistem ini. Silakan jalankan manual via 'npm run start'."
fi

# 9. Sinkronisasi Crontab Pemeliharaan OS Linux Otomatis
if command -v crontab &> /dev/null; then
  echo "⏰ Memverifikasi dan menyinkronkan jadwal pemeliharaan OS (crontab)..."
  # -f2- (bukan -f2): secret base64 buatan skrip ini berakhiran '=', dan -f2 memotongnya sehingga cron selalu 401.
  ACTUAL_CRON_SECRET=$(grep -E "^CRON_SECRET=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$ACTUAL_CRON_SECRET" ] && [ "$ACTUAL_CRON_SECRET" != '""' ]; then
    CURRENT_CRON=$(crontab -l 2>/dev/null || true)
    FILTERED_CRON=$(echo "$CURRENT_CRON" | grep -v "api/cron/cleanup" | grep -v "scripts/cron-cleanup.sh" | grep -v "api/cron/backup" | grep -v "scripts/cron-backup.sh" | grep -v "scripts/health-watch.sh" | grep -v "scripts/sync-shared-files.ts" || true)
    
    # Secret disimpan di berkas ber-izin 600 dan dibaca curl lewat -H @berkas, agar tidak tampil di 'crontab -l' maupun daftar proses.
    CRON_AUTH_FILE="$(pwd)/data/.cron-auth"
    (umask 077 && printf 'Authorization: Bearer %s\n' "$ACTUAL_CRON_SECRET" > "$CRON_AUTH_FILE")
    chmod 600 "$CRON_AUTH_FILE"

    CLEANUP_LINE="0 2 * * * PATH=/usr/local/bin:/usr/bin:/bin bash $(pwd)/scripts/cron-cleanup.sh > /dev/null 2>&1"
    BACKUP_LINE="0 3 * * * PATH=/usr/local/bin:/usr/bin:/bin bash $(pwd)/scripts/cron-backup.sh > /dev/null 2>&1"
    
    WATCH_LINE="* * * * * PATH=/usr/local/bin:/usr/bin:/bin bash $(pwd)/scripts/health-watch.sh"

    if [ "$IS_REPLICA" = true ]; then
      # Cleanup dan backup hanya di server utama; di replika keduanya akan berjalan ganda atas database yang sama.
      SYNC_LINE="* * * * * cd $(pwd) && PATH=${NODE_BIN_DIR:+$NODE_BIN_DIR:}/usr/local/bin:/usr/bin:/bin LUX_SERVER_ROLE=replica npx tsx scripts/sync-shared-files.ts >> $(pwd)/logs/shared-sync.log 2>&1"
      NEW_CRON=$(printf "%s\n%s\n%s\n" "$FILTERED_CRON" "$WATCH_LINE" "$SYNC_LINE" | sed '/^[[:space:]]*$/d')
      echo "$NEW_CRON" | crontab - 2>/dev/null || true
      echo "✅ Crontab replika disinkronkan: pemantau health dan tarik berkas bersama (tiap menit)."
    else
      NEW_CRON=$(printf "%s\n%s\n%s\n%s\n" "$FILTERED_CRON" "$CLEANUP_LINE" "$BACKUP_LINE" "$WATCH_LINE" | sed '/^[[:space:]]*$/d')
      echo "$NEW_CRON" | crontab - 2>/dev/null || true
      echo "✅ Crontab OS disinkronkan: Cleanup (02:00), Backup (03:00), dan pemantau health (tiap menit) dengan token aktif."
    fi
  else
    echo "⚠️ CRON_SECRET tidak ditemukan di .env — sinkronisasi crontab dilewati."
  fi
fi

# 10. Server utama: deploy setiap replika (REPLICA_HOSTS di .env, mis. "luxenary@100.x.y.z", dipisah spasi) lewat SSH
# Tailscale setelah server utama berhasil, karena replika menolak berjalan sebelum migrasi diterapkan. Kegagalan replika
# tidak menggagalkan server utama; pembagi beban mengeluarkan replika yang /api/health-nya tidak sehat.
REPLICA_HOSTS=$(grep -E "^REPLICA_HOSTS=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
if [ "$IS_REPLICA" = false ] && [ -n "$REPLICA_HOSTS" ]; then
  for HOST in $REPLICA_HOSTS; do
    echo "🛰️ Deploy replika $HOST..."
    if ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" 'cd ~/luxenary-invite && ./deploy.sh' > "logs/deploy-replica-${HOST##*@}.log" 2>&1; then
      echo "✅ Replika $HOST selesai (log: logs/deploy-replica-${HOST##*@}.log)."
    else
      echo "⚠️ Deploy replika $HOST GAGAL; server utama tetap berjalan. Periksa logs/deploy-replica-${HOST##*@}.log."
    fi
  done
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir dan terproteksi."
