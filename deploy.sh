#!/bin/bash

# ==============================================================================
# LUXENARY INVITE - AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

echo "🚀 Memulai proses deployment otomatis..."

# 1. Tarik pembaruan terbaru dari repository
echo "📦 Menarik pembaruan terbaru dari Git (origin main)..."
# Buang perubahan minor otomatis pada package-lock.json dan demo statis hasil kompilasi server runtime agar tidak memblokir git pull
git checkout -- package-lock.json 2>/dev/null || true
git checkout -- public/demo/ 2>/dev/null || true
if ! git pull origin main; then
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

# 4. Install Dependencies
echo "📦 Menginstal dependensi (npm install)..."
npm install --prefer-offline || npm install

# 5. Database Setup
echo "🗄️ Sinkronisasi skema database (Prisma)..."
npx prisma generate
npx prisma migrate deploy || npx prisma db push

# 6. Build Aplikasi Next.js
echo "🏗️ Membangun (Build) aplikasi Next.js... (Ini mungkin memakan waktu)"
NODE_OPTIONS="--max-old-space-size=2048" npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build Next.js gagal! PM2 tidak akan di-restart untuk menghindari down-time."
  exit 1
fi

# 7. Restart Server & Persist PM2
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
  echo "✅ PM2 terdeteksi. Merestart aplikasi via ecosystem..."
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
  pm2 save
  
  # Verifikasi port lokal 3001
  echo "🩺 Melakukan health-check aplikasi lokal (port 3001)..."
  sleep 3
  if curl -s -f http://localhost:3001/api/public/themes > /dev/null 2>&1; then
    echo "✅ Health check berhasil! Aplikasi merespons HTTP 200 di port 3001."
  else
    echo "⚠️ Peringatan: Health check lokal belum merespons instan. Cek logs dengan 'pm2 logs luxenary-invite'."
  fi
else
  echo "⚠️ PM2 tidak terdeteksi di sistem ini. Silakan jalankan manual via 'npm run start'."
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir."
