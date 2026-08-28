#!/bin/bash

echo "=========================================="
echo "🚀 MEMULAI DEPLOYMENT LUXENARY INVITE 🚀"
echo "=========================================="

echo "Pengecekan direktori kerja saat ini..."
pwd

echo "------------------------------------------"
echo "[1/6] Memeriksa dan Menyiapkan Environment Variables (.env)..."
if [ ! -f .env ]; then
    echo "⚠️  File .env tidak ditemukan. Menyalin dari .env.example..."
    cp .env.example .env 2>/dev/null || touch .env
fi

# Cek apakah NEXTAUTH_SECRET kosong, berisi string kosong, atau tidak ada
if ! grep -q "^NEXTAUTH_SECRET=" .env || grep -q "^NEXTAUTH_SECRET=$" .env || grep -q "^NEXTAUTH_SECRET=\"\"" .env || grep -q "^NEXTAUTH_SECRET=''" .env; then
    echo "⚠️  NEXTAUTH_SECRET kosong. Meng-generate secret keamanan baru secara otomatis..."
    NEW_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 42)
    # Hapus baris lama (mendukung MacOS dan Linux sed)
    sed -i.bak '/^NEXTAUTH_SECRET=/d' .env && rm -f .env.bak
    echo "NEXTAUTH_SECRET=\"$NEW_SECRET\"" >> .env
    echo "✅ NEXTAUTH_SECRET berhasil disuntikkan ke dalam .env."
else
    echo "✅ File .env dan NEXTAUTH_SECRET sudah aman."
fi

echo "------------------------------------------"
echo "[2/6] Mengambil kode terbaru dari GitHub (git pull)..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ GAGAL: Terjadi masalah saat git pull. Silakan periksa konflik Git."
    exit 1
fi
echo "✅ Git pull selesai."

echo "------------------------------------------"
echo "[2/5] Memperbarui dependensi (npm install)..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ GAGAL: Gagal melakukan instalasi dependensi (npm install)."
    exit 1
fi
echo "✅ NPM Install selesai."

echo "------------------------------------------"
echo "[3/6] Menyiapkan dan Menyinkronkan Database Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo "❌ GAGAL: Gagal melakukan pembaruan skema database (Prisma)."
    exit 1
fi
echo "✅ Sinkronisasi Database selesai."

echo "------------------------------------------"
echo "[4/6] Membangun Ulang Aplikasi (npm run build)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ GAGAL: Gagal melakukan proses build (Kompilasi Next.js)."
    exit 1
fi
echo "✅ Build aplikasi selesai."

echo "------------------------------------------"
echo "[5/6] Merestart Proses Background PM2..."
# Mengecek apakah aplikasi sudah berjalan di PM2
if pm2 list | grep -q "luxenary-invite"; then
    echo "Me-restart proses PM2 'luxenary-invite'..."
    pm2 restart luxenary-invite
else
    echo "Proses PM2 'luxenary-invite' belum ada. Memulai proses baru..."
    pm2 start npm --name "luxenary-invite" -- start
fi

if [ $? -ne 0 ]; then
    echo "❌ GAGAL: PM2 gagal di-restart."
    exit 1
fi
echo "✅ PM2 berhasil di-restart."

echo "=========================================="
echo "🎉 DEPLOYMENT SUKSES TOTAL! APLIKASI TELAH DIPERBARUI 🎉"
echo "=========================================="
