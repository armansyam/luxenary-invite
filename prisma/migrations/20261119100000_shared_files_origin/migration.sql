-- Sinkron berkas bersama dua arah: server penulis dicatat agar server itu tidak menarik berkasnya sendiri.
ALTER TABLE "shared_files" ADD COLUMN "origin" TEXT NOT NULL DEFAULT '';
