/**
 * LUXENARY BOOTH WATCHER
 * ----------------------
 * Script robot ringan untuk sinkronisasi otomatis dari Laptop Photobooth ke Server Luxenary.
 * Bekerja secara gaib memantau folder, dan langsung menembakkan setiap foto baru ke Proyektor.
 * 
 * CARA PAKAI:
 * 1. Buka Terminal / Command Prompt di laptop Admin/Vendor.
 * 2. Jalankan perintah ini:
 *    node luxenary-booth-watcher.js --folder "C:\Jalur\Ke\Folder\Photobooth" --invitation "ID_UNDANGAN_DARI_DASHBOARD"
 * 
 * OPSIONAL:
 * --url "https://domain-anda.com" (Jika server sudah online, default: http://localhost:3000)
 */

const fs = require('fs');
const path = require('path');

// 1. Parse Arguments
const args = process.argv.slice(2);
let watchFolder = '';
let invitationId = '';
let serverUrl = 'http://localhost:3000';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--folder') watchFolder = args[i + 1];
  if (args[i] === '--invitation') invitationId = args[i + 1];
  if (args[i] === '--url') serverUrl = args[i + 1];
}

if (!watchFolder || !invitationId) {
  console.error("❌ ERROR: Argumen tidak lengkap!");
  console.log("Contoh: node luxenary-booth-watcher.js --folder \"C:\\Photobooth\" --invitation \"123-abc\"");
  process.exit(1);
}

if (!fs.existsSync(watchFolder)) {
  console.error(`❌ ERROR: Folder tidak ditemukan: ${watchFolder}`);
  process.exit(1);
}

const API_ENDPOINT = `${serverUrl.replace(/\/$/, '')}/api/public/memories/upload`;

// Memori untuk mencegah upload ganda (debounce/duplicate check)
const processedFiles = new Set();

console.log("=========================================");
console.log("💎 LUXENARY BOOTH WATCHER AKTIF 💎");
console.log("=========================================");
console.log(`📁 Memantau Folder: ${watchFolder}`);
console.log(`📡 Server Target  : ${API_ENDPOINT}`);
console.log(`🔑 ID Undangan    : ${invitationId}`);
console.log("Menunggu foto baru dari vendor...");
console.log("=========================================\n");

// 2. Tonton Folder (Watcher)
fs.watch(watchFolder, (eventType, filename) => {
  if (!filename) return;

  const ext = path.extname(filename).toLowerCase();
  const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.mp4'];
  
  if (!validExts.includes(ext)) return;

  const filePath = path.join(watchFolder, filename);

  // Berikan jeda 1 detik agar file selesai di-write oleh software photobooth
  setTimeout(async () => {
    if (!fs.existsSync(filePath)) return; // File terhapus/sementara
    
    const fileStat = fs.statSync(filePath);
    const uniqueKey = `${filename}_${fileStat.size}`;

    if (processedFiles.has(uniqueKey)) return; // Sudah pernah diupload
    processedFiles.add(uniqueKey);

    console.log(`⏳ [${new Date().toLocaleTimeString()}] Mendeteksi file baru: ${filename}`);
    
    try {
      await uploadFile(filePath, filename, ext);
    } catch (err) {
      console.error(`❌ GAGAL mengirim ${filename}: ${err.message}`);
      // Hapus dari cache agar bisa dicoba lagi jika dimodifikasi
      processedFiles.delete(uniqueKey);
    }
  }, 1000);
});

// 3. Fungsi Upload Native Fetch
async function uploadFile(filePath, filename, ext) {
  const buffer = fs.readFileSync(filePath);
  
  // Deteksi MIME
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';
  if (ext === '.mp4') mimeType = 'video/mp4';

  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  
  formData.append("invitationId", invitationId);
  formData.append("senderName", "Photobooth Vendor");
  formData.append("senderEmail", "booth@system"); // Magic label for Booth
  formData.append("message", "Auto-sync dari Watcher Script");
  formData.append("mediaType", mimeType.startsWith("video/") ? "VIDEO" : "PHOTO");
  formData.append("file", blob, filename);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log(`✅ SUKSES: ${filename} telah meluncur ke Proyektor!`);
  } else {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
}
