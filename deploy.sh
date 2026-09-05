#!/bin/bash

# ==============================================================================
# LUXENARY INVITE - AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================

echo "🚀 Memulai proses deployment otomatis..."

# 1. Tarik pembaruan terbaru dari repository (Abaikan jika gagal agar proses tetap lanjut)
echo "📦 Menarik pembaruan terbaru dari Git..."
git pull || echo "⚠️ Git pull gagal atau ini bukan git repository. Melanjutkan proses..."

# 2. Setup Environment Variables
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
  # Kompatibel untuk macOS dan Linux
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

# 3. Install Dependencies
echo "📦 Menginstal dependensi (npm install)..."
npm install

# 4. Database Setup
echo "🗄️ Sinkronisasi skema database (Prisma)..."
npx prisma generate
npx prisma migrate deploy || npx prisma db push

# 5. Build Aplikasi Next.js
echo "🏗️ Membangun (Build) aplikasi Next.js... (Ini mungkin memakan waktu)"
NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 6. Restart Server
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
  echo "✅ PM2 terdeteksi. Merestart aplikasi via ecosystem..."
  
  # Pastikan direktori logs untuk PM2 tersedia
  mkdir -p logs
  
  # Jalankan atau reload zero-downtime berdasarkan ecosystem.config.js
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js || echo "⚠️ Gagal merestart PM2."
else
  echo "⚠️ PM2 tidak terdeteksi di sistem ini. Jika server saat ini menyala, silakan restart manual (CTRL+C lalu 'npm run start')."
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir."
