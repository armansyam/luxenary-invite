/**
 * =========================================================================
 * LUXENARY INVITE — MASTER GOOGLE DRIVE WEBHOOK SCRIPT (Code.gs)
 * =========================================================================
 * 
 * FUNGSI:
 * 1. Menerima data upload foto/video dari tamu undangan di website Luxenary.
 * 2. Menempatkan file secara otomatis ke folder Google Drive milik pengantin (berdasarkan folderId).
 * 3. Mengatur hak akses file agar bisa ditampilkan di galeri undangan (CDN preview).
 * 4. Mengembalikan ID file dan link URL gambar secara instan ke server.
 * 
 * CARA PASANG (CUKUP 1 KALI SEUMUR HIDUP):
 * 1. Buka https://script.google.com
 * 2. Klik tombol "+ New project" / "+ Proyek baru"
 * 3. Hapus semua kode default, lalu PASTE SELURUH KODE DI BAWAH INI.
 * 4. Klik tombol "Deploy" (kanan atas) > Pilih "New deployment"
 * 5. Klik ikon Gerigi (⚙️) di sebelah "Select type" > Pilih "Web app"
 * 6. Isi konfigurasi:
 *    - Description: "Luxenary Master Webhook"
 *    - Execute as: "Me (email Anda)"
 *    - Who has access: "Anyone" (PENTING: Pilih 'Anyone' agar server bisa kirim data)
 * 7. Klik tombol "Deploy" > Berikan izin (Authorize access).
 * 8. Salin "Web app URL" (contoh: https://script.google.com/macros/s/AKfycb.../exec)
 * 9. Tempelkan URL tersebut di Dashboard Admin Luxenary > Tab Pengaturan > Penyimpanan Cloud.
 * =========================================================================
 */

function doPost(e) {
  try {
    // 1. Parsing payload data dari server Luxenary
    if (!e || !e.postData || !e.postData.contents) {
      return responseJson({ success: false, error: "Data payload kosong." });
    }

    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId;

    if (!folderId) {
      return responseJson({ success: false, error: "ID Folder Google Drive tidak ditemukan." });
    }

    // 2. Akses target folder milik pengantin
    var targetFolder;
    try {
      targetFolder = DriveApp.getFolderById(folderId);
    } catch (fErr) {
      return responseJson({ 
        success: false, 
        error: "Folder Google Drive tidak ditemukan atau belum dibuka izin 'Anyone with link can edit'." 
      });
    }

    // 3. Decode base64 dan bentuk file fisik di Google Drive
    var fileName = data.fileName || ("momen_" + new Date().getTime() + ".webp");
    var mimeType = data.mimeType || "image/webp";
    var decodedBytes = Utilities.base64Decode(data.base64File);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // 4. Simpan file ke folder pengantin
    var newFile = targetFolder.createFile(blob);

    // 5. Atur izin agar foto dapat dimuat di galeri web tamu
    try {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sErr) {}

    var fileId = newFile.getId();
    var viewUrl = "https://lh3.googleusercontent.com/d/" + fileId;

    // 6. Kembalikan respons sukses ke server Luxenary
    return responseJson({
      success: true,
      message: "File berhasil disimpan di Google Drive pengantin.",
      fileId: fileId,
      viewUrl: viewUrl,
      thumbnailUrl: viewUrl,
      fileName: newFile.getName(),
      sizeBytes: newFile.getSize(),
      folderId: folderId
    });

  } catch (err) {
    return responseJson({
      success: false,
      error: "Terjadi kesalahan pada skrip: " + err.toString()
    });
  }
}

/**
 * Helper untuk mengembalikan respons JSON standar
 */
function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handler pengujian cepat jika URL dibuka di browser (GET Request)
 */
function doGet(e) {
  return responseJson({
    status: "online",
    service: "Luxenary Invite Master Google Drive Webhook",
    message: "Webhook aktif dan siap menerima unggahan foto/video dari tamu undangan."
  });
}
