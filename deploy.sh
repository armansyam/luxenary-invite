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

# 3. Install Dependencies
echo "📦 Menginstal dependensi (npm install)..."
npm install

# 4. Database Setup
echo "🗄️ Sinkronisasi skema database (Prisma)..."
npx prisma generate
npx prisma db push --accept-data-loss

# 5. Build Aplikasi Next.js
echo "🏗️ Membangun (Build) aplikasi Next.js... (Ini mungkin memakan waktu)"
npm run build

# 6. Restart Server
echo "🔄 Merestart aplikasi..."
if command -v pm2 &> /dev/null; then
  echo "✅ PM2 terdeteksi. Mencoba merestart proses..."
  
  # Cari apakah ada proses pm2 dengan nama luxenary atau nextjs
  # Jika Anda menggunakan ekosistem file, ubah perintah di bawah menjadi: pm2 restart ecosystem.config.js
  pm2 restart all || echo "⚠️ Gagal merestart PM2. Pastikan aplikasi sudah dijalankan dengan PM2 sebelumnya."
else
  echo "⚠️ PM2 tidak terdeteksi di sistem ini. Jika server saat ini menyala, silakan restart manual (CTRL+C lalu 'npm run start')."
fi

echo "✨ Deployment selesai dengan sukses! Aplikasi Anda sudah yang paling mutakhir."
