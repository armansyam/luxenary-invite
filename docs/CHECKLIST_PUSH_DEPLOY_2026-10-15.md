# Checklist push dan deploy, 15 Okt 2026

Status awal (diverifikasi 15 Okt 2026, lokal): branch `fix/audit-2026-10-03`, 57 commit di atas `origin/main` (`ddc7bb5`), `origin/main` tidak tertinggal. Hanya `.claude/` yang untracked.
Bukti lokal hari ini: `tsc --noEmit` exit 0, `eslint .` exit 0, `vitest run` 71 berkas / 847 uji lulus (dengan `DATABASE_URL` ke `luxenary_test`).
Belum dijalankan ulang hari ini: `next build`.

Sumber urutan deploy: `deploy.sh`, `ecosystem.config.js`, `scripts/smoke-test.sh`, `scripts/refresh-theme-drafts.ts`.

---

## 0. Keputusan yang harus selesai SEBELUM push

- [x] **Teks "portofolio resmi permanen"**: diputuskan dihapus (commit `444b704`, PR 12). Migrasi `20261015120000_pricing_subtitle_drop_portfolio_claim` berjalan sesudah `20261015110000` dan menulis ulang subjudul bawaan tanpa klausa itu.
- [ ] **Aturan undangan yang masuk portofolio.** Putuskan dulu; perilakunya sudah ada di kode yang akan terbit.

## 1. Pra-push (lokal)

