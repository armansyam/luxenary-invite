-- RSVP publik tidak punya akun, jadi nama yang diketik tidak membuktikan siapa pengirimnya.
-- Hash token acak (dipegang peramban pengirim lewat cookie httpOnly) menentukan siapa yang boleh
-- memperbarui baris ini; pengirim lain dengan nama sama ditolak alih-alih menimpa jawaban tamu.
-- Baris lama (kolom NULL) tidak dapat diperbarui dari form publik.
ALTER TABLE "rsvps" ADD COLUMN "editTokenHash" TEXT;
