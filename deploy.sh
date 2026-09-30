#!/bin/bash

# ==============================================================================
# LUXENARY INVITE - AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

echo "🚀 Memulai proses deployment otomatis..."

# 1. Tarik pembaruan terbaru dari repository
echo "📦 Menarik pembaruan terbaru dari Git (origin main)..."
PREVIOUS_COMMIT=$(git rev-parse HEAD)
if ! git pull --ff-only origin main; then
  echo "❌ Error: Gagal menarik perubahan terbaru dari Git origin main! Deployment dihentikan untuk mencegah corrupt build."
  exit 1
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

# 4. Install Dependencies (persis sesuai package-lock.json)
echo "📦 Menginstal dependensi (npm ci)..."
if ! npm ci; then
  echo "❌ npm ci gagal! Deployment dihentikan sebelum menyentuh database."
  exit 1
fi

# 5. Prisma Client & Build — dijalankan SEBELUM database disentuh.
# Bila build gagal, skema database tetap utuh dan PM2 tetap menjalankan rilis lama.
echo "🏗️ Membangun (Build) aplikasi Next.js... (Ini mungkin memakan waktu)"
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
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
  echo "🪵 Memastikan rotasi log PM2 (anti-disk leak) aktif..."
  if ! pm2 list | grep -q "pm2-logrotate"; then
    pm2 install pm2-logrotate --silent || true
  fi
  pm2 set pm2-logrotate:max_size 10M > /dev/null 2>&1 || true
  pm2 set pm2-logrotate:retain 7 > /dev/null 2>&1 || true
  pm2 set pm2-logrotate:compress true > /dev/null 2>&1 || true

  echo "✅ PM2 terdeteksi. Merestart aplikasi luxenary-invite..."
  pm2 reload luxenary-invite --update-env || pm2 restart luxenary-invite || pm2 start ecosystem.config.js
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
    echo "   Kode sebelumnya : git switch --detach $PREVIOUS_COMMIT && npm ci && npm run build && pm2 reload luxenary-invite"
    echo "   Database        : pulihkan dari $PRE_BACKUP bila migrasi rilis ini tidak kompatibel dengan kode lama."
    exit 1
  fi
  echo "✅ Health check berhasil! Aplikasi merespons HTTP 200 di port 3001."
else
  echo "⚠️ PM2 tidak terdeteksi di sistem ini. Silakan jalankan manual via 'npm run start'."
fi

# 9. Sinkronisasi Crontab Pemeliharaan OS Linux Otomatis
if command -v crontab &> /dev/null; then
  echo "⏰ Memverifikasi dan menyinkronkan jadwal pemeliharaan OS (crontab)..."
  ACTUAL_CRON_SECRET=$(grep -E "^CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$ACTUAL_CRON_SECRET" ] && [ "$ACTUAL_CRON_SECRET" != '""' ]; then
    CURRENT_CRON=$(crontab -l 2>/dev/null || true)
    FILTERED_CRON=$(echo "$CURRENT_CRON" | grep -v "api/cron/cleanup" | grep -v "api/cron/backup" || true)
    
    # Secret disimpan di berkas ber-izin 600 dan dibaca curl lewat -H @berkas, agar tidak tampil di 'crontab -l' maupun daftar proses.
    CRON_AUTH_FILE="$(pwd)/data/.cron-auth"
    (umask 077 && printf 'Authorization: Bearer %s\n' "$ACTUAL_CRON_SECRET" > "$CRON_AUTH_FILE")
    chmod 600 "$CRON_AUTH_FILE"

    CLEANUP_LINE="0 2 * * * curl -s -X POST -H @$CRON_AUTH_FILE http://localhost:3001/api/cron/cleanup > /dev/null 2>&1"
    BACKUP_LINE="0 3 * * * curl -s -X POST -H @$CRON_AUTH_FILE http://localhost:3001/api/cron/backup > /dev/null 2>&1"
    
    NEW_CRON=$(printf "%s\n%s\n%s\n" "$FILTERED_CRON" "$CLEANUP_LINE" "$BACKUP_LINE" | sed '/^[[:space:]]*$/d')
    echo "$NEW_CRON" | crontab - 2>/dev/null || true
    echo "✅ Crontab OS disinkronkan: Cleanup (02:00) & Backup (03:00) dengan token aktif."
  else
    echo "⚠️ CRON_SECRET tidak ditemukan di .env — sinkronisasi crontab dilewati."
  fi
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir dan terproteksi."
