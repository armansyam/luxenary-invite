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
  exit 1
fi

# Bash membaca skrip secara bertahap; bila git pull mengganti deploy.sh ini, sisa eksekusi memakai versi lama.
# Jalankan ulang skrip hasil pull sekali (DEPLOY_REEXEC mencegah pengulangan).
if [ -z "$DEPLOY_REEXEC" ] && [ "$(git rev-parse HEAD)" != "$PREVIOUS_COMMIT" ]; then
  export DEPLOY_REEXEC=1
  exec bash "$0" "$@"
fi

# 2. Setup Direktori Runtime
echo "📁 Menyiapkan direktori runtime..."
mkdir -p logs public/uploads data/drafts

# 3. Setup Environment Variables
echo "⚙️ Memeriksa konfigurasi Environment Variables (.env)..."
if [ ! -f .env ]; then
  echo "⚠️ File .env tidak ditemukan! Membuat otomatis dari .env.example..."
  cp .env.example .env
fi

# Generate Secrets jika masih kosong di .env
AUTH_SECRET=$(grep -E "^AUTH_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
NEXTAUTH_SECRET=$(grep -E "^NEXTAUTH_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" == '""' ]; then
  echo "🔐 Men-generate AUTH_SECRET baru yang aman..."
  NEW_SECRET=$(openssl rand -base64 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$NEW_SECRET\"|" .env
  else
    sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$NEW_SECRET\"|" .env
  fi
fi

if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" == '""' ]; then
  echo "🔐 Men-generate NEXTAUTH_SECRET baru yang aman..."
  if [ -n "$NEW_SECRET" ]; then
    NEW_NEXT_SECRET=$NEW_SECRET
  else
    NEW_NEXT_SECRET=$(openssl rand -base64 32)
  fi
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_NEXT_SECRET\"|" .env
  else
    sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_NEXT_SECRET\"|" .env
  fi
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
echo "🟢 Runtime Node untuk deploy: $(node -v) | npm $(npm -v) | $(command -v node)"

# 4. Install Dependencies (persis sesuai package-lock.json)
echo "📦 Menginstal dependensi (npm ci)..."
if ! npm ci; then
  echo "❌ npm ci gagal! Deployment dihentikan sebelum menyentuh database."
  exit 1
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
rm -rf "$NEW_DIST"
echo "🏗️ Membangun (Build) aplikasi Next.js ke $NEW_DIST... (aplikasi aktif tetap melayani dari $ACTIVE_DIST)"
if ! npx prisma generate; then
  echo "❌ prisma generate gagal! Deployment dihentikan sebelum menyentuh database."
  exit 1
fi
if ! NODE_OPTIONS="--max-old-space-size=1536" npm run build; then
  echo "❌ Build Next.js gagal! Database tidak disentuh dan PM2 tidak di-restart."
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
PRE_BACKUP="data/backups/pre-deploy_$(date +%Y-%m-%d_%H%M%S).dump"
mkdir -p data/backups
echo "💾 Membuat backup database pra-migrasi: $PRE_BACKUP"
if ! pg_dump -Fc -f "$PRE_BACKUP"; then
  echo "❌ Backup pra-migrasi gagal! Migrasi dibatalkan agar tidak ada perubahan skema tanpa titik pemulihan."
  exit 1
fi

# 7. Migrasi database. Kegagalan menghentikan deploy; tidak ada fallback ke 'prisma db push'
# karena db push melewati riwayat migrasi dan dapat membuat skema menyimpang.
echo "🗄️ Menerapkan migrasi database (Prisma)..."
if ! npx prisma migrate deploy; then
  echo "❌ Migrasi database gagal! PM2 tidak di-restart (rilis lama tetap berjalan)."
  echo "   Titik pemulihan : $PRE_BACKUP"
  echo "   Pulihkan DB     : eval \"\$(DB_URL=<DATABASE_URL dari .env> node scripts/pg-env.cjs)\" && pg_restore --clean --if-exists --no-owner -d \"\$PGDATABASE\" $PRE_BACKUP"
  echo "   Kode sebelumnya : git switch --detach $PREVIOUS_COMMIT"
  exit 1
fi

# 7a. Data master (idempoten: seed tidak menghapus atau menimpa data yang dikelola admin)
echo "🌱 Menyinkronisasi data master (Admin Settings, Music Presets, Themes)..."
npx prisma db seed || echo "⚠️ Seed gagal — lanjut deployment."
npm run themes:sync || echo "⚠️ Themes sync gagal — lanjut deployment."

# 7b. Kompilasi Cache Demo Tema Statis
echo "🎨 Memastikan cache demo tema statis terkompilasi segar..."
npx -y tsx -r dotenv/config -e "import('./lib/demoPublisher.ts').then(m => (m.compileAllStaticDemos || m.default.compileAllStaticDemos)()).then(n => console.log('✅ ' + n + ' demo tema berhasil dikompilasi.')).catch(e => console.warn('⚠️ Gagal pra-kompilasi demo (akan dikompilasi on-demand saat diakses):', e.message));" || true

# 8. Restart Server & Persist PM2
# Migrasi sudah berhasil: dari sini aplikasi dijalankan dari direktori build baru (dibaca ecosystem.config.js, dan
# diteruskan ke 'pm2 reload --update-env' lewat NEXT_DIST_DIR yang sudah di-export).
echo "$NEW_DIST" > data/.dist-dir
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
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
  EXPOSED_LISTENER=$(ss -ltn 2>/dev/null | awk '$4 ~ /(^|:|\])3001$/ && $4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/ {print $4}' | head -1)
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
  ACTUAL_CRON_SECRET=$(grep -E "^CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$ACTUAL_CRON_SECRET" ] && [ "$ACTUAL_CRON_SECRET" != '""' ]; then
    CURRENT_CRON=$(crontab -l 2>/dev/null || true)
    FILTERED_CRON=$(echo "$CURRENT_CRON" | grep -v "api/cron/cleanup" | grep -v "api/cron/backup" | grep -v "scripts/cron-backup.sh" | grep -v "scripts/health-watch.sh" || true)
    
    # Secret disimpan di berkas ber-izin 600 dan dibaca curl lewat -H @berkas, agar tidak tampil di 'crontab -l' maupun daftar proses.
    CRON_AUTH_FILE="$(pwd)/data/.cron-auth"
    (umask 077 && printf 'Authorization: Bearer %s\n' "$ACTUAL_CRON_SECRET" > "$CRON_AUTH_FILE")
    chmod 600 "$CRON_AUTH_FILE"

    CLEANUP_LINE="0 2 * * * curl -s -X POST -H @$CRON_AUTH_FILE http://localhost:3001/api/cron/cleanup > /dev/null 2>&1"
    BACKUP_LINE="0 3 * * * PATH=/usr/local/bin:/usr/bin:/bin bash $(pwd)/scripts/cron-backup.sh > /dev/null 2>&1"
    
    WATCH_LINE="* * * * * PATH=/usr/local/bin:/usr/bin:/bin bash $(pwd)/scripts/health-watch.sh"

    NEW_CRON=$(printf "%s\n%s\n%s\n%s\n" "$FILTERED_CRON" "$CLEANUP_LINE" "$BACKUP_LINE" "$WATCH_LINE" | sed '/^[[:space:]]*$/d')
    echo "$NEW_CRON" | crontab - 2>/dev/null || true
    echo "✅ Crontab OS disinkronkan: Cleanup (02:00), Backup (03:00), dan pemantau health (tiap menit) dengan token aktif."
  else
    echo "⚠️ CRON_SECRET tidak ditemukan di .env — sinkronisasi crontab dilewati."
  fi
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir dan terproteksi."
