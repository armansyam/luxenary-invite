-- Sesi admin memakai JWT berumur 30 hari yang tidak punya cara dicabut per akun. `sessionVersion` dibaca callback jwt
-- pada setiap permintaan admin dan dinaikkan saat password, peran, atau izin berubah, sehingga token lama berhenti
-- berlaku. Kolom aditif dengan nilai bawaan 0; JWT yang diterbitkan sebelum migrasi tidak membawa versi dan berakhir
-- sekali saat deploy.
ALTER TABLE "admins" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