- [ ] `git status`: hanya `.claude/` yang untracked; tidak ada perubahan tak ter-commit.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npx eslint .` exit 0.
- [ ] Uji dengan DB uji (tanpa `DATABASE_URL`, vitest melewatkan 418 uji):

```bash
DATABASE_URL="postgresql://armansyam@localhost:5432/luxenary_test?schema=public" npx vitest run
```

- [ ] `npx next build` exit 0 (satu-satunya gerbang CI yang belum dijalankan ulang hari ini).
- [ ] Dokumen master sinkron dengan kode: `docs/SYSTEM_ARCHITECTURE.md`, `README.md`, `docs/S-Invitation.md` (terakhir disinkron di `4d5f5cf`).

## 2. Push

`deploy.sh` memakai `git pull --ff-only origin main`, jadi rilis hanya sampai ke server bila commit ada di `main`. CI hanya berjalan untuk push ke `main` dan PR ke `main`.

- [ ] Rute aman: push branch, buka PR ke `main`, tunggu CI hijau (Node 22 dan 24), baru merge. Merge commit atau squash sama-sama aman untuk `--ff-only` di VPS.
- [ ] Setelah merge, catat hash `main`: `git rev-parse origin/main`.

## 3. Pra-deploy di VPS (butuh Anda; SSH dari laptop ini ditolak)

Akses: kunci `id_ed25519` laptop belum ada di `authorized_keys` VPS (`amsdev@103.150.92.238`).

Kapasitas dan keadaan:
- [ ] `free -m` dan `swapon --show`: RAM 2 GB; deploy 10 Okt memuncak ±1,8 GB swap dari 2 GB.
- [ ] `df -h`: ruang cukup untuk `.next-a`/`.next-b` dan `data/backups/pre-deploy_*.dump`.
- [ ] `git status` di `~/luxenary-invite`: bersih. Perubahan lokal di VPS membuat `git pull --ff-only` gagal.
- [ ] `cat data/.dist-dir`: tahu direktori aktif (`.next-a` atau `.next-b`) untuk rollback cepat.
- [ ] `pm2 list`: catat status `luxenary-invite`, `wisuda-api`, `wisuda-cron`, `pick-your-photo`.
- [ ] Pembungkus masih ada: `ls ~/luxenary-invite/logs/deploy-wrapper.sh` (tidak di-git).

Empat hal yang tidak bisa dibuktikan dari kode:
- [ ] **Jalur IP klien.** `.env` produksi `TRUSTED_PROXY="nginx"` (dicatat di `docs/SYSTEM_ARCHITECTURE.md` bagian 25.11, F-30); default kode `cloudflare`. Caddy harus menimpa `X-Real-IP` di blok `luxvite.id, *.luxvite.id` (dari `CF-Connecting-IP`) dan di blok domain kustom (dari `remote_host`). Cek: `grep -n TRUSTED_PROXY .env` dan `sudo caddy validate --config /etc/caddy/Caddyfile`.
- [ ] **Port 3001 hanya loopback.** Karena `X-Real-IP` dipercaya, port tidak boleh terjangkau dari internet: `ss -ltn | grep 3001` harus `127.0.0.1:3001`. Firewall origin hanya mengizinkan IP Cloudflare.
- [ ] **`NODE_BIN_DIR`.** Kosong berarti PM2 cluster (`instances: max`) dengan cache L1 per worker; terisi berarti fork 1 instance. Pastikan sesuai niat; `deploy.sh` membuat ulang proses bila interpreter berubah.
- [ ] **`nas_archive_enabled`.** Skrip QA lama (`scripts/industrial-qa-suite.ts`) mematikan flag ini. Cek nilai produksi:

```sql
SELECT key, value FROM admin_settings WHERE key IN ('nas_archive_enabled','nas_archive_path');
```

- [ ] `S3_BACKUP_BUCKET_NAME` terisi di `.env` bila backup offsite diinginkan (kosong di `.env.example`).

## 4. Deploy

Jangan jalankan `deploy.sh` langsung (OOM 6 Okt). Pakai pembungkus yang menjeda aplikasi lain:

```bash
cd ~/luxenary-invite && setsid nohup bash logs/deploy-wrapper.sh > logs/deploy-$(date +%Y%m%d-%H%M%S).log 2>&1 < /dev/null &
```

Urutan yang dijalankan `deploy.sh`:
1. `git pull --ff-only origin main`, lalu `npm ci`, `prisma generate`.
2. Build ke direktori cadangan (`.next-a` atau `.next-b`); aplikasi aktif tetap melayani. Gagal di sini: DB tidak disentuh.
3. `pg_dump -Fc` ke `data/backups/pre-deploy_<ts>.dump`. Gagal: migrasi dibatalkan.
4. `prisma migrate deploy`: 3 migrasi baru (`20261015100000`, `20261015110000`, `20261015120000`). Keduanya hanya `UPDATE admin_settings`, tanpa DDL dan tanpa penghapusan.
5. `prisma db seed`, `npm run themes:sync`, kompilasi demo tema. Kegagalan seed dan sync hanya memberi peringatan, deploy lanjut.
6. Tulis `data/.dist-dir`, `pm2 reload`, health check 30 detik, `smoke-test.sh`, sinkron crontab.

Pantau selama build:
- [ ] `watch -n5 free -m`; **hentikan build bila swap > 1,95 GB**.
- [ ] Pembungkus selalu menjalankan `pm2 start` + `pm2 save` untuk aplikasi yang dijeda; cek `pm2 list` sesudahnya.

## 5. Pasca-deploy

- [ ] Log deploy berakhir "Health check berhasil" dan "Smoke test: semua pemeriksaan lolos". Smoke test gagal tidak membatalkan deploy; baca baris `GAGAL`.
- [ ] Migrasi terapan:

```sql
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;
```

  Harus memuat `20261015120000_pricing_subtitle_drop_portfolio_claim`, `20261015110000_pricing_subtitle_retention_tokens`, dan `20261015100000_features_memories_quota_token`, tanpa `finished_at` kosong.
- [ ] Token tergantikan: `features_tier1..3` memuat `{{memoriesQuota}}`; `pricing_subtitle` memuat `{{archiveRetention}}` dan `{{galleryRetention}}` tanpa kata "portofolio" (query `admin_settings`).
- [ ] Segarkan HTML terbit lama (belum memuat perbaikan escape). Dry run dulu, lihat daftarnya, baru terapkan:

```bash
cd ~/luxenary-invite && npx tsx scripts/refresh-theme-drafts.ts
npx tsx scripts/refresh-theme-drafts.ts --apply --keep-drafts
```

  Catatan: per 10 Okt produksi 0 undangan, sehingga langkah ini bisa no-op; dry run memastikannya. `--apply` juga purge cache Cloudflare.
- [ ] Setelah `--apply`, muat ulang proses agar cache HTML di memori segar: `pm2 reload luxenary-invite --update-env`.
- [ ] `scripts/rebake-fallback-bank.ts` (dry run tanpa `--apply`) hanya perlu bila `refresh-theme-drafts` tidak dijalankan.
- [ ] `tail -n 50 logs/error.log`: tidak ada baris galat baru; tidak ada peringatan "Permintaan tanpa header IP dari proxy tepercaya".
- [ ] `crontab -l`: baris cleanup 02:00, backup 03:00, health-watch tiap menit.
- [ ] Uji tangan dari luar: beranda, `/demo`, `/login`, satu undangan terbit, satu RSVP, unggah musik admin (404 sampai restart adalah batasan Next yang diketahui).

## 6. Rollback

Aplikasi tidak sehat setelah reload:
- [ ] Build sebelumnya: `echo <ACTIVE_DIST_LAMA> > data/.dist-dir && NEXT_DIST_DIR=<ACTIVE_DIST_LAMA> pm2 reload luxenary-invite --update-env`. Valid karena migrasi rilis ini hanya mengubah nilai `admin_settings`.
- [ ] Kode: `git switch --detach <PREVIOUS_COMMIT>` lalu `npm ci && npm run build && pm2 reload luxenary-invite`.
- [ ] Database (hanya bila perlu): `pg_restore --clean --if-exists --no-owner` dari `data/backups/pre-deploy_<ts>.dump`.

## 7. Jangan dijalankan di produksi

Skrip di bawah menghapus atau menimpa data nyata (tercatat di audit 15 Okt): `scripts/test-02-setup-to-publish.ts`, `scripts/test-03-admin-cleanup.ts`, `scripts/clean-test-artifacts.ts` (`npm run test:clean`), `scripts/industrial-qa-suite.ts` (`npm run test:all`, `test:industrial`, menulis `nas_archive_enabled`), `npm run test:nas`.
